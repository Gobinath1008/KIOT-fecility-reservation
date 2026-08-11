'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

const ClipboardIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15a2.25 2.25 0 0 1 2.15 1.586m-5.8 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v10.5c0 .621.504 1.125 1.125 1.125h14.25c.621 0 1.125-.504 1.125-1.125V8.625c0-.621-.504-1.125-1.125-1.125H17.25" />
  </svg>
);

const AcademicCapIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.57 50.57 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.906 59.906 0 0 1 10.399 5.84c-.89.244-1.777.514-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M12 13.49v.01" />
  </svg>
);

const BuildingIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h18" />
  </svg>
);

const CarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.5m-9-3h-1.5m10.5 0H18m0 0H6.75A2.25 2.25 0 0 1 4.5 13.5v-3a2.25 2.25 0 0 1 2.25-2.25h10.5A2.25 2.25 0 0 1 19.5 10.5v3a2.25 2.25 0 0 1-2.25 2.25M6.75 8.25V6.375c0-.621.504-1.125 1.125-1.125h8.25c.621 0 1.125.504 1.125 1.125V8.25m-11.25 3h12" />
  </svg>
);

const BedIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M5.25 5.25h13.5c1.104 0 2 .896 2 2v11.5c0 .276-.224.5-.5.5h-17c-.276 0-.5-.224-.5-.5V7.25c0-1.104.896-2 2-2Z" />
  </svg>
);

const DocumentIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
  </svg>
);

const HourglassIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-sky-500 animate-pulse">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-emerald-500">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

const LinkIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-amber-500">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
  </svg>
);

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
  try {
    const [h, m] = timeStr.split(':');
    const hours = parseInt(h);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${m} ${ampm}`;
  } catch (err) {
    return timeStr;
  }
};

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({ halls: 0, vehicles: 0, rooms: 0, totalBookings: 0, pendingCount: 0 });
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [hallsRes, vehiclesRes, roomsRes, bookingsRes, meRes] = await Promise.all([
          fetch('/api/halls'),
          fetch('/api/vehicles'),
          fetch('/api/rooms'),
          fetch('/api/bookings?all=true'),
          fetch('/api/auth/me')
        ]);
        
        const safeJson = async (res, defaultValue = []) => {
          if (!res.ok) return defaultValue;
          try {
            const text = await res.text();
            return text ? JSON.parse(text) : defaultValue;
          } catch {
            return defaultValue;
          }
        };

        const user = meRes.ok ? await safeJson(meRes, null) : null;
        const halls = await safeJson(hallsRes);
        const vehicles = await safeJson(vehiclesRes);
        const rooms = await safeJson(roomsRes);
        const bookings = await safeJson(bookingsRes);
        setCurrentUser(user);

        const b = Array.isArray(bookings) ? bookings : [];
        const isWorkflowApprover = ['hod', 'principal', 'ao', 'transport_manager', 'hostel_warden'].includes(user?.role);
        
        const canApproveBooking = (bookingItem) => {
          if (!user) return false;
          if (user.role === 'super-admin' || user.role === 'admin') return true;
          
          if (bookingItem.status === 'pending_hod') {
            const bDept = bookingItem.department || bookingItem.user?.department;
            return user.role === 'hod' && user.department === bDept;
          }
          if (bookingItem.status === 'pending_principal') {
            return user.role === 'principal';
          }
          if (bookingItem.status === 'pending_ao') {
            return user.role === 'ao';
          }
          if (bookingItem.status === 'pending_transport') {
            return user.role === 'transport_manager';
          }
          if (bookingItem.status === 'pending_warden') {
            return user.role === 'hostel_warden';
          }
          return false;
        };

        const isPending = (status) => ['pending', 'pending_hod', 'pending_principal', 'pending_ao', 'pending_transport', 'pending_warden'].includes(status);
        
        const pendingBookings = b.filter(x => {
          if (isWorkflowApprover) {
            return isPending(x.status) && canApproveBooking(x);
          }
          return isPending(x.status);
        });

        let filteredBookings = [];
        let deptPendingCount = 0;
        let deptApprovedCount = 0;

        if (user?.role === 'hod') {
          filteredBookings = b.filter(x => {
            const bDept = x.department || x.user?.department;
            const isSameDept = user.department && bDept === user.department;
            const rtStatus = getRealTimeStatus(x);
            const isPendingForHod = x.status === 'pending_hod';
            const isApproved = x.status === 'approved' || rtStatus === 'live';
            if (isSameDept && isPendingForHod) deptPendingCount++;
            if (isSameDept && isApproved) deptApprovedCount++;
            return isSameDept && (isPendingForHod || isApproved);
          });
        } else if (user?.role === 'transport_manager') {
          filteredBookings = b.filter(x => x.serviceType === 'vehicle');
          filteredBookings.forEach(x => {
            const rtStatus = getRealTimeStatus(x);
            if (x.status === 'pending_transport') deptPendingCount++;
            if (x.status === 'approved' || rtStatus === 'live') deptApprovedCount++;
          });
        } else if (user?.role === 'hostel_warden') {
          filteredBookings = b.filter(x => x.serviceType === 'room');
          filteredBookings.forEach(x => {
            const rtStatus = getRealTimeStatus(x);
            if (x.status === 'pending_warden') deptPendingCount++;
            if (x.status === 'approved' || rtStatus === 'live') deptApprovedCount++;
          });
        } else {
          filteredBookings = b;
          filteredBookings.forEach(x => {
            const rtStatus = getRealTimeStatus(x);
            if (isPending(x.status)) deptPendingCount++;
            if (x.status === 'approved' || rtStatus === 'live') deptApprovedCount++;
          });
        }

        setStats({
          halls: Array.isArray(halls) ? halls.length : 0,
          vehicles: Array.isArray(vehicles) ? vehicles.length : 0,
          rooms: Array.isArray(rooms) ? rooms.length : 0,
          totalBookings: b.length,
          pendingCount: pendingBookings.length,
          deptPendingCount,
          deptApprovedCount,
        });
        setRecent(filteredBookings.slice(0, 10));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const formatTime12h = (timeStr) => {
    if (!timeStr) return '';
    const [hourStr, minStr] = timeStr.split(':');
    const hour = parseInt(hourStr);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 === 0 ? 12 : hour % 12;
    return `${String(hour12).padStart(2, '0')}:${minStr} ${ampm}`;
  };

  const getDetails = (b) => {
    const resourceName = b.serviceType === 'vehicle'
      ? `🚗 ${b.serviceId?.name || 'Vehicle'} (${b.serviceId?.registrationNumber || 'N/A'})`
      : b.serviceType === 'room'
        ? `🏨 ${b.serviceId?.name || 'Room'} #${b.serviceId?.roomNumber || 'N/A'}`
        : `🏛️ ${b.serviceId?.name || 'Event Hall'}`;

    if (b.serviceType === 'room') {
      const checkInDate = b.roomCheckInDate ? format(new Date(b.roomCheckInDate), 'MMM d, yyyy') : '—';
      const checkOutDate = b.roomCheckOutDate ? format(new Date(b.roomCheckOutDate), 'MMM d, yyyy') : '—';
      const checkInTime = formatTime12h(b.roomCheckInTime || '14:00');
      const checkOutTime = formatTime12h(b.roomCheckOutTime || '12:00');
      const date = `Check-in: ${checkInDate}`;
      const time = `${checkInTime} → Check-out: ${checkOutTime}`;
      const info = b.roomPurpose || b.specialRequests || '';
      return { date, time, info, resourceName };
    }

    const rawDate = b.hallDate || b.vehiclePickupDate || b.roomCheckInDate || '';
    const date = rawDate ? format(new Date(rawDate), 'MMM d, yyyy') : '—';
    const startTimeStr = b.hallStartTime || b.vehiclePickupTime || b.roomCheckInTime || '';
    const endTimeStr = b.hallEndTime || b.vehicleReturnTime || b.roomCheckOutTime || '';
    const time = startTimeStr && endTimeStr ? `${formatTime12h(startTimeStr)} – ${formatTime12h(endTimeStr)}` : '';
    const info = b.purpose || b.vehicleDetails?.description || b.roomPurpose || '';
    return { date, time, info, resourceName };
  };

  const isWorkflowApprover = ['hod', 'principal', 'ao', 'transport_manager', 'hostel_warden'].includes(currentUser?.role);

  const STAT_CARDS = isWorkflowApprover
    ? [
        { icon: <ClipboardIcon />, label: 'Total Bookings', value: stats.totalBookings, link: '/admin/bookings' },
        { icon: <HourglassIcon />, label: 'Pending Approvals', value: stats.pendingCount, link: '/admin/bookings?status=pending' }
      ]
    : [
        { icon: <BuildingIcon />, label: 'Halls Available', value: stats.halls, link: '/admin/halls' },
        { icon: <CarIcon />, label: 'Vehicles Available', value: stats.vehicles, link: '/admin/vehicles' },
        { icon: <BedIcon />, label: 'Rooms Available', value: stats.rooms, link: '/admin/rooms' },
        { icon: <ClipboardIcon />, label: 'Total Bookings', value: stats.totalBookings, link: '/admin/bookings' },
        { icon: <HourglassIcon />, label: 'Pending Approvals', value: stats.pendingCount, link: '/admin/bookings?status=pending' }
      ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-slate-550 text-sm font-semibold tracking-wide">Loading workspace...</p>
      </div>
    );
  }

  const welcomeName = currentUser?.name || 'admin';
  const displayRole = currentUser?.role === 'hod' ? 'Hod' : currentUser?.role ? currentUser.role.replace('_', ' ') : 'Admin';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.4 }}
      className="dashboard-page-container flex flex-col gap-10 p-6 md:p-10"
    >
      {/* Welcome Header Panel */}
      <header className="flex flex-col gap-3">
        <div>
          <h1 className="text-5xl font-extrabold tracking-tight text-slate-800" style={{ marginBottom: '8px', fontSize: '2.8rem' }}>
            Welcome, <span className="font-extrabold" style={{ color: '#F59E0B' }}>{welcomeName}</span>
          </h1>
          <p className="font-semibold text-base italic" style={{ color: '#2563EB', marginBottom: '24px' }}>
            Recognizing learning beyond the classroom.
          </p>
          <div className="flex flex-wrap gap-x-12 gap-y-2 text-sm font-semibold text-slate-700">
            <div>
              <span>Department:</span>{' '}
              <span className="text-slate-500 font-medium pl-1">{currentUser?.department || 'B.E Mechanical Engineering'}</span>
            </div>
            <div>
              <span>Role:</span>{' '}
              <span className="font-bold pl-1 hover:underline cursor-pointer" style={{ color: '#3b82f6' }}>{displayRole}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Cards Section */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4 max-w-4xl">
        {/* Pending Requests Card */}
        <div 
          onClick={() => router.push('/admin/bookings?status=pending')}
          style={{ cursor: 'pointer' }}
          className="bg-white rounded-[24px] p-6 flex items-center gap-4 border border-slate-100/85 shadow-[0_8px_30px_rgb(0,0,0,0.015)] hover:border-amber-250 hover:shadow-md transition-all"
        >
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-amber-500 shrink-0" style={{ backgroundColor: '#FEF3C7' }}>
            <HourglassIcon />
          </div>
          <div>
            <span className="text-sm font-semibold text-slate-400 block uppercase tracking-wider">Pending Requests</span>
            <span className="text-3xl font-extrabold text-slate-800 block mt-1">{stats.deptPendingCount}</span>
          </div>
        </div>

        {/* Approved/Booked Card */}
        <div 
          onClick={() => router.push('/admin/bookings?status=approved')}
          style={{ cursor: 'pointer' }}
          className="bg-white rounded-[24px] p-6 flex items-center gap-4 border border-slate-100/85 shadow-[0_8px_30px_rgb(0,0,0,0.015)] hover:border-emerald-250 hover:shadow-md transition-all"
        >
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-emerald-500 shrink-0" style={{ backgroundColor: '#D1FAE5' }}>
            <CheckIcon />
          </div>
          <div>
            <span className="text-sm font-semibold text-slate-400 block uppercase tracking-wider">Booked / Approved</span>
            <span className="text-3xl font-extrabold text-slate-800 block mt-1">{stats.deptApprovedCount}</span>
          </div>
        </div>
      </section>

      {/* Recent Bookings Section */}
      <section className="bg-white rounded-2xl border border-slate-200/50 p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <DocumentIcon /> {currentUser?.role === 'hod' ? 'Department Bookings & Approvals (Pending & Approved)' : 'Recent Reservation Requests'}
        </h3>
        {recent.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">No bookings found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-550">
              <thead className="text-xs uppercase bg-slate-50 text-slate-400 font-bold">
                <tr>
                  <th className="px-6 py-3">Booked By</th>
                  <th className="px-6 py-3">Asset Requested</th>
                  <th className="px-6 py-3">Event Date / Time</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recent.map((b) => {
                  const details = getDetails(b);
                  const rtStatus = getRealTimeStatus(b);
                  const statusColors = {
                    pending: 'bg-amber-50 text-amber-600 border-amber-100',
                    pending_hod: 'bg-amber-50 text-amber-600 border-amber-100',
                    pending_admin: 'bg-amber-50 text-amber-600 border-amber-100',
                    pending_principal: 'bg-amber-50 text-amber-600 border-amber-100',
                    pending_ao: 'bg-amber-50 text-amber-600 border-amber-100',
                    pending_transport: 'bg-amber-50 text-amber-600 border-amber-100',
                    pending_warden: 'bg-amber-50 text-amber-600 border-amber-100',
                    approved: 'bg-emerald-50 text-emerald-600 border-emerald-100',
                    rejected: 'bg-rose-50 text-rose-600 border-rose-100',
                    cancelled: 'bg-slate-50 text-slate-600 border-slate-100',
                    live: 'bg-indigo-50 text-indigo-600 border-indigo-100',
                    finished: 'bg-sky-50 text-sky-600 border-sky-100'
                  };
                  return (
                    <tr 
                      key={b._id} 
                      onClick={() => router.push(`/admin/bookings?selected=${b._id}`)}
                      style={{ cursor: 'pointer' }}
                      className="hover:bg-slate-50/75 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <strong className="text-slate-800 font-semibold block">{b.guestName || b.user?.name || 'N/A'}</strong>
                        <span className="text-xs text-slate-400 font-medium">{b.department || b.user?.department || 'N/A'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-slate-700 font-medium block">{details.resourceName}</span>
                        <span className="text-xs text-slate-400 block mt-0.5">{details.info}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-slate-700 font-medium block">{details.date}</span>
                        <span className="text-xs text-slate-450 block mt-0.5">{details.time}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${statusColors[rtStatus] || statusColors[b.status] || 'bg-slate-50'}`}>
                          {(rtStatus || b.status).toUpperCase().replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </motion.div>
  );
}
