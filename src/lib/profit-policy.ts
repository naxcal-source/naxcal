export const TIER_DAILY_RATE_PERCENT = {
  bronze: 1.5,
  silver: 1.8,
  gold: 2.1,
} as const;

export type ProfitTier = keyof typeof TIER_DAILY_RATE_PERCENT;

export const PROFIT_TIME_ZONE = "UTC";
export const PROFIT_DAYS_LABEL = "Monday through Friday";
export const WEEKDAYS_PER_WEEK = 5;
export const AVERAGE_WEEKDAYS_PER_MONTH = 22;
export const WEEKDAYS_PER_YEAR = 260;

export function getTierDailyRatePercent(tier: string | null | undefined) {
  const normalizedTier = String(tier || "bronze").toLowerCase() as ProfitTier;
  return TIER_DAILY_RATE_PERCENT[normalizedTier] ?? TIER_DAILY_RATE_PERCENT.bronze;
}

export function getTierDailyRate(tier: string | null | undefined) {
  return getTierDailyRatePercent(tier) / 100;
}

export function getUtcProfitDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function isProfitDate(value: Date | string) {
  const date = value instanceof Date
    ? value
    : /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T00:00:00.000Z`)
      : new Date(value);

  if (Number.isNaN(date.getTime())) return false;
  const day = date.getUTCDay();
  return day >= 1 && day <= 5;
}
