'use client';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import styles from './bookings.module.css';
import { openBookingPrintWindow } from '../../../../lib/bookingPrint';

const STATUS_TABS = ['all', 'pending', 'approved', 'rejected', 'cancelled'];
const SERVICE_TYPES = ['all', 'hall', 'vehicle', 'room'];
const STATUS_COLORS = { pending: 'badge-pending', approved: 'badge-approved', rejected: 'badge-rejected', cancelled: 'badge-cancelled', live: 'badge-live', finished: 'badge-finished' };

const getRealTimeStatus = (booking) => {
  if (booking.status !== 'approved') return booking.status;

  const now = new Date();
  
  if (booking.serviceType === 'hall' || booking.hallDate) {
    const date = booking.hallDate || booking.date;
    const startT = booking.hallStartTime || booking.startTime;
    const endT = booking.hallEndTime || booking.endTime;
    const start = new Date(`${date}T${startT}:00`);
    const end = new Date(`${date}T${endT}:00`);
    if (now >= start && now <= end) return 'live';
    if (now > end) return 'finished';
  } else if (booking.serviceType === 'vehicle' || booking.vehiclePickupDate) {
    const start = new Date(`${booking.vehiclePickupDate}T${booking.vehiclePickupTime || '09:00'}:00`);
    const end = new Date(`${booking.vehicleReturnDate}T${booking.vehicleReturnTime || '09:00'}:00`);
    if (now >= start && now <= end) return 'live';
    if (now > end) return 'finished';
  } else if (booking.serviceType === 'room' || booking.roomCheckInDate) {
    const start = new Date(`${booking.roomCheckInDate}T${booking.roomCheckInTime || '14:00'}:00`);
    const end = new Date(`${booking.roomCheckOutDate}T${booking.roomCheckOutTime || '12:00'}:00`);
    if (now >= start && now <= end) return 'live';
    if (now > end) return 'finished';
  }
  
  return 'approved';
};

