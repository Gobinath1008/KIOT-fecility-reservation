'use client';

import React, { useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { motion, AnimatePresence } from 'framer-motion';

export default function SmartCalendar({
    bookings = [],
    maintenanceDates = [],
    holidays = [],
    onSlotSelect,
    onEventClick
}) {
    const [tooltip, setTooltip] = useState(null);

    const getDayStatus = (date) => {
        const dateStr = date.toISOString().split('T')[0];

        if (maintenanceDates.includes(dateStr) || holidays.includes(dateStr)) {
            return { status: 'blocked', bg: '#f3f4f6', border: '#d1d5db', label: 'Holiday / Maintenance', count: 0 };
        }

        const dayBookings = bookings.filter(b => {
            const bDate = (b.hallDate || b.vehiclePickupDate || b.roomCheckInDate);
            return bDate && bDate.startsWith(dateStr);
        });

        if (dayBookings.length === 0) {
            return { status: 'available', bg: '#dcfce7', border: '#86efac', label: 'Fully Available', count: 0 };
        }

        let totalBookedHours = 0;
        dayBookings.forEach(b => {
            if (b.hallStartTime && b.hallEndTime) {
                const start = parseInt(b.hallStartTime.split(':')[0], 10);
                const end = parseInt(b.hallEndTime.split(':')[0], 10);
                totalBookedHours += (end - start);
            } else {
                totalBookedHours += 24; // Automatically assume fully booked if whole day event
            }
        });

        if (totalBookedHours >= 8) {
            return { status: 'full', bg: '#fee2e2', border: '#fca5a5', label: 'Fully Booked', count: dayBookings.length };
        } else {
            return { status: 'partial', bg: '#ffedd5', border: '#fdba74', label: 'Partially Booked', count: dayBookings.length };
        }
    };

    const handleDayCellDidMount = (info) => {
        const status = getDayStatus(info.date);
        info.el.style.backgroundColor = status.bg;
        info.el.style.border = `1px solid ${status.border}`;
        info.el.classList.add('transition-colors', 'duration-300', 'ease-in-out');

        info.el.addEventListener('mouseenter', (e) => {
            setTooltip({
                x: e.clientX,
                y: e.clientY,
                label: status.label,
                count: status.count,
                date: info.date.toLocaleDateString()
            });
        });
        info.el.addEventListener('mouseleave', () => setTooltip(null));
    };

    const renderDayCellContent = (arg) => {
        const status = getDayStatus(arg.date);
        return (
            <div className="flex flex-col items-center p-1 w-full h-full">
                <span className="font-semibold text-gray-700">{arg.dayNumberText}</span>
                {status.count > 0 && (
                    <span className="mt-1 text-[10px] bg-black/10 px-2 py-0.5 rounded-full text-gray-800 font-medium">
                        {status.count} {status.count === 1 ? 'Slot' : 'Slots'}
                    </span>
                )}
            </div>
        );
    };

    const mapBookingsToEvents = () => {
        return bookings.map(b => ({
            id: b._id,
            title: b.purpose || b.serviceType,
            start: b.hallDate ? `${b.hallDate}T${b.hallStartTime}` : (b.vehiclePickupDate || b.roomCheckInDate),
            end: b.hallDate ? `${b.hallDate}T${b.hallEndTime}` : (b.vehicleReturnDate || b.roomCheckOutDate),
            backgroundColor: '#3b82f6',
            borderColor: '#2563eb',
            extendedProps: { ...b }
        }));
    };

    return (
        <div className="bg-white/60 backdrop-blur-xl shadow-2xl rounded-3xl p-6 border border-white/40">
            {/* Legend Section */}
            <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                    Resource Availability
                </h2>
                <div className="flex flex-wrap gap-4 text-sm font-medium text-gray-600">
                    <span className="flex items-center gap-2"><span className="w-4 h-4 rounded-full bg-[#dcfce7] shadow-inner"></span> Available</span>
                    <span className="flex items-center gap-2"><span className="w-4 h-4 rounded-full bg-[#ffedd5] shadow-inner"></span> Partially Booked</span>
                    <span className="flex items-center gap-2"><span className="w-4 h-4 rounded-full bg-[#fee2e2] shadow-inner"></span> Fully Booked</span>
                    <span className="flex items-center gap-2"><span className="w-4 h-4 rounded-full bg-[#f3f4f6] shadow-inner"></span> Maintenance/Holiday</span>
                </div>
            </div>

            <div className="calendar-container rounded-xl overflow-hidden shadow-inner bg-white/50">
                <FullCalendar
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                    initialView="dayGridMonth"
                    headerToolbar={{
                        left: 'prev,next today',
                        center: 'title',
                        right: 'dayGridMonth,timeGridWeek,timeGridDay'
                    }}
                    selectable={true}
                    select={onSlotSelect}
                    eventClick={onEventClick}
                    dayCellDidMount={handleDayCellDidMount}
                    dayCellContent={renderDayCellContent}
                    events={mapBookingsToEvents()}
                    height="auto"
                    eventTimeFormat={{ hour: 'numeric', minute: '2-digit', meridiem: 'short' }}
                />
            </div>

            {/* Hover Tooltip using Framer Motion */}
            <AnimatePresence>
                {tooltip && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed z-[100] bg-gray-900/90 backdrop-blur-sm text-white px-4 py-3 rounded-xl shadow-2xl pointer-events-none text-sm border border-white/10"
                        style={{ top: tooltip.y + 15, left: tooltip.x + 15 }}
                    >
                        <p className="font-bold text-blue-300 mb-1">{tooltip.date}</p>
                        <p className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-white"></span> {tooltip.label}</p>
                        {tooltip.count > 0 && <p className="text-gray-300 mt-1 ml-4">{tooltip.count} Active Bookings</p>}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}