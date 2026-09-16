"use client";
import PlaceBidModal from "@/components/Dashboard/PlaceBidModal";
import api from "@/lib/axios";
import { UI_COLORS } from "@/lib/brand";
import { COUNTRIES,getCitiesForCountry } from "@/lib/location";
import { formatMoney } from "@/lib/site";
import { DashRequest } from "@/types/dashboard";
import { BookOpen,Clock,MapPin,Send } from "lucide-react";
import Link from "next/link";
import { useCallback,useEffect,useState } from "react";

const C = UI_COLORS;

interface RequestItem {
  _id: string;
  subject: string;
  level: string;
  description: string;
  budget: number;
  currency?: string;
  countryCode?: string;
  countryName?: string;
  pricingUnit?: "hour" | "session" | "month" | "course";
  allowCounterOffers: boolean;
  teachingMode: string;
  city?: string;
  schedule: string;
  createdAt: string;
  student: { name: string; city?: string; countryCode?: string; countryName?: string; avatar?: string };
  bid?: { _id: string; amount: number; currency?: string; status: string; expiresAt: string; pricingUnit?: "hour" | "session" | "month" | "course"; createdAt: string } | null;
}

const LEVELS = ["Primary (Grades 1-5)", "Middle (Grades 6-8)", "Matric (9th & 10th)", "Intermediate / FSc", "O-Level (Cambridge / Edexcel)", "A-Level (Cambridge / Edexcel)", "IB (Middle Years / Diploma)", "University / Degree", "Test Preparation", "Other"];

