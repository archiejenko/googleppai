-- Add Stripe subscription tracking columns to organisations.
-- stripe_customer_id already exists (added via stripe-checkout function).
-- These two columns are required by the stripe-webhook function.

ALTER TABLE public.organisations
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS payment_failed boolean DEFAULT false;
