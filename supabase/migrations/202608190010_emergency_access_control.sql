-- Final access-control cutover. Apply after the compatible application and
-- additive migrations have been deployed and verified.
BEGIN;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_currency TEXT DEFAULT 'USD';

-- Policies are ORed, so remove every historical user-write/read policy name
-- before switching these financial tables to server-mediated access.
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users read own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users insert own transactions" ON public.transactions;

REVOKE ALL PRIVILEGES ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.transactions FROM PUBLIC, anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE public.profiles TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.transactions TO service_role;

-- Profile creation remains automatic, but no longer depends on a privileged
-- browser upsert. Auth metadata is copied by a hardened trigger function.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    referred_by,
    referral_code,
    onboarding_complete
  ) VALUES (
    NEW.id,
    NEW.email,
    NULLIF(BTRIM(COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name'
    )), ''),
    NULLIF(UPPER(BTRIM(NEW.raw_user_meta_data ->> 'referred_by')), ''),
    upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
    false
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

COMMIT;
