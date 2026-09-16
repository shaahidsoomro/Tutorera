"use client";
import {
  GST_ON_PLATFORM_FEE_PERCENT,
  PLATFORM_FEE_PERCENT,
  TOTAL_FEE_PERCENT
} from "@/lib/site";
import { useCallback,useState } from "react";

const C = {
  primary: "#021550",
  accent: "#0329B2",
  green: "#16a34a",
  amber: "#d97706",
  gray500: "#6b7280",
  gray50: "#f9fafb",
};

interface FeeBreakdown {
  rate: number;
  platformFee: number;
  taxOnFee: number;
  totalDeduction: number;
  netEarnings: number;
  effectiveTakeHomePercent: number;
}

function calculateFees(rate: number): FeeBreakdown {
  const platformFee = Math.round((rate * PLATFORM_FEE_PERCENT) / 100);
  const taxOnFee = Math.round((platformFee * GST_ON_PLATFORM_FEE_PERCENT) / 100);
  const totalDeduction = platformFee + taxOnFee;
  const netEarnings = rate - totalDeduction;
  const effectiveTakeHomePercent = rate > 0 ? (netEarnings / rate) * 100 : 0;
  return { rate, platformFee, taxOnFee, totalDeduction, netEarnings, effectiveTakeHomePercent };
}

interface RateRowProps {
  label: string;
  value: number;
  color?: string;
  bgColor?: string;
  bold?: boolean;
  prefix?: string;
}

function RateRow({ label, value, color = C.primary, bgColor, bold, prefix = "PKR " }: RateRowProps) {
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "0.6rem 1rem",
      background: bgColor || "transparent",
      borderRadius: bgColor ? 8 : 0,
    }}>
      <span style={{ fontSize: "0.875rem", color: C.gray500, fontWeight: bold ? "700" : "400" }}>{label}</span>
      <span style={{ fontSize: "0.9rem", fontWeight: bold ? "800" : "600", color }}>
        {prefix}{value.toLocaleString()}
      </span>
    </div>
  );
}

function BreakdownBar({ netPercent }: { netPercent: number }) {
  const net = Math.round(netPercent);
  const fee = 100 - net;
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "flex", height: 14, borderRadius: 999, overflow: "hidden", background: "#f3f4f6" }}>
        <div style={{ width: `${net}%`, background: "linear-gradient(90deg, #16a34a, #22c55e)", transition: "width 0.3s ease" }} />
        <div style={{ width: `${fee}%`, background: "linear-gradient(90deg, #f87171, #ef4444)", transition: "width 0.3s ease" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
        <span style={{ fontSize: "0.72rem", color: C.green, fontWeight: 600 }}>
          ✓ You keep {net}%
        </span>
        <span style={{ fontSize: "0.72rem", color: "#ef4444", fontWeight: 600 }}>
          TUTORERA {fee}%
        </span>
      </div>
    </div>
  );
}

interface ComparisonRow {
  rate: number;
  net: number;
  label: string;
}

