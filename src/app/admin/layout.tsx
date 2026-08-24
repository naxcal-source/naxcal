import { redirect } from "next/navigation";
import { requireAdminAccess } from "@/lib/auth-api";
import { supabaseAdmin } from "@/lib/supabase-admin";
import AdminLayoutClient from "./AdminLayoutClient";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const access = await requireAdminAccess();
  if (!access.ok) {
    if (access.reason === "unauthenticated") redirect("/login");
    if (access.reason === "mfa_required") redirect("/mfa?next=%2Fadmin");
    redirect("/dashboard");
  }

  let fullName: string | null = null;
  let email = "";

  const { data } = await supabaseAdmin
    .from("profiles")
    .select("full_name, email")
    .eq("id", access.userId)
    .single();
  fullName = data?.full_name ?? null;
  email = data?.email ?? "";

  return (
    <AdminLayoutClient profile={{ id: access.userId, email, full_name: fullName, is_admin: true }}>
      {children}
    </AdminLayoutClient>
  );
}
