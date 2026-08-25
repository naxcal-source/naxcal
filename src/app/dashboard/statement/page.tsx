"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Download, FileText } from "lucide-react";
import { useDashboard } from "@/contexts/DashboardContext";
import { calendarMonthKey } from "@/lib/dashboard-display";

type Tx = { id: string; type: string; amount: number; status: string; description: string | null; balance_after: number | null; created_at: string };
type Position = { market_value?: number };
const creditTypes = ["deposit", "profit", "bonus", "referral", "adjustment_credit", "crypto_sell", "stock_sell"];
const debitTypes = ["withdrawal", "adjustment_debit", "stock_buy", "swap"];

export default function StatementPage() {
  const { profile, fmt } = useDashboard();
  const [txs, setTxs] = useState<Tx[]>([]);
  const [stocks, setStocks] = useState<Position[]>([]);
  const [cryptos, setCryptos] = useState<Position[]>([]);
  const [generatedAt] = useState(() => new Date());
  const [selectedMonth, setSelectedMonth] = useState(() => calendarMonthKey(new Date()));

  useEffect(() => {
    if (!profile) return;
    Promise.all([
      fetch("/api/me/transactions?limit=500").then((r) => r.json()).catch(() => []),
      fetch("/api/stocks/portfolio").then((r) => r.json()).catch(() => []),
      fetch("/api/crypto/portfolio").then((r) => r.json()).catch(() => []),
    ]).then(([transactions, stockPositions, cryptoPositions]) => {
      if (Array.isArray(transactions)) setTxs(transactions);
      if (Array.isArray(stockPositions)) setStocks(stockPositions);
      if (Array.isArray(cryptoPositions)) setCryptos(cryptoPositions);
    });
  }, [profile]);

  const availableMonths = useMemo(() => {
    const values = new Set(txs.map((tx) => calendarMonthKey(tx.created_at)));
    values.add(calendarMonthKey(generatedAt));
    return [...values].sort().reverse();
  }, [txs, generatedAt]);
  if (!profile) return null;

  const statementTxs = txs.filter((tx) => calendarMonthKey(tx.created_at) === selectedMonth);
  const totalIn = statementTxs.filter((tx) => creditTypes.includes(tx.type)).reduce((sum, tx) => sum + Number(tx.amount), 0);
  const totalOut = statementTxs.filter((tx) => debitTypes.includes(tx.type)).reduce((sum, tx) => sum + Number(tx.amount), 0);
  const monthProfit = statementTxs.filter((tx) => tx.type === "profit").reduce((sum, tx) => sum + Number(tx.amount), 0);
  const stockValue = stocks.reduce((sum, position) => sum + Number(position.market_value || 0), 0);
  const cryptoValue = cryptos.reduce((sum, position) => sum + Number(position.market_value || 0), 0);
  const cashValue = Number(profile.balance || 0);
  const accountValue = cashValue + stockValue + cryptoValue;
  const statementLabel = new Date(`${selectedMonth}-01T12:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="max-w-5xl mx-auto">
      <div className="print:hidden flex items-center gap-2 text-xs text-[#9ca3af] mb-4"><Link href="/dashboard" className="hover:text-naxcal-teal">Dashboard</Link><ChevronRight size={12} /><span className="text-[#374151]">Statements</span></div>
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3"><FileText size={22} className="text-naxcal-teal" /><div><h1 className="text-xl font-bold text-[#0f172a]">Statement Centre</h1><p className="text-xs text-[#64748b] mt-1">Review and print one calendar month at a time.</p></div></div>
        <div className="flex gap-2">
          <select aria-label="Statement month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} className="min-w-0 px-3 py-2.5 rounded-lg border border-[#e2e8f0] bg-white text-sm text-[#374151]">{availableMonths.map((month) => <option key={month} value={month}>{new Date(`${month}-01T12:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</option>)}</select>
          <button type="button" onClick={() => window.print()} className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white btn-teal"><Download size={15} /> Print / PDF</button>
        </div>
      </div>

      <article className="bg-white border border-[#e2e8f0] rounded-2xl p-5 sm:p-8 print:border-0 print:p-0">
        <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-6 border-b-2 border-[#0f172a]"><div><p className="text-xl font-bold text-[#0f172a]">NAXCAL</p><p className="text-xs text-[#64748b] mt-1">Account statement</p></div><div className="sm:text-right"><h2 className="text-xl font-bold text-[#0f172a]">{statementLabel}</h2><p className="text-xs text-[#64748b] mt-1">Generated {generatedAt.toLocaleDateString("en-US", { dateStyle: "long" })}</p></div></header>
        <section className="grid sm:grid-cols-3 gap-4 py-6"><div><p className="text-[10px] uppercase tracking-wider text-[#94a3b8]">Account holder</p><p className="text-sm font-semibold text-[#0f172a] mt-1">{profile.full_name || "Investor"}</p><p className="text-xs text-[#64748b] break-all">{profile.email}</p></div><div><p className="text-[10px] uppercase tracking-wider text-[#94a3b8]">Tier</p><p className="text-sm font-semibold capitalize text-[#0f172a] mt-1">{profile.tier || "bronze"}</p></div><div><p className="text-[10px] uppercase tracking-wider text-[#94a3b8]">Statement activity</p><p className="text-sm font-semibold text-[#0f172a] mt-1">{statementTxs.length} transactions</p></div></section>
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">{[{ label: "Total account value", value: accountValue, color: "text-[#0f172a]" }, { label: "Money in", value: totalIn, color: "text-emerald-600" }, { label: "Money out", value: totalOut, color: "text-red-600" }, { label: "Month profit", value: monthProfit, color: "text-naxcal-teal" }].map((item) => <div key={item.label} className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-4"><p className="text-[10px] uppercase text-[#94a3b8]">{item.label}</p><p className={`text-lg sm:text-xl font-bold mt-1 ${item.color}`}>{fmt(item.value)}</p></div>)}</section>
        <section className="grid grid-cols-3 gap-3 mb-8">{[{ label: "Cash", value: cashValue }, { label: "Crypto", value: cryptoValue }, { label: "Stocks", value: stockValue }].map((item) => <div key={item.label} className="rounded-lg border border-[#e2e8f0] p-3 text-center"><p className="text-[10px] text-[#94a3b8]">{item.label}</p><p className="text-xs sm:text-sm font-bold text-[#0f172a] mt-1">{fmt(item.value)}</p></div>)}</section>
        <h3 className="text-sm font-semibold text-[#0f172a] mb-3">Transaction activity</h3>
        <div className="overflow-x-auto border border-[#e2e8f0] rounded-xl"><table className="w-full min-w-[680px] border-collapse"><thead className="bg-[#f8fafc]"><tr>{["Date", "Type", "Description", "Amount", "Balance"].map((label) => <th key={label} className={`px-3 py-2.5 text-[10px] uppercase tracking-wider text-[#94a3b8] ${["Amount", "Balance"].includes(label) ? "text-right" : "text-left"}`}>{label}</th>)}</tr></thead><tbody>{statementTxs.length ? statementTxs.map((tx) => { const credit = creditTypes.includes(tx.type); return <tr key={tx.id} className="border-t border-[#f1f5f9]"><td className="px-3 py-2.5 text-xs text-[#64748b] whitespace-nowrap">{new Date(tx.created_at).toLocaleDateString()}</td><td className="px-3 py-2.5 text-xs capitalize text-[#374151]">{tx.type.replaceAll("_", " ")}</td><td className="px-3 py-2.5 text-xs text-[#374151]">{tx.description || "—"}</td><td className={`px-3 py-2.5 text-xs font-semibold text-right ${credit ? "text-emerald-600" : "text-red-600"}`}>{credit ? "+" : "-"}{fmt(Math.abs(Number(tx.amount)))}</td><td className="px-3 py-2.5 text-xs text-right text-[#374151]">{tx.balance_after == null ? "—" : fmt(Number(tx.balance_after))}</td></tr>; }) : <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-[#94a3b8]">No transactions for {statementLabel}.</td></tr>}</tbody></table></div>
        <footer className="mt-8 pt-4 border-t border-[#e2e8f0] text-[10px] text-[#94a3b8]">This statement is generated from the account ledger and current portfolio positions. Market values can change. Review the Terms and Risk Disclosure before making financial decisions.</footer>
      </article>
    </div>
  );
}
