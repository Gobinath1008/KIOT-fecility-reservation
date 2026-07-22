import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import HallBooking from '@/models/HallBooking';
import VehicleBooking from '@/models/VehicleBooking';
import RoomBooking from '@/models/RoomBooking';
import User from '@/models/User';
import { requireAuth } from '@/lib/middleware';
import { sendApprovalRequestEmail, sendBookingStatusUpdateEmail } from '@/lib/email';
import { matchDepartment } from '@/lib/deptMatcher';

const findBookingById = async (id) => {
  let booking = await HallBooking.findById(id).populate('user', 'name email phone department');
  if (booking) return booking;
  booking = await VehicleBooking.findById(id).populate('user', 'name email phone department');
  if (booking) return booking;
  booking = await RoomBooking.findById(id).populate('user', 'name email phone department');
  return booking;
};

// POST /api/bookings/[id]/approve
// Body options: { action: 'approve' | 'reject', comment?: string, driverName?: string, driverPhone?: string, assignedVehicleNumber?: string }
export async function POST(request, props) {
  const params = await props.params;
  const { user, error } = await requireAuth(request);
  if (error) return error;

  await connectDB();
  const body = await request.json();
  const { action, comment, driverName, driverPhone, assignedVehicleNumber, totalKm } = body;

  if (!['approve', 'reject'].includes(action)) {
    return NextResponse.json({ message: 'Invalid action. Must be approve or reject.' }, { status: 400 });
  }

  const booking = await findBookingById(params.id);
  if (!booking) {
    return NextResponse.json({ message: 'Booking not found' }, { status: 404 });
  }

  // Authorize user based on workflow stages
  const userRole = user.role;
  const currentStatus = booking.status;
  const isSuperAdminOrAdmin = userRole === 'super-admin' || userRole === 'admin';

  let hasAuthority = false;
  let stageName = '';

  if (currentStatus === 'pending_hod') {
    const facultyDept = booking.department || booking.user?.department || '';
    if (userRole === 'hod' && matchDepartment(user.department || '', facultyDept)) {
      hasAuthority = true;
    }
    stageName = 'HOD';
  } else if (currentStatus === 'pending_principal') {
    if (userRole === 'principal') {
      hasAuthority = true;
    }
    stageName = 'Principal';
  } else if (currentStatus === 'pending_ao') {
    if (userRole === 'ao') {
      hasAuthority = true;
    }
    stageName = 'Administrative Officer (AO)';
  } else if (currentStatus === 'pending_transport') {
    if (userRole === 'transport_manager') {
      hasAuthority = true;
    }
    stageName = 'Transport Manager';
  } else if (currentStatus === 'pending_warden') {
    if (userRole === 'hostel_warden') {
      hasAuthority = true;
    }
    stageName = 'Hostel Warden';
  }

  // Super-admin and normal Admin bypass authorization check
  if (isSuperAdminOrAdmin) {
    hasAuthority = true;
  }

  if (!hasAuthority) {
    return NextResponse.json({ message: `You are not authorized to approve/reject at the current stage: ${currentStatus}` }, { status: 403 });
  }

  // Record approval stage audit trail log
  if (!booking.approvals) {
    booking.approvals = [];
  }
  booking.approvals.push({
    stage: stageName || currentStatus,
    approvedBy: user.id,
    approvedAt: new Date(),
    status: action === 'approve' ? 'approved' : 'rejected',
    comment: comment || ''
  });

  const origin = request.headers.get('origin') || 'http://localhost:3000';
  const detailsLink = `${origin}/admin/bookings`;

  if (action === 'reject') {
    booking.status = 'rejected';
    booking.adminNote = comment || 'Rejected during sequential approvals.';
    booking.actionBy = user.id;
    booking.actionAt = new Date();
    await booking.save();

    // Notify user of rejection
    const targetEmail = booking.guestEmail || booking.user?.email;
    const targetName = booking.guestName || booking.user?.name;
    if (targetEmail) {
      await sendBookingStatusUpdateEmail({
        toEmail: targetEmail,
        toName: targetName,
        bookingType: booking.serviceType,
        bookingId: booking._id.toString(),
        status: 'rejected',
        notes: comment || 'Rejected during sequential approvals.'
      });
    }

    return NextResponse.json({ message: 'Booking rejected successfully', booking });
  }

  // ACTION === 'APPROVE' -> TRANSITION STATES
  let nextStatus = booking.status;
  let nextRole = '';
  let nextStageLabel = '';

  if (booking.serviceType === 'vehicle') {
    if (currentStatus === 'pending_hod') {
      nextStatus = 'pending_principal';
      nextRole = 'principal';
      nextStageLabel = 'Principal';
    } else if (currentStatus === 'pending_principal') {
      nextStatus = 'pending_ao';
      nextRole = 'ao';
      nextStageLabel = 'Administrative Officer';
    } else if (currentStatus === 'pending_ao') {
      nextStatus = 'pending_transport';
      nextRole = 'transport_manager';
      nextStageLabel = 'Transport Manager';
    } else if (currentStatus === 'pending_transport') {
      nextStatus = 'approved';
      if (!driverName || !driverPhone || !totalKm) {
        return NextResponse.json({ message: 'Driver details (Name, Phone, and Total KM) are required for Transport Manager final approval.' }, { status: 400 });
      }
      booking.driverName = driverName;
      booking.driverPhone = driverPhone;
      booking.totalKm = totalKm;
      booking.transportManagerNote = comment || '';
    }
  } else if (booking.serviceType === 'room') {
    if (currentStatus === 'pending_hod') {
      nextStatus = 'pending_principal';
      nextRole = 'principal';
      nextStageLabel = 'Principal';
    } else if (currentStatus === 'pending_principal') {
      nextStatus = 'pending_ao';
      nextRole = 'ao';
      nextStageLabel = 'Administrative Officer';
    } else if (currentStatus === 'pending_ao') {
      nextStatus = 'pending_warden';
      nextRole = 'hostel_warden';
      nextStageLabel = 'Hostel Warden';
    } else if (currentStatus === 'pending_warden') {
      nextStatus = 'approved';
    }
  } else {
    // Other assets like Halls approve immediately
    nextStatus = 'approved';
  }

  booking.status = nextStatus;
  booking.adminNote = comment || '';
  booking.actionBy = user.id;
  booking.actionAt = new Date();
  await booking.save();

  // Handle Notifications for the Next Stage
  if (nextStatus === 'approved') {
    const targetEmail = booking.guestEmail || booking.user?.email;
    const targetName = booking.guestName || booking.user?.name;
    if (targetEmail) {
      try {
        await sendBookingStatusUpdateEmail({
          toEmail: targetEmail,
          toName: targetName,
          bookingType: booking.serviceType,
          bookingId: booking._id.toString(),
          status: 'approved',
          notes: comment || 'Your booking has been approved.',
          driverDetails: booking.serviceType === 'vehicle' ? {
            driverName: booking.driverName,
            driverPhone: booking.driverPhone,
            assignedVehicleNumber: booking.assignedVehicleNumber,
            totalKm: booking.totalKm,
            transportManagerNote: booking.transportManagerNote
          } : null
        });
      } catch (err) {
        console.error('[WORKFLOW] Failed to send final approval email notification:', err);
      }
    }
  } else {
    try {
      if (nextRole === 'hod') {
        const HODs = await User.find({ role: 'hod' });
        const nextApprover = HODs.find(hod => matchDepartment(hod.department, booking.department || booking.user?.department));
        if (nextApprover && nextApprover.email) {
          await sendApprovalRequestEmail({
            toEmail: nextApprover.email,
            toName: nextApprover.name,
            bookingType: booking.serviceType,
            bookingId: booking._id.toString(),
            applicantName: booking.guestName || booking.user?.name,
            applicantDept: booking.department || booking.user?.department || '',
            stageName: nextStageLabel,
            detailsLink
          });
        }
      } else {
        const nextApprover = await User.findOne({ role: nextRole });
        if (nextApprover && nextApprover.email) {
          await sendApprovalRequestEmail({
            toEmail: nextApprover.email,
            toName: nextApprover.name,
            bookingType: booking.serviceType,
            bookingId: booking._id.toString(),
            applicantName: booking.guestName || booking.user?.name,
            applicantDept: booking.department || booking.user?.department || '',
            stageName: nextStageLabel,
            detailsLink
          });
        }
      }
    } catch (err) {
      console.error('[WORKFLOW] Failed to send next step notification email:', err);
    }
  }

  return NextResponse.json({ message: `Booking progressed to ${nextStatus}`, booking });
}
