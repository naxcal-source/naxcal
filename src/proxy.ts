import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { safeInternalRedirect } from "@/lib/safe-redirect";

export default async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtectedPage = path.startsWith("/dashboard") || path.startsWith("/admin");
  const isMfaPage = path === "/mfa";

  const redirectWithSessionCookies = (url: URL) => {
    const response = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie);
    });
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  };

  // Unauthenticated users can't access protected pages or the MFA challenge.
  if (!user && (isProtectedPage || isMfaPage)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    if (isProtectedPage) {
      url.searchParams.set("next", `${path}${request.nextUrl.search}`);
    }
    return redirectWithSessionCookies(url);
  }

  if (user) {
    const { data: assurance, error: assuranceError } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    const mfaRequired =
      !assuranceError &&
      assurance?.nextLevel === "aal2" &&
      assurance.currentLevel !== "aal2";

    if (mfaRequired && !isMfaPage) {
      const url = request.nextUrl.clone();
      const nextPath = isProtectedPage
        ? `${path}${request.nextUrl.search}`
        : "/dashboard";
      url.pathname = "/mfa";
      url.search = "";
      url.searchParams.set("next", nextPath);
      return redirectWithSessionCookies(url);
    }

    if (isMfaPage && !mfaRequired) {
      const requestedNext = safeInternalRedirect(
        request.nextUrl.searchParams.get("next"),
      );
      const target = new URL(
        requestedNext.startsWith("/mfa") ? "/dashboard" : requestedNext,
        request.url,
      );
      const url = request.nextUrl.clone();
      url.pathname = target.pathname;
      url.search = target.search;
      url.hash = target.hash;
      return redirectWithSessionCookies(url);
    }

    // Authenticated users get redirected from public auth pages to their app.
    if (path === "/login" || path === "/register" || path === "/") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      url.search = "";
      return redirectWithSessionCookies(url);
    }
  }

  supabaseResponse.headers.set("Cache-Control", "private, no-store");
  return supabaseResponse;
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/admin/:path*", "/login", "/register", "/mfa"],
};
