import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import HallBooking from '@/models/HallBooking';
import VehicleBooking from '@/models/VehicleBooking';
import RoomBooking from '@/models/RoomBooking';
import User from '@/models/User';
import { requireAuth } from '@/lib/middleware';

export async function GET(request) {
  const { user, error } = await requireAuth(request);
  if (error) return error;
  
  await connectDB();

  const populateOpts = [
    { path: 'user', select: 'name email department role' }
  ];

  const [halls, vehicles, rooms] = await Promise.all([
    HallBooking.find({ user: user.id }).populate(populateOpts).sort({ createdAt: -1 }),
    VehicleBooking.find({ user: user.id }).populate(populateOpts).sort({ createdAt: -1 }),
    RoomBooking.find({ user: user.id }).populate(populateOpts).sort({ createdAt: -1 }),
  ]);

  const combined = [...halls, ...vehicles, ...rooms].sort((a, b) => b.createdAt - a.createdAt);
  return NextResponse.json(combined);
}
