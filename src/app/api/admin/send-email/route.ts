import { NextRequest, NextResponse } from "next/server";
import {
  sendKYCApprovedEmail,
  sendKYCRejectedEmail,
  sendWithdrawalApprovedEmail,
  sendDailyProfitEmail,
  sendDepositConfirmedEmail,
  sendInvestorOutreachEmail,
} from "@/lib/emails";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, email, name } = body;

    if (!type || !email) {
      return NextResponse.json({ error: "Missing type or email" }, { status: 400 });
    }

    switch (type) {
      case "kyc_approved":
        await sendKYCApprovedEmail(email, name || "Investor");
        break;
      case "kyc_rejected":
        await sendKYCRejectedEmail(email, name || "Investor", body.reason || "Documents could not be verified");
        break;
      case "withdrawal_approved":
        await sendWithdrawalApprovedEmail(
          email,
          name || "Investor",
          body.amount || 0,
          body.currency || "USDT",
          body.walletAddress || "",
        );
        break;
      case "deposit_approved":
        await sendDepositConfirmedEmail(
          email,
          name || "Investor",
          body.amount || 0,
          body.currency || "USDT",
          body.txHash || "",
        );
        break;
      case "daily_profit":
        await sendDailyProfitEmail(email, name || "Investor", body.amount || 0, body.percentage || 0);
        break;
      case "investor_outreach":
        await sendInvestorOutreachEmail(email, name || "Investor");
        break;
      default:
        return NextResponse.json({ error: "Unknown email type" }, { status: 400 });
    }

    return NextResponse.json({ status: "sent" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Send email error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
