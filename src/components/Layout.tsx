import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import styles from './CommunityScreen.module.css';

export function Layout() {
  return (
    <div className={styles.page}>
      <Navbar />
      <Outlet />
    </div>
  );
}
