import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { safeInternalRedirect } from "@/lib/safe-redirect";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeInternalRedirect(searchParams.get("next"));

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {}
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Ensure profile exists for OAuth users (Google, Apple)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: existing } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .single();

        if (!existing) {
          const fullName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Investor";
          await supabaseAdmin.from("profiles").upsert({
            id: user.id,
            email: user.email,
            full_name: fullName,
          });
        }

        if (user.email) {
          const fullName = user.user_metadata?.full_name || user.user_metadata?.name || user.email.split("@")[0] || "Investor";
          const { error: outboxError } = await supabaseAdmin.from("email_outbox").insert({
            dedupe_key: `welcome/${user.id}`,
            user_id: user.id,
            template: "welcome",
            to_email: user.email,
            payload: { name: fullName },
          });
          if (outboxError?.code !== "23505") {
            if (outboxError) console.error("Could not queue welcome email", outboxError);
          }
        }
      }

      const { data: assurance } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      const needsMfa =
        assurance?.nextLevel === "aal2" &&
        assurance.currentLevel !== "aal2";
      const destination = needsMfa
        ? `/mfa?next=${encodeURIComponent(next)}`
        : next;
      const response = NextResponse.redirect(new URL(destination, origin));
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
