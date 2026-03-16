import { Link } from 'react-router-dom';
import styles from './CommunityScreen.module.css';

const isAdmin = () => sessionStorage.getItem('admin_unlocked') === 'true';

export function Navbar() {
  return (
    <nav className={styles.topNav}>
      <Link to="/" className={styles.navBrand}>☕ 2035Cafe</Link>
      <div className={styles.navRight}>
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
