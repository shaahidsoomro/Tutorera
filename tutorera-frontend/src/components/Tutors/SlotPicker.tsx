"use client";
// components/tutors/SlotPicker.tsx
import api from "@/lib/axios";
import { useEffect,useState } from "react";

interface Slot {
  date: string;       // "2026-07-07"
  dayName: string;
  startTime: string;
  endTime: string;
}

interface GroupedDay {
  date: string;
  dayName: string;
  dayShort: string;   // "Mon"
  dateNum: number;    // 7
  monthShort: string; // "Jul"
  slots: Slot[];
}

interface Props {
  tutorUserId: string;
  onSlotSelect: (slot: Slot | null) => void;
  selectedSlot: Slot | null;
}

const DAY_SHORT: Record<string, string> = {
  Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed",
  Thursday: "Thu", Friday: "Fri", Saturday: "Sat", Sunday: "Sun",
};

const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function groupByDay(slots: Slot[]): GroupedDay[] {
  const map: Record<string, GroupedDay> = {};
  for (const slot of slots) {
    if (!map[slot.date]) {
      const d = new Date(slot.date + "T00:00:00");
      map[slot.date] = {
        date: slot.date,
        dayName: slot.dayName,
        dayShort: DAY_SHORT[slot.dayName],
        dateNum: d.getDate(),
        monthShort: MONTH_SHORT[d.getMonth()],
        slots: [],
      };
    }
    map[slot.date].slots.push(slot);
  }
  return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
}

function getTimeCategory(time: string): "Morning" | "Afternoon" | "Evening" {
  const hour = parseInt(time.split(":")[0]);
  if (hour < 12) return "Morning";
  if (hour < 17) return "Afternoon";
  return "Evening";
}

const CATEGORY_ICONS: Record<string, string> = {
  Morning: "🌅",
  Afternoon: "☀️",
  Evening: "🌙",
};

