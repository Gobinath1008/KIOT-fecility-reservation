import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Vehicle from '@/models/Vehicle';
import { requireAdmin } from '@/lib/middleware';

export async function GET(request, props) {
  const params = await props.params;
  await connectDB();
  const vehicle = await Vehicle.findById(params.id);
  if (!vehicle) return NextResponse.json({ message: 'Vehicle not found' }, { status: 404 });
  return NextResponse.json(vehicle);
}

export async function PUT(request, props) {
  const params = await props.params;
  const { error } = await requireAdmin(request);
  if (error) return error;
  await connectDB();
  const body = await request.json();
  const vehicle = await Vehicle.findByIdAndUpdate(params.id, body, { new: true, runValidators: true });
  if (!vehicle) return NextResponse.json({ message: 'Vehicle not found' }, { status: 404 });
  return NextResponse.json(vehicle);
}

export async function DELETE(request, props) {
  const params = await props.params;
  const { error } = await requireAdmin(request);
  if (error) return error;
  await connectDB();
  const { searchParams } = new URL(request.url);
  const permanent = searchParams.get('permanent') === 'true';
  
  const vehicle = await Vehicle.findById(params.id);
  if (!vehicle) return NextResponse.json({ message: 'Vehicle not found' }, { status: 404 });
  
  if (permanent) {
    await Vehicle.findByIdAndDelete(params.id);
    return NextResponse.json({ message: 'Vehicle deleted permanently' });
  } else {
    vehicle.isActive = false;
    await vehicle.save();
    return NextResponse.json({ message: 'Vehicle deactivated' });
  }
}