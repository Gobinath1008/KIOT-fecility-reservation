import mongoose from '@/lib/mongoose-compat';

const HallSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  hallType: { type: String, enum: ['event', 'seminar', 'conference', 'marriage'], required: true },
  capacity: { type: Number, required: true, min: 1 },
  location: { type: String, required: true, trim: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  facilities: [String],
  description: { type: String, default: '' },
  pricePerHour: { type: Number, default: 0 },
  image: { type: String, default: '' },
  images: [String],
  status: { type: String, enum: ['available', 'booked', 'maintenance'], default: 'available' },
  isActive: { type: Boolean, default: true },
  availability: {
    monday: { open: String, close: String },
    tuesday: { open: String, close: String },
    wednesday: { open: String, close: String },
    thursday: { open: String, close: String },
    friday: { open: String, close: String },
    saturday: { open: String, close: String },
    sunday: { open: String, close: String },
  },
}, { timestamps: true });

export default mongoose.models.Hall || mongoose.model('Hall', HallSchema);
