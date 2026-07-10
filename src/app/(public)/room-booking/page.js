'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

const ROOM_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'economy', label: 'Economy' },
  { value: 'standard', label: 'Standard' },
  { value: 'deluxe', label: 'Deluxe' },
  { value: 'family', label: 'Family' },
  { value: 'suite', label: 'Suite' },
];

const TYPE_ICONS = {
  economy: '🛏️',
  standard: '🛏️',
  deluxe: '✨',
  family: '👨‍👩‍👧‍👦',
  suite: '👑',
};


const ROOM_TYPE_COLORS = {
  economy: '#6b7280',
  standard: '#3b82f6',
  deluxe: '#8b5cf6',
  family: '#f59e0b',
  suite: '#FFD700',
};

export default function RoomBookingPage() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [occupancyFilter, setOccupancyFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [dateBookings, setDateBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [acFilter, setAcFilter] = useState('all');

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : null)
      .then(user => setCurrentUser(user))
      .catch(() => setCurrentUser(null));
  }, []);

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (cityFilter.trim()) params.set('city', cityFilter.trim());
    if (occupancyFilter) params.set('occupancy', occupancyFilter);
    params.set('hostelType', 'boys');
    if (acFilter === 'ac') params.set('ac', 'true');
    if (acFilter === 'non-ac') params.set('ac', 'false');
    try {
      const res = await fetch(`/api/rooms?${params}`);
      const data = await res.json();
      setRooms(Array.isArray(data) ? data : []);
    } catch {
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }, [search, cityFilter, occupancyFilter, acFilter]);

  useEffect(() => {
    const t = setTimeout(fetchRooms, 350);
    return () => clearTimeout(t);
  }, [fetchRooms]);

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
      const res = await fetch(`/api/bookings?all=true&serviceType=room`);
      const data = await res.json();
      // Filter bookings that overlap with selected date
      const activeBookings = Array.isArray(data) ? data.filter(b => {
        return b.roomCheckInDate <= dateStr && b.roomCheckOutDate >= dateStr;
      }) : [];
      setDateBookings(activeBookings);
    } catch {
      setDateBookings([]);
    } finally {
      setLoadingBookings(false);
    }
  };

  const getRoomStatusDetails = (roomId) => {
    const roomBookings = dateBookings.filter(b => (b.serviceId?._id || b.serviceId) === roomId && b.status !== 'rejected' && b.status !== 'cancelled');
    
    if (roomBookings.length === 0) {
      return { status: 'available', label: 'Available' };
    }

    const hasMultiDay = roomBookings.some(b => b.roomCheckInDate !== b.roomCheckOutDate);
    
    const parseTimeToMinutes = (timeStr) => {
      if (!timeStr) return 0;
      const [h, m] = timeStr.split(':').map(Number);
      return isNaN(h) ? 0 : h * 60 + (m || 0);
    };

    let totalHours = 0;
    if (hasMultiDay) {
      totalHours = 24; // > 2 hours
    } else {
      let totalMinutes = 0;
      roomBookings.forEach(b => {
        const start = parseTimeToMinutes(b.roomCheckInTime || '14:00');
        const end = parseTimeToMinutes(b.roomCheckOutTime || '12:00');
        if (end > start) {
          totalMinutes += (end - start);
        }
      });
      totalHours = totalMinutes / 60;
    }

    let isMorning = true;
    if (roomBookings[0]?.roomCheckInTime) {
      const firstStartHour = parseInt(roomBookings[0].roomCheckInTime.split(':')[0], 10);
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
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: '32px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <span style={{ fontSize: '32px' }}>🏨</span>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#1f2937' }}>Guest Room Booking</h1>
        </div>
        <p style={{ color: '#6b7280' }}>Reserve comfortable rooms for your stay</p>
      </motion.div>

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{ marginBottom: '24px' }}
      >
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
            <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '18px' }}>🔍</span>
            <input
              type="text"
              placeholder="Search rooms by room number..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '14px 14px 14px 48px', borderRadius: '12px',
                border: '1px solid #e5e7eb', fontSize: '15px', background: '#fff',
                outline: 'none'
              }}
              suppressHydrationWarning
            />
          </div>
          <select
            value={acFilter}
            onChange={(e) => setAcFilter(e.target.value)}
            style={{
              padding: '14px 20px', borderRadius: '12px',
              border: '1px solid #e5e7eb', fontSize: '15px', background: '#fff',
              minWidth: '180px', cursor: 'pointer', outline: 'none'
            }}
          >
            <option value="all">All Rooms</option>
            <option value="ac">AC Rooms</option>
            <option value="non-ac">Non-AC Rooms</option>
          </select>
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

      {/* Room Grid */}
      {selectedDate && (
        <motion.div id="availability-section" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h2 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '20px' }}>
            Rooms Available on {new Date(selectedDate).toLocaleDateString()}
          </h2>
          {loadingBookings ? (
            <div className="spinner-wrap"><div className="spinner" /></div>
          ) : rooms.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🏨</div>
              <div className="empty-title">No rooms found</div>
              <div className="empty-sub">Try adjusting your search or filters</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
              {[...rooms]
                .sort((a, b) => {
                  const statusPriority = { 'available': 1, 'partially-booked': 2, 'fully-booked': 3 };
                  const priorityA = statusPriority[getRoomStatusDetails(a._id).status] || 99;
                  const priorityB = statusPriority[getRoomStatusDetails(b._id).status] || 99;
                  return priorityA - priorityB;
                })
                .map((room, idx) => {
                const statusDetails = getRoomStatusDetails(room._id);
                const status = statusDetails.status;
                const statusLabel = statusDetails.label;
                const roomBookings = dateBookings.filter(b => (b.serviceId?._id || b.serviceId) === room._id && b.status !== 'rejected' && b.status !== 'cancelled');
                return (
                <motion.div
                  key={room._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  style={{
                    background: '#fff', borderRadius: '16px', overflow: 'hidden',
                    border: '1px solid #e5e7eb', boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
                  }}
                >
                  {/* Room Image */}
                  <div style={{
                    height: '180px',
                    backgroundImage: "url('/images/rooms.png')",
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '64px',
                    position: 'relative'
                  }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #2563ebcc, rgba(0,0,0,0.3))' }} />
                    <span style={{ position: 'relative', zIndex: 1 }}>🛏️</span>
                  </div>

                  {/* Room Details */}
                  <div style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                      <div>
                        <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px' }}>Room {room.roomNumber}</h3>
                        <p style={{ fontSize: '14px', color: '#6b7280' }}>Floor {room.floor}</p>
                      </div>
                      <span className={`badge`} style={{
                        background: status === 'available' ? '#dcfce7' : status === 'partially-booked' ? '#fef08a' : '#fee2e2',
                        color: status === 'available' ? '#166534' : status === 'partially-booked' ? '#854d0e' : '#991b1b',
                        padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: '600'
                      }}>
                        {statusLabel}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        padding: '4px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '600',
                        background: '#eff6ff',
                        color: '#2563eb',
                        border: '1px solid #bfdbfe'
                      }}>
                        Boys Hostel
                      </span>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        padding: '4px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: '600',
                        background: room.ac ? '#e0f2fe' : '#f1f5f9',
                        color: room.ac ? '#0369a1' : '#475569',
                        border: `1px solid ${room.ac ? '#bae6fd' : '#cbd5e1'}`
                      }}>
                        {room.ac ? '❄️ AC' : '💨 Non-AC'}
                      </span>
                      <span style={{ fontSize: '13px', color: '#6b7280' }}>👥 {room.occupancy} guests max</span>
                    </div>

                    {room.amenities?.length > 0 && (
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
                        {room.amenities.slice(0, 4).map(a => (
                          <span key={a} className="chip" style={{ fontSize: '11px' }}>{a}</span>
                        ))}
                        {room.amenities.length > 4 && (
                          <span className="chip" style={{ fontSize: '11px' }}>+{room.amenities.length - 4}</span>
                        )}
                      </div>
                    )}

                    {/* Booking Details Section */}
                    {roomBookings.length > 0 && (
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
                          {roomBookings.map((b) => {
                            const parseTimeToMinutes = (timeStr) => {
                              if (!timeStr) return 0;
                              const [h, m] = timeStr.split(':').map(Number);
                              return isNaN(h) ? 0 : h * 60 + (m || 0);
                            };
                            const start = parseTimeToMinutes(b.roomCheckInTime || '14:00');
                            const end = parseTimeToMinutes(b.roomCheckOutTime || '12:00');
                            const isPartial = b.roomCheckInDate === b.roomCheckOutDate && (end - start) / 60 <= 4;
                            return (
                            <div key={b._id} style={{
                              background: '#ffffff',
                              borderRadius: '8px',
                              padding: '8px 12px',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                              borderLeft: '4px solid #ef4444',
                              fontSize: '13px'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  👤 {b.user?.name || b.guestName || 'User'}{(b.user?.department || b.department) ? ` (${b.user?.department || b.department})` : ''}
                                </span>
                              </div>
                              <div style={{ fontSize: '12px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <div>🛫 <strong>Check-In:</strong> {b.roomCheckInDate} {b.roomCheckInTime ? `at ${b.roomCheckInTime}` : ''}</div>
                                <div>🛬 <strong>Check-Out:</strong> {b.roomCheckOutDate} {b.roomCheckOutTime ? `at ${b.roomCheckOutTime}` : ''}</div>
                              </div>
                            </div>
                          );
                          })}
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ width: '100%' }}>
                        {status === 'fully-booked' ? (
                          <button disabled style={{ width: '100%', padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#e5e7eb', color: '#9ca3af', fontWeight: '500', cursor: 'not-allowed' }}>
                            Booked
                          </button>
                        ) : (
                          <Link
                            href={currentUser ? `/room-booking/${room._id}?date=${selectedDate}` : '/login'}
                            className="btn-primary btn-sm"
                            style={{ textDecoration: 'none', width: '100%', display: 'block', textAlign: 'center' }}
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
        <Link href="/" className="btn-secondary">← Back to Home</Link>
      </div>
    </div>
  );
}