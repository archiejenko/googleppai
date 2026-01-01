-- Rate Limiting Schema
-- Implements a "Token Bucket" or "Fixed Window" style limiter using Postgres

CREATE TABLE IF NOT EXISTS public.rate_limits (
    key TEXT PRIMARY KEY, -- "user_id:action"
    count INTEGER DEFAULT 1,
    last_request TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS: Only Service Role can touch this. Users cannot manage their own limits!
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
-- No policies for "authenticated" or "anon" means they have NO access effectively. 
-- Only Service Role (Edge Functions) can Read/Write.

-- Function to check rate limit
CREATE OR REPLACE FUNCTION public.check_rate_limit(
    request_key TEXT,
    max_requests INTEGER,
    window_seconds INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_count INTEGER;
    last_req TIMESTAMP WITH TIME ZONE;
    is_allowed BOOLEAN;
BEGIN
    -- Cleanup old entries (Optional - implies we might want a cron for this, 
    -- but doing it lazily on access is okay for low volume)
    -- Actually, simpler logic:
    
    INSERT INTO public.rate_limits (key, count, last_request)
    VALUES (request_key, 1, now())
    ON CONFLICT (key) DO UPDATE
    SET 
        -- If window expired, reset count to 1. Else increment.
        count = CASE 
            WHEN (now() - rate_limits.last_request) > (window_seconds || ' seconds')::interval 
            THEN 1 
            ELSE rate_limits.count + 1 
        END,
        -- Update time only if we reset? No, keep window start? 
        -- Standard Fixed Window: Window starts at first request.
        -- Let's do Sliding Window resets:
        last_request = CASE 
            WHEN (now() - rate_limits.last_request) > (window_seconds || ' seconds')::interval 
            THEN now() 
            ELSE rate_limits.last_request 
        END
    RETURNING count <= max_requests INTO is_allowed;

    RETURN is_allowed;
END;
$$;
