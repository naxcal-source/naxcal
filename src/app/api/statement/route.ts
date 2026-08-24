import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-api";
import { supabaseAdmin } from "@/lib/supabase-admin";

function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] || character);
}

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, balance, total_deposited, total_profit, tier")
      .eq("id", user.id)
      .single();
    const { data: transactions } = await supabaseAdmin
      .from("transactions")
      .select("id, type, amount, asset, status, description, balance_after, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    const txs = transactions || [];
    const name = escapeHtml((profile as Record<string, unknown>)?.full_name || "Investor");
    const email = escapeHtml(user.email || "");
    const balance = Number((profile as Record<string, unknown>)?.balance || 0);
    const totalProfit = Number((profile as Record<string, unknown>)?.total_profit || 0);
    const rawTier = (profile as Record<string, unknown>)?.tier as string || "bronze";
    const tier = escapeHtml(rawTier.charAt(0).toUpperCase() + rawTier.slice(1));
    const now = new Date();
    const monthYear = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    const generated = now.toLocaleDateString("en-US", { dateStyle: "long" }) + " at " + now.toLocaleTimeString("en-US", { timeStyle: "short" });

    const fmt = (n: number) => "$" + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const creditTypes = new Set([
      "deposit",
      "profit",
      "bonus",
      "referral",
      "adjustment_credit",
      "stock_sell",
      "crypto_sell",
    ]);
    const debitTypes = new Set(["withdrawal", "fee", "adjustment_debit", "stock_buy"]);
    const totalCredits = txs
      .filter((transaction) => creditTypes.has(transaction.type))
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
    const totalDebits = txs
      .filter((transaction) => debitTypes.has(transaction.type))
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

    const txRows = txs.map((tx: Record<string, unknown>) => {
      const date = new Date(tx.created_at as string);
      const transactionType = tx.type as string;
      const isCredit = creditTypes.has(transactionType);
      const isDebit = debitTypes.has(transactionType);
      const type = escapeHtml((tx.type as string).replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()));
      const description = escapeHtml((tx.description as string) || "—");
      const asset = escapeHtml(tx.asset || "—");
      const status = escapeHtml(String(tx.status || "completed").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()));
      const amountPrefix = isCredit ? "+" : isDebit ? "-" : "";
      const amountColor = isCredit ? "#16a34a" : isDebit ? "#dc2626" : "#374151";
      return `<tr>
        <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#6b7280">${date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#374151">${type}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#374151">${description}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#374151">${asset}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#374151">${status}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;font-weight:600;text-align:right;color:${amountColor}">${amountPrefix}${fmt(Number(tx.amount))}</td>
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
      <img src="https://naxcal.us/Naxcal_Primary_Logo.png" alt="Naxcal" style="height:48px;width:auto;margin-bottom:8px;display:block" />
      <p style="margin:0;font-size:11px;color:#9ca3af">Naxcal Capital Ltd · Account Services</p>
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
      <p style="margin:0 0 4px;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px">Cash Balance</p>
      <p style="margin:0;font-size:24px;font-weight:700;color:#0a0a0a">${fmt(balance)}</p>
    </div>
    <div style="flex:1;background:#f0fdf4;border-radius:12px;padding:20px;border:1px solid #bbf7d0">
      <p style="margin:0 0 4px;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px">Cash Credits</p>
      <p style="margin:0;font-size:24px;font-weight:700;color:#16a34a">+${fmt(totalCredits)}</p>
    </div>
    <div style="flex:1;background:#fef2f2;border-radius:12px;padding:20px;border:1px solid #fecaca">
      <p style="margin:0 0 4px;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px">Cash Debits</p>
      <p style="margin:0;font-size:24px;font-weight:700;color:#dc2626">-${fmt(totalDebits)}</p>
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
        <th style="padding:10px 12px;text-align:left;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;font-weight:600;border-bottom:1px solid #e5e7eb">Status</th>
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
    <p style="margin:0 0 4px;font-size:11px;color:#9ca3af">This statement is generated automatically from the account ledger.</p>
    <p style="margin:0;font-size:11px;color:#c0c0c0">Investment products involve risk. Past performance is not indicative of future results.</p>
  </div>

</div>
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, no-store",
        "Content-Security-Policy": "default-src 'none'; img-src https://naxcal.us data:; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to generate statement" }, { status: 500 });
  }
}
