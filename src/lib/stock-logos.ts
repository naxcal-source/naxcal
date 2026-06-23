const DOMAINS: Record<string, string> = {
  AAPL: "apple.com", MSFT: "microsoft.com", GOOGL: "google.com", AMZN: "amazon.com",
  TSLA: "tesla.com", NVDA: "nvidia.com", META: "meta.com", NFLX: "netflix.com",
  JPM: "jpmorganchase.com", BAC: "bankofamerica.com", GS: "goldmansachs.com",
  V: "visa.com", MA: "mastercard.com", PYPL: "paypal.com",
  JNJ: "jnj.com", PFE: "pfizer.com", ABBV: "abbvie.com", UNH: "unitedhealthgroup.com",
  XOM: "exxonmobil.com", CVX: "chevron.com",
  WMT: "walmart.com", TGT: "target.com", COST: "costco.com", HD: "homedepot.com",
  DIS: "disney.com", SPOT: "spotify.com",
  "BRK-B": "berkshirehathaway.com", BLK: "blackrock.com", MS: "morganstanley.com",
  C: "citigroup.com", WFC: "wellsfargo.com", COIN: "coinbase.com",
  SPY: "ssga.com", QQQ: "invesco.com", VOO: "vanguard.com", VTI: "vanguard.com",
  ARKK: "ark-invest.com", GLD: "spdrgoldshares.com", SLV: "ishares.com",
  BABA: "alibabagroup.com", NIO: "nio.com",
  UBER: "uber.com", ABNB: "airbnb.com",
  SHOP: "shopify.com", SNOW: "snowflake.com", PLTR: "palantir.com", RBLX: "roblox.com",
  AMD: "amd.com", INTC: "intel.com", QCOM: "qualcomm.com", AVGO: "broadcom.com",
  BA: "boeing.com", LMT: "lockheedmartin.com", RTX: "rtx.com",
  PG: "pg.com", KO: "coca-cola.com", PEP: "pepsico.com", MCD: "mcdonalds.com", SBUX: "starbucks.com",
  CRM: "salesforce.com", NOW: "servicenow.com", ADBE: "adobe.com", ORCL: "oracle.com",
  T: "att.com", VZ: "verizon.com", TMUS: "t-mobile.com",
  GE: "ge.com", HON: "honeywell.com", CAT: "caterpillar.com",
  NKE: "nike.com", LULU: "lululemon.com",
  F: "ford.com", GM: "gm.com", RIVN: "rivian.com",
  SOFI: "sofi.com", MSTR: "microstrategy.com",
};

export function getStockLogoUrl(symbol: string): string {
  const domain = DOMAINS[symbol];
  if (domain) return `https://logo.clearbit.com/${domain}`;
  return "";
}

export function hasLogo(symbol: string): boolean {
  return !!DOMAINS[symbol];
}
