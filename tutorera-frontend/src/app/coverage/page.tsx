import { UI_COLORS } from "@/lib/brand";
import { MapPin,Wifi } from "lucide-react";
import Link from "next/link";

const C = UI_COLORS;

const cities = [
  { name: "Islamabad", areas: ["F-6", "F-7", "F-8", "F-10", "G-9", "G-11", "DHA", "Bahria Town"] },
  { name: "Rawalpindi", areas: ["Saddar", "Bahria Town", "DHA", "Chaklala", "Westridge"] },
  { name: "Lahore", areas: ["DHA", "Gulberg", "Model Town", "Johar Town", "Bahria Town"] },
  { name: "Karachi", areas: ["DHA", "Clifton", "Gulshan", "North Nazimabad", "Saddar"] },
  { name: "Peshawar", areas: ["Hayatabad", "University Town", "Saddar"] },
  { name: "Quetta", areas: ["Satellite Town", "Jinnah Town", "Cantonment"] },
  { name: "Multan", areas: ["DHA", "Cantt", "Shah Rukn-e-Alam"] },
  { name: "Faisalabad", areas: ["Peoples Colony", "Gulshan Iqbal", "Madina Town"] },
];

export default function CoveragePage() {
  return (
    <div style={{ backgroundColor: 'white' }}>
      <section style={{ backgroundColor: C.primary, padding: '5rem 1.5rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: '800', color: 'white', marginBottom: '1rem' }}>
          Global Learning, Local Choice
        </h1>
        <p style={{ color: '#9ca3af', fontSize: '1.05rem', maxWidth: '500px', margin: '0 auto' }}>
          Learn online with educators worldwide. Local home tuition is available only in enabled markets and locations.
        </p>
      </section>

      {/* Online Banner */}
      <section style={{ padding: '3rem 1.5rem', backgroundColor: '#EEF5FF', borderBottom: '1px solid #bfdbfe' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ width: '56px', height: '56px', backgroundColor: '#0329B2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Wifi size={24} color="white" />
          </div>
          <div>
            <h2 style={{ fontWeight: '800', color: C.primary, fontSize: '1.2rem', marginBottom: '0.3rem' }}>Online Tutoring — Available Worldwide</h2>
            <p style={{ color: C.gray500, fontSize: '0.9rem' }}>Choose online learning across timezones, subjects, and curricula. Availability, offers, and checkout follow your selected market configuration.</p>
          </div>
          <Link href="/tutors?teachingMode=online" style={{ backgroundColor: '#0329B2', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', fontWeight: '700', textDecoration: 'none', whiteSpace: 'nowrap' }}>
            Find Online Tutors
          </Link>
        </div>
      </section>

      {/* Cities */}
      <section style={{ padding: '5rem 1.5rem', backgroundColor: C.gray50 }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: C.primary, textAlign: 'center', marginBottom: '3rem' }}>
            Pakistan Home-Tuition Coverage
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
            {cities.map(city => (
              <div key={city.name} style={{ backgroundColor: 'white', borderRadius: '0.875rem', padding: '1.75rem', border: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <MapPin size={20} color={C.accent} />
                  <h3 style={{ fontWeight: '700', color: C.primary, fontSize: '1.05rem' }}>{city.name}</h3>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {city.areas.map(area => (
                    <span key={area} style={{ backgroundColor: C.gray50, color: C.gray500, fontSize: '0.78rem', padding: '0.25rem 0.6rem', borderRadius: '999px', border: '1px solid #e5e7eb' }}>
                      {area}
                    </span>
                  ))}
                </div>
                <Link href={`/tutors?city=${city.name}`} style={{ display: 'inline-block', marginTop: '1rem', color: C.accent, fontSize: '0.8rem', fontWeight: '600', textDecoration: 'none' }}>
                  Find tutors in {city.name} →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
