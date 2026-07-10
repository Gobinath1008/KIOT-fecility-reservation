import mongoose from '@/lib/mongoose-compat';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  phone: { type: String, default: '' },
  role: { type: String, enum: ['super-admin', 'admin', 'user', 'customer'], default: 'user' },
  status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
  assignedServices: [{ type: String, enum: ['halls', 'vehicles', 'rooms'] }],

  // Permission System
  permissions: {
    hallAccess: { type: Boolean, default: true },
    guestRoomAccess: { type: Boolean, default: true },
    vehicleAccess: { type: Boolean, default: true },
    canBook: { type: Boolean, default: true },
    canCancel: { type: Boolean, default: true },
    bookingLimit: { type: Number, default: 10 }, // Max bookings per month
    blocked: { type: Boolean, default: false },
    blockReason: { type: String, default: '' },
    blockedAt: { type: Date },
  },

  // Department for analytics
  department: { type: String, default: '' },

  profileImage: { type: String, default: '' },
  address: { type: String, default: '' },
  city: { type: String, default: '' },
  state: { type: String, default: '' },
  zipCode: { type: String, default: '' },
}, { timestamps: true });

UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

UserSchema.methods.matchPassword = async function (entered) {
  return bcrypt.compare(entered, this.password);
};

if (mongoose.models.User) {
  delete mongoose.models.User;
}
export default mongoose.model('User', UserSchema);
