import mongoose from '@/lib/mongoose-compat';

const GuestRoomSchema = new mongoose.Schema({
  roomNumber: { type: String, required: true, unique: true, trim: true },
  floor: { type: Number, required: true },
  occupancy: { type: Number, required: true, min: 1 },
  beds: {
    single: Number,
    double: Number,
  },
  pricePerDay: { type: Number, default: 0 },
  pricePerNight: { type: Number, default: 0 },
  amenities: [String],
  description: { type: String, default: '' },
  image: { type: String, default: '' },
  images: [String],
  status: { type: String, enum: ['available', 'occupied', 'cleaning', 'maintenance', 'blocked'], default: 'available' },
  isActive: { type: Boolean, default: true },
  hostelType: { type: String, enum: ['boys', 'girls'], required: true, default: 'boys' },
  location: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  features: [String],
  wifi: { type: Boolean, default: true },
  ac: { type: Boolean, default: true },
  television: { type: Boolean, default: true },
  hotWater: { type: Boolean, default: true },
  balcony: { type: Boolean, default: false },
  lastCleanedDate: Date,
  cleaningSchedule: String,
  currentCheckInGuest: mongoose.Schema.Types.ObjectId,
  checkInDate: Date,
  checkOutDate: Date,
}, { timestamps: true });

// Safe Mongoose hot-reloading
if (mongoose.models.GuestRoom) {
  delete mongoose.models.GuestRoom;
}

export default mongoose.model('GuestRoom', GuestRoomSchema);
