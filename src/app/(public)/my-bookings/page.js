'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import homeStyles from '@/app/(public)/home.module.css';
import styles from './mybookings.module.css';
import { openBookingPrintWindow } from '../../../lib/bookingPrint';

const TABS = ['all', 'pending', 'approved', 'rejected', 'cancelled'];
const STATUS_COLORS = { pending: 'badge-pending', approved: 'badge-approved', rejected: 'badge-rejected', cancelled: 'badge-cancelled', completed: 'badge-completed', live: 'badge-live', finished: 'badge-finished' };
const STATUS_ICONS = { pending: '⏳', approved: '✅', rejected: '❌', cancelled: '🚫', completed: '✔️', live: '🟢', finished: '🏁' };
const SERVICE_ICONS = { hall: '🏛️', vehicle: '🚗', room: '🏨' };
const SERVICE_NAMES = { hall: 'Hall Booking', vehicle: 'Vehicle Booking', room: 'Room Booking' };
const SERVICE_FILTERS = ['all', 'hall', 'vehicle', 'room'];

const getRealTimeStatus = (booking) => {
  if (booking.status !== 'approved') return booking.status;

  const now = new Date();

  if (booking.serviceType === 'hall') {
    const start = new Date(`${booking.hallDate}T${booking.hallStartTime}:00`);
    const end = new Date(`${booking.hallDate}T${booking.hallEndTime}:00`);
    if (now >= start && now <= end) return 'live';
    if (now > end) return 'finished';
  } else if (booking.serviceType === 'vehicle') {
    const start = new Date(`${booking.vehiclePickupDate}T${booking.vehiclePickupTime || '09:00'}:00`);
    const end = new Date(`${booking.vehicleReturnDate}T${booking.vehicleReturnTime || '09:00'}:00`);
    if (now >= start && now <= end) return 'live';
    if (now > end) return 'finished';
  } else if (booking.serviceType === 'room') {
    const start = new Date(`${booking.roomCheckInDate}T${booking.roomCheckInTime || '14:00'}:00`);
    const end = new Date(`${booking.roomCheckOutDate}T${booking.roomCheckOutTime || '12:00'}:00`);
    if (now >= start && now <= end) return 'live';
    if (now > end) return 'finished';
  }

  return 'approved';
};

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [activeService, setActiveService] = useState('all');
  const [cancelling, setCancelling] = useState(null);
  const [confirmModal, setConfirmModal] = useState(false);
  const [selectedForCancel, setSelectedForCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState('');



  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bookings?my=true');
      if (!res.ok) {
        throw new Error('Failed to fetch bookings');
      }
      const data = await res.json();
      setBookings(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(error.message || 'Unable to fetch bookings');
    } finally {
      setLoading(false);
    }
  }, []);

  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : null)
      .then(me => {
        if (me && ['principal', 'ao', 'transport_manager', 'hostel_warden'].includes(me.role)) {
          router.push('/admin');
        }
      })
      .catch(err => console.error(err));
  }, [router]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleCancel = async (id) => {
    setSelectedForCancel(id);
    setCancelReason('');
    setConfirmModal(true);
  };

  const confirmCancel = async () => {
    const id = selectedForCancel;
    setCancelling(id);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason })
      });
      if (res.ok) {
        setConfirmModal(false);
        setSelectedForCancel(null);
        toast.success('Booking cancelled successfully');
        fetchBookings();
      } else {
        const d = await res.json();
        toast.error(d.message || 'Failed to cancel booking');
        setConfirmModal(false);
        setSelectedForCancel(null);
      }
    } catch (error) {
      toast.error('An error occurred');
      setConfirmModal(false);
      setSelectedForCancel(null);
    } finally {
      setCancelling(null);
    }
  };