export default function BrowseRequestsPage() {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState("");
  const [level, setLevel] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [bidModalRequest, setBidModalRequest] = useState<RequestItem | null>(null);

  const availableCities = country ? getCitiesForCountry(country) : [];

  const fetchRequests = useCallback(async (pageNum: number) => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(pageNum), limit: "12" };
      if (subject) params.subject = subject;
      if (level) params.level = level;
      if (country) params.country = country;
      if (city) params.city = city;
      const res = await api.get(`/requests?${new URLSearchParams(params).toString()}`);
      setRequests(res.data.requests);
      setTotalPages(Math.max(1, Math.ceil(res.data.total / 12)));
    } catch (err) {
      console.error("Failed to fetch requests:", err);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [subject, level, country, city]);

  useEffect(() => {
    const timer = setTimeout(() => { setPage(1); fetchRequests(1); }, 400);
    return () => clearTimeout(timer);
  }, [subject, level, country, city, fetchRequests]);

  useEffect(() => { fetchRequests(page); }, [page, fetchRequests]);

  return (
    <div style={{ backgroundColor: C.gray50, minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ backgroundColor: C.primary, padding: '3rem 1.5rem' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', textAlign: 'center' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: '800', color: 'white', marginBottom: '0.5rem' }}>
            Browse Student Requests
          </h1>
          <p style={{ color: '#9ca3af', fontSize: '1rem' }}>
            Find relevant tuition requests worldwide or locally and send students a transparent offer.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem' }}>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '2rem', backgroundColor: 'white', padding: '1.25rem', borderRadius: '0.875rem', border: '1px solid #e5e7eb' }}>
          <input
            type="text" value={subject} onChange={e => setSubject(e.target.value)}
            placeholder="Search by subject..."
            style={{ flex: '1 1 200px', padding: '0.65rem 1rem', border: '1.5px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', color: C.primary }}
          />
          <select
            value={level} onChange={e => setLevel(e.target.value)}
            style={{ flex: '0 1 150px', padding: '0.65rem 1rem', border: '1.5px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.875rem', color: level ? C.primary : C.gray500, backgroundColor: 'white' }}>
            <option value="">All Levels</option>
            {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>

          {/* Country filter */}
          <select
            value={country} onChange={e => { setCountry(e.target.value); setCity(""); }}
            style={{ flex: '0 1 170px', padding: '0.65rem 1rem', border: '1.5px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.875rem', color: country ? C.primary : C.gray500, backgroundColor: 'white' }}>
            <option value="">All Countries</option>
            {COUNTRIES.map(c => (
              <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
            ))}
          </select>

          {/* City filter */}
          {country && availableCities.length > 0 ? (
            <select
              value={city} onChange={e => setCity(e.target.value)}
              style={{ flex: '0 1 150px', padding: '0.65rem 1rem', border: '1.5px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.875rem', color: city ? C.primary : C.gray500, backgroundColor: 'white' }}>
              <option value="">All Cities</option>
              {availableCities.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          ) : (
            <input
              type="text" value={city} onChange={e => setCity(e.target.value)}
              placeholder="City..."
              style={{ flex: '0 1 140px', padding: '0.65rem 1rem', border: '1.5px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', color: C.primary }}
            />
          )}
        </div>

        {/* Grid */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ backgroundColor: 'white', borderRadius: '0.875rem', padding: '1.5rem', border: '1px solid #e5e7eb', height: '180px' }}>
                <div style={{ width: '60%', height: '16px', backgroundColor: '#f3f4f6', borderRadius: '4px', marginBottom: '1rem' }} />
                <div style={{ width: '100%', height: '12px', backgroundColor: '#f3f4f6', borderRadius: '4px', marginBottom: '0.5rem' }} />
                <div style={{ width: '80%', height: '12px', backgroundColor: '#f3f4f6', borderRadius: '4px' }} />
              </div>
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div style={{ backgroundColor: 'white', borderRadius: '0.875rem', padding: '4rem', textAlign: 'center', border: '1px solid #e5e7eb' }}>
            <p style={{ color: C.gray500, fontSize: '1rem' }}>No open requests match your filters right now.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
            {requests.map(r => (
              <div key={r._id} style={{ backgroundColor: 'white', borderRadius: '0.875rem', padding: '1.5rem', border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: C.primary, marginBottom: '0.2rem' }}>{r.subject}</h3>
                    <span style={{ fontSize: '0.75rem', fontWeight: '600', color: C.accent, backgroundColor: C.accentLight, padding: '0.15rem 0.6rem', borderRadius: '999px' }}>{r.level}</span>
                  </div>
                  <span style={{ fontSize: '0.9rem', fontWeight: '700', color: C.primary }}>{formatMoney(r.budget || 0, r.currency || "PKR", r.pricingUnit || "hour")}</span>
                </div>

                <p style={{ color: C.gray500, fontSize: '0.85rem', lineHeight: '1.5', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                  {r.description}
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.78rem', color: C.gray500 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <MapPin size={13} />
                    {r.city ? `${r.city}, ${r.countryName || r.countryCode || ''}` : (r.countryName || 'Worldwide Online')}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><BookOpen size={13} />{r.teachingMode}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Clock size={13} />{r.schedule}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid #f3f4f6' }}>
                  <span style={{ fontSize: '0.8rem', color: C.gray500 }}>By {r.student?.name}</span>
                  {r.bid ? (
                    <Link href="/offers" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: C.accentLight, color: C.accent, padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #bfdbfe', fontWeight: '600', fontSize: '0.8rem', textDecoration: 'none' }}>
                      Offer sent · {r.bid.status.replaceAll("_", " ")}
                    </Link>
                  ) : (
                    <button onClick={() => setBidModalRequest(r)}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: C.accent, color: 'white', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', fontWeight: '600', fontSize: '0.8rem', cursor: 'pointer' }}>
                      <Send size={13} /> Send Offer
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '2rem' }}>
            {Array.from({ length: totalPages }).map((_, i) => (
              <button key={i} onClick={() => setPage(i + 1)}
                style={{ width: '36px', height: '36px', borderRadius: '0.5rem', border: page === i + 1 ? 'none' : '1px solid #e5e7eb', backgroundColor: page === i + 1 ? C.accent : 'white', color: page === i + 1 ? 'white' : C.primary, fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer' }}>
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bid Modal */}
      {bidModalRequest && (
        <PlaceBidModal
          request={bidModalRequest as DashRequest}
          onClose={() => setBidModalRequest(null)}
          onSuccess={() => { setBidModalRequest(null); fetchRequests(page); }}
        />
      )}
    </div>
  );
}
