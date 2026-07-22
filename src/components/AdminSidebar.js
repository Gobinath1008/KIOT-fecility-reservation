'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Navbar.module.css';
import { useLogout } from './useLogout';

export default function AdminSidebar({ user }) {
  const pathname = usePathname();
  const handleLogout = useLogout();
  const [isOpen, setIsOpen] = useState(false);

  const isSuperAdmin = user?.role === 'super-admin';

  const isWorkflowApprover = ['hod', 'principal', 'ao', 'transport_manager', 'hostel_warden'].includes(user?.role);

  const navLinks = [
    { href: '/admin', label: 'Dashboard', icon: '📊' },
    ...(isSuperAdmin ? [{ href: '/admin/super-admin', label: 'Super Admin', icon: '👑' }] : []),
    ...(!isWorkflowApprover ? [
      { href: '/admin/halls', label: 'Halls', icon: '🏛️' },
      { href: '/admin/vehicles', label: 'Vehicles', icon: '🚗' },
      { href: '/admin/rooms', label: 'Rooms', icon: '🏨' },
    ] : []),
    { href: '/admin/bookings', label: 'Bookings', icon: '📋' },
    ...(!isWorkflowApprover || user?.role === 'hod' ? [{ href: '/', label: 'Booking Now', icon: '📅' }] : []),
  ];

  const isActive = (href) => pathname === href || pathname.startsWith(`${href}/`);

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  return (
    <>
      {/* Mobile Top Header Bar (Sticky) */}
      <div className={styles.mobileHeader}>
        <Link href="/admin" className={styles.mobileLogo} onClick={closeMenu}>
          <img src="/images/kiotlogo.jpeg" alt="KIOT Logo" className={styles.mobileLogoImage} />
          <span className={styles.mobileLogoText}>{user?.role === 'hod' ? 'KIOT HOD' : 'KIOT Admin'}</span>
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
          <div className="flex justify-between items-center w-full">
            <Link href="/admin" className={styles.logo} onClick={closeMenu}>
              <img src="/images/kiotlogo.jpeg" alt="KIOT Logo" className={styles.logoImage} />
              <div className={styles.logoMeta}>
                <span className={styles.logoName}>{user?.role === 'hod' ? 'KIOT HOD' : 'KIOT Admin'}</span>
                <span className={styles.logoSub}>{user?.role === 'hod' ? 'HOD Control' : 'Booking Control'}</span>
              </div>
            </Link>
          </div>

          <Link href="/admin" className={styles.profileSection} style={{ cursor: 'pointer', textDecoration: 'none' }} onClick={closeMenu}>
            <div className={styles.userText}>
              <span className={styles.userName}>{user?.name}</span>
              <span className={`${styles.roleBadge} ${
                isSuperAdmin ? styles.superAdminBadge : 
                user?.role === 'hod' ? styles.adminBadge :
                user?.role === 'principal' ? styles.adminBadge :
                user?.role === 'ao' ? styles.adminBadge :
                user?.role === 'transport_manager' ? styles.adminBadge :
                user?.role === 'hostel_warden' ? styles.adminBadge :
                styles.adminBadge
              }`}>
                {isSuperAdmin ? '👑 Super Admin' : 
                 user?.role === 'hod' ? `🎓 HOD (${user.department || ''})` :
                 user?.role === 'principal' ? '🏫 Principal' :
                 user?.role === 'ao' ? '💼 AO' :
                 user?.role === 'transport_manager' ? '🚌 Transport Mgr' :
                 user?.role === 'hostel_warden' ? '🏨 Hostel Warden' :
                 '🛡️ Admin'}
              </span>
            </div>
          </Link>
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
          <Link href="/profile" className={styles.sidebarButton} onClick={closeMenu}>👤 Profile</Link>
          <button type="button" onClick={() => { closeMenu(); handleLogout(); }} className={styles.sidebarButtonSecondary}>🚪 Logout</button>
        </div>
        <div className={styles.sidebarFooter}>
          <div>© 2026</div>
          <div style={{ fontSize: '9px', opacity: 0.75, marginTop: '4px', lineHeight: '1.4' }}>
            Developed by GOBINATH S and GAUTHAM S from MCA
          </div>
        </div>
      </aside>
    </>
  );
}