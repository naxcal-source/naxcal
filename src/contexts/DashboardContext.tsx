"use client";

import { createContext, useContext, useEffect, useState } from "react";
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
};

type DashboardCtx = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
};

const Ctx = createContext<DashboardCtx>({
  user: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
});

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchProfile = async () => {
    const { data: { user: u } } = await supabase.auth.getUser();
    setUser(u);
    if (u) {
      const { data } = await supabase.from("profiles").select("*").eq("id", u.id).single();
      if (data) setProfile(data as Profile);
    }
    setLoading(false);
  };

  useEffect(() => { fetchProfile(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Ctx.Provider value={{ user, profile, loading, refreshProfile: fetchProfile }}>
      {children}
    </Ctx.Provider>
  );
}

export const useDashboard = () => useContext(Ctx);
