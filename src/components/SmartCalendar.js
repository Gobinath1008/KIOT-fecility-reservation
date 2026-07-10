'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

// Time slots configuration
const TIME_SLOTS = [
  { id: 'slot-1', start: '08:00', end: '10:00', label: '8 AM - 10 AM' },
  { id: 'slot-2', start: '10:00', end: '12:00', label: '10 AM - 12 PM' },
  { id: 'slot-3', start: '12:00', end: '14:00', label: '12 PM - 2 PM' },
  { id: 'slot-4', start: '14:00', end: '16:00', label: '2 PM - 4 PM' },
  { id: 'slot-5', start: '16:00', end: '18:00', label: '4 PM - 6 PM' },
  { id: 'slot-6', start: '18:00', end: '20:00', label: '6 PM - 8 PM' },
  { id: 'slot-7', start: '20:00', end: '22:00', label: '8 PM - 10 PM' },
];

const formatTime12h = (timeStr) => {
  if (!timeStr) return '';
  const [hourStr, minStr] = timeStr.split(':');
  const hour = parseInt(hourStr);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${String(hour12).padStart(2, '0')}:${minStr} ${ampm}`;
};

const COLORS = {
  available: '#22c55e',
  partial: '#f59e0b',
  mostlyBooked: '#f97316',
  fullyBooked: '#ef4444',
  blocked: '#ef4444',
  pending: '#3b82f6',
};

export default function SmartCalendar({
  bookings = [],
  serviceType = 'hall',
  serviceId = null,
  onDateSelect,
  onSlotSelect,
  onBookingClick,
  minDate = new Date(),
  maxDate = null,
  initialView = 'dayGridMonth',
  enableRealtime = true,
  realtimeInterval = 30000,
  showAnalytics = false,
  filters = {},
  isAdmin = false,
}) {
  const [events, setEvents] = useState([]);
  const [selectedInfo, setSelectedInfo] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [availabilityData, setAvailabilityData] = useState({});
  const [hoveredDate, setHoveredDate] = useState(null);
  const [tooltipData, setTooltipData] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [analytics, setAnalytics] = useState({
    totalBookings: 0,
    availableDays: 0,
    fullyBookedDays: 0,
    utilization: 0,
  });
  const calendarRef = useRef(null);

  // Fetch availability data
  const fetchAvailability = useCallback(async () => {
    if (!serviceId) return;

    try {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0);

      const startDate = `${startOfMonth.getFullYear()}-${String(startOfMonth.getMonth() + 1).padStart(2, '0')}-${String(startOfMonth.getDate()).padStart(2, '0')}`;
      const endDate = `${endOfMonth.getFullYear()}-${String(endOfMonth.getMonth() + 1).padStart(2, '0')}-${String(endOfMonth.getDate()).padStart(2, '0')}`;

      const params = new URLSearchParams({
        serviceType,
        serviceId,
        startDate,
        endDate,
      });

      const res = await fetch(`/api/availability?${params}`);
      const data = await res.json();

      if (data.availability) {
        const availabilityMap = {};
        data.availability.forEach(day => {
          availabilityMap[day.date] = day;
        });
        setAvailabilityData(availabilityMap);

        // Calculate analytics
        const total = data.availability.length;
        const available = data.availability.filter(d => d.colorStatus?.status === 'available').length;
        const fullyBooked = data.availability.filter(d => d.colorStatus?.status === 'fully-booked').length;
        const booked = data.availability.reduce((sum, d) => sum + d.bookedCount, 0);
        const totalSlots = data.availability.reduce((sum, d) => sum + d.totalSlots, 0);

        setAnalytics({
          totalBookings: booked,
          availableDays: available,
          fullyBookedDays: fullyBooked,
          utilization: totalSlots > 0 ? Math.round((booked / totalSlots) * 100) : 0,
        });
      }
    } catch (error) {
      console.error('Failed to fetch availability:', error);
    }
  }, [serviceId, serviceType]);

  // Real-time polling
  useEffect(() => {
    setTimeout(() => {
      fetchAvailability();
    }, 0);
    if (enableRealtime && serviceId) {
      const interval = setInterval(() => {
        fetchAvailability();
      }, realtimeInterval);
      return () => clearInterval(interval);
    }
  }, [serviceId, enableRealtime, realtimeInterval]);

  // Process bookings into calendar events
  useEffect(() => {
    const calendarEvents = bookings.map(booking => {
      let start, end, title, backgroundColor;
      const status = booking.status || 'pending';
      const bookerName = booking.guestName || booking.user?.name || 'Unknown';

      if (serviceType === 'hall') {
        const dateStr = booking.hallDate;
        const startTime = booking.hallStartTime || '00:00';
        const endTime = booking.hallEndTime || '23:59';
        start = `${dateStr}T${startTime}:00`;
        end = `${dateStr}T${endTime}:00`;
        title = `${booking.hall?.name || 'Hall'} - ${booking.purpose || 'Event'} (${bookerName})`;
      } else if (serviceType === 'vehicle') {
        start = booking.vehiclePickupDate;
        end = booking.vehicleReturnDate;
        title = `${booking.vehicle?.name || 'Vehicle'} - ${booking.pickupLocation} → ${booking.returnLocation}`;
      } else if (serviceType === 'room') {
        start = booking.roomCheckInDate;
        end = booking.roomCheckOutDate;
        title = `${booking.room?.name || 'Room'} - ${booking.numberOfGuests} guests`;
      }

      if (status === 'approved') {
        backgroundColor = COLORS.available;
      } else if (status === 'pending') {
        backgroundColor = COLORS.pending;
      } else if (status === 'rejected' || status === 'cancelled') {
        backgroundColor = COLORS.blocked;
      } else {
        backgroundColor = COLORS.pending;
      }

      return {
        id: booking._id,
        start,
        end,
        title,
        backgroundColor,
        borderColor: backgroundColor,
        extendedProps: { status: booking.status, booking }
      };
    });

    setTimeout(() => {
      setEvents(calendarEvents);
    }, 0);
  }, [bookings, serviceType]);

  // Handle date click
  const handleDateClick = async (info) => {
    const clickedDate = info.date;
    if (clickedDate < minDate) return;
    if (maxDate && clickedDate > maxDate) return;

    const dateStr = info.dateStr;

    // Check if date is blocked
    if (availabilityData[dateStr]?.isBlocked) {
      setSelectedInfo({
        date: clickedDate,
        dateStr,
        blocked: true,
        blockedId: availabilityData[dateStr].blockedId,
        reason: availabilityData[dateStr].blockedReason,
        description: availabilityData[dateStr].blockedDescription
      });
      return;
    }

    if (onDateSelect) {
      onDateSelect(dateStr, availabilityData[dateStr]);
    }

    // Fetch hourly slots if hall
    if (serviceType === 'hall' && serviceId) {
      setLoadingSlots(true);
      try {
        const params = new URLSearchParams({
          serviceType,
          serviceId,
          date: dateStr,
        });
        const res = await fetch(`/api/availability?${params}`);
        const data = await res.json();
        setSelectedInfo({
          date: clickedDate,
          dateStr,
          slots: data.slots,
          bookedCount: data.bookedCount,
          availableCount: data.availableCount,
          colorStatus: data.colorStatus,
        });
      } catch (error) {
        setSelectedInfo({ date: clickedDate, dateStr });
      }
      setLoadingSlots(false);
    } else {
      setSelectedInfo({ date: clickedDate, dateStr });
    }

    setSelectedEvent(null);
    setSelectedSlot(null);
  };

  // Handle event click
  const handleEventClick = (info) => {
    const booking = info.event.extendedProps.booking;
    setSelectedEvent(booking);
    setSelectedInfo(null);
    if (onBookingClick) onBookingClick(booking);
  };

  // Handle slot selection
  const handleSlotClick = (slot) => {
    if (!slot.available) return;
    setSelectedSlot(slot);
    if (onSlotSelect) onSlotSelect(slot, selectedInfo?.dateStr);
  };

  // Handle immediate unblock
  const handleUnblockDate = async (blockedId) => {
    if (!blockedId) {
      toast.error('Blocked date ID not found.');
      return;
    }
    if (!confirm('Are you sure you want to unblock this date?')) return;
    try {
      const res = await fetch(`/api/blocked-dates/${blockedId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success('Day unblocked successfully!');
        setSelectedInfo(null);
        fetchAvailability();
      } else {
        const err = await res.json();
        toast.error(err.message || 'Failed to unblock date');
      }
    } catch (error) {
      console.error('Failed to unblock date:', error);
      toast.error('An error occurred while unblocking the date');
    }
  };

  // Get color for day cell based on availability
  const getDayCellColor = (dateStr) => {
    const data = availabilityData[dateStr];
    if (!data) return null;
    return data.colorStatus?.color || null;
  };

  // Custom day cell content
  const dayCellContent = (args) => {
    const d = args.date;
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const data = availabilityData[dateStr];
    const color = data?.colorStatus?.color;
    const bookedCount = data?.bookedCount || 0;
    const totalSlots = data?.totalSlots || 7;

    if (data?.isBlocked) {
      const displayLabel = data.blockedDescription || data.blockedReason || 'Blocked';
      return (
        <div
          className="w-full h-full flex flex-col items-center justify-between p-1 cursor-pointer transition-all duration-200 hover:scale-105"
          onMouseEnter={() => setTooltipData({ date: args.date, data, dateStr })}
          onMouseLeave={() => setTooltipData(null)}
          style={{ minHeight: '65px' }}
        >
          {/* Date number at top-left/center */}
          <span className="text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full mt-0.5">
            {args.dayNumberText}
          </span>
          {/* Centered reason/purpose badge */}
          <div className="w-full flex-grow flex items-center justify-center my-1.5">
            <div 
              className="bg-red-600 text-white text-[9px] font-black uppercase tracking-wider py-1 px-1.5 rounded shadow-sm text-center w-[92%] truncate"
              title={displayLabel}
            >
              {displayLabel}
            </div>
          </div>
          {/* Tiny lock icon at bottom */}
          <span className="text-[10px] opacity-75">🔒</span>
        </div>
      );
    }

    return (
      <div
        className="relative w-full h-full flex flex-col items-center justify-center cursor-pointer transition-all duration-200 hover:scale-105"
        onMouseEnter={() => setTooltipData({ date: args.date, data, dateStr })}
        onMouseLeave={() => setTooltipData(null)}
      >
        <span className={`text-sm font-semibold ${color ? 'text-white' : 'text-gray-700'}`}>
          {args.dayNumberText}
        </span>
        {data && !data.isBlocked && (
          <div className="absolute bottom-1 w-8 h-1 rounded-full overflow-hidden bg-white/30">
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${(bookedCount / totalSlots) * 100}%`,
                backgroundColor: color,
              }}
            />
          </div>
        )}
        {bookedCount > 0 && !data?.isBlocked && (
          <div
            className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
            style={{ backgroundColor: color, color: 'white' }}
          >
            {bookedCount}
          </div>
        )}
      </div>
    );
  };

  return (
    <motion.div
      className="bg-white rounded-2xl shadow-xl overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      {/* Header with Analytics */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 md:p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
              <span className="text-2xl">📅</span> Smart Availability Calendar
            </h2>
            <p className="text-indigo-100 text-sm mt-1">
              {serviceType === 'hall' ? 'Click a date to view time slots' :
               serviceType === 'vehicle' ? 'Select pickup date for vehicle booking' :
               'Select check-in date for room booking'}
            </p>
          </div>

          {/* Analytics Cards */}
          {showAnalytics && (
            <div className="flex gap-3">
              <div className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-2 text-center">
                <div className="text-white font-bold text-lg">{analytics.totalBookings}</div>
                <div className="text-indigo-100 text-xs">Bookings</div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-2 text-center">
                <div className="text-green-300 font-bold text-lg">{analytics.availableDays}</div>
                <div className="text-indigo-100 text-xs">Available</div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-2 text-center">
                <div className="text-red-300 font-bold text-lg">{analytics.fullyBookedDays}</div>
                <div className="text-indigo-100 text-xs">Fully Booked</div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-2 text-center">
                <div className="text-yellow-300 font-bold text-lg">{analytics.utilization}%</div>
                <div className="text-indigo-100 text-xs">Utilized</div>
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 mt-4 text-sm">
          <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-white">Available</span>
          </div>
          <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="text-white">Partial</span>
          </div>
          <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span className="text-white">Mostly Booked</span>
          </div>
          <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-white">Full</span>
          </div>
          <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-white">Blocked</span>
          </div>
        </div>
      </div>

      {/* Calendar Container */}
      <div className="p-4 md:p-6">
        <div className="calendar-container overflow-x-auto">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={initialView}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay'
            }}
            events={events}
            dateClick={handleDateClick}
            eventClick={handleEventClick}
            editable={false}
            selectable={true}
            dayMaxEvents={true}
            weekends={true}
            validRange={{ start: minDate, ...(maxDate ? { end: maxDate } : {}) }}
            height="auto"
            eventTimeFormat={{ hour: '2-digit', minute: '2-digit', meridiem: 'short' }}
            slotMinTime="06:00:00"
            slotMaxTime="23:00:00"
            allDaySlot={serviceType !== 'hall'}
            nowIndicator={true}
            firstDay={0}
            slotDuration="00:30:00"
            expandRows={true}
            dayCellContent={dayCellContent}
            dayCellDidMount={(info) => {
              const d = info.date;
              const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              const data = availabilityData[dateStr];
              if (data?.isBlocked) {
                info.el.style.setProperty('background-color', '#fee2e2', 'important');
              }
            }}
          />
        </div>
      </div>

      {/* Tooltip */}
      <AnimatePresence>
        {tooltipData && (
          <motion.div
            className="fixed z-50 bg-gray-900 text-white rounded-xl shadow-2xl p-4 w-72 pointer-events-none"
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            style={{
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">📅</span>
              <span className="font-bold">
                {new Date(tooltipData.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
            {tooltipData.data?.isBlocked ? (
              <div className="bg-gray-700 rounded-lg p-3">
                <span className="text-red-400 font-bold text-sm">🔒 Blocked</span>
                <p className="text-gray-300 text-xs mt-1 capitalize">
                  <strong>Reason:</strong> {tooltipData.data.blockedReason || 'maintenance'}
                </p>
                {tooltipData.data.blockedDescription && (
                  <p className="text-gray-300 text-xs mt-1">
                    <strong>Purpose:</strong> {tooltipData.data.blockedDescription}
                  </p>
                )}
              </div>
            ) : tooltipData.data ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Status</span>
                  <span
                    className="px-2 py-1 rounded-full text-xs font-semibold"
                    style={{
                      backgroundColor: tooltipData.data.colorStatus?.color,
                      color: 'white',
                    }}
                  >
                    {tooltipData.data.colorStatus?.text}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Booked Slots</span>
                  <span className="font-semibold">
                    {tooltipData.data.bookedCount} / {tooltipData.data.totalSlots}
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                  <div
                    className="h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${(tooltipData.data.bookedCount / tooltipData.data.totalSlots) * 100}%`,
                      backgroundColor: tooltipData.data.colorStatus?.color,
                    }}
                  />
                </div>
              </div>
            ) : (
              <p className="text-gray-400 text-sm">No bookings data</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected Date Panel */}
      <AnimatePresence>
        {selectedInfo && (
          <motion.div
            className="border-t border-gray-200 bg-gray-50"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="p-4 md:p-6">
              {selectedInfo.blocked ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center w-full relative">
                  <button
                    onClick={() => setSelectedInfo(null)}
                    className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-red-100 text-red-600 hover:bg-red-200 rounded-full transition-colors font-bold text-sm"
                  >
                    ✕
                  </button>
                  <span className="text-4xl block mb-2">🚫</span>
                  <h3 className="text-lg font-black text-red-700">Date Blocked</h3>
                  <p className="text-red-800 font-semibold mt-1">
                    This date is blocked for: {selectedInfo.reason || 'maintenance'}.
                  </p>
                  {selectedInfo.description && (
                    <p className="text-red-600 mt-2 bg-white px-4 py-2 rounded-lg border border-red-100 max-w-md mx-auto shadow-sm text-sm">
                      <strong>Purpose:</strong> {selectedInfo.description}
                    </p>
                  )}
                  
                  {isAdmin ? (
                    <div className="mt-5 flex justify-center">
                      <button
                        onClick={() => handleUnblockDate(selectedInfo.blockedId)}
                        className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold shadow-md shadow-red-600/10 transition-all transform hover:-translate-y-0.5"
                      >
                        🔓 Unblock this Day
                      </button>
                    </div>
                  ) : (
                    <p className="text-red-500 text-sm mt-3">
                      Please select another date.
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Date Info */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                          <span className="text-xl">📅</span>
                          {new Date(selectedInfo.date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </h3>
                        {selectedInfo.colorStatus && (
                          <span
                            className="inline-flex items-center gap-1 mt-2 px-3 py-1 rounded-full text-sm font-semibold"
                            style={{
                              backgroundColor: selectedInfo.colorStatus.color + '20',
                              color: selectedInfo.colorStatus.color,
                            }}
                          >
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: selectedInfo.colorStatus.color }}
                            />
                            {selectedInfo.colorStatus.text}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => setSelectedInfo(null)}
                        className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Time Slots (Hall only) */}
                    {serviceType === 'hall' && (
                      <div>
                        <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                          <span>🕐</span> Available Time Slots
                        </h4>
                        {loadingSlots ? (
                          <div className="flex gap-2 flex-wrap">
                            {[1, 2, 3, 4, 5, 6, 7].map(i => (
                              <div key={i} className="animate-pulse bg-gray-200 rounded-lg h-12 w-24" />
                            ))}
                          </div>
                        ) : selectedInfo.slots ? (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {selectedInfo.slots.map(slot => (
                              <button
                                key={slot.id}
                                onClick={() => handleSlotClick(slot)}
                                disabled={!slot.available}
                                className={`p-3 rounded-xl text-left transition-all duration-200 ${
                                  selectedSlot?.id === slot.id
                                    ? 'ring-2 ring-indigo-500 bg-indigo-50'
                                    : slot.available
                                    ? 'bg-white border-2 border-gray-200 hover:border-green-400 hover:bg-green-50'
                                    : 'bg-gray-100 border-2 border-gray-200 cursor-not-allowed opacity-60'
                                }`}
                              >
                                <div className="font-semibold text-sm">{slot.label}</div>
                                <div className={`text-xs mt-1 ${
                                  slot.available ? 'text-green-600' : 'text-red-500'
                                }`}>
                                  {slot.available ? '✓ Available' : '✕ Booked'}
                                </div>
                                {slot.bookedBy && !slot.available && (
                                  <div className="text-xs text-gray-500 truncate">
                                    By: {slot.bookedBy}
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500">Select a date to view time slots</p>
                        )}
                      </div>
                    )}

                    {/* Non-hall booking info */}
                    {serviceType !== 'hall' && (
                      <div className="bg-white rounded-xl p-4 border border-gray-200">
                        <p className="text-gray-600">
                          {serviceType === 'vehicle'
                            ? 'Click "Book Now" to proceed with vehicle reservation.'
                            : 'Click "Book Now" to proceed with room reservation.'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2">
                    {selectedSlot && (
                      <div className="bg-indigo-50 rounded-xl p-4">
                        <h4 className="font-semibold text-indigo-800 mb-2">Selected Slot</h4>
                        <p className="text-indigo-700 font-medium">{selectedSlot.label}</p>
                        <button
                          onClick={() => {
                            if (onSlotSelect) {
                              onSlotSelect(selectedSlot, selectedInfo.dateStr);
                            }
                          }}
                          className="mt-3 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                        >
                          Confirm Slot
                        </button>
                      </div>
                    )}
                    {!selectedSlot && serviceType === 'hall' && selectedInfo.slots?.some(s => s.available) && (
                      <button
                        onClick={() => {
                          if (onDateSelect) onDateSelect(selectedInfo.dateStr, selectedInfo);
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
                      >
                        <span>📅</span> Proceed to Book
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Booking Details Panel */}
      <AnimatePresence>
        {selectedEvent && (
          <motion.div
            className="border-t border-gray-200 bg-white"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="p-4 md:p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Booking Details</h3>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">
                    ID: {selectedEvent._id?.slice(-8)}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Booked By</p>
                  <p className="font-semibold text-gray-800">{selectedEvent.guestName || selectedEvent.user?.name || 'Unknown'}{(selectedEvent.user?.department || selectedEvent.department) ? ` (${selectedEvent.user?.department || selectedEvent.department})` : ''}</p>
                  <p className="text-sm text-gray-600">📞 {selectedEvent.guestPhone || 'N/A'}</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Status</p>
                  <p className="font-semibold capitalize">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      selectedEvent.status === 'approved' ? 'bg-green-100 text-green-700' :
                      selectedEvent.status === 'rejected' || selectedEvent.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {selectedEvent.status}
                    </span>
                  </p>
                  
                </div>

                {selectedEvent.serviceType === 'hall' && (
                  <div className="col-span-1 md:col-span-2 bg-indigo-50 p-4 rounded-xl">
                    <p className="font-semibold text-indigo-800">{selectedEvent.purpose}</p>
                    <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
                      <p>👥 {selectedEvent.attendees} Attendees</p>
                      <p>⏰ {formatTime12h(selectedEvent.hallStartTime)} - {formatTime12h(selectedEvent.hallEndTime)}</p>
                    </div>
                  </div>
                )}

                {selectedEvent.serviceType === 'vehicle' && (
                  <div className="col-span-1 md:col-span-2 bg-indigo-50 p-4 rounded-xl">
                    <p className="font-semibold text-indigo-800">
                      📍 {selectedEvent.pickupLocation} → {selectedEvent.returnLocation}
                    </p>
                    <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
                      <p>🚗 Driver: {selectedEvent.withDriver ? 'Yes' : 'No'}</p>
                      <p>📅 {selectedEvent.vehiclePickupDate} - {selectedEvent.vehicleReturnDate}</p>
                    </div>
                  </div>
                )}

                {selectedEvent.serviceType === 'room' && (
                  <div className="col-span-1 md:col-span-2 bg-indigo-50 p-4 rounded-xl">
                    <p className="font-semibold text-indigo-800">
                      🏨 {selectedEvent.numberOfRooms} Room(s), {selectedEvent.numberOfGuests} Guest(s)
                    </p>
                    <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
                      <p>📥 Check-in: {selectedEvent.roomCheckInDate} at {formatTime12h(selectedEvent.roomCheckInTime || '14:00')}</p>
                      <p>📤 Check-out: {selectedEvent.roomCheckOutDate} at {formatTime12h(selectedEvent.roomCheckOutTime || '12:00')}</p>
                    </div>
                    {selectedEvent.specialRequests && <p className="text-sm text-gray-700 mt-2">📝 {selectedEvent.specialRequests}</p>}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Styles */}
      <style jsx global>{`
        .fc {
          --fc-border-color: #e5e7eb;
          --fc-button-text-color: #fff;
          --fc-button-bg-color: #6C63FF;
          --fc-button-border-color: #6C63FF;
          --fc-button-hover-bg-color: #4A43CC;
          --fc-button-hover-border-color: #4A43CC;
          --fc-button-active-bg-color: #3d3799;
          --fc-button-active-border-color: #3d3799;
          --fc-event-border-color: transparent;
          --fc-today-bg-color: rgba(108, 99, 255, 0.08);
          --fc-page-bg-color: #fff;
          --fc-neutral-bg-color: #f8f9fa;
          --fc-list-event-hover-bg-color: #f8f9fa;
        }
        .fc .fc-button {
          border-radius: 8px;
          font-weight: 500;
          padding: 8px 16px;
          font-size: 14px;
        }
        .fc .fc-button:focus {
          box-shadow: 0 0 0 3px rgba(108, 99, 255, 0.2);
        }
        .fc .fc-toolbar-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1f2937;
        }
        .fc .fc-daygrid-day-number {
          font-weight: 500;
          color: #374151;
          padding: 8px;
        }
        .fc .fc-col-header-cell-cushion {
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          font-size: 12px;
        }
        .fc .fc-event {
          border-radius: 6px;
          padding: 2px 6px;
          font-size: 13px;
          font-weight: 500;
        }
        .fc .fc-daygrid-event-dot {
          border-color: currentColor;
        }
        .fc .fc-timegrid-slot-label {
          font-size: 12px;
          color: #9ca3af;
        }
        .fc .fc-timegrid-axis-cushion {
          font-size: 11px;
          color: #9ca3af;
        }
        .fc .fc-scrollgrid {
          border-radius: 8px;
          overflow: hidden;
        }
        .fc-event:hover {
          opacity: 0.9;
        }
        .fc-day-today {
          background-color: rgba(108, 99, 255, 0.05) !important;
        }
        .fc-day-past {
          opacity: 0.6;
        }
        .fc-daygrid-day {
          transition: background-color 0.2s ease;
        }
        .fc-daygrid-day:hover {
          background-color: #f9fafb;
        }
        @media (max-width: 768px) {
          .fc .fc-toolbar {
            flex-direction: column;
            gap: 12px;
          }
          .fc .fc-toolbar-title {
            font-size: 1rem;
          }
        }
      `}</style>
    </motion.div>
  );
}