'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Navbar.module.css';
import { useLogout } from './useLogout';

export default function UserSidebar({ user }) {
  const pathname = usePathname();
  const handleLogout = useLogout();
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [];
  if (user) {
    if (user.role === 'admin' || user.role === 'super-admin') {
      navLinks.push({ href: '/admin', label: 'Admin Dashboard', icon: '📊' });
    }
    navLinks.push({ href: '/', label: 'Home', icon: '🏠' });
    if (user.permissions?.hallAccess !== false) navLinks.push({ href: '/halls', label: 'Halls', icon: '🏛️' });
    if (user.permissions?.vehicleAccess !== false) navLinks.push({ href: '/vehicle-booking', label: 'Vehicles', icon: '🚗' });
    if (user.permissions?.guestRoomAccess !== false) navLinks.push({ href: '/room-booking', label: 'Rooms', icon: '🏨' });
    navLinks.push({ href: '/my-bookings', label: 'My Bookings', icon: '📋' });
  } else {
    navLinks.push(
      { href: '/halls', label: 'Halls', icon: '🏛️' },
      { href: '/vehicle-booking', label: 'Vehicles', icon: '🚗' },
      { href: '/room-booking', label: 'Rooms', icon: '🏨' },
    );
  }

  const isActive = (href) => pathname === href || pathname.startsWith(`${href}/`);

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  return (
    <>
      {/* Mobile Top Header Bar (Sticky) */}
      <div className={styles.mobileHeader}>
        <Link href="/" className={styles.mobileLogo} onClick={closeMenu}>
          <img src="/images/kiotlogo.jpeg" alt="KIOT Logo" className={styles.mobileLogoImage} />
          <span className={styles.mobileLogoText}>KIOT Booking</span>
        </Link>
        <button 
          onClick={toggleMenu} 
          className={`${styles.hamburgerBtn} ${isOpen ? styles.hamburgerBtnActive : ''}`}
          aria-label="Toggle Navigation Menu"
        >
          <span className={styles.bar}></span>
          <span className={styles.bar}></span>
          <span className={styles.bar}></span>
        </button>
      </div>

      {/* Backdrop overlay for mobile */}
      {isOpen && <div className={styles.backdrop} onClick={closeMenu} />}

      {/* Sidebar Container */}
      <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarTop}>
          <Link href="/" className={styles.logo} onClick={closeMenu}>
            <img src="/images/kiotlogo.jpeg" alt="KIOT Logo" className={styles.logoImage} />
            <div className={styles.logoMeta}>
              <span className={styles.logoName}>KIOT</span>
              <span className={styles.logoSub}>Booking</span>
            </div>
          </Link>

          {user && (
            user.role === 'admin' || user.role === 'super-admin' ? (
              <Link href="/admin" className={styles.profileSection} style={{ cursor: 'pointer', textDecoration: 'none' }} onClick={closeMenu}>
                <div className={styles.userText}>
                  <span className={styles.userName}>{user.name}</span>
                  <span className={`${styles.roleBadge} ${user.role === 'super-admin' ? styles.superAdminBadge : styles.adminBadge}`}>
                    {user.role === 'super-admin' ? '👑 Super Admin' : '🛡️ Admin'}
                  </span>
                </div>
              </Link>
            ) : (
              <div className={styles.profileSection}>
                <div className={styles.userText}>
                  <span className={styles.userName}>{user.name}</span>
                  <span className={`${styles.roleBadge} ${styles.userBadge}`}>👤 User</span>
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
              onClick={closeMenu}
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
              <Link href="/profile" className={styles.sidebarButton} onClick={closeMenu}>👤 Profile</Link>
              <button 
                type="button" 
                onClick={() => { closeMenu(); handleLogout(); }} 
                className={styles.sidebarButtonSecondary}
              >
                🚪 Logout
              </button>
            </>
          ) : (
            <div className={styles.guestButtons}>
              <Link href="/login" className={styles.sidebarButton} onClick={closeMenu}>Login</Link>
              <Link href="/register" className={styles.sidebarButtonSecondary} onClick={closeMenu}>Register</Link>
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
    </>
  );
}