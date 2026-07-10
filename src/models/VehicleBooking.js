import mongoose from '@/lib/mongoose-compat';

const VehicleBookingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  serviceType: { type: String, default: 'vehicle' },
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  
  vehiclePickupDate: { type: String, required: true },
  vehicleReturnDate: { type: String, required: true },
  vehiclePickupTime: String,
  vehicleReturnTime: String,
  pickupLocation: String,
  returnLocation: String,
  purpose: String,
  withDriver: { type: Boolean, default: true },
  fuelOption: { type: String, enum: ['empty', 'full'], default: 'empty' },
  mileage: Number,

  status: { type: String, enum: ['pending', 'approved', 'rejected', 'cancelled', 'completed'], default: 'pending' },
  guestName: String,
  guestEmail: String,
  guestPhone: String,

  adminNote: String,
  actionBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  actionAt: Date,
  cancelledBy: { type: String, enum: ['user', 'admin'], default: null },
  cancellationReason: String,
  cancelledAt: Date,

  // payment fields removed

  department: String,
}, { timestamps: true });

VehicleBookingSchema.index({ user: 1, createdAt: -1 });
VehicleBookingSchema.index({ serviceId: 1, status: 1 });
VehicleBookingSchema.index({ serviceId: 1, vehiclePickupDate: 1 });

// Safe Mongoose hot-reloading
if (mongoose.models.VehicleBooking) {
  delete mongoose.models.VehicleBooking;
}

export default mongoose.model('VehicleBooking', VehicleBookingSchema);
