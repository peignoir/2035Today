import { Link } from 'react-router-dom';
import styles from './CommunityScreen.module.css';

const isAdmin = () => sessionStorage.getItem('admin_unlocked') === 'true';

export function Navbar() {
  return (
    <nav className={styles.topNav}>
      <Link to="/" className={styles.navBrand}>☕ 2035Cafe</Link>
      <div className={styles.navRight}>
        <a href="#/the2hours" className={styles.navLink} onClick={(e) => { e.preventDefault(); window.location.hash = '/'; setTimeout(() => document.getElementById('the2hours')?.scrollIntoView({ behavior: 'smooth' }), 200); }}>The 2 Hours</a>
        <a href="#/after" className={styles.navLink} onClick={(e) => { e.preventDefault(); window.location.hash = '/'; setTimeout(() => document.getElementById('after')?.scrollIntoView({ behavior: 'smooth' }), 200); }}>What's Next</a>
        <Link to="/prepare" className={styles.navLink}>Tell a story</Link>
        {isAdmin() ? (
          <Link to="/admin" className={styles.navLink}>Admin</Link>
        ) : (
          <Link to="/admin" className={styles.navLink}>Login</Link>
        )}
        <Link to="/apply" className={styles.navCta}>Organize one</Link>
      </div>
    </nav>
  );
}
