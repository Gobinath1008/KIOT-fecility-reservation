# Multi-Service Booking Platform

A comprehensive Next.js booking platform supporting **Hall Booking**, **Vehicle Rental**, and **Guest Room Booking** with unified booking management, smart calendar, and multi-role access control.

## 🎯 Features

### Core Services
- 🏛️ **Hall Booking** - Event, seminar, conference, marriage halls
- 🚗 **Vehicle Booking** - Cars, vans, buses, bikes with driver options
- 🏨 **Guest Room Booking** - Economy, standard, deluxe, family rooms, suites

### Key Features
- 🔐 Multi-role authentication (Super Admin, Admin, Customer)
- 📅 Smart calendar with availability colors
- 💰 Unified booking system across all services
- 🚫 Conflict detection and double-booking prevention
- 📊 Admin dashboard with multi-service statistics
- 📱 Responsive mobile-friendly design
- ✨ Smooth animations with Framer Motion
- 🎨 Modern UI with Tailwind CSS

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm/yarn
- MongoDB (Atlas or Local)

### Installation

```bash
# Clone repository
git clone <repo-url>
cd hall-booking-web

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration
```

### Environment Variables (.env.local)
```
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/dbname
JWT_SECRET=your_secret_key_here
NEXT_PUBLIC_API_URL=http://localhost:3000
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_SECRET_KEY=your_razorpay_secret
```

### Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
src/
├── app/
│   ├── (public)/          # Public pages
│   │   └── page.js       # Home with 3 service cards
│   ├── (user)/           # Protected user routes
│   │   ├── my-bookings/  # User's all bookings
│   │   ├── dashboard/    # User dashboard
│   │   └── messages/     # Messaging
│   ├── (admin)/          # Protected admin routes
│   │   └── admin/
│   │       ├── page.js           # Admin dashboard
│   │       ├── vehicles/page.js  # Vehicle management
│   │       ├── rooms/page.js     # Room management
│   │       └── bookings/         # Booking management
│   ├── api/              # Backend APIs
│   │   ├── auth/         # Authentication
│   │   ├── halls/        # Hall CRUD
│   │   ├── vehicles/     # Vehicle CRUD
│   │   ├── rooms/        # Room CRUD
│   │   └── bookings/     # Unified booking API
│   ├── vehicle-booking/  # Vehicle booking page
│   └── room-booking/     # Room booking page
├── components/
│   ├── SmartCalendar.js  # Reusable calendar component
│   ├── Navbar.js         # Navigation
│   └── ...
├── models/               # MongoDB schemas
│   ├── User.js
│   ├── Hall.js
│   ├── Vehicle.js
│   ├── GuestRoom.js
│   └── Booking.js
└── lib/                  # Utilities
    ├── auth.js          # JWT handling
    ├── db.js            # MongoDB connection
    └── middleware.js    # Auth & role checks
```

## 🔑 Key Technologies

- **Frontend**: Next.js 16, React 19, Tailwind CSS, Framer Motion
- **Backend**: Node.js, Express (integrated in Next.js)
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT with bcrypt password hashing
- **Calendar**: Custom SmartCalendar component
- **UI**: Tailwind CSS + Framer Motion animations

## 📖 API Documentation

### Booking Creation
```javascript
// Hall Booking
POST /api/bookings
{
  "serviceType": "hall",
  "serviceId": "hall_id",
  "hallDate": "2024-06-15",
  "hallStartTime": "10:00",
  "hallEndTime": "14:00",
  "purpose": "Birthday Party",
  "attendees": 50,
  "totalAmount": 5000
}

// Vehicle Booking
POST /api/bookings
{
  "serviceType": "vehicle",
  "serviceId": "vehicle_id",
  "vehiclePickupDate": "2024-06-15",
  "vehicleReturnDate": "2024-06-18",
  "withDriver": true,
  "totalAmount": 8000
}

