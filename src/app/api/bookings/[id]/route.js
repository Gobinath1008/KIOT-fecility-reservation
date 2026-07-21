import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import HallBooking from '@/models/HallBooking';
import VehicleBooking from '@/models/VehicleBooking';
import RoomBooking from '@/models/RoomBooking';
import { requireAuth, requireAdmin } from '@/lib/middleware';

const findBookingById = async (id) => {
  let booking = await HallBooking.findById(id).populate('user', 'name email phone').populate('serviceId', 'name');
  if (booking) return booking;
  booking = await VehicleBooking.findById(id).populate('user', 'name email phone').populate('serviceId', 'name registrationNumber capacity');
  if (booking) return booking;
  booking = await RoomBooking.findById(id).populate('user', 'name email phone').populate('serviceId', 'roomNumber floor');
  return booking;
};

const hasOverlap = (start1, end1, start2, end2) => {
  const dStart1 = new Date(start1);
  const dEnd1 = new Date(end1);
  const dStart2 = new Date(start2);
  const dEnd2 = new Date(end2);
  return dStart2 < dEnd1 && dEnd2 > dStart1;
};

export async function GET(request, props) {
  const params = await props.params;
  const { user, error } = await requireAuth(request);
  if (error) return error;

  await connectDB();
  const booking = await findBookingById(params.id);
  
  if (!booking) {
    return NextResponse.json({ message: 'Booking not found' }, { status: 404 });
  }

  // Check authorization
  if ((user.role === 'user' || user.role === 'customer') && booking.user._id.toString() !== user.id) {
    return NextResponse.json({ message: 'Not authorized' }, { status: 403 });
  }

  return NextResponse.json(booking);
}

export async function PUT(request, props) {
  const params = await props.params;
  const { user, error } = await requireAdmin(request);
  if (error) return error;

  await connectDB();
  const { status, adminNote } = await request.json();
  
  if (!['approved', 'rejected', 'completed'].includes(status)) {
    return NextResponse.json({ message: 'Invalid status' }, { status: 400 });
  }

  const booking = await findBookingById(params.id);
  if (!booking) {
    return NextResponse.json({ message: 'Booking not found' }, { status: 404 });
  }

  booking.status = status;
  booking.adminNote = adminNote || '';
  booking.actionBy = user.id;
  booking.actionAt = new Date();
  await booking.save();
  
  // Auto-reject overlapping pending bookings if this is approved
  if (status === 'approved') {
    if (booking.serviceType === 'hall') {
      await HallBooking.updateMany({
        _id: { $ne: booking._id },
        serviceId: booking.serviceId,
        hallDate: booking.hallDate,
        status: 'pending',
        hallStartTime: { $lt: booking.hallEndTime },
        hallEndTime: { $gt: booking.hallStartTime }
      }, {
        $set: {
          status: 'rejected',
          adminNote: 'Slot was booked by another user with higher priority.',
          actionBy: user.id,
          actionAt: new Date()
        }
      });
    } else if (booking.serviceType === 'vehicle') {
      const pendingBookings = await VehicleBooking.find({
        _id: { $ne: booking._id },
        serviceId: booking.serviceId,
        status: 'pending'
      });
      const newStart = booking.vehiclePickupTime ? `${booking.vehiclePickupDate}T${booking.vehiclePickupTime}:00` : `${booking.vehiclePickupDate}T00:00:00`;
      const newEnd = booking.vehicleReturnTime ? `${booking.vehicleReturnDate}T${booking.vehicleReturnTime}:00` : `${booking.vehicleReturnDate}T23:59:59`;
      
      for (const pBooking of pendingBookings) {
        const pStart = pBooking.vehiclePickupTime ? `${pBooking.vehiclePickupDate}T${pBooking.vehiclePickupTime}:00` : `${pBooking.vehiclePickupDate}T00:00:00`;
        const pEnd = pBooking.vehicleReturnTime ? `${pBooking.vehicleReturnDate}T${pBooking.vehicleReturnTime}:00` : `${pBooking.vehicleReturnDate}T23:59:59`;
        if (hasOverlap(newStart, newEnd, pStart, pEnd)) {
          pBooking.status = 'rejected';
          pBooking.adminNote = 'Slot was booked by another user with higher priority.';
          pBooking.actionBy = user.id;
          pBooking.actionAt = new Date();
          await pBooking.save();
        }
      }
    } else if (booking.serviceType === 'room') {
      const pendingBookings = await RoomBooking.find({
        _id: { $ne: booking._id },
        serviceId: booking.serviceId,
        status: 'pending'
      });
      const newStart = booking.roomCheckInTime ? `${booking.roomCheckInDate}T${booking.roomCheckInTime}:00` : `${booking.roomCheckInDate}T14:00:00`;
      const newEnd = booking.roomCheckOutTime ? `${booking.roomCheckOutDate}T${booking.roomCheckOutTime}:00` : `${booking.roomCheckOutDate}T12:00:00`;
      
      for (const pBooking of pendingBookings) {
        const pStart = pBooking.roomCheckInTime ? `${pBooking.roomCheckInDate}T${pBooking.roomCheckInTime}:00` : `${pBooking.roomCheckInDate}T14:00:00`;
        const pEnd = pBooking.roomCheckOutTime ? `${pBooking.roomCheckOutDate}T${pBooking.roomCheckOutTime}:00` : `${pBooking.roomCheckOutDate}T12:00:00`;
        if (hasOverlap(newStart, newEnd, pStart, pEnd)) {
          pBooking.status = 'rejected';
          pBooking.adminNote = 'Slot was booked by another user with higher priority.';
          pBooking.actionBy = user.id;
          pBooking.actionAt = new Date();
          await pBooking.save();
        }
      }
    }
  }

  return NextResponse.json(booking);
}

