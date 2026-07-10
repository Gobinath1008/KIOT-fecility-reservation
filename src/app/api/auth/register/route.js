import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { generateToken } from '@/lib/auth';

export async function POST(request) {
  try {
    await connectDB();
    const { name, email, password, courseType, department } = await request.json();

    if (!name || !email || !password || !courseType || !department) {
      return NextResponse.json({ message: 'Name, email and password are required' }, { status: 400 });
    }
    
    // Validate KIOT domain
    if (!/^[a-zA-Z0-9._%+-]+@kiot\.ac\.in$/.test(email)) {
      return NextResponse.json({ message: 'Only @kiot.ac.in emails are allowed' }, { status: 400 });
    }

    const exists = await User.findOne({ email });
    if (exists) return NextResponse.json({ message: 'Email already registered' }, { status: 400 });

    const user = await User.create({ name, email, password, role: 'user', courseType, department });

    const token = generateToken({ id: user._id, role: user.role, name: user.name, email: user.email });
    const userData = { _id: user._id, name: user.name, email: user.email, role: user.role, courseType: user.courseType, department: user.department };

    const response = NextResponse.json({ user: userData, message: 'Registered successfully' }, { status: 201 });
    response.cookies.set('token', token, { httpOnly: true, maxAge: 60 * 60 * 24 * 30, path: '/', sameSite: 'lax' });
    return response;
  } catch (err) {
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
