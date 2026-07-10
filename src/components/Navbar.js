'use client';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import styles from './Navbar.module.css'; // Assuming this contains user styles

export default function Navbar({ user }) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (!response.ok) throw new Error('Logout failed');
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error(error);
      alert('Unable to logout. Please try again.');
    }
  };

  const isSuperAdmin = user?.role === 'super-admin';
  const isAdmin = user?.role === 'admin' || user?.role === 'super-admin';

  const navLinks = [];
  if (user) {
    if (isAdmin) {
      navLinks.push(
        { href: '/admin', label: 'Dashboard', icon: '📊' },
        { href: '/admin/halls', label: 'Halls', icon: '🏛️' },
        { href: '/admin/vehicles', label: 'Vehicles', icon: '🚗' },
        { href: '/admin/rooms', label: 'Rooms', icon: '🏨' },
        { href: '/admin/bookings', label: 'Bookings', icon: '📋' },
      );
      if (isSuperAdmin) {
        navLinks.splice(1, 0, { href: '/admin/super-admin', label: 'Super Admin', icon: '👑' });
      }
    } else {
      navLinks.push({ href: '/', label: 'Home', icon: '🏠' });
      if (user.permissions?.hallAccess !== false) navLinks.push({ href: '/halls', label: 'Halls', icon: '🏛️' });
      if (user.permissions?.vehicleAccess !== false) navLinks.push({ href: '/vehicle-booking', label: 'Vehicles', icon: '🚗' });
      if (user.permissions?.guestRoomAccess !== false) navLinks.push({ href: '/room-booking', label: 'Rooms', icon: '🏨' });
      navLinks.push({ href: '/my-bookings', label: 'My Bookings', icon: '📋' });
    }
  } else {
    navLinks.push(
      { href: '/halls', label: 'Halls', icon: '🏛️' },
      { href: '/vehicle-booking', label: 'Vehicles', icon: '🚗' },
      { href: '/room-booking', label: 'Rooms', icon: '🏨' },
      { href: '/login', label: 'Login', icon: '🔑' },
    );
  }

  const getRoleBadge = () => {
    if (isSuperAdmin) {
      return <span className={`${styles.roleBadge} ${styles.superAdminBadge}`}>👑 Super Admin</span>;
    }
    if (isAdmin) {
      return <span className={`${styles.roleBadge} ${styles.adminBadge}`}>🛡️ Admin</span>;
    }
    return <span className={`${styles.roleBadge} ${styles.userBadge}`}>👤 User</span>;
  };

  const isActive = (href) => pathname === href || pathname?.startsWith(`${href}/`);

  // User Dashboard Sidebar UI
  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarTop}>
        <Link href={isAdmin ? '/admin' : '/'} className={styles.logo}>
          <img src="/images/kiotlogo.jpeg" alt="KIOT Logo" className={styles.logoImage} />
          <div className={styles.logoMeta}>
            <span className={styles.logoName}>KIOT</span>
            <span className={styles.logoSub}>Booking</span>
          </div>
        </Link>

        {user && (
          isAdmin ? (
            <Link href="/admin" className={styles.profileSection} style={{ cursor: 'pointer', textDecoration: 'none' }}>
              <div className={styles.userText}>
                <span className={styles.userName}>{user.name}</span>
                {getRoleBadge()}
              </div>
            </Link>
          ) : (
            <div className={styles.profileSection}>
              <div className={styles.userText}>
                <span className={styles.userName}>{user.name}</span>
                {getRoleBadge()}
              </div>
            </div>
          )
        )}
      </div>

      <nav className={styles.navLinks}>
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`${styles.navLink} ${isActive(link.href) ? styles.navLinkActive : ''}`}
          >
            <span className={styles.navIcon}>{link.icon}</span>
            <span>{link.label}</span>
          </Link>
        ))}
      </nav>

      <div className={styles.sidebarBottom}>
        {user ? (
          <>
            <Link href="/profile" className={styles.sidebarButton}>👤 Profile</Link>
            <button type="button" onClick={handleLogout} className={styles.sidebarButton}>🚪 Logout</button>
          </>
        ) : (
          <div className={styles.guestButtons}>
            <Link href="/login" className={styles.sidebarButton}>Login</Link>
            <Link href="/register" className={styles.sidebarButtonSecondary}>Register</Link>
          </div>
        )}
      </div>
      <div className={styles.sidebarFooter}>
        <div>v1.0 · 2026</div>
        <div style={{ fontSize: '9px', opacity: 0.75, marginTop: '4px', lineHeight: '1.4' }}>
          developed by GOBINATH S and GAUTHAM S from MCA
        </div>
      </div>
    </aside>
  );
}