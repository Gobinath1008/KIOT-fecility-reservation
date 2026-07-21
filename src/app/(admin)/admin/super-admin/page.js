'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts';
import { toast } from 'react-hot-toast';
import { openBookingPrintWindow } from '../../../../lib/bookingPrint';

const formatTime12h = (timeStr) => {
  if (!timeStr) return '';
  const [hourStr, minStr] = timeStr.split(':');
  const hour = parseInt(hourStr);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${String(hour12).padStart(2, '0')}:${minStr} ${ampm}`;
};

export default function SuperAdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [admins, setAdmins] = useState([]);
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [halls, setHalls] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Modals
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(null);
  
  const [userSearch, setUserSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [newAdmin, setNewAdmin] = useState({ name: '', email: '', phone: '', password: '', assignedServices: ['halls', 'vehicles', 'rooms'] });
  const [adminLoading, setAdminLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(userSearch), 400);
    return () => clearTimeout(timer);
  }, [userSearch]);

  const fetchData = useCallback(async () => {
    try {
      const [adminsRes, usersRes, bookingsRes, hallsRes, vehiclesRes, roomsRes] = await Promise.all([
        fetch('/api/admins'),
        fetch(`/api/users?search=${debouncedSearch}&status=all&role=all&blocked=all`),
        fetch('/api/bookings?all=true'),
        fetch('/api/halls'),
        fetch('/api/vehicles'),
        fetch('/api/rooms')
      ]);

      const adminData = await adminsRes.json();
      const userData = await usersRes.json();
      const bookingsData = await bookingsRes.json();
      const hallsData = await hallsRes.json();
      const vehiclesData = await vehiclesRes.json();
      const roomsData = await roomsRes.json();

      setAdmins(Array.isArray(adminData) ? adminData : []);
      setUsers(Array.isArray(userData.users) ? userData.users : []);
      setBookings(Array.isArray(bookingsData) ? bookingsData : []);
      setHalls(Array.isArray(hallsData) ? hallsData : []);
      setVehicles(Array.isArray(vehiclesData) ? vehiclesData : []);
      setRooms(Array.isArray(roomsData) ? roomsData : []);
    } catch {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void fetchData();
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [fetchData]);

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    if (!newAdmin.name || !newAdmin.email || !newAdmin.password) {
      toast.error('Please fill all required fields');
      return;
    }
    
    setAdminLoading(true);
    try {
      const res = await fetch('/api/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAdmin)
      });

      if (res.ok) {
        setShowAdminModal(false);
        setNewAdmin({ name: '', email: '', phone: '', password: '', assignedServices: ['halls', 'vehicles', 'rooms'] });
        fetchData();
        toast.success('Admin created successfully!');
      } else {
        const data = await res.json();
        toast.error(data.message || 'Failed to create admin');
      }
    } catch (error) {
      toast.error('Failed to create admin');
    } finally {
      setAdminLoading(false);
    }
  };

  const handleUpdateUserPermissions = async (userId, data) => {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        const updatedUser = await res.json();
        fetchData();
        if (showUserModal?._id === userId) {
          setShowUserModal(updatedUser);
        }
        toast.success('User updated successfully');
      } else {
        const err = await res.json();
        toast.error(err.message || 'Failed to update permissions');
      }
    } catch (error) {
      toast.error('Error updating permissions');
    }
  };

  const handleDeleteAdmin = async (adminId) => {
    if (!confirm('Are you sure you want to revoke this admin?')) return;
    try {
      const res = await fetch(`/api/admins?id=${adminId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
        toast.success('Admin revoked successfully');
      } else {
        toast.error('Failed to revoke admin');
      }
    } catch (error) {
      toast.error('Error revoking admin');
    }
  };

  const getBookingStats = () => {
    if (!bookings.length) return { total: 0, pending: 0, approved: 0, rejected: 0, cancelled: 0 };
    return {
      total: bookings.length,
      pending: bookings.filter(b => b.status === 'pending').length,
      approved: bookings.filter(b => b.status === 'approved').length,
      rejected: bookings.filter(b => b.status === 'rejected').length,
      cancelled: bookings.filter(b => b.status === 'cancelled').length,
    };
  };

  const bookingStats = getBookingStats();

  const handlePrint = async () => {
    await openBookingPrintWindow(bookings, {
      title: 'Booking Report',
      subtitle: 'Super Admin Booking Logs'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin mb-4"></div>
        <p className="text-sm text-slate-500 font-medium">Loading workspace...</p>
      </div>
    );
  }

  return (
    <div className="w-full p-10 flex flex-col gap-12 min-h-screen bg-slate-50/30 selection:bg-indigo-100 selection:text-indigo-900">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Dashboard Title & Header */}
        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: '24px', marginBottom: '48px', flexWrap: 'wrap' }}>
          <div>
            <h1 className="text-[36px] font-extrabold tracking-tight text-slate-900 flex items-center gap-3" style={{ fontSize: '36px', fontWeight: '800', color: '#0F172A', letterSpacing: '-0.025em' }}>
              <span className="p-2.5 bg-gradient-to-br from-indigo-50 to-violet-50 text-indigo-600 rounded-2xl shadow-sm border border-indigo-100/50 leading-none">👑</span>
              Super Admin Workspace
            </h1>
            <p className="text-slate-400 font-medium mt-1">Manage administrators, control user permissions, and monitor system booking records.</p>
          </div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <Link href="/" className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition-all border border-slate-200 shadow-sm flex items-center gap-2 hover:-translate-y-0.5" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
              Public Site ↗
            </Link>
            <button
              onClick={() => setShowAdminModal(true)}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold rounded-xl transition-all shadow-md shadow-indigo-600/10 flex items-center gap-2 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-600/20"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              + New Admin
            </button>
          </div>
        </div>

        {/* Outer Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Sidebar Floating Card - 3 columns */}
          <aside className="lg:col-span-3 bg-white border border-slate-200/80 rounded-2xl shadow-sm sticky top-24 z-30 p-6">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-700 flex items-center justify-center shadow-md shadow-indigo-600/15">
                <span className="text-white text-sm font-black tracking-wider">SA</span>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 leading-tight">Control Panel</h3>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-0.5">System Menu</p>
              </div>
            </div>

            <nav className="flex flex-col gap-2">
              {[
                { id: 'overview', label: 'Overview', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /> },
                { id: 'users', label: 'Users', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /> },
                { id: 'admins', label: 'Administrators', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /> },
                { id: 'bookings', label: 'Bookings', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /> },
                { id: 'services', label: 'Services', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /> }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`transition-all duration-300 group ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/15 translate-x-1'
                      : 'text-slate-655 hover:text-indigo-600 hover:bg-indigo-50/40 hover:translate-x-1'
                  }`}
                  style={{
                    padding: '14px 20px',
                    marginBottom: '4px',
                    borderRadius: '12px',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className={`h-5 w-5 transition-transform duration-300 group-hover:scale-110 ${
                      activeTab === tab.id ? 'text-white' : 'text-slate-400 group-hover:text-indigo-650'
                    }`} 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor" 
                    strokeWidth={2} 
                    style={{ flexShrink: 0 }}
                  >
                    {tab.icon}
                  </svg>
                  {tab.label}
                </button>
              ))}
            </nav>
          </aside>

          {/* Tab Content Panel - 9 columns */}
          <main className="lg:col-span-9">
        
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" style={{ marginBottom: '32px' }}>
              {[
                { label: 'Total Halls', value: halls.length, trend: 'Halls', isPositive: true, gradient: 'from-violet-500 to-indigo-650', icon: '🏛️', shadow: 'shadow-indigo-500/15' },
                { label: 'Total Vehicles', value: vehicles.length, trend: 'Vehicles', isPositive: true, gradient: 'from-sky-500 to-blue-650', icon: '🚗', shadow: 'shadow-blue-500/15' },
                { label: 'Total Rooms', value: rooms.length, trend: 'Rooms', isPositive: true, gradient: 'from-emerald-500 to-teal-650', icon: '🏨', shadow: 'shadow-emerald-500/15' },
                { label: 'Total Bookings', value: bookingStats.total, trend: 'Bookings', isPositive: true, gradient: 'from-amber-500 to-orange-650', icon: '📅', shadow: 'shadow-amber-500/15' },
              ].map((stat, idx) => (
                <div key={idx} className="bg-white p-6 rounded-[20px] border border-slate-200/60 shadow-[0_10px_25px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_28px_rgba(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-center items-center text-center gap-3 group" style={{ minHeight: '220px' }}>
                  {/* Icon Top Center in a soft colored background box */}
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${stat.gradient} text-white flex items-center justify-center text-xl shadow-md ${stat.shadow} mx-auto`}>
                    {stat.icon}
                  </div>
                  {/* Label */}
                  <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">{stat.label}</span>
                  {/* Value */}
                  <div className="flex items-baseline gap-2 justify-center">
                    <span className="text-[32px] font-bold text-slate-900 tracking-tight leading-none group-hover:scale-105 transition-transform duration-300 block">{stat.value}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none ${stat.isPositive ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                      {stat.trend}
                    </span>
                  </div>
                  {/* Footer Text */}
                  <div className="text-[10px] font-bold text-slate-400 group-hover:text-slate-600 transition-colors">
                    Real-time update
                  </div>
                </div>
              ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" style={{ marginTop: '16px' }}>
              <div className="lg:col-span-2 bg-white rounded-2xl p-8 border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-300 min-h-[400px] flex flex-col justify-between">
                <h3 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <span className="w-1.5 h-3 bg-indigo-600 rounded-full"></span>
                  Booking Activity
                </h3>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={[
                      { name: 'Halls', count: bookings.filter(b => b.serviceType === 'hall').length },
                      { name: 'Vehicles', count: bookings.filter(b => b.serviceType === 'vehicle').length },
                      { name: 'Rooms', count: bookings.filter(b => b.serviceType === 'room').length },
                    ]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.95}/>
                          <stop offset="100%" stopColor="#818cf8" stopOpacity={0.3}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 500}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 500}} />
                      <RechartsTooltip cursor={{fill: '#f8fafc', radius: 6}} contentStyle={{borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)', fontSize: '13px', fontWeight: '500', color: '#1e293b'}} />
                      <Bar dataKey="count" fill="url(#barGradient)" radius={[6, 6, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-8 border border-slate-200/80 shadow-sm flex flex-col hover:shadow-md transition-all duration-300 min-h-[400px] justify-between">
                <h3 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <span className="w-1.5 h-3 bg-indigo-600 rounded-full"></span>
                  Status Distribution
                </h3>
                <div className="h-72 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Approved', value: bookingStats.approved },
                          { name: 'Pending', value: bookingStats.pending },
                          { name: 'Rejected', value: bookingStats.rejected },
                          { name: 'Cancelled', value: bookingStats.cancelled }
                        ].filter(d => d.value > 0)}
                        cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={4} dataKey="value" stroke="none"
                      >
                        {
                          [
                            { name: 'Approved', value: bookingStats.approved },
                            { name: 'Pending', value: bookingStats.pending },
                            { name: 'Rejected', value: bookingStats.rejected },
                            { name: 'Cancelled', value: bookingStats.cancelled }
                          ].filter(d => d.value > 0).map((entry, index) => {
                            const colors = {'Approved': '#10b981', 'Pending': '#f59e0b', 'Rejected': '#ef4444', 'Cancelled': '#64748b'};
                            return <Cell key={`cell-${index}`} fill={colors[entry.name]} />
                          })
                        }
                      </Pie>
                      <RechartsTooltip contentStyle={{borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)', fontSize: '13px', fontWeight: '500', color: '#1e293b'}} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{fontSize: '12px', color: '#64748b', fontWeight: 500}} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden hover:shadow-md transition-all duration-300">
              <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-1.5 h-3 bg-indigo-600 rounded-full"></span>
                  User Directory
                </h3>
                <div className="relative w-full sm:w-auto">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 w-full sm:w-64 text-sm bg-slate-50/50 hover:bg-slate-50 transition-all duration-200"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50/70 text-slate-500 text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4 font-semibold border-b border-slate-200/60">User</th>
                      <th className="px-6 py-4 font-semibold border-b border-slate-200/60">Role</th>
                      <th className="px-6 py-4 font-semibold border-b border-slate-200/60">Permissions</th>
                      <th className="px-6 py-4 font-semibold border-b border-slate-200/60 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map(user => (
                      <tr key={user._id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-5.5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm border border-indigo-100/50 shadow-sm">
                              {user.name?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900 text-sm">{user.name}</div>
                              <div className="text-xs text-slate-550 mt-0.5">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5.5">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold capitalize border ${
                            user.role === 'super-admin' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                            user.role === 'admin' ? 'bg-sky-50 text-sky-700 border-sky-200' :
                            'bg-slate-50 text-slate-700 border-slate-200'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-5.5">
                          <div className="flex gap-1.5 flex-wrap">
                            {user.permissions?.blocked && <span className="px-2.5 py-0.5 bg-rose-50 text-rose-700 text-[10px] font-bold rounded-full border border-rose-200">🔒 Blocked</span>}
                            {user.permissions?.hallAccess !== false && <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-semibold rounded-full border border-indigo-100">🏛️ Halls</span>}
                            {user.permissions?.vehicleAccess !== false && <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-semibold rounded-full border border-emerald-100">🚗 Vehicles</span>}
                            {user.permissions?.guestRoomAccess !== false && <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-semibold rounded-full border border-amber-100">🏨 Rooms</span>}
                          </div>
                        </td>
                        <td className="px-6 py-5.5 text-right">
                          {user.role !== 'super-admin' && (
                            <button onClick={() => setShowUserModal(user)} className="text-xs font-semibold text-slate-655 hover:text-indigo-650 bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-sm hover:bg-slate-50 hover:border-indigo-200 transition-all duration-200">
                              Edit Permissions
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* Admins Tab */}
        {activeTab === 'admins' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {admins.map(admin => (
              <div key={admin._id} className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col hover:border-indigo-200 hover:shadow-md transition-all duration-300 hover:-translate-y-1 justify-between" style={{ minHeight: '170px', height: '100%' }}>
                <div>
                  <div className="flex gap-3.5 items-center mb-4">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold border shadow-inner ${
                      admin.role === 'super-admin' 
                        ? 'bg-gradient-to-tr from-indigo-600 to-violet-600 text-white border-transparent' 
                        : 'bg-gradient-to-tr from-sky-400 to-indigo-500 text-white border-transparent'
                    }`}>
                      {admin.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-900 text-sm truncate">{admin.name}</h3>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{admin.email}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-5 items-start">
                    {admin.role === 'super-admin' ? (
                      <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-150 text-[10px] font-bold rounded-lg uppercase tracking-wide">👑 Super Admin</span>
                    ) : (
                      admin.assignedServices?.map(service => (
                        <span key={service} className="px-2.5 py-1 bg-slate-50 text-slate-650 border border-slate-200 text-[10px] font-semibold rounded-lg capitalize">
                          {service === 'halls' && '🏛️ Halls'}
                          {service === 'vehicles' && '🚗 Vehicles'}
                          {service === 'rooms' && '🏨 Rooms'}
                        </span>
                      ))
                    )}
                  </div>
                </div>
                {admin.role !== 'super-admin' && (
                  <button onClick={() => handleDeleteAdmin(admin._id)} className="w-full py-2 bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 hover:border-rose-200 font-semibold rounded-lg transition-colors text-sm">
                    Revoke Access
                  </button>
                )}
              </div>
            ))}
          </motion.div>
        )}

        {/* Bookings Tab */}
        {activeTab === 'bookings' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden hover:shadow-md transition-all duration-300">
              <div className="px-6 py-5.5 border-b border-slate-100 flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-1.5 h-3 bg-indigo-600 rounded-full"></span>
                    Recent Booking Logs
                  </h3>
                </div>
                <button
                  onClick={handlePrint}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-indigo-600/15 flex items-center gap-1.5 hover:-translate-y-0.5"
                  style={{ flexShrink: 0, whiteSpace: 'nowrap' }}
                >
                  🖨️ Print Report
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50/70 text-slate-500 text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4 font-semibold border-b border-slate-200/60">User / Guest</th>
                      <th className="px-6 py-4 font-semibold border-b border-slate-200/60">Service</th>
                      <th className="px-6 py-4 font-semibold border-b border-slate-200/60">Details</th>
                      <th className="px-6 py-4 font-semibold border-b border-slate-200/60 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bookings.slice(0, 50).map(booking => (
                      <tr key={booking._id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-5">
                          <div className="font-semibold text-slate-900 text-sm">{booking.user?.name || booking.guestName || 'Unknown'}{(booking.user?.department || booking.department) ? ` (${booking.user?.department || booking.department})` : ''}</div>
                          <div className="text-xs text-slate-550 mt-0.5">{booking.user?.department || booking.user?.role || 'Guest'}</div>
                        </td>
                        <td className="px-6 py-5">
                          <span className="text-xs font-semibold text-slate-700 capitalize flex items-center gap-1.5">
                            {booking.serviceType === 'hall' && `🏛️ ${booking.serviceId?.name || 'Hall'}`}
                            {booking.serviceType === 'vehicle' && `🚗 ${booking.serviceId?.name || 'Vehicle'} (${booking.serviceId?.registrationNumber || 'N/A'})`}
                            {booking.serviceType === 'room' && `🏨 ${booking.serviceId?.name || 'Room'} #${booking.serviceId?.roomNumber || 'N/A'}`}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-xs font-medium text-slate-600">
                          {booking.serviceType === 'hall' && `${booking.hallDate} (${formatTime12h(booking.hallStartTime)} - ${formatTime12h(booking.hallEndTime)})`}
                          {booking.serviceType === 'vehicle' && `${booking.vehiclePickupDate} to ${booking.vehicleReturnDate}`}
                          {booking.serviceType === 'room' && `${booking.roomCheckInDate} to ${booking.roomCheckOutDate}`}
                        </td>
                        <td className="px-6 py-5 text-right">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold capitalize border ${
                            booking.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            booking.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            booking.status === 'rejected' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                            'bg-slate-50 text-slate-700 border-slate-200'
                          }`}>
                            {booking.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* Services Tab */}
        {activeTab === 'services' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { id: 'halls', icon: '🏛️', name: 'Halls Management', desc: 'Oversee auditoriums & seminar halls', link: '/admin/halls', accent: 'group-hover:bg-indigo-50 group-hover:text-indigo-600' },
              { id: 'vehicles', icon: '🚗', name: 'Vehicles Management', desc: 'Control buses, cars & transport logs', link: '/admin/vehicles', accent: 'group-hover:bg-emerald-50 group-hover:text-emerald-600' },
              { id: 'rooms', icon: '🏨', name: 'Rooms Management', desc: 'Manage accommodation & guest lists', link: '/admin/rooms', accent: 'group-hover:bg-amber-50 group-hover:text-amber-600' }
            ].map(service => (
              <Link href={service.link} key={service.id} className="group" style={{ display: 'flex' }}>
                <div className="bg-white rounded-2xl p-8 border border-slate-200/80 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col items-center text-center h-full hover:-translate-y-1 w-full gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-2xl border border-slate-100 transition-colors ${service.accent}`}>
                    {service.icon}
                  </div>
                  <div className="flex-grow flex flex-col justify-center">
                    <h3 className="text-base font-bold text-slate-900 mb-1">{service.name}</h3>
                    <p className="text-xs text-slate-550 leading-relaxed">{service.desc}</p>
                  </div>
                  <div className="text-sm font-semibold text-indigo-600 group-hover:text-indigo-700 flex items-center gap-1 mt-2">
                    Open Settings <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                  </div>
                </div>
              </Link>
            ))}
          </motion.div>
        )}

      </main>
    </div>

        {/* User Permission Modal */}
        <AnimatePresence>
          {showUserModal && (
            <motion.div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowUserModal(null)}>
              <motion.div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-200" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-bold text-slate-900">Manage Permissions</h2>
                  <button onClick={() => setShowUserModal(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                
                <div className="flex items-center gap-3 mb-6 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                    {showUserModal?.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{showUserModal?.name}</div>
                    <div className="text-slate-550 text-xs">{showUserModal?.email}</div>
                  </div>
                </div>

                <div className="space-y-5">
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Role Settings</h4>
                    <div className="mb-6">
                      <select 
                        value={showUserModal?.role || 'user'} 
                        onChange={(e) => { if (showUserModal?._id) handleUpdateUserPermissions(showUserModal._id, { role: e.target.value }) }}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all shadow-sm cursor-pointer"
                      >
                        <option value="user">Faculty</option>
                        <option value="admin">Admin</option>
                        <option value="hod">HOD</option>
                        <option value="principal">Principal</option>
                        <option value="ao">Administrative Officer (AO)</option>
                        <option value="transport_manager">Transport Manager</option>
                        <option value="hostel_warden">Hostel Warden</option>
                      </select>
                    </div>

                    {showUserModal?.role === 'hod' && (
                      <div className="mb-6">
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Department Assignment</label>
                        <select
                          value={showUserModal?.department || ''}
                          onChange={(e) => { if (showUserModal?._id) handleUpdateUserPermissions(showUserModal._id, { department: e.target.value }) }}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all shadow-sm cursor-pointer"
                        >
                          <option value="">Select Department</option>
                          <option value="CSE">CSE</option>
                          <option value="ECE">ECE</option>
                          <option value="EEE">EEE</option>
                          <option value="MECH">MECH</option>
                          <option value="IT">IT</option>
                          <option value="CIVIL">CIVIL</option>
                          <option value="MCA">MCA</option>
                          <option value="AP/Chem/ECE">AP/Chem/ECE</option>
                          <option value="SCIENCE & HUMANITIES">Science & Humanities</option>
                        </select>
                      </div>
                    )}

                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Service Access</h4>
                    <div className="space-y-2.5 mb-6">
                      {[
                        { id: 'hallAccess', icon: '🏛️', label: 'Halls Booking' },
                        { id: 'vehicleAccess', icon: '🚗', label: 'Vehicles Booking' },
                        { id: 'guestRoomAccess', icon: '🏨', label: 'Rooms Booking' }
                      ].map(service => {
                        const isAllowed = showUserModal?.permissions?.[service.id] !== false;
                        return (
                           <div key={service.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-xl bg-white hover:border-slate-300 transition-colors">
                            <div className="flex items-center gap-2">
                              <span className="text-base">{service.icon}</span>
                              <span className="text-sm font-semibold text-slate-800">{service.label}</span>
                            </div>
                            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                              <label className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer transition-all ${isAllowed ? 'bg-white shadow-sm text-emerald-700 border border-emerald-100/50' : 'text-slate-500 hover:text-slate-700'}`}>
                                <input type="radio" name={`service-${service.id}`} className="hidden" checked={isAllowed} onChange={() => { if (!isAllowed && showUserModal?._id) handleUpdateUserPermissions(showUserModal._id, { [service.id]: true }) }} />
                                Allowed
                              </label>
                              <label className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer transition-all ${!isAllowed ? 'bg-white shadow-sm text-rose-700 border border-rose-100/50' : 'text-slate-500 hover:text-slate-700'}`}>
                                <input type="radio" name={`service-${service.id}`} className="hidden" checked={!isAllowed} onChange={() => { if (isAllowed && showUserModal?._id) handleUpdateUserPermissions(showUserModal._id, { [service.id]: false }) }} />
                                Blocked
                              </label>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Account Restrictions</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 border border-slate-200 rounded-xl bg-white hover:border-slate-300 transition-colors">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{showUserModal?.permissions?.blocked ? '🔒' : '✅'}</span>
                          <span className="text-sm font-semibold text-slate-800">Account Login</span>
                        </div>
                        <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                          <label className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer transition-all ${!showUserModal?.permissions?.blocked ? 'bg-white shadow-sm text-emerald-700 border border-emerald-100/50' : 'text-slate-500 hover:text-slate-700'}`}>
                            <input type="radio" name="account-status" className="hidden" checked={!showUserModal?.permissions?.blocked} onChange={() => { if (showUserModal?._id) handleUpdateUserPermissions(showUserModal._id, { blockUser: false }) }} />
                            Active
                          </label>
                          <label className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer transition-all ${showUserModal?.permissions?.blocked ? 'bg-white shadow-sm text-rose-700 border border-rose-100/50' : 'text-slate-500 hover:text-slate-700'}`}>
                            <input type="radio" name="account-status" className="hidden" checked={!!showUserModal?.permissions?.blocked} onChange={() => { if (showUserModal?._id) handleUpdateUserPermissions(showUserModal._id, { blockUser: true }) }} />
                            Suspended
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Admin Creation Modal */}
        <AnimatePresence>
          {showAdminModal && (
            <motion.div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAdminModal(false)}>
              <motion.div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-200" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-bold text-slate-900">Add Administrator</h2>
                  <button onClick={() => setShowAdminModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <form onSubmit={handleCreateAdmin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Full Name</label>
                    <input type="text" value={newAdmin.name} onChange={e => setNewAdmin({...newAdmin, name: e.target.value})} className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all shadow-sm placeholder:text-slate-400" placeholder="Jane Doe" required />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Address</label>
                    <input type="email" value={newAdmin.email} onChange={e => setNewAdmin({...newAdmin, email: e.target.value})} className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all shadow-sm placeholder:text-slate-400" placeholder="jane@example.com" required />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password</label>
                    <input type="password" value={newAdmin.password} onChange={e => setNewAdmin({...newAdmin, password: e.target.value})} className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all shadow-sm placeholder:text-slate-400" placeholder="••••••••" required minLength={6} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-2 mt-1">Assigned Modules</label>
                    <div className="flex flex-wrap gap-2">
                      {['halls', 'vehicles', 'rooms'].map(service => (
                        <button key={service} type="button" onClick={() => setNewAdmin(prev => ({ ...prev, assignedServices: prev.assignedServices.includes(service) ? prev.assignedServices.filter(s => s !== service) : [...prev.assignedServices, service] }))} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all capitalize ${newAdmin.assignedServices.includes(service) ? 'bg-indigo-600 text-white border-indigo-650 shadow-sm shadow-indigo-600/10' : 'bg-white text-slate-650 border-slate-200 hover:bg-slate-50'}`}>
                          {service === 'halls' ? '🏛️ Halls' : service === 'vehicles' ? '🚗 Vehicles' : '🏨 Rooms'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="pt-2">
                    <button type="submit" disabled={adminLoading} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-indigo-600/15 disabled:opacity-50 flex items-center justify-center">
                      {adminLoading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : 'Create Account'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}