import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { requireAuth, requireSuperAdmin } from '@/lib/middleware';

export async function GET(request, props) {
  const params = await props.params;
  const { user, error } = await requireSuperAdmin(request);
  if (error) return error;

  await connectDB();

  try {
    const targetUser = await User.findById(params.id).select('-password');
    if (!targetUser) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Get user's booking count this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const HallBooking = (await import('@/models/HallBooking')).default;
    const VehicleBooking = (await import('@/models/VehicleBooking')).default;
    const RoomBooking = (await import('@/models/RoomBooking')).default;

    const [hallCount, vehicleCount, roomCount] = await Promise.all([
      HallBooking.countDocuments({ user: params.id, createdAt: { $gte: startOfMonth } }),
      VehicleBooking.countDocuments({ user: params.id, createdAt: { $gte: startOfMonth } }),
      RoomBooking.countDocuments({ user: params.id, createdAt: { $gte: startOfMonth } })
    ]);
    const bookingCount = hallCount + vehicleCount + roomCount;

    return NextResponse.json({
      user: targetUser,
      bookingStats: {
        thisMonth: bookingCount,
        limit: targetUser.permissions?.bookingLimit || 10
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json({ message: 'Failed to fetch user' }, { status: 500 });
  }
}

export async function PUT(request, props) {
  const params = await props.params;
  const { user, error } = await requireSuperAdmin(request);
  if (error) return error;

  await connectDB();
  const body = await request.json();
  const {
    name, phone, role, department, status,
    hallAccess, guestRoomAccess, vehicleAccess,
    canBook, canCancel, bookingLimit,
    blockUser, blockReason
  } = body;

  try {
    const targetUser = await User.findById(params.id);
    if (!targetUser) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Prevent super-admin from modifying themselves
    if (targetUser._id.toString() === user.id) {
      return NextResponse.json({ message: 'Cannot modify your own account' }, { status: 400 });
    }

    // Update basic fields
    if (name) targetUser.name = name;
    if (phone) targetUser.phone = phone;
    if (role) targetUser.role = role;
    if (department !== undefined) targetUser.department = department;
    if (status) targetUser.status = status;

    if (!targetUser.permissions) {
      targetUser.permissions = {};
    }

    // Update permissions
    if (hallAccess !== undefined) targetUser.permissions.hallAccess = hallAccess;
    if (guestRoomAccess !== undefined) targetUser.permissions.guestRoomAccess = guestRoomAccess;
    if (vehicleAccess !== undefined) targetUser.permissions.vehicleAccess = vehicleAccess;
    if (canBook !== undefined) targetUser.permissions.canBook = canBook;
    if (canCancel !== undefined) targetUser.permissions.canCancel = canCancel;
    if (bookingLimit !== undefined) targetUser.permissions.bookingLimit = bookingLimit;

    // Handle blocking
    if (blockUser !== undefined) {
      targetUser.permissions.blocked = blockUser;
      if (blockUser && blockReason) {
        targetUser.permissions.blockReason = blockReason;
        targetUser.permissions.blockedAt = new Date();
      } else if (!blockUser) {
        targetUser.permissions.blockReason = '';
        targetUser.permissions.blockedAt = null;
      }
    }

    await targetUser.save();
    const updated = await User.findById(params.id).select('-password');

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ message: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(request, props) {
  const params = await props.params;
  const { user, error } = await requireSuperAdmin(request);
  if (error) return error;

  await connectDB();

  try {
    const targetUser = await User.findById(params.id);
    if (!targetUser) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Prevent super-admin from deleting themselves
    if (targetUser._id.toString() === user.id) {
      return NextResponse.json({ message: 'Cannot delete your own account' }, { status: 400 });
    }

    // Don't allow deletion of other super-admins
    if (targetUser.role === 'super-admin') {
      return NextResponse.json({ message: 'Cannot delete super-admin accounts' }, { status: 400 });
    }

    await User.findByIdAndDelete(params.id);
    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ message: 'Failed to delete user' }, { status: 500 });
  }
}