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
  const supabase = createClient();

  const fetchProfile = async () => {
    const { data: { user: u } } = await supabase.auth.getUser();
    setUser(u);
    if (u) {
      const { data } = await supabase.from("profiles").select("*").eq("id", u.id).single();
      if (data) {
        const p = data as Profile;
        if (!p.full_name) {
          p.full_name = u.user_metadata?.full_name || u.email?.split("@")[0] || "Investor";
        }
        if (p.display_currency) setCurrencyState(p.display_currency);
        setProfile(p);
      }
    }
    setLoading(false);
  };

  const setCurrency = useCallback(async (c: string) => {
    setCurrencyState(c);
    if (profile) {
      await supabase.from("profiles").update({ display_currency: c } as Record<string, unknown>).eq("id", profile.id);
    }
  }, [profile, supabase]);

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
