import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Booking from '@/models/Booking';
import { checkConflict } from '@/lib/bookingValidation';

export async function GET(req) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const serviceType = searchParams.get('serviceType');
        const serviceId = searchParams.get('serviceId');

        let query = { status: { $ne: 'cancelled' } };
        if (serviceType) query.serviceType = serviceType;
        if (serviceId) query.serviceId = serviceId;

        const bookings = await Booking.find(query).sort({ createdAt: -1 });
        return NextResponse.json({ success: true, data: bookings }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        await dbConnect();
        const body = await req.json();

        // Find existing bookings for the same service
        const existingBookings = await Booking.find({
            serviceId: body.serviceId,
            status: { $in: ['pending', 'approved'] }
        });

        // Conflict Detection
        const hasConflict = checkConflict(body, existingBookings);

        if (hasConflict) {
            return NextResponse.json(
                { success: false, error: 'Double booking detected. The selected time slot overlaps with an existing booking.' },
                { status: 409 }
            );
        }

        const newBooking = await Booking.create(body);
        return NextResponse.json({ success: true, data: newBooking }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}