// User: cancel own booking
export async function DELETE(request, props) {
  const params = await props.params;
  const { user, error } = await requireAuth(request);
  if (error) return error;

  await connectDB();
  const { reason } = await request.json() || {};
  const booking = await findBookingById(params.id);
  
  if (!booking) {
    return NextResponse.json({ message: 'Booking not found' }, { status: 404 });
  }

  if (booking.user._id.toString() !== user.id && (user.role === 'user' || user.role === 'customer')) {
    return NextResponse.json({ message: 'Not authorized' }, { status: 403 });
  }

  if (!['pending', 'approved'].includes(booking.status)) {
    return NextResponse.json({ message: 'Only pending or approved bookings can be cancelled' }, { status: 400 });
  }

  const now = new Date();
  let bookingStart;
  if (booking.serviceType === 'hall') {
    bookingStart = new Date(`${booking.hallDate}T${booking.hallStartTime}`);
  } else if (booking.serviceType === 'vehicle') {
    bookingStart = new Date(booking.vehiclePickupDate);
  } else if (booking.serviceType === 'room') {
    bookingStart = new Date(booking.roomCheckInDate);
  }

  if (now > bookingStart) {
    return NextResponse.json({ message: 'Cannot cancel a booking that has already started' }, { status: 400 });
  }

  booking.status = 'cancelled';
  booking.cancelledBy = 'user';
  booking.cancellationReason = reason || 'User cancelled';
  booking.cancelledAt = new Date();
  await booking.save();
  
  return NextResponse.json({ message: 'Booking cancelled', booking });
}

