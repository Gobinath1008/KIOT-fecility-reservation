import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { requireAuth, requireSuperAdmin } from '@/lib/middleware';

export async function GET(request) {
  const { user, error } = await requireSuperAdmin(request);
  if (error) return error;

  await connectDB();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const role = searchParams.get('role');
  const department = searchParams.get('department');
  const blocked = searchParams.get('blocked');
  const search = searchParams.get('search');

  let query = {};

  if (status && status !== 'all') query.status = status;
  if (role && role !== 'all') query.role = role;
  if (department && department !== 'all') query.department = department;
  if (blocked === 'true') query['permissions.blocked'] = true;
  if (blocked === 'false') query['permissions.blocked'] = false;
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  try {
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 });

    // Get stats
    const stats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    const blockedCount = await User.countDocuments({ 'permissions.blocked': true });
    const activeCount = await User.countDocuments({ status: 'active' });

    return NextResponse.json({
      users,
      stats: {
        byRole: stats.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
        total: users.length,
        blocked: blockedCount,
        active: activeCount
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json({ message: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request) {
  const { user, error } = await requireSuperAdmin(request);
  if (error) return error;

  await connectDB();
  const body = await request.json();
  const {
    name, email, password, phone, role, department,
    hallAccess, guestRoomAccess, vehicleAccess,
    canBook, canCancel, bookingLimit
  } = body;

  if (!name || !email || !password) {
    return NextResponse.json({ message: 'Name, email, and password are required' }, { status: 400 });
  }

  // Check if user exists
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return NextResponse.json({ message: 'User with this email already exists' }, { status: 409 });
  }

  try {
    const newUser = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      phone,
      role: role || 'user',
      department: department || '',
      permissions: {
        hallAccess: hallAccess !== false,
        guestRoomAccess: guestRoomAccess !== false,
        vehicleAccess: vehicleAccess !== false,
        canBook: canBook !== false,
        canCancel: canCancel !== false,
        bookingLimit: bookingLimit || 10,
        blocked: false,
      }
    });

    const created = await User.findById(newUser._id).select('-password');
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json({ message: 'Failed to create user' }, { status: 500 });
  }
}