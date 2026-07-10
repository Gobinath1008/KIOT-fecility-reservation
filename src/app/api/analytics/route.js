import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import HallBooking from '@/models/HallBooking';
import VehicleBooking from '@/models/VehicleBooking';
import RoomBooking from '@/models/RoomBooking';
import Hall from '@/models/Hall';
import Vehicle from '@/models/Vehicle';
import GuestRoom from '@/models/GuestRoom';
import User from '@/models/User';
import { requireSuperAdmin } from '@/lib/middleware';

export async function GET(request) {
  const { user, error } = await requireSuperAdmin(request);
  if (error) return error;

  await connectDB();

  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') || '30'; // days
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  const daysAgo = new Date();
  daysAgo.setDate(daysAgo.getDate() - parseInt(period));

  const dateFilter = startDate && endDate
    ? { createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) } }
    : { createdAt: { $gte: daysAgo } };

  // Fetch status counts and resource counts in parallel
  const [
    hallCounts,
    vehicleCounts,
    roomCounts,
    hallCount,
    vehicleCount,
    roomCount,
    totalUsers,
    adminCount,
    userCount
  ] = await Promise.all([
    HallBooking.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    VehicleBooking.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    RoomBooking.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Hall.countDocuments({ isActive: true }),
    Vehicle.countDocuments({ isActive: true }),
    GuestRoom.countDocuments({ isActive: true }),
    User.countDocuments(),
    User.countDocuments({ role: 'admin' }),
    User.countDocuments({ role: { $in: ['user', 'customer'] } })
  ]);

  // Aggregate status counts in memory
  const statusMap = { pending: 0, approved: 0, rejected: 0, cancelled: 0, completed: 0 };
  const addStatusCounts = (list) => {
    list.forEach(item => {
      if (statusMap[item._id] !== undefined) {
        statusMap[item._id] += item.count;
      }
    });
  };
  addStatusCounts(hallCounts);
  addStatusCounts(vehicleCounts);
  addStatusCounts(roomCounts);

  const totalBookings = Object.values(statusMap).reduce((a, b) => a + b, 0);
  const totalRevenue = 0;
  const revenueByService = {
    hall: { total: 0, count: hallCounts.find(c => c._id === 'approved')?.count || 0 },
    vehicle: { total: 0, count: vehicleCounts.find(c => c._id === 'approved')?.count || 0 },
    room: { total: 0, count: roomCounts.find(c => c._id === 'approved')?.count || 0 }
  };

  // Bookings by service type (in dateFilter)
  const [hallCountFiltered, vehicleCountFiltered, roomCountFiltered] = await Promise.all([
    HallBooking.countDocuments(dateFilter),
    VehicleBooking.countDocuments(dateFilter),
    RoomBooking.countDocuments(dateFilter)
  ]);
  const bookingsByService = {
    hall: hallCountFiltered,
    vehicle: vehicleCountFiltered,
    room: roomCountFiltered
  };

  // Monthly counts (last 12 months)
  const [hallMonthly, vehicleMonthly, roomMonthly] = await Promise.all([
    HallBooking.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, count: { $sum: 1 } } }
    ]),
    VehicleBooking.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, count: { $sum: 1 } } }
    ]),
    RoomBooking.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, count: { $sum: 1 } } }
    ])
  ]);

  const monthlyMap = {};
  const addToMonthly = (list) => {
    list.forEach(item => {
      if (item._id && item._id.year && item._id.month) {
        const key = `${item._id.year}-${item._id.month}`;
        if (!monthlyMap[key]) {
          monthlyMap[key] = { year: item._id.year, month: item._id.month, total: 0, count: 0 };
        }
        monthlyMap[key].count += item.count;
      }
    });
  };
  addToMonthly(hallMonthly);
  addToMonthly(vehicleMonthly);
  addToMonthly(roomMonthly);

  const monthlyRevenue = Object.values(monthlyMap)
    .sort((a, b) => b.year !== a.year ? b.year - a.year : b.month - a.month)
    .slice(0, 12)
    .reverse();

  // Recent bookings
  const [hallRec, vehicleRec, roomRec] = await Promise.all([
    HallBooking.find().populate('user', 'name email').sort({ createdAt: -1 }).limit(10),
    VehicleBooking.find().populate('user', 'name email').sort({ createdAt: -1 }).limit(10),
    RoomBooking.find().populate('user', 'name email').sort({ createdAt: -1 }).limit(10)
  ]);
  const recentBookings = [...hallRec, ...vehicleRec, ...roomRec]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 10);

  // Top services by bookings
  const [hallBookings, vehicleBookings, roomBookings] = await Promise.all([
    HallBooking.aggregate([
      { $group: { _id: '$serviceId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]),
    VehicleBooking.aggregate([
      { $group: { _id: '$serviceId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]),
    RoomBooking.aggregate([
      { $group: { _id: '$serviceId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ])
  ]);

  // Daily bookings for chart
  const [hallDaily, vehicleDaily, roomDaily] = await Promise.all([
    HallBooking.aggregate([
      { $match: { createdAt: { $gte: daysAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } }
    ]),
    VehicleBooking.aggregate([
      { $match: { createdAt: { $gte: daysAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } }
    ]),
    RoomBooking.aggregate([
      { $match: { createdAt: { $gte: daysAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } }
    ])
  ]);

  const dailyMap = {};
  const addDaily = (list) => {
    list.forEach(item => {
      if (item._id) {
        if (!dailyMap[item._id]) {
          dailyMap[item._id] = { _id: item._id, count: 0 };
        }
        dailyMap[item._id].count += item.count;
      }
    });
  };
  addDaily(hallDaily);
  addDaily(vehicleDaily);
  addDaily(roomDaily);
  const dailyBookings = Object.values(dailyMap).sort((a, b) => a._id.localeCompare(b._id));

  // Payment fields removed - no breakdown available

  return NextResponse.json({
    overview: {
      totalBookings,
      pendingBookings: statusMap.pending,
      approvedBookings: statusMap.approved,
      rejectedBookings: statusMap.rejected,
      cancelledBookings: statusMap.cancelled,
      completedBookings: statusMap.completed,
      totalRevenue,
      hallCount,
      vehicleCount,
      roomCount,
      totalUsers,
      adminCount,
      userCount
    },
    revenueByService,
    bookingsByService,
    monthlyRevenue,
    dailyBookings,
    recentBookings,
    statusBreakdown: statusMap,
    topServices: {
      halls: hallBookings,
      vehicles: vehicleBookings,
      rooms: roomBookings
    }
  });
}