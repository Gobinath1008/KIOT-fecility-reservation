import { getSequelize } from './sequelize';

// Import all models to register them with Sequelize
import User from '@/models/User';
import Hall from '@/models/Hall';
import Vehicle from '@/models/Vehicle';
import GuestRoom from '@/models/GuestRoom';
import Booking from '@/models/Booking';
import HallBooking from '@/models/HallBooking';
import VehicleBooking from '@/models/VehicleBooking';
import RoomBooking from '@/models/RoomBooking';
import BlockedDate from '@/models/BlockedDate';
import Message from '@/models/Message';

const host = process.env.MYSQL_HOST || 'localhost';
const database = process.env.MYSQL_DATABASE || 'hallbooking';
const username = process.env.MYSQL_USER || 'root';

if (!database || !username) {
  throw new Error('Please define MYSQL_DATABASE and MYSQL_USER in .env.local');
}

let cached = global.dbCache;
if (!cached) {
  cached = global.dbCache = { conn: null, promise: null, superAdminChecked: false };
}

const SUPER_ADMIN_EMAIL = 'superadmin@kiot.ac.in';
const SUPER_ADMIN_PASSWORD = 'superkiot@321';

async function ensureSuperAdminExists() {
  if (cached.superAdminChecked) return;
  cached.superAdminChecked = true;

  try {
    const existingSuperAdmin = await User.findOne({ role: 'super-admin' });
    if (existingSuperAdmin) return;

    const existingDefaultEmail = await User.findOne({ email: SUPER_ADMIN_EMAIL });
    if (existingDefaultEmail) {
      console.warn(
        `User with email ${SUPER_ADMIN_EMAIL} already exists but is not a super-admin. ` +
        'Please update that account manually or remove it to allow default super-admin creation.'
      );
      return;
    }

    await User.create({
      name: 'Super Admin',
      email: SUPER_ADMIN_EMAIL,
      password: SUPER_ADMIN_PASSWORD,
      role: 'super-admin',
      assignedServices: ['halls', 'vehicles', 'rooms'],
      status: 'active'
    });
    console.log(`Created default super-admin: ${SUPER_ADMIN_EMAIL}`);
  } catch (err) {
    console.error('Super-admin check failed:', err.message);
  }
}

export async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    const sequelize = getSequelize();
    cached.promise = (async () => {
      // Authenticate Sequelize connection
      await sequelize.authenticate();
      console.log('Successfully connected to MySQL database.');

      // Automatically create or alter tables to match defined schemas
      await sequelize.sync({ alter: true });
      console.log('Database schemas synchronized successfully.');

      return sequelize;
    })();
  }

  cached.conn = await cached.promise;
  
  // Ensure default super admin check is run
  await ensureSuperAdminExists();
  
  return cached.conn;
}
