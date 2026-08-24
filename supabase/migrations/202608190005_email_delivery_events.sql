BEGIN;

ALTER TABLE public.email_outbox DROP CONSTRAINT IF EXISTS email_outbox_status_check;
ALTER TABLE public.email_outbox ADD CONSTRAINT email_outbox_status_check
  CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'suppressed'));
ALTER TABLE public.email_outbox ADD COLUMN IF NOT EXISTS delivery_status TEXT;
ALTER TABLE public.email_outbox ADD COLUMN IF NOT EXISTS delivery_updated_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.email_delivery_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  svix_id TEXT NOT NULL UNIQUE,
  email_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  recipient TEXT,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.email_suppressions (
  email TEXT PRIMARY KEY,
  reason TEXT NOT NULL DEFAULT 'unsubscribed',
  scope TEXT NOT NULL DEFAULT 'marketing',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.email_suppressions ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'marketing';
ALTER TABLE public.email_suppressions DROP CONSTRAINT IF EXISTS email_suppressions_scope_check;
ALTER TABLE public.email_suppressions ADD CONSTRAINT email_suppressions_scope_check
  CHECK (scope IN ('marketing', 'all'));

ALTER TABLE public.email_delivery_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_suppressions ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.email_delivery_events FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.email_suppressions FROM PUBLIC, anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE public.email_delivery_events TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.email_suppressions TO service_role;

CREATE OR REPLACE FUNCTION public.record_resend_delivery_event(
  p_svix_id TEXT,
  p_event_type TEXT,
  p_email_id TEXT,
  p_occurred_at TIMESTAMPTZ,
  p_payload JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_event_id UUID;
  v_recipient TEXT;
BEGIN
  IF p_svix_id IS NULL OR length(p_svix_id) NOT BETWEEN 1 AND 200 THEN
    RAISE EXCEPTION 'Invalid Resend event id';
  END IF;
  IF p_event_type IS NULL OR p_event_type !~ '^email[.]' THEN
    RAISE EXCEPTION 'Invalid Resend email event type';
  END IF;
  IF p_email_id IS NULL OR length(p_email_id) NOT BETWEEN 1 AND 200 THEN
    RAISE EXCEPTION 'Invalid Resend email id';
  END IF;
  v_recipient := lower(NULLIF(BTRIM(p_payload #>> '{data,to,0}'), ''));

  INSERT INTO public.email_delivery_events (
    svix_id, email_id, event_type, occurred_at, recipient, payload
  ) VALUES (
    p_svix_id, p_email_id, p_event_type, p_occurred_at, v_recipient, p_payload
  )
  ON CONFLICT (svix_id) DO NOTHING
  RETURNING id INTO v_event_id;

  IF v_event_id IS NULL THEN
    RETURN jsonb_build_object('status', 'duplicate');
  END IF;

  UPDATE public.email_outbox
  SET delivery_status = replace(p_event_type, 'email.', ''),
      delivery_updated_at = p_occurred_at,
      updated_at = now()
  WHERE provider_message_id = p_email_id
    AND (delivery_updated_at IS NULL OR delivery_updated_at <= p_occurred_at);

  IF v_recipient IS NOT NULL AND p_event_type IN ('email.bounced', 'email.suppressed') THEN
    INSERT INTO public.email_suppressions (email, reason, scope)
    VALUES (v_recipient, p_event_type, 'all')
    ON CONFLICT (email) DO UPDATE
    SET reason = EXCLUDED.reason, scope = 'all';
  ELSIF v_recipient IS NOT NULL AND p_event_type = 'email.complained' THEN
    INSERT INTO public.email_suppressions (email, reason, scope)
    VALUES (v_recipient, p_event_type, 'marketing')
    ON CONFLICT (email) DO UPDATE SET reason = EXCLUDED.reason;
  END IF;

  RETURN jsonb_build_object('status', 'recorded');
END;
$$;

CREATE OR REPLACE FUNCTION public.suppress_marketing_email(p_email TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_email TEXT := lower(BTRIM(COALESCE(p_email, '')));
BEGIN
  IF v_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
     OR length(v_email) > 320 THEN
    RAISE EXCEPTION 'Invalid email address';
  END IF;

  INSERT INTO public.email_suppressions (email, reason, scope)
  VALUES (v_email, 'unsubscribed', 'marketing')
  ON CONFLICT (email) DO UPDATE
  SET reason = CASE
        WHEN public.email_suppressions.scope = 'all'
        THEN public.email_suppressions.reason
        ELSE 'unsubscribed'
      END,
      scope = CASE
        WHEN public.email_suppressions.scope = 'all' THEN 'all'
        ELSE 'marketing'
      END;
END;
$$;

REVOKE ALL ON FUNCTION public.record_resend_delivery_event(TEXT, TEXT, TEXT, TIMESTAMPTZ, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.suppress_marketing_email(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_resend_delivery_event(TEXT, TEXT, TEXT, TIMESTAMPTZ, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.suppress_marketing_email(TEXT) TO service_role;

COMMIT;
