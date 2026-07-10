'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

const VEHICLE_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'car', label: 'Cars' },
];

const FUEL_TYPES = {
  petrol: '⛽ Petrol',
  diesel: '⛽ Diesel',
  electric: '🔋 Electric',
  hybrid: '🔌 Hybrid',
};

const TYPE_ICONS = {
  car: '🚗',
};


export default function VehicleBookingPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
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

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (typeFilter) params.set('vehicleType', typeFilter);
    if (cityFilter.trim()) params.set('city', cityFilter.trim());
    try {
      const res = await fetch(`/api/vehicles?${params}`);
      const data = await res.json();
      setVehicles(Array.isArray(data) ? data : []);
    } catch {
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, cityFilter]);

  useEffect(() => {
    const t = setTimeout(fetchVehicles, 350);
    return () => clearTimeout(t);
  }, [fetchVehicles]);

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
      const res = await fetch(`/api/bookings?all=true&serviceType=vehicle`);
      const data = await res.json();
      // Filter bookings that overlap with selected date
      const activeBookings = Array.isArray(data) ? data.filter(b => {
        return b.vehiclePickupDate <= dateStr && b.vehicleReturnDate >= dateStr;
      }) : [];
      setDateBookings(activeBookings);
    } catch {
      setDateBookings([]);
    } finally {
      setLoadingBookings(false);
    }
  };

  const getVehicleStatusDetails = (vehicleId) => {
    const vehicleBookings = dateBookings.filter(b => (b.serviceId?._id || b.serviceId) === vehicleId && b.status !== 'rejected' && b.status !== 'cancelled');
    
    if (vehicleBookings.length === 0) {
      return { status: 'available', label: 'Available' };
    }

    const hasMultiDay = vehicleBookings.some(b => b.vehiclePickupDate !== b.vehicleReturnDate);
    
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
      vehicleBookings.forEach(b => {
        const start = parseTimeToMinutes(b.vehiclePickupTime || '08:00');
        const end = parseTimeToMinutes(b.vehicleReturnTime || '18:00');
        if (end > start) {
          totalMinutes += (end - start);
        }
      });
      totalHours = totalMinutes / 60;
    }

    let isMorning = true;
    if (vehicleBookings[0]?.vehiclePickupTime) {
      const firstStartHour = parseInt(vehicleBookings[0].vehiclePickupTime.split(':')[0], 10);
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
          <span style={{ fontSize: '32px' }}>🚗</span>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#1f2937' }}>Vehicle Booking</h1>
        </div>
        <p style={{ color: '#6b7280' }}>Rent cars for your journey</p>
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
            placeholder="Search vehicles by name, model..."
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

      {/* Vehicle Grid */}
      {selectedDate && (
        <motion.div id="availability-section" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h2 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '20px' }}>
            Vehicles Available on {new Date(selectedDate).toLocaleDateString()}
          </h2>
          {loadingBookings ? (
            <div className="spinner-wrap"><div className="spinner" /></div>
          ) : vehicles.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🚗</div>
              <div className="empty-title">No vehicles found</div>
              <div className="empty-sub">Try adjusting your search or filters</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
              {[...vehicles]
                .sort((a, b) => {
                  const statusPriority = { 'available': 1, 'partially-booked': 2, 'fully-booked': 3 };
                  const priorityA = statusPriority[getVehicleStatusDetails(a._id).status] || 99;
                  const priorityB = statusPriority[getVehicleStatusDetails(b._id).status] || 99;
                  return priorityA - priorityB;
                })
                .map((vehicle, idx) => {
                const statusDetails = getVehicleStatusDetails(vehicle._id);
                const status = statusDetails.status;
                const statusLabel = statusDetails.label;
                const vehicleBookings = dateBookings.filter(b => (b.serviceId?._id || b.serviceId) === vehicle._id && b.status !== 'rejected' && b.status !== 'cancelled');
                return (
                <motion.div
                  key={vehicle._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  style={{
                    background: '#fff', borderRadius: '16px', overflow: 'hidden',
                    border: '1px solid #e5e7eb', boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
                  }}
                >
                  {/* Vehicle Image */}
                  <div style={{
                    height: '180px', 
                    backgroundImage: "url('/images/vehicles.png')",
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '64px',
                    position: 'relative'
                  }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(8,145,178,0.7) 0%, rgba(5,150,105,0.7) 100%)' }} />
                    <span style={{ position: 'relative', zIndex: 1 }}>{TYPE_ICONS[vehicle.vehicleType] || '🚗'}</span>
                  </div>

                  {/* Vehicle Details */}
                  <div style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                      <div>
                        <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px' }}>{vehicle.name}</h3>
                        {vehicle.driverMobile && (
                          <p style={{ fontSize: '14px', color: '#6b7280' }}>📞 Driver: {vehicle.driverMobile}</p>
                        )}
                      </div>
                      <span className={`badge`} style={{
                        background: status === 'available' ? '#dcfce7' : status === 'partially-booked' ? '#fef08a' : '#fee2e2',
                        color: status === 'available' ? '#166534' : status === 'partially-booked' ? '#854d0e' : '#991b1b',
                        padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: '600'
                      }}>
                        {statusLabel}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', fontSize: '13px', color: '#6b7280' }}>
                      <span>👥 {vehicle.capacity} seats</span>
                    </div>

                    {/* Booking Details Section */}
                    {vehicleBookings.length > 0 && (
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
                          {vehicleBookings.map((b) => {
                            const parseTimeToMinutes = (timeStr) => {
                              if (!timeStr) return 0;
                              const [h, m] = timeStr.split(':').map(Number);
                              return isNaN(h) ? 0 : h * 60 + (m || 0);
                            };
                            const start = parseTimeToMinutes(b.vehiclePickupTime || '08:00');
                            const end = parseTimeToMinutes(b.vehicleReturnTime || '18:00');
                            const isPartial = b.vehiclePickupDate === b.vehicleReturnDate && (end - start) / 60 <= 4;
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
                                <div>🛫 <strong>From:</strong> {b.vehiclePickupDate} {b.vehiclePickupTime ? `at ${b.vehiclePickupTime}` : ''}</div>
                                <div>🛬 <strong>To:</strong> {b.vehicleReturnDate} {b.vehicleReturnTime ? `at ${b.vehicleReturnTime}` : ''}</div>
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
                            href={currentUser ? `/vehicle-booking/${vehicle._id}?date=${selectedDate}` : '/login'}
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