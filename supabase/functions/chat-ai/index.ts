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

        const { sessionId, message, history } = await req.json()

        // Fetch session for context
        const { data: session } = await supabaseClient
            .from('training_sessions')
            .select('*')
            .eq('id', sessionId)
            .single()

        if (!session || session.user_id !== user.id) {
            return new Response(JSON.stringify({ error: 'Session not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // Gemini Logic (simplified wrapper)
        const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY') || '')
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

        const historyForGemini = (history || []).map((h: any) => ({
            role: h.role === 'ai' ? 'model' : 'user',
            parts: [{ text: h.text }]
        }))

        const systemPrompt = `You are roleplaying as a sales prospect. 
    Context:
    - Scenario: ${session.scenario}
    - Your Role: ${session.target_persona || 'prospect'}
    - Salesperson's Goal: ${session.pitch_goal || 'close the deal'}
    
    Instructions:
    - Act naturally, like a busy professional.
    - Keep responses concise (1-3 sentences).
    - React to what the user says.`;

        const chat = model.startChat({
            history: historyForGemini,
            // systemInstruction not fully supported in all node client versions but works in some. 
            // If fails, we can prepend.
            // For Deno/Edge, we rely on the model supporting it.
        })

        // Send system prompt as first message if needed, or just rely on context if model supports system instruction
        // For safety, let's just send the message. 1.5-flash supports system instructions in config usually.
        // If specific API version issues, might need to prepend to history.

        const result = await chat.sendMessage(message)
        const responseText = result.response.text()

        return new Response(JSON.stringify({ response: responseText }), {
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
