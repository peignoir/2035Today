import { useState, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import styles from '../App.module.css';
import navStyles from './CommunityScreen.module.css';

const ADMIN_SESSION_KEY = 'admin_unlocked';

async function verifyPassword(email: string, password: string): Promise<boolean> {
  // In dev (localhost), use env vars; in prod, always call the Pages Function
  const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (isDev) {
    const devPassword = import.meta.env.VITE_ADMIN_PASSWORD;
    const devEmail = import.meta.env.VITE_ADMIN_EMAIL || 'franck@recorp.co';
    return email === devEmail && password === (devPassword || '');
  }
  try {
    const res = await fetch('/api/verify-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    return data.ok === true;
  } catch {
    return false;
  }
}

export function AdminGuard() {
  const [adminUnlocked, setAdminUnlocked] = useState(
    () => sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true',
  );
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState(false);
  const [checking, setChecking] = useState(false);

  const handlePasswordSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setChecking(true);
    const ok = await verifyPassword(emailInput, passwordInput);
    setChecking(false);
    if (ok) {
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
            <button className={styles.passwordButton} type="submit" disabled={checking}>
              {checking ? 'Checking...' : 'Enter'}
            </button>
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
