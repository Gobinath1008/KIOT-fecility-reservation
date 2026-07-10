import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import GuestRoom from '@/models/GuestRoom';
import { requireAdmin } from '@/lib/middleware';

export async function GET(request, props) {
  const params = await props.params;
  await connectDB();
  const room = await GuestRoom.findById(params.id);
  if (!room) return NextResponse.json({ message: 'Room not found' }, { status: 404 });
  return NextResponse.json(room);
}

export async function PUT(request, props) {
  const params = await props.params;
  const { error } = await requireAdmin(request);
  if (error) return error;
  await connectDB();
  const body = await request.json();
  const room = await GuestRoom.findByIdAndUpdate(params.id, body, { new: true, runValidators: true });
  if (!room) return NextResponse.json({ message: 'Room not found' }, { status: 404 });
  return NextResponse.json(room);
}

export async function DELETE(request, props) {
  const params = await props.params;
  const { error } = await requireAdmin(request);
  if (error) return error;
  await connectDB();
  const { searchParams } = new URL(request.url);
  const permanent = searchParams.get('permanent') === 'true';
  
  const room = await GuestRoom.findById(params.id);
  if (!room) return NextResponse.json({ message: 'Room not found' }, { status: 404 });
  
  if (permanent) {
    await GuestRoom.findByIdAndDelete(params.id);
    return NextResponse.json({ message: 'Room deleted permanently' });
  } else {
    room.isActive = false;
    await room.save();
    return NextResponse.json({ message: 'Room deactivated' });
  }
}