import { NextResponse } from "next/server";
import { getBatchPrices } from "@/lib/yahoo-finance";

const POPULAR = [
  "AAPL","MSFT","GOOGL","AMZN","TSLA","NVDA","META","NFLX",
  "JPM","BAC","GS","V","MA","PYPL",
  "JNJ","PFE","ABBV","UNH",
  "XOM","CVX",
  "WMT","TGT","COST","HD",
  "DIS","SPOT",
  "BRK-B","BLK","MS","C","WFC",
  "COIN",
  "SPY","QQQ","VOO","VTI","ARKK","GLD","SLV",
  "BABA","NIO",
  "UBER","ABNB",
  "SHOP","SNOW","PLTR","RBLX",
  "AMD","INTC","QCOM","AVGO",
  "BA","LMT","RTX",
  "PG","KO","PEP","MCD","SBUX",
  "CRM","NOW","ADBE","ORCL",
  "T","VZ","TMUS",
  "GE","HON","CAT",
  "NKE","LULU",
  "F","GM","RIVN",
  "SOFI",
];

const SECTORS: Record<string, string> = {
  AAPL:"Technology",MSFT:"Technology",GOOGL:"Technology",AMZN:"Consumer",TSLA:"Consumer",NVDA:"Technology",META:"Technology",NFLX:"Consumer",
  JPM:"Finance",BAC:"Finance",GS:"Finance",V:"Finance",MA:"Finance",PYPL:"Finance",
  JNJ:"Healthcare",PFE:"Healthcare",ABBV:"Healthcare",UNH:"Healthcare",
  XOM:"Energy",CVX:"Energy",
  WMT:"Consumer",TGT:"Consumer",COST:"Consumer",HD:"Consumer",
  DIS:"Consumer",SPOT:"Technology",
  "BRK-B":"Finance",BLK:"Finance",MS:"Finance",C:"Finance",WFC:"Finance",
  COIN:"Finance",
  SPY:"ETFs",QQQ:"ETFs",VOO:"ETFs",VTI:"ETFs",ARKK:"ETFs",GLD:"ETFs",SLV:"ETFs",
  BABA:"Technology",NIO:"Consumer",
  UBER:"Technology",ABNB:"Consumer",
  SHOP:"Technology",SNOW:"Technology",PLTR:"Technology",RBLX:"Technology",
  AMD:"Technology",INTC:"Technology",QCOM:"Technology",AVGO:"Technology",
  BA:"Industrial",LMT:"Industrial",RTX:"Industrial",
  PG:"Consumer",KO:"Consumer",PEP:"Consumer",MCD:"Consumer",SBUX:"Consumer",
  CRM:"Technology",NOW:"Technology",ADBE:"Technology",ORCL:"Technology",
  T:"Technology",VZ:"Technology",TMUS:"Technology",
  GE:"Industrial",HON:"Industrial",CAT:"Industrial",
  NKE:"Consumer",LULU:"Consumer",
  F:"Consumer",GM:"Consumer",RIVN:"Consumer",
  SOFI:"Finance",
};

const ETFS = new Set(["SPY","QQQ","VOO","VTI","ARKK","GLD","SLV"]);

export async function GET() {
  try {
    const quotes = await getBatchPrices(POPULAR);

    const result = quotes.map((q) => ({
      symbol: q.symbol,
      name: q.name,
      price: q.price,
      change: q.change,
      chart: q.chart,
      sector: SECTORS[q.symbol] || "Other",
      type: ETFS.has(q.symbol) ? "ETF" : "EQUITY",
    }));

    return NextResponse.json(result);
  } catch {
    return NextResponse.json([]);
  }
}
