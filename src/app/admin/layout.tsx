import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "@/lib/auth-api";
import AdminLayoutClient from "./AdminLayoutClient";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("is_admin, full_name, email")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/dashboard");

  return (
    <AdminLayoutClient profile={{ id: user.id, email: profile.email ?? "", full_name: profile.full_name ?? null, is_admin: true }}>
      {children}
    </AdminLayoutClient>
  );
}
