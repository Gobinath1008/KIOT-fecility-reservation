import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware';
import { connectDB } from '@/lib/db';
import User from '@/models/User';

export async function GET(request) {
  const { user, error } = await requireAuth(request);
  if (error) return error;
  await connectDB();
  const u = await User.findById(user.id).select('-password');
  return NextResponse.json(u);
}

export async function PUT(request) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  await connectDB();
  const body = await request.json();

  const {
    name,
    phone,
    department,
    address,
    city,
    state,
    zipCode,
  } = body;

  if (typeof name === 'string' && !name.trim()) {
    return NextResponse.json({ message: 'Name is required' }, { status: 400 });
  }

  try {
    const profileUser = await User.findById(user.id);
    if (!profileUser) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const isWorkflowApprover = ['hod', 'principal', 'ao', 'transport_manager', 'hostel_warden'].includes(profileUser.role);
    const isAdmin = profileUser.role === 'admin' || profileUser.role === 'super-admin';

    if (typeof name === 'string') profileUser.name = name.trim();
    if (typeof phone === 'string') profileUser.phone = phone.trim();

    if (isWorkflowApprover || isAdmin) {
      // HODs still need their assigned department for filters, but Principal, AO, Transport, Warden don't.
      if (profileUser.role === 'hod') {
        if (typeof department === 'string') profileUser.department = department.trim();
      } else {
        profileUser.department = ''; // Clear for principal, ao, transport, warden
      }
      profileUser.courseType = ''; // Clear courseType for all admins/approvers
    } else {
      if (typeof department === 'string') profileUser.department = department.trim();
      if (body.courseType !== undefined) profileUser.courseType = body.courseType;
    }

    if (typeof address === 'string') profileUser.address = address.trim();
    if (typeof city === 'string') profileUser.city = city.trim();
    if (typeof state === 'string') profileUser.state = state.trim();
    if (typeof zipCode === 'string') profileUser.zipCode = zipCode.trim();

    await profileUser.save();
    const updated = await User.findById(user.id).select('-password');
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json({ message: 'Failed to update profile' }, { status: 500 });
  }
}
