import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Booking from '@/models/Booking';
import HallBooking from '@/models/HallBooking';
import VehicleBooking from '@/models/VehicleBooking';
import RoomBooking from '@/models/RoomBooking';
import BlockedDate from '@/models/BlockedDate';
import { requireAuth, requireAdmin } from '@/lib/middleware';

// Define time slots for halls (2-hour blocks)
const HALL_TIME_SLOTS = [
  { id: 'slot-1', start: '08:00', end: '10:00', label: '8 AM - 10 AM' },
  { id: 'slot-2', start: '10:00', end: '12:00', label: '10 AM - 12 PM' },
  { id: 'slot-3', start: '12:00', end: '14:00', label: '12 PM - 2 PM' },
  { id: 'slot-4', start: '14:00', end: '16:00', label: '2 PM - 4 PM' },
  { id: 'slot-5', start: '16:00', end: '18:00', label: '4 PM - 6 PM' },
  { id: 'slot-6', start: '18:00', end: '20:00', label: '6 PM - 8 PM' },
  { id: 'slot-7', start: '20:00', end: '22:00', label: '8 PM - 10 PM' },
];

// Get color status based on booking ratio
const getColorStatus = (bookedSlots, totalSlots, dateStr) => {
  if (dateStr) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(dateStr);
    if (checkDate < today) return { color: '#9ca3af', status: 'past', text: 'Past Date' }; // Gray
  }
  
  if (bookedSlots === 0) return { color: '#22c55e', status: 'available', text: 'Available' }; // Green
  if (bookedSlots === 1) return { color: '#eab308', status: 'partial', text: '1-2 hrs Booked' }; // Yellow
  if (bookedSlots === 2 || bookedSlots === 3) return { color: '#f97316', status: 'mostly-booked', text: '3-5 hrs Booked' }; // Orange
  return { color: '#ef4444', status: 'fully-booked', text: 'Full-day Booked' }; // Red
};

// Check if time slots overlap
const hasTimeOverlap = (start1, end1, start2, end2) => {
  const toMinutes = (time) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };
  return toMinutes(start1) < toMinutes(end2) && toMinutes(end1) > toMinutes(start2);
};

// Get bookings for a specific date and service
const getBookingsForDate = async (serviceType, serviceId, date) => {
  if (serviceType === 'hall') {
    return HallBooking.find({
      serviceId,
      status: { $in: ['approved', 'pending'] },
      hallDate: date
    }).populate('user', 'name email');
  } else if (serviceType === 'vehicle') {
    return VehicleBooking.find({
      serviceId,
      status: { $in: ['approved', 'pending'] },
      $or: [
        { vehiclePickupDate: { $lte: date }, vehicleReturnDate: { $gte: date } }
      ]
    }).populate('user', 'name email');
  } else if (serviceType === 'room') {
    return RoomBooking.find({
      serviceId,
      status: { $in: ['approved', 'pending'] },
      $or: [
        { roomCheckInDate: { $lte: date }, roomCheckOutDate: { $gte: date } }
      ]
    }).populate('user', 'name email');
  }
  return [];
};

// Get blocked dates for a service
const getBlockedDates = async (serviceType, serviceId) => {
  return BlockedDate.find({
    serviceType,
    serviceId,
    isActive: true
  });
};

// Check if a date is blocked
const isDateBlocked = (blockedDates, date) => {
  return blockedDates.some(block => {
    return date >= block.startDate && date <= block.endDate;
  });
};

// Get available slots for a specific date
const getAvailableSlots = (bookings, serviceType) => {
  if (serviceType !== 'hall') {
    // For vehicle/room, return null (multi-day booking)
    return null;
  }

  const bookedSlots = bookings.map(b => ({
    start: b.hallStartTime,
    end: b.hallEndTime
  }));

  const slots = HALL_TIME_SLOTS.map(slot => {
    const isBooked = bookedSlots.some(booked => {
      return hasTimeOverlap(slot.start, slot.end, booked.start, booked.end);
    });

    const conflictingBooking = bookings.find(booked => {
      return hasTimeOverlap(slot.start, slot.end, booked.hallStartTime, booked.hallEndTime);
    });

    return {
      ...slot,
      available: !isBooked,
      bookingId: conflictingBooking?._id,
      bookedBy: conflictingBooking?.user?.name,
      status: conflictingBooking?.status
    };
  });

  return slots;
};

