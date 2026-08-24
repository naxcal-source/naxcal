import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth-api";
import { safeInternalRedirect } from "@/lib/safe-redirect";
import MfaChallenge from "./MfaChallenge";

export default async function MfaPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const requestedNext = Array.isArray(params.next) ? params.next[0] : params.next;
  const safeNext = safeInternalRedirect(requestedNext);
  const nextPath = safeNext.startsWith("/mfa") ? "/dashboard" : safeNext;

  return <MfaChallenge nextPath={nextPath} />;
}
