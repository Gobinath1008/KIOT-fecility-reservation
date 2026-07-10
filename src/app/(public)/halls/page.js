'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

const HALL_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'seminar', label: 'Seminar Halls' },
  { value: 'conference', label: 'Conference Halls' },
  { value: 'event', label: 'Event Halls' },
  { value: 'marriage', label: 'Marriage Halls' },
];

export default function HallBookingPage() {
  const [halls, setHalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [dateBookings, setDateBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : null)
      .then(user => setCurrentUser(user))
      .catch(() => setCurrentUser(null));
  }, []);

  const fetchHalls = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (typeFilter) params.set('hallType', typeFilter);
    try {
      const res = await fetch(`/api/halls?${params}`);
      const data = await res.json();
      setHalls(Array.isArray(data) ? data : []);
    } catch {
      setHalls([]);
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter]);

  useEffect(() => {
    const t = setTimeout(fetchHalls, 350);
    return () => clearTimeout(t);
  }, [fetchHalls]);

  useEffect(() => {
    if (selectedDate) {
      const element = document.getElementById('availability-section');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [selectedDate]);

  const handleDateClick = async (info) => {
    const dateStr = info.dateStr;
    const today = new Date().toISOString().split('T')[0];
    if (dateStr < today) return; // Disallow past dates
    setSelectedDate(dateStr);
    setLoadingBookings(true);
    try {
      const res = await fetch(`/api/bookings?all=true&serviceType=hall&hallDate=${dateStr}`);
      const data = await res.json();
      setDateBookings(Array.isArray(data) ? data : []);
    } catch {
      setDateBookings([]);
    } finally {
      setLoadingBookings(false);
    }
  };

  const getHallStatusDetails = (hallId) => {
    const hallBookings = dateBookings.filter(b => (b.serviceId?._id || b.serviceId) === hallId && b.status !== 'rejected' && b.status !== 'cancelled');
    
    if (hallBookings.length === 0) {
      return { status: 'available', label: 'Available' };
    }

    const parseTimeToMinutes = (timeStr) => {
      if (!timeStr) return 0;
      const [h, m] = timeStr.split(':').map(Number);
      return isNaN(h) ? 0 : h * 60 + (m || 0);
    };

    let totalMinutes = 0;
    hallBookings.forEach(b => {
      const start = parseTimeToMinutes(b.hallStartTime);
      const end = parseTimeToMinutes(b.hallEndTime);
      if (end > start) {
        totalMinutes += (end - start);
      }
    });

    const totalHours = totalMinutes / 60;
    
    let isMorning = true;
    if (hallBookings[0]?.hallStartTime) {
      const firstStartHour = parseInt(hallBookings[0].hallStartTime.split(':')[0], 10);
      if (firstStartHour >= 12) {
        isMorning = false;
      }
    }

    if (totalHours <= 2) {
      return {
        status: 'partially-booked',
        label: `Partially Booked (${isMorning ? 'Morning' : 'Evening'})`
      };
    } else if (totalHours <= 4) {
      return {
        status: 'partially-booked',
        label: `Partially Booked (${isMorning ? 'Morning to Afternoon' : 'Afternoon to Evening'})`
      };
    } else {
      return {
        status: 'fully-booked',
        label: 'Booked (Morning to Evening)'
      };
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: '32px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <span style={{ fontSize: '32px' }}>🏛️</span>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#1f2937' }}>Hall Booking</h1>
        </div>
        <p style={{ color: '#6b7280' }}>Book seminar halls, auditoriums & conference spaces for your events</p>
      </motion.div>

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{ marginBottom: '24px' }}
      >
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '18px' }}>🔍</span>
          <input
            type="text"
            placeholder="Search halls by name, location, facilities..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '14px 14px 14px 48px', borderRadius: '12px',
              border: '1px solid #e5e7eb', fontSize: '15px', background: '#fff'
            }}
            suppressHydrationWarning
          />
        </div>
      </motion.div>

      {/* Calendar Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{ marginBottom: '32px', background: '#fff', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
      >
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>Select a Date to Check Availability</h2>
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: ''
          }}
          dateClick={handleDateClick}
          validRange={{ start: new Date().toISOString().split('T')[0] }}
          height="auto"
        />
        <style jsx global>{`
          .fc-daygrid-day { cursor: pointer; transition: background-color 0.2s; }
          .fc-daygrid-day:hover { background-color: #f3f4f6; }
          .fc-day-today { background-color: #e0e7ff !important; }
          .fc .fc-button-primary { background-color: #6C63FF; border-color: #6C63FF; }
          .fc .fc-button-primary:hover { background-color: #5b54d6; border-color: #5b54d6; }
        `}</style>
      </motion.div>

      {/* Hall Grid */}
      {selectedDate && (
        <motion.div id="availability-section" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h2 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '20px' }}>
            Halls Available on {new Date(selectedDate).toLocaleDateString()}
          </h2>
          {loadingBookings ? (
            <div className="spinner-wrap"><div className="spinner" /></div>
          ) : halls.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🏛️</div>
              <div className="empty-title">No halls found</div>
              <div className="empty-sub">Try adjusting your search or filters</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
              {[...halls]
                .sort((a, b) => {
                  const statusPriority = { 'available': 1, 'partially-booked': 2, 'fully-booked': 3 };
                  const priorityA = statusPriority[getHallStatusDetails(a._id).status] || 99;
                  const priorityB = statusPriority[getHallStatusDetails(b._id).status] || 99;
                  return priorityA - priorityB;
                })
                .map((hall, idx) => {
                const statusDetails = getHallStatusDetails(hall._id);
                const status = statusDetails.status;
                const statusLabel = statusDetails.label;
                const hallBookings = dateBookings.filter(b => (b.serviceId?._id || b.serviceId) === hall._id && b.status !== 'rejected' && b.status !== 'cancelled');
                return (
                <motion.div
                  key={hall._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  style={{
                    background: '#fff', borderRadius: '16px', overflow: 'hidden',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
                  }}
                >
                  {/* Hall Image */}
                  <div style={{
                    height: '180px', 
                    backgroundImage: "url('/images/halls.png')",
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '64px',
                    position: 'relative'
                  }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.1) 100%)' }} />
                    <span style={{ position: 'relative', zIndex: 1 }}>🏛️</span>
                    <div style={{ position: 'absolute', bottom: '12px', right: '12px', background: 'rgba(0,0,0,0.75)', color: '#fff', padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', zIndex: 1, backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.15)' }}>
                      👥 {hall.capacity} seats
                    </div>
                  </div>

                  {/* Hall Details */}
                  <div style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                      <div>
                        <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px' }}>{hall.name}</h3>
                        <p style={{ fontSize: '14px', color: '#6b7280' }}>📍 {hall.location}</p>
                      </div>
                      <span className={`badge`} style={{
                        background: status === 'available' ? '#dcfce7' : status === 'partially-booked' ? '#fef08a' : '#fee2e2',
                        color: status === 'available' ? '#166534' : status === 'partially-booked' ? '#854d0e' : '#991b1b',
                        padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: '600'
                      }}>
                        {statusLabel}
                      </span>
                    </div>

                    <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '12px', lineHeight: '1.5' }}>
                      {hall.description || 'Professional hall space for events and meetings'}
                    </p>

                    {/* Booking Details Section */}
                    {hallBookings.length > 0 && (
                      <div style={{
                        marginTop: '16px',
                        marginBottom: '16px',
                        padding: '12px',
                        borderRadius: '12px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                      }}>
                        <div style={{
                          fontSize: '13px',
                          fontWeight: '700',
                          color: '#475569',
                          marginBottom: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <span>🗓️</span> Active Bookings
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {hallBookings.map((b) => {
                            const parseTimeToMinutes = (timeStr) => {
                              if (!timeStr) return 0;
                              const [h, m] = timeStr.split(':').map(Number);
                              return isNaN(h) ? 0 : h * 60 + (m || 0);
                            };
                            const start = parseTimeToMinutes(b.hallStartTime);
                            const end = parseTimeToMinutes(b.hallEndTime);
                            const isPartial = (end - start) / 60 <= 4;
                            return (
                            <div key={b._id} style={{
                              background: '#ffffff',
                              borderRadius: '8px',
                              padding: '8px 12px',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                              borderLeft: '4px solid #ef4444',
                              fontSize: '13px'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600', color: '#1e293b', marginBottom: '2px' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  👤 {b.user?.name || b.guestName || 'User'}{(b.user?.department || b.department) ? ` (${b.user?.department || b.department})` : ''}
                                </span>
                                <span style={{ color: '#ef4444', fontSize: '12px', fontWeight: '700' }}>
                                  ⏰ {b.hallStartTime} - {b.hallEndTime}
                                </span>
                              </div>
                              <div style={{ fontSize: '12px', color: '#64748b' }}>
                                💼 Purpose: {b.purpose || 'Not specified'}
                              </div>
                            </div>
                          );
                          })}
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
                      <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                        {status === 'fully-booked' ? (
                          <button disabled style={{ width: '100%', padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#e5e7eb', color: '#9ca3af', fontWeight: '500', cursor: 'not-allowed' }}>
                            Fully Booked
                          </button>
                        ) : (
                          <Link
                            href={currentUser ? `/book/${hall._id}?date=${selectedDate}` : '/login'}
                            style={{
                              width: '100%', textAlign: 'center',
                              padding: '10px 16px', borderRadius: '8px', border: 'none',
                              background: '#6C63FF', color: '#fff', fontWeight: '500', textDecoration: 'none'
                            }}
                          >
                            {currentUser ? 'Book Now →' : 'Login to Book →'}
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      )}

      {/* Back to Home */}
      <div style={{ marginTop: '40px', textAlign: 'center' }}>
        <Link href="/" style={{ color: '#6C63FF', textDecoration: 'none', fontWeight: '500' }}>← Back to Home</Link>
      </div>
    </div>
  );
}