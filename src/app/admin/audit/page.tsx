"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { Shield } from "lucide-react";

type AuditEntry = { id: string; admin_id: string; action: string; target_user_id: string | null; details: Record<string, unknown>; created_at: string };

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const supabase = createClient();

  useEffect(() => {
    supabase.from("admin_audit_log").select("*").order("created_at", { ascending: false }).limit(50)
      .then(({ data }) => { if (data) setLogs(data as AuditEntry[]); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Shield size={22} className="text-naxcal-teal" />
        <h1 className="text-xl font-bold text-white">Audit Log</h1>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.06)" }}>
        {logs.length === 0 ? (
          <p className="text-center text-white/30 text-sm py-8">No audit entries yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left text-[10px] text-white/30 uppercase px-4 py-3 font-medium">Date</th>
                  <th className="text-left text-[10px] text-white/30 uppercase px-4 py-3 font-medium">Action</th>
                  <th className="text-left text-[10px] text-white/30 uppercase px-4 py-3 font-medium">Target</th>
                  <th className="text-left text-[10px] text-white/30 uppercase px-4 py-3 font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-white/[0.03]">
                    <td className="px-4 py-3 text-white/50 text-xs">{new Date(log.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3 text-white/80 font-medium">{log.action.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3 text-white/40 text-xs font-mono">{log.target_user_id?.slice(0, 8) || "—"}</td>
                    <td className="px-4 py-3 text-white/30 text-xs">{JSON.stringify(log.details).slice(0, 80)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
