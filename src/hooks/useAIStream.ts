/**
 * useAIStream — Streaming consumer for the unified-ai SSE response
 *
 * Flow:
 *   1. POST to /unified-ai → receives a text/event-stream response
 *   2. Each SSE frame carries { t: "<token>" } for individual tokens
 *   3. The final frame carries { done: true, eval: <full JSON> }
 *   4. As tokens arrive, they are appended to a sentenceBuffer
 *   5. On a sentence boundary (. ! ?) the accumulated sentence is dispatched
 *      to onSentence — the caller should fire a TTS request for that text
 *   6. On the final frame, onEval is called with the full coaching data
 *
 * Latency benefit:
 *   TTS fires on the FIRST sentence (typically 1–2 seconds into generation)
 *   rather than waiting for the complete ~5-8 second response.
 */

import { useCallback, useRef } from 'react'

const SUPABASE_FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`

interface AIStreamOptions {
    authToken: string | undefined
    onSentence: (sentence: string) => void  // fires TTS for each completed sentence
    onToken?: (token: string) => void        // optional: display tokens as they arrive
    onEval: (evalData: Record<string, unknown>) => void  // fires with full coaching JSON
    onError?: (err: Error) => void
}

export function useAIStream({ authToken, onSentence, onToken, onEval, onError }: AIStreamOptions) {
    const abortRef = useRef<AbortController | null>(null)

    const sendMessage = useCallback(async (params: {
        sessionId: string
        message: string
        history?: unknown[]
    }) => {
        if (!authToken) { onError?.(new Error('Not authenticated')); return }

        // Cancel any in-flight stream from a previous turn
        abortRef.current?.abort()
        const controller = new AbortController()
        abortRef.current = controller

        try {
            const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/unified-ai`, {
                method: 'POST',
                signal: controller.signal,
                headers: {
                    Authorization: `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(params),
            })

            if (!res.ok || !res.body) {
                throw new Error(`unified-ai returned ${res.status}`)
            }

            const reader = res.body.getReader()
            const decoder = new TextDecoder()

            let buffer = ''         // SSE line buffer (may split across chunks)
            let sentenceBuffer = '' // accumulates tokens until a sentence boundary

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n')
                // Keep the last (possibly incomplete) line in the buffer
                buffer = lines.pop() ?? ''

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue
                    const payload = line.slice(6).trim()
                    if (payload === '[DONE]') return

                    let msg: { t?: string; done?: boolean; eval?: Record<string, unknown>; error?: string }
                    try { msg = JSON.parse(payload) } catch { continue }

                    if (msg.error) {
                        onError?.(new Error(msg.error))
                        return
                    }

                    if (msg.done && msg.eval) {
                        // Flush any remaining sentence buffer before delivering eval
                        const remaining = sentenceBuffer.trim()
                        if (remaining) {
                            onSentence(remaining)
                            sentenceBuffer = ''
                        }
                        onEval(msg.eval)
                        return
                    }

                    if (typeof msg.t === 'string') {
                        onToken?.(msg.t)
                        sentenceBuffer += msg.t

                        // Detect sentence boundaries to fire TTS on each completed sentence.
                        // We look for .  !  ?  followed by whitespace so we don't split on
                        // decimal numbers or mid-word punctuation.
                        let match: RegExpExecArray | null
                        let lastIndex = 0
                        const re = /[.!?](?=\s)/g
                        while ((match = re.exec(sentenceBuffer)) !== null) {
                            const sentence = sentenceBuffer.slice(lastIndex, match.index + 1).trim()
                            if (sentence) onSentence(sentence)
                            lastIndex = match.index + 1
                        }
                        if (lastIndex > 0) {
                            sentenceBuffer = sentenceBuffer.slice(lastIndex)
                        }
                    }
                }
            }

            // Flush any final sentence that didn't end with punctuation
            const remaining = sentenceBuffer.trim()
            if (remaining) onSentence(remaining)

        } catch (err: unknown) {
            if ((err as Error).name !== 'AbortError') onError?.(err as Error)
        }
    }, [authToken, onSentence, onToken, onEval, onError])

    const cancel = useCallback(() => {
        abortRef.current?.abort()
        abortRef.current = null
    }, [])

    return { sendMessage, cancel }
}
