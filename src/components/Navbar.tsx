import { useState, useCallback, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import styles from './Navbar.module.css';

const isAdmin = () => sessionStorage.getItem('admin_unlocked') === 'true';

interface NavbarProps {
  scrollTo?: (id: string) => void;
  onLogout?: () => void;
}

export function Navbar({ scrollTo, onLogout }: NavbarProps) {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  // Close menu on route change
  useEffect(() => { setOpen(false); }, [location.pathname]);

  const close = useCallback(() => setOpen(false), []);

  const navItems = scrollTo ? (
    <>
      <button onClick={() => { scrollTo('cities'); close(); }} className={styles.navLink}>Cities</button>
      <button onClick={() => { scrollTo('the2hours'); close(); }} className={styles.navLink}>How it works</button>
    </>
  ) : (
    <>
      <a href="#/" className={styles.navLink} onClick={(e) => { e.preventDefault(); close(); window.location.hash = '/'; setTimeout(() => document.getElementById('cities')?.scrollIntoView({ behavior: 'smooth' }), 200); }}>Cities</a>
      <a href="#/" className={styles.navLink} onClick={(e) => { e.preventDefault(); close(); window.location.hash = '/'; setTimeout(() => document.getElementById('the2hours')?.scrollIntoView({ behavior: 'smooth' }), 200); }}>How it works</a>
    </>
  );

  return (
    <nav className={styles.topNav}>
      <Link to="/" className={styles.navBrand}>☕ 2035Cafe</Link>

      {/* Desktop links */}
      <div className={styles.navRight}>
        {navItems}
        <Link to="/prepare" className={styles.navLink}>Become a Storyteller</Link>
        <Link to="/apply" className={styles.navCta}>Apply to Organize</Link>
        {isAdmin() ? (
          <>
            <Link to="/admin" className={styles.navLink}>Admin</Link>
            {onLogout && <button onClick={onLogout} className={styles.navLink}>Logout</button>}
          </>
        ) : (
          <Link to="/admin" className={styles.navLink}>Login</Link>
        )}
      </div>

      {/* Mobile hamburger */}
      <button
        className={`${styles.burger} ${open ? styles.burgerOpen : ''}`}
        onClick={() => setOpen(!open)}
        aria-label="Menu"
      >
        <span />
        <span />
        <span />
      </button>

      {/* Mobile menu */}
      {open && (
        <div className={styles.mobileMenu}>
          {navItems}
          <Link to="/prepare" className={styles.navLink} onClick={close}>Become a Storyteller</Link>
          <Link to="/apply" className={styles.navCta} onClick={close}>Apply to Organize</Link>
          {isAdmin() ? (
            <>
              <Link to="/admin" className={styles.navLink} onClick={close}>Admin</Link>
              {onLogout && <button onClick={() => { onLogout(); close(); }} className={styles.navLink}>Logout</button>}
            </>
          ) : (
            <Link to="/admin" className={styles.navLink} onClick={close}>Login</Link>
          )}
        </div>
      )}
    </nav>
  );
}
