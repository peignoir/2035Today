import { useState, useCallback, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import styles from './Navbar.module.css';

interface NavbarProps {
  scrollTo?: (id: string) => void;
  onLogout?: () => void;
}

export function Navbar({ scrollTo, onLogout }: NavbarProps) {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => { setOpen(false); }, [location.pathname]);

  const close = useCallback(() => setOpen(false), []);

  const goToSection = (id: string) => {
    if (scrollTo) {
      scrollTo(id);
    } else {
      window.location.hash = '/';
      setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 200);
    }
    close();
  };

  const links = (
    <>
      <button onClick={() => goToSection('solojam')} className={styles.navLink}>Solo Founder Spark</button>
      <button onClick={() => goToSection('soloha')} className={styles.navLink}>Solo Online Jam</button>
      <Link to="/apply" className={styles.navLink} onClick={close}>Start a City</Link>
      <button onClick={() => goToSection('cities')} className={styles.navCta}>Find a Spark</button>
      {onLogout && <button onClick={() => { onLogout(); close(); }} className={styles.navLink}>Logout</button>}
    </>
  );

  return (
    <nav className={styles.topNav}>
      <Link to="/" className={styles.navBrand}>2035 Today</Link>

      <div className={styles.navRight}>{links}</div>

      <button
        className={`${styles.burger} ${open ? styles.burgerOpen : ''}`}
        onClick={() => setOpen(!open)}
        aria-label="Menu"
      >
        <span />
        <span />
        <span />
      </button>

      {open && <div className={styles.mobileMenu}>{links}</div>}
    </nav>
  );
}
