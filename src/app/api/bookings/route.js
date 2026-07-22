import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Booking from '@/models/Booking';
import HallBooking from '@/models/HallBooking';
import VehicleBooking from '@/models/VehicleBooking';
import RoomBooking from '@/models/RoomBooking';
import Hall from '@/models/Hall';
import Vehicle from '@/models/Vehicle';
import GuestRoom from '@/models/GuestRoom';
import User from '@/models/User'; // Ensure User schema is registered before population
import { requireAuth } from '@/lib/middleware';
import { sendApprovalRequestEmail } from '@/lib/email';
import { matchDepartment } from '@/lib/deptMatcher';

const hasOverlap = (start1, end1, start2, end2) => {
  const dStart1 = new Date(start1);
  const dEnd1 = new Date(end1);
  const dStart2 = new Date(start2);
  const dEnd2 = new Date(end2);
  return dStart2 < dEnd1 && dEnd2 > dStart1;
};

export async function GET(request) {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const serviceType = searchParams.get('serviceType');
  const userId = searchParams.get('userId');
  const all = searchParams.get('all') === 'true';
  const hallDate = searchParams.get('hallDate');

  let user = null;
  let authError = null;
  try {
    const authResult = await requireAuth(request);
    if (authResult.error) {
      authError = authResult.error;
    } else {
      user = authResult.user;
    }
  } catch (err) {
    authError = NextResponse.json({ message: 'Authentication error' }, { status: 500 });
  }

  // If they want their own bookings specifically (!all), they MUST be authenticated
  if (!all) {
    if (authError) return authError;
  }

  let query = {};
  const my = searchParams.get('my') === 'true';
  const isWorkflowApprover = ['hod', 'principal', 'ao', 'transport_manager', 'hostel_warden'].includes(user?.role);
  const isPrivileged = user?.role === 'super-admin' || user?.role === 'admin' || isWorkflowApprover;

  if (!all) {
    // If 'my=true' is explicitly passed OR the user is a standard user, return ONLY their own bookings
    if (my || !isPrivileged) {
      query.user = user.id;
      if (status) query.status = status;
    } else {
      // admin / super-admin / approver fetching without all=true (from the Manage Bookings page)
      if (status) query.status = status;
      if (userId) query.user = userId;
    }
  } else {
    // fetching all bookings (e.g., checking availability)
    // If not logged in OR is a regular user/customer, they can only see approved bookings (pending don't block availability)
    if (!user || !isPrivileged) {
      query.status = 'approved';
    } else {
      // admin / super-admin / approver can filter by status/userId
      if (status) query.status = status;
      if (userId) query.user = userId;
    }
  }

  let halls = [], vehicles = [], rooms = [];
  const populateOpts = [
    { path: 'user', select: 'name email phone department role' },
    { path: 'actionBy', select: 'name' },
    { path: 'approvals.approvedBy', select: 'name department role' }
  ];


  const isUser = !user || (user.role !== 'admin' && user.role !== 'super-admin');

  const showHalls = user?.role === 'super-admin' || isUser || user.role === 'admin';

  const showVehicles = user?.role === 'super-admin' || isUser || user.role === 'admin';

  const showRooms = user?.role === 'super-admin' || isUser || user.role === 'admin';

  if ((!serviceType || serviceType === 'hall') && showHalls) {
    const hallQuery = { ...query };
    if (hallDate) {
      hallQuery.hallDate = hallDate;
    }
    halls = await HallBooking.find(hallQuery).populate([...populateOpts, { path: 'serviceId', select: 'name' }]).sort({ createdAt: -1 }).exec();
  }
  if ((!serviceType || serviceType === 'vehicle') && showVehicles) {
    vehicles = await VehicleBooking.find(query).populate([...populateOpts, { path: 'serviceId', select: 'name registrationNumber capacity driverMobile' }]).sort({ createdAt: -1 }).exec();
  }
  if ((!serviceType || serviceType === 'room') && showRooms) {
    rooms = await RoomBooking.find(query).select('+specialRequests').populate([...populateOpts, { path: 'serviceId', select: 'roomNumber floor' }]).sort({ createdAt: -1 }).exec();
  }

  const combined = [...halls, ...vehicles, ...rooms].sort((a, b) => b.createdAt - a.createdAt);
  return NextResponse.json(combined);
}

