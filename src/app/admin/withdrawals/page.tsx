"use client";

import { useEffect, useState } from "react";
import { ArrowUpCircle, Check, X, Loader2, Copy, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";

type Withdrawal = {
  id: string; user_id: string; amount: number; asset: string | null;
  wallet_address: string | null; status: string; tx_hash: string | null;
  admin_note: string | null; created_at: string; updated_at: string;
  metadata: Record<string, unknown> | null;
  profiles: { full_name: string | null; email: string } | null;
};

function networkForAsset(asset: string | null) {
  if (asset === "USDT") return "TRON (TRC-20)";
  if (asset === "BTC") return "Bitcoin";
  if (asset === "ETH") return "Ethereum";
  if (asset === "BNB") return "BNB Smart Chain (BEP-20)";
  if (asset === "SOL") return "Solana";
  return "Unknown network";
}

export default function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [failModal, setFailModal] = useState<Withdrawal | null>(null);
  const [failureReason, setFailureReason] = useState("");
  const [failureConfirmed, setFailureConfirmed] = useState(false);
  const [completeModal, setCompleteModal] = useState<Withdrawal | null>(null);
  const [payoutReference, setPayoutReference] = useState("");
  const [referenceType, setReferenceType] = useState<"provider" | "blockchain">("blockchain");
  const [payoutProvider, setPayoutProvider] = useState("");
  const [outputIndex, setOutputIndex] = useState("0");
  const [settlementAmount, setSettlementAmount] = useState("");
  const [payoutFee, setPayoutFee] = useState("");
  const [completionNote, setCompletionNote] = useState("");
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState<"pending" | "completed">("pending");
  const [copiedWallet, setCopiedWallet] = useState<string | null>(null);

  const copyWallet = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopiedWallet(addr);
    setTimeout(() => setCopiedWallet(null), 2000);
  };

  const load = async () => {
    const res = await fetch("/api/admin/transactions");
    if (res.ok) {
      const data = await res.json();
      setWithdrawals(data as Withdrawal[]);
    }
  };

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/transactions")
      .then((response) => response.ok ? response.json() : [])
      .then((data) => {
        if (!cancelled) setWithdrawals(data as Withdrawal[]);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const fmt = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleApprove = async (w: Withdrawal) => {
    setProcessing(w.id);
    try {
      const response = await fetch("/api/admin/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", id: w.id }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Approval failed");
      setMessage(result.already_reviewed
        ? `Withdrawal is already ${result.status}`
        : `Withdrawal of ${fmt(w.amount)} approved for processing`);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Approval failed");
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setProcessing(rejectModal);
    const w = withdrawals.find((x) => x.id === rejectModal);
    if (w) {
      try {
        const response = await fetch("/api/admin/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "reject", id: w.id, reason: rejectReason || undefined }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || "Rejection failed");
        setMessage(result.already_reviewed
          ? `Withdrawal is already ${result.status}`
          : "Withdrawal rejected — cash refunded and notification queued");
        setRejectModal(null);
        setRejectReason("");
        await load();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Rejection failed");
      } finally {
        setProcessing(null);
      }
    }
  };

  const openCompleteModal = (withdrawal: Withdrawal) => {
    const agreedFee = withdrawal.metadata?.agreed_payout_fee_usd;
    const agreedFeeText = typeof agreedFee === "number" || typeof agreedFee === "string"
      ? String(agreedFee)
      : "0";
    setCompleteModal(withdrawal);
    setPayoutReference("");
    setSettlementAmount("");
    setCompletionNote("");
    setPayoutFee(/^\d{1,8}(?:\.\d{1,8})?$/.test(agreedFeeText) ? agreedFeeText : "0");
    setReferenceType("blockchain");
    setPayoutProvider("");
    setOutputIndex("0");
  };

  const closeFailModal = () => {
    setFailModal(null);
    setFailureReason("");
    setFailureConfirmed(false);
  };

  const handleProcessingFailure = async () => {
    if (!failModal) return;
    const reason = failureReason.trim();
    if (reason.length < 3) {
      setMessage("Enter a specific payout failure reason");
      return;
    }
    if (!failureConfirmed) {
      setMessage("Confirm that no payout was sent before refunding the withdrawal");
      return;
    }

    setProcessing(failModal.id);
    try {
      const response = await fetch("/api/admin/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "fail_processing",
          id: failModal.id,
          reason,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Processing withdrawal refund failed");

      setMessage(result.already_failed
        ? "This processing withdrawal was already failed and refunded with the same reason"
        : `Payout marked unsuccessful — ${fmt(Number(result.refunded_amount || failModal.amount))} restored to the user's cash balance`);
      closeFailModal();
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Processing withdrawal refund failed");
    } finally {
      setProcessing(null);
    }
  };

  const closeCompleteModal = () => {
    setCompleteModal(null);
    setPayoutReference("");
    setReferenceType("blockchain");
    setPayoutProvider("");
    setOutputIndex("0");
    setSettlementAmount("");
    setPayoutFee("");
    setCompletionNote("");
  };

  const handleComplete = async () => {
    if (!completeModal) return;
    const reference = payoutReference.trim();
    const fee = payoutFee.trim() || "0";
    if (reference.length < 4) {
      setMessage("Enter the provider or blockchain payout reference");
      return;
    }
    if (!/^\d{1,8}(?:\.\d{1,8})?$/.test(fee)) {
      setMessage("Enter a valid non-negative payout fee");
      return;
    }
    if (!/^\d{1,18}(?:\.\d{1,18})?$/.test(settlementAmount.trim())
        || Number(settlementAmount) <= 0) {
      setMessage(`Enter the exact positive ${completeModal.asset || "asset"} quantity sent`);
      return;
    }
    if (referenceType === "blockchain" && (
      !/^\d{1,10}$/.test(outputIndex)
      || Number(outputIndex) > 2_147_483_647
    )) {
      setMessage("Enter the blockchain transfer, log, or output index");
      return;
    }
    if (referenceType === "provider" && !/^[a-z0-9][a-z0-9._-]{1,39}$/.test(payoutProvider)) {
      setMessage("Enter a valid payout provider identifier");
      return;
    }
    if (Number(fee) >= Number(completeModal.amount)) {
      setMessage("The payout fee must be less than the withdrawal amount");
      return;
    }

    setProcessing(completeModal.id);
    try {
      const response = await fetch("/api/admin/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "complete",
          id: completeModal.id,
          payoutReference: reference,
          referenceType,
          provider: referenceType === "provider" ? payoutProvider : undefined,
          outputIndex: referenceType === "blockchain" ? outputIndex : null,
          settlementAmount: settlementAmount.trim(),
          fee,
          note: completionNote.trim() || undefined,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Withdrawal completion failed");

      const netAmount = Number(result.net_amount);
      setMessage(result.already_completed
        ? "This withdrawal was already completed with the same payout details"
        : `Withdrawal marked paid — ${result.settlement_amount} ${result.settlement_asset || completeModal.asset || ""} sent (${fmt(Number.isFinite(netAmount) ? netAmount : completeModal.amount)} USD value)`);
      closeCompleteModal();
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Withdrawal completion failed");
    } finally {
      setProcessing(null);
    }
  };

  const filtered = withdrawals.filter((w) => tab === "pending" ? w.status === "pending" : w.status !== "pending");

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <ArrowUpCircle size={22} className="text-amber-500" />
        <h1 className="text-xl font-bold text-white">Withdrawals</h1>
      </div>

      {message && (
        <div className="p-3 rounded-lg bg-naxcal-teal/15 border border-naxcal-teal/30 text-naxcal-teal text-sm mb-4">{message}</div>
      )}

      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab("pending")} className={cn("px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer", tab === "pending" ? "bg-amber-500/15 text-amber-400 border border-amber-500/20" : "text-white/40 border border-white/10")}>
          Pending ({withdrawals.filter((w) => w.status === "pending").length})
        </button>
        <button onClick={() => setTab("completed")} className={cn("px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer", tab === "completed" ? "bg-white/10 text-white/70 border border-white/20" : "text-white/40 border border-white/10")}>
          History
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl p-8 text-center" style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.06)" }}>
          <ArrowUpCircle size={32} className="text-white/20 mx-auto mb-3" />
          <p className="text-sm text-white/40">{tab === "pending" ? "No pending withdrawals" : "No withdrawal history"}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((w) => (
            <div key={w.id} className="rounded-xl p-4" style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-white/80 font-medium">{w.profiles?.full_name || "Unknown"}</p>
                  <p className="text-xs text-white/40 mb-2">{w.profiles?.email} · {new Date(w.created_at).toLocaleDateString()}</p>
                  {w.wallet_address ? (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)" }}>
                      <span className="text-[10px] font-semibold text-amber-400 uppercase shrink-0">{w.asset || "USDT"}</span>
                      <span className="text-xs text-amber-200 font-mono break-all">{w.wallet_address}</span>
                      <button onClick={() => copyWallet(w.wallet_address!)} className="shrink-0 p-1 rounded hover:bg-amber-500/20 cursor-pointer transition-colors">
                        {copiedWallet === w.wallet_address ? <CheckCheck size={13} className="text-emerald-400" /> : <Copy size={13} className="text-amber-400" />}
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-white/20 italic">No wallet address</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-white">{fmt(w.amount)}</span>
                  {w.status === "pending" && (
                    <div className="flex gap-1.5">
                      <button onClick={() => handleApprove(w)} disabled={processing === w.id}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/10 cursor-pointer disabled:opacity-50">
                        {processing === w.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Approve
                      </button>
                      <button onClick={() => setRejectModal(w.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-400 border border-red-500/20 hover:bg-red-500/10 cursor-pointer">
                        <X size={12} /> Reject
                      </button>
                    </div>
                  )}
                  {w.status === "processing" && (
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => openCompleteModal(w)}
                        disabled={processing === w.id}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/10 cursor-pointer disabled:opacity-50"
                      >
                        {processing === w.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCheck size={12} />}
                        Mark paid
                      </button>
                      <button
                        onClick={() => setFailModal(w)}
                        disabled={processing === w.id}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-400 border border-red-500/20 hover:bg-red-500/10 cursor-pointer disabled:opacity-50"
                      >
                        <X size={12} /> Payout failed
                      </button>
                    </div>
                  )}
                  {w.status !== "pending" && (
                    <div className="flex flex-col items-end gap-1">
                      <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium border",
                        w.status === "completed"
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
                          : w.status === "processing"
                            ? "bg-amber-500/15 text-amber-400 border-amber-500/20"
                            : "bg-red-500/15 text-red-400 border-red-500/20"
                      )}>{w.status}</span>
                      {w.status === "completed" && w.tx_hash && (
                        <span className="text-[10px] text-white/30 max-w-[180px] text-right truncate" title={w.tx_hash}>
                          Ref: {w.tx_hash}
                        </span>
                      )}
                      {w.admin_note && <span className="text-[10px] text-white/30 max-w-[160px] text-right truncate">{w.admin_note}</span>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-xl p-6" style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)" }}>
            <h3 className="text-sm font-semibold text-white mb-3">Reject Withdrawal</h3>
            <p className="text-xs text-white/40 mb-3">The withdrawn amount will be refunded to the user&apos;s balance.</p>
            <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason (optional)" rows={2}
              className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder:text-white/20 outline-none mb-4 resize-none" style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)" }} />
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setRejectModal(null); setRejectReason(""); }} className="px-4 py-2 rounded-lg text-xs text-white/50 border border-white/10 cursor-pointer">Cancel</button>
              <button onClick={handleReject} className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-700 cursor-pointer">Reject & Refund</button>
            </div>
          </div>
        </div>
      )}

      {failModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" role="presentation">
          <div className="w-full max-w-md rounded-xl p-6" role="dialog" aria-modal="true" aria-labelledby="fail-payout-title" style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)" }}>
            <h3 id="fail-payout-title" className="text-sm font-semibold text-white mb-2">Payout unsuccessful — refund reserved cash</h3>
            <p className="text-xs text-white/45 mb-4 leading-relaxed">
              Use this only when the approved payout was not sent. Confirming will mark the withdrawal failed and permanently restore the full {fmt(failModal.amount)} to the user&apos;s cash balance.
            </p>

            <label className="block text-[11px] font-semibold text-white/55 mb-1" htmlFor="failure-reason">
              Required failure reason
            </label>
            <input
              id="failure-reason"
              value={failureReason}
              onChange={(event) => setFailureReason(event.target.value)}
              placeholder="Provider rejection, invalid destination, or other verified reason"
              maxLength={500}
              className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder:text-white/20 outline-none mb-4"
              style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)" }}
            />

            <label className="flex items-start gap-2.5 rounded-lg p-3 mb-5 cursor-pointer" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
              <input
                type="checkbox"
                checked={failureConfirmed}
                onChange={(event) => setFailureConfirmed(event.target.checked)}
                className="mt-0.5"
              />
              <span className="text-xs text-red-200 leading-relaxed">I confirm that no provider or blockchain payout was sent and the full reserved cash must be returned.</span>
            </label>

            <div className="flex gap-2 justify-end">
              <button
                onClick={closeFailModal}
                disabled={processing === failModal.id}
                className="px-4 py-2 rounded-lg text-xs text-white/50 border border-white/10 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleProcessingFailure}
                disabled={processing === failModal.id || failureReason.trim().length < 3 || !failureConfirmed}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-700 cursor-pointer disabled:opacity-50"
              >
                {processing === failModal.id && <Loader2 size={12} className="animate-spin" />}
                Confirm failure &amp; refund
              </button>
            </div>
          </div>
        </div>
      )}

      {completeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" role="presentation">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl p-6" role="dialog" aria-modal="true" aria-labelledby="complete-payout-title" style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)" }}>
            <h3 id="complete-payout-title" className="text-sm font-semibold text-white mb-2">Confirm completed payout</h3>
            <p className="text-xs text-white/45 mb-4 leading-relaxed">
              Only confirm after the provider or blockchain shows the payout as completed. This permanently records the payout and updates the user&apos;s withdrawn total.
            </p>

            <div className="rounded-lg p-3 mb-4 text-xs" style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="flex justify-between gap-3">
                <span className="text-white/40">Requested amount</span>
                <span className="font-semibold text-white">{fmt(completeModal.amount)}</span>
              </div>
              <div className="flex justify-between gap-3 mt-1">
                <span className="text-white/40">Destination</span>
                <span className="font-mono text-white/65 truncate max-w-[240px]">{completeModal.wallet_address || "—"}</span>
              </div>
              <div className="flex justify-between gap-3 mt-1">
                <span className="text-white/40">Asset / network</span>
                <span className="text-white/65">{completeModal.asset || "—"} · {networkForAsset(completeModal.asset)}</span>
              </div>
            </div>

            <label className="block text-[11px] font-semibold text-white/55 mb-1" htmlFor="settlement-amount">
              Exact {completeModal.asset || "asset"} quantity sent
            </label>
            <input
              id="settlement-amount"
              value={settlementAmount}
              onChange={(event) => setSettlementAmount(event.target.value)}
              placeholder={completeModal.asset === "USDT" ? "1000.00" : "0.00000000"}
              inputMode="decimal"
              autoComplete="off"
              className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder:text-white/20 outline-none mb-3"
              style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)" }}
            />

            <label className="block text-[11px] font-semibold text-white/55 mb-1" htmlFor="reference-type">
              Payout proof type
            </label>
            <select
              id="reference-type"
              value={referenceType}
              onChange={(event) => setReferenceType(event.target.value as "provider" | "blockchain")}
              className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none mb-3"
              style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <option value="blockchain">Blockchain transaction</option>
              <option value="provider">Provider payout ID</option>
            </select>

            {referenceType === "provider" && (
              <>
                <label className="block text-[11px] font-semibold text-white/55 mb-1" htmlFor="payout-provider">
                  Payout provider
                </label>
                <input
                  id="payout-provider"
                  value={payoutProvider}
                  onChange={(event) => setPayoutProvider(event.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 40))}
                  placeholder="nowpayments"
                  autoComplete="off"
                  className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder:text-white/20 outline-none mb-3"
                  style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)" }}
                />
              </>
            )}

            <label className="block text-[11px] font-semibold text-white/55 mb-1" htmlFor="payout-reference">
              {referenceType === "blockchain" ? "Blockchain transaction hash" : "Provider payout ID"}
            </label>
            <input
              id="payout-reference"
              value={payoutReference}
              onChange={(event) => setPayoutReference(event.target.value)}
              placeholder="Transaction hash or provider payout ID"
              maxLength={200}
              autoComplete="off"
              className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder:text-white/20 outline-none mb-3"
              style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)" }}
            />

            {referenceType === "blockchain" && (
              <>
                <label className="block text-[11px] font-semibold text-white/55 mb-1" htmlFor="output-index">
                  Transfer, log, or output index
                </label>
                <input
                  id="output-index"
                  value={outputIndex}
                  onChange={(event) => setOutputIndex(event.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="0"
                  inputMode="numeric"
                  autoComplete="off"
                  className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder:text-white/20 outline-none mb-3"
                  style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)" }}
                />
                <p className="text-[10px] text-white/30 -mt-2 mb-3">Use 0 for a single-transfer transaction; use the provider/explorer index for a batch.</p>
              </>
            )}

            <label className="block text-[11px] font-semibold text-white/55 mb-1" htmlFor="payout-fee">
              Agreed payout fee (USD)
            </label>
            <input
              id="payout-fee"
              value={payoutFee}
              readOnly
              placeholder="0.00"
              inputMode="decimal"
              autoComplete="off"
              className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder:text-white/20 outline-none mb-3"
              style={{ background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.08)" }}
            />
            <p className="text-[10px] text-white/30 -mt-2 mb-3">The completion step cannot add or change a fee that the user did not agree to before approval.</p>

            <label className="block text-[11px] font-semibold text-white/55 mb-1" htmlFor="completion-note">
              Internal note (optional)
            </label>
            <input
              id="completion-note"
              value={completionNote}
              onChange={(event) => setCompletionNote(event.target.value)}
              placeholder="Settlement notes"
              maxLength={500}
              autoComplete="off"
              className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder:text-white/20 outline-none mb-5"
              style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)" }}
            />

            <div className="flex gap-2 justify-end">
              <button
                onClick={closeCompleteModal}
                disabled={processing === completeModal.id}
                className="px-4 py-2 rounded-lg text-xs text-white/50 border border-white/10 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleComplete}
                disabled={processing === completeModal.id || payoutReference.trim().length < 4 || settlementAmount.trim().length === 0}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 cursor-pointer disabled:opacity-50"
              >
                {processing === completeModal.id && <Loader2 size={12} className="animate-spin" />}
                Confirm paid
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
