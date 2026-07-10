import mongoose from '@/lib/mongoose-compat';

const BlockedDateSchema = new mongoose.Schema({
  serviceType: { type: String, enum: ['hall', 'vehicle', 'room'], required: true },
  serviceId: { type: mongoose.Schema.Types.ObjectId, required: true },
  startDate: { type: String, required: true },
  endDate: { type: String, required: true },
  reason: { type: String, enum: ['maintenance', 'holiday', 'event', 'custom'], required: true },
  description: { type: String, default: '' },
  isRecurring: { type: Boolean, default: false },
  recurringDays: [String], // For recurring holidays like every Saturday
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

BlockedDateSchema.index({ serviceType: 1, serviceId: 1, startDate: 1 });
BlockedDateSchema.index({ serviceType: 1, startDate: 1 });

export default mongoose.models.BlockedDate || mongoose.model('BlockedDate', BlockedDateSchema);