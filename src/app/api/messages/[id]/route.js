import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Message from '@/models/Message';
import { requireAuth } from '@/lib/middleware';

export async function DELETE(request, props) {
  const params = await props.params;
  const { user, error } = await requireAuth(request);
  if (error) return error;
  await connectDB();

  const message = await Message.findById(params.id);
  if (!message) {
    return NextResponse.json({ message: 'Message not found' }, { status: 404 });
  }

  // Check if user is sender or receiver
  const isSender = message.sender.toString() === user.id;
  const isReceiver = message.receiver.toString() === user.id;

  if (!isSender && !isReceiver) {
    return NextResponse.json({ message: 'Not authorized' }, { status: 403 });
  }

  // Mark as deleted for the requesting user
  if (isSender) {
    message.deletedBySender = true;
  } else {
    message.deletedByReceiver = true;
  }

  // If deleted by both, remove the message
  if (message.deletedBySender && message.deletedByReceiver) {
    await Message.findByIdAndDelete(params.id);
    return NextResponse.json({ message: 'Message deleted' });
  }

  await message.save();
  return NextResponse.json({ message: 'Message deleted' });
}

export async function PATCH(request, props) {
  const params = await props.params;
  const { user, error } = await requireAuth(request);
  if (error) return error;
  await connectDB();

  const { action } = await request.json();

  const message = await Message.findById(params.id);
  if (!message) {
    return NextResponse.json({ message: 'Message not found' }, { status: 404 });
  }

  if (message.receiver.toString() !== user.id) {
    return NextResponse.json({ message: 'Not authorized' }, { status: 403 });
  }

  if (action === 'markAsRead') {
    message.isRead = true;
    await message.save();
    return NextResponse.json({ message: 'Message marked as read' });
  }

  return NextResponse.json({ message: 'Invalid action' }, { status: 400 });
}