const formatTime12h = (timeStr) => {
  if (!timeStr) return '';
  const [hourStr, minStr] = timeStr.split(':');
  const hour = parseInt(hourStr);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${String(hour12).padStart(2, '0')}:${minStr} ${ampm}`;
};

const formatDateTime = (dt) => {
  if (!dt) return '';
  try { return new Date(dt).toLocaleString(); } catch (e) { return String(dt); }
};

function ManageBookingsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialFilter = searchParams.get('status') || 'all';

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(initialFilter);
  const [activeService, setActiveService] = useState('all');
  const [modal, setModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [activeBookingId, setActiveBookingId] = useState(searchParams.get('bookingId') || null);
  const [adminNote, setAdminNote] = useState('');
  const [updating, setUpdating] = useState(false);
  const [confirmModal, setConfirmModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [user, setUser] = useState(null);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/bookings');
    const data = await res.json();
    setBookings(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void fetchBookings();
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [fetchBookings]);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => setUser(data))
      .catch(err => console.error('Error fetching user info:', err));
  }, []);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!activeBookingId || !bookings.length || modal) return;
    const target = bookings.find(b => b._id === activeBookingId);
    if (target) {
      setSelected(target);
      setAdminNote(target.adminNote || '');
      setModal(true);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [activeBookingId, bookings, modal]);

  const openReview = (b) => { setSelected(b); setAdminNote(b.adminNote || ''); setModal(true); };
  const closeModal = () => {
    setModal(false);
    setActiveBookingId(null);
    setSelected(null);
    setConfirmModal(false);
    setPendingAction(null);

    const params = new URLSearchParams(searchParams.toString());
    if (params.has('bookingId')) {
      params.delete('bookingId');
      const search = params.toString();
      router.replace(`${pathname}${search ? `?${search}` : ''}`);
    }
  };

  const showConfirmation = (status) => {
    setPendingAction(status);
    setConfirmModal(true);
  };

  const handleDecision = async (status) => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/bookings/${selected._id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, adminNote }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.message); return; }
      setConfirmModal(false);
      setPendingAction(null);
      closeModal(); 
      fetchBookings();
    } finally { setUpdating(false); }
  };

  const handleCancel = async () => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/bookings/${selected._id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', reason: cancelReason }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.message); return; }
      setConfirmModal(false);
      setPendingAction(null);
      closeModal(); 
      fetchBookings();
    } finally { setUpdating(false); }
  };

  const handlePrint = async () => {
    await openBookingPrintWindow(filtered, {
      title: 'Booking Report',
      subtitle: 'Manage Bookings'
    });
  };

  const showHall = !user || user.role === 'super-admin' || user.role === 'admin';
  const showVehicle = !user || user.role === 'super-admin' || user.role === 'admin';
  const showRoom = !user || user.role === 'super-admin' || user.role === 'admin';

  const allowedServiceTypes = ['all'];
  if (showHall) allowedServiceTypes.push('hall');
  if (showVehicle) allowedServiceTypes.push('vehicle');
  if (showRoom) allowedServiceTypes.push('room');

  const filtered = (activeTab === 'all' ? bookings : bookings.filter(b => b.status === activeTab))
    .filter(b => activeService === 'all' || b.serviceType === activeService);
  
  const counts = { all: bookings.length, pending: bookings.filter(b => b.status === 'pending').length, approved: bookings.filter(b => b.status === 'approved').length, rejected: bookings.filter(b => b.status === 'rejected').length, cancelled: bookings.filter(b => b.status === 'cancelled').length };
  
  const serviceCounts = { all: bookings.length, hall: bookings.filter(b => b.serviceType === 'hall').length, vehicle: bookings.filter(b => b.serviceType === 'vehicle').length, room: bookings.filter(b => b.serviceType === 'room').length };

  return (
    <div className={styles.page}>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div className="page-header">
            <h1 className="page-title">Manage Bookings</h1>
            <p className="page-subtitle">{bookings.length} total requests</p>
          </div>
          <button onClick={handlePrint} className="btn-secondary" style={{ whiteSpace: 'nowrap' }}>
            🖨️ Print Report
          </button>
        </div>

        <div className="tabs">
          {STATUS_TABS.map(tab => (
            <button key={tab} className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}>
              {tab === 'all' ? 'All' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              {counts[tab] > 0 && <span className={styles.tabCount}>{counts[tab]}</span>}
            </button>
          ))}
        </div>

        <div className="tabs" style={{ marginTop: 20, marginBottom: 24 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginRight: 12, alignSelf: 'center' }}>Filter by Service:</span>
          {allowedServiceTypes.map(service => (
            <button key={service} className={`tab-btn ${activeService === service ? 'active' : ''}`}
              onClick={() => setActiveService(service)}
              style={{ marginRight: 8 }}>
              {service === 'all' ? '📊 All Services' : service === 'hall' ? '🏛️ Hall' : service === 'vehicle' ? '🚗 Vehicle' : '🏨 Room'}
              {serviceCounts[service] > 0 && <span className={styles.tabCount}>{serviceCounts[service]}</span>}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="spinner-wrap"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <div className="empty-title">No bookings found</div>
            <div className="empty-sub">
              {activeTab !== 'all' || activeService !== 'all' 
                ? 'Try adjusting your filters'
                : 'Check back later for new requests'}
            </div>
          </div>
        ) : (
          <div className={styles.list}>
            {filtered.map((b) => {
              const bookingPurpose = b.purpose || b.roomPurpose || b.specialRequests;
              return (
                <div key={b._id} className={styles.card} onClick={() => openReview(b)} style={{ cursor: 'pointer' }}>
                  <div className={styles.cardTop}>
                    <div className={styles.userInfo}>
                      <div className={styles.avatar}>{b.user?.name?.[0]?.toUpperCase()}</div>
                      <div>
                        <div className={styles.userName}>{b.user?.name || b.guestName || 'Unknown'}{(b.user?.department || b.department) ? ` (${b.user?.department || b.department})` : ''}</div>
                        <div className={styles.userMeta}>{b.user?.department || b.user?.role}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span className={`badge ${STATUS_COLORS[getRealTimeStatus(b)]}`}>{getRealTimeStatus(b) === 'live' ? 'In Progress' : getRealTimeStatus(b).charAt(0).toUpperCase() + getRealTimeStatus(b).slice(1)}</span>
                      {b.status !== 'cancelled' && b.status !== 'rejected' && (
                        <button className="btn-danger btn-sm" onClick={(e) => { e.stopPropagation(); setSelected(b); setCancelReason(b.adminNote || ''); setPendingAction('cancel'); setConfirmModal(true); }} title="Cancel this booking">
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                  <div className={styles.cardBody}>
                    <div className={styles.hallName}>
                      {b.serviceType === 'vehicle' ? 
                        `🚗 ${b.serviceId?.name || 'Vehicle'} (${b.serviceId?.registrationNumber || 'N/A'})` :
                       b.serviceType === 'room' ? 
                        `🏨 ${b.serviceId?.name || 'Room'} #${b.serviceId?.roomNumber || 'N/A'}` :
                       `🏛️ ${b.serviceId?.name || 'Event Hall'}`}
                    </div>
                    <div className={styles.bookingMeta}>
                      {b.serviceType === 'room' ? (
                        <>
                          📅 Check-in: {b.roomCheckInDate} at {formatTime12h(b.roomCheckInTime || '14:00')}<br />
                          📅 Check-out: {b.roomCheckOutDate} at {formatTime12h(b.roomCheckOutTime || '12:00')}
                        </>
                      ) : (
                        <>
                          📅 {b.date || b.hallDate || b.vehiclePickupDate || b.roomCheckInDate} 
                          &nbsp;•&nbsp; 🕐 {formatTime12h(b.startTime || b.hallStartTime || b.vehiclePickupTime || b.roomCheckInTime) || 'N/A'} – {formatTime12h(b.endTime || b.hallEndTime || b.vehicleReturnTime || b.roomCheckOutTime) || 'N/A'}
                        </>
                      )}
                    </div>
                    <div className={styles.purpose}>📋 {bookingPurpose ? `Purpose: ${bookingPurpose}` : 'No purpose provided'}</div>
                    {b.actionBy && b.status !== 'pending' && (
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
                  <div className={styles.actionHint}>{b.status === 'pending' ? 'Click to review →' : 'View details →'}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {modal && selected && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Review Booking</h2>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            
            <div className={styles.summaryBox}>
              <div className={styles.summaryRow}><span>User</span><strong>{selected.user?.name || selected.guestName || 'Unknown'}{(selected.user?.department || selected.department) ? ` (${selected.user?.department || selected.department})` : ''} ({selected.user?.role || 'Guest'})</strong></div>
              <div className={styles.summaryRow}><span>Service</span><strong>{selected.serviceType === 'vehicle' ? '🚗 Vehicle' : selected.serviceType === 'room' ? '🏨 Room' : '🏛️ Hall'}</strong></div>
              <div className={styles.summaryRow}>
                <span>Target</span>
                <strong>
                  {selected.serviceType === 'vehicle' ? 
                    `${selected.serviceId?.name || 'Vehicle'} (${selected.serviceId?.registrationNumber || 'N/A'})` :
                   selected.serviceType === 'room' ? 
                    `${selected.serviceId?.name || 'Room'} #${selected.serviceId?.roomNumber || 'N/A'}` :
                   selected.serviceId?.name || 'N/A'}
                </strong>
              </div>
              {selected.serviceType === 'room' ? (
                <>
                  <div className={styles.summaryRow}><span>Check-in Date</span><strong>{selected.roomCheckInDate}</strong></div>
                  <div className={styles.summaryRow}><span>Check-in Time</span><strong>{formatTime12h(selected.roomCheckInTime || '14:00')}</strong></div>
                  <div className={styles.summaryRow}><span>Check-out Date</span><strong>{selected.roomCheckOutDate}</strong></div>
                  <div className={styles.summaryRow}><span>Check-out Time</span><strong>{formatTime12h(selected.roomCheckOutTime || '12:00')}</strong></div>
                </>
              ) : (
                <>
                  <div className={styles.summaryRow}><span>Date</span><strong>{selected.date || selected.hallDate || selected.vehiclePickupDate}</strong></div>
                  <div className={styles.summaryRow}><span>Time</span><strong>{formatTime12h(selected.startTime || selected.hallStartTime || selected.vehiclePickupTime) || 'N/A'} – {formatTime12h(selected.endTime || selected.hallEndTime || selected.vehicleReturnTime) || 'N/A'}</strong></div>
                </>
              )}
              <div className={styles.summaryRow}><span>Purpose</span><strong>{selected.purpose || selected.roomPurpose || selected.specialRequests || 'No purpose'}</strong></div>
              <div className={styles.summaryRow}><span>Guests</span><strong>{selected.attendees || selected.numberOfGuests || selected.serviceId?.capacity || 'N/A'}</strong></div>
              {selected.actionBy && selected.status !== 'pending' && (
                <div className={styles.summaryRow}><span>Reviewed By</span><strong>{selected.actionBy?.name || 'Admin'}{selected.actionAt ? ' — ' + formatDateTime(selected.actionAt) : ''}</strong></div>
              )}
              {selected.cancellationReason && (
                <div className={styles.summaryRow}><span>Cancelled</span><strong>{selected.cancelledBy === 'admin' ? 'Admin' : 'User'}: {selected.cancellationReason}{selected.cancelledAt ? ' — ' + formatDateTime(selected.cancelledAt) : ''}</strong></div>
              )}
            </div>

            <div className="form-group" style={{ marginTop: 24 }}>
              <label className="form-label">Admin Note (optional)</label>
              <textarea className="form-input" rows={2} placeholder="Add a note for the user..."
                value={adminNote} onChange={e => setAdminNote(e.target.value)} style={{ resize: 'vertical' }} />
            </div>

            {selected.status === 'pending' ? (
              <div className={styles.decisionBtns}>
                <button className="btn-danger" onClick={() => showConfirmation('rejected')} disabled={updating}>
                  ❌ Reject
                </button>
                <button className="btn-success" onClick={() => showConfirmation('approved')} disabled={updating}>
                  ✅ Approve
                </button>
              </div>
            ) : (
              <div style={{ marginTop: 16, fontSize: 14, color: 'var(--text-secondary)' }}>
                This booking is already <strong>{selected.status}</strong> and cannot be reviewed again here.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal && pendingAction && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setConfirmModal(false)}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h2 className="modal-title">
                {pendingAction === 'cancel' ? '🗑️ Cancel Booking' : (pendingAction === 'approved' ? '✅ Confirm Approval' : '❌ Confirm Rejection')}
              </h2>
              <button className="modal-close" onClick={() => setConfirmModal(false)}>✕</button>
            </div>
            
            <div style={{ padding: '20px' }}>
              <p style={{ marginBottom: 12, color: 'var(--text)' }}>
                Are you sure you want to <strong>{pendingAction === 'approved' ? 'approve' : pendingAction === 'rejected' ? 'reject' : 'cancel'}</strong> this booking?
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {selected?.serviceType === 'vehicle' ? 
                  `Vehicle: ${selected?.serviceId?.name} (${selected?.serviceId?.registrationNumber || 'N/A'})` :
                 selected?.serviceType === 'room' ? 
                  `Room: ${selected?.serviceId?.name} #${selected?.serviceId?.roomNumber || 'N/A'}` :
                 `Hall: ${selected?.serviceId?.name}`} | {selected?.hallDate || selected?.vehiclePickupDate || selected?.roomCheckInDate} {selected?.hallStartTime || selected?.vehiclePickupTime || selected?.roomCheckInTime}–{selected?.hallEndTime || selected?.vehicleReturnTime || selected?.roomCheckOutTime}
              </p>
              {pendingAction === 'cancel' && (
                <textarea 
                  placeholder="Reason for cancellation (optional)"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  style={{ width: '100%', padding: 8, marginTop: 12, borderRadius: 4, border: '1px solid var(--border)', fontFamily: 'inherit', fontSize: 13 }}
                  rows={2}
                />
              )}
            </div>

            <div style={{ display: 'flex', gap: 12, padding: '20px', paddingTop: 0 }}>
              <button className="btn-secondary" onClick={() => setConfirmModal(false)} disabled={updating} style={{ flex: 1 }}>
                Cancel
              </button>
              <button 
                className={pendingAction === 'approved' ? 'btn-success' : pendingAction === 'cancel' ? 'btn-danger' : 'btn-danger'}
                onClick={() => pendingAction === 'cancel' ? handleCancel() : handleDecision(pendingAction)}
                disabled={updating}
                style={{ flex: 1 }}
              >
                {updating ? '...' : (pendingAction === 'approved' ? '✅ Approve' : pendingAction === 'cancel' ? '🗑️ Cancel' : '❌ Reject')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ManageBookingsPage() {
  return (
    <Suspense fallback={<div className="spinner-wrap"><div className="spinner" /></div>}>
      <ManageBookingsContent />
    </Suspense>
  );
}
