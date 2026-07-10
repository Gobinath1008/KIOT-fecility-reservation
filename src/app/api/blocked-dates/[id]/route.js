import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import BlockedDate from '@/models/BlockedDate';
import { requireAuth, requireAdmin } from '@/lib/middleware';

export async function GET(request, props) {
  const params = await props.params;
  const { user, error } = await requireAuth(request);
  if (error) return error;

  await connectDB();

  try {
    const blockedDate = await BlockedDate.findById(params.id)
      .populate('createdBy', 'name email');

    if (!blockedDate) {
      return NextResponse.json({ message: 'Blocked date not found' }, { status: 404 });
    }

    return NextResponse.json(blockedDate);
  } catch (error) {
    console.error('Get blocked date error:', error);
    return NextResponse.json({ message: 'Failed to fetch blocked date' }, { status: 500 });
  }
}

export async function PUT(request, props) {
  const params = await props.params;
  const { user, error } = await requireAuth(request);
  if (error) return error;

  if (user.role !== 'super-admin' && user.role !== 'admin') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
  }

  await connectDB();
  const body = await request.json();
  const { startDate, endDate, reason, description, isRecurring, recurringDays, isActive } = body;

  try {
    const blockedDate = await BlockedDate.findById(params.id);

    if (!blockedDate) {
      return NextResponse.json({ message: 'Blocked date not found' }, { status: 404 });
    }

    // Update fields
    if (startDate) blockedDate.startDate = startDate;
    if (endDate) blockedDate.endDate = endDate;
    if (reason) blockedDate.reason = reason;
    if (description !== undefined) blockedDate.description = description;
    if (isRecurring !== undefined) blockedDate.isRecurring = isRecurring;
    if (recurringDays) blockedDate.recurringDays = recurringDays;
    if (isActive !== undefined) blockedDate.isActive = isActive;

    await blockedDate.save();
    const populated = await blockedDate.populate('createdBy', 'name email');

    return NextResponse.json(populated);
  } catch (error) {
    console.error('Update blocked date error:', error);
    return NextResponse.json({ message: 'Failed to update blocked date' }, { status: 500 });
  }
}

export async function DELETE(request, props) {
  const params = await props.params;
  const { user, error } = await requireAuth(request);
  if (error) return error;

  if (user.role !== 'super-admin' && user.role !== 'admin') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
  }

  await connectDB();

  try {
    const blockedDate = await BlockedDate.findById(params.id);

    if (!blockedDate) {
      return NextResponse.json({ message: 'Blocked date not found' }, { status: 404 });
    }

    // Soft delete
    blockedDate.isActive = false;
    await blockedDate.save();

    return NextResponse.json({ message: 'Blocked date deleted successfully' });
  } catch (error) {
    console.error('Delete blocked date error:', error);
    return NextResponse.json({ message: 'Failed to delete blocked date' }, { status: 500 });
  }
}