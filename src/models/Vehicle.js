import mongoose from '@/lib/mongoose-compat';

const VehicleSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  vehicleType: { type: String, enum: ['car', 'van', 'bus', 'bike'], required: true },
  registrationNumber: { type: String, required: true, unique: true, trim: true },
  driverMobile: { type: String, default: '' },
  capacity: { type: Number, required: true, min: 1 },
  mileage: { type: Number, default: 0 },
  location: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  features: [String],
  description: { type: String, default: '' },
  status: { type: String, enum: ['available', 'booked', 'maintenance', 'inactive'], default: 'available' },
  currentMileage: { type: Number, default: 0 },
  fuelLevel: { type: Number, default: 100 },
  lastMaintenanceDate: Date,
  insuranceExpiry: Date,
  isActive: { type: Boolean, default: true },
  availability: {
    monday: { available: Boolean },
    tuesday: { available: Boolean },
    wednesday: { available: Boolean },
    thursday: { available: Boolean },
    friday: { available: Boolean },
    saturday: { available: Boolean },
    sunday: { available: Boolean },
  },
}, { timestamps: true });

// Safe Mongoose hot-reloading
if (mongoose.models.Vehicle) {
  delete mongoose.models.Vehicle;
}

export default mongoose.model('Vehicle', VehicleSchema);