// Admin: cancel or update booking
export async function PATCH(request, props) {
  const params = await props.params;
  const { user, error } = await requireAdmin(request);
  if (error) return error;

  await connectDB();
  const { action, reason, status } = await request.json();
  const booking = await findBookingById(params.id);
  
  if (!booking) {
    return NextResponse.json({ message: 'Booking not found' }, { status: 404 });
  }

  if (action === 'cancel') {
    if (booking.status === 'cancelled') {
      return NextResponse.json({ message: 'Booking is already cancelled' }, { status: 400 });
    }

    booking.status = 'cancelled';
    booking.cancelledBy = 'admin';
    booking.actionBy = user.id;
    booking.cancellationReason = reason || 'Admin cancelled';
    booking.cancelledAt = new Date();
    await booking.save();
    
    return NextResponse.json({ message: 'Booking cancelled by admin', booking });
  }

  if (action === 'update-status' && status) {
    // We can reuse the PUT logic here for auto-reject, so just forward to PUT
    booking.status = status;
    booking.actionBy = user.id;
    booking.actionAt = new Date();
    await booking.save();

    if (status === 'approved') {
      // Need same auto-reject logic here. For simplicity we can abstract it or just copy it.
      if (booking.serviceType === 'hall') {
        await HallBooking.updateMany({
          _id: { $ne: booking._id },
          serviceId: booking.serviceId,
          hallDate: booking.hallDate,
          status: 'pending',
          hallStartTime: { $lt: booking.hallEndTime },
          hallEndTime: { $gt: booking.hallStartTime }
        }, {
          $set: {
            status: 'rejected',
            adminNote: 'Slot was booked by another user with higher priority.',
            actionBy: user.id,
            actionAt: new Date()
          }
        });
      } else if (booking.serviceType === 'vehicle') {
        const pendingBookings = await VehicleBooking.find({
          _id: { $ne: booking._id },
          serviceId: booking.serviceId,
          status: 'pending'
        });
        const newStart = booking.vehiclePickupTime ? `${booking.vehiclePickupDate}T${booking.vehiclePickupTime}:00` : `${booking.vehiclePickupDate}T00:00:00`;
        const newEnd = booking.vehicleReturnTime ? `${booking.vehicleReturnDate}T${booking.vehicleReturnTime}:00` : `${booking.vehicleReturnDate}T23:59:59`;
        
        for (const pBooking of pendingBookings) {
          const pStart = pBooking.vehiclePickupTime ? `${pBooking.vehiclePickupDate}T${pBooking.vehiclePickupTime}:00` : `${pBooking.vehiclePickupDate}T00:00:00`;
          const pEnd = pBooking.vehicleReturnTime ? `${pBooking.vehicleReturnDate}T${pBooking.vehicleReturnTime}:00` : `${pBooking.vehicleReturnDate}T23:59:59`;
          if (hasOverlap(newStart, newEnd, pStart, pEnd)) {
            pBooking.status = 'rejected';
            pBooking.adminNote = 'Slot was booked by another user with higher priority.';
            pBooking.actionBy = user.id;
            pBooking.actionAt = new Date();
            await pBooking.save();
          }
        }
      } else if (booking.serviceType === 'room') {
        const pendingBookings = await RoomBooking.find({
          _id: { $ne: booking._id },
          serviceId: booking.serviceId,
          status: 'pending'
        });
        const newStart = booking.roomCheckInTime ? `${booking.roomCheckInDate}T${booking.roomCheckInTime}:00` : `${booking.roomCheckInDate}T14:00:00`;
        const newEnd = booking.roomCheckOutTime ? `${booking.roomCheckOutDate}T${booking.roomCheckOutTime}:00` : `${booking.roomCheckOutDate}T12:00:00`;
        
        for (const pBooking of pendingBookings) {
          const pStart = pBooking.roomCheckInTime ? `${pBooking.roomCheckInDate}T${pBooking.roomCheckInTime}:00` : `${pBooking.roomCheckInDate}T14:00:00`;
          const pEnd = pBooking.roomCheckOutTime ? `${pBooking.roomCheckOutDate}T${pBooking.roomCheckOutTime}:00` : `${pBooking.roomCheckOutDate}T12:00:00`;
          if (hasOverlap(newStart, newEnd, pStart, pEnd)) {
            pBooking.status = 'rejected';
            pBooking.adminNote = 'Slot was booked by another user with higher priority.';
            pBooking.actionBy = user.id;
            pBooking.actionAt = new Date();
            await pBooking.save();
          }
        }
      }
    }

    return NextResponse.json(booking);
  }

  return NextResponse.json({ message: 'Invalid action' }, { status: 400 });
}
