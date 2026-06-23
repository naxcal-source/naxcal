const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";

export type StockQuote = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  prevClose: number;
  chart: number[];
};

export async function getStockPrice(symbol: string): Promise<StockQuote | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`,
      { headers: { "User-Agent": UA }, next: { revalidate: 60 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const result = data.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta;
    const price = meta.regularMarketPrice || 0;
    const prevClose = meta.chartPreviousClose || meta.previousClose || price;
    const change = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;
    const closes = (result.indicators?.quote?.[0]?.close || []).filter(Boolean) as number[];

    return {
      symbol: meta.symbol || symbol,
      name: meta.shortName || meta.longName || symbol,
      price,
      change: parseFloat(change.toFixed(2)),
      prevClose,
      chart: closes.slice(-5),
    };
  } catch {
    return null;
  }
}

export async function getBatchPrices(symbols: string[]): Promise<StockQuote[]> {
  const results = await Promise.allSettled(symbols.map(getStockPrice));
  return results
    .filter((r): r is PromiseFulfilledResult<StockQuote | null> => r.status === "fulfilled" && r.value !== null)
    .map((r) => r.value!);
}

export async function searchStocks(query: string): Promise<{ symbol: string; name: string; exchange: string; type: string }[]> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=20&newsCount=0&listsCount=0`,
      { headers: { "User-Agent": UA } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.quotes || [])
      .filter((q: Record<string, string>) => q.quoteType === "EQUITY" || q.quoteType === "ETF")
      .map((q: Record<string, string>) => ({
        symbol: q.symbol,
        name: q.shortname || q.longname || q.symbol,
        exchange: q.exchDisp || q.exchange || "",
        type: q.quoteType,
      }));
  } catch {
    return [];
  }
}
