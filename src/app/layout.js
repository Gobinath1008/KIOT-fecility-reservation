import './globals.css';

export const metadata = {
  title: 'KIOT Hall Booking System',
  description: 'Book halls and seminar rooms at KIOT College. Students and staff can request halls, and admins can approve or reject bookings.',
};

import { Toaster } from 'react-hot-toast';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <Toaster position="top-right" />
        {children}
      </body>
    </html>
  );
}
