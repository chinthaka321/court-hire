import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { getCourts, getAvailability } from '../lib/api';
import { DatePicker } from '../components/DatePicker';
import { SlotCell } from '../components/SlotCell';
import { Court, SlotInfo } from '../types';
import { toDateOnlyString } from '../lib/utils';

export function BookingCalendar() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedCourtId, setSelectedCourtId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { isSignedIn } = useAuth();

  const { data: courts = [] } = useQuery<Court[]>({
    queryKey: ['courts'],
    queryFn: getCourts,
  });

  const activeCourt = selectedCourtId ?? courts[0]?.id ?? null;

  const { data: slots = [], isLoading } = useQuery<SlotInfo[]>({
    queryKey: ['availability', activeCourt, toDateOnlyString(selectedDate)],
    queryFn: () => getAvailability(activeCourt!, toDateOnlyString(selectedDate)),
    enabled: !!activeCourt,
  });

  function handleSlotTap(slot: SlotInfo) {
    if (!isSignedIn) {
      navigate('/login');
      return;
    }
    navigate(`/book/${activeCourt}/${encodeURIComponent(slot.slotStart)}`);
  }

  return (
    <div className="max-w-lg mx-auto pb-8">
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <h1 className="text-xl font-bold text-[#191c19]">Book a Court</h1>
        <p className="text-sm text-[#404942] mt-0.5">
          {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Date picker */}
      <DatePicker selected={selectedDate} onSelect={setSelectedDate} />

      {/* Court tabs */}
      {courts.length > 1 && (
        <div className="flex gap-2 overflow-x-auto px-4 mt-3 pb-1">
          {courts.map((court) => (
            <button
              key={court.id}
              onClick={() => setSelectedCourtId(court.id)}
              className={`flex-shrink-0 text-sm font-medium px-3 py-1.5 rounded-full transition-colors
                ${(activeCourt === court.id)
                  ? 'bg-[#1b5e3b] text-white'
                  : 'bg-white text-[#404942] border border-[#bfc9bf] hover:border-[#1b5e3b]'
                }`}
            >
              {court.name}
            </button>
          ))}
        </div>
      )}

      {/* Section label */}
      <div className="px-4 mt-4 mb-1">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[#404942]">
          Available Times
        </p>
      </div>

      {/* Slot list */}
      <div className="mx-4 rounded-xl overflow-hidden border border-[#e6e9e4] bg-white">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-[#404942]">Loading slots…</div>
        ) : slots.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#404942]">No slots available for this day.</div>
        ) : (
          slots.map((slot) => (
            <SlotCell
              key={slot.slotStart}
              slot={slot}
              onClick={() => handleSlotTap(slot)}
            />
          ))
        )}
      </div>
    </div>
  );
}
