'use client';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from 'react-hot-toast';
import styles from '@/app/(public)/home.module.css';

export default function DashboardSidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (!response.ok) throw new Error('Logout failed');
      router.push('/login');
      router.refresh();
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error(error.message || 'Unable to log out');
    }
  };

  const navItems = [
    { href: '/', label: 'Home', icon: '🏠' },
    { href: '/halls', label: 'Halls', icon: '🏛️' },
    { href: '/vehicle-booking', label: 'Vehicles', icon: '🚐' },
    { href: '/room-booking', label: 'Rooms', icon: '🛏️' },
    { href: '/my-bookings', label: 'My Bookings', icon: '📋' },
    { href: '/profile', label: 'Profile', icon: '👤' },
  ];

  const isActive = (href) => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname?.startsWith(`${href}/`);
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarBrand}>
        <div className={styles.brandMark}>
          <img src="/images/kiotlogo.jpeg" alt="KIOT Logo" className={styles.brandLogo} />
        </div>
        <div className={styles.brandText}>
          <div className={styles.sidebarLabel}>KIOT</div>
          <div className={styles.sidebarTitle}>Booking</div>
        </div>
      </div>

      <nav className={styles.sidebarNav}>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.sidebarLink} ${isActive(item.href) ? styles.sidebarLinkActive : ''}`}
          >
            <span className={styles.navIcon}>{item.icon}</span>
            <span className={styles.navText}>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className={styles.sidebarFooter}>
        <button className={styles.logoutBtn} onClick={handleLogout}>Logout</button>
        <div className={styles.sidebarVersion}>v1.0 · 2026</div>
      </div>
    </aside>
  );
}
