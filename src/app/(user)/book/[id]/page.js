'use client';
import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import styles from './booking.module.css';

const TIME_SLOTS = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00'];

const formatTime12h = (timeStr) => {
  if (!timeStr) return '';
  const [hourStr, minStr] = timeStr.split(':');
  const hour = parseInt(hourStr);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${String(hour12).padStart(2, '0')}:${minStr} ${ampm}`;
};

function BookForm() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialDate = searchParams.get('date') || '';
  const initialStart = searchParams.get('startTime') || '';
  const initialEnd = searchParams.get('endTime') || '';

  const [hall, setHall] = useState(null);
  const [form, setForm] = useState({
    date: initialDate,
    startTime: initialStart,
    endTime: initialEnd,
    purpose: '',
    attendees: '1'
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [submitMsg, setSubmitMsg] = useState('');
  const [submitError, setSubmitError] = useState('');

  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  const currentHour = String(now.getHours()).padStart(2, '0');

  // Get minimum available time slot for today
  const getMinTimeSlot = () => {
    if (form.date !== today) return null;
    // Find the first time slot that is >= current time
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    return TIME_SLOTS.find(t => {
      const [h, m] = t.split(':').map(Number);
      const slotMinutes = h * 60 + m;
      return slotMinutes > currentMinutes; // Must be strictly greater (future time)
    });
  };

  // Check if a time slot is in the past
  const isTimeSlotInPast = (timeSlot) => {
    if (form.date !== today) return false;
    const [h, m] = timeSlot.split(':').map(Number);
    const slotMinutes = h * 60 + m;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    return slotMinutes <= currentMinutes;
  };

  const [existingBookings, setExistingBookings] = useState([]);

  useEffect(() => {
    fetch(`/api/halls?id=${id}`).then(r => r.json()).then(d => { setHall(d); setPageLoading(false); });
  }, [id]);

  useEffect(() => {
    if (!form.date) return;
    fetch(`/api/bookings?all=true&hallDate=${form.date}`)
      .then(r => r.json())
      .then(d => {
        const hallBookings = (Array.isArray(d) ? d : []).filter(
          b => (b.serviceId?._id || b.serviceId) === id && b.status === 'approved'
        );
        setExistingBookings(hallBookings);
      });
  }, [form.date, id]);

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })); };

  const handleDateChange = (newDate) => {
    setForm(f => ({ ...f, date: newDate, startTime: '', endTime: '' }));
    setErrors(e => ({ ...e, date: '', startTime: '', endTime: '' }));
  };

  const isStartTimeBooked = (t) => {
    return existingBookings.some(b => t >= b.hallStartTime && t < b.hallEndTime);
  };

  const isEndTimeDisabled = (t) => {
    if (!form.startTime) {
      return existingBookings.some(b => t > b.hallStartTime && t <= b.hallEndTime);
    }
    if (t <= form.startTime) return true;
    
    // Check if the end time itself falls inside a booked range
    if (existingBookings.some(b => t > b.hallStartTime && t <= b.hallEndTime)) return true;

    // Check if selecting this end time would overlap with an existing booking that starts after our selected start time
    if (existingBookings.some(b => b.hallStartTime >= form.startTime && t > b.hallStartTime)) return true;

    // Check if end time is in the past
    if (form.date === today && isTimeSlotInPast(t)) return true;

    return false;
  };

  const validate = () => {
    const errs = {};
    if (!form.date) errs.date = 'Please select a date';
    if (!form.startTime) errs.startTime = 'Please select start time';
    if (!form.endTime) errs.endTime = 'Please select end time';
    if (form.startTime && form.endTime && form.startTime >= form.endTime) errs.endTime = 'End time must be after start time';
    if (!form.purpose.trim()) errs.purpose = 'Purpose is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true); setSubmitError('');
    try {
        const res = await fetch('/api/bookings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceType: 'hall',
          serviceId: id,
          hallDate: form.date,
          hallStartTime: form.startTime,
          hallEndTime: form.endTime,
          purpose: form.purpose,
          attendees: parseInt(form.attendees) || 1,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setSubmitError(data.message); return; }
      setSubmitMsg('✅ Booking submitted! You will be notified when admin approves it.');
      setTimeout(() => router.push('/my-bookings'), 2500);
    } catch { setSubmitError('Something went wrong. Please try again.'); }
    finally { setLoading(false); }
  };

  const duration = form.startTime && form.endTime && form.startTime < form.endTime
    ? parseInt(form.endTime) - parseInt(form.startTime) : 0;

  if (pageLoading) return <div className="spinner-wrap"><div className="spinner" /></div>;

  return (
    <div className={styles.page}>
      <div className="container">
        <Link href="/halls" className={styles.backBtn}>← Back to Halls</Link>
        <div className={styles.layout}>
          {/* Form */}
          <div>
            <div className={styles.formHeader}>
              <h1 className={styles.formTitle}>Book a Hall</h1>
              <div className={styles.hallBadge}>
                <span>🏛️</span>
                <div>
                  <div className={styles.hallBadgeName}>{hall?.name}</div>
                  <div className={styles.hallBadgeCap}>Capacity: {hall?.capacity} seats • {hall?.location}</div>
                </div>
              </div>
            </div>

            {submitMsg && <div className="alert alert-success">{submitMsg}</div>}
            {submitError && <div className="alert alert-error">{submitError}</div>}

            <form onSubmit={handleSubmit}>
              {/* Date */}
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>📅 Date</h2>
                <input id="booking-date" type="date" className={`form-input ${errors.date ? 'error' : ''}`}
                  min={today} value={form.date} onChange={e => handleDateChange(e.target.value)} />
                {errors.date && <div className="error-msg">{errors.date}</div>}
              </div>

              {/* Time slots */}
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>🕐 Start Time</h2>
                <div className={styles.timeSlots}>
                  {TIME_SLOTS.slice(0, -1).map(t => {
                    const booked = isStartTimeBooked(t);
                    const isPast = isTimeSlotInPast(t);
                    return (
                      <button key={t} type="button"
                        className={`${styles.timeSlot} ${form.startTime === t ? styles.slotActive : ''} ${booked || isPast ? styles.slotDisabled : ''}`}
                        onClick={() => !booked && !isPast && set('startTime', t)}
                        disabled={booked || isPast}
                        title={isPast ? 'This time has passed' : booked ? 'Already booked' : ''}
                      >{formatTime12h(t)}</button>
                    );
                  })}
                </div>
                {errors.startTime && <div className="error-msg">{errors.startTime}</div>}
              </div>

              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>🕕 End Time</h2>
                <div className={styles.timeSlots}>
                  {TIME_SLOTS.slice(1).map(t => {
                    const disabled = isEndTimeDisabled(t);
                    return (
                      <button key={t} type="button"
                        className={`${styles.timeSlot} ${form.endTime === t ? styles.slotActive : ''} ${disabled ? styles.slotDisabled : ''}`}
                        onClick={() => !disabled && set('endTime', t)}
                        disabled={disabled}>{formatTime12h(t)}</button>
                    );
                  })}
                </div>
                {errors.endTime && <div className="error-msg">{errors.endTime}</div>}
                {duration > 0 && (
                  <div className={styles.durationBadge}>⏱️ Duration: {duration} hour{duration !== 1 ? 's' : ''}</div>
                )}
              </div>

              {/* Purpose */}
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>📋 Purpose</h2>
                <textarea id="purpose" className={`form-input ${errors.purpose ? 'error' : ''}`}
                  placeholder="e.g. Department meeting, Technical seminar, Workshop..."
                  value={form.purpose} onChange={e => set('purpose', e.target.value)}
                  rows={3} style={{ resize: 'vertical' }} />
                {errors.purpose && <div className="error-msg">{errors.purpose}</div>}
              </div>

              {/* Attendees */}
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>👥 Expected Attendees</h2>
                <input id="attendees" type="number" className="form-input" min="1" max={hall?.capacity}
                  placeholder={`Max: ${hall?.capacity}`} value={form.attendees}
                  onChange={e => set('attendees', e.target.value)} style={{ maxWidth: 200 }} />
              </div>

              <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={loading}>
                {loading ? '⏳ Submitting...' : '🚀 Submit Booking Request'}
              </button>
            </form>
          </div>

          {/* Summary sidebar */}
          <div className={styles.summary}>
            <div className={styles.summaryCard}>
              <h3 className={styles.summaryTitle}>📋 Booking Summary</h3>
              <div className={styles.summaryRows}>
                <div className={styles.summaryRow}><span>Hall</span><strong>{hall?.name || '—'}</strong></div>
                <div className={styles.summaryRow}><span>Location</span><strong>{hall?.location || '—'}</strong></div>
                <div className={styles.summaryRow}><span>Date</span><strong>{form.date || '—'}</strong></div>
                <div className={styles.summaryRow}><span>Start</span><strong>{formatTime12h(form.startTime) || '—'}</strong></div>
                <div className={styles.summaryRow}><span>End</span><strong>{formatTime12h(form.endTime) || '—'}</strong></div>
                <div className={styles.summaryRow}><span>Duration</span><strong>{duration > 0 ? `${duration} hr` : '—'}</strong></div>
                <div className={styles.summaryRow}><span>Attendees</span><strong>{form.attendees}</strong></div>
              </div>
              <div className={styles.summaryNote}>
                ℹ️ Your request will be sent to admin for approval. You&apos;ll see the status in <strong>My Bookings</strong>.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BookPage() {
  return (
    <Suspense fallback={<div className="spinner-wrap"><div className="spinner" /></div>}>
      <BookForm />
    </Suspense>
  );
}
