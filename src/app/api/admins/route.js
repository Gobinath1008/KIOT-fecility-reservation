import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { requireSuperAdmin, requireAuth } from '@/lib/middleware';

// GET - Get all admins (super admin only)
export async function GET(request) {
  const { user, error } = await requireSuperAdmin(request);
  if (error) return error;

  await connectDB();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const service = searchParams.get('service');

  let query = { role: { $in: ['admin', 'super-admin'] } };
  if (status) query.status = status;
  if (service) query.assignedServices = service;

  const admins = await User.find(query)
    .select('-password')
    .sort({ createdAt: -1 });

  return NextResponse.json(admins);
}

// POST - Create new admin (super admin only)
export async function POST(request) {
  const { user, error } = await requireSuperAdmin(request);
  if (error) return error;

  await connectDB();
  const body = await request.json();
  const { name, email, phone, password, assignedServices, status } = body;

  if (!name || !email || !password) {
    return NextResponse.json(
      { message: 'Name, email, and password are required' },
      { status: 400 }
    );
  }

  // Check if email already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    return NextResponse.json(
      { message: 'Email already registered' },
      { status: 400 }
    );
  }

  // Create admin
  const admin = await User.create({
    name,
    email,
    phone,
    password,
    role: 'admin',
    assignedServices: assignedServices || ['halls', 'vehicles', 'rooms'],
    status: status || 'active'
  });

  return NextResponse.json(
    { message: 'Admin created successfully', admin: { ...admin._doc, password: undefined } },
    { status: 201 }
  );
}

// PUT - Update admin (super admin only)
export async function PUT(request) {
  const { user, error } = await requireSuperAdmin(request);
  if (error) return error;

  await connectDB();
  const body = await request.json();
  const { adminId, name, phone, assignedServices, status, isActive } = body;

  if (!adminId) {
    return NextResponse.json(
      { message: 'Admin ID is required' },
      { status: 400 }
    );
  }

  const admin = await User.findById(adminId);
  if (!admin || (admin.role !== 'admin' && admin.role !== 'super-admin')) {
    return NextResponse.json(
      { message: 'Admin not found' },
      { status: 404 }
    );
  }

  // Prevent modifying super admin
  if (admin.role === 'super-admin' && user.id !== admin._id.toString()) {
    return NextResponse.json(
      { message: 'Cannot modify super admin' },
      { status: 403 }
    );
  }

  // Update fields
  if (name) admin.name = name;
  if (phone) admin.phone = phone;
  if (assignedServices) admin.assignedServices = assignedServices;
  if (status) admin.status = status;
  if (typeof isActive === 'boolean') admin.isActive = isActive;

  await admin.save();

  return NextResponse.json({
    message: 'Admin updated successfully',
    admin: { ...admin._doc, password: undefined }
  });
}

// DELETE - Delete admin (super admin only)
export async function DELETE(request) {
  const { user, error } = await requireSuperAdmin(request);
  if (error) return error;

  await connectDB();
  const { searchParams } = new URL(request.url);
  const adminId = searchParams.get('id');

  if (!adminId) {
    return NextResponse.json(
      { message: 'Admin ID is required' },
      { status: 400 }
    );
  }

  const admin = await User.findById(adminId);
  if (!admin || (admin.role !== 'admin' && admin.role !== 'super-admin')) {
    return NextResponse.json(
      { message: 'Admin not found' },
      { status: 404 }
    );
  }

  // Prevent self-delete
  if (user.id === admin._id.toString()) {
    return NextResponse.json(
      { message: 'Cannot delete yourself' },
      { status: 400 }
    );
  }

  // Prevent deleting super admin
  if (admin.role === 'super-admin') {
    return NextResponse.json(
      { message: 'Cannot delete super admin' },
      { status: 403 }
    );
  }

  await User.findByIdAndDelete(adminId);

  return NextResponse.json({ message: 'Admin deleted successfully' });
}