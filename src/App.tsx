import { HashRouter, Routes, Route, useParams } from 'react-router-dom';
import { AdminGuard } from './components/AdminGuard';
import { Layout } from './components/Layout';
import { EventsListScreen } from './components/EventsListScreen';
import { EventSetupScreen } from './components/EventSetupScreen';
import { EventRunScreen } from './components/EventRunScreen';
import { EventLandingPage } from './components/EventLandingPage';
import { ApplyScreen } from './components/ApplyScreen';
import { ApplicationsScreen } from './components/ApplicationsScreen';
import { CommunityScreen } from './components/CommunityScreen';
import { CityScreen } from './components/CityScreen';
import { MicrodoseScreen } from './components/MicrodoseScreen';
import { PrepareScreen } from './components/PrepareScreen';
import { SignupScreen } from './components/SignupScreen';
import { SpeakerSignupsScreen } from './components/SpeakerSignupsScreen';
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
        {/* Public routes with shared navbar */}
        <Route element={<Layout />}>
          <Route path="/apply" element={<ApplyScreen />} />
          <Route path="/microdose" element={<MicrodoseScreen />} />
          <Route path="/prepare" element={<PrepareScreen />} />
          <Route path="/storyteller" element={<SignupScreen />} />
          <Route path="/:city/:date" element={<EventLandingPage />} />
          <Route path="/:city" element={<CityScreen />} />
        </Route>

        {/* Admin routes (password-gated, own navbar) */}
        <Route path="/admin" element={<AdminGuard />}>
          <Route index element={<EventsListScreen />} />
          <Route path="events/*" element={<EventRouter />} />
          <Route path="applications" element={<ApplicationsScreen />} />
          <Route path="signups" element={<SpeakerSignupsScreen />} />
        </Route>

        {/* Community homepage (has its own full navbar with scroll buttons) */}
        <Route path="/" element={<CommunityScreen />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