export async function GET(request) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  await connectDB();
  const { searchParams } = new URL(request.url);

  const serviceType = searchParams.get('serviceType');
  const serviceId = searchParams.get('serviceId');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const date = searchParams.get('date'); // Single date for hourly slots

  if (!serviceType || !serviceId) {
    return NextResponse.json(
      { message: 'serviceType and serviceId are required' },
      { status: 400 }
    );
  }

  try {
    // Get blocked dates
    const blockedDates = await getBlockedDates(serviceType, serviceId);

    // If single date requested, return hourly availability
    if (date) {
      const isBlocked = isDateBlocked(blockedDates, date);
      const bookings = await getBookingsForDate(serviceType, serviceId, date);
      const slots = serviceType === 'hall' ? getAvailableSlots(bookings, serviceType) : null;

      const bookedCount = serviceType === 'hall'
        ? slots?.filter(s => !s.available).length || 0
        : bookings.length;

      const totalSlots = serviceType === 'hall' ? HALL_TIME_SLOTS.length : 1;
      const activeBlock = isBlocked ? blockedDates.find(b => date >= b.startDate && date <= b.endDate) : null;
      const colorStatus = isBlocked
        ? { color: '#ef4444', status: 'blocked', text: 'Blocked' }
        : getColorStatus(bookedCount, totalSlots, date || dateStr);

      return NextResponse.json({
        date,
        isBlocked,
        blockedId: activeBlock ? activeBlock._id : null,
        blockedReason: activeBlock ? activeBlock.reason : null,
        blockedDescription: activeBlock ? activeBlock.description : null,
        colorStatus,
        bookings: bookings.map(b => ({
          _id: b._id,
          startTime: b.hallStartTime,
          endTime: b.hallEndTime,
          purpose: b.purpose,
          user: b.user,
          status: b.status
        })),
        slots,
        bookedCount,
        availableCount: serviceType === 'hall' ? slots?.filter(s => s.available).length : (bookedCount === 0 ? 1 : 0)
      });
    }

    // Return date range availability
    if (!startDate || !endDate) {
      return NextResponse.json(
        { message: 'startDate and endDate are required for date range' },
        { status: 400 }
      );
    }

    const availability = [];
    const currentDate = new Date(startDate);
    const end = new Date(endDate);

    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const isBlocked = isDateBlocked(blockedDates, dateStr);
      const bookings = await getBookingsForDate(serviceType, serviceId, dateStr);

      let bookedCount = 0;
      let totalSlots = 0;
      let slots = null;

      if (serviceType === 'hall') {
        const daySlots = getAvailableSlots(bookings, serviceType);
        slots = daySlots;
        bookedCount = daySlots.filter(s => !s.available).length;
        totalSlots = HALL_TIME_SLOTS.length;
      } else {
        bookedCount = bookings.length;
        totalSlots = 1;
      }

      const activeBlock = isBlocked ? blockedDates.find(b => dateStr >= b.startDate && dateStr <= b.endDate) : null;
      const colorStatus = isBlocked
        ? { color: '#ef4444', status: 'blocked', text: 'Blocked' }
        : getColorStatus(bookedCount, totalSlots, dateStr);

      availability.push({
        date: dateStr,
        isBlocked,
        blockedId: activeBlock ? activeBlock._id : null,
        blockedReason: activeBlock ? activeBlock.reason : null,
        blockedDescription: activeBlock ? activeBlock.description : null,
        colorStatus,
        bookedCount,
        availableCount: totalSlots - bookedCount,
        totalSlots,
        bookings: bookings.length,
        slots
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return NextResponse.json({
      serviceType,
      serviceId,
      startDate,
      endDate,
      availability
    });
  } catch (error) {
    console.error('Availability API error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch availability', error: error.message },
      { status: 500 }
    );
  }
}