export default function SlotPicker({ tutorUserId, onSlotSelect, selectedSlot }: Props) {
  const [allSlots, setAllSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAvailability, setHasAvailability] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0); // 0 = this week, 1 = next week

  useEffect(() => {
    api.get(`/tutors/${tutorUserId}/availability`)
      .then(res => {
        setAllSlots(res.data.slots || []);
        setHasAvailability(res.data.hasAvailability);
        // Auto-select first available date
        if (res.data.slots?.length > 0) {
          setSelectedDate(res.data.slots[0].date);
        }
      })
      .catch(() => setAllSlots([]))
      .finally(() => setLoading(false));
  }, [tutorUserId]);

  const grouped = groupByDay(allSlots);

  // Split into two weeks of 7 days each
  const week1Days = grouped.slice(0, 7);
  const week2Days = grouped.slice(7, 14);
  const currentWeekDays = weekOffset === 0 ? week1Days : week2Days;

  const selectedDayData = grouped.find(d => d.date === selectedDate);

  // Group selected day's slots by time category
  const slotsByCategory: Record<string, Slot[]> = {};
  if (selectedDayData) {
    for (const slot of selectedDayData.slots) {
      const cat = getTimeCategory(slot.startTime);
      if (!slotsByCategory[cat]) slotsByCategory[cat] = [];
      slotsByCategory[cat].push(slot);
    }
  }

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '2rem' }}>
      <div style={{ width: 28, height: 28, border: '3px solid #e5e7eb', borderTopColor: '#0329B2', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!hasAvailability || allSlots.length === 0) return (
    <div style={{ backgroundColor: '#F5F7FF', borderRadius: '0.75rem', padding: '1.5rem', textAlign: 'center', border: '1px dashed #e5e7eb' }}>
      <p style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📅</p>
      <p style={{ color: '#6b7280', fontSize: '0.875rem', fontWeight: 600 }}>No available slots in the next 2 weeks</p>
      <p style={{ color: '#9ca3af', fontSize: '0.8rem', marginTop: '0.25rem' }}>This tutor hasn't set their schedule yet or is fully booked.</p>
    </div>
  );

  // Build week range label
  const weekDays = weekOffset === 0 ? week1Days : week2Days;
  const weekLabel = weekDays.length > 0
    ? `${weekDays[0].monthShort} ${weekDays[0].dateNum} – ${weekDays[weekDays.length - 1].monthShort} ${weekDays[weekDays.length - 1].dateNum}, ${new Date(weekDays[0].date + "T00:00:00").getFullYear()}`
    : "";

  return (
    <div>
      {/* Week navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
        <button
          onClick={() => setWeekOffset(0)}
          disabled={weekOffset === 0}
          style={{ width: 44, height: 44, borderRadius: '50%', border: '1.5px solid #e5e7eb', backgroundColor: weekOffset === 0 ? '#F5F7FF' : 'white', cursor: weekOffset === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: weekOffset === 0 ? '#d1d5db' : '#374151', fontSize: '1rem' }}>
          ←
        </button>
        <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#021550' }}>{weekLabel}</span>
        <button
          onClick={() => setWeekOffset(1)}
          disabled={weekOffset === 1 || week2Days.length === 0}
          style={{ width: 44, height: 44, borderRadius: '50%', border: '1.5px solid #e5e7eb', backgroundColor: weekOffset === 1 || week2Days.length === 0 ? '#F5F7FF' : 'white', cursor: weekOffset === 1 || week2Days.length === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: weekOffset === 1 || week2Days.length === 0 ? '#d1d5db' : '#374151', fontSize: '1rem' }}>
          →
        </button>
      </div>

      {/* Day headers */}
      <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '1rem', overflowX: 'auto' }}>
        {currentWeekDays.length === 0 ? (
          <p style={{ color: '#9ca3af', fontSize: '0.8rem', padding: '0.5rem' }}>No available days this week</p>
        ) : currentWeekDays.map(day => (
          <button
            key={day.date}
            onClick={() => { setSelectedDate(day.date); onSlotSelect(null); }}
            style={{
              flex: 1, minWidth: 44, padding: '0.6rem 0.25rem',
              borderRadius: '0.75rem', border: '1.5px solid',
              borderColor: selectedDate === day.date ? '#0329B2' : '#e5e7eb',
              backgroundColor: selectedDate === day.date ? '#EEF5FF' : 'white',
              cursor: 'pointer', textAlign: 'center',
            }}>
            <p style={{ margin: 0, fontSize: '0.65rem', color: selectedDate === day.date ? '#0329B2' : '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>{day.dayShort}</p>
            <p style={{ margin: '2px 0 0', fontSize: '1rem', fontWeight: 800, color: selectedDate === day.date ? '#0329B2' : '#021550' }}>{day.dateNum}</p>
            <p style={{ margin: 0, fontSize: '0.6rem', color: selectedDate === day.date ? '#60a5fa' : '#9ca3af' }}>{day.monthShort}</p>
            <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: selectedDate === day.date ? '#0329B2' : '#d1d5db', margin: '4px auto 0' }} />
          </button>
        ))}
      </div>

      {/* Time slots for selected day */}
      {selectedDayData && (
        <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
          {(["Morning", "Afternoon", "Evening"] as const).map(category => {
            const catSlots = slotsByCategory[category];
            if (!catSlots?.length) return null;
            return (
              <div key={category} style={{ marginBottom: '1rem' }}>
                <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#6b7280', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  {CATEGORY_ICONS[category]} {category}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {catSlots.map(slot => {
                    const isSelected = selectedSlot?.date === slot.date && selectedSlot?.startTime === slot.startTime;
                    return (
                      <button
                        key={`${slot.date}-${slot.startTime}`}
                        onClick={() => onSlotSelect(isSelected ? null : slot)}
                        style={{
                          padding: '0.4rem 0.875rem', borderRadius: '0.5rem',
                          border: `1.5px solid ${isSelected ? '#0329B2' : '#e5e7eb'}`,
                          backgroundColor: isSelected ? '#0329B2' : 'white',
                          color: isSelected ? 'white' : '#374151',
                          fontSize: '0.8rem', fontWeight: isSelected ? 700 : 500,
                          cursor: 'pointer', transition: 'all 0.15s',
                        }}>
                        {slot.startTime}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected slot confirmation */}
      {selectedSlot && (
        <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.5rem', padding: '0.6rem 0.875rem', marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.875rem' }}>✅</span>
          <span style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 600 }}>
            {selectedSlot.dayName}, {new Date(selectedSlot.date + "T00:00:00").toLocaleDateString("en-PK", { day: "numeric", month: "short" })} at {selectedSlot.startTime}–{selectedSlot.endTime}
          </span>
        </div>
      )}
    </div>
  );
}