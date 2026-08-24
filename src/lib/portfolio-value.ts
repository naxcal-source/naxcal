import { supabaseAdmin } from "@/lib/supabase-admin";

export async function getPersistedCryptoValues(userIds: string[]) {
  const values = new Map<string, number>();
  if (userIds.length === 0) return values;

  const { data, error } = await supabaseAdmin
    .from("crypto_positions")
    .select("user_id, qty, avg_price")
    .in("user_id", userIds);

  if (error) throw new Error(`Failed to load crypto values: ${error.message}`);

  for (const position of data || []) {
    const value = Number(position.qty || 0) * Number(position.avg_price || 0);
    if (!Number.isFinite(value) || value <= 0) continue;
    values.set(position.user_id, (values.get(position.user_id) || 0) + value);
  }

  return values;
}

export function accountValue(cashBalance: unknown, cryptoValue: unknown) {
  return Number(cashBalance || 0) + Number(cryptoValue || 0);
}
