'use client';
// Force recompile
import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import styles from '@/app/(user)/book/[id]/booking.module.css';

const TYPE_ICONS = { car: '🚗', van: '🚐', bus: '🚌', bike: '🏍️' };
const TIME_SLOTS = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00'];

const formatTime12h = (timeStr) => {
  if (!timeStr) return '';
  const [hourStr, minStr] = timeStr.split(':');
  const hour = parseInt(hourStr);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${String(hour12).padStart(2, '0')}:${minStr} ${ampm}`;
};

function VehicleDetailForm() {
  const router = useRouter();
  const { id } = useParams();
  const searchParams = useSearchParams();
  const dateParam = searchParams.get('date') || '';

  const [vehicle, setVehicle] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    date: dateParam,
    startTime: '',
    endTime: '',
    pickupLocation: '',
    returnLocation: '',
    withDriver: true,
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
      fetch(`/api/vehicles?id=${id}`).then(r => r.json()),
      fetch(`/api/bookings?all=true&serviceType=vehicle`).then(r => r.json()),
      fetch('/api/auth/me')
    ]).then(async ([vehicleData, bookingsData, authRes]) => {
      setVehicle(vehicleData);
      setBookings(Array.isArray(bookingsData) ? bookingsData.filter(b => (b.serviceId?._id || b.serviceId) === id && b.status === 'approved') : []);
      if (authRes.ok) {
        const u = await authRes.json();
        setUser(u);
      }
      setLoading(false);
    });
  }, [id]);

  const handleDateChange = (newDate) => {
    setForm(f => ({ ...f, date: newDate, startTime: '', endTime: '' }));
    setErrors(e => ({ ...e, date: '', startTime: '', endTime: '' }));
  };

  const isStartTimeBooked = (t) => {
    return bookings.some(b => b.vehiclePickupDate === form.date && t >= b.vehiclePickupTime && t < b.vehicleReturnTime);
  };

  const isEndTimeDisabled = (t) => {
    if (!form.startTime) {
      return bookings.some(b => b.vehiclePickupDate === form.date && t > b.vehiclePickupTime && t <= b.vehicleReturnTime);
    }
    if (t <= form.startTime) return true;
    
    // Check if the end time itself falls inside a booked range
    if (bookings.some(b => b.vehiclePickupDate === form.date && t > b.vehiclePickupTime && t <= b.vehicleReturnTime)) return true;

    // Check if selecting this end time would overlap with an existing booking that starts after our selected start time
    if (bookings.some(b => b.vehiclePickupDate === form.date && b.vehiclePickupTime >= form.startTime && t > b.vehiclePickupTime)) return true;

    // Check if end time is in the past
    if (form.date === today && isTimeSlotInPast(t)) return true;

    return false;
  };

  const validate = () => {
    const errs = {};
    if (!form.date) errs.date = 'Please select a date';
    if (!form.startTime) errs.startTime = 'Please select pickup time';
    if (!form.endTime) errs.endTime = 'Please select return time';
    if (form.startTime && form.endTime && form.startTime >= form.endTime) errs.endTime = 'Return time must be after pickup time';
    if (!form.pickupLocation.trim()) errs.pickupLocation = 'Pickup location is required';
    if (!form.returnLocation.trim()) errs.returnLocation = 'Return location is required';
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
          serviceType: 'vehicle',
          serviceId: id,
          vehiclePickupDate: form.date,
          vehicleReturnDate: form.date,
          vehiclePickupTime: form.startTime,
          vehicleReturnTime: form.endTime,
          pickupLocation: form.pickupLocation,
          returnLocation: form.returnLocation,
          withDriver: form.withDriver,
          purpose: form.purpose,
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
  if (!vehicle || vehicle.message) return <div className="container p-12 text-center">Vehicle not found</div>;

  return (
    <div className={styles.page}>
      <div className="container">
        <Link href="/vehicle-booking" className={styles.backBtn}>← Back to Vehicles</Link>
        <div className={styles.layout}>
          {/* Form */}
          <div>
            <div className={styles.formHeader}>
              <h1 className={styles.formTitle}>Book a Vehicle</h1>
              <div className={styles.hallBadge}>
                <span>{TYPE_ICONS[vehicle.vehicleType] || '🚗'}</span>
                <div>
                  <div className={styles.hallBadgeName}>{vehicle?.name}</div>
                  <div className={styles.hallBadgeCap}>Capacity: {vehicle?.capacity} seats • {vehicle?.location}</div>
                </div>
              </div>
            </div>

            {msg && <div className="alert alert-success">{msg}</div>}
            {error && <div className="alert alert-error">{error}</div>}

            {user ? (
              <form onSubmit={handleSubmit}>
                {/* Date */}
                <div className={styles.section}>
                  <h2 className={styles.sectionTitle}>📅 Date</h2>
                  <input type="date" className={`form-input ${errors.date ? 'error' : ''}`}
                    min={today} value={form.date} onChange={e => handleDateChange(e.target.value)} required />
                  {errors.date && <div className="error-msg">{errors.date}</div>}
                </div>

                {/* Time slots */}
                <div className={styles.section}>
                  <h2 className={styles.sectionTitle}>🕐 Pickup Time</h2>
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
                  <h2 className={styles.sectionTitle}>🕕 Return Time</h2>
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

                {/* Locations */}
                <div className={styles.section}>
                  <h2 className={styles.sectionTitle}>📍 Locations</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <input type="text" className={`form-input ${errors.pickupLocation ? 'error' : ''}`} placeholder="Pickup Location"
                      value={form.pickupLocation} onChange={e => { setForm({...form, pickupLocation: e.target.value}); setErrors(err => ({...err, pickupLocation: ''})); }} required />
                    <input type="text" className={`form-input ${errors.returnLocation ? 'error' : ''}`} placeholder="Return Location"
                      value={form.returnLocation} onChange={e => { setForm({...form, returnLocation: e.target.value}); setErrors(err => ({...err, returnLocation: ''})); }} required />
                  </div>
                  {errors.pickupLocation && <div className="error-msg">{errors.pickupLocation}</div>}
                  {errors.returnLocation && <div className="error-msg">{errors.returnLocation}</div>}
                </div>

                {/* Driver is included by default */}

                <div className={styles.section}>
                  <h2 className={styles.sectionTitle}>📋 Purpose</h2>
                  <textarea className="form-input" rows={3} placeholder="Official work, field visit..."
                    value={form.purpose} onChange={e => setForm({...form, purpose: e.target.value})} style={{ resize: 'vertical' }} />
                </div>

                <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={submitting}>
                  {submitting ? '⏳ Submitting...' : '🚀 Submit Booking Request'}
                </button>
              </form>
            ) : (
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6 text-center mt-8">
                <p className="text-indigo-800 mb-4 font-medium">You need to be logged in to book this vehicle.</p>
                <Link href="/login" className="btn-primary inline-flex">🔑 Login to Book</Link>
              </div>
            )}
          </div>

          {/* Summary sidebar */}
          <div className={styles.summary}>
            <div className={styles.summaryCard}>
              <h3 className={styles.summaryTitle}>📋 Booking Summary</h3>
              <div className={styles.summaryRows}>
                <div className={styles.summaryRow}><span>Vehicle</span><strong>{vehicle?.name || '—'}</strong></div>
                <div className={styles.summaryRow}><span>Type</span><strong>{vehicle?.vehicleType ? vehicle.vehicleType.toUpperCase() : '—'}</strong></div>
                <div className={styles.summaryRow}><span>Date</span><strong>{form.date || '—'}</strong></div>
                <div className={styles.summaryRow}><span>Pickup Time</span><strong>{formatTime12h(form.startTime) || '—'}</strong></div>
                <div className={styles.summaryRow}><span>Return Time</span><strong>{formatTime12h(form.endTime) || '—'}</strong></div>
                <div className={styles.summaryRow}><span>With Driver</span><strong>{form.withDriver ? 'Yes' : 'No'}</strong></div>
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

export default function VehicleDetailPage() {
  return (
    <Suspense fallback={<div className="spinner-wrap"><div className="spinner" /></div>}>
      <VehicleDetailForm />
    </Suspense>
  );
}