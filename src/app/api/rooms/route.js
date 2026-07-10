import { NextResponse } from 'next/server';
import mongoose from '@/lib/mongoose-compat';
import { connectDB } from '@/lib/db';
import GuestRoom from '@/models/GuestRoom';
import { requireAdmin } from '@/lib/middleware';

export async function GET(request) {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const search = searchParams.get('search');
  const city = searchParams.get('city');
  const occupancy = searchParams.get('occupancy');
  const hostelType = searchParams.get('hostelType');
  const ac = searchParams.get('ac');
  const all = searchParams.get('all');

  // If id provided, return single room
  if (id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'Invalid room id' }, { status: 400 });
    }
    const room = await GuestRoom.findById(id);
    if (!room) return NextResponse.json({ message: 'Room not found' }, { status: 404 });
    return NextResponse.json(room);
  }

  let query = { isActive: true, status: { $ne: 'blocked' } };

  if (all === 'true') {
    const adminRes = await requireAdmin(request);
    if (!adminRes.error) {
      delete query.isActive;
    }
  }

  if (search) {
    query.$or = [
      { roomNumber: { $regex: search, $options: 'i' } },
    ];
  }
  if (hostelType) query.hostelType = hostelType;
  if (ac === 'true') query.ac = true;
  if (ac === 'false') query.ac = false;
  if (city) query.city = { $regex: city, $options: 'i' };
  if (occupancy) query.occupancy = { $gte: parseInt(occupancy) };

  const rooms = await GuestRoom.find(query).sort({ floor: 1, roomNumber: 1 });
  return NextResponse.json(rooms);
}

export async function POST(request) {
  const { error } = await requireAdmin(request);
  if (error) return error;
  
  await connectDB();
  const body = await request.json();
  let { roomNumber, floor, occupancy, location, city, state, hostelType, ac } = body;
  if (!hostelType) hostelType = 'boys';

  if (!roomNumber || floor === undefined || occupancy === undefined || !location || !hostelType) {
    return NextResponse.json({ message: 'Required fields are missing' }, { status: 400 });
  }

  const exists = await GuestRoom.findOne({ roomNumber });
  if (exists) {
    return NextResponse.json({ message: 'Room with this number already exists' }, { status: 400 });
  }

  const room = await GuestRoom.create({
    roomNumber,
    floor,
    occupancy,
    location,
    city,
    state,
    hostelType,
    ac: ac !== undefined ? ac : true,
  });

  return NextResponse.json(room, { status: 201 });
}
