'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

export default function AdminDashboard() {
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
        const halls = await hallsRes.json();
        const vehicles = await vehiclesRes.json();
        const rooms = await roomsRes.json();
        const bookings = await bookingsRes.json();
        const user = meRes.ok ? await meRes.json() : null;
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

        setStats({
          halls: Array.isArray(halls) ? halls.length : 0,
          vehicles: Array.isArray(vehicles) ? vehicles.length : 0,
          rooms: Array.isArray(rooms) ? rooms.length : 0,
          totalBookings: b.length,
          pendingCount: pendingBookings.length,
        });
        setRecent(pendingBookings.slice(0, 6));
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
        { icon: '⏳', label: 'Awaiting Your Approval', value: stats.pendingCount, gradient: 'from-amber-500 to-orange-650', shadow: 'shadow-indigo-500/15' },
        { icon: '📅', label: 'System Booking Volume', value: stats.totalBookings, gradient: 'from-indigo-500 to-indigo-650', shadow: 'shadow-indigo-500/15' }
      ]
    : [
        { icon: '🏛️', label: 'Total Halls', value: stats.halls, gradient: 'from-violet-500 to-indigo-650', shadow: 'shadow-indigo-500/15' },
        { icon: '🚗', label: 'Total Vehicles', value: stats.vehicles, gradient: 'from-sky-500 to-blue-650', shadow: 'shadow-blue-500/15' },
        { icon: '🏨', label: 'Total Rooms', value: stats.rooms, gradient: 'from-emerald-500 to-teal-650', shadow: 'shadow-emerald-500/15' },
        { icon: '📅', label: 'Total Bookings', value: stats.totalBookings, gradient: 'from-amber-500 to-orange-650', shadow: 'shadow-amber-500/15' },
      ];

  const isSuperAdmin = currentUser?.role === 'super-admin';

  let QUICK_TOOLS = [
    { href: '/admin/bookings', icon: '📋', label: 'Manage Bookings', sub: 'Review, filter & approve user requests', color: 'border-violet-100/80 hover:border-violet-300 hover:bg-violet-50/30 text-violet-600 bg-white' },
  ];

  if (isSuperAdmin) {
    QUICK_TOOLS.unshift({ href: '/admin/super-admin', icon: '👑', label: 'Super Admin Panel', sub: 'Configure administrators, user permissions & settings', color: 'border-purple-100/80 hover:border-purple-300 hover:bg-purple-50/30 text-purple-600 bg-white' });
  }

  // Only expose asset inventories and booking portal redirects to non-approver admin roles
  if (!isWorkflowApprover) {
    if (currentUser?.role === 'super-admin' || currentUser?.assignedServices?.includes('halls') || currentUser?.permissions?.hallAccess !== false) {
      QUICK_TOOLS.push({ href: '/admin/halls', icon: '🏢', label: 'Halls Inventory', sub: 'Add, update or delete event halls data', color: 'border-indigo-100/80 hover:border-indigo-300 hover:bg-indigo-50/30 text-indigo-600 bg-white' });
      QUICK_TOOLS.push({ href: '/halls', icon: '🏛️', label: 'Book a Hall', sub: 'Access portal to book seminar/conference halls', color: 'border-amber-100/80 hover:border-amber-300 hover:bg-amber-50/30 text-amber-600 bg-white' });
    }
    if (currentUser?.role === 'super-admin' || currentUser?.assignedServices?.includes('vehicles') || currentUser?.permissions?.vehicleAccess !== false) {
      QUICK_TOOLS.push({ href: '/admin/vehicles', icon: '🚗', label: 'Vehicles Inventory', sub: 'Manage vehicle types and registrations', color: 'border-sky-100/80 hover:border-sky-300 hover:bg-sky-50/30 text-sky-600 bg-white' });
      QUICK_TOOLS.push({ href: '/vehicle-booking', icon: '🚗', label: 'Book a Vehicle', sub: 'Access portal to reserve campus vehicles', color: 'border-blue-100/80 hover:border-blue-300 hover:bg-blue-50/30 text-blue-600 bg-white' });
    }
    if (currentUser?.role === 'super-admin' || currentUser?.assignedServices?.includes('rooms') || currentUser?.permissions?.guestRoomAccess !== false) {
      QUICK_TOOLS.push({ href: '/admin/rooms', icon: '🏨', label: 'Rooms Inventory', sub: 'Control hostel accommodation statuses', color: 'border-emerald-100/80 hover:border-emerald-300 hover:bg-emerald-50/30 text-emerald-600 bg-white' });
      QUICK_TOOLS.push({ href: '/room-booking', icon: '🛏️', label: 'Book a Room', sub: 'Access portal to reserve hostel/guest rooms', color: 'border-teal-100/80 hover:border-teal-300 hover:bg-teal-50/30 text-teal-600 bg-white' });
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-slate-550 text-sm font-semibold tracking-wide">Loading workspace...</p>
      </div>
    );
  }

  const welcomeName = currentUser?.name || 'Admin';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.4 }}
      className="w-full p-10 flex flex-col gap-12 min-h-screen bg-[#f8fafc]"
    >
      {/* Header Panel */}
      <header className="flex justify-between items-center gap-6 pb-6 border-b border-slate-200/60 mb-12">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-widest mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
            System Control Panel
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            Welcome back, {welcomeName} <span className="animate-wave inline-block origin-[70%_70%]">👋</span>
          </h1>
          <p className="text-slate-400 text-sm font-medium mt-1">Here&apos;s an overview of your hall bookings and fleet management tools.</p>
        </div>
        <div className="flex flex-wrap gap-4 items-center shrink-0">
          {isSuperAdmin && (
            <Link 
              href="/admin/super-admin" 
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold text-sm rounded-xl shadow-md shadow-indigo-600/10 hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 hover:-translate-y-0.5"
            >
              👑 Super Admin Panel
            </Link>
          )}
          <Link 
            href="/admin/bookings?status=pending" 
            className="px-6 py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-extrabold text-sm rounded-xl shadow-sm hover:border-slate-350 transition-all duration-200 flex items-center justify-center gap-2 hover:-translate-y-0.5"
          >
            ⏳ Review Pending ({stats.pendingCount})
          </Link>
        </div>
      </header>

      {/* Stats Cards Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
        {STAT_CARDS.map((s, idx) => (
          <motion.div 
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.08, duration: 0.35 }}
            className="bg-white p-6 min-h-[220px] rounded-[20px] border border-slate-200/60 shadow-[0_10px_25px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_28px_rgba(0,0,0,0.06)] transition-all duration-300 flex flex-col justify-center items-center text-center gap-3 group hover:-translate-y-1"
          >
            {/* Icon Top Center in a soft colored background box */}
            <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${s.gradient} text-white flex items-center justify-center text-xl shadow-md ${s.shadow} mx-auto`}>
              {s.icon}
            </div>
            {/* Label */}
            <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">{s.label}</span>
            {/* Value */}
            <span className="text-[32px] font-bold text-slate-900 tracking-tight leading-none group-hover:scale-105 transition-transform duration-300 block">{s.value}</span>
            {/* Footer Text */}
            <div className="text-[10px] font-bold text-slate-400 group-hover:text-slate-600 transition-colors">
              Real-time update
            </div>
          </motion.div>
        ))}
      </section>

      {/* Quick Tools Section */}
      <section className="space-y-6 mt-8">
        <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-4">
          <span className="w-2 h-4 bg-indigo-600 rounded-full" />
          Quick Operations
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {QUICK_TOOLS.map((t) => (
            <Link key={t.href} href={t.href} className="group h-full">
              <div className="p-6 min-h-[280px] rounded-[20px] border border-slate-200/80 bg-white hover:border-indigo-200 shadow-[0_10px_25px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_28px_rgba(0,0,0,0.06)] transition-all duration-300 h-full flex flex-col justify-center items-center text-center gap-4 hover:-translate-y-1.5">
                {/* Icon Top Center wrapped in a soft background card box */}
                <div className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-xl shadow-sm mx-auto">
                  <span className="text-xl group-hover:scale-110 transition-transform duration-350">{t.icon}</span>
                </div>
                {/* Title */}
                <span className="font-extrabold text-slate-900 text-base tracking-tight">{t.label}</span>
                {/* Description */}
                <p className="text-slate-550 text-xs font-medium leading-relaxed max-w-[80%]">{t.sub}</p>
                {/* Link */}
                <div className="text-[11px] font-extrabold text-slate-550 group-hover:text-slate-855 flex items-center gap-1.5 transition-colors self-center">
                  Open Module <span className="group-hover:translate-x-1.5 transition-transform duration-250">→</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Pending Bookings Table */}
      <section className="space-y-5 mt-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-4 bg-indigo-600 rounded-full" />
            Pending Booking Requests
          </h3>
          <Link href="/admin/bookings" className="text-xs font-extrabold text-indigo-650 hover:text-indigo-750 transition-colors flex items-center gap-1">
            View All Bookings <span className="text-sm">↗</span>
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/85 overflow-hidden">
          {recent.length === 0 ? (
            <div className="min-h-[250px] bg-slate-50/20 border-dashed border-2 border-slate-200/60 rounded-2xl p-8 text-center flex flex-col items-center justify-center gap-4">
              <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl border border-emerald-100 shadow-sm animate-pulse">
                ✅
              </div>
              <div className="max-w-xs flex flex-col items-center justify-center">
                <p className="font-extrabold text-slate-900 text-sm">All Caught Up!</p>
                <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">No pending booking requests require review at this time.</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-550 text-[10px] font-extrabold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4.5 font-bold">User Details</th>
                    <th className="px-6 py-4.5 font-bold">Service Details</th>
                    <th className="px-6 py-4.5 font-bold">Purpose</th>
                    <th className="px-6 py-4.5 font-bold">Status</th>
                    <th className="px-6 py-4.5 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recent.map((b) => {
                    const d = getDetails(b);
                    return (
                      <tr key={b._id} className="hover:bg-slate-50/30 transition-colors">
                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-gradient-to-tr from-indigo-500 to-purple-650 rounded-full flex items-center justify-center text-white font-black text-sm shadow-sm">
                              {b.user?.name?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div>
                              <div className="text-sm font-extrabold text-slate-900 leading-tight">
                                {b.user?.name || 'Unknown'}
                              </div>
                              <div className="text-xs text-slate-450 mt-1.5 font-medium">
                                {b.user?.department || b.user?.role || 'Guest User'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className="text-sm font-extrabold text-slate-800">{d.resourceName}</div>
                          <div className="text-xs text-slate-500 mt-1.5 font-medium">{d.date}</div>
                          {d.time && <div className="text-xs text-slate-440 mt-1 font-medium">{d.time}</div>}
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap text-xs font-semibold text-slate-555 max-w-[200px] truncate">
                          {d.info || '—'}
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap">
                          <span className="px-3 py-0.5 text-[10px] font-extrabold rounded-full uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                            {b.status}
                          </span>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap text-right text-xs font-bold">
                          <Link href={`/admin/bookings?bookingId=${b._id}`} className="px-4 py-2.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-650 hover:text-indigo-700 rounded-xl shadow-sm transition-all duration-200">
                            Review Request
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </motion.div>
  );
}
