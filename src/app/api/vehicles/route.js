import { NextResponse } from 'next/server';
import mongoose from '@/lib/mongoose-compat';
import { connectDB } from '@/lib/db';
import Vehicle from '@/models/Vehicle';
import { requireAdmin } from '@/lib/middleware';

export async function GET(request) {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const search = searchParams.get('search');
  const vehicleType = searchParams.get('vehicleType');
  const city = searchParams.get('city');
  const all = searchParams.get('all');

  // If id provided, return single vehicle
  if (id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'Invalid vehicle id' }, { status: 400 });
    }
    const vehicle = await Vehicle.findById(id);
    if (!vehicle) return NextResponse.json({ message: 'Vehicle not found' }, { status: 404 });
    return NextResponse.json(vehicle);
  }

  let query = { isActive: true, status: { $ne: 'inactive' } };

  if (all === 'true') {
    const adminRes = await requireAdmin(request);
    if (!adminRes.error) {
      delete query.isActive;
    }
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { registrationNumber: { $regex: search, $options: 'i' } },
    ];
  }
  if (vehicleType) query.vehicleType = vehicleType;
  if (city) query.city = { $regex: city, $options: 'i' };
  const vehicles = await Vehicle.find(query).sort({ name: 1 });
  return NextResponse.json(vehicles);
}

export async function POST(request) {
  const { error } = await requireAdmin(request);
  if (error) return error;
  
  await connectDB();
  const body = await request.json();
  const { name, vehicleType, registrationNumber, capacity, location, city, state } = body;

  if (!name || !vehicleType || !registrationNumber || capacity === undefined || !location) {
    return NextResponse.json({ message: 'Required fields are missing' }, { status: 400 });
  }

  const exists = await Vehicle.findOne({ registrationNumber });
  if (exists) {
    return NextResponse.json({ message: 'Vehicle with this registration number already exists' }, { status: 400 });
  }

  const vehicle = await Vehicle.create({
    name,
    vehicleType,
    registrationNumber,
    capacity,
    location,
    city,
    state,
  });

  return NextResponse.json(vehicle, { status: 201 });
}
