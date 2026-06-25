import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function getAuthUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          // Works in Route Handlers; silently ignored in Server Components (read-only)
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {}
        },
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// Returns both the user AND a Supabase client already initialised with that session.
// Use this in Route Handlers so the same client can query data via the user's JWT.
export async function getAuthUserWithClient() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {}
        },
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return { user, supabase };
}
