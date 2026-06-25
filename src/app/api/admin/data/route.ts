import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-api";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: adminCheck } = await supabaseAdmin.from("profiles").select("is_admin").eq("id", user.id).single();
    if (!adminCheck?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const type = req.nextUrl.searchParams.get("type");

    if (type === "profiles") {
      const { data } = await supabaseAdmin.from("profiles").select("*").order("created_at", { ascending: false });
      return NextResponse.json(data || []);
    }

    if (type === "transactions") {
      const userId = req.nextUrl.searchParams.get("user_id");
      let q = supabaseAdmin.from("transactions").select("*").order("created_at", { ascending: false }).limit(50);
      if (userId) q = q.eq("user_id", userId);
      const { data } = await q;
      return NextResponse.json(data || []);
    }

    if (type === "kyc") {
      const { data } = await supabaseAdmin.from("profiles").select("id, full_name, email, kyc_status, tier, balance, created_at").in("kyc_status", ["pending", "submitted"]).order("created_at", { ascending: true });
      return NextResponse.json(data || []);
    }

    if (type === "withdrawals") {
      const { data } = await supabaseAdmin.from("transactions").select("*, profiles(full_name, email)").eq("type", "withdrawal").order("created_at", { ascending: false });
      return NextResponse.json(data || []);
    }

    if (type === "profile") {
      const userId = req.nextUrl.searchParams.get("user_id");
      if (!userId) return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
      const { data } = await supabaseAdmin.from("profiles").select("*").eq("id", userId).single();
      return NextResponse.json(data);
    }

    if (type === "announcements") {
      const { data } = await supabaseAdmin.from("announcements").select("*").order("created_at", { ascending: false });
      return NextResponse.json(data || []);
    }

    if (type === "daily_profits") {
      const { data } = await supabaseAdmin.from("daily_profits").select("*").order("created_at", { ascending: false }).limit(10);
      return NextResponse.json(data || []);
    }

    if (type === "testimonials") {
      const { data } = await supabaseAdmin.from("testimonials").select("*").order("created_at", { ascending: false });
      return NextResponse.json(data || []);
    }

    if (type === "audit") {
      const { data } = await supabaseAdmin.from("admin_audit_log").select("*").order("created_at", { ascending: false }).limit(50);
      return NextResponse.json(data || []);
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: adminCheck } = await supabaseAdmin.from("profiles").select("is_admin").eq("id", user.id).single();
    if (!adminCheck?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { action } = body;

    if (action === "update_profile") {
      const { user_id, updates } = body;
      await supabaseAdmin.from("profiles").update(updates).eq("id", user_id);
      return NextResponse.json({ status: "ok" });
    }

    if (action === "update_transaction") {
      const { tx_id, updates } = body;
      await supabaseAdmin.from("transactions").update(updates).eq("id", tx_id);
      return NextResponse.json({ status: "ok" });
    }

    if (action === "insert_transaction") {
      const { transaction } = body;
      await supabaseAdmin.from("transactions").insert(transaction);
      return NextResponse.json({ status: "ok" });
    }

    if (action === "manage_announcement") {
      const { operation, data } = body;
      if (operation === "insert") await supabaseAdmin.from("announcements").insert(data);
      if (operation === "update") await supabaseAdmin.from("announcements").update(data).eq("id", data.id);
      if (operation === "delete") await supabaseAdmin.from("announcements").delete().eq("id", data.id);
      return NextResponse.json({ status: "ok" });
    }

    if (action === "manage_testimonial") {
      const { operation, data } = body;
      if (operation === "insert") await supabaseAdmin.from("testimonials").insert(data);
      if (operation === "update") await supabaseAdmin.from("testimonials").update(data).eq("id", data.id);
      if (operation === "delete") await supabaseAdmin.from("testimonials").delete().eq("id", data.id);
      return NextResponse.json({ status: "ok" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
