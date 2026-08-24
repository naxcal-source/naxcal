import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "./supabase-admin";

export type MfaAuthFailureReason =
  | "unauthenticated"
  | "mfa_required"
  | "mfa_check_unavailable";

export type MfaAuthResult =
  | {
      ok: true;
      user: NonNullable<Awaited<ReturnType<typeof getAuthUser>>>;
    }
  | {
      ok: false;
      reason: MfaAuthFailureReason;
    };

export type AdminAuthResult =
  | { ok: true; userId: string }
  | { ok: false; reason: MfaAuthFailureReason | "forbidden" };

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

// Sensitive actions require AAL2 only for accounts that have already enrolled a
// verified MFA factor. Accounts without MFA remain usable while enrollment is
// optional. Factor and AAL lookup failures fail closed for sensitive actions.
export async function requireMfaAuth(): Promise<MfaAuthResult> {
  const { user, supabase } = await getAuthUserWithClient();
  if (!user) return { ok: false, reason: "unauthenticated" };

  const [assurance, factors] = await Promise.all([
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    supabase.auth.mfa.listFactors(),
  ]);

  if (assurance.error || factors.error || !assurance.data || !factors.data) {
    console.error("Could not verify MFA assurance level", {
      assuranceError: assurance.error?.message,
      factorsError: factors.error?.message,
      userId: user.id,
    });
    return { ok: false, reason: "mfa_check_unavailable" };
  }

  const hasVerifiedFactor = factors.data.all.some(
    (factor) => factor.status === "verified",
  );

  if (hasVerifiedFactor && assurance.data.currentLevel !== "aal2") {
    return { ok: false, reason: "mfa_required" };
  }

  return { ok: true, user };
}

export function mfaAuthErrorResponse(
  result: Extract<MfaAuthResult, { ok: false }>,
) {
  if (result.reason === "unauthenticated") {
    return NextResponse.json(
      { error: "Unauthorized", code: "unauthenticated" },
      { status: 401 },
    );
  }

  if (result.reason === "mfa_required") {
    return NextResponse.json(
      {
        error: "Complete multi-factor authentication to continue.",
        code: "mfa_required",
      },
      { status: 403 },
    );
  }

  return NextResponse.json(
    {
      error: "Could not verify multi-factor authentication. Try again.",
      code: "mfa_check_unavailable",
    },
    { status: 503 },
  );
}

export async function requireAdminAccess(): Promise<AdminAuthResult> {
  const auth = await requireMfaAuth();
  if (!auth.ok) return auth;
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, reason: "forbidden" };
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("is_admin, is_active")
    .eq("id", auth.user.id)
    .single();

  if (!profile?.is_admin || !profile.is_active) {
    return { ok: false, reason: "forbidden" };
  }

  return { ok: true, userId: auth.user.id };
}

export function adminAuthErrorResponse(
  result: Extract<AdminAuthResult, { ok: false }>,
) {
  if (result.reason === "forbidden") {
    return NextResponse.json(
      { error: "Forbidden", code: "forbidden" },
      { status: 403 },
    );
  }

  return mfaAuthErrorResponse({ ok: false, reason: result.reason });
}

// Compatibility gate for existing admin routes. It still enforces MFA; new code
// should use requireAdminAccess() so it can return a precise failure response.
export async function requireAdmin(): Promise<{ userId: string } | null> {
  const access = await requireAdminAccess();
  return access.ok ? { userId: access.userId } : null;
}
