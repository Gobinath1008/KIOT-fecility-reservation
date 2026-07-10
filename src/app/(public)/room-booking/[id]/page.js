'use client';
import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import styles from '@/app/(user)/book/[id]/booking.module.css';

const TIME_SLOTS = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00'];

const formatTime12h = (timeStr) => {
  if (!timeStr) return '';
  const [hourStr, minStr] = timeStr.split(':');
  const hour = parseInt(hourStr);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${String(hour12).padStart(2, '0')}:${minStr} ${ampm}`;
};

function RoomDetailForm() {
  const router = useRouter();
  const { id } = useParams();
  const searchParams = useSearchParams();
  const dateParam = searchParams.get('date') || '';

  const [room, setRoom] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    date: dateParam,
    checkOutDate: dateParam,
    startTime: '',
    endTime: '',
    guests: 1,
    purpose: ''
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  // Get today's date and current time
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  // Check if a time slot is in the past
  const isTimeSlotInPast = (timeSlot) => {
    if (form.date !== today) return false;
    const [h, m] = timeSlot.split(':').map(Number);
    const slotMinutes = h * 60 + m;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    return slotMinutes <= currentMinutes;
  };

  useEffect(() => {
    Promise.all([
      fetch(`/api/rooms?id=${id}`).then(r => r.json()),
      fetch(`/api/bookings?all=true&serviceType=room`).then(r => r.json()),
      fetch('/api/auth/me')
    ]).then(async ([roomData, bookingsData, authRes]) => {
      setRoom(roomData);
      setBookings(Array.isArray(bookingsData) ? bookingsData.filter(b => (b.serviceId?._id || b.serviceId) === id && b.status === 'approved') : []);
      if (authRes.ok) {
        const u = await authRes.json();
        setUser(u);
      }
      setLoading(false);
    });
  }, [id]);

  const handleDateChange = (newDate) => {
    setForm(f => {
      const updatedCheckOut = (!f.checkOutDate || f.checkOutDate < newDate) ? newDate : f.checkOutDate;
      return { ...f, date: newDate, checkOutDate: updatedCheckOut, startTime: '', endTime: '' };
    });
    setErrors(e => ({ ...e, date: '', checkOutDate: '', startTime: '', endTime: '' }));
  };

  const isStartTimeBooked = (t) => {
    return bookings.some(b => b.roomCheckInDate === form.date && t >= b.roomCheckInTime && t < b.roomCheckOutTime);
  };

  const isEndTimeDisabled = (t) => {
    if (!form.startTime) {
      return bookings.some(b => b.roomCheckInDate === form.date && t > b.roomCheckInTime && t <= b.roomCheckOutTime);
    }
    // If check-out is on a different day, end time is not constrained by check-in time of the same day
    if (form.checkOutDate !== form.date) {
      // Check if checkout time overlaps with a booking on checkout date
      if (bookings.some(b => b.roomCheckInDate === form.checkOutDate && t > b.roomCheckInTime && t <= b.roomCheckOutTime)) return true;
      return false;
    }

    if (t <= form.startTime) return true;
    
    // Check if the end time itself falls inside a booked range
    if (bookings.some(b => b.roomCheckInDate === form.date && t > b.roomCheckInTime && t <= b.roomCheckOutTime)) return true;

    // Check if selecting this end time would overlap with an existing booking that starts after our selected start time
    if (bookings.some(b => b.roomCheckInDate === form.date && b.roomCheckInTime >= form.startTime && t > b.roomCheckInTime)) return true;

    // Check if end time is in the past
    if (form.date === today && isTimeSlotInPast(t)) return true;

    return false;
  };

  const validate = () => {
    const errs = {};
    if (!form.date) errs.date = 'Please select check-in date';
    if (!form.checkOutDate) errs.checkOutDate = 'Please select check-out date';
    if (form.date && form.checkOutDate && form.checkOutDate < form.date) {
      errs.checkOutDate = 'Check-out date must be on or after check-in date';
    }
    if (!form.startTime) errs.startTime = 'Please select check-in time';
    if (!form.endTime) errs.endTime = 'Please select check-out time';
    
    if (form.date && form.checkOutDate && form.date === form.checkOutDate) {
      if (form.startTime && form.endTime && form.startTime >= form.endTime) {
        errs.endTime = 'Check-out time must be after check-in time';
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true); setError('');
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceType: 'room',
          serviceId: id,
          roomCheckInDate: form.date,
          roomCheckOutDate: form.checkOutDate,
          roomCheckInTime: form.startTime,
          roomCheckOutTime: form.endTime,
          numberOfGuests: form.guests,
          roomPurpose: form.purpose
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message); return; }
      setMsg('✅ Booking submitted successfully!');
      setTimeout(() => router.push('/my-bookings'), 2000);
    } catch { setError('Something went wrong'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="spinner-wrap"><div className="spinner" /></div>;
  if (!room || room.message) return <div className="container p-12 text-center">Room not found</div>;

  return (
    <div className={styles.page}>
      <div className="container">
        <Link href="/room-booking" className={styles.backBtn}>← Back to Rooms</Link>
        <div className={styles.layout}>
          {/* Form */}
          <div>
            <div className={styles.formHeader}>
              <h1 className={styles.formTitle}>Book a Room</h1>
              <div className={styles.hallBadge}>
                <span>🛏️</span>
                <div>
                  <div className={styles.hallBadgeName}>Room {room?.roomNumber}</div>
                  <div className={styles.hallBadgeCap}>Occupancy: {room?.occupancy} guests • {room?.ac ? 'AC' : 'Non-AC'} • {room?.location}</div>
                </div>
              </div>
            </div>

            {msg && <div className="alert alert-success">{msg}</div>}
            {error && <div className="alert alert-error">{error}</div>}

            {user ? (
              <form onSubmit={handleSubmit}>
                {/* Check-in Date */}
                <div className={styles.section}>
                  <h2 className={styles.sectionTitle}>📅 Check-in Date</h2>
                  <input type="date" className={`form-input ${errors.date ? 'error' : ''}`}
                    min={today} value={form.date} onChange={e => handleDateChange(e.target.value)} required />
                  {errors.date && <div className="error-msg">{errors.date}</div>}
                </div>

                {/* Check-out Date */}
                <div className={styles.section}>
                  <h2 className={styles.sectionTitle}>📅 Check-out Date</h2>
                  <input type="date" className={`form-input ${errors.checkOutDate ? 'error' : ''}`}
                    min={form.date || today} value={form.checkOutDate} onChange={e => {
                      setForm(f => ({ ...f, checkOutDate: e.target.value }));
                      setErrors(err => ({ ...err, checkOutDate: '' }));
                    }} required />
                  {errors.checkOutDate && <div className="error-msg">{errors.checkOutDate}</div>}
                </div>

                {/* Time slots */}
                <div className={styles.section}>
                  <h2 className={styles.sectionTitle}>🕐 Check-in Time</h2>
                  <div className={styles.timeSlots}>
                    {TIME_SLOTS.slice(0, -1).map(t => {
                      const booked = isStartTimeBooked(t);
                      const isPast = isTimeSlotInPast(t);
                      return (
                        <button key={t} type="button"
                          className={`${styles.timeSlot} ${form.startTime === t ? styles.slotActive : ''} ${booked || isPast ? styles.slotDisabled : ''}`}
                          onClick={() => !booked && !isPast && setForm(f => ({ ...f, startTime: t }))}
                          disabled={booked || isPast}
                          title={isPast ? 'This time has passed' : booked ? 'Already booked' : ''}
                        >{formatTime12h(t)}</button>
                      );
                    })}
                  </div>
                  {errors.startTime && <div className="error-msg">{errors.startTime}</div>}
                </div>

                <div className={styles.section}>
                  <h2 className={styles.sectionTitle}>🕕 Check-out Time</h2>
                  <div className={styles.timeSlots}>
                    {TIME_SLOTS.slice(1).map(t => {
                      const disabled = isEndTimeDisabled(t);
                      return (
                        <button key={t} type="button"
                          className={`${styles.timeSlot} ${form.endTime === t ? styles.slotActive : ''} ${disabled ? styles.slotDisabled : ''}`}
                          onClick={() => !disabled && setForm(f => ({ ...f, endTime: t }))}
                          disabled={disabled}>{formatTime12h(t)}</button>
                      );
                    })}
                  </div>
                  {errors.endTime && <div className="error-msg">{errors.endTime}</div>}
                </div>

                <div className={styles.section}>
                  <h2 className={styles.sectionTitle}>👥 Expected Guests</h2>
                  <input type="number" className="form-input" min="1" max={room?.occupancy} required
                    value={form.guests} onChange={e => setForm({...form, guests: parseInt(e.target.value) || 1})} style={{ maxWidth: 200 }} />
                </div>

                <div className={styles.section}>
                  <h2 className={styles.sectionTitle}>📋 Purpose</h2>
                  <textarea className="form-input" rows={3} placeholder="What is the purpose of your booking?"
                    value={form.purpose} onChange={e => setForm({...form, purpose: e.target.value})} style={{ resize: 'vertical' }} />
                </div>

                <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={submitting}>
                  {submitting ? '⏳ Submitting...' : '🚀 Submit Booking Request'}
                </button>
              </form>
            ) : (
              <div className="bg-purple-50 border border-purple-100 rounded-xl p-6 text-center mt-8">
                <p className="text-purple-800 mb-4 font-medium">You need to be logged in to book this room.</p>
                <Link href="/login" className="btn-primary inline-flex">🔑 Login to Book</Link>
              </div>
            )}
          </div>

          {/* Summary sidebar */}
          <div className={styles.summary}>
            <div className={styles.summaryCard}>
              <h3 className={styles.summaryTitle}>📋 Booking Summary</h3>
              <div className={styles.summaryRows}>
                <div className={styles.summaryRow}><span>Room</span><strong>{room?.roomNumber ? `Room ${room.roomNumber}` : '—'}</strong></div>
                <div className={styles.summaryRow}><span>Hostel</span><strong>Boys Hostel</strong></div>
                <div className={styles.summaryRow}><span>AC Type</span><strong>{room?.ac ? 'AC' : 'Non-AC'}</strong></div>
                <div className={styles.summaryRow}><span>Check-in Date</span><strong>{form.date || '—'}</strong></div>
                <div className={styles.summaryRow}><span>Check-out Date</span><strong>{form.checkOutDate || '—'}</strong></div>
                <div className={styles.summaryRow}><span>Check-in Time</span><strong>{formatTime12h(form.startTime) || '—'}</strong></div>
                <div className={styles.summaryRow}><span>Check-out Time</span><strong>{formatTime12h(form.endTime) || '—'}</strong></div>
                <div className={styles.summaryRow}><span>Guests</span><strong>{form.guests}</strong></div>
              </div>
              <div className={styles.summaryNote}>
                ℹ️ Your request will be sent to admin for approval. You&apos;ll see the status in <strong>My Bookings</strong>.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>  );
}

export default function RoomDetailPage() {
  return (
    <Suspense fallback={<div className="spinner-wrap"><div className="spinner" /></div>}>
      <RoomDetailForm />
    </Suspense>
  );
}