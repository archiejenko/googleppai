/**
 * Tests 3–4: LiveCallContext
 * 3. Starts a call, buffers a transcript chunk, and fires a snapshot to the edge function
 * 4. Auto-terminates after MAX_CALL_DURATION_MINUTES and calls endCall
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { LiveCallProvider, useLiveCall } from '../context/LiveCallContext';

const MAX_CALL_DURATION_MINUTES = 120; // Must match LiveCallContext constant
const SNAPSHOT_INTERVAL_MS = 30_000;

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../context/AuthContext', () => ({
    useAuth: vi.fn().mockReturnValue({
        session: { access_token: 'test-bearer-token' },
    }),
}));

const mockChannel = vi.hoisted(() => {
    // subscribe() must return the channel itself — LiveCallContext does:
    //   const channel = supabase.channel(...).on(...).subscribe();
    //   return () => { channel.unsubscribe(); };
    const ch = { on: vi.fn(), subscribe: vi.fn(), unsubscribe: vi.fn() };
    ch.on.mockImplementation(() => ch);
    ch.subscribe.mockImplementation(() => ch);
    return ch;
});

vi.mock('../utils/supabase', () => ({
    supabase: {
        channel: vi.fn().mockImplementation(() => mockChannel),
    },
}));

// ── Wrapper ───────────────────────────────────────────────────────────────────

function wrapper({ children }: { children: ReactNode }) {
    return <LiveCallProvider>{children}</LiveCallProvider>;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('LiveCallContext', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        globalThis.fetch = vi.fn();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    it('test 3: starts a call, buffers transcript, and fires a snapshot to the edge function', async () => {
        const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>;

        // startCall response
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ call_id: 'call-xyz' }),
        } as Response);

        // snapshot response
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({}),
        } as Response);

        const { result } = renderHook(() => useLiveCall(), { wrapper });

        // Start the call
        await act(async () => {
            await result.current.startCall({ prospectName: 'Alice', companyName: 'Acme' });
        });

        expect(result.current.activeCall?.callId).toBe('call-xyz');

        // Buffer a transcript chunk
        act(() => {
            result.current.pushTranscriptChunk('Hello, are you the decision maker?');
        });

        // Advance timers by 30s to trigger the auto-snapshot interval
        await act(async () => {
            vi.advanceTimersByTime(SNAPSHOT_INTERVAL_MS);
        });

        // Snapshot fetch should have been called with the right payload
        expect(mockFetch).toHaveBeenCalledTimes(2); // startCall + snapshot
        const [snapshotUrl, snapshotInit] = mockFetch.mock.calls[1] as [string, RequestInit];
        expect(snapshotUrl).toContain('/live-scoring/snapshot');

        const body = JSON.parse(snapshotInit.body as string);
        expect(body.call_id).toBe('call-xyz');
        expect(body.transcript_text).toContain('Hello');
        expect(body.prospect_name).toBe('Alice');

        const authHeader = (snapshotInit.headers as Record<string, string>)['Authorization'];
        expect(authHeader).toBe('Bearer test-bearer-token');
    });

    it('test 4: auto-terminates after MAX_CALL_DURATION_MINUTES and calls endCall', async () => {
        const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>;

        // startCall response
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ call_id: 'call-long' }),
        } as Response);

        // endCall response
        mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) } as Response);

        const { result } = renderHook(() => useLiveCall(), { wrapper });

        await act(async () => {
            await result.current.startCall({ prospectName: 'Bob' });
        });

        // Advance time past the max duration + 1 interval to trigger auto-termination
        await act(async () => {
            vi.advanceTimersByTime(MAX_CALL_DURATION_MINUTES * 60 * 1000 + SNAPSHOT_INTERVAL_MS);
        });

        // endCall should have been fired to the manual-end endpoint
        const allUrls = (mockFetch.mock.calls as [string, RequestInit][]).map(([url]) => url);
        expect(allUrls.some(url => url.includes('/telephony-webhook/manual-end'))).toBe(true);
    });
});
