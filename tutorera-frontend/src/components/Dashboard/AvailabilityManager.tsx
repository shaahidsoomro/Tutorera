"use client";
// components/dashboard/AvailabilityManager.tsx
import axiosInstance from "@/lib/axios";
import { showError,showSuccess } from "@/lib/toast";
import { useEffect,useState } from "react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const TIME_OPTIONS: string[] = [];
for (let h = 6; h <= 22; h++) {
  TIME_OPTIONS.push(`${String(h).padStart(2, "0")}:00`);
  TIME_OPTIONS.push(`${String(h).padStart(2, "0")}:30`);
}

interface WeeklySlot {
  day: string;
  startTime: string;
  endTime: string;
}

export default function AvailabilityManager() {
  const [slots, setSlots] = useState<WeeklySlot[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axiosInstance.get("/tutors/availability/me")
      .then(res => {
        if (res.data.availability?.weeklySlots) {
          setSlots(res.data.availability.weeklySlots);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const addSlot = (day: string) => {
    setSlots(prev => [...prev, { day, startTime: "09:00", endTime: "10:00" }]);
  };

  const removeSlot = (index: number) => {
    setSlots(prev => prev.filter((_, i) => i !== index));
  };

  const updateSlot = (index: number, field: "startTime" | "endTime", value: string) => {
    setSlots(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axiosInstance.post("/tutors/availability", { weeklySlots: slots });
      showSuccess("Availability saved successfully.");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      showError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: 24, height: 24, border: '3px solid #e5e7eb', borderTopColor: '#0329B2', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>;

  return (
    <div style={{ backgroundColor: 'white', borderRadius: '0.875rem', border: '1.5px solid #e5e7eb', padding: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <p style={{ fontWeight: 700, color: '#021550', fontSize: '0.95rem', margin: 0 }}>Weekly Availability</p>
          <p style={{ color: '#6b7280', fontSize: '0.75rem', margin: '2px 0 0' }}>Set your standard weekly availability. Students will see your next 2 weeks of open slots.</p>
        </div>
        <button onClick={handleSave} disabled={saving}
          style={{ padding: '0.5rem 1.25rem', backgroundColor: saving ? '#93c5fd' : saved ? '#16a34a' : '#0329B2', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 700, fontSize: '0.8rem', cursor: saving ? 'not-allowed' : 'pointer' }}>
          {saving ? "Saving..." : saved ? "✓ Saved!" : "Save Availability"}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        {DAYS.map(day => {
          const daySlots = slots.filter(s => s.day === day);
          return (
            <div key={day} style={{ backgroundColor: '#F5F7FF', borderRadius: '0.625rem', padding: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: daySlots.length > 0 ? '0.625rem' : 0 }}>
                <p style={{ fontWeight: 700, color: '#021550', fontSize: '0.875rem', margin: 0 }}>{day}</p>
                <button onClick={() => addSlot(day)}
                  style={{ padding: '0.25rem 0.75rem', backgroundColor: '#EEF5FF', color: '#0329B2', border: '1px solid #bfdbfe', borderRadius: '0.375rem', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer' }}>
                  + Add Slot
                </button>
              </div>

              {daySlots.length === 0 && (
                <p style={{ color: '#9ca3af', fontSize: '0.75rem', margin: 0 }}>No slots — unavailable this day</p>
              )}

              {daySlots.map((slot) => {
                const realIndex = slots.indexOf(slot);
                return (
                  <div key={realIndex} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                    <select value={slot.startTime} onChange={e => updateSlot(realIndex, "startTime", e.target.value)}
                      title="Start time"
                      style={{ padding: '0.4rem 0.6rem', border: '1.5px solid #e5e7eb', borderRadius: '0.375rem', fontSize: '0.8rem', outline: 'none', color: '#021550' }}>
                      {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>to</span>
                    <select value={slot.endTime} onChange={e => updateSlot(realIndex, "endTime", e.target.value)}
                      title="End time"
                      style={{ padding: '0.4rem 0.6rem', border: '1.5px solid #e5e7eb', borderRadius: '0.375rem', fontSize: '0.8rem', outline: 'none', color: '#021550' }}>
                      {TIME_OPTIONS.filter(t => t > slot.startTime).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <button onClick={() => removeSlot(realIndex)}
                      aria-label="Remove time slot"
                      style={{ padding: '0.4rem 0.6rem', backgroundColor: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '0.375rem', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 700, minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
