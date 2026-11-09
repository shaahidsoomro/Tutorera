'use client';

import { useStitch } from '@/hooks/useStitch';
import { UI_COLORS } from '@/lib/brand';
import { Star, MapPin, DollarSign, Check } from 'lucide-react';

interface Tutor {
  id: string;
  name: string;
  rating: number;
  hourlyRate: number;
  specializations: string[];
  verified: boolean;
  availability: string;
}

export function StitchTutorGallery() {
  const { data: tutors, loading, error } = useStitch<Tutor>({
    model: 'tutors',
    watchChanges: true,
  });

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: UI_COLORS.gray500 }}>
        Loading tutors from Stitch...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', color: UI_COLORS.error }}>
        Error loading tutors: {error.message}
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', color: UI_COLORS.primary }}>
        Available Tutors (via Stitch)
      </h2>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {tutors.map((tutor) => (
          <div
            key={tutor.id}
            style={{
              border: `1px solid ${UI_COLORS.gray200}`,
              borderRadius: '0.75rem',
              padding: '1.5rem',
              backgroundColor: 'white',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              transition: 'box-shadow 0.2s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
            }}
          >
            {/* Header with name and verified */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: UI_COLORS.primary }}>
                {tutor.name}
              </h3>
              {tutor.verified && (
                <Check size={18} style={{ color: '#10b981' }} />
              )}
            </div>

            {/* Rating */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <Star size={16} fill={UI_COLORS.accent} color={UI_COLORS.accent} />
              <span style={{ fontWeight: '600', color: UI_COLORS.primary }}>
                {tutor.rating.toFixed(1)}
              </span>
            </div>

            {/* Hourly Rate */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#10b981', fontWeight: '600' }}>
              <DollarSign size={16} />
              <span>{tutor.hourlyRate}/hour</span>
            </div>

            {/* Specializations */}
            <div style={{ marginBottom: '0.75rem' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: '600', color: UI_COLORS.gray500, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                Specializations
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {tutor.specializations.slice(0, 3).map((spec) => (
                  <span
                    key={spec}
                    style={{
                      backgroundColor: '#f0f4ff',
                      color: UI_COLORS.accent,
                      padding: '0.25rem 0.75rem',
                      borderRadius: '1rem',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                    }}
                  >
                    {spec}
                  </span>
                ))}
              </div>
            </div>

            {/* Availability */}
            <div style={{ fontSize: '0.875rem', color: UI_COLORS.gray600, marginBottom: '1rem' }}>
              <MapPin size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
              {tutor.availability}
            </div>

            {/* CTA Button */}
            <button
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: UI_COLORS.accent,
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = '#0251a7';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = UI_COLORS.accent;
              }}
            >
              View Profile
            </button>
          </div>
        ))}
      </div>

      {tutors.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: UI_COLORS.gray500 }}>
          No tutors available at this time
        </div>
      )}
    </div>
  );
}
