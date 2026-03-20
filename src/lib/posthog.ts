import posthog from 'posthog-js';

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
// Default to EU endpoint — no US data transfer, no SCCs required
const POSTHOG_HOST = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ?? 'https://eu.i.posthog.com';

/** Whether PostHog is active (key configured). */
export const isPostHogEnabled = !!POSTHOG_KEY;

/** Whether PostHog has been initialised (i.e. user has given cookie consent). */
let _initialized = false;
export const isPostHogInitialized = () => _initialized;

/**
 * Initialise PostHog — must only be called after the user accepts cookie consent.
 * Safe to call multiple times; the _initialized guard prevents re-init.
 * No-op if VITE_POSTHOG_KEY is not set.
 */
export function initPostHog() {
  if (!POSTHOG_KEY || _initialized) return;
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: false,   // We track pageviews manually via PageViewTracker
    capture_pageleave: true,
    autocapture: false,        // Keep noise low; use explicit events only
    capture_exceptions: true,
    persistence: 'localStorage',
  });
  _initialized = true;
}

export { posthog };
