import mongoose from '@/lib/mongoose-compat';

const RoomBookingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  serviceType: { type: String, default: 'room' },
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'GuestRoom', required: true },
  
  roomCheckInDate: { type: String, required: true },
  roomCheckOutDate: { type: String, required: true },
  roomCheckInTime: { type: String, default: '14:00' },
  roomCheckOutTime: { type: String, default: '12:00' },
  numberOfGuests: Number,
  numberOfRooms: { type: Number, default: 1 },
  roomPurpose: String,
  specialRequests: String,

  status: { type: String, enum: ['pending', 'pending_hod', 'pending_principal', 'pending_ao', 'pending_warden', 'approved', 'rejected', 'cancelled', 'completed'], default: 'pending_hod' },
  guestName: String,
  guestEmail: String,
  guestPhone: String,

  // Stage approvals log auditing
  approvals: [{
    stage: String,
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    status: String,
    comment: String
  }],

  adminNote: String,
  actionBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  actionAt: Date,
  cancelledBy: { type: String, enum: ['user', 'admin'], default: null },
  cancellationReason: String,
  cancelledAt: Date,

  // payment fields removed

  department: String,
}, { timestamps: true });

RoomBookingSchema.index({ user: 1, createdAt: -1 });
RoomBookingSchema.index({ serviceId: 1, status: 1 });
RoomBookingSchema.index({ serviceId: 1, roomCheckInDate: 1 });

// Safe Mongoose hot-reloading
if (mongoose.models.RoomBooking) {
  delete mongoose.models.RoomBooking;
}

export default mongoose.model('RoomBooking', RoomBookingSchema);
