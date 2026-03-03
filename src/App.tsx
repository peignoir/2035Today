import { HashRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AdminGuard } from './components/AdminGuard';
import { EventsListScreen } from './components/EventsListScreen';
import { EventSetupScreen } from './components/EventSetupScreen';
import { EventRunScreen } from './components/EventRunScreen';
import { EventLandingPage } from './components/EventLandingPage';
import styles from './App.module.css';

function NotFound() {
  return (
    <div className={styles.app}>
      <div className={styles.passwordGate}>
        <h2 className={styles.passwordTitle}>Page not found</h2>
        <p style={{ color: '#999', textAlign: 'center' }}>
          Check the URL or ask the organizer for a share link.
        </p>
      </div>
    </div>
  );
}

/** Route dispatcher: React Router v6 only allows * at end of path,
 *  so we use a single events/* route and check for /run suffix. */
function EventRouter() {
  const { '*': slugParam } = useParams();
  if (slugParam?.endsWith('/run')) return <EventRunScreen />;
  return <EventSetupScreen />;
}

function App() {
  return (
    <HashRouter>
      <Routes>
        {/* Public event landing page */}
        <Route path="/:city/:date" element={<EventLandingPage />} />

        {/* Admin routes (password-gated) */}
        <Route path="/admin" element={<AdminGuard />}>
          <Route index element={<EventsListScreen />} />
          <Route path="events/*" element={<EventRouter />} />
        </Route>

        {/* Default: redirect root to admin */}
        <Route path="/" element={<Navigate to="/admin" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
