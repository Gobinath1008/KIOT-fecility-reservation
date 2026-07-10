import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Hall from '@/models/Hall';
import { requireAuth, requireAdmin } from '@/lib/middleware';

export async function GET(request, props) {
  const params = await props.params;
  await connectDB();
  const hall = await Hall.findById(params.id);
  if (!hall) return NextResponse.json({ message: 'Hall not found' }, { status: 404 });
  return NextResponse.json(hall);
}

export async function PUT(request, props) {
  const params = await props.params;
  const { error } = await requireAdmin(request);
  if (error) return error;
  await connectDB();
  const body = await request.json();
  const hall = await Hall.findByIdAndUpdate(params.id, body, { new: true, runValidators: true });
  if (!hall) return NextResponse.json({ message: 'Hall not found' }, { status: 404 });
  return NextResponse.json(hall);
}

export async function DELETE(request, props) {
  const params = await props.params;
  const { error } = await requireAdmin(request);
  if (error) return error;
  await connectDB();
  const { searchParams } = new URL(request.url);
  const permanent = searchParams.get('permanent') === 'true';
  
  const hall = await Hall.findById(params.id);
  if (!hall) return NextResponse.json({ message: 'Hall not found' }, { status: 404 });
  
  if (permanent) {
    await Hall.findByIdAndDelete(params.id);
    return NextResponse.json({ message: 'Hall deleted permanently' });
  } else {
    hall.isActive = false;
    await hall.save();
    return NextResponse.json({ message: 'Hall deactivated' });
  }
}
