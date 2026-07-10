import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import HallBooking from '@/models/HallBooking';
import { requireAuth } from '@/lib/middleware';

// Hall bookings (for viewing schedule)
export async function GET(request, props) {
  const params = await props.params;
  await connectDB();
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const includePending = searchParams.get('includePending') === 'true';

  let query = { serviceId: params.hallId };
  if (includePending) {
    query.status = { $in: ['approved', 'pending'] };
  } else {
    query.status = 'approved';
  }
  if (date) query.hallDate = date;

  const bookings = await HallBooking.find(query)
    .populate('user', 'name email')
    .sort({ hallDate: 1, hallStartTime: 1 });
  return NextResponse.json(bookings);
}
