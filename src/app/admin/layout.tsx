import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { getAuthUserWithClient } from "@/lib/auth-api";
import AdminLayoutClient from "./AdminLayoutClient";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, supabase } = await getAuthUserWithClient();
  if (!user) redirect("/login");

  let isAdmin = false;
  let fullName: string | null = null;
  let email = user.email ?? "";

  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    const { data } = await adminClient
      .from("profiles")
      .select("is_admin, full_name, email")
      .eq("id", user.id)
      .single();
    isAdmin = data?.is_admin ?? false;
    fullName = data?.full_name ?? null;
    email = data?.email ?? email;
  } else {
    // Fall back to user's own session — RLS allows reading own profile
    const { data } = await supabase
      .from("profiles")
      .select("is_admin, full_name, email")
      .eq("id", user.id)
      .single();
    isAdmin = data?.is_admin ?? false;
    fullName = data?.full_name ?? null;
    email = data?.email ?? email;
  }

  if (!isAdmin) redirect("/dashboard");

  return (
    <AdminLayoutClient profile={{ id: user.id, email, full_name: fullName, is_admin: true }}>
      {children}
    </AdminLayoutClient>
  );
}
