"use client";
import api from "@/lib/axios";
import { UI_COLORS } from "@/lib/brand";
import { Gift } from "lucide-react";
import { useEffect,useState } from "react";

const C = UI_COLORS;

interface Referral {
  _id: string;
  referrer: { name: string; email: string };
  referred: { name: string; email: string; createdAt: string };
  status: "pending" | "credited";
  creditAmount: number;
  createdAt: string;
}

export default function AdminReferralsPage() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCredit, setTotalCredit] = useState(0);
  const [filter, setFilter] = useState<"all" | "pending" | "credited">("all");

  useEffect(() => {
    api.get("/admin/referrals")
      .then(res => {
        setReferrals(res.data.referrals);
        setTotalCredit(res.data.totalCreditIssued);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = referrals.filter(r => filter === "all" || r.status === filter);

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: C.primary }}>Referral Program</h1>
        <p style={{ color: C.gray500, fontSize: '0.875rem' }}>
          Total credit issued: <strong style={{ color: C.primary }}>Rs. {totalCredit.toLocaleString()}</strong>
        </p>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[
          { key: "all", label: "All", count: referrals.length },
          { key: "pending", label: "⏳ Pending", count: referrals.filter(r => r.status === "pending").length },
          { key: "credited", label: "✅ Credited", count: referrals.filter(r => r.status === "credited").length },
        ].map(tab => (
          <button key={tab.key} onClick={() => setFilter(tab.key as typeof filter)}
            style={{ padding: '0.5rem 1.25rem', borderRadius: '999px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600', border: filter === tab.key ? 'none' : '1px solid #e5e7eb', backgroundColor: filter === tab.key ? C.primary : 'white', color: filter === tab.key ? 'white' : C.gray500 }}>
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <div style={{ width: '36px', height: '36px', border: `3px solid ${C.accent}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ backgroundColor: 'white', borderRadius: '0.875rem', padding: '4rem', textAlign: 'center', border: '1px solid #e5e7eb' }}>
          <Gift size={40} color="#d1d5db" style={{ margin: '0 auto 1rem' }} />
          <p style={{ color: C.gray500 }}>No referrals in this category.</p>
        </div>
      ) : (
        <div style={{ backgroundColor: 'white', borderRadius: '0.875rem', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: C.gray50, borderBottom: '1px solid #e5e7eb' }}>
                {["Referrer", "Referred User", "Joined", "Credit", "Status"].map(h => (
                  <th key={h} style={{ padding: '0.875rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={r._id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                  <td style={{ padding: '1rem 1.25rem' }}>
                    <p style={{ fontWeight: 600, color: C.primary, fontSize: '0.875rem', margin: '0 0 2px' }}>{r.referrer.name}</p>
                    <p style={{ color: C.gray500, fontSize: '0.75rem', margin: 0 }}>{r.referrer.email}</p>
                  </td>
                  <td style={{ padding: '1rem 1.25rem' }}>
                    <p style={{ fontWeight: 600, color: C.primary, fontSize: '0.875rem', margin: '0 0 2px' }}>{r.referred.name}</p>
                    <p style={{ color: C.gray500, fontSize: '0.75rem', margin: 0 }}>{r.referred.email}</p>
                  </td>
                  <td style={{ padding: '1rem 1.25rem', color: C.gray500, fontSize: '0.875rem' }}>
                    {new Date(r.referred.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '1rem 1.25rem', fontWeight: 700, color: C.primary, fontSize: '0.875rem' }}>
                    Rs. {r.creditAmount}
                  </td>
                  <td style={{ padding: '1rem 1.25rem' }}>
                    <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: r.status === "credited" ? '#f0fdf4' : '#fffbeb', color: r.status === "credited" ? '#16a34a' : '#d97706' }}>
                      {r.status === "credited" ? "Credited" : "Pending"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}