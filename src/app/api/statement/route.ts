import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() {},
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: transactions } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    const header = "Date,Type,Description,Amount (USD),Asset,Status,Balance After,Transaction ID\n";
    const rows = (transactions || []).map((tx: Record<string, unknown>) => {
      const date = new Date(tx.created_at as string).toLocaleDateString("en-US");
      const desc = ((tx.description as string) || "").replace(/,/g, " ");
      return `${date},${tx.type},${desc},${tx.amount},${tx.asset || ""},${tx.status},${tx.balance_after || ""},${tx.id}`;
    }).join("\n");

    const csv = header + rows;
    const now = new Date();
    const filename = `naxcal-statement-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}.csv`;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to generate statement" }, { status: 500 });
  }
}
