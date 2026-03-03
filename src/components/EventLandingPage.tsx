import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import type { ShareableEvent } from '../types';
import { loadEvent } from '../lib/storage';
import { EventLandingScreen } from './EventLandingScreen';
import styles from '../App.module.css';

export function EventLandingPage() {
  const { city, date } = useParams<{ city: string; date: string }>();
  const slug = city && date ? `${city}/${date}` : null;

  const [event, setEvent] = useState<ShareableEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      const fetched = await loadEvent(slug);
      if (cancelled) return;
      if (fetched) {
        setEvent(fetched);
      } else {
        setNotFound(true);
      }
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [slug]);

  if (loading) {
    return <div className={styles.app} />;
  }

  if (notFound || !event) {
    return (
      <div className={styles.app}>
        <div className={styles.passwordGate}>
          <h2 className={styles.passwordTitle}>Event not found</h2>
          <p style={{ color: '#999', textAlign: 'center' }}>
            Ask the organizer for a share link to open this event on this device.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.app}>
      <EventLandingScreen event={event} />
    </div>
  );
}
