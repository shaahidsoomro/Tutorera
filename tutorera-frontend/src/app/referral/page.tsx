"use client";
import { UI_COLORS } from "@/lib/brand";
// app/referral/page.tsx
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/axios";
import { Check,Coins,Copy,Gift,Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect,useState } from "react";

const C = UI_COLORS;

interface ReferralData {
  referralCode: string;
  referralLink: string;
  referralCredit: number;
  stats: {
    totalReferred: number;
    creditedCount: number;
    pendingCount: number;
    totalEarned: number;
  };
  referrals: {
    _id: string;
    referred: { name: string; createdAt: string };
    status: "pending" | "credited";
    creditAmount: number;
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
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setFetching(false));
  }, [user]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const whatsappShare = data
    ? `https://wa.me/?text=${encodeURIComponent(`Join me on TUTORERA® — the student-led tutoring marketplace. Use my referral code *${data.referralCode}* when signing up to get Rs. 200 off your first booking. Sign up here: ${data.referralLink}`)}`
    : "#";

  if (loading || fetching) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 40, height: 40, border: `3px solid ${C.accent}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!data) return null;

  return (
    <div style={{ backgroundColor: C.gray50, minHeight: '100vh' }}>

      {/* Hero */}
      <div style={{ background: `linear-gradient(135deg, ${C.primary} 0%, #16213e 60%, #0f3460 100%)`, padding: '4rem 1.5rem', textAlign: 'center' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div style={{ width: 72, height: 72, backgroundColor: 'rgba(37,99,235,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <Gift size={36} color="#60a5fa" />
          </div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'white', marginBottom: '1rem', lineHeight: 1.2 }}>
            Refer a Friend,<br />Both Get Rs. 200
          </h1>
          <p style={{ color: '#9ca3af', fontSize: '1rem', lineHeight: 1.7, marginBottom: '2rem' }}>
            Share your unique referral link. Your friend gets Rs. 200 off their first booking, and you earn Rs. 200 credit when they complete it.
          </p>

          {/* Credit balance pill */}
          {data.referralCredit > 0 && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '999px', padding: '0.5rem 1.25rem', marginBottom: '2rem' }}>
              <Coins size={16} color="#34d399" />
              <span style={{ color: '#34d399', fontWeight: 700, fontSize: '0.9rem' }}>
                Your credit balance: Rs. {data.referralCredit.toLocaleString()}
              </span>
            </div>
          )}

          {/* Referral link copy box */}
          <div style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '0.875rem', padding: '1.5rem', maxWidth: '560px', margin: '0 auto' }}>
            <p style={{ color: '#9ca3af', fontSize: '0.8rem', marginBottom: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Referral Code</p>
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '0.5rem', padding: '0.75rem 1rem', color: 'white', fontWeight: 800, fontSize: '1.1rem', letterSpacing: '0.1em', textAlign: 'center' }}>
                {data.referralCode}
              </div>
              <button onClick={() => handleCopy(data.referralCode)}
                style={{ padding: '0.75rem 1.25rem', backgroundColor: copied ? '#16a34a' : C.accent, color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                {copied ? <><Check size={16} /> Copied!</> : <><Copy size={16} /> Copy Code</>}
              </button>
            </div>

            <p style={{ color: '#6b7280', fontSize: '0.75rem', marginBottom: '0.75rem' }}>Or share your full referral link:</p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button onClick={() => handleCopy(data.referralLink)}
                style={{ flex: 1, padding: '0.6rem 1rem', backgroundColor: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '0.5rem', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {data.referralLink}
              </button>
              <a href={whatsappShare} target="_blank" rel="noopener noreferrer"
                style={{ padding: '0.6rem 1.25rem', backgroundColor: '#16a34a', color: 'white', borderRadius: '0.5rem', fontWeight: 700, fontSize: '0.8rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}>
                📱 Share on WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '3rem 1.5rem' }}>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
          {[
            { label: "Friends Referred", value: data.stats.totalReferred, icon: <Users size={20} color={C.accent} />, bg: '#EEF5FF' },
            { label: "Completed", value: data.stats.creditedCount, icon: <Check size={20} color="#16a34a" />, bg: '#f0fdf4' },
            { label: "Pending", value: data.stats.pendingCount, icon: <Gift size={20} color="#d97706" />, bg: '#fffbeb' },
            { label: "Total Earned", value: `Rs. ${data.stats.totalEarned.toLocaleString()}`, icon: <Coins size={20} color="#7c3aed" />, bg: '#f5f3ff' },
          ].map(card => (
            <div key={card.label} style={{ backgroundColor: 'white', borderRadius: '0.875rem', padding: '1.25rem', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
              <div style={{ width: 40, height: 40, backgroundColor: card.bg, borderRadius: '0.625rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {card.icon}
              </div>
              <div>
                <p style={{ fontSize: '1.25rem', fontWeight: 800, color: C.primary, margin: 0 }}>{card.value}</p>
                <p style={{ fontSize: '0.75rem', color: C.gray500, margin: 0 }}>{card.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div style={{ backgroundColor: 'white', borderRadius: '0.875rem', padding: '2rem', border: '1px solid #e5e7eb', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: C.primary, marginBottom: '1.5rem' }}>How it works</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem' }}>
            {[
              { step: "01", emoji: "🔗", title: "Share your link", desc: "Send your unique referral link or code to friends who want to learn." },
              { step: "02", emoji: "🎁", title: "They get Rs. 200 off", desc: "Your friend gets Rs. 200 credit applied to their first booking." },
              { step: "03", emoji: "💰", title: "You earn Rs. 200", desc: "Once they complete their first booking, Rs. 200 is added to your credit balance." },
            ].map(item => (
              <div key={item.step} style={{ textAlign: 'center' }}>
                <div style={{ width: 56, height: 56, backgroundColor: '#EEF5FF', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.875rem', fontSize: '1.5rem' }}>
                  {item.emoji}
                </div>
                <p style={{ fontSize: '0.7rem', fontWeight: 700, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>Step {item.step}</p>
                <p style={{ fontWeight: 700, color: C.primary, marginBottom: '0.4rem', fontSize: '0.95rem' }}>{item.title}</p>
                <p style={{ color: C.gray500, fontSize: '0.8rem', lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Referral history */}
        <div style={{ backgroundColor: 'white', borderRadius: '0.875rem', padding: '2rem', border: '1px solid #e5e7eb' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: C.primary, marginBottom: '1.25rem' }}>Your Referrals</h2>
          {data.referrals.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <p style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>👥</p>
              <p style={{ color: C.gray500, fontSize: '0.875rem' }}>No referrals yet. Share your link to get started!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {data.referrals.map(r => (
                <div key={r._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.875rem 1rem', backgroundColor: C.gray50, borderRadius: '0.5rem', border: '1px solid #e5e7eb', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <p style={{ fontWeight: 600, color: C.primary, fontSize: '0.875rem', margin: '0 0 2px' }}>{r.referred.name}</p>
                    <p style={{ color: '#9ca3af', fontSize: '0.75rem', margin: 0 }}>Joined {new Date(r.referred.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: r.status === "credited" ? '#16a34a' : '#d97706' }}>
                      {r.status === "credited" ? `+Rs. ${r.creditAmount}` : "Pending first booking"}
                    </span>
                    <span style={{ padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700, backgroundColor: r.status === "credited" ? '#f0fdf4' : '#fffbeb', color: r.status === "credited" ? '#16a34a' : '#d97706' }}>
                      {r.status === "credited" ? "Credited" : "Pending"}
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
