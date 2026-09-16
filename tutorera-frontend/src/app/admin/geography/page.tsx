"use client";

import api from "@/lib/axios";
import { Globe2,Map,MapPin,RefreshCw } from "lucide-react";
import { useCallback,useEffect,useState } from "react";

type Country = { _id: string; iso2: string; iso3?: string; name: string; enabled: boolean; currencyCode?: string; timezones?: string[]; supportedLanguages?: string[]; market?: { launchStatus: string; paymentsEnabled: boolean; homeTuitionEnabled: boolean } | null };
type ResponseData = { summary: { countries: number; regions: number; cities: number; localities: number }; countries: Country[] };

export default function GeographyAdminPage() {
  const [data, setData] = useState<ResponseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setData((await api.get("/admin/geography")).data); }
    catch (reason: unknown) { setError((reason as { response?: { data?: { message?: string } } }).response?.data?.message || "Unable to load geography data."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const toggle = async (country: Country) => {
    try {
      const response = await api.patch(`/admin/geography/countries/${country._id}`, { enabled: !country.enabled });
      setData((current) => current ? { ...current, countries: current.countries.map((item) => item._id === country._id ? { ...item, ...response.data.country } : item) } : current);
    } catch (reason: unknown) { setError((reason as { response?: { data?: { message?: string } } }).response?.data?.message || "Unable to update country."); }
  };

  return <div style={{ padding: "clamp(1rem,3vw,2rem)", color: "#0f172a" }}>
    <header style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "flex-start", flexWrap: "wrap", marginBottom: "1.5rem" }}>
      <div><p style={{ color: "#016ef8", fontWeight: 800, letterSpacing: ".08em", margin: 0, fontSize: ".78rem" }}>GLOBAL OPERATIONS</p><h1 style={{ margin: ".35rem 0", fontSize: "clamp(1.5rem,3vw,2rem)" }}>Geography registry</h1><p style={{ color: "#526176", margin: 0 }}>GeoNames-backed countries and hierarchy inventory. Market/payment controls remain separate.</p></div>
      <button type="button" onClick={() => void load()} disabled={loading} style={{ display: "inline-flex", alignItems: "center", gap: ".45rem", minHeight: 44, padding: ".65rem .9rem", border: "1px solid #cbd5e1", borderRadius: 10, background: "white", color: "#0329b2", fontWeight: 750 }}><RefreshCw size={17} aria-hidden="true" /> Refresh</button>
    </header>
    {error && <div role="alert" style={{ border: "1px solid #fecaca", background: "#fff1f2", color: "#9f1239", borderRadius: 10, padding: "1rem", marginBottom: "1rem" }}>{error}</div>}
    {loading && !data ? <p role="status">Loading geography registry…</p> : data && <>
      <section aria-label="Geography totals" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: ".75rem", marginBottom: "1rem" }}>{[[Globe2,"Countries",data.summary.countries],[Map,"Regions",data.summary.regions],[MapPin,"Cities",data.summary.cities],[MapPin,"Localities",data.summary.localities]].map(([Icon,label,value]) => { const Glyph = Icon as typeof Globe2; return <article key={String(label)} style={{ background: "white", border: "1px solid #dbe5f3", borderRadius: 12, padding: "1rem" }}><Glyph size={18} color="#016ef8" aria-hidden="true" /><strong style={{ display: "block", fontSize: "1.5rem", marginTop: ".45rem" }}>{String(value)}</strong><span style={{ color: "#64748b" }}>{String(label)}</span></article>; })}</section>
      <section style={{ background: "white", border: "1px solid #dbe5f3", borderRadius: 12, overflow: "hidden" }}><div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}><thead><tr>{["Country","Currency","Languages","Launch","Payments","Imported"].map((label) => <th key={label} scope="col" style={{ textAlign: "start", padding: ".8rem", background: "#f4f7ff", color: "#475569", fontSize: ".78rem" }}>{label}</th>)}</tr></thead><tbody>{data.countries.map((country) => <tr key={country._id}><th scope="row" style={cell}>{country.name} <small>({country.iso2})</small></th><td style={cell}>{country.currencyCode || "—"}</td><td style={cell}>{country.supportedLanguages?.join(", ") || "en"}</td><td style={cell}>{country.market?.launchStatus || "disabled"}</td><td style={cell}>{country.market?.paymentsEnabled ? "Enabled" : "Unavailable"}</td><td style={cell}><button type="button" aria-pressed={country.enabled} onClick={() => void toggle(country)} style={{ minHeight: 36, borderRadius: 999, border: "1px solid #cbd5e1", padding: ".35rem .7rem", background: country.enabled ? "#e8fff5" : "#f8fafc", color: country.enabled ? "#047857" : "#64748b", fontWeight: 750 }}>{country.enabled ? "Enabled" : "Disabled"}</button></td></tr>)}</tbody></table></div></section>
    </>}
  </div>;
}

const cell: React.CSSProperties = { textAlign: "start", padding: ".8rem", borderTop: "1px solid #edf1f7", fontSize: ".85rem" };
