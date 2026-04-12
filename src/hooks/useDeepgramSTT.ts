/**
 * useDeepgramSTT — Real-time speech-to-text via Deepgram WebSocket
 *
 * Architecture:
 *   1. Fetches a short-lived Deepgram token from /deepgram-token (never exposes the master key)
 *   2. Opens a WebSocket to wss://api.deepgram.com/v1/listen with:
 *      - interim_results=true  → partial transcripts as the user speaks
 *      - endpointing=300       → treat 300ms silence as utterance end
 *      - vad_events=true       → SpeechStarted / UtteranceEnd events
 *   3. Streams raw PCM (linear16 @ 16kHz) via a ScriptProcessorNode
 *   4. Calls onFinalTranscript when UtteranceEnd fires — this is the trigger for an AI turn
 *   5. Calls onInterimTranscript on every interim result for live UI updates
 *
 * Token refresh: the short-lived key expires in 60s; we refresh it every 45s while connected.
 */

import { useRef, useCallback } from 'react'

const SUPABASE_FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`
const DEEPGRAM_WS_URL = 'wss://api.deepgram.com/v1/listen'
const SAMPLE_RATE = 16_000
const TOKEN_REFRESH_INTERVAL_MS = 45_000

// Deepgram query params for live call STT
const DG_PARAMS = new URLSearchParams({
    model: 'nova-2',
    language: 'en',
    interim_results: 'true',
    endpointing: '300',       // 300ms silence = utterance end
    vad_events: 'true',       // SpeechStarted / UtteranceEnd events
    punctuate: 'true',
    encoding: 'linear16',
    sample_rate: String(SAMPLE_RATE),
}).toString()

interface UseDeepgramSTTOptions {
    authToken: string | undefined
    /**
     * consentConfirmed must be true before start() will open any WebSocket or
     * request microphone access. Set this only after PreCallConsent has logged
     * the rep's confirmation that the call participant was informed.
     */
    consentConfirmed: boolean
    onInterimTranscript: (text: string) => void
    onFinalTranscript: (text: string) => void
    onError?: (err: Error) => void
}

export function useDeepgramSTT({
    authToken,
    consentConfirmed,
    onInterimTranscript,
    onFinalTranscript,
    onError,
}: UseDeepgramSTTOptions) {
    const wsRef = useRef<WebSocket | null>(null)
    const audioCtxRef = useRef<AudioContext | null>(null)
    const processorRef = useRef<ScriptProcessorNode | null>(null)
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const tokenRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const utteranceBufferRef = useRef<string>('')

    const fetchToken = useCallback(async (): Promise<string> => {
        const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/deepgram-token`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${authToken}` },
        })
        if (!res.ok) throw new Error(`Failed to get Deepgram token: ${res.status}`)
        const { key } = await res.json()
        return key
    }, [authToken])

    const openWebSocket = useCallback(async (token: string): Promise<WebSocket> => {
        return new Promise((resolve, reject) => {
            const ws = new WebSocket(`${DEEPGRAM_WS_URL}?${DG_PARAMS}`, ['token', token])
            ws.binaryType = 'arraybuffer'

            ws.onopen = () => resolve(ws)
            ws.onerror = () => reject(new Error('Deepgram WebSocket failed to open'))

            ws.onmessage = (event) => {
                let msg: { type: string; channel?: { alternatives?: { transcript: string }[] }; is_final?: boolean }
                try { msg = JSON.parse(event.data as string) } catch { return }

                const type = msg.type

                if (type === 'Results') {
                    const alt = msg.channel?.alternatives?.[0]
                    const text: string = alt?.transcript ?? ''
                    if (!text) return

                    if (msg.is_final) {
                        // Accumulate finalized words within the current utterance
                        utteranceBufferRef.current += (utteranceBufferRef.current ? ' ' : '') + text
                        onInterimTranscript(utteranceBufferRef.current)
                    } else {
                        // Interim: show current buffer + in-progress words
                        onInterimTranscript(utteranceBufferRef.current + (utteranceBufferRef.current ? ' ' : '') + text)
                    }
                }

                if (type === 'UtteranceEnd') {
                    // Silence threshold crossed — fire an AI turn with the complete utterance
                    const final = utteranceBufferRef.current.trim()
                    utteranceBufferRef.current = ''
                    if (final) onFinalTranscript(final)
                }
            }

            ws.onclose = () => {
                // Closed externally — no-op; start() manages reconnection if needed
            }
        })
    }, [onInterimTranscript, onFinalTranscript])

    const start = useCallback(async () => {
        // Consent gate — must be confirmed via PreCallConsent before any audio is captured
        if (!consentConfirmed) {
            onError?.(new Error('Prospect consent must be confirmed before recording can start'));
            return;
        }
        if (!authToken) { onError?.(new Error('Not authenticated')); return }
        if (wsRef.current?.readyState === WebSocket.OPEN) return // already running

        try {
            const token = await fetchToken()

            const ws = await openWebSocket(token)
            wsRef.current = ws

            // Refresh the token and reconnect the WebSocket every 45s before the 60s key expires
            tokenRefreshRef.current = setInterval(async () => {
                try {
                    const newToken = await fetchToken()
                    // Close old WS gracefully; audio streaming continues via the processor;
                    // we reconnect immediately with the new token
                    ws.close(1000, 'token refresh')
                    const newWs = await openWebSocket(newToken)
                    wsRef.current = newWs
                } catch (e) {
                    onError?.(e as Error)
                }
            }, TOKEN_REFRESH_INTERVAL_MS)

            // Capture microphone
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            streamRef.current = stream

            // Downmix to mono 16kHz PCM using Web Audio API
            const ctx = new AudioContext({ sampleRate: SAMPLE_RATE })
            audioCtxRef.current = ctx
            const source = ctx.createMediaStreamSource(stream)
            sourceRef.current = source

            // ScriptProcessorNode is deprecated but has universal browser support.
            // For production, replace with an AudioWorklet for off-main-thread processing.
            const processor = ctx.createScriptProcessor(4096, 1, 1)
            processorRef.current = processor

            processor.onaudioprocess = (e) => {
                if (wsRef.current?.readyState !== WebSocket.OPEN) return
                const float32 = e.inputBuffer.getChannelData(0)
                // Convert Float32 [-1, 1] → Int16 for linear16 PCM
                const int16 = new Int16Array(float32.length)
                for (let i = 0; i < float32.length; i++) {
                    int16[i] = Math.max(-32768, Math.min(32767, float32[i] * 32768))
                }
                wsRef.current.send(int16.buffer)
            }

            source.connect(processor)
            processor.connect(ctx.destination)

        } catch (err) {
            onError?.(err as Error)
        }
    }, [authToken, consentConfirmed, fetchToken, openWebSocket, onError])

    const stop = useCallback(() => {
        if (tokenRefreshRef.current) {
            clearInterval(tokenRefreshRef.current)
            tokenRefreshRef.current = null
        }

        processorRef.current?.disconnect()
        sourceRef.current?.disconnect()

        if (audioCtxRef.current?.state !== 'closed') {
            audioCtxRef.current?.close()
        }

        streamRef.current?.getTracks().forEach(t => t.stop())

        if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
            wsRef.current.close(1000, 'call ended')
        }

        wsRef.current = null
        audioCtxRef.current = null
        processorRef.current = null
        sourceRef.current = null
        streamRef.current = null
        utteranceBufferRef.current = ''
    }, [])

    return { start, stop }
}
