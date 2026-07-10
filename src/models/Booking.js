import mongoose from '@/lib/mongoose-compat';

const BookingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  serviceType: { type: String, enum: ['hall', 'vehicle', 'room'], required: true },
  serviceId: { type: mongoose.Schema.Types.ObjectId, required: true }, // Reference to Hall, Vehicle, or GuestRoom
  
  // Hall booking fields
  hallDate: String,
  hallStartTime: String,
  hallEndTime: String,
  purpose: String,
  attendees: Number,

  // Vehicle booking fields
  vehiclePickupDate: String,
  vehicleReturnDate: String,
  vehiclePickupTime: String,
  vehicleReturnTime: String,
  pickupLocation: String,
  returnLocation: String,
  withDriver: { type: Boolean, default: true },
  fuelOption: { type: String, enum: ['empty', 'full'], default: 'empty' },
  mileage: Number,

  // Room booking fields
  roomCheckInDate: String,
  roomCheckOutDate: String,
  roomCheckInTime: { type: String, default: '14:00' },
  roomCheckOutTime: { type: String, default: '12:00' },
  numberOfGuests: Number,
  numberOfRooms: { type: Number, default: 1 },
  specialRequests: String,

  // Common fields
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'cancelled', 'completed'], default: 'pending' },
  guestName: String,
  guestEmail: String,
  guestPhone: String,

  // Admin fields
  adminNote: String,
  actionBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Admin who approved/rejected
  actionAt: Date,
  cancelledBy: { type: String, enum: ['user', 'admin'], default: null },
  cancellationReason: String,
  cancelledAt: Date,

  // Payment fields removed per config: no payment stored on bookings

  // Smart Calendar fields
  department: String,
  timeSlotType: { type: String, enum: ['hourly', 'custom', 'full-day'], default: 'hourly' },
  recurringBooking: {
    isRecurring: { type: Boolean, default: false },
    recurrenceType: { type: String, enum: ['daily', 'weekly', 'monthly'] },
    endDate: String
  },
  blockedDate: { type: Boolean, default: false },
  blockedReason: { type: String },
  overrideBooking: { type: Boolean, default: false }, // Admin override flag

}, { timestamps: true });

BookingSchema.index({ user: 1, createdAt: -1 });
BookingSchema.index({ serviceId: 1, status: 1 });
BookingSchema.index({ serviceType: 1, status: 1 });
BookingSchema.index({ serviceId: 1, hallDate: 1 });
BookingSchema.index({ serviceId: 1, vehiclePickupDate: 1 });
BookingSchema.index({ serviceId: 1, roomCheckInDate: 1 });
BookingSchema.index({ department: 1 });

export default mongoose.models.Booking || mongoose.model('Booking', BookingSchema);
