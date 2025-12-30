import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        const { data: { user } } = await supabaseClient.auth.getUser()

        if (!user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // Expecting either text or audioUrl (which we then might need to download or pass to Gemini if it supports URL)
        // For now, let's assume we receive a 'transcript' or 'text' for text-only analysis, 
        // OR we might handle 'audio' if we can pass audio bytes.
        // In the migration plan, we said "Port analyzePitch logic".

        const { text, audioUrl, trainingSessionId } = await req.json()

        // Simplified Analysis Logic
        const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY') || '')
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

        let promptParts: any[] = []
        promptParts.push(`You are an expert sales coach using MEDDIC. Analyze this pitch. Return JSON only.`)

        if (text) {
            promptParts.push(`Transcript: ${text}`)
        } else if (audioUrl) {
            // Fetch the audio file
            const audioResponse = await fetch(audioUrl)
            if (!audioResponse.ok) throw new Error("Failed to fetch audio file")

            const arrayBuffer = await audioResponse.arrayBuffer()
            const base64Audio = btoa(new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''))

            promptParts.push({
                inlineData: {
                    mimeType: "audio/webm", // Assuming webm from recorder
                    data: base64Audio
                }
            })
        } else {
            throw new Error("Text or Audio URL required.")
        }

        const result = await model.generateContent(promptParts)
        const response = await result.response
        const textResponse = response.text()

        // Parse JSON
        const cleanText = textResponse.replace(/```json/g, '').replace(/```/g, '').trim()
        const analysis = JSON.parse(cleanText)

        // Save to DB
        const { data: pitch, error } = await supabaseClient
            .from('pitches')
            .insert({
                user_id: user.id,
                training_session_id: trainingSessionId,
                audio_url: audioUrl || 'text-only',
                transcript: text,
                analysis: analysis,
                score: analysis.score,
                sentiment_score: analysis.sentimentScore,
                // ... map other fields
            })
            .select()
            .single()

        return new Response(JSON.stringify(pitch), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
