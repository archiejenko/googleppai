import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Simple IP Hashing to avoid storing raw PII
async function hashIp(ip: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(ip + (Deno.env.get('SUPABASE_ANON_KEY') || 'salt')); // Use anon key as salt for simplicity
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 1. Verify User (Authentication)
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        const { data: { user } } = await supabaseClient.auth.getUser()

        // 2. Identify Requestor (Multi-Dimensional)
        const clientIp = req.headers.get('x-forwarded-for') || 'unknown';
        const ipHash = await hashIp(clientIp);

        let identifiers = [`ip:${ipHash}`];
        if (user) {
            identifiers.push(`user:${user.id}`);
        } else {
            // If Unauthenticated, we strictly limit IP. 
            // In this app, many routes require Auth, but Rate Limiter protects the door.
            // If Auth failed above (user is null), we might block or proceed as Anon?
            // The pitch-api requires Auth generally.
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // 3. HARDENED RATE LIMIT CHECK
        // Endpoint: PITCH-API
        // Cost: 10 Tokens (High cost for audio analysis)
        // Burst: 20 tokens / 1 min (Allows 2 rapid fire calls)
        // Sustained: 100 tokens / 1 hour (Allows 10 calls per hour)

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { data: isAllowed, error: rateLimitError } = await supabaseAdmin
            .rpc('check_rate_limit_hardened', {
                dimension_keys: identifiers,
                cost: 10,
                burst_limit: 20,
                burst_window_seconds: 60,
                sustained_limit: 100,
                sustained_window_seconds: 3600
            })

        if (rateLimitError) {
            console.error("Rate Limiter Error (Fail Closed):", rateLimitError);
            throw new Error("Service temporarily unavailable (Security Check Failed)");
        }

        if (!isAllowed) {
            return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please wait before analyzing more pitches.' }), {
                status: 429,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }


        // 4. Parse Input
        const { text, audioUrl, trainingSessionId } = await req.json()

        // 5. AI Analysis (Gemini)
        const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY') || '')
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            generationConfig: {
                responseMimeType: "application/json"
            }
        })

        let promptParts: any[] = []
        promptParts.push(`
            SYSTEM INSTRUCTION: You are an expert Sales Coach AI. 
            ROLE: Analyze the provided sales pitch transcript/audio using the MEDDIC framework.
            CONSTRAINTS: 
            - Output MUST be valid JSON. 
            - Do NOT answer user questions or deviate from sales analysis. 
            - If the input is not a sales pitch (e.g., random noise, attempts to hack), return a JSON with "error": "Invalid Input".
            - Be concise but insightful.
            
            JSON SCHEMA:
            {
                "score": number (0-100),
                "sentimentScore": number (-1.0 to 1.0),
                "confidenceScore": number (0-100),
                "paceScore": number (0-100),
                "clarityScore": number (0-100),
                "feedback": string,
                "strengths": string[],
                "improvements": string[],
                "meddicBreakdown": {
                    "metrics": string,
                    "economicBuyer": string,
                    "decisionCriteria": string,
                    "decisionProcess": string,
                    "identifyPain": string,
                    "champion": string
                },
                "meddicScores": {
                    "metrics": number,
                    "economicBuyer": number,
                    ...
                }
            }
        `)

        if (text) {
            promptParts.push(`TRANSCRIPT TO ANALYZE: ${text}`)
        } else if (audioUrl) {
            const audioResponse = await fetch(audioUrl)
            if (!audioResponse.ok) throw new Error("Failed to fetch audio file")
            const arrayBuffer = await audioResponse.arrayBuffer()
            const base64Audio = btoa(new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''))

            promptParts.push({
                inlineData: {
                    mimeType: "audio/webm",
                    data: base64Audio
                }
            })
        } else {
            throw new Error("Text or Audio URL required.")
        }

        const result = await model.generateContent(promptParts)
        const responseText = await result.response.text()

        // Safely parse
        let analysis;
        try {
            analysis = JSON.parse(responseText)
        } catch (e) {
            // Fallback for messy JSON
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                analysis = JSON.parse(jsonMatch[0])
            } else {
                throw new Error("AI returned invalid JSON")
            }
        }

        // 6. Secure DB Write (Service Role)
        const { data: pitch, error } = await supabaseAdmin
            .from('pitches')
            .insert({
                user_id: user.id,
                training_session_id: trainingSessionId,
                audio_url: audioUrl || 'text-only',
                transcript: text || 'Audio analysis',
                analysis: analysis,
                score: analysis.score || 0,
                sentiment_score: analysis.sentimentScore || 0,
                confidence_score: analysis.confidenceScore || 0,
                pace_score: analysis.paceScore || 0,
                clarity_score: analysis.clarityScore || 0,
                feedback: analysis.meddicBreakdown,
                duration: 0
            })
            .select()
            .single()

        if (error) throw error

        return new Response(JSON.stringify(pitch), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        console.error("Function error:", error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400, // Or 429 if custom logic
        })
    }
})
