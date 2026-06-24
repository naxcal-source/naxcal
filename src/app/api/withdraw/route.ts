import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-api";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { amount, asset, wallet, pin } = await req.json();

    if (!amount || amount <= 0) return NextResponse.json({ error: "Enter a valid amount." }, { status: 400 });
    if (amount < 100) return NextResponse.json({ error: "Minimum withdrawal is $100." }, { status: 400 });
    if (!wallet) return NextResponse.json({ error: "Enter a wallet address." }, { status: 400 });
    if (!pin || pin.length !== 6) return NextResponse.json({ error: "Enter your 6-digit withdrawal PIN." }, { status: 400 });

    const { data: profile } = await supabaseAdmin.from("profiles").select("balance, kyc_status, withdrawal_pin").eq("id", user.id).single();
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    if (profile.kyc_status !== "approved") return NextResponse.json({ error: "Complete KYC verification before withdrawing." }, { status: 403 });
    if (!profile.withdrawal_pin) return NextResponse.json({ error: "Set a withdrawal PIN in Settings → Security first." }, { status: 400 });
    if (profile.withdrawal_pin !== pin) return NextResponse.json({ error: "Incorrect withdrawal PIN." }, { status: 400 });
    if (Number(profile.balance) < amount) return NextResponse.json({ error: "Insufficient balance." }, { status: 400 });

    const oldBalance = Number(profile.balance);
    const newBalance = oldBalance - amount;

    await supabaseAdmin.from("profiles").update({ balance: newBalance }).eq("id", user.id);
    await supabaseAdmin.from("transactions").insert({
      user_id: user.id,
      type: "withdrawal",
      amount,
      asset: asset || "USDT",
      status: "pending",
      wallet_address: wallet,
      description: `Withdrawal to ${asset || "USDT"} wallet`,
      balance_before: oldBalance,
      balance_after: newBalance,
    });

    return NextResponse.json({ status: "ok", new_balance: newBalance });
  } catch (err) {
    console.error("Withdraw error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
