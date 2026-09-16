"use client";
import Image from "next/image";
import api from "@/lib/axios";
import { UI_COLORS } from "@/lib/brand";
import { Star } from "lucide-react";
import { useEffect,useState } from "react";

const C = UI_COLORS;

interface StudentRating {
  _id: string;
  student: { name: string; email: string; avatar?: string };
  tutor: { name: string; email: string };
  booking: { amount: number; schedule: string; createdAt: string };
  rating: number;
  comment: string;
  createdAt: string;
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div style={{ display: 'flex', gap: '1px' }}>
      {[1,2,3,4,5].map(s => (
        <span key={s} style={{ color: s <= rating ? '#f59e0b' : '#e5e7eb', fontSize: '0.875rem' }}>★</span>
      ))}
    </div>
  );
}

export default function StudentRatingsPage() {
  const [ratings, setRatings] = useState<StudentRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.get("/admin/student-ratings")
      .then(res => setRatings(res.data.ratings))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = ratings.filter(r =>
    r.student.name.toLowerCase().includes(search.toLowerCase()) ||
    r.student.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: C.primary }}>Student Ratings</h1>
        <p style={{ color: C.gray500, fontSize: '0.875rem' }}>Ratings submitted by tutors for their students. Not visible to students.</p>
      </div>

      {/* Search */}
      <div style={{ marginBottom: '1.5rem' }}>
        <input
          type="text"
          placeholder="Search by student name or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ padding: '0.7rem 1rem', border: '1.5px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.875rem', outline: 'none', width: '100%', maxWidth: '360px', boxSizing: 'border-box' }}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <div style={{ width: '36px', height: '36px', border: `3px solid ${C.accent}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ backgroundColor: 'white', borderRadius: '0.875rem', padding: '4rem', textAlign: 'center', border: '1px solid #e5e7eb' }}>
          <Star size={40} color="#d1d5db" style={{ margin: '0 auto 1rem' }} />
          <p style={{ color: C.gray500 }}>No student ratings yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filtered.map(r => (
            <div key={r._id} style={{ backgroundColor: 'white', borderRadius: '0.875rem', padding: '1.25rem 1.5rem', border: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.875rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                  {/* Student avatar */}
                  <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#EEF5FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: C.accent, fontSize: '1rem', flexShrink: 0, overflow: 'hidden' }}>
                    {r.student.avatar
                      ? <Image src={r.student.avatar} alt={r.student.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}  width={100} height={100} unoptimized/>
                      : r.student.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, color: C.primary, fontSize: '0.95rem', margin: '0 0 2px' }}>{r.student.name}</p>
                    <p style={{ color: C.gray500, fontSize: '0.78rem', margin: 0 }}>{r.student.email}</p>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <StarDisplay rating={r.rating} />
                  <p style={{ color: '#9ca3af', fontSize: '0.75rem', margin: '4px 0 0' }}>
                    by {r.tutor.name} · {new Date(r.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <p style={{ color: '#374151', fontSize: '0.875rem', lineHeight: 1.6, margin: '0 0 0.75rem', padding: '0.75rem', backgroundColor: C.gray50, borderRadius: '0.5rem' }}>
                "{r.comment}"
              </p>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.75rem', color: C.gray500 }}>
                  📅 {r.booking?.schedule}
                </span>
                <span style={{ fontSize: '0.75rem', color: C.gray500 }}>
                  💰 Rs. {r.booking?.amount?.toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}