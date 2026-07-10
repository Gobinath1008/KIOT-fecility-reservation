// admin/calendar page with premium styling
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import SmartCalendar from '@/components/SmartCalendar';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';

export default function AdminCalendarPage() {
  const [activeTab, setActiveTab] = useState('calendar');
  const [serviceType, setServiceType] = useState('hall');
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [blockedDates, setBlockedDates] = useState([]);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const [blockForm, setBlockForm] = useState({
    startDate: '',
    endDate: '',
    reason: 'maintenance',
    description: '',
  });

  // Fetch services (halls, vehicles, rooms)
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const endpoint =
          serviceType === 'hall'
            ? '/api/halls'
            : serviceType === 'vehicle'
            ? '/api/vehicles'
            : '/api/rooms';
        const res = await fetch(endpoint);
        const data = await res.json();
        setServices(Array.isArray(data) ? data : []);
        if (data.length > 0 && !selectedService) {
          setSelectedService(data[0]._id);
        }
      } catch (e) {
        console.error('Failed to fetch services', e);
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, [serviceType]);

  // Fetch bookings & blocked dates when a service is selected
  useEffect(() => {
    if (!selectedService) return;
    const fetchBookings = async () => {
      try {
        const params = new URLSearchParams({
          serviceType,
          serviceId: selectedService,
          all: 'true',
        });
        const res = await fetch(`/api/bookings?${params}`);
        const data = await res.json();
        setBookings(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('Failed to fetch bookings', e);
      }
    };
    const fetchBlocked = async () => {
      try {
        const params = new URLSearchParams({
          serviceType,
          serviceId: selectedService,
        });
        const res = await fetch(`/api/blocked-dates?${params}`);
        const data = await res.json();
        setBlockedDates(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('Failed to fetch blocked dates', e);
      }
    };
    fetchBookings();
    fetchBlocked();
  }, [selectedService]);

  const handleBlockDate = async (e) => {
    e.preventDefault();
    if (!selectedService) return;
    try {
      const res = await fetch('/api/blocked-dates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceType,
          serviceId: selectedService,
          ...blockForm,
        }),
      });
      if (res.ok) {
        alert('Date blocked successfully');
        setShowBlockModal(false);
        setBlockForm({ startDate: '', endDate: '', reason: 'maintenance', description: '' });
        // refresh blocked dates
        const p = new URLSearchParams({ serviceType, serviceId: selectedService });
        const r = await fetch(`/api/blocked-dates?${p}`);
        const d = await r.json();
        setBlockedDates(Array.isArray(d) ? d : []);
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to block date');
      }
    } catch (e) {
      console.error('Block date error', e);
    }
  };

  const handleUnblockDate = async (id) => {
    if (!confirm('Unblock this date?')) return;
    try {
      const res = await fetch(`/api/blocked-dates/${id}`, { method: 'DELETE' });
      if (res.ok) {
        // refresh list
        const p = new URLSearchParams({ serviceType, serviceId: selectedService });
        const r = await fetch(`/api/blocked-dates?${p}`);
        const d = await r.json();
        setBlockedDates(Array.isArray(d) ? d : []);
      }
    } catch (e) {
      console.error('Unblock error', e);
    }
  };

  const handleApproveBooking = async (id) => {
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      });
      if (res.ok) {
        // refresh bookings
        const p = new URLSearchParams({ serviceType, serviceId: selectedService, all: 'true' });
        const r = await fetch(`/api/bookings?${p}`);
        const d = await r.json();
        setBookings(Array.isArray(d) ? d : []);
      }
    } catch (e) {
      console.error('Approve error', e);
    }
  };

  const handleCancelBooking = async (id) => {
    if (!confirm('Cancel this booking?')) return;
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      if (res.ok) {
        // refresh bookings
        const p = new URLSearchParams({ serviceType, serviceId: selectedService, all: 'true' });
        const r = await fetch(`/api/bookings?${p}`);
        const d = await r.json();
        setBookings(Array.isArray(d) ? d : []);
      }
    } catch (e) {
      console.error('Cancel error', e);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f6fa] text-slate-800">
      {/* Page Header */}
      <header className="bg-white py-6 border-b border-slate-200 shadow-sm sticky top-0 z-30">
        <div className="container mx-auto px-6 max-w-7xl flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
              <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shadow-sm">📅</span> 
              Admin Calendar
            </h1>
            <p className="text-sm font-medium text-slate-500 mt-1">Manage bookings, block dates, and view analytics seamlessly.</p>
          </div>
          <Link href="/admin" className="px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-xl transition-all border border-slate-200 shadow-sm flex items-center gap-2 hover:-translate-y-0.5">
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 flex flex-col gap-6">
        {/* Service Type Tabs Container */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
          {['hall', 'vehicle', 'room'].map((type) => {
            const isActive = serviceType === type;
            return (
              <button
                key={type}
                onClick={() => {
                  setServiceType(type);
                  setSelectedService(null);
                }}
                style={{
                  padding: '12px 24px',
                  borderRadius: '12px',
                  fontWeight: '800',
                  fontSize: '14px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  background: isActive ? '#4f46e5' : '#ffffff',
                  color: isActive ? '#ffffff' : '#4b5563',
                  border: isActive ? '1px solid #4f46e5' : '1px solid #e2e8f0',
                  boxShadow: isActive ? '0 4px 12px rgba(79, 70, 229, 0.2)' : '0 1px 2px rgba(0,0,0,0.05)',
                }}
                className="hover:border-slate-300 hover:bg-slate-50"
              >
                {type === 'hall' && '🏛️ Halls'}
                {type === 'vehicle' && '🚗 Vehicles'}
                {type === 'room' && '🏨 Rooms'}
              </button>
            );
          })}
        </div>

        {/* Service Selector Block */}
        <section
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '24px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Decorative subtle background pattern */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full opacity-40 blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>

          <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '8px', flex: '1 1 auto' }}>
            <label style={{ fontSize: '12px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Select {serviceType}
            </label>
            <select
              value={selectedService || ''}
              onChange={(e) => setSelectedService(e.target.value)}
              style={{
                width: '100%',
                maxWidth: '320px',
                padding: '12px 16px',
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '12px',
                fontSize: '15px',
                color: '#1e293b',
                fontWeight: '600',
                outline: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <option value="">Select a {serviceType}</option>
              {services.map((svc) => (
                <option key={svc._id} value={svc._id}>
                  {svc.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowBlockModal(true)}
            disabled={!selectedService}
            style={{
              position: 'relative',
              zIndex: 10,
              padding: '14px 24px',
              background: '#0f172a',
              color: '#ffffff',
              borderRadius: '12px',
              fontWeight: '700',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              border: 'none',
              cursor: selectedService ? 'pointer' : 'not-allowed',
              opacity: selectedService ? 1 : 0.5,
              transition: 'all 0.2s',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
            className="hover:bg-slate-800"
          >
            🚫 Block Dates
          </button>
        </section>

        {/* Tab Navigation Segments Container */}
        <nav
          style={{
            display: 'flex',
            gap: '6px',
            padding: '6px',
            background: '#e2e8f0',
            borderRadius: '9999px',
            width: 'max-content',
            marginBottom: '10px',
          }}
        >
          {['calendar', 'analytics', 'bookings', 'blocked'].map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '9999px',
                  fontWeight: '700',
                  fontSize: '13.5px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  background: isActive ? '#ffffff' : 'transparent',
                  color: isActive ? '#4f46e5' : '#4b5563',
                  boxShadow: isActive ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                  border: 'none',
                }}
              >
                {tab === 'calendar' && '📅 Calendar'}
                {tab === 'analytics' && '📊 Analytics'}
                {tab === 'bookings' && '📋 Bookings'}
                {tab === 'blocked' && '🚫 Blocked'}
              </button>
            );
          })}
        </nav>

        {/* Content */}
        {selectedService ? (
          <div className="space-y-8">
            {/* Calendar View */}
            {activeTab === 'calendar' && (
              <SmartCalendar
                bookings={bookings}
                serviceType={serviceType}
                serviceId={selectedService}
                showAnalytics={true}
                isAdmin={true}
              />
            )}

            {/* Analytics View */}
            {activeTab === 'analytics' && (
              <AnalyticsDashboard serviceType={serviceType} serviceId={selectedService} />
            )}

            {/* Bookings Table */}
            {activeTab === 'bookings' && (
              <section className="bg-white rounded-2xl shadow-[0_2px_15px_rgb(0,0,0,0.03)] overflow-hidden border border-slate-200">
                <header className="px-6 py-5 border-b border-slate-100 bg-white">
                  <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">📋</span> 
                    All Bookings
                  </h2>
                </header>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-[#f8fafc] border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">ID</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Guest</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {bookings.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-500">
                            No bookings found
                          </td>
                        </tr>
                      ) : (
                        bookings.map((b) => (
                          <tr key={b._id} className="hover:bg-slate-50 transition-colors group">
                            <td className="px-6 py-4 text-sm text-slate-500 font-mono">{b._id?.slice(-8)}</td>
                            <td className="px-6 py-4 text-sm text-slate-700 font-medium">
                              {b.hallDate || b.vehiclePickupDate || b.roomCheckInDate}
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-800 font-bold">
                              {b.guestName || b.user?.name || 'N/A'}{(b.user?.department || b.department) ? ` (${b.user?.department || b.department})` : ''}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                                  b.status === 'approved'
                                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                    : b.status === 'pending'
                                    ? 'bg-amber-50 text-amber-600 border border-amber-200'
                                    : 'bg-rose-50 text-rose-600 border border-rose-200'
                                }`}
                              >
                                {b.status}
                              </span>
                            </td>
                            <td className="px-4 py-2 flex gap-2">
                              {b.status === 'pending' && (
                                <button
                                  onClick={() => handleApproveBooking(b._id)}
                                  className="text-green-500 hover:text-green-700 text-sm"
                                >
                                  Approve
                                </button>
                              )}
                              {(b.status === 'pending' || b.status === 'approved') && (
                                <button
                                  onClick={() => handleCancelBooking(b._id)}
                                  className="text-red-500 hover:text-red-700 text-sm"
                                >
                                  Cancel
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Blocked Dates */}
            {activeTab === 'blocked' && (
              <section className="bg-white rounded-2xl shadow-[0_2px_15px_rgb(0,0,0,0.03)] overflow-hidden border border-slate-200">
                <header className="px-6 py-5 border-b border-slate-100 bg-white flex justify-between items-center">
                  <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-500">🚫</span> 
                    Blocked Dates
                  </h2>
                  <button
                    onClick={() => setShowBlockModal(true)}
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition-all shadow-sm text-sm"
                  >
                    + Block New Date
                  </button>
                </header>
                <div className="p-6">
                  {blockedDates.length === 0 ? (
                    <div className="text-center py-16 text-slate-400">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">📅</div>
                      <p className="font-medium text-slate-500">No blocked dates for this service</p>
                    </div>
                  ) : (
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {blockedDates.map((bd) => (
                        <li key={bd._id} className="flex flex-col bg-white border border-slate-200 p-5 rounded-xl shadow-[0_2px_8px_rgb(0,0,0,0.02)]">
                          <div className="flex justify-between items-start mb-3">
                            <p className="font-bold text-slate-800">
                              {new Date(bd.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} <span className="text-slate-400 font-normal mx-1">to</span> {new Date(bd.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                            <p className="text-sm font-medium text-slate-500 capitalize bg-slate-50 px-3 py-1 rounded-full inline-flex max-w-fit">
                              {bd.reason}
                            </p>
                          </div>
                          {bd.description && <p className="text-sm text-slate-500 mb-4">{bd.description}</p>}
                          <div className="mt-auto pt-4 border-t border-slate-100 flex justify-end">
                            <button
                              onClick={() => handleUnblockDate(bd._id)}
                              className="px-4 py-2 bg-white hover:bg-rose-50 text-rose-600 border border-rose-100 rounded-lg text-sm font-bold transition-colors"
                            >
                              Unblock Date
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            )}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm mt-8">
            <span className="text-5xl block mb-4">📅</span>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Select a {serviceType}</h3>
            <p className="text-slate-500">Choose a {serviceType} from the dropdown above to view its calendar.</p>
          </div>
        )}
      </main>

      {/* Block Date Modal */}
      <AnimatePresence>
        {showBlockModal && (
          <motion.div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowBlockModal(false)}
          >
            <motion.div
              className="bg-white rounded-2xl shadow-[0_10px_40px_rgb(0,0,0,0.1)] w-full max-w-md p-6 border border-slate-100"
              initial={{ scale: 0.95, y: 10, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 10, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
                <h3 className="text-xl font-black text-slate-900">Block Dates</h3>
                <button onClick={() => setShowBlockModal(false)} className="w-8 h-8 flex items-center justify-center bg-slate-50 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <form onSubmit={handleBlockDate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={blockForm.startDate}
                      onChange={(e) => setBlockForm({ ...blockForm, startDate: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm text-slate-800"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">End Date</label>
                    <input
                      type="date"
                      value={blockForm.endDate}
                      onChange={(e) => setBlockForm({ ...blockForm, endDate: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm text-slate-800"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Reason</label>
                  <select
                    value={blockForm.reason}
                    onChange={(e) => setBlockForm({ ...blockForm, reason: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm text-slate-800"
                  >
                    <option value="maintenance">Maintenance</option>
                    <option value="holiday">Holiday</option>
                    <option value="event">Event</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Description (optional)</label>
                  <textarea
                    rows={3}
                    value={blockForm.description}
                    onChange={(e) => setBlockForm({ ...blockForm, description: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm text-slate-800 resize-none"
                  />
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowBlockModal(false)}
                    className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors text-sm shadow-sm"
                  >
                    Block Dates
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}