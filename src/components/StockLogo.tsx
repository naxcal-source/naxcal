"use client";

import { useState } from "react";
import { getStockLogoUrl } from "@/lib/stock-logos";

export default function StockLogo({ symbol, size = 36, className = "" }: { symbol: string; size?: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  const url = getStockLogoUrl(symbol);

  if (!url || failed) {
    return (
      <div className={`rounded-full flex items-center justify-center font-bold text-white shrink-0 ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.28, background: "#6b7280" }}>
        {symbol.slice(0, 2)}
      </div>
    );
  }

  return (
    <img src={url} alt={symbol} width={size} height={size}
      className={`rounded-full object-cover shrink-0 ${className}`}
      style={{ width: size, height: size, background: "#f1f5f9" }}
      onError={() => setFailed(true)} />
  );
}
