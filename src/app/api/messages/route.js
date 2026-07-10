import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Message from '@/models/Message';
import User from '@/models/User';
import { requireAuth } from '@/lib/middleware';

export async function GET(request) {
  const { user, error } = await requireAuth(request);
  if (error) return error;
  await connectDB();

  const { searchParams } = new URL(request.url);
  const otherUserId = searchParams.get('with');
  const action = searchParams.get('action');

  // Get all conversations (latest message from each contact)
  if (action === 'conversations') {
    const sentMessages = await Message.find({ sender: user.id })
      .distinct('receiver');
    const receivedMessages = await Message.find({ receiver: user.id })
      .distinct('sender');
    
    const allContacts = [...new Set([...sentMessages, ...receivedMessages])];
    
    const conversations = await Promise.all(
      allContacts.map(async (contactId) => {
        const lastMessage = await Message.findOne({
          $or: [
            { sender: user.id, receiver: contactId },
            { sender: contactId, receiver: user.id }
          ]
        })
          .sort({ createdAt: -1 })
          .populate('sender', 'name email')
          .populate('receiver', 'name email');

        const unreadCount = await Message.countDocuments({
          sender: contactId,
          receiver: user.id,
          isRead: false,
          deletedByReceiver: false
        });

        return {
          contactId,
          lastMessage,
          unreadCount
        };
      })
    );

    return NextResponse.json(conversations);
  }

  // Get messages with specific user
  if (otherUserId) {
    const messages = await Message.find({
      $or: [
        { sender: user.id, receiver: otherUserId, deletedBySender: false },
        { sender: otherUserId, receiver: user.id, deletedByReceiver: false }
      ]
    })
      .populate('sender', 'name email')
      .populate('receiver', 'name email')
      .sort({ createdAt: 1 });

    // Mark messages as read
    await Message.updateMany(
      { sender: otherUserId, receiver: user.id, isRead: false },
      { isRead: true }
    );

    return NextResponse.json(messages);
  }

  return NextResponse.json({ message: 'Missing parameters' }, { status: 400 });
}

export async function POST(request) {
  const { user, error } = await requireAuth(request);
  if (error) return error;
  await connectDB();

  const { receiverId, content } = await request.json();

  if (!receiverId || !content || content.trim() === '') {
    return NextResponse.json({ message: 'Receiver and content are required' }, { status: 400 });
  }

  if (receiverId === user.id) {
    return NextResponse.json({ message: 'Cannot message yourself' }, { status: 400 });
  }

  // Verify receiver exists
  const receiver = await User.findById(receiverId);
  if (!receiver) {
    return NextResponse.json({ message: 'Receiver not found' }, { status: 404 });
  }

  const message = await Message.create({
    sender: user.id,
    receiver: receiverId,
    content: content.trim()
  });

  await message.populate('sender', 'name email');
  await message.populate('receiver', 'name email');

  return NextResponse.json(message, { status: 201 });
}
