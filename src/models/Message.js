import mongoose from '@/lib/mongoose-compat';

const MessageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true, trim: true },
  isRead: { type: Boolean, default: false },
  deletedBySender: { type: Boolean, default: false },
  deletedByReceiver: { type: Boolean, default: false },
}, { timestamps: true });

MessageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
MessageSchema.index({ receiver: 1, isRead: 1 });

export default mongoose.models.Message || mongoose.model('Message', MessageSchema);
