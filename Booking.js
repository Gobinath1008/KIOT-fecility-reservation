import mongoose from '@/lib/mongoose-compat';

const bookingSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    serviceType: { type: String, enum: ['hall', 'vehicle', 'room'], required: true },
    serviceId: { type: mongoose.Schema.Types.ObjectId, required: true },

    // Hall-specific fields
    hallDate: String, // YYYY-MM-DD format
    hallStartTime: String, // HH:mm format
    hallEndTime: String, // HH:mm format
    purpose: String,
    attendees: Number,

    // Vehicle-specific fields
    vehiclePickupDate: String,
    vehicleReturnDate: String,
    vehiclePickupTime: String,
    vehicleReturnTime: String,
    pickupLocation: String,
    returnLocation: String,
    withDriver: Boolean,
    fuelOption: String,
    mileage: Number,

    // Room-specific fields
    roomCheckInDate: String,
    roomCheckOutDate: String,
    roomCheckInTime: String,
    roomCheckOutTime: String,
    numberOfGuests: Number,
    numberOfRooms: Number,
    specialRequests: String,

    // Common unified fields
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'cancelled', 'completed'], default: 'pending' },
    paymentStatus: { type: String, enum: ['pending', 'completed', 'failed', 'refunded'], default: 'pending' },
    totalAmount: { type: Number, required: true },
    guestName: String,
    guestEmail: String,
    guestPhone: String,
    adminNote: String
}, { timestamps: true });

bookingSchema.index({ serviceId: 1, status: 1 });
bookingSchema.index({ serviceType: 1, status: 1 });

export default mongoose.models.Booking || mongoose.model('Booking', bookingSchema);