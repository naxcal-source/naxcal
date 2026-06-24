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
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    const { data: transactions } = await supabase.from("transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false });

    const txs = transactions || [];
    const name = (profile as Record<string, unknown>)?.full_name || "Investor";
    const email = user.email || "";
    const balance = Number((profile as Record<string, unknown>)?.balance || 0);
    const totalDeposited = Number((profile as Record<string, unknown>)?.total_deposited || 0);
    const totalProfit = Number((profile as Record<string, unknown>)?.total_profit || 0);
    const tier = ((profile as Record<string, unknown>)?.tier as string || "bronze").charAt(0).toUpperCase() + ((profile as Record<string, unknown>)?.tier as string || "bronze").slice(1);
    const now = new Date();
    const monthYear = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    const generated = now.toLocaleDateString("en-US", { dateStyle: "long" }) + " at " + now.toLocaleTimeString("en-US", { timeStyle: "short" });

    const fmt = (n: number) => "$" + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const totalIn = txs.filter(t => ["deposit", "profit", "bonus", "referral"].includes(t.type)).reduce((s, t) => s + Number(t.amount), 0);
    const totalOut = txs.filter(t => ["withdrawal", "stock_buy", "swap"].includes(t.type)).reduce((s, t) => s + Number(t.amount), 0);

    const txRows = txs.map((tx: Record<string, unknown>) => {
      const date = new Date(tx.created_at as string);
      const isCredit = ["deposit", "profit", "bonus", "referral"].includes(tx.type as string);
      const type = (tx.type as string).replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
      return `<tr>
        <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#6b7280">${date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#374151">${type}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#374151">${(tx.description as string) || "—"}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#374151">${tx.asset || "—"}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;font-weight:600;text-align:right;color:${isCredit ? "#16a34a" : "#dc2626"}">${isCredit ? "+" : "-"}${fmt(Number(tx.amount))}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;text-align:right;color:#374151">${tx.balance_after != null ? fmt(Number(tx.balance_after)) : "—"}</td>
      </tr>`;
    }).join("");

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Naxcal Statement - ${monthYear}</title>
<style>
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  body { margin:0; padding:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; background:#fff; color:#0a0a0a; }
  @page { margin: 40px; }
</style>
</head>
<body>
<div style="max-width:900px;margin:0 auto;padding:40px">

  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px;border-bottom:2px solid #0a0a0a;padding-bottom:24px">
    <div>
      <img src="https://naxcal.com/Naxcal_Primary_Logo.png" alt="Naxcal" style="height:48px;width:auto;margin-bottom:8px;display:block" />
      <p style="margin:0;font-size:11px;color:#9ca3af">Naxcal Capital Ltd · FCA Authorised</p>
    </div>
    <div style="text-align:right">
      <h1 style="margin:0 0 4px;font-size:22px;font-weight:700;color:#0a0a0a">Account Statement</h1>
      <p style="margin:0;font-size:13px;color:#6b7280">${monthYear}</p>
    </div>
  </div>

  <!-- Account Info -->
  <div style="display:flex;gap:40px;margin-bottom:32px">
    <div>
      <p style="margin:0 0 2px;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px">Account Holder</p>
      <p style="margin:0;font-size:15px;font-weight:600;color:#0a0a0a">${name}</p>
      <p style="margin:2px 0 0;font-size:13px;color:#6b7280">${email}</p>
    </div>
    <div>
      <p style="margin:0 0 2px;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px">Investment Tier</p>
      <p style="margin:0;font-size:15px;font-weight:600;color:#0a0a0a">${tier}</p>
    </div>
    <div>
      <p style="margin:0 0 2px;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px">Statement Generated</p>
      <p style="margin:0;font-size:13px;color:#374151">${generated}</p>
    </div>
  </div>

  <!-- Summary Cards -->
  <div style="display:flex;gap:16px;margin-bottom:32px">
    <div style="flex:1;background:#f9fafb;border-radius:12px;padding:20px;border:1px solid #e5e7eb">
      <p style="margin:0 0 4px;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px">Current Balance</p>
      <p style="margin:0;font-size:24px;font-weight:700;color:#0a0a0a">${fmt(balance)}</p>
    </div>
    <div style="flex:1;background:#f0fdf4;border-radius:12px;padding:20px;border:1px solid #bbf7d0">
      <p style="margin:0 0 4px;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px">Total Money In</p>
      <p style="margin:0;font-size:24px;font-weight:700;color:#16a34a">+${fmt(totalIn)}</p>
    </div>
    <div style="flex:1;background:#fef2f2;border-radius:12px;padding:20px;border:1px solid #fecaca">
      <p style="margin:0 0 4px;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px">Total Money Out</p>
      <p style="margin:0;font-size:24px;font-weight:700;color:#dc2626">-${fmt(totalOut)}</p>
    </div>
    <div style="flex:1;background:#f9fafb;border-radius:12px;padding:20px;border:1px solid #e5e7eb">
      <p style="margin:0 0 4px;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px">Total Profit</p>
      <p style="margin:0;font-size:24px;font-weight:700;color:#1a8a6e">+${fmt(totalProfit)}</p>
    </div>
  </div>

  <!-- Transactions -->
  <h2 style="margin:0 0 16px;font-size:16px;font-weight:600;color:#0a0a0a">Transaction History</h2>
  <p style="margin:0 0 12px;font-size:12px;color:#9ca3af">${txs.length} transactions</p>

  <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
    <thead>
      <tr style="background:#f9fafb">
        <th style="padding:10px 12px;text-align:left;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;font-weight:600;border-bottom:1px solid #e5e7eb">Date</th>
        <th style="padding:10px 12px;text-align:left;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;font-weight:600;border-bottom:1px solid #e5e7eb">Type</th>
        <th style="padding:10px 12px;text-align:left;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;font-weight:600;border-bottom:1px solid #e5e7eb">Description</th>
        <th style="padding:10px 12px;text-align:left;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;font-weight:600;border-bottom:1px solid #e5e7eb">Asset</th>
        <th style="padding:10px 12px;text-align:right;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;font-weight:600;border-bottom:1px solid #e5e7eb">Amount</th>
        <th style="padding:10px 12px;text-align:right;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;font-weight:600;border-bottom:1px solid #e5e7eb">Balance</th>
      </tr>
    </thead>
    <tbody>
      ${txRows}
    </tbody>
  </table>

  <!-- Footer -->
  <div style="margin-top:40px;padding-top:20px;border-top:1px solid #e5e7eb">
    <p style="margin:0 0 4px;font-size:11px;color:#9ca3af">Naxcal Capital Ltd is authorised and regulated by the Financial Conduct Authority.</p>
    <p style="margin:0;font-size:11px;color:#c0c0c0">This statement is generated automatically. Your capital is at risk. Past performance is not indicative of future results.</p>
  </div>

</div>
</body>
</html>`;

    const filename = `naxcal-statement-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}.html`;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to generate statement" }, { status: 500 });
  }
}
