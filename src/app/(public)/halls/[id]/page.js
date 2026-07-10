'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import styles from './hall.module.css';
import SmartCalendar from '@/components/SmartCalendar';

export default function HallDetailPage() {
  const { id } = useParams();
  const [hall, setHall] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute to check in-progress bookings
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Check if booking is currently in progress
  const isBookingInProgress = (booking) => {
    const today = new Date().toISOString().split('T')[0];
    if (booking.date !== today) return false;

    const now = new Date();
    const [startH, startM] = booking.startTime.split(':').map(Number);
    const [endH, endM] = booking.endTime.split(':').map(Number);
    
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  };

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [hallRes, bookingsRes, authRes] = await Promise.all([
          fetch(`/api/halls?id=${id}`),
          fetch(`/api/bookings/hall/${id}?includePending=true`),
          fetch('/api/auth/me')
        ]);
        setHall(await hallRes.json());
        const bookingsData = await bookingsRes.json();
        if (authRes.ok) {
          const userData = await authRes.json();
          setUser(userData);
        }
        // Sort by date and time using new field names
        const sorted = (Array.isArray(bookingsData) ? bookingsData : []).sort((a, b) => {
          if (a.hallDate !== b.hallDate) return (a.hallDate || '').localeCompare(b.hallDate || '');
          return (a.hallStartTime || '').localeCompare(b.hallStartTime || '');
        });
        setBookings(sorted);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    };
    fetchAll();
  }, [id]);

  if (loading) return <div className="spinner-wrap"><div className="spinner" /></div>;
  if (!hall || hall.message) return <div className="container" style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--danger)' }}>Hall not found.</div>;

  return (
    <div className={styles.page}>
      {/* Banner */}
      <div className={styles.banner}>
        <div className="container">
          <Link href="/" className={styles.backBtn}>← Back to Halls</Link>
          <div className={styles.bannerContent}>
            <div className={styles.bannerIcon}>🏛️</div>
            <div className={styles.bannerText}>
              <h1 className={styles.hallName}>{hall.name}</h1>
              <p className={styles.hallLocation}>📍 {hall.location}</p>
            </div>
            <div className={styles.bannerStats}>
              <div className={styles.statBox}>
                <span className={styles.statNum}>{hall.capacity}</span>
                <span className={styles.statLbl}>Capacity</span>
              </div>
              <div className={styles.statDivider} />
              <div className={styles.statBox}>
                <span className={styles.statNum}>{bookings.length}</span>
                <span className={styles.statLbl}>Bookings</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container">
        <div className={styles.content}>
          {/* Left */}
          <div>
            {hall.description && (
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>About This Hall</h2>
                <p className={styles.description}>{hall.description}</p>
              </div>
            )}

            {/* Booking Schedule */}
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>📅 Smart Availability Calendar</h2>
              <div style={{ marginTop: '20px' }}>
                <SmartCalendar
                  bookings={bookings}
                  serviceType="hall"
                  serviceId={hall._id}
                  showAnalytics={true}
                  onDateSelect={(dateStr) => {
                    window.location.href = `/book/${hall._id}?date=${dateStr}`;
                  }}
                  onSlotSelect={(slot, dateStr) => {
                    window.location.href = `/book/${hall._id}?date=${dateStr}&startTime=${slot.start}&endTime=${slot.end}`;
                  }}
                />
              </div>
            </div>
          </div>

          {/* Right sticky sidebar */}
          <div className={styles.sidebar}>
            <div className={styles.bookCard}>
              <div className={styles.bookCardTop}>
                <span className={styles.bookIcon}>📅</span>
                <div>
                  <div className={styles.bookTitle}>Book This Hall</div>
                  <div className={styles.bookSub}>Submit a booking request</div>
                </div>
              </div>
              <div className={styles.bookDetails}>
                <div className={styles.bookDetail}><span>🏛️</span> {hall.name}</div>
                <div className={styles.bookDetail}><span>📍</span> {hall.location}</div>
                <div className={styles.bookDetail}><span>👥</span> Up to {hall.capacity} people</div>
              </div>
              {user ? (
                <Link href={`/book/${hall._id}`} className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                  📅 Book Now
                </Link>
              ) : (
                <Link href="/login" className="btn-secondary" style={{ width: '100%', justifyContent: 'center', borderColor: 'var(--primary)', color: 'var(--primary)' }}>
                  🔑 Login to Book
                </Link>
              )}
              <p className={styles.bookNote}>Your request will be reviewed by admin</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