const formatTime12h = (timeStr) => {
  if (!timeStr) return '';
  const [hourStr, minStr] = timeStr.split(':');
  const hour = parseInt(hourStr);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${String(hour12).padStart(2, '0')}:${minStr} ${ampm}`;
};

const formatDateTime = (value) => {
  if (!value) return '';
  try { return new Date(value).toLocaleString(); } catch (e) { return String(value); }
};

  const getBookingDetails = (booking) => {
    switch (booking.serviceType) {
      case 'hall':
        return {
          date: booking.hallDate,
          time: `${formatTime12h(booking.hallStartTime)} - ${formatTime12h(booking.hallEndTime)}`,
          location: booking.purpose || 'No purpose specified',
          description: `${booking.attendees} attendees`
        };
      case 'vehicle': {
        const location = booking.purpose || 'No purpose specified';
        const driverText = booking.withDriver ? 'With Driver' : 'Self-drive';
        const routeInfo = booking.pickupLocation && booking.returnLocation
          ? ` (${booking.pickupLocation} → ${booking.returnLocation})`
          : '';

        return {
          date: `${booking.vehiclePickupDate} to ${booking.vehicleReturnDate}`,
          time: `${formatTime12h(booking.vehiclePickupTime || '09:00')} - ${formatTime12h(booking.vehicleReturnTime || '09:00')}`,
          location,
          description: `${driverText}${routeInfo}${booking.serviceId?.driverMobile ? ` | 📞 Driver Contact: ${booking.serviceId.driverMobile}` : ''}`
        };
      }
      case 'room':
        return {
          date: `Check-in: ${booking.roomCheckInDate} | Check-out: ${booking.roomCheckOutDate}`,
          time: `${formatTime12h(booking.roomCheckInTime || '14:00')} to ${formatTime12h(booking.roomCheckOutTime || '12:00')}`,
          location: booking.roomPurpose || booking.specialRequests || 'No purpose specified',
          description: `${booking.numberOfGuests} guests • ${booking.numberOfRooms} room${booking.numberOfRooms > 1 ? 's' : ''}`
        };
      default:
        return { date: 'N/A', time: 'N/A', location: 'N/A', description: 'N/A' };
    }
  };

  const isPending = (status) => ['pending', 'pending_hod', 'pending_principal', 'pending_ao', 'pending_transport', 'pending_warden'].includes(status);

  const filtered = (activeTab === 'all' ? bookings : 
                    activeTab === 'pending' ? bookings.filter(b => isPending(b.status)) :
                    bookings.filter(b => b.status === activeTab))
    .filter(b => activeService === 'all' || b.serviceType === activeService);

  const counts = {
    all: bookings.length,
    pending: bookings.filter(b => isPending(b.status)).length,
    approved: bookings.filter(b => b.status === 'approved').length,
    rejected: bookings.filter(b => b.status === 'rejected').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length
  };

  const serviceCounts = {
    all: bookings.length,
    hall: bookings.filter(b => b.serviceType === 'hall').length,
    vehicle: bookings.filter(b => b.serviceType === 'vehicle').length,
    room: bookings.filter(b => b.serviceType === 'room').length
  };

  const handlePrint = async () => {
    await openBookingPrintWindow(filtered, {
      title: 'Booking Report',
      subtitle: 'My Bookings'
    });
  };

  return (
    <div className={styles.page}>
            <div className="container">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div className="page-header">
                  <h1 className="page-title">My Bookings</h1>
                  <p className="page-subtitle">{bookings.length} total bookings across all services</p>
                </div>
                <button onClick={handlePrint} className="btn-secondary" style={{ whiteSpace: 'nowrap' }}>
                  🖨️ Print Report
                </button>
              </div>

              <div className="tabs">
                {TABS.map(tab => (
                  <button key={tab} className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab)}>
                    {tab === 'all' ? 'All' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                    {counts[tab] > 0 && <span className={styles.tabCount}>{counts[tab]}</span>}
                  </button>
                ))}
              </div>

              <div className="tabs" style={{ marginTop: 18, marginBottom: 24 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginRight: 12, alignSelf: 'center' }}>
                  Filter by service:
                </span>
                {SERVICE_FILTERS.map(service => (
                  <button key={service} className={`tab-btn ${activeService === service ? 'active' : ''}`}
                    onClick={() => setActiveService(service)}
                    style={{ marginRight: 8 }}>
                    {service === 'all' ? 'All Services' : service === 'hall' ? 'Hall' : service === 'vehicle' ? 'Vehicle' : 'Room'}
                    {serviceCounts[service] > 0 && <span className={styles.tabCount}>{serviceCounts[service]}</span>}
                  </button>
                ))}
              </div>

              {loading ? (
                <div className="spinner-wrap"><div className="spinner" /></div>
              ) : filtered.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📄</div>
                  <div className="empty-title">
                    No {activeService === 'all' ? '' : activeService} {activeTab === 'all' ? '' : activeTab} bookings
                  </div>
                  <div className="empty-sub">
                    {(activeTab === 'all' && activeService === 'all')
                      ? "You haven't made any bookings yet."
                      : 'Try adjusting your filters or check other service types.'}
                  </div>
                </div>
              ) : (
                <div className={styles.bookingList}>
                  {filtered.map((b, idx) => {
                    const details = getBookingDetails(b);
                    const rtStatus = getRealTimeStatus(b);
                    return (
                      <motion.div
                        key={b._id}
                        className={styles.bookingCard}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                      >
                        <div className={styles.bookingLeft}>
                          <div className={styles.statusIcon}>{STATUS_ICONS[rtStatus]}</div>
                          <div className={styles.bookingInfo}>
                            <div className={styles.bookingHall}>
                              {b.serviceType === 'vehicle' ?
                                `🚗 ${b.serviceId?.name || 'Vehicle'} (${b.serviceId?.registrationNumber || 'N/A'})` :
                               b.serviceType === 'room' ?
                                `🏨 Room ${b.serviceId?.roomNumber || 'N/A'}` :
                               `🏛️ ${b.serviceId?.name || 'Event Hall'}`}
                            </div>
                            <div className={styles.bookingMeta}>
                              📅 {details.date}
                            </div>
                            <div className={styles.bookingMeta}>
                              {details.time}
                            </div>
                            <div className={styles.bookingPurpose} style={{ fontWeight: 500, color: '#374151', marginTop: '4px' }}>
                              {details.location}
                            </div>
                            <div className={styles.bookingPurpose}>{details.description}</div>
                            {b.serviceType === 'vehicle' && b.status === 'approved' && b.driverName && (
                              <div style={{ marginTop: 8, padding: '8px 12px', fontSize: '0.85rem', background: '#eff6ff', borderLeft: '3px solid #3b82f6', borderRadius: 4, color: '#1e3a8a' }}>
                                👨‍✈️ Driver: <strong>{b.driverName}</strong> ({b.driverPhone}) | Vehicle: <strong>{b.assignedVehicleNumber}</strong>
                              </div>
                            )}
                            <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '6px' }}>
                              👤 <strong>{b.guestName || b.user?.name || 'Unknown'}{(b.user?.department || b.department) ? ` (${b.user?.department || b.department})` : ''}</strong>
                              {(b.guestPhone || b.user?.phone) ? ` • 📞 ${b.guestPhone || b.user?.phone}` : ''}
                            </div>
                            {b.adminNote && (
                              <div className={styles.adminNote}>💬 Admin: {b.adminNote}</div>
                            )}
                            {b.actionBy && b.status !== 'pending' && (
                              <div className={styles.adminNote}>⚙️ {b.status === 'approved' ? 'Approved' : b.status === 'rejected' ? 'Rejected' : 'Reviewed'} at {formatDateTime(b.actionAt)}</div>
                            )}
                            {b.cancellationReason && (
                              <div className={styles.cancellationNote}>
                                🚫 {b.cancelledBy === 'admin' ? 'Admin ' : 'User '}cancelled: {b.cancellationReason}{b.cancelledAt ? ` — ${formatDateTime(b.cancelledAt)}` : ''}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className={styles.bookingRight}>
                          <span className={`badge ${STATUS_COLORS[rtStatus]}`}>{rtStatus === 'live' ? 'In Progress' : rtStatus.charAt(0).toUpperCase() + rtStatus.slice(1)}</span>
                          {['pending', 'approved'].includes(b.status) && (
                            <button className="btn-danger btn-sm" onClick={() => handleCancel(b._id)} disabled={cancelling === b._id}>
                              {cancelling === b._id ? '...' : '🗑️ Cancel'}
                            </button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Cancellation Confirmation Modal */}
            {confirmModal && selectedForCancel && (
              <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setConfirmModal(false)}>
                <div className="modal" style={{ maxWidth: 400 }}>
                  <div className="modal-header">
                    <h2 className="modal-title">🗑️ Cancel Booking</h2>
                    <button className="modal-close" onClick={() => setConfirmModal(false)}>✕</button>
                  </div>

                  <div style={{ padding: '20px' }}>
                    <p style={{ marginBottom: '16px' }}>Are you sure you want to cancel this booking?</p>
                    <textarea
                      value={cancelReason}
                      onChange={e => setCancelReason(e.target.value)}
                      placeholder="Reason for cancellation (optional)"
                      style={{ width: '100%', padding: '8px', marginBottom: '16px', borderRadius: '4px', border: '1px solid #ddd', minHeight: '80px' }}
                    />
                  </div>

                  <div style={{ padding: '0 20px 20px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button className="btn-secondary" onClick={() => setConfirmModal(false)}>Cancel</button>
                    <button className="btn-danger" onClick={confirmCancel} disabled={cancelling}>
                      {cancelling ? 'Cancelling...' : 'Confirm Cancel'}
                    </button>
                  </div>
                </div>
              </div>
            )}
    </div>
  );
}
