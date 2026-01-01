-- HARDENED RATE LIMITER (CISO LEVEL)
-- Replaces previous simple implementation with Atomic Token Bucket

-- 1. SCHEMA
-- We use a composite key approach for efficiency.
-- Key format: "{limiter_name}:{window_type}:{identifier}"
-- e.g. "pitch_api:burst:user_123" or "chat_api:sustained:ip_hash_abc"

CREATE TABLE IF NOT EXISTS public.rate_limits (
    key TEXT PRIMARY KEY, 
    tokens_consumed INTEGER DEFAULT 0,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS: Strict Lockdown.
-- No one can read/write this except the database owner (Service Role) via the RPC.
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
-- No policies created = Implicit Deny All for Auth/Anon.

-- 2. ATOMIC ENFORCEMENT RPC
-- This function handles the "Read -> Check -> Update" cycle atomically.
CREATE OR REPLACE FUNCTION public.check_rate_limit_hardened(
    dimension_keys TEXT[],      -- Array of keys to check (e.g. ["ip:123", "user:abc"])
    cost INTEGER,               -- Cost of this request
    burst_limit INTEGER,        -- Max tokens in burst window
    burst_window_seconds INTEGER, 
    sustained_limit INTEGER,    -- Max tokens in sustained window
    sustained_window_seconds INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Runs as DB Owner (bypasses RLS)
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    d_key TEXT;
    is_allowed BOOLEAN := TRUE;
    
    -- Loop vars
    current_tokens INT;
    current_start TIMESTAMPTZ;
    limit_to_use INT;
    window_seconds INT;
    
    -- We need to check both Burst and Sustained for EACH dimension key.
    -- To simplify, the caller should pass "base" keys, and we append ":burst" or ":sustained".
    -- OR, simpler: The caller passes the raw identifiers, and WE construct the full keys here.
    -- Let's assume input `dimension_keys` are just the identifiers (e.g. "user:123", "ip:hash").
    -- We will check "identifier:burst" and "identifier:sustained" for each.
BEGIN
    -- ATOMIC TRANSACTION (Implicit in Postgres Function)
    
    -- 1. CHECK PHASE
    -- We must verify ALL limits before consuming ANY tokens.
    -- However, in a Token Bucket with "reset on window expiry", we effectively "reset" lazily.
    -- This means "Check" and "Update" are tightly coupled.
    
    -- Iterate through all dimensions (User, IP, etc.)
    FOREACH d_key IN ARRAY dimension_keys
    LOOP
        -- --- CHECK BURST ---
        SELECT tokens_consumed, window_start INTO current_tokens, current_start
        FROM public.rate_limits WHERE key = d_key || ':burst' FOR UPDATE; -- Lock row
        
        -- If missing or expired, we treat as 0 usage (new window)
        IF NOT FOUND OR (now() - current_start) > (burst_window_seconds || ' seconds')::interval THEN
            current_tokens := 0;
        END IF;

        IF (current_tokens + cost) > burst_limit THEN
            RETURN FALSE; -- Fail fast
        END IF;

        -- --- CHECK SUSTAINED ---
        SELECT tokens_consumed, window_start INTO current_tokens, current_start
        FROM public.rate_limits WHERE key = d_key || ':sustained' FOR UPDATE; -- Lock row

        IF NOT FOUND OR (now() - current_start) > (sustained_window_seconds || ' seconds')::interval THEN
            current_tokens := 0;
        END IF;

        IF (current_tokens + cost) > sustained_limit THEN
            RETURN FALSE; -- Fail fast
        END IF;
    END LOOP;

    -- 2. UPDATE PHASE
    -- If we reached here, ALL checks passed. Now we allow the request and update counters.
    
    FOREACH d_key IN ARRAY dimension_keys
    LOOP
        -- UPDATE BURST
        INSERT INTO public.rate_limits (key, tokens_consumed, window_start)
        VALUES (d_key || ':burst', cost, now())
        ON CONFLICT (key) DO UPDATE
        SET
            tokens_consumed = CASE
                WHEN (now() - rate_limits.window_start) > (burst_window_seconds || ' seconds')::interval 
                THEN EXCLUDED.tokens_consumed -- Reset to cost
                ELSE rate_limits.tokens_consumed + EXCLUDED.tokens_consumed -- Add cost
            END,
            window_start = CASE
                WHEN (now() - rate_limits.window_start) > (burst_window_seconds || ' seconds')::interval
                THEN now() -- New window start
                ELSE rate_limits.window_start -- Keep existing start
            END;

        -- UPDATE SUSTAINED
        INSERT INTO public.rate_limits (key, tokens_consumed, window_start)
        VALUES (d_key || ':sustained', cost, now())
        ON CONFLICT (key) DO UPDATE
        SET
            tokens_consumed = CASE
                WHEN (now() - rate_limits.window_start) > (sustained_window_seconds || ' seconds')::interval 
                THEN EXCLUDED.tokens_consumed
                ELSE rate_limits.tokens_consumed + EXCLUDED.tokens_consumed
            END,
            window_start = CASE
                WHEN (now() - rate_limits.window_start) > (sustained_window_seconds || ' seconds')::interval
                THEN now()
                ELSE rate_limits.window_start
            END;
    END LOOP;

    RETURN TRUE;
END;
$$;
