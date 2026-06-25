"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  kyc_status: string;
  tier: string;
  balance: number;
  total_deposited: number;
  total_withdrawn: number;
  total_profit: number;
  referral_code: string | null;
  auto_compound: boolean;
  is_active: boolean;
  created_at: string;
  display_currency?: string;
  withdrawal_pin?: string | null;
};

const RATES: Record<string, { rate: number; symbol: string; code: string }> = {
  USD: { rate: 1, symbol: "$", code: "USD" },
  GBP: { rate: 0.79, symbol: "£", code: "GBP" },
  EUR: { rate: 0.92, symbol: "€", code: "EUR" },
};

type DashboardCtx = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  currency: string;
  setCurrency: (c: string) => void;
  fmt: (n: number) => string;
};

const Ctx = createContext<DashboardCtx>({
  user: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
  currency: "USD",
  setCurrency: () => {},
  fmt: (n) => "$" + n.toFixed(2),
});

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrencyState] = useState("USD");

  const fetchProfile = async () => {
    try {
      // Use server-side auth — browser client can't always read HttpOnly session cookies
      const res = await fetch("/api/me", { credentials: "include" });
      if (res.status === 401) {
        window.location.replace("/login");
        return;
      }
      if (res.ok) {
        const data = await res.json() as Profile;
        if (data.display_currency) setCurrencyState(data.display_currency);
        setProfile(data);
        // Sync browser-side auth state best-effort (for logout detection etc.)
        createClient().auth.getUser().then(({ data: { user: u } }) => setUser(u)).catch(() => {});
      }
    } catch {}
    setLoading(false);
  };

  const setCurrency = useCallback(async (c: string) => {
    setCurrencyState(c);
    if (profile) {
      await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_currency: c }),
      });
    }
  }, [profile]);

  const fmt = useCallback((n: number) => {
    const r = RATES[currency] || RATES.USD;
    const converted = n * r.rate;
    return r.symbol + converted.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }, [currency]);

  useEffect(() => { fetchProfile(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Ctx.Provider value={{ user, profile, loading, refreshProfile: fetchProfile, currency, setCurrency, fmt }}>
      {children}
    </Ctx.Provider>
  );
}

export const useDashboard = () => useContext(Ctx);
