import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET;

export function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

import { connectDB } from '@/lib/db';
import User from '@/models/User';

export async function getServerUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;
  
  const decoded = verifyToken(token);
  if (!decoded) return null;

  try {
    await connectDB();
    const user = await User.findById(decoded.id).lean().exec();
    if (!user) return null;
    
    // Return lean user object with id stringified for serialization
    const userId = user._id || user.id || decoded.id;
    return {
      ...user,
      _id: userId ? userId.toString() : '',
      id: userId ? userId.toString() : '',
    };
  } catch (error) {
    console.error("Error fetching user in getServerUser:", error);
    return decoded; // Fallback to token data if DB fails
  }
}
