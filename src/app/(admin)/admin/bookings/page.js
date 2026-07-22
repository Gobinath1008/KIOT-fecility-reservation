'use client';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import styles from './bookings.module.css';
import { openBookingPrintWindow, printSingleBooking } from '../../../../lib/bookingPrint';
import { matchDepartment } from '../../../../lib/deptMatcher';

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

  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [assignedVehicleNumber, setAssignedVehicleNumber] = useState('');
  const [totalKm, setTotalKm] = useState('');

  const handleDecision = async (action) => {
    if (action === 'approve' && selected.status === 'pending_transport') {
      const cleanPhone = driverPhone.replace(/\D/g, '');
      if (cleanPhone.length !== 10) {
        alert('Please enter a valid 10-digit driver mobile number.');
        return;
      }
    }
    setUpdating(true);
    try {
      const res = await fetch(`/api/bookings/${selected._id}/approve`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          comment: adminNote,
          driverName,
          driverPhone,
          assignedVehicleNumber,
          totalKm
        }),
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

  const isHOD = user?.role === 'hod';
  const isPrincipal = user?.role === 'principal';
  const isAO = user?.role === 'ao';
  const isTransport = user?.role === 'transport_manager';
  const isWarden = user?.role === 'hostel_warden';

  const showHall = !user || user.role === 'super-admin' || user.role === 'admin' || isHOD || isPrincipal || isAO;
  const showVehicle = !user || user.role === 'super-admin' || user.role === 'admin' || isHOD || isPrincipal || isAO || isTransport;
  const showRoom = !user || user.role === 'super-admin' || user.role === 'admin' || isHOD || isPrincipal || isAO || isWarden;

  const allowedServiceTypes = ['all'];
  if (showHall) allowedServiceTypes.push('hall');
  if (showVehicle) allowedServiceTypes.push('vehicle');
  if (showRoom) allowedServiceTypes.push('room');

  const isPending = (status) => ['pending', 'pending_hod', 'pending_admin', 'pending_principal', 'pending_ao', 'pending_transport', 'pending_warden'].includes(status);

  const isWorkflowApprover = ['hod', 'principal', 'ao', 'transport_manager', 'hostel_warden'].includes(user?.role);

  const canApproveBooking = (b) => {
    if (!user) return false;
    
    if (b.status === 'pending_hod') {
      // If the HOD themselves booked it, they are authorized to sign off on their own HOD-stage signature
      const bookingUserId = b.user?._id || b.user;
      if (bookingUserId === user.id || bookingUserId === user._id) return true;

      const bDept = b.department || b.user?.department || '';
      const userDept = user.department || '';
      return user.role === 'hod' && matchDepartment(userDept, bDept);
    }
    if (b.status === 'pending_admin') {
      return user.role === 'admin' || user.role === 'super-admin';
    }
    if (b.status === 'pending_principal') {
      return user.role === 'principal';
    }
    if (b.status === 'pending_ao') {
      return user.role === 'ao';
    }
    if (b.status === 'pending_transport') {
      return user.role === 'transport_manager';
    }
    if (b.status === 'pending_warden') {
      return user.role === 'hostel_warden';
    }
    return false;
  };

  const didApproveOrReject = (b) => {
    if (!user) return false;
    return (b.approvals || []).some(ap => ap.approvedBy?._id === user.id || ap.approvedBy === user.id || ap.approvedBy?._id === user._id || ap.approvedBy === user._id);
  };

  const filtered = (activeTab === 'all' ? bookings : 
                    activeTab === 'pending' ? bookings.filter(b => isPending(b.status)) :
                    bookings.filter(b => b.status === activeTab))
    .filter(b => activeService === 'all' || b.serviceType === activeService)
    .filter(b => {
      if (isWorkflowApprover) {
        if (activeTab === 'pending') {
          return canApproveBooking(b);
        }
        if (activeTab === 'approved' || activeTab === 'rejected') {
          return didApproveOrReject(b);
        }
        return canApproveBooking(b) || didApproveOrReject(b);
      }
      return true;
    });
  
  const counts = { 
    all: bookings.filter(b => {
      if (isWorkflowApprover) {
        return (isPending(b.status) && canApproveBooking(b)) || didApproveOrReject(b);
      }
      return true;
    }).length, 
    pending: bookings.filter(b => isPending(b.status) && (!isWorkflowApprover || canApproveBooking(b))).length, 
    approved: bookings.filter(b => b.status === 'approved' && (!isWorkflowApprover || didApproveOrReject(b))).length, 
    rejected: bookings.filter(b => b.status === 'rejected' && (!isWorkflowApprover || didApproveOrReject(b))).length, 
    cancelled: bookings.filter(b => b.status === 'cancelled' && !isWorkflowApprover).length 
  };
  
  const serviceCounts = { 
    all: filtered.length, 
    hall: filtered.filter(b => b.serviceType === 'hall').length, 
    vehicle: filtered.filter(b => b.serviceType === 'vehicle').length, 
    room: filtered.filter(b => b.serviceType === 'room').length 
  };
  
  // Set default active tab for approver roles to 'pending'
  useEffect(() => {
    if (isWorkflowApprover && activeTab === 'all') {
      setActiveTab('pending');
    }
  }, [isWorkflowApprover, activeTab]);

  const visibleStatusTabs = isWorkflowApprover 
    ? ['pending', 'approved', 'rejected'] 
    : STATUS_TABS;

  return (
    <div className={styles.page}>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div className="page-header">
            <h1 className="page-title">Manage Bookings</h1>
            <p className="page-subtitle">{filtered.length} requests available</p>
          </div>
          <button onClick={handlePrint} className="btn-secondary" style={{ whiteSpace: 'nowrap' }}>
            🖨️ Print Report
          </button>
        </div>

        <div className="tabs">
          {visibleStatusTabs.map(tab => (
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
              const showActionAlert = isPending(b.status) && canApproveBooking(b);
              return (
                <div key={b._id} className={`${styles.card} ${showActionAlert ? styles.actionRequiredCard : ''}`} onClick={() => openReview(b)} style={{ cursor: 'pointer', borderLeft: showActionAlert ? '4px solid #3b82f6' : undefined }}>
                  <div className={styles.cardTop}>
                    <div className={styles.userInfo}>
                      <div className={styles.avatar}>{b.user?.name?.[0]?.toUpperCase()}</div>
                      <div>
                        <div className={styles.userName}>{b.user?.name || b.guestName || 'Unknown'}{(b.user?.department || b.department) ? ` (${b.user?.department || b.department})` : ''}</div>
                        <div className={styles.userMeta}>
                          {b.user?.department || b.user?.role}
                          {showActionAlert && <span style={{ marginLeft: 8, color: '#2563eb', fontWeight: 'bold', fontSize: 11 }}>⚠️ Requires Your Action</span>}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span className={`badge ${STATUS_COLORS[getRealTimeStatus(b)]}`}>
                        {getRealTimeStatus(b) === 'live' ? 'In Progress' : 
                         isPending(b.status) ? `Pending (${b.status.replace('pending_', '').toUpperCase()})` : 
                         getRealTimeStatus(b).charAt(0).toUpperCase() + getRealTimeStatus(b).slice(1)}
                      </span>
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
                    {b.serviceType === 'vehicle' && b.driverName && (
                      <div style={{ marginTop: 8, padding: '6px 10px', fontSize: 13, background: 'rgba(59,130,246,0.06)', borderRadius: 4, borderLeft: '3px solid #3b82f6' }}>
                        👨‍✈️ Driver: <strong>{b.driverName}</strong> ({b.driverPhone}) | 🚗 Vehicle No: <strong>{b.assignedVehicleNumber}</strong>
                      </div>
                    )}
                    <div className={styles.purpose}>📋 {bookingPurpose ? `Purpose: ${bookingPurpose}` : 'No purpose provided'}</div>
                    {b.actionBy && b.status !== 'pending' && !isPending(b.status) && (
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
                  <div className={styles.actionHint}>{isPending(b.status) ? 'Click to review stage →' : 'View details →'}</div>
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
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="modal-title">Review Booking</h2>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => printSingleBooking(selected)}>
                  🖨️ Print Requisition
                </button>
                <button className="modal-close" onClick={closeModal} style={{ position: 'static' }}>✕</button>
              </div>
            </div>
            
            <div className={styles.summaryBox} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px' }}>
              
              {selected.serviceType === 'vehicle' ? (
                /* VEHICLE REQUEST FORM DIGITAL REPRODUCTION */
                <div style={{ fontFamily: 'monospace, sans-serif', color: '#1e293b' }}>
                  <div style={{ textAlign: 'center', borderBottom: '2px double #475569', paddingBottom: '12px', marginBottom: '16px' }}>
                    <h3 style={{ margin: '0', fontSize: '16px', fontWeight: 'bold', letterSpacing: '1px' }}>KNOWLEDGE INSTITUTE OF TECHNOLOGY</h3>
                    <span style={{ fontSize: '12px' }}>SALEM - 637 504 | VEHICLE REQUEST FORM</span>
                  </div>
                  
                  <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', marginBottom: '16px' }}>
                    <tbody>
                      <tr style={{ borderBottom: '1px dashed #cbd5e1' }}><td style={{ padding: '6px 0', fontWeight: 'bold' }}>DEPT:</td><td>{selected.department || selected.user?.department || 'PAS & JR'}</td></tr>
                      <tr style={{ borderBottom: '1px dashed #cbd5e1' }}><td style={{ padding: '6px 0', fontWeight: 'bold' }}>FACULTY NAME:</td><td>{selected.guestName || selected.user?.name}</td></tr>
                      <tr style={{ borderBottom: '1px dashed #cbd5e1' }}><td style={{ padding: '6px 0', fontWeight: 'bold' }}>CHIEF GUEST/PROGRAMME:</td><td>{selected.purpose || 'BUY TO LUNCH / OFFICIAL TRIP'}</td></tr>
                      <tr style={{ borderBottom: '1px dashed #cbd5e1' }}><td style={{ padding: '6px 0', fontWeight: 'bold' }}>VEHICLE TYPE:</td><td>🚗 {selected.serviceId?.name || 'CAR / BUS / JEEP'}</td></tr>
                      <tr style={{ borderBottom: '1px dashed #cbd5e1' }}><td style={{ padding: '6px 0', fontWeight: 'bold' }}>ONWARD JOURNEY:</td><td>📅 {selected.date || selected.vehiclePickupDate} at {formatTime12h(selected.startTime || selected.vehiclePickupTime || '09:00')}</td></tr>
                      <tr style={{ borderBottom: '1px dashed #cbd5e1' }}><td style={{ padding: '6px 0', fontWeight: 'bold' }}>RETURN JOURNEY:</td><td>📅 {selected.vehicleReturnDate || selected.date} at {formatTime12h(selected.vehicleReturnTime || '17:00')}</td></tr>
                      {selected.driverName && (
                        <>
                          <tr style={{ borderBottom: '1px dashed #cbd5e1', color: '#1e3a8a', fontWeight: 'bold' }}><td style={{ padding: '6px 0' }}>DRIVER NAME:</td><td>👨‍✈️ {selected.driverName}</td></tr>
                          <tr style={{ borderBottom: '1px dashed #cbd5e1', color: '#1e3a8a', fontWeight: 'bold' }}><td style={{ padding: '6px 0' }}>DRIVER PHONE:</td><td>📞 {selected.driverPhone}</td></tr>
                          <tr style={{ borderBottom: '1px dashed #cbd5e1', color: '#1e3a8a', fontWeight: 'bold' }}><td style={{ padding: '6px 0' }}>TOTAL KM:</td><td>📏 {selected.totalKm || 'N/A'}</td></tr>
                        </>
                      )}
                    </tbody>
                  </table>

                  <div style={{ marginTop: '20px', borderTop: '1px solid #94a3b8', paddingTop: '12px' }}>
                    <h5 style={{ margin: '0 0 10px 0', fontSize: '11px', textTransform: 'uppercase', color: '#64748b' }}>Workflow Approvals Checklist:</h5>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', fontSize: '10px', textAlign: 'center' }}>
                      <div style={{ padding: '8px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                        <div>HOD</div>
                        <strong style={{ color: '#10b981' }}>{selected.approvals?.some(a => a.stage === 'HOD') ? '✓ SIGNED' : '⏳ PENDING'}</strong>
                      </div>
                      <div style={{ padding: '8px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                        <div>ADMIN</div>
                        <strong style={{ color: '#10b981' }}>{selected.approvals?.some(a => a.stage === 'Admin') ? '✓ SIGNED' : '⏳ PENDING'}</strong>
                      </div>
                      <div style={{ padding: '8px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                        <div>PRINCIPAL</div>
                        <strong style={{ color: '#10b981' }}>{selected.approvals?.some(a => a.stage === 'Principal') ? '✓ SIGNED' : '⏳ PENDING'}</strong>
                      </div>
                      <div style={{ padding: '8px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                        <div>AO</div>
                        <strong style={{ color: '#10b981' }}>{selected.approvals?.some(a => a.stage === 'Administrative Officer (AO)') ? '✓ SIGNED' : '⏳ PENDING'}</strong>
                      </div>
                      <div style={{ padding: '8px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                        <div>TRANS. MGR</div>
                        <strong style={{ color: '#10b981' }}>{selected.status === 'approved' ? '✓ ALLOCATED' : '⏳ PENDING'}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              ) : selected.serviceType === 'room' ? (
                /* GUEST ACCOMMODATION REQUISITION FORM DIGITAL REPRODUCTION */
                <div style={{ fontFamily: 'Georgia, serif', color: '#1e293b' }}>
                  <div style={{ textAlign: 'center', borderBottom: '2px solid #334155', paddingBottom: '8px', marginBottom: '16px' }}>
                    <h3 style={{ margin: '0', fontSize: '18px', fontWeight: 'bold' }}>REQUISITION FOR GUEST ACCOMMODATION</h3>
                    <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#64748b' }}>KIOT HOSTEL & ACCOMMODATION LOGS</span>
                  </div>

                  <div style={{ fontSize: '12px', lineHeight: '1.6', marginBottom: '16px' }}>
                    <p style={{ margin: '4px 0' }}><strong>FROM:</strong> {selected.user?.name || selected.guestName} (AP/Chem/ECE)</p>
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
                        <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1', borderBottom: '1px solid #cbd5e1' }}>{selected.roomCheckInDate} to {selected.roomCheckOutDate}</td>
                        <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1', borderBottom: '1px solid #cbd5e1' }}>{selected.numberOfGuests || '1'} Male</td>
                        <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1', borderBottom: '1px solid #cbd5e1' }}>
                          🏢 {selected.serviceId?.name || 'Gents Hostel AC Room'}
                          {selected.serviceId?.roomNumber && (
                            <div style={{ fontSize: '10px', color: '#1e3a8a', fontWeight: 'bold', marginTop: '4px' }}>
                              Room {selected.serviceId.roomNumber} (Floor {selected.serviceId.floor || '0'})
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
                        <strong style={{ color: '#10b981' }}>{selected.approvals?.some(a => a.stage === 'HOD') ? '✓ SIGNED' : '⏳ PENDING'}</strong>
                      </div>
                      <div style={{ padding: '8px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                        <div>ADMIN</div>
                        <strong style={{ color: '#10b981' }}>{selected.approvals?.some(a => a.stage === 'Admin') ? '✓ SIGNED' : '⏳ PENDING'}</strong>
                      </div>
                      <div style={{ padding: '8px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                        <div>PRINCIPAL</div>
                        <strong style={{ color: '#10b981' }}>{selected.approvals?.some(a => a.stage === 'Principal') ? '✓ SIGNED' : '⏳ PENDING'}</strong>
                      </div>
                      <div style={{ padding: '8px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                        <div>AO</div>
                        <strong style={{ color: '#10b981' }}>{selected.approvals?.some(a => a.stage === 'Administrative Officer (AO)') ? '✓ SIGNED' : '⏳ PENDING'}</strong>
                      </div>
                      <div style={{ padding: '8px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                        <div>WARDEN</div>
                        <strong style={{ color: '#10b981' }}>{selected.status === 'approved' ? '✓ SIGNED' : '⏳ PENDING'}</strong>
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
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: '8px 0', fontWeight: 'bold', width: '140px' }}>Seminar Hall:</td><td>{selected.serviceId?.name || 'N/A'}</td></tr>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: '8px 0', fontWeight: 'bold' }}>Faculty Name:</td><td>{selected.user?.name || 'N/A'}</td></tr>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: '8px 0', fontWeight: 'bold' }}>Department:</td><td>{selected.department || selected.user?.department || 'N/A'}</td></tr>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: '8px 0', fontWeight: 'bold' }}>Event Date:</td><td>{selected.date || selected.hallDate || 'N/A'}</td></tr>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: '8px 0', fontWeight: 'bold' }}>Event Time:</td><td>{formatTime12h(selected.startTime || selected.hallStartTime)} – {formatTime12h(selected.endTime || selected.hallEndTime)}</td></tr>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: '8px 0', fontWeight: 'bold' }}>Purpose:</td><td>{selected.purpose || 'N/A'}</td></tr>
                      <tr><td style={{ padding: '8px 0', fontWeight: 'bold' }}>Expected Attendees:</td><td>{selected.attendees || 'N/A'}</td></tr>
                    </tbody>
                  </table>
                </div>
              )}
              
              {selected.approvals && selected.approvals.length > 0 && (
                <div style={{ marginTop: 20, borderTop: '1px dashed #cbd5e1', paddingTop: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 'bold', display: 'block', marginBottom: 8, color: '#334155' }}>Approval Trail Details:</span>
                  {selected.approvals.map((ap, idx) => (
                    <div key={idx} style={{ fontSize: 12, color: '#475569', marginBottom: 6 }}>
                      ⏳ Stage <strong>{ap.stage}</strong>: {ap.status === 'approved' ? '✅ Approved' : '❌ Rejected'} {ap.approvedBy ? `by ${ap.approvedBy.name || 'Approver'}${ap.stage === 'HOD' && ap.approvedBy.department ? ` (${ap.approvedBy.department})` : ''}` : ''}
                      {ap.comment && <div style={{ fontSize: 11, fontStyle: 'italic', marginLeft: 14, color: '#64748b' }}>"{ap.comment}"</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Transport Manager Driver Allocation Form */}
            {selected.status === 'pending_transport' && canApproveBooking(selected) && (
              <div style={{ background: '#f3f4f6', padding: '16px', borderRadius: '8px', marginTop: '16px' }}>
                <h4 style={{ margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px', color: '#1e3a8a' }}>👨‍✈️ Driver & Vehicle Allocation details</h4>
                
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Driver Name <span style={{ color: 'red' }}>*</span></label>
                  <input type="text" className="form-input" placeholder="e.g. Mr. Kumar" value={driverName} onChange={e => setDriverName(e.target.value)} required />
                </div>
                
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Driver Phone Number <span style={{ color: 'red' }}>*</span></label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. 9876543210" 
                    value={driverPhone} 
                    onChange={e => setDriverPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} 
                    required 
                  />
                </div>
                
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Total Kilometers <span style={{ color: 'red' }}>*</span></label>
                  <input type="text" className="form-input" placeholder="e.g. 150 km" value={totalKm} onChange={e => setTotalKm(e.target.value)} required />
                </div>
              </div>
            )}

            <div className="form-group" style={{ marginTop: 24 }}>
              <label className="form-label">Approver Note / Comment</label>
              <textarea className="form-input" rows={2} placeholder="Add remarks or notes..."
                value={adminNote} onChange={e => setAdminNote(e.target.value)} style={{ resize: 'vertical' }} />
            </div>

            {isPending(selected.status) ? (
              canApproveBooking(selected) ? (
                <div className={styles.decisionBtns}>
                  <button className="btn-danger" onClick={() => showConfirmation('rejected')} disabled={updating}>
                    ❌ Reject
                  </button>
                  <button className="btn-success" onClick={() => showConfirmation('approved')} disabled={updating}>
                    ✅ {selected.status === 'pending_transport' ? '🚌 Allocate & Approve' : '✅ Approve'}
                  </button>
                </div>
              ) : (
                <div style={{ marginTop: 16, fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic', textAlign: 'center', background: 'rgba(0,0,0,0.02)', padding: '10px', borderRadius: '4px' }}>
                  🔒 Waiting for <strong>{selected.status.replace('pending_', '').toUpperCase()}</strong> approval. You do not have authority to sign off this stage.
                </div>
              )
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
                onClick={() => pendingAction === 'cancel' ? handleCancel() : handleDecision(pendingAction === 'approved' ? 'approve' : 'reject')}
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
