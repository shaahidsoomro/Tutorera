"use client";
import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import { useAppGuard } from "@/hooks/useAppGuard";
import api from "@/lib/axios";
import { UI_COLORS } from "@/lib/brand";
import { showError, showSuccess } from "@/lib/toast";
import { Check, Copy, Gift, TrendingUp, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const C = UI_COLORS;
const NAVY = C.primary;

type ReferralEntry = {
  _id: string;
  status: "pending" | "credited" | "expired";
  creditAmount: number;
  currency: string;
  createdAt: string;
  referred: { name: string };
};

type ReferralData = {
  referralCode: string;
  referralLink: string;
  referralCredit: number;
  referralCreditCurrency: string;
  stats: {
    totalReferred: number;
    creditedCount: number;
    pendingCount: number;
    totalEarned: number;
  };
  program: {
    referrerRewardAmount: number;
    referredDiscountAmount: number;
    currency: string;
    isActive: boolean;
  };
  referrals: ReferralEntry[];
};

const card = {
  background: "white",
  border: "1px solid #dce5f4",
  borderRadius: 16,
  padding: "1.5rem",
};

const statusStyle: Record<string, { bg: string; color: string }> = {
  credited: { bg: "#f0fdf4", color: "#16a34a" },
  pending:  { bg: "#eff6ff", color: "#1d4ed8" },
  expired:  { bg: "#f4f4f5", color: "#71717a" },
};

export default function ReferralDashboardPage() {
  const guardStatus = useAppGuard();
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [applyCode, setApplyCode] = useState("");
  const [applying, setApplying] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    api.get("/referral/my")
      .then(res => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (guardStatus !== "ok") return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleApply = async () => {
    if (!applyCode.trim()) return;
    setApplying(true);
    try {
      await api.post("/referral/apply", { code: applyCode.trim().toUpperCase() });
      showSuccess("Referral code applied successfully!");
      setApplyCode("");
    } catch (err) {
      showError(err, "Could not apply referral code.");
    } finally {
      setApplying(false);
    }
  };

  const fmt = (n: number, currency = "PKR") =>
    new Intl.NumberFormat("en-PK", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <DashboardLayout>
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "1.5rem 1rem" }}>
        <div style={{ marginBottom: "1.75rem" }}>
          <h1 style={{ fontSize: "1.4rem", fontWeight: 800, color: NAVY, margin: 0 }}>Refer &amp; Earn</h1>
          <p style={{ color: "#64748b", margin: "0.35rem 0 0", fontSize: "0.9rem" }}>
            Share your referral link. Earn credit when friends complete their first booking.
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "4rem 0", color: "#94a3b8" }}>Loading…</div>
        ) : !data ? (
          <div style={{ textAlign: "center", padding: "4rem 0", color: "#94a3b8" }}>Could not load referral data.</div>
        ) : (
          <>
            {/* Credit balance banner */}
            {data.referralCredit > 0 && (
              <div style={{ background: "linear-gradient(135deg, #021550 0%, #0329b2 60%, #016ef8 100%)", borderRadius: 16, padding: "1.25rem 1.5rem", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
                <Gift size={28} color="#08bffc" />
                <div>
                  <div style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.78rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>Available Credit</div>
                  <div style={{ color: "white", fontSize: "1.75rem", fontWeight: 900, lineHeight: 1.1 }}>
                    {fmt(data.referralCredit, data.referralCreditCurrency)}
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.8rem", marginTop: 2 }}>Applied automatically at checkout</div>
                </div>
              </div>
            )}

            {/* Stats row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.85rem", marginBottom: "1.25rem" }}>
              {[
                { label: "Total Referred", value: data.stats.totalReferred, icon: <Users size={18} color={C.accentBright} /> },
                { label: "Successful", value: data.stats.creditedCount, icon: <TrendingUp size={18} color="#16a34a" /> },
                { label: "Pending", value: data.stats.pendingCount, icon: <Gift size={18} color="#1d4ed8" /> },
                { label: "Total Earned", value: fmt(data.stats.totalEarned, data.program.currency), icon: <TrendingUp size={18} color="#7c3aed" /> },
              ].map(s => (
                <div key={s.label} style={{ ...card, padding: "1rem 1.25rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                    {s.icon}
                    <span style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>{s.label}</span>
                  </div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 800, color: NAVY }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Referral link card */}
            <div style={{ ...card, marginBottom: "1.25rem" }}>
              <div style={{ fontWeight: 700, color: NAVY, marginBottom: "1rem" }}>Your Referral Link</div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <input
                  readOnly
                  value={data.referralLink}
                  style={{ flex: 1, minWidth: 220, border: "1.5px solid #dce5f4", borderRadius: 8, padding: "0.6rem 0.9rem", fontSize: "0.85rem", color: "#334155", background: "#f8fafc", outline: "none" }}
                />
                <button
                  onClick={() => handleCopy(data.referralLink)}
                  style={{ display: "flex", alignItems: "center", gap: "0.4rem", border: 0, background: C.accent, color: "white", borderRadius: 8, padding: "0.6rem 1.1rem", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? "Copied!" : "Copy Link"}
                </button>
              </div>
              <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <span style={{ fontSize: "0.82rem", color: "#64748b" }}>Or share your code:</span>
                <code
                  onClick={() => handleCopy(data.referralCode)}
                  style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 6, padding: "0.2rem 0.6rem", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer", letterSpacing: "0.08em" }}
                  title="Click to copy code"
                >
                  {data.referralCode}
                </code>
              </div>
              {data.program.isActive && (
                <div style={{ marginTop: "0.9rem", padding: "0.7rem 0.9rem", background: "#f8fafc", borderRadius: 10, fontSize: "0.83rem", color: "#475569" }}>
                  You earn <strong>{fmt(data.program.referrerRewardAmount, data.program.currency)}</strong> per successful referral.
                  Your friend gets <strong>{fmt(data.program.referredDiscountAmount, data.program.currency)}</strong> off their first booking.
                </div>
              )}
            </div>

            {/* Apply a code */}
            <div style={{ ...card, marginBottom: "1.25rem" }}>
              <div style={{ fontWeight: 700, color: NAVY, marginBottom: "0.5rem" }}>Have a referral code?</div>
              <p style={{ color: "#64748b", fontSize: "0.85rem", margin: "0 0 0.9rem" }}>
                Enter a code you received to apply a friend&apos;s referral discount.
              </p>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <input
                  value={applyCode}
                  onChange={e => setApplyCode(e.target.value.toUpperCase())}
                  placeholder="e.g. AHMED2F3A"
                  maxLength={12}
                  style={{ flex: 1, minWidth: 180, border: "1.5px solid #dce5f4", borderRadius: 8, padding: "0.6rem 0.9rem", fontSize: "0.85rem", outline: "none" }}
                />
                <button
                  onClick={handleApply}
                  disabled={applying || !applyCode.trim()}
                  style={{ border: 0, background: applying ? "#94a3b8" : NAVY, color: "white", borderRadius: 8, padding: "0.6rem 1.2rem", fontWeight: 700, cursor: applying ? "not-allowed" : "pointer" }}
                >
                  {applying ? "Applying…" : "Apply Code"}
                </button>
              </div>
            </div>

            {/* Referral history */}
            {data.referrals.length > 0 && (
              <div style={card}>
                <div style={{ fontWeight: 700, color: NAVY, marginBottom: "1rem" }}>Referral History</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                  {data.referrals.map(r => (
                    <div key={r._id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.65rem 0.9rem", background: "#f8fafc", borderRadius: 10, flexWrap: "wrap", gap: "0.5rem" }}>
                      <div>
                        <div style={{ fontWeight: 600, color: NAVY, fontSize: "0.9rem" }}>{r.referred?.name ?? "User"}</div>
                        <div style={{ color: "#94a3b8", fontSize: "0.78rem" }}>{fmtDate(r.createdAt)}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        {r.status === "credited" && (
                          <span style={{ fontWeight: 700, color: "#16a34a", fontSize: "0.9rem" }}>+{fmt(r.creditAmount, r.currency)}</span>
                        )}
                        <span style={{ padding: "0.2rem 0.65rem", borderRadius: 20, fontSize: "0.75rem", fontWeight: 700, background: statusStyle[r.status]?.bg, color: statusStyle[r.status]?.color }}>
                          {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