export async function POST(request) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  await connectDB();

  // Fetch user with permissions
  const currentUser = await User.findById(user.id);
  if (!currentUser) {
    return NextResponse.json({ message: 'User not found' }, { status: 404 });
  }

  // Check if user is blocked
  if (currentUser.permissions?.blocked) {
    return NextResponse.json({
      message: `Your booking privileges are suspended. Reason: ${currentUser.permissions.blockReason || 'Contact admin for details'}`
    }, { status: 403 });
  }

  // Check if user can book
  if (currentUser.permissions?.canBook === false) {
    return NextResponse.json({ message: 'You do not have booking permissions. Contact admin.' }, { status: 403 });
  }

  const body = await request.json();
  const {
    serviceType,
    serviceId,
    hallDate, hallStartTime, hallEndTime, purpose, attendees,
    vehiclePickupDate, vehicleReturnDate, vehiclePickupTime, vehicleReturnTime, pickupLocation, returnLocation, withDriver, fuelOption,
    roomCheckInDate, roomCheckOutDate, roomCheckInTime, roomCheckOutTime, numberOfGuests, specialRequests, roomPurpose,
    guestName, guestEmail, guestPhone
  } = body;

  if (!serviceType || !serviceId) {
    return NextResponse.json({ message: 'Service type and service ID are required' }, { status: 400 });
  }

  // Check service-specific permissions
  if (serviceType === 'hall' && currentUser.permissions?.hallAccess === false) {
    return NextResponse.json({ message: 'You do not have hall booking access. Contact admin for permissions.' }, { status: 403 });
  }
  if (serviceType === 'vehicle' && currentUser.permissions?.vehicleAccess === false) {
    return NextResponse.json({ message: 'You do not have vehicle booking access. Contact admin for permissions.' }, { status: 403 });
  }
  if (serviceType === 'room' && currentUser.permissions?.guestRoomAccess === false) {
    return NextResponse.json({ message: 'You do not have guest room booking access. Contact admin for permissions.' }, { status: 403 });
  }

  // Validate service ID exists
  let service;
  const currentDateTime = new Date();
  
  if (serviceType === 'hall') {
    service = await Hall.findById(serviceId);
    if (!hallDate || !hallStartTime || !hallEndTime || !purpose) {
      return NextResponse.json({ message: 'Hall booking requires date, times, and purpose' }, { status: 400 });
    }
    
    // Validate that booking is not after current system time
    const bookingDateTime = new Date(`${hallDate}T${hallStartTime}:00`);
    if (bookingDateTime <= currentDateTime) {
      return NextResponse.json({ message: 'Cannot book for past dates or times. Please select a future date and time.' }, { status: 400 });
    }

    // Validate start time is before end time
    if (hallStartTime >= hallEndTime) {
      return NextResponse.json({ message: 'Start time must be before end time.' }, { status: 400 });
    }
  } else if (serviceType === 'vehicle') {
    service = await Vehicle.findById(serviceId);
    if (!vehiclePickupDate || !vehicleReturnDate) {
      return NextResponse.json({ message: 'Vehicle booking requires pickup and return dates' }, { status: 400 });
    }
    
    // Validate dates and times - pickup cannot be in the past
    const pickupTime = vehiclePickupTime || '00:00';
    const pickupDateTime = new Date(`${vehiclePickupDate}T${pickupTime}:00`);
    
    if (pickupDateTime <= currentDateTime) {
      return NextResponse.json({ message: 'Pickup date and time cannot be in the past. Please select a future date and time.' }, { status: 400 });
    }
    
    const returnDateTime = new Date(`${vehicleReturnDate}T${vehicleReturnTime || '23:59'}:00`);
    if (returnDateTime <= pickupDateTime) {
      return NextResponse.json({ message: 'Return date and time must be after pickup date and time.' }, { status: 400 });
    }
  } else if (serviceType === 'room') {
    service = await GuestRoom.findById(serviceId);
    if (!roomCheckInDate || !roomCheckOutDate) {
      return NextResponse.json({ message: 'Room booking requires check-in and check-out dates' }, { status: 400 });
    }
    
    // Validate check-in cannot be in the past
    const checkInTime = roomCheckInTime || '14:00';
    const checkInDateTime = new Date(`${roomCheckInDate}T${checkInTime}:00`);
    
    if (checkInDateTime <= currentDateTime) {
      return NextResponse.json({ message: 'Check-in date and time cannot be in the past. Please select a future date and time.' }, { status: 400 });
    }
    
    const checkOutDateTime = new Date(`${roomCheckOutDate}T${roomCheckOutTime || '12:00'}:00`);
    if (checkOutDateTime <= checkInDateTime) {
      return NextResponse.json({ message: 'Check-out date and time must be after check-in date and time.' }, { status: 400 });
    }
  }

  if (!service) {
    return NextResponse.json({ message: 'Service not found' }, { status: 404 });
  }

  // Check for conflicts based on service type
  if (serviceType === 'hall') {
    const overlapping = await HallBooking.findOne({
      serviceId,
      hallDate,
      status: 'approved',
      hallStartTime: { $lt: hallEndTime },
      hallEndTime: { $gt: hallStartTime }
    });

    if (overlapping) {
      return NextResponse.json({
        message: 'Time slot already booked. Please choose a different time.',
        status: 409
      }, { status: 409 });
    }
  } else if (serviceType === 'vehicle') {
    const conflicts = await VehicleBooking.find({
      serviceId,
      status: 'approved'
    });

    const newStart = vehiclePickupTime ? `${vehiclePickupDate}T${vehiclePickupTime}:00` : `${vehiclePickupDate}T00:00:00`;
    const newEnd = vehicleReturnTime ? `${vehicleReturnDate}T${vehicleReturnTime}:00` : `${vehicleReturnDate}T23:59:59`;

    for (const booking of conflicts) {
      const existingStartStr = booking.vehiclePickupTime ? `${booking.vehiclePickupDate}T${booking.vehiclePickupTime}:00` : `${booking.vehiclePickupDate}T00:00:00`;
      const existingEndStr = booking.vehicleReturnTime ? `${booking.vehicleReturnDate}T${booking.vehicleReturnTime}:00` : `${booking.vehicleReturnDate}T23:59:59`;

      if (hasOverlap(newStart, newEnd, existingStartStr, existingEndStr)) {
        return NextResponse.json({
          message: 'Vehicle already booked for these dates.',
          status: 409
        }, { status: 409 });
      }
    }
  } else if (serviceType === 'room') {
    const conflicts = await RoomBooking.find({
      serviceId,
      status: 'approved'
    });

    const newStart = roomCheckInTime ? `${roomCheckInDate}T${roomCheckInTime}:00` : `${roomCheckInDate}T14:00:00`;
    const newEnd = roomCheckOutTime ? `${roomCheckOutDate}T${roomCheckOutTime}:00` : `${roomCheckOutDate}T12:00:00`;

    for (const booking of conflicts) {
      const existingStartStr = booking.roomCheckInTime ? `${booking.roomCheckInDate}T${booking.roomCheckInTime}:00` : `${booking.roomCheckInDate}T14:00:00`;
      const existingEndStr = booking.roomCheckOutTime ? `${booking.roomCheckOutDate}T${booking.roomCheckOutTime}:00` : `${booking.roomCheckOutDate}T12:00:00`;

      if (hasOverlap(newStart, newEnd, existingStartStr, existingEndStr)) {
        return NextResponse.json({
          message: 'Room already booked for these dates.',
          status: 409
        }, { status: 409 });
      }
    }
  }

  let createdBooking;
  if (serviceType === 'hall') {
    createdBooking = await HallBooking.create({
      user: user.id,
      serviceType,
      serviceId,
      hallDate,
      hallStartTime,
      hallEndTime,
      purpose,
      attendees,
      guestName: guestName || currentUser.name,
      guestEmail: guestEmail || currentUser.email,
      guestPhone: guestPhone || currentUser.phone,
      department: currentUser.department || '',
      status: 'pending',
    });
  } else if (serviceType === 'vehicle') {
    createdBooking = await VehicleBooking.create({
      user: user.id,
      serviceType,
      serviceId,
      vehiclePickupDate,
      vehicleReturnDate,
      vehiclePickupTime,
      vehicleReturnTime,
      pickupLocation: pickupLocation || undefined,
      returnLocation: returnLocation || undefined,
      purpose,
      withDriver,
      fuelOption,
      guestName: guestName || currentUser.name,
      guestEmail: guestEmail || currentUser.email,
      guestPhone: guestPhone || currentUser.phone,
      department: currentUser.department || '',
      status: currentUser.role === 'hod' ? 'pending_principal' : 'pending_hod',
      approvals: currentUser.role === 'hod' ? [{
        stage: 'HOD',
        approvedBy: currentUser._id,
        approvedAt: new Date(),
        status: 'approved',
        comment: 'Auto-approved by self (HOD Booking)'
      }] : []
    });
  } else if (serviceType === 'room') {
    createdBooking = await RoomBooking.create({
      user: user.id,
      serviceType,
      serviceId,
      roomCheckInDate,
      roomCheckOutDate,
      roomCheckInTime,
      roomCheckOutTime,
      numberOfGuests,
      roomPurpose: roomPurpose || purpose,
      guestName: guestName || currentUser.name,
      guestEmail: guestEmail || currentUser.email,
      guestPhone: guestPhone || currentUser.phone,
      department: currentUser.department || '',
      status: currentUser.role === 'hod' ? 'pending_principal' : 'pending_hod',
      approvals: currentUser.role === 'hod' ? [{
        stage: 'HOD',
        approvedBy: currentUser._id,
        approvedAt: new Date(),
        status: 'approved',
        comment: 'Auto-approved by self (HOD Booking)'
      }] : []
    });
  }

  const populated = await createdBooking.populate('user', 'name email phone department role');

  // Trigger initial email for Vehicles/Rooms
  if (serviceType === 'vehicle' || serviceType === 'room') {
    try {
      const origin = request.headers.get('origin') || 'http://localhost:3000';
      if (currentUser.role === 'hod') {
        // Since HOD auto-approved, route straight to Principal
        const principal = await User.findOne({ role: 'principal' });
        if (principal && principal.email) {
          await sendApprovalRequestEmail({
            toEmail: principal.email,
            toName: principal.name,
            bookingType: serviceType,
            bookingId: populated._id.toString(),
            applicantName: populated.guestName || populated.user?.name,
            applicantDept: populated.department || populated.user?.department || '',
            stageName: 'Principal',
            detailsLink: `${origin}/admin/bookings`
          });
        }
      } else {
        const HODs = await User.find({ role: 'hod' });
        const deptHOD = HODs.find(hod => matchDepartment(hod.department, currentUser.department));
        if (deptHOD && deptHOD.email) {
          const origin = request.headers.get('origin') || 'http://localhost:3000';
          await sendApprovalRequestEmail({
            toEmail: deptHOD.email,
            toName: deptHOD.name,
            bookingType: serviceType,
            bookingId: populated._id.toString(),
            applicantName: populated.guestName || populated.user?.name,
            applicantDept: populated.department || populated.user?.department || '',
            stageName: 'HOD',
            detailsLink: `${origin}/admin/bookings`
          });
        }
      }
    } catch (err) {
      console.error('[WORKFLOW] Failed to send initial HOD email:', err);
    }
  }

  return NextResponse.json(populated, { status: 201 });
}
