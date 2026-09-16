"use client";
import api from "@/lib/axios";
import { UI_COLORS } from "@/lib/brand";
import { formatPKR } from "@/lib/site";
import { tutorProfileHref } from "@/lib/tutor-directory";
import { MapPin,Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect,useState } from "react";

const C = UI_COLORS;

interface Tutor {
  _id: string;
  user: { _id: string; name: string; avatar: string; city: string; };
  bio: string;
  subjects: string[];
  hourlyRate: number;
  averageRating: number;
  totalReviews: number;
  isVerified: boolean;
  teachingMode: string;
}

export default function TopTutorsSection() {
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/tutors?limit=3&sort=-averageRating")
      .then(res => setTutors(res.data.tutors || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // If no real tutors yet show nothing or placeholder
  if (!loading && tutors.length === 0) return null;

  return (
    <section style={{ padding: '5rem 1.5rem', backgroundColor: C.gray50 }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: '800', color: C.primary, marginBottom: '0.5rem' }}>
            Meet Our Top Tutors
          </h2>
          <p style={{ color: C.gray500 }}>
            A glimpse of the verified, expert educators on our platform.
          </p>
        </div>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ backgroundColor: 'white', borderRadius: '0.875rem', overflow: 'hidden', border: '1px solid #e5e7eb', animation: 'pulse 1.5s infinite' }}>
                <div style={{ height: '160px', backgroundColor: '#f3f4f6' }} />
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ height: '16px', backgroundColor: '#f3f4f6', borderRadius: '0.25rem', width: '60%' }} />
                  <div style={{ height: '12px', backgroundColor: '#f3f4f6', borderRadius: '0.25rem', width: '80%' }} />
                  <div style={{ height: '12px', backgroundColor: '#f3f4f6', borderRadius: '0.25rem', width: '40%' }} />
                </div>
              </div>
            ))}
            <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {tutors.map(tutor => (
              <div key={tutor._id} style={{ backgroundColor: 'white', borderRadius: '0.875rem', overflow: 'hidden', border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', transition: 'box-shadow 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)')}>

                {/* Card Header */}
                <div style={{ height: '160px', background: `linear-gradient(135deg, ${C.primary}, ${C.accent})`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  {tutor.user?.avatar ? (
                    <Image src={tutor.user.avatar} alt={tutor.user.name} width={80} height={80} sizes="80px" unoptimized
                      style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(255,255,255,0.3)' }} />
                  ) : (
                    <div style={{ width: '80px', height: '80px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '2rem', fontWeight: '800', border: '3px solid rgba(255,255,255,0.3)' }}>
                      {tutor.user?.name?.charAt(0)}
                    </div>
                  )}
                  {tutor.isVerified && (
                    <div style={{ position: 'absolute', top: '1rem', right: '1rem', backgroundColor: '#16a34a', color: 'white', fontSize: '0.7rem', fontWeight: '700', padding: '0.2rem 0.6rem', borderRadius: '999px' }}>
                      ✓ Verified
                    </div>
                  )}
                </div>

                {/* Card Body */}
                <div style={{ padding: '1.5rem' }}>
                  {/* Name + Location */}
                  <div style={{ marginBottom: '0.5rem' }}>
                    <h3 style={{ fontWeight: '700', color: C.primary, fontSize: '1.05rem', marginBottom: '0.2rem' }}>
                      {tutor.user?.name}
                    </h3>
                    {tutor.user?.city && (
                      <p style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: C.gray500, fontSize: '0.8rem' }}>
                        <MapPin size={12} /> {tutor.user.city}
                      </p>
                    )}
                  </div>

                  {/* Bio */}
                  {tutor.bio && (
                    <p style={{ color: C.gray500, fontSize: '0.8rem', marginBottom: '0.75rem', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {tutor.bio}
                    </p>
                  )}

                  {/* Subjects */}
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                    {tutor.subjects?.slice(0, 3).map(s => (
                      <span key={s} style={{ backgroundColor: C.accentLight, color: C.accent, fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: '999px', fontWeight: '500' }}>
                        {s}
                      </span>
                    ))}
                    {tutor.subjects?.length > 3 && (
                      <span style={{ backgroundColor: C.gray50, color: C.gray500, fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: '999px' }}>
                        +{tutor.subjects.length - 3} more
                      </span>
                    )}
                  </div>

                  {/* Rating + Price */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #f3f4f6' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Star size={14} color={C.gold} fill={C.gold} />
                      <span style={{ fontWeight: '700', color: C.primary, fontSize: '0.875rem' }}>
                        {tutor.averageRating > 0 ? tutor.averageRating.toFixed(1) : "New"}
                      </span>
                      {tutor.totalReviews > 0 && (
                        <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>({tutor.totalReviews})</span>
                      )}
                    </div>
                    <span style={{ fontWeight: '700', color: C.primary, fontSize: '0.875rem' }}>
                      {formatPKR(tutor.hourlyRate || 0, "hour")}
                    </span>
                  </div>

                  {/* View Profile Button */}
                  <Link href={tutorProfileHref(tutor)}
                    style={{ display: 'block', textAlign: 'center', backgroundColor: C.accent, color: 'white', padding: '0.65rem', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: '600', textDecoration: 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#1d4ed8')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = C.accent)}>
                    View Profile
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
          <Link href="/tutors"
            style={{ border: `1.5px solid ${C.primary}`, color: C.primary, padding: '0.75rem 2rem', borderRadius: '0.5rem', fontWeight: '600', textDecoration: 'none', display: 'inline-block', fontSize: '0.95rem' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = C.primary; (e.currentTarget as HTMLElement).style.color = 'white'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLElement).style.color = C.primary; }}>
            Explore All Tutors
          </Link>
        </div>
      </div>
    </section>
  );
}
