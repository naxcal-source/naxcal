import { NextResponse } from "next/server";
import { getBatchPrices } from "@/lib/yahoo-finance";

const WATCH = [
  "AAPL","MSFT","GOOGL","AMZN","TSLA","NVDA","META","NFLX","AMD","INTC",
  "BA","DIS","COIN","PLTR","SOFI","RIVN","NIO","UBER","SHOP","SNOW",
  "PFE","XOM","JPM","BAC","GS","V","MA","CRM","ORCL",
  "F","GM","NKE","KO","PEP","MCD","WMT","COST","HD","TGT",
];

export async function GET() {
  try {
    const quotes = await getBatchPrices(WATCH);
    const sorted = [...quotes].sort((a, b) => b.change - a.change);
    const gainers = sorted.filter((q) => q.change > 0).slice(0, 10).map((q) => ({
      symbol: q.symbol, name: q.name, price: q.price, change: q.change,
    }));
    const losers = sorted.filter((q) => q.change < 0).sort((a, b) => a.change - b.change).slice(0, 10).map((q) => ({
      symbol: q.symbol, name: q.name, price: q.price, change: q.change,
    }));
    return NextResponse.json({ gainers, losers });
  } catch {
    return NextResponse.json({ gainers: [], losers: [] });
  }
}
