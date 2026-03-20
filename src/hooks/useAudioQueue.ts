/**
 * useAudioQueue — Gapless audio playback via Web Audio API
 *
 * Problem solved:
 *   HTML5 <audio> elements play one chunk at a time; switching sources introduces
 *   audible gaps (~100–300ms). When TTS fires per sentence, these gaps break the
 *   illusion of a natural speaking voice.
 *
 * Solution:
 *   Pre-decode each audio/mpeg chunk with AudioContext.decodeAudioData() and schedule
 *   each AudioBufferSourceNode to start at exactly (previousStart + previousDuration).
 *   This produces seamless gapless playback regardless of network jitter between
 *   TTS requests.
 *
 * Usage:
 *   const { initContext, enqueue, flush, suspend, resume } = useAudioQueue()
 *
 *   // At call start (inside a user-gesture handler):
 *   initContext()
 *
 *   // For each TTS chunk (ArrayBuffer from /tts-generate):
 *   await enqueue(arrayBuffer)
 *
 *   // At call end:
 *   flush()
 *
 * Notes:
 *   - initContext() MUST be called inside a user-gesture handler (button click) because
 *     browsers block AudioContext creation outside of user interaction.
 *   - Calling enqueue() before initContext() is a no-op with a console warning.
 *   - flush() stops all scheduled nodes and resets the timeline.
 */

import { useRef, useCallback } from 'react'

export function useAudioQueue() {
    const ctxRef = useRef<AudioContext | null>(null)
    // Wall-clock time (ctx.currentTime) at which the next chunk should start playing
    const nextStartTimeRef = useRef<number>(0)

    /**
     * Create the AudioContext. Call this inside a button click handler at call start —
     * browsers require a user gesture before AudioContext will play audio.
     */
    const initContext = useCallback(() => {
        if (ctxRef.current && ctxRef.current.state !== 'closed') return
        ctxRef.current = new AudioContext()
        nextStartTimeRef.current = 0
    }, [])

    /**
     * Decode an audio/mpeg ArrayBuffer and schedule it for gapless playback.
     * Fires immediately if the queue is empty; otherwise starts at the end of
     * the previously scheduled chunk.
     *
     * Returns a Promise that resolves when the chunk has been successfully scheduled
     * (not when it finishes playing).
     */
    const enqueue = useCallback(async (arrayBuffer: ArrayBuffer): Promise<void> => {
        const ctx = ctxRef.current
        if (!ctx) {
            console.warn('[useAudioQueue] AudioContext not initialised — call initContext() first')
            return
        }

        // Ensure context is running (can be suspended by browser after inactivity)
        if (ctx.state === 'suspended') await ctx.resume()

        let audioBuffer: AudioBuffer
        try {
            audioBuffer = await ctx.decodeAudioData(arrayBuffer)
        } catch (err) {
            console.warn('[useAudioQueue] Failed to decode audio chunk:', err)
            return
        }

        const source = ctx.createBufferSource()
        source.buffer = audioBuffer
        source.connect(ctx.destination)

        // Schedule to play immediately if the queue is empty, or at the end of the last chunk
        const startAt = Math.max(ctx.currentTime, nextStartTimeRef.current)
        source.start(startAt)
        // Advance the timeline pointer by this chunk's duration
        nextStartTimeRef.current = startAt + audioBuffer.duration
    }, [])

    /**
     * Stop all scheduled audio and reset the timeline.
     * Call this at call end or when the user interrupts the AI.
     */
    const flush = useCallback(() => {
        const ctx = ctxRef.current
        if (!ctx) return
        // Closing and re-creating the context is the most reliable way to
        // stop all scheduled nodes immediately without iterating over them
        ctx.close().catch(() => {/* ignore if already closed */})
        ctxRef.current = new AudioContext()
        nextStartTimeRef.current = 0
    }, [])

    /**
     * Suspend playback (e.g. user mutes or page goes to background).
     */
    const suspend = useCallback(() => {
        ctxRef.current?.suspend()
    }, [])

    /**
     * Resume a suspended context.
     */
    const resume = useCallback(() => {
        ctxRef.current?.resume()
    }, [])

    return { initContext, enqueue, flush, suspend, resume }
}