function ComparisonTable({ rows, selected }: { rows: ComparisonRow[]; selected: number }) {
  return (
    <div style={{ overflow: "hidden", borderRadius: 10, border: "1px solid #e5e7eb" }}>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1.2fr", padding: "0.5rem 1rem", background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
        {["Your Rate", "Net Earnings", "Difference"].map(h => (
          <span key={h} style={{ fontSize: "0.7rem", fontWeight: 700, color: C.gray500, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</span>
        ))}
      </div>
      {rows.map((r, i) => {
        const diff = r.net - rows[0].net;
        const isSelected = r.rate === selected;
        return (
          <div key={r.rate} style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1.2fr",
            padding: "0.6rem 1rem",
            background: isSelected ? "#f0fdf4" : i % 2 === 1 ? "#f9fafb" : "white",
            borderBottom: i < rows.length - 1 ? "1px solid #f3f4f6" : "none",
          }}>
            <span style={{ fontSize: "0.85rem", fontWeight: isSelected ? "700" : "500", color: isSelected ? C.green : C.primary }}>
              PKR {r.rate.toLocaleString()}/hr {isSelected && "←"}
            </span>
            <span style={{ fontSize: "0.85rem", fontWeight: "600", color: C.green }}>
              PKR {r.net.toLocaleString()}
            </span>
            <span style={{ fontSize: "0.8rem", color: diff > 0 ? C.green : diff < 0 ? "#ef4444" : C.gray500 }}>
              {i === 0 ? "—" : `${diff >= 0 ? "+" : ""}PKR ${diff.toLocaleString()}`}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function CommissionCalculator() {
  const [rate, setRate] = useState(1000);
  const [inputValue, setInputValue] = useState("1000");

  const fees = calculateFees(rate);

  const presets = [500, 1000, 1500, 2000, 3000, 5000];

  const comparisonRates = [500, 750, 1000, 1500, 2000, 3000];
  const comparisonRows: ComparisonRow[] = comparisonRates.map(r => ({
    rate: r,
    net: calculateFees(r).netEarnings,
    label: `PKR ${r}/hr`,
  }));

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    setInputValue(raw);
    const num = parseInt(raw || "0", 10);
    if (!isNaN(num) && num >= 0) setRate(num);
  }, []);

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const num = parseInt(e.target.value, 10);
    setRate(num);
    setInputValue(String(num));
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* ── How It Works banner ── */}
      <div style={{
        background: "linear-gradient(135deg, #021550 0%, #0329B2 100%)",
        borderRadius: 14,
        padding: "1.25rem 1.5rem",
        color: "white",
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <span style={{ fontSize: "1.5rem", flexShrink: 0 }}>💡</span>
          <div>
            <p style={{ margin: "0 0 0.3rem", fontWeight: 700, fontSize: "0.9rem" }}>Transparent Pricing — Always</p>
            <p style={{ margin: 0, fontSize: "0.8rem", opacity: 0.85, lineHeight: 1.5 }}>
              TUTORERA charges a <strong style={{ color: "#fbbf24" }}>{PLATFORM_FEE_PERCENT}% platform fee</strong> + <strong style={{ color: "#fbbf24" }}>{GST_ON_PLATFORM_FEE_PERCENT}% GST on the fee</strong> = <strong style={{ color: "#fbbf24" }}>{TOTAL_FEE_PERCENT}% total deduction</strong>. Students pay <strong style={{ color: "#86efac" }}>exactly what tutors charge</strong> — no markups, no hidden costs.
            </p>
          </div>
        </div>
      </div>

      {/* ── Main calculator grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }} className="calc-grid">

        {/* Rate input + slider */}
        <div style={{ background: "white", borderRadius: 14, padding: "1.5rem", border: "1px solid #e5e7eb" }}>
          <h3 style={{ margin: "0 0 1rem", fontSize: "0.95rem", fontWeight: 700, color: C.primary }}>
            Set Your Hourly Rate
          </h3>

          <div style={{ marginBottom: "1.25rem" }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              background: "#f0f9ff",
              border: "2px solid #bfdbfe",
              borderRadius: 12,
              padding: "0.75rem 1rem",
              gap: 8,
            }}>
              <span style={{ fontSize: "0.9rem", fontWeight: 600, color: C.accent, flexShrink: 0 }}>PKR</span>
              <input
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: "1.5rem",
                  fontWeight: 800,
                  color: C.primary,
                  width: "100%",
                  outline: "none",
                }}
                aria-label="Hourly rate in PKR"
              />
              <span style={{ fontSize: "0.8rem", fontWeight: 600, color: C.gray500, flexShrink: 0 }}>/ hour</span>
            </div>
          </div>

          {/* Slider */}
          <div style={{ padding: "0 0.25rem", marginBottom: "1rem" }}>
            <input
              type="range"
              min={100}
              max={10000}
              step={50}
              value={rate}
              onChange={handleSliderChange}
              style={{ width: "100%", accentColor: C.accent, cursor: "pointer" }}
              aria-label="Rate slider"
            />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
              <span style={{ fontSize: "0.7rem", color: C.gray500 }}>PKR 100</span>
              <span style={{ fontSize: "0.7rem", color: C.gray500 }}>PKR 10,000/hr</span>
            </div>
          </div>

          {/* Preset quick buttons */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {presets.map(p => (
              <button
                key={p}
                onClick={() => { setRate(p); setInputValue(String(p)); }}
                style={{
                  padding: "0.35rem 0.75rem",
                  borderRadius: 999,
                  border: `1.5px solid ${rate === p ? C.accent : "#e5e7eb"}`,
                  background: rate === p ? "#EEF5FF" : "white",
                  color: rate === p ? C.accent : C.gray500,
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                PKR {p.toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        {/* Live breakdown */}
        <div style={{ background: "white", borderRadius: 14, padding: "1.5rem", border: "1px solid #e5e7eb" }}>
          <h3 style={{ margin: "0 0 0.75rem", fontSize: "0.95rem", fontWeight: 700, color: C.primary }}>
            Earnings Breakdown
          </h3>
          <p style={{ margin: "0 0 1rem", fontSize: "0.78rem", color: C.gray500 }}>
            This is exactly what you keep after TUTORERA fees.
          </p>

          <RateRow label="Your hourly rate" value={fees.rate} color={C.primary} />
          <div style={{ height: 1, background: "#f3f4f6", margin: "0.25rem 0" }} />
          <RateRow
            label={`Platform fee (${PLATFORM_FEE_PERCENT}%)`}
            value={fees.platformFee}
            color="#ef4444"
            bgColor="#fef2f2"
          />
          <RateRow
            label={`GST on fee (${GST_ON_PLATFORM_FEE_PERCENT}% of ${PLATFORM_FEE_PERCENT}%)`}
            value={fees.taxOnFee}
            color="#ef4444"
            bgColor="#fef2f2"
          />
          <div style={{ height: 2, background: "#e5e7eb", margin: "0.25rem 0" }} />
          <RateRow
            label="Total TUTORERA deduction"
            value={fees.totalDeduction}
            color="#ef4444"
            bold
            bgColor="#fff5f5"
          />
          <RateRow
            label="You take home"
            value={fees.netEarnings}
            color={C.green}
            bold
            bgColor="#f0fdf4"
          />

          <BreakdownBar netPercent={fees.effectiveTakeHomePercent} />

          {/* Quick projections */}
          <div style={{ marginTop: "1.25rem", display: "flex", flexDirection: "column", gap: 8 }}>
            <p style={{ margin: 0, fontSize: "0.72rem", fontWeight: 700, color: C.gray500, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Weekly Projections (4 sessions)
            </p>
            {[
              { label: "Gross", value: fees.rate * 4, color: C.primary },
              { label: "Your net", value: fees.netEarnings * 4, color: C.green },
            ].map(item => (
              <div key={item.label} style={{ display: "flex", justifyContent: "space-between", padding: "0.4rem 0.75rem", background: "#f9fafb", borderRadius: 7 }}>
                <span style={{ fontSize: "0.8rem", color: C.gray500 }}>{item.label}</span>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: item.color }}>PKR {item.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Rate comparison table ── */}
      <div style={{ background: "white", borderRadius: 14, padding: "1.5rem", border: "1px solid #e5e7eb" }}>
        <h3 style={{ margin: "0 0 0.4rem", fontSize: "0.95rem", fontWeight: 700, color: C.primary }}>
          Rate Comparison
        </h3>
        <p style={{ margin: "0 0 1rem", fontSize: "0.8rem", color: C.gray500 }}>
          See how your net earnings scale with different hourly rates.
        </p>
        <ComparisonTable rows={comparisonRows} selected={rate} />
      </div>

      {/* ── Fee structure facts ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }} className="fee-facts-grid">
        {[
          { icon: "🚫", title: "No Lead Fees", desc: "Unlike Mera Ustad, TeacherOn, and UrbanPro — you never pay per lead or per contact viewed." },
          { icon: "💸", title: "Student Pays Same", desc: "Students pay exactly what you charge. TUTORERA adds no markup to the student rate." },
          { icon: "📋", title: "Fee Snapshot", desc: `Booking fees are locked at booking time. Retroactive fee changes never apply to past bookings.` },
        ].map(fact => (
          <div key={fact.title} style={{ background: "#f9fafb", borderRadius: 12, padding: "1rem 1.25rem", border: "1px solid #e5e7eb" }}>
            <span style={{ fontSize: "1.3rem", display: "block", marginBottom: "0.5rem" }}>{fact.icon}</span>
            <p style={{ margin: "0 0 0.3rem", fontWeight: 700, fontSize: "0.85rem", color: C.primary }}>{fact.title}</p>
            <p style={{ margin: 0, fontSize: "0.78rem", color: C.gray500, lineHeight: 1.5 }}>{fact.desc}</p>
          </div>
        ))}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .calc-grid { grid-template-columns: 1fr !important; }
          .fee-facts-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
