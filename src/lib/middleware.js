import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';

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

export async function getServerUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;
  return verifyToken(token);
}

// Basic authentication - any logged in user
export async function requireAuth(request) {
  let token = request?.cookies?.get('token')?.value;
  if (!token) {
    try {
      const cookieStore = await cookies();
      token = cookieStore.get('token')?.value;
    } catch (e) {
      console.error('Error reading cookies in requireAuth:', e);
    }
  }

  if (!token) {
    return { error: NextResponse.json({ message: 'Not authenticated' }, { status: 401 }) };
  }
  const decoded = verifyToken(token);
  if (!decoded) {
    return { error: NextResponse.json({ message: 'Invalid token' }, { status: 401 }) };
  }

  try {
    await connectDB();
    const user = await User.findById(decoded.id).lean().exec();
    if (!user) {
      return { error: NextResponse.json({ message: 'User not found' }, { status: 401 }) };
    }
    const userId = user._id || user.id || decoded.id;
    return { user: { ...user, _id: userId ? userId.toString() : '', id: userId ? userId.toString() : '' } };
  } catch (err) {
    console.error('requireAuth Error:', err);
    return { error: NextResponse.json({ message: 'Database error in requireAuth' }, { status: 500 }) };
  }
}

// Admin or Super Admin
export async function requireAdmin(request) {
  const { user, error } = await requireAuth(request);
  if (error) return { error };
  if (user.role !== 'admin' && user.role !== 'super-admin') {
    return { error: NextResponse.json({ message: 'Admin access required' }, { status: 403 }) };
  }
  return { user };
}

// Super Admin only
export async function requireSuperAdmin(request) {
  const { user, error } = await requireAuth(request);
  if (error) return { error };
  if (user.role !== 'super-admin') {
    return { error: NextResponse.json({ message: 'Super admin access required' }, { status: 403 }) };
  }
  return { user };
}

// User or any authenticated user
export async function requireUser(request) {
  const { user, error } = await requireAuth(request);
  if (error) return { error };
  if (user.role !== 'user' && user.role !== 'customer' && user.role !== 'admin' && user.role !== 'super-admin') {
    return { error: NextResponse.json({ message: 'User access required' }, { status: 403 }) };
  }
  return { user };
}

// Check if admin has access to specific service type
// This checks assignedServices for admin role, super-admin has access to all
export async function requireServiceAccess(request, serviceType) {
  const { user, error } = await requireAuth(request);
  if (error) return { error };

  // Super admin has access to all services
  if (user.role === 'super-admin') {
    return { user, hasAccess: true };
  }

  // Check if admin has access to the service
  if (user.role === 'admin') {
    // Map service type to service name in assignedServices
    const serviceMap = {
      'hall': 'halls',
      'vehicle': 'vehicles',
      'room': 'rooms',
      'halls': 'halls',
      'vehicles': 'vehicles',
      'rooms': 'rooms'
    };

    const serviceName = serviceMap[serviceType];
    if (!serviceName) {
      return { error: NextResponse.json({ message: 'Invalid service type' }, { status: 400 }) };
    }

    const hasAccess = user.assignedServices?.includes(serviceName);
    if (!hasAccess) {
      return { error: NextResponse.json({ message: `You don't have access to ${serviceName} management` }, { status: 403 }) };
    }

    return { user, hasAccess: true };
  }

  // Users have access only to their own data
  return { user, hasAccess: true };
}

// Check user booking permissions
export async function requireBookingPermission(request, serviceType) {
  const { user, error } = await requireAuth(request);
  if (error) return { error };

  // Blocked users cannot book
  if (user.permissions?.blocked) {
    return { error: NextResponse.json({ message: 'Your booking privileges have been suspended. Contact admin for details.' }, { status: 403 }) };
  }

  // Users who cannot book
  if (user.permissions?.canBook === false) {
    return { error: NextResponse.json({ message: 'You do not have booking permissions.' }, { status: 403 }) };
  }

  // Check service-specific access
  if (serviceType === 'hall' && user.permissions?.hallAccess === false) {
    return { error: NextResponse.json({ message: 'You do not have hall booking access.' }, { status: 403 }) };
  }
  if (serviceType === 'vehicle' && user.permissions?.vehicleAccess === false) {
    return { error: NextResponse.json({ message: 'You do not have vehicle booking access.' }, { status: 403 }) };
  }
  if (serviceType === 'room' && user.permissions?.guestRoomAccess === false) {
    return { error: NextResponse.json({ message: 'You do not have guest room booking access.' }, { status: 403 }) };
  }

  return { user, hasPermission: true };
}

// Middleware for Next.js route handlers
// Usage: export const GET = withRole(['super-admin', 'admin'], ['halls', 'vehicles'])(handler)
export function withRole(allowedRoles = [], allowedServices = []) {
  return async function (handler) {
    return async (request, ...args) => {
      const { user, error } = await requireAuth(request);
      if (error) return error;

      // Check role
      if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        return NextResponse.json({ message: 'Role not authorized' }, { status: 403 });
      }

      // Check service access for admins
      if (user.role === 'admin' && allowedServices.length > 0) {
        const hasAccess = allowedServices.some(service =>
          user.assignedServices?.includes(service)
        );
        if (!hasAccess) {
          return NextResponse.json(
            { message: `Access denied to ${allowedServices.join(', ')}` },
            { status: 403 }
          );
        }
      }

      return handler(request, ...args);
    };
  };
}