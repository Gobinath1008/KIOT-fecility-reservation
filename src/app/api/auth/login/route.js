import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { generateToken } from '@/lib/auth';

export async function POST(request) {
  try {
    await connectDB();
    const { email, password } = await request.json();
    if (!email || !password) return NextResponse.json({ message: 'Email and password required' }, { status: 400 });

    if (!/^[a-zA-Z0-9._%+-]+@kiot\.ac\.in$/.test(email)) {
      return NextResponse.json({ message: 'Only @kiot.ac.in emails are allowed' }, { status: 400 });
    }

    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password)))
      return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 });

    const token = generateToken({ id: user._id, role: user.role, name: user.name, email: user.email });
    const userData = { _id: user._id, name: user.name, email: user.email, role: user.role, department: user.department };

    const response = NextResponse.json({ user: userData });
    response.cookies.set('token', token, { httpOnly: true, maxAge: 60 * 60 * 24 * 30, path: '/', sameSite: 'lax' });
    return response;
  } catch (err) {
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
