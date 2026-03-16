import { useState, useCallback } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import styles from '../App.module.css';
import navStyles from './CommunityScreen.module.css';

const ADMIN_EMAIL = 'franck@recorp.co';
const ADMIN_PASSWORD = 'pofpof';
const ADMIN_SESSION_KEY = 'admin_unlocked';

export function AdminGuard() {
  const [adminUnlocked, setAdminUnlocked] = useState(
    () => sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true',
  );
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState(false);
  const location = useLocation();

  const handlePasswordSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (emailInput === ADMIN_EMAIL && passwordInput === ADMIN_PASSWORD) {
      setAdminUnlocked(true);
      sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
      setEmailInput('');
      setPasswordInput('');
      setLoginError(false);
    } else {
      setLoginError(true);
    }
  }, [emailInput, passwordInput]);

  const handleLogout = useCallback(() => {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    window.location.hash = '/';
    window.location.reload();
  }, []);

  if (!adminUnlocked) {
    return (
      <div className={styles.app}>
        <div className={styles.passwordGate}>
          <form className={styles.passwordForm} onSubmit={handlePasswordSubmit}>
            <h2 className={styles.passwordTitle}>Admin Access</h2>
            <input
              className={`${styles.passwordInput} ${loginError ? styles.passwordInputError : ''}`}
              type="email"
              value={emailInput}
              onChange={(e) => { setEmailInput(e.target.value); setLoginError(false); }}
              placeholder="Email"
              autoFocus
            />
            <input
              className={`${styles.passwordInput} ${loginError ? styles.passwordInputError : ''}`}
              type="password"
              value={passwordInput}
              onChange={(e) => { setPasswordInput(e.target.value); setLoginError(false); }}
              placeholder="Password"
            />
            <button className={styles.passwordButton} type="submit">Enter</button>
          </form>
        </div>
      </div>
    );
  }

  const isAdminHome = location.pathname === '/admin' || location.pathname === '/admin/';

  return (
    <div className={navStyles.page}>
      <nav className={navStyles.topNav}>
        <Link to="/" className={navStyles.navBrand}>☕ 2035Cafe</Link>
        <div className={navStyles.navRight}>
          <Link to="/prepare" className={navStyles.navLink}>Tell a story</Link>
          <Link to="/admin" className={isAdminHome ? navStyles.navCta : navStyles.navLink}>Admin</Link>
          <button onClick={handleLogout} className={navStyles.navLink}>Logout</button>
        </div>
      </nav>
      <Outlet />
    </div>
  );
}
