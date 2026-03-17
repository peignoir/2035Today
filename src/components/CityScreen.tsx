import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { ShareableEvent } from '../types';
import { listEvents } from '../lib/storage';
import styles from './CityScreen.module.css';

function titleCase(s: string): string {
  return s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function CityScreen() {
  const { city } = useParams<{ city: string }>();
  const [events, setEvents] = useState<{ slug: string; event: ShareableEvent }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!city) return;
    let cancelled = false;
    (async () => {
      const all = await listEvents();
      if (cancelled) return;
      const cityEvents = all
        .filter((e) => e.slug.split('/')[0] === city)
        .sort((a, b) => b.event.date.localeCompare(a.event.date));
      setEvents(cityEvents);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [city]);

  const cityName = events[0]?.event.city || titleCase(city || '');
  const today = new Date().toISOString().split('T')[0];
  const upcoming = events.filter((e) => e.event.date >= today);
  const past = events.filter((e) => e.event.date < today);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className={styles.empty}>
          <h1>No events found in {titleCase(city || '')}</h1>
          <Link to="/" className={styles.backLink}>&larr; Back to home</Link>
        </div>
    );
  }

  return (
    <>
      <header className={styles.hero}>
        <h1 className={styles.cityName}>{cityName}</h1>
        <p className={styles.citySub}>{events.length} gathering{events.length !== 1 ? 's' : ''}</p>
      </header>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Upcoming</h2>
          {upcoming.map(({ slug, event }) => (
            <Link key={slug} to={`/${slug}`} className={styles.eventCard}>
              {event.logo && <img src={event.logo} alt="" className={styles.eventLogo} />}
              <div className={styles.eventInfo}>
                <h3 className={styles.eventName}>{event.name}</h3>
                <span className={styles.eventDate}>{formatDate(event.date)}</span>
                {event.link && <span className={styles.eventBadge}>Tickets open</span>}
              </div>
              <span className={styles.eventArrow}>&rarr;</span>
            </Link>
          ))}
        </section>
      )}

      {/* Past events with stories */}
      {past.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Past stories</h2>
          {past.map(({ slug, event }) => {
            const hasRecordings = event.presentations.some((p) => p.recording);
            return (
              <div key={slug} className={styles.pastEvent}>
                <div className={styles.pastHeader}>
                  <Link to={`/${slug}`} className={styles.pastLink}>
                    {event.logo && <img src={event.logo} alt="" className={styles.pastLogo} />}
                    <div>
                      <h3 className={styles.pastName}>{event.name}</h3>
                      <span className={styles.pastDate}>{formatDate(event.date)}</span>
                    </div>
                  </Link>
                </div>
                {hasRecordings && (
                  <div className={styles.storiesGrid}>
                    {event.presentations.map((pres, i) =>
                      pres.recording ? (
                        <div key={i} className={styles.storyCard}>
                          <video
                            className={styles.storyVideo}
                            src={pres.recording}
                            controls
                            preload="metadata"
                            playsInline
                          />
                          <div className={styles.storyInfo}>
                            <span className={styles.storyTitle}>{pres.storyName || 'Untitled'}</span>
                            <span className={styles.storySpeaker}>{pres.speakerName || 'Speaker'}</span>
                          </div>
                        </div>
                      ) : null,
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}

      <footer className={styles.footer}>
        <Link to="/" className={styles.footerBrand}>Cafe2035</Link>
        <span className={styles.footerTagline}>What was impossible is now a side project.</span>
      </footer>
    </>
  );
}