// Room Booking
POST /api/bookings
{
  "serviceType": "room",
  "serviceId": "room_id",
  "roomCheckInDate": "2024-06-15",
  "roomCheckOutDate": "2024-06-18",
  "numberOfGuests": 2,
  "numberOfRooms": 1,
  "totalAmount": 3000
}
```

## 🔒 Role-Based Access

### Customer
- Browse and book services
- View booking history
- Cancel own bookings
- Track booking status

### Admin
- Manage assigned services
- Approve/reject bookings
- View service-specific reports
- Update availability

### Super Admin
- Manage all services
- Create admin accounts
- View platform analytics
- Manage pricing and rules

## 📱 Pages & Features

### Public Pages
- `GET /` - Homepage with service cards
- `GET /halls` - Hall listing and booking
- `GET /vehicle-booking` - Vehicle booking
- `GET /room-booking` - Room booking

### User Pages (Auth Required)
- `GET /my-bookings` - All bookings across services
- `GET /dashboard` - User dashboard
- `GET /messages` - Messaging system

### Admin Pages (Auth Required)
- `GET /admin` - Multi-service dashboard
- `GET /admin/vehicles` - Manage vehicles
- `GET /admin/rooms` - Manage rooms
- `GET /admin/bookings` - Manage bookings

## 🎨 Features Showcase

### Smart Calendar
- Monthly view with available/booked/unavailable states
- Color-coded: Green (available), Red (booked), Gray (unavailable)
- Min/max date constraints
- Real-time availability checking

### Admin Dashboard
- Real-time statistics (halls, vehicles, rooms, bookings, revenue)
- Pending bookings count
- Bookings by service type
- Recent bookings table
- Quick action buttons

### Customer Dashboard
- All bookings unified view
- Filter by status and service type
- Cancel with reason
- Print booking reports
- Responsive card layout

## 🔧 Configuration

### Database Models
Each service has its own model with specific fields while sharing the unified Booking model.

**Booking Model Fields by Service Type:**
- **Hall**: hallDate, hallStartTime, hallEndTime, purpose, attendees
- **Vehicle**: pickupDate, returnDate, withDriver, fuelOption, pickupLocation, returnLocation
- **Room**: checkInDate, checkOutDate, numberOfGuests, numberOfRooms, specialRequests

## ✅ Validation & Conflict Detection

- ✅ Double booking prevention
- ✅ Overlapping booking detection
- ✅ Capacity constraints
- ✅ Maintenance schedule blocking
- ✅ User authentication required
- ✅ Admin-only operations protected

## 🚀 Deployment

### Vercel Deployment
```bash
npm i -g vercel
vercel login
vercel
```

### Environment Setup
Set environment variables in Vercel dashboard matching your `.env.local`

## 📝 MongoDB Indexes

Automatically created for performance:
- User: email (unique)
- Hall: name (unique)
- Vehicle: registrationNumber (unique)
- GuestRoom: roomNumber (unique)
- Booking: user+createdAt, serviceId+status, serviceType+status

## 🐛 Troubleshooting

### Issue: MongoDB Connection Failed
- Check MONGODB_URI in .env.local
- Ensure IP whitelist in MongoDB Atlas
- Verify network connectivity

### Issue: JWT Errors
- Clear browser cookies
- Verify JWT_SECRET matches
- Check token expiry settings

### Issue: Booking Conflicts
- Refresh calendar data
- Check availability in admin panel
- Verify date format (YYYY-MM-DD)

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [MongoDB Documentation](https://docs.mongodb.com)
- [Mongoose ORM](https://mongoosejs.com)
- [Framer Motion](https://www.framer.com/motion)
- [Tailwind CSS](https://tailwindcss.com)

## 📋 Roadmap

- [ ] Payment gateway integration (Razorpay/Stripe)
- [ ] Email notifications
- [ ] SMS alerts
- [ ] Analytics dashboard
- [ ] QR code tickets
- [ ] PDF invoices
- [ ] Dark mode
- [ ] Multi-language support
- [ ] Advanced reporting

## 🤝 Contributing

Contributions welcome! Please follow the existing code style and submit PRs.

## 📄 License

MIT License - see LICENSE file for details

## 💬 Support

For issues and questions:
- Create an issue in the repository
- Check existing documentation
- Review API documentation

---

**Happy Booking! 🎉**
