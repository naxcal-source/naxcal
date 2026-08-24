"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { KeyRound, Loader2, LogOut, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase";

type TotpFactor = {
  id: string;
  friendly_name?: string;
  created_at: string;
};

export default function MfaChallenge({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [factors, setFactors] = useState<TotpFactor[]>([]);
  const [factorId, setFactorId] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const supabase = createClient();

    void (async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (!active) return;
      if (userError || !userData.user) {
        router.replace("/login");
        return;
      }

      const [assurance, factorList] = await Promise.all([
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
        supabase.auth.mfa.listFactors(),
      ]);
      if (!active) return;

      if (assurance.error || factorList.error) {
        setError("We could not check your authenticator. Please try again.");
        setLoading(false);
        return;
      }

      if (assurance.data.currentLevel === "aal2") {
        router.replace(nextPath);
        router.refresh();
        return;
      }

      const verifiedTotp = factorList.data.totp.filter(
        (factor) => factor.status === "verified",
      );

      if (verifiedTotp.length === 0) {
        const hasOtherVerifiedFactor = factorList.data.all.some(
          (factor) => factor.status === "verified",
        );
        if (!hasOtherVerifiedFactor) {
          router.replace(nextPath);
          router.refresh();
          return;
        }

        setError(
          "This account has a verified security factor that this screen cannot use. Sign out and contact support.",
        );
        setLoading(false);
        return;
      }

      setFactors(verifiedTotp);
      setFactorId(verifiedTotp[0].id);
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [nextPath, router]);

  const handleVerify = async (event: FormEvent) => {
    event.preventDefault();
    if (!factorId || !/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }

    setError("");
    setVerifying(true);
    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code,
    });

    if (verifyError) {
      setError("That code was not accepted. Check the code and try again.");
      setCode("");
      setVerifying(false);
      return;
    }

    const { data: assurance, error: assuranceError } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    if (assuranceError || assurance.currentLevel !== "aal2") {
      setError("Your verification could not be confirmed. Please try again.");
      setVerifying(false);
      return;
    }

    router.replace(nextPath);
    router.refresh();
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  };

  return (
    <main className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl bg-white border border-[#e2e8f0] shadow-xl shadow-slate-200/50 p-7 sm:p-8">
        <Image
          src="/Naxcal_Primary_Logo_Full.png"
          alt="Naxcal"
          width={150}
          height={44}
          className="h-9 w-auto mb-8"
        />

        <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mb-5">
          <ShieldCheck className="text-naxcal-teal" size={24} />
        </div>
        <h1 className="text-2xl font-bold text-[#0f172a]">Security check</h1>
        <p className="text-sm text-[#64748b] mt-2 mb-6 leading-relaxed">
          Enter the current code from your authenticator app to finish signing in.
        </p>

        {error && (
          <div
            className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            role="alert"
          >
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-8 flex items-center justify-center gap-2 text-sm text-[#64748b]">
            <Loader2 size={17} className="animate-spin" /> Checking your account…
          </div>
        ) : factors.length > 0 ? (
          <form onSubmit={handleVerify} className="space-y-4">
            {factors.length > 1 && (
              <div>
                <label htmlFor="mfa-factor" className="block text-xs uppercase tracking-wider text-[#475569] mb-1.5">
                  Authenticator
                </label>
                <select
                  id="mfa-factor"
                  value={factorId}
                  onChange={(event) => setFactorId(event.target.value)}
                  className="w-full rounded-lg border border-[#cbd5e1] bg-white px-4 py-3 text-sm text-[#0f172a] outline-none focus:border-naxcal-teal focus:ring-2 focus:ring-naxcal-teal/20"
                >
                  {factors.map((factor, index) => (
                    <option key={factor.id} value={factor.id}>
                      {factor.friendly_name || `Authenticator ${index + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label htmlFor="mfa-code" className="block text-xs uppercase tracking-wider text-[#475569] mb-1.5">
                6-digit code
              </label>
              <div className="relative">
                <KeyRound size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                <input
                  id="mfa-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(event) =>
                    setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="000000"
                  maxLength={6}
                  autoFocus
                  className="w-full rounded-lg border border-[#cbd5e1] bg-white py-3 pl-11 pr-4 font-mono text-lg tracking-[0.35em] text-[#0f172a] outline-none focus:border-naxcal-teal focus:ring-2 focus:ring-naxcal-teal/20"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={verifying || code.length !== 6}
              className="w-full rounded-lg btn-teal py-3.5 text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {verifying ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Verifying…
                </>
              ) : (
                "Verify and continue"
              )}
            </button>
          </form>
        ) : null}

        <button
          type="button"
          onClick={handleSignOut}
          className="mt-5 w-full flex items-center justify-center gap-2 text-sm text-[#64748b] hover:text-[#0f172a]"
        >
          <LogOut size={15} /> Sign out
        </button>
      </div>
    </main>
  );
}
