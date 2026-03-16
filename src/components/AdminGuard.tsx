import { useState, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
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

  return (
    <div className={navStyles.page}>
      <Navbar onLogout={handleLogout} />
      <Outlet />
    </div>
  );
}
