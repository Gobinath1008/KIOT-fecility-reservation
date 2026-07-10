import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import BlockedDate from '@/models/BlockedDate';
import { requireAuth, requireAdmin } from '@/lib/middleware';

export async function GET(request) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  await connectDB();
  const { searchParams } = new URL(request.url);

  const serviceType = searchParams.get('serviceType');
  const serviceId = searchParams.get('serviceId');
  const all = searchParams.get('all') === 'true';

  let query = {};

  // Non-admins can only see their own blocked dates or public ones
  if (!all && user.role !== 'super-admin' && user.role !== 'admin') {
    query.isActive = true;
  }

  if (serviceType) query.serviceType = serviceType;
  if (serviceId) query.serviceId = serviceId;

  try {
    const blockedDates = await BlockedDate.find(query)
      .populate('createdBy', 'name email')
      .sort({ startDate: 1 });

    return NextResponse.json(blockedDates);
  } catch (error) {
    console.error('Get blocked dates error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch blocked dates' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  // Only admins can create blocked dates
  if (user.role !== 'super-admin' && user.role !== 'admin') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
  }

  await connectDB();
  const body = await request.json();
  const {
    serviceType,
    serviceId,
    startDate,
    endDate,
    reason,
    description,
    isRecurring,
    recurringDays
  } = body;

  // Validation
  if (!serviceType || !serviceId || !startDate || !endDate || !reason) {
    return NextResponse.json(
      { message: 'serviceType, serviceId, startDate, endDate, and reason are required' },
      { status: 400 }
    );
  }

  try {
    // Check for overlapping blocked dates
    const existing = await BlockedDate.findOne({
      serviceType,
      serviceId,
      isActive: true,
      $or: [
        { startDate: { $lte: endDate }, endDate: { $gte: startDate } }
      ]
    });

    if (existing) {
      return NextResponse.json(
        { message: 'This date range already has a blocked period' },
        { status: 409 }
      );
    }

    const blockedDate = await BlockedDate.create({
      serviceType,
      serviceId,
      startDate,
      endDate,
      reason,
      description,
      isRecurring: isRecurring || false,
      recurringDays: recurringDays || [],
      createdBy: user.id
    });

    const populated = await blockedDate.populate('createdBy', 'name email');
    return NextResponse.json(populated, { status: 201 });
  } catch (error) {
    console.error('Create blocked date error:', error);
    return NextResponse.json(
      { message: 'Failed to create blocked date' },
      { status: 500 }
    );
  }
}