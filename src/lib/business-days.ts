export const ELIGIBLE_WEEKDAYS_PER_YEAR = 260;

export function isWeekendLabel(label?: string) {
  if (!label || !/^\d{4}-\d{2}-\d{2}$/.test(label)) return false;
  const day = new Date(label + "T00:00:00Z").getUTCDay();
  return day === 0 || day === 6;
}

export function projectedWeekdayReturn(principal: number, dailyRate: number, days: number) {
  if (![principal, dailyRate, days].every(Number.isFinite) || principal < 0 || dailyRate < 0 || days < 0) {
    throw new Error("Projection inputs must be finite non-negative numbers");
  }
  return principal * dailyRate * days;
}
