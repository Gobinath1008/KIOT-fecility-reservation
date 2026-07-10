'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import styles from './home.module.css';

const PORTALS = [
  {
    id: 'halls',
    title: 'Hall Booking Portal',
    description: 'Reserve seminar, conference and event halls for campus activities.',
    icon: '🏛️',
    link: '/halls',
    accent: '#7c3aed',
    image: '/images/halls.png',
    seats: 50,
  },
  {
    id: 'vehicles',
    title: 'Vehicle Booking Portal',
    description: 'Book campus cars for official transport.',
    icon: '🚗',
    link: '/vehicle-booking',
    accent: '#0ea5e9',
    image: '/images/vehicles.png',
    seats: 12,
  },
  {
    id: 'rooms',
    title: 'Room Booking Portal',
    description: 'Request hostel rooms and guest accommodations with ease.',
    icon: '🛏️',
    link: '/room-booking',
    accent: '#ef4444',
    image: '/images/rooms.png',
    seats: 2,
  },
];

export default function HomePage() {
  const router = useRouter();
  const [stats, setStats] = useState({ halls: 0, vehicles: 0, rooms: 0, pending: 0 });
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/halls').catch(() => ({ json: () => [] })),
      fetch('/api/vehicles').catch(() => ({ json: () => [] })),
      fetch('/api/rooms').catch(() => ({ json: () => [] })),
      fetch('/api/bookings').catch(() => ({ json: () => [] })),
      fetch('/api/auth/me').then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ])
      .then((responses) => Promise.all(responses.map((r) => (r && typeof r.json === 'function' ? r.json() : r))))
      .then(([halls, vehicles, rooms, bookings, me]) => {
        setStats({
          halls: Array.isArray(halls) ? halls.length : 0,
          vehicles: Array.isArray(vehicles) ? vehicles.length : 0,
          rooms: Array.isArray(rooms) ? rooms.length : 0,
          pending: Array.isArray(bookings) ? bookings.filter((x) => x.status === 'pending').length : 0,
        });
        setCurrentUser(me);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-slate-550 text-sm font-semibold tracking-wide">Loading workspace...</p>
      </div>
    );
  }

  const greetingName = currentUser?.name?.split(' ')[0] || 'User';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.4 }}
      className="flex flex-col gap-8 w-full"
    >
      <div className={styles.heroCard}>
        <div className={styles.heroTop}>
          <div>
            <h1 className={styles.heroTitle}>Welcome, {greetingName}</h1>
          </div>
        </div>
      </div>

      <div className={styles.cardsGrid}>
        {PORTALS.map((portal, index) => (
          <motion.article
            key={portal.id}
            className={styles.portalCard}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 + index * 0.08, duration: 0.45 }}
          >
              <div className={styles.portalMedia}>
                <img src={portal.image} alt={portal.title} className={styles.portalImage} />
                <div className={styles.portalBadge}><span>👥</span> {portal.seats} seats</div>
              </div>
              <div className={styles.portalBody}>
                <div className={styles.portalTag}>{portal.icon} {portal.title}</div>
                <h2 className={styles.portalTitle}>{portal.title}</h2>
                <p className={styles.portalDesc}>{portal.description}</p>
                <div className={styles.portalFooter}>
                  <Link href={portal.link} className={styles.bookNow}>
                    Book Now →
                  </Link>
                </div>
              </div>
          </motion.article>
        ))}
      </div>
    </motion.div>
  );
}
