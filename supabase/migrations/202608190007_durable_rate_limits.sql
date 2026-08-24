BEGIN;

CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  bucket_key TEXT PRIMARY KEY,
  window_started_at TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL CHECK (request_count >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.api_rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE public.api_rate_limits TO service_role;

CREATE OR REPLACE FUNCTION public.consume_rate_limit(
  p_bucket_key TEXT,
  p_limit INTEGER,
  p_window_seconds INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_row public.api_rate_limits%ROWTYPE;
  v_now TIMESTAMPTZ := clock_timestamp();
  v_retry_after INTEGER;
BEGIN
  IF p_bucket_key IS NULL OR length(p_bucket_key) NOT BETWEEN 16 AND 128 THEN
    RAISE EXCEPTION 'Invalid rate-limit key';
  END IF;
  IF p_limit < 1 OR p_limit > 10000 OR p_window_seconds < 1 OR p_window_seconds > 604800 THEN
    RAISE EXCEPTION 'Invalid rate-limit configuration';
  END IF;

  INSERT INTO public.api_rate_limits (bucket_key, window_started_at, request_count, updated_at)
  VALUES (p_bucket_key, v_now, 1, v_now)
  ON CONFLICT (bucket_key) DO UPDATE
  SET window_started_at = CASE
        WHEN public.api_rate_limits.window_started_at + make_interval(secs => p_window_seconds) <= v_now
        THEN v_now ELSE public.api_rate_limits.window_started_at END,
      request_count = CASE
        WHEN public.api_rate_limits.window_started_at + make_interval(secs => p_window_seconds) <= v_now
        THEN 1 ELSE public.api_rate_limits.request_count + 1 END,
      updated_at = v_now
  RETURNING * INTO v_row;

  v_retry_after := greatest(0, ceil(extract(epoch FROM (
    v_row.window_started_at + make_interval(secs => p_window_seconds) - v_now
  )))::INTEGER);
  RETURN jsonb_build_object(
    'allowed', v_row.request_count <= p_limit,
    'remaining', greatest(0, p_limit - v_row.request_count),
    'retry_after_seconds', v_retry_after
  );
END;
$$;

REVOKE ALL ON FUNCTION public.consume_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(TEXT, INTEGER, INTEGER) TO service_role;

COMMIT;
