"use client";
import { UI_COLORS } from "@/lib/brand";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/axios";
import { trackMarketplaceEvent } from "@/lib/analytics";
import { showError } from "@/lib/toast";
import { Check, Coins, Copy, Gift, Users, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const C = UI_COLORS;

interface ReferralMilestone {
  fromReferral: number;
  toReferral: number | null;
  referrerRewardAmount: number;
}

interface MilestoneProgress {
  creditedCount: number;
  currentMilestone: ReferralMilestone | null;
  nextMilestone: ReferralMilestone | null;
  progressInTier: number;
  tierSize: number | null;
}

interface ReferralData {
  referralCode: string;
  referralLink: string;
  referralCredit: number;
  referralCreditCurrency: string;
  program: {
    referrerRewardAmount: number;
    referredDiscountAmount: number;
    currency: string;
    isActive: boolean;
    milestonesEnabled: boolean;
    milestones: ReferralMilestone[];
  };
  milestoneProgress: MilestoneProgress | null;
  stats: {
    totalReferred: number;
    creditedCount: number;
    pendingCount: number;
    totalEarned: number;
  };
  referrals: {
    _id: string;
    referred: { name: string; createdAt: string };
    status: "pending" | "credited" | "reversed" | "fraud_hold";
    creditAmount: number;
    creditCurrency: string;
    milestoneIndex?: number;
    createdAt: string;
  }[];
}

export default function ReferralPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<ReferralData | null>(null);
  const [fetching, setFetching] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    api.get("/referral/my")
      .then(res => {
        if (res.data?.referralCode) {
          setData(res.data);
          trackMarketplaceEvent("referral_dashboard_viewed", {
            creditedCount: res.data.stats?.creditedCount,
            pendingCount: res.data.stats?.pendingCount,
          });
        }
      })
      .catch(err => { console.error(err); showError(err, "Failed to load referral data."); })
      .finally(() => setFetching(false));
  }, [user]);

  const handleCopy = (text: string, source: "code" | "link") => {
    navigator.clipboard.writeText(text);
    trackMarketplaceEvent("referral_link_copied", { source });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const whatsappShare = data
    ? `https://wa.me/?text=${encodeURIComponent(`Join me on TUTORERA® — the student-led tutoring marketplace. Use my referral code *${data.referralCode}* when signing up to get ${data.program.currency} ${data.program.referredDiscountAmount} off your first booking. Sign up here: ${data.referralLink}`)}`
    : "#";

  if (loading || fetching) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 40, height: 40, border: `3px solid ${C.accent}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!data) return (
    <div style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem", padding: "3rem 1.5rem", textAlign: "center" }}>
      <Gift size={40} color="#94a3b8" />
      <p style={{ color: "#64748b", fontSize: "1rem" }}>Your referral dashboard is not available yet.<br />Make sure you&apos;re logged in, then try again.</p>
      <Link href="/login" style={{ padding: "0.65rem 1.5rem", background: "#0329b2", color: "white", borderRadius: "0.5rem", fontWeight: 700, textDecoration: "none", fontSize: "0.9rem" }}>Log in</Link>
    </div>
  );

  const { program, milestoneProgress: mp } = data;
  const nextReward = mp?.nextMilestone?.referrerRewardAmount ?? mp?.currentMilestone?.referrerRewardAmount ?? program.referrerRewardAmount;

  return (
    <div style={{ backgroundColor: C.gray50, minHeight: "100vh" }}>

      {/* Hero */}
      <div style={{ background: `linear-gradient(135deg, ${C.primary} 0%, #16213e 60%, #0f3460 100%)`, padding: "4rem 1.5rem", textAlign: "center" }}>
        <div style={{ maxWidth: "700px", margin: "0 auto" }}>
          <div style={{ width: 72, height: 72, backgroundColor: "rgba(37,99,235,0.2)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem" }}>
            <Gift size={36} color="#60a5fa" />
          </div>
          <h1 style={{ fontSize: "2.25rem", fontWeight: 800, color: "white", marginBottom: "1rem", lineHeight: 1.2 }}>
            Refer a Friend,<br />Both Get Rewarded
          </h1>
          <p style={{ color: "#9ca3af", fontSize: "1rem", lineHeight: 1.7, marginBottom: "2rem" }}>
            Share your unique referral link. Your friend gets <strong style={{ color: "#e5e7eb" }}>{program.currency} {program.referredDiscountAmount}</strong> off their first booking, and you earn credit when they complete it.
          </p>

          {/* Credit balance pill */}
          {data.referralCredit > 0 && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", backgroundColor: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "999px", padding: "0.5rem 1.25rem", marginBottom: "2rem" }}>
              <Coins size={16} color="#34d399" />
              <span style={{ color: "#34d399", fontWeight: 700, fontSize: "0.9rem" }}>
                Your credit balance: {data.referralCreditCurrency} {data.referralCredit.toLocaleString()}
              </span>
            </div>
          )}

          {/* Referral link copy box */}
          <div style={{ backgroundColor: "rgba(255,255,255,0.08)", borderRadius: "0.875rem", padding: "1.5rem", maxWidth: "560px", margin: "0 auto" }}>
            <p style={{ color: "#9ca3af", fontSize: "0.8rem", marginBottom: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Your Referral Code</p>
            <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap" }}>
              <div style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: "0.5rem", padding: "0.75rem 1rem", color: "white", fontWeight: 800, fontSize: "1.1rem", letterSpacing: "0.1em", textAlign: "center" }}>
                {data.referralCode}
              </div>
              <button onClick={() => handleCopy(data.referralCode, "code")}
                style={{ padding: "0.75rem 1.25rem", backgroundColor: copied ? "#16a34a" : C.accent, color: "white", border: "none", borderRadius: "0.5rem", fontWeight: 700, fontSize: "0.875rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem", flexShrink: 0 }}>
                {copied ? <><Check size={16} /> Copied!</> : <><Copy size={16} /> Copy Code</>}
              </button>
            </div>

            <p style={{ color: "#6b7280", fontSize: "0.75rem", marginBottom: "0.75rem" }}>Or share your full referral link:</p>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <button onClick={() => handleCopy(data.referralLink, "link")}
                style={{ flex: 1, padding: "0.6rem 1rem", backgroundColor: "rgba(255,255,255,0.1)", color: "white", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "0.5rem", fontWeight: 600, fontSize: "0.8rem", cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {data.referralLink}
              </button>
              <a href={whatsappShare} target="_blank" rel="noopener noreferrer"
                onClick={() => trackMarketplaceEvent("referral_shared", { channel: "whatsapp" })}
                style={{ padding: "0.6rem 1.25rem", backgroundColor: "#16a34a", color: "white", borderRadius: "0.5rem", fontWeight: 700, fontSize: "0.8rem", textDecoration: "none", display: "flex", alignItems: "center", gap: "0.4rem", whiteSpace: "nowrap" }}>
                📱 Share on WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "3rem 1.5rem" }}>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem", marginBottom: "2.5rem" }}>
          {[
            { label: "Friends Referred", value: data.stats.totalReferred, icon: <Users size={20} color={C.accent} />, bg: "#EEF5FF" },
            { label: "Completed", value: data.stats.creditedCount, icon: <Check size={20} color="#16a34a" />, bg: "#f0fdf4" },
            { label: "Pending", value: data.stats.pendingCount, icon: <Gift size={20} color="#d97706" />, bg: "#fffbeb" },
            { label: "Total Earned", value: `${data.program.currency} ${data.stats.totalEarned.toLocaleString()}`, icon: <Coins size={20} color="#7c3aed" />, bg: "#f5f3ff" },
          ].map(card => (
            <div key={card.label} style={{ backgroundColor: "white", borderRadius: "0.875rem", padding: "1.25rem", border: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: "0.875rem" }}>
              <div style={{ width: 40, height: 40, backgroundColor: card.bg, borderRadius: "0.625rem", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {card.icon}
              </div>
              <div>
                <p style={{ fontSize: "1.25rem", fontWeight: 800, color: C.primary, margin: 0 }}>{card.value}</p>
                <p style={{ fontSize: "0.75rem", color: C.gray500, margin: 0 }}>{card.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Milestone Progress */}
        {program.milestonesEnabled && mp && (
          <div style={{ backgroundColor: "white", borderRadius: "0.875rem", padding: "1.75rem 2rem", border: "1px solid #e5e7eb", marginBottom: "2rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
              <TrendingUp size={20} color={C.accent} />
              <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: C.primary, margin: 0 }}>Milestone Rewards</h2>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
              {program.milestones.map((m, i) => {
                const isActive = mp.currentMilestone?.fromReferral === m.fromReferral;
                const isPast = data.stats.creditedCount >= (m.toReferral ?? Infinity);
                return (
                  <div key={i} style={{ padding: "0.875rem", borderRadius: "0.625rem", border: `2px solid ${isActive ? C.accent : isPast ? "#16a34a" : "#e5e7eb"}`, backgroundColor: isActive ? "#EEF5FF" : isPast ? "#f0fdf4" : "white", textAlign: "center", position: "relative" }}>
                    {isActive && <div style={{ position: "absolute", top: -8, left: "50%", transform: "translateX(-50%)", backgroundColor: C.accent, color: "white", fontSize: "0.6rem", fontWeight: 800, padding: "0.15rem 0.5rem", borderRadius: "999px", whiteSpace: "nowrap" }}>CURRENT</div>}
                    {isPast && !isActive && <div style={{ position: "absolute", top: -8, left: "50%", transform: "translateX(-50%)", backgroundColor: "#16a34a", color: "white", fontSize: "0.6rem", fontWeight: 800, padding: "0.15rem 0.5rem", borderRadius: "999px" }}>✓</div>}
                    <p style={{ fontSize: "1.1rem", fontWeight: 800, color: isActive ? C.accent : isPast ? "#16a34a" : C.primary, margin: "0.5rem 0 0.25rem" }}>
                      {program.currency} {m.referrerRewardAmount}
                    </p>
                    <p style={{ fontSize: "0.7rem", color: C.gray500, margin: 0 }}>
                      {m.toReferral ? `${m.fromReferral}–${m.toReferral}` : `${m.fromReferral}+`} referrals
                    </p>
                  </div>
                );
              })}
            </div>

            {mp.nextMilestone && mp.currentMilestone?.toReferral && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: C.gray500, marginBottom: "0.4rem" }}>
                  <span>Progress to next tier ({program.currency} {mp.nextMilestone.referrerRewardAmount})</span>
                  <span>{mp.progressInTier}/{mp.tierSize} referrals</span>
                </div>
                <div style={{ height: 8, backgroundColor: "#e5e7eb", borderRadius: "999px", overflow: "hidden" }}>
                  <div style={{ height: "100%", backgroundColor: C.accent, borderRadius: "999px", width: `${Math.min(100, (mp.progressInTier / (mp.tierSize ?? 1)) * 100)}%`, transition: "width 0.3s ease" }} />
                </div>
                <p style={{ fontSize: "0.75rem", color: C.gray500, marginTop: "0.5rem" }}>
                  {(mp.tierSize ?? 0) - mp.progressInTier} more to earn {program.currency} {nextReward} per referral
                </p>
              </div>
            )}

            {!mp.nextMilestone && (
              <p style={{ fontSize: "0.85rem", color: "#16a34a", fontWeight: 700, textAlign: "center" }}>
                🏆 Maximum tier reached! Every referral earns you {program.currency} {mp.currentMilestone?.referrerRewardAmount ?? program.referrerRewardAmount}.
              </p>
            )}
          </div>
        )}

        {/* How it works */}
        <div style={{ backgroundColor: "white", borderRadius: "0.875rem", padding: "2rem", border: "1px solid #e5e7eb", marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: C.primary, marginBottom: "1.5rem" }}>How it works</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1.5rem" }}>
            {[
              { step: "01", emoji: "🔗", title: "Share your link", desc: "Send your unique referral link or code to friends who want to learn." },
              { step: "02", emoji: "🎁", title: `They get ${program.currency} ${program.referredDiscountAmount} off`, desc: `Your friend gets ${program.currency} ${program.referredDiscountAmount} credit applied to their first booking.` },
              { step: "03", emoji: "💰", title: `You earn ${program.currency} ${program.referrerRewardAmount}+`, desc: `Once they complete their first booking, credit is added to your balance. Earn more per referral as you level up!` },
            ].map(item => (
              <div key={item.step} style={{ textAlign: "center" }}>
                <div style={{ width: 56, height: 56, backgroundColor: "#EEF5FF", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 0.875rem", fontSize: "1.5rem" }}>
                  {item.emoji}
                </div>
                <p style={{ fontSize: "0.7rem", fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.4rem" }}>Step {item.step}</p>
                <p style={{ fontWeight: 700, color: C.primary, marginBottom: "0.4rem", fontSize: "0.95rem" }}>{item.title}</p>
                <p style={{ color: C.gray500, fontSize: "0.8rem", lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Referral history */}
        <div style={{ backgroundColor: "white", borderRadius: "0.875rem", padding: "2rem", border: "1px solid #e5e7eb" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: C.primary, marginBottom: "1.25rem" }}>Your Referrals</h2>
          {data.referrals.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem 0" }}>
              <p style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>👥</p>
              <p style={{ color: C.gray500, fontSize: "0.875rem" }}>No referrals yet. Share your link to get started!</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {data.referrals.map(r => (
                <div key={r._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.875rem 1rem", backgroundColor: C.gray50, borderRadius: "0.5rem", border: "1px solid #e5e7eb", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div>
                    <p style={{ fontWeight: 600, color: C.primary, fontSize: "0.875rem", margin: "0 0 2px" }}>{r.referred?.name ?? "User"}</p>
                    <p style={{ color: "#9ca3af", fontSize: "0.75rem", margin: 0 }}>Joined {r.referred?.createdAt ? new Date(r.referred.createdAt).toLocaleDateString() : "—"}</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <span style={{ fontSize: "0.8rem", fontWeight: 700, color: r.status === "credited" ? "#16a34a" : r.status === "reversed" ? "#dc2626" : "#d97706" }}>
                      {r.status === "credited" ? `+${r.creditCurrency} ${r.creditAmount}` : r.status === "reversed" ? "Reversed" : "Pending first booking"}
                    </span>
                    <span style={{ padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.7rem", fontWeight: 700, backgroundColor: r.status === "credited" ? "#f0fdf4" : r.status === "reversed" ? "#fef2f2" : "#fffbeb", color: r.status === "credited" ? "#16a34a" : r.status === "reversed" ? "#dc2626" : "#d97706" }}>
                      {r.status === "credited" ? "Credited" : r.status === "reversed" ? "Reversed" : "Pending"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
