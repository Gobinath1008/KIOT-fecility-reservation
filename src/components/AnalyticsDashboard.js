'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, addMonths, subMonths } from 'date-fns';

export default function AnalyticsDashboard({
  serviceType = 'hall',
  serviceId = null,
  refreshInterval = 60000,
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [stats, setStats] = useState({
    totalBookings: 0,
    totalRevenue: 0,
    availableDays: 0,
    fullyBookedDays: 0,
    partialDays: 0,
    blockedDays: 0,
    averageUtilization: 0,
  });
  const [loading, setLoading] = useState(true);
  const [availability, setAvailability] = useState([]);

  const fetchAnalytics = async () => {
    if (!serviceId) {
      setLoading(false);
      return;
    }

    try {
      const startDate = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

      const params = new URLSearchParams({
        serviceType,
        serviceId,
        startDate,
        endDate,
      });

      const res = await fetch(`/api/availability?${params}`);
      const data = await res.json();

      if (data.availability) {
        setAvailability(data.availability);

        // Calculate stats
        const total = data.availability.length;
        const available = data.availability.filter(d => d.colorStatus?.status === 'available').length;
        const fullyBooked = data.availability.filter(d => d.colorStatus?.status === 'fully-booked').length;
        const partial = data.availability.filter(d => d.colorStatus?.status === 'partial' || d.colorStatus?.status === 'mostly-booked').length;
        const blocked = data.availability.filter(d => d.isBlocked).length;
        const totalBooked = data.availability.reduce((sum, d) => sum + d.bookedCount, 0);
        const totalSlots = data.availability.reduce((sum, d) => sum + d.totalSlots, 0);

        setStats({
          totalBookings: totalBooked,
          totalRevenue: totalBooked * 500, // Placeholder - would need actual price data
          availableDays: available,
          fullyBookedDays: fullyBooked,
          partialDays: partial,
          blockedDays: blocked,
          averageUtilization: totalSlots > 0 ? Math.round((totalBooked / totalSlots) * 100) : 0,
        });
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setTimeout(() => {
      fetchAnalytics();
    }, 0);
  }, [serviceType, serviceId, currentMonth]);

  const getDayColor = (dateStr) => {
    const dayData = availability.find(d => d.date === dateStr);
    if (!dayData) return '#e5e7eb';
    if (dayData.isBlocked) return '#6b7280';
    return dayData.colorStatus?.color || '#e5e7eb';
  };

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const firstDayOfMonth = startOfMonth(currentMonth).getDay();

  return (
    <motion.div
      className="bg-white rounded-2xl shadow-xl overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-4 md:p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
              <span className="text-2xl">📊</span> Booking Analytics
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              {serviceType.charAt(0).toUpperCase() + serviceType.slice(1)} - {format(currentMonth, 'MMMM yyyy')}
            </p>
          </div>

          {/* Month Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg transition-colors"
            >
              ←
            </button>
            <span className="text-white font-semibold px-4">
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg transition-colors"
            >
              →
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
            <div className="text-3xl font-bold">{stats.totalBookings}</div>
            <div className="text-blue-100 text-sm">Total Bookings</div>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
            <div className="text-3xl font-bold">{stats.availableDays}</div>
            <div className="text-green-100 text-sm">Available Days</div>
          </div>
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-4 text-white">
            <div className="text-3xl font-bold">{stats.partialDays}</div>
            <div className="text-orange-100 text-sm">Partially Booked</div>
          </div>
          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-4 text-white">
            <div className="text-3xl font-bold">{stats.fullyBookedDays}</div>
            <div className="text-red-100 text-sm">Fully Booked</div>
          </div>
        </div>

        {/* Utilization Progress */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="font-semibold text-gray-700">Average Utilization</span>
            <span className="text-2xl font-bold text-indigo-600">{stats.averageUtilization}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${stats.averageUtilization}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Calendar Heatmap */}
        <div className="mb-6">
          <h3 className="font-semibold text-gray-700 mb-3">Monthly Overview</h3>
          <div className="grid grid-cols-7 gap-1">
            {/* Day headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-xs font-semibold text-gray-500 py-2">
                {day}
              </div>
            ))}

            {/* Empty cells for first week */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}

            {/* Days */}
            {days.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const color = getDayColor(dateStr);
              const dayData = availability.find(d => d.date === dateStr);
              const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

              return (
                <motion.div
                  key={dateStr}
                  whileHover={{ scale: 1.1 }}
                  className={`aspect-square rounded-lg flex items-center justify-center text-sm font-medium cursor-pointer relative ${
                    isToday ? 'ring-2 ring-indigo-500' : ''
                  }`}
                  style={{ backgroundColor: color, color: color === '#6b7280' || color === '#ef4444' ? 'white' : 'white' }}
                  title={`${format(day, 'MMM d')}: ${dayData?.colorStatus?.text || 'No data'}`}
                >
                  {format(day, 'd')}
                  {dayData?.isBlocked && (
                    <span className="absolute -top-1 -right-1 text-[10px]">🚫</span>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500"></div>
            <span className="text-gray-600">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-yellow-500"></div>
            <span className="text-gray-600">Partial</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-orange-500"></div>
            <span className="text-gray-600">Mostly Booked</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500"></div>
            <span className="text-gray-600">Fully Booked</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gray-500"></div>
            <span className="text-gray-600">Blocked</span>
          </div>
        </div>

        {loading && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        )}
      </div>
    </motion.div>
  );
}