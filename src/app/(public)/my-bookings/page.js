'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import homeStyles from '@/app/(public)/home.module.css';
import styles from './mybookings.module.css';
import adminStyles from '../../(admin)/admin/bookings/bookings.module.css';
import { openBookingPrintWindow, printSingleBooking } from '../../../lib/bookingPrint';

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
  const [selectedBooking, setSelectedBooking] = useState(null);



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
                <div className={adminStyles.list}>
                  {filtered.map((b) => {
                    const bookingPurpose = b.purpose || b.roomPurpose || b.specialRequests;
                    const rtStatus = getRealTimeStatus(b);
                    return (
                      <div key={b._id} className={adminStyles.card} onClick={() => setSelectedBooking(b)} style={{ cursor: 'pointer' }}>
                        <div className={adminStyles.cardTop}>
                          <div className={adminStyles.userInfo}>
                            <div className={adminStyles.avatar}>{b.user?.name?.[0]?.toUpperCase() || b.guestName?.[0]?.toUpperCase() || 'U'}</div>
                            <div>
                              <div className={adminStyles.userName}>{b.guestName || b.user?.name || 'Unknown'}{(b.user?.department || b.department) ? ` (${b.user?.department || b.department})` : ''}</div>
                              <div className={adminStyles.userMeta}>
                                {b.user?.department || b.department || b.user?.role || 'Faculty'}
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <span className={`badge ${STATUS_COLORS[rtStatus]}`}>
                              {rtStatus === 'live' ? 'In Progress' : 
                               ['pending', 'pending_hod', 'pending_admin', 'pending_principal', 'pending_ao', 'pending_transport', 'pending_warden'].includes(b.status) ? `Pending (${b.status.replace('pending_', '').toUpperCase()})` : 
                               rtStatus.charAt(0).toUpperCase() + rtStatus.slice(1)}
                            </span>
                            {['pending', 'approved', 'pending_hod', 'pending_admin', 'pending_principal', 'pending_ao', 'pending_transport', 'pending_warden'].includes(b.status) && (
                              <button className="btn-danger btn-sm" onClick={(e) => { e.stopPropagation(); handleCancel(b._id); }} disabled={cancelling === b._id} title="Cancel this booking">
                                🗑️
                              </button>
                            )}
                          </div>
                        </div>
                        <div className={adminStyles.cardBody}>
                          <div className={adminStyles.hallName}>
                            {b.serviceType === 'vehicle' ? 
                              `🚗 ${b.serviceId?.name || 'Vehicle'} (${b.serviceId?.registrationNumber || 'N/A'})` :
                             b.serviceType === 'room' ? 
                              `🏨 Room ${b.serviceId?.roomNumber || 'N/A'} (Floor ${b.serviceId?.floor || '0'})` :
                             `🏛️ ${b.serviceId?.name || 'Event Hall'}`}
                          </div>
                          <div className={adminStyles.bookingMeta}>
                            {b.serviceType === 'room' ? (
                              <>
                                Check-in: {b.roomCheckInDate} at {formatTime12h(b.roomCheckInTime || '14:00')}<br />
                                Check-out: {b.roomCheckOutDate} at {formatTime12h(b.roomCheckOutTime || '12:00')}
                              </>
                            ) : (
                              <>
                                📅 {b.date || b.hallDate || b.vehiclePickupDate || b.roomCheckInDate} 
                                &nbsp;•&nbsp; 🕐 {formatTime12h(b.startTime || b.hallStartTime || b.vehiclePickupTime || b.roomCheckInTime) || 'N/A'} – {formatTime12h(b.endTime || b.hallEndTime || b.vehicleReturnTime || b.roomCheckOutTime) || 'N/A'}
                              </>
                            )}
                          </div>
                          {b.serviceType === 'vehicle' && b.driverName && (
                            <div style={{ marginTop: 8, padding: '6px 10px', fontSize: 13, background: 'rgba(59,130,246,0.06)', borderRadius: 4, borderLeft: '3px solid #3b82f6' }}>
                              👨‍✈️ Driver: <strong>{b.driverName}</strong> ({b.driverPhone}) | 🚗 Vehicle No: <strong>{b.assignedVehicleNumber}</strong>
                            </div>
                          )}
                          <div className={adminStyles.purpose}>📋 {bookingPurpose ? `Purpose: ${bookingPurpose}` : 'No purpose provided'}</div>
                          {b.actionBy && b.status !== 'pending' && !['pending_hod', 'pending_principal', 'pending_ao', 'pending_transport', 'pending_warden'].includes(b.status) && (
                            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
                              {b.status === 'approved' ? '✅ Approved by: ' : b.status === 'rejected' ? '❌ Rejected by: ' : '🗑️ Cancelled by: '} 
                              <strong>{b.actionBy?.name || 'Admin'}</strong>
                              {b.actionAt && (
                                <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-muted)' }}> — {formatDateTime(b.actionAt)}</span>
                              )}
                            </div>
                          )}
                          {b.cancellationReason && (
                            <div style={{ marginTop: 8, padding: 8, fontSize: 13, color: 'var(--text-secondary)', background: 'rgba(255,59,48,0.08)', borderRadius: 'var(--radius-sm)' }}>
                              🚫 {b.cancelledBy === 'admin' ? 'Admin' : 'User'} cancelled: {b.cancellationReason}
                            </div>
                          )}
                        </div>
                        <div className={adminStyles.actionHint}>View details →</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Requisition Details Modal */}
            {selectedBooking && (
              <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSelectedBooking(null)}>
                <div className="modal">
                  <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 className="modal-title">Booking Requisition Details</h2>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => printSingleBooking(selectedBooking)}>
                        🖨️ Print Requisition
                      </button>
                      <button className="modal-close" onClick={() => setSelectedBooking(null)} style={{ position: 'static' }}>✕</button>
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px' }}>
                    {selectedBooking.serviceType === 'vehicle' ? (
                      /* VEHICLE REQUEST FORM DIGITAL REPRODUCTION */
                      <div style={{ fontFamily: 'monospace, sans-serif', color: '#1e293b' }}>
                        <div style={{ textAlign: 'center', borderBottom: '2px double #475569', paddingBottom: '12px', marginBottom: '16px' }}>
                          <h3 style={{ margin: '0', fontSize: '16px', fontWeight: 'bold', letterSpacing: '1px' }}>KNOWLEDGE INSTITUTE OF TECHNOLOGY</h3>
                          <span style={{ fontSize: '12px' }}>SALEM - 637 504 | VEHICLE REQUEST FORM</span>
                        </div>
                        
                        <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', marginBottom: '16px' }}>
                          <tbody>
                            <tr style={{ borderBottom: '1px dashed #cbd5e1' }}><td style={{ padding: '6px 0', fontWeight: 'bold' }}>DEPT:</td><td>{selectedBooking.department || selectedBooking.user?.department || 'N/A'}</td></tr>
                            <tr style={{ borderBottom: '1px dashed #cbd5e1' }}><td style={{ padding: '6px 0', fontWeight: 'bold' }}>FACULTY NAME:</td><td>{selectedBooking.guestName || selectedBooking.user?.name}</td></tr>
                            <tr style={{ borderBottom: '1px dashed #cbd5e1' }}><td style={{ padding: '6px 0', fontWeight: 'bold' }}>CHIEF GUEST/PROGRAMME:</td><td>{selectedBooking.purpose || 'N/A'}</td></tr>
                            <tr style={{ borderBottom: '1px dashed #cbd5e1' }}><td style={{ padding: '6px 0', fontWeight: 'bold' }}>VEHICLE TYPE:</td><td>🚗 {selectedBooking.serviceId?.name || 'CAR / BUS / JEEP'}</td></tr>
                            <tr style={{ borderBottom: '1px dashed #cbd5e1' }}><td style={{ padding: '6px 0', fontWeight: 'bold' }}>ONWARD JOURNEY:</td><td>📅 {selectedBooking.vehiclePickupDate} at {formatTime12h(selectedBooking.vehiclePickupTime || '09:00')}</td></tr>
                            <tr style={{ borderBottom: '1px dashed #cbd5e1' }}><td style={{ padding: '6px 0', fontWeight: 'bold' }}>RETURN JOURNEY:</td><td>📅 {selectedBooking.vehicleReturnDate} at {formatTime12h(selectedBooking.vehicleReturnTime || '17:00')}</td></tr>
                            {selectedBooking.driverName && (
                              <>
                                <tr style={{ borderBottom: '1px dashed #cbd5e1', color: '#1e3a8a', fontWeight: 'bold' }}><td style={{ padding: '6px 0' }}>DRIVER NAME:</td><td>👨‍✈️ {selectedBooking.driverName}</td></tr>
                                <tr style={{ borderBottom: '1px dashed #cbd5e1', color: '#1e3a8a', fontWeight: 'bold' }}><td style={{ padding: '6px 0' }}>DRIVER PHONE:</td><td>📞 {selectedBooking.driverPhone}</td></tr>
                                <tr style={{ borderBottom: '1px dashed #cbd5e1', color: '#1e3a8a', fontWeight: 'bold' }}><td style={{ padding: '6px 0' }}>TOTAL KM:</td><td>📏 {selectedBooking.totalKm || 'N/A'}</td></tr>
                              </>
                            )}
                          </tbody>
                        </table>

                        <div style={{ marginTop: '20px', borderTop: '1px solid #94a3b8', paddingTop: '12px' }}>
                          <h5 style={{ margin: '0 0 10px 0', fontSize: '11px', textTransform: 'uppercase', color: '#64748b' }}>Workflow Approvals Checklist:</h5>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', fontSize: '10px', textAlign: 'center' }}>
                            <div style={{ padding: '8px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                              <div>HOD</div>
                              <strong style={{ color: '#10b981' }}>{selectedBooking.approvals?.some(a => a.stage === 'HOD') ? '✓ SIGNED' : '⏳ PENDING'}</strong>
                            </div>
                            <div style={{ padding: '8px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                              <div>ADMIN</div>
                              <strong style={{ color: '#10b981' }}>{selectedBooking.approvals?.some(a => a.stage === 'Admin') ? '✓ SIGNED' : '⏳ PENDING'}</strong>
                            </div>
                            <div style={{ padding: '8px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                              <div>PRINCIPAL</div>
                              <strong style={{ color: '#10b981' }}>{selectedBooking.approvals?.some(a => a.stage === 'Principal') ? '✓ SIGNED' : '⏳ PENDING'}</strong>
                            </div>
                            <div style={{ padding: '8px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                              <div>AO</div>
                              <strong style={{ color: '#10b981' }}>{selectedBooking.approvals?.some(a => a.stage === 'Administrative Officer (AO)') ? '✓ SIGNED' : '⏳ PENDING'}</strong>
                            </div>
                            <div style={{ padding: '8px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                              <div>TRANS. MGR</div>
                              <strong style={{ color: '#10b981' }}>{selectedBooking.status === 'approved' ? '✓ ALLOCATED' : '⏳ PENDING'}</strong>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : selectedBooking.serviceType === 'room' ? (
                      /* GUEST ACCOMMODATION REQUISITION FORM DIGITAL REPRODUCTION */
                      <div style={{ fontFamily: 'Georgia, serif', color: '#1e293b' }}>
                        <div style={{ textAlign: 'center', borderBottom: '2px solid #334155', paddingBottom: '8px', marginBottom: '16px' }}>
                          <h3 style={{ margin: '0', fontSize: '18px', fontWeight: 'bold' }}>REQUISITION FOR GUEST ACCOMMODATION</h3>
                          <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#64748b' }}>KIOT HOSTEL & ACCOMMODATION LOGS</span>
                        </div>

                        <div style={{ fontSize: '12px', lineHeight: '1.6', marginBottom: '16px' }}>
                          <p style={{ margin: '4px 0' }}><strong>FROM:</strong> {selectedBooking.user?.name || selectedBooking.guestName}</p>
                          <p style={{ margin: '4px 0' }}><strong>TO:</strong> The Principal, KIOT</p>
                          <p style={{ margin: '8px 0', borderLeft: '3px solid #64748b', paddingLeft: '8px', fontStyle: 'italic' }}>
                            <strong>Sub:</strong> Requisition for Guest Accommodation & Food Reg.
                          </p>
                          <p style={{ margin: '4px 0', textIndent: '20px' }}>
                            We request you to provide food & accommodation in <strong>A-Block / Gents Hostel</strong> as mentioned below:
                          </p>
                        </div>

                        <table style={{ width: '100%', fontSize: '11px', border: '1px solid #cbd5e1', borderCollapse: 'collapse', textAlign: 'center' }}>
                          <thead>
                            <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                              <th style={{ padding: '6px', borderRight: '1px solid #cbd5e1' }}>Date range</th>
                              <th style={{ padding: '6px', borderRight: '1px solid #cbd5e1' }}>Trainers count</th>
                              <th style={{ padding: '6px', borderRight: '1px solid #cbd5e1' }}>Room type / Location</th>
                              <th style={{ padding: '6px' }}>Requirements</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1', borderBottom: '1px solid #cbd5e1' }}>{selectedBooking.roomCheckInDate} to {selectedBooking.roomCheckOutDate}</td>
                              <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1', borderBottom: '1px solid #cbd5e1' }}>{selectedBooking.numberOfGuests || '1'} Male</td>
                              <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1', borderBottom: '1px solid #cbd5e1' }}>
                                🏢 {selectedBooking.serviceId?.name || 'Gents Hostel AC Room'}
                                {selectedBooking.serviceId?.roomNumber && (
                                  <div style={{ fontSize: '10px', color: '#1e3a8a', fontWeight: 'bold', marginTop: '4px' }}>
                                    Room {selectedBooking.serviceId.roomNumber} (Floor {selectedBooking.serviceId.floor || '0'})
                                  </div>
                                )}
                              </td>
                              <td style={{ padding: '8px', borderBottom: '1px solid #cbd5e1' }}>Accommodation & Food</td>
                            </tr>
                          </tbody>
                        </table>

                        <div style={{ marginTop: '20px', borderTop: '1px solid #94a3b8', paddingTop: '12px' }}>
                          <h5 style={{ margin: '0 0 10px 0', fontSize: '11px', textTransform: 'uppercase', color: '#64748b' }}>Workflow Approvals Checklist:</h5>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', fontSize: '10px', textAlign: 'center' }}>
                            <div style={{ padding: '8px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                              <div>HOD</div>
                              <strong style={{ color: '#10b981' }}>{selectedBooking.approvals?.some(a => a.stage === 'HOD') ? '✓ SIGNED' : '⏳ PENDING'}</strong>
                            </div>
                            <div style={{ padding: '8px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                              <div>ADMIN</div>
                              <strong style={{ color: '#10b981' }}>{selectedBooking.approvals?.some(a => a.stage === 'Admin') ? '✓ SIGNED' : '⏳ PENDING'}</strong>
                            </div>
                            <div style={{ padding: '8px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                              <div>PRINCIPAL</div>
                              <strong style={{ color: '#10b981' }}>{selectedBooking.approvals?.some(a => a.stage === 'Principal') ? '✓ SIGNED' : '⏳ PENDING'}</strong>
                            </div>
                            <div style={{ padding: '8px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                              <div>AO</div>
                              <strong style={{ color: '#10b981' }}>{selectedBooking.approvals?.some(a => a.stage === 'Administrative Officer (AO)') ? '✓ SIGNED' : '⏳ PENDING'}</strong>
                            </div>
                            <div style={{ padding: '8px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                              <div>WARDEN</div>
                              <strong style={{ color: '#10b981' }}>{selectedBooking.status === 'approved' ? '✓ SIGNED' : '⏳ PENDING'}</strong>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* STANDARD SEMINAR HALL BOOKING SUMMARY VIEW */
                      <div style={{ color: '#1e293b' }}>
                        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 'bold', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>🏛️ Seminar Hall Booking Requisition</h3>
                        <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                          <tbody>
                            <tr style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: '8px 0', fontWeight: 'bold', width: '140px' }}>Seminar Hall:</td><td>{selectedBooking.serviceId?.name || 'N/A'}</td></tr>
                            <tr style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: '8px 0', fontWeight: 'bold' }}>Faculty Name:</td><td>{selectedBooking.user?.name || 'N/A'}</td></tr>
                            <tr style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: '8px 0', fontWeight: 'bold' }}>Department:</td><td>{selectedBooking.department || selectedBooking.user?.department || 'N/A'}</td></tr>
                            <tr style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: '8px 0', fontWeight: 'bold' }}>Event Date:</td><td>{selectedBooking.hallDate || 'N/A'}</td></tr>
                            <tr style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: '8px 0', fontWeight: 'bold' }}>Event Time:</td><td>{formatTime12h(selectedBooking.hallStartTime)} – {formatTime12h(selectedBooking.hallEndTime)}</td></tr>
                            <tr style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: '8px 0', fontWeight: 'bold' }}>Purpose:</td><td>{selectedBooking.purpose || 'N/A'}</td></tr>
                            <tr><td style={{ padding: '8px 0', fontWeight: 'bold' }}>Expected Attendees:</td><td>{selectedBooking.attendees || 'N/A'}</td></tr>
                          </tbody>
                        </table>
                      </div>
                    )}

                    {selectedBooking.approvals && selectedBooking.approvals.length > 0 && (
                      <div style={{ marginTop: 20, borderTop: '1px dashed #cbd5e1', paddingTop: 12 }}>
                        <span style={{ fontSize: 13, fontWeight: 'bold', display: 'block', marginBottom: 8, color: '#334155' }}>Approval Trail Details:</span>
                        {selectedBooking.approvals.map((ap, idx) => (
                          <div key={idx} style={{ fontSize: 12, color: '#475569', marginBottom: 6 }}>
                            ⏳ Stage <strong>{ap.stage}</strong>: {ap.status === 'approved' ? '✅ Approved' : '❌ Rejected'} {ap.approvedBy ? `by ${ap.approvedBy.name || 'Approver'}${ap.stage === 'HOD' && ap.approvedBy.department ? ` (${ap.approvedBy.department})` : ''}` : ''}
                            {ap.comment && <div style={{ fontSize: 11, fontStyle: 'italic', marginLeft: 14, color: '#64748b' }}>"{ap.comment}"</div>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

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
