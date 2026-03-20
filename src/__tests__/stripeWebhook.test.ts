/**
 * Test 9: Stripe webhook HMAC-SHA256 signature validation
 *
 * Tests the exact algorithm used in supabase/functions/stripe-webhook/index.ts
 * using the Web Crypto API (available in Node 18+ / Vitest jsdom environment).
 * A tampered payload must produce a different signature → verification fails.
 */
import { describe, it, expect } from 'vitest';

// ── Mirror of the verification logic from stripe-webhook/index.ts ─────────────

async function computeStripeSignature(secret: string, timestamp: string, rawBody: string): Promise<string> {
    const signedPayload = `${timestamp}.${rawBody}`;
    const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign'],
    );
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload));
    return Array.from(new Uint8Array(sig))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

async function verifySignature(
    rawBody: string,
    signatureHeader: string,
    secret: string,
    toleranceSecs = 300,
): Promise<boolean> {
    const parts = Object.fromEntries(
        signatureHeader.split(',').map(part => {
            const [k, v] = part.split('=', 2);
            return [k, v];
        }),
    );

    const timestamp = parts['t'];
    const expectedSig = parts['v1'];
    if (!timestamp || !expectedSig) return false;

    const eventAge = Math.floor(Date.now() / 1000) - parseInt(timestamp, 10);
    if (eventAge > toleranceSecs) return false;

    const computed = await computeStripeSignature(secret, timestamp, rawBody);
    return computed === expectedSig;
}

// ── Test ──────────────────────────────────────────────────────────────────────

describe('Stripe webhook HMAC-SHA256 signature verification', () => {
    it('test 9: rejects a tampered payload while accepting the original', async () => {
        const secret = 'whsec_test_secret_for_vitest';
        const timestamp = String(Math.floor(Date.now() / 1000));
        const originalBody = JSON.stringify({ id: 'evt_1', type: 'checkout.session.completed' });
        const tamperedBody = JSON.stringify({ id: 'evt_1', type: 'customer.subscription.deleted' });

        // Compute a valid signature over the original body
        const validSig = await computeStripeSignature(secret, timestamp, originalBody);
        const validHeader = `t=${timestamp},v1=${validSig}`;

        // 1. Original body + correct signature → ACCEPTED
        const acceptsOriginal = await verifySignature(originalBody, validHeader, secret);
        expect(acceptsOriginal).toBe(true);

        // 2. Tampered body + original signature → REJECTED
        const rejectsTampered = await verifySignature(tamperedBody, validHeader, secret);
        expect(rejectsTampered).toBe(false);

        // 3. Original body + wrong secret → REJECTED
        const rejectsWrongSecret = await verifySignature(originalBody, validHeader, 'wrong_secret');
        expect(rejectsWrongSecret).toBe(false);
    });
});
