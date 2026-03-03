import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ShareableEvent } from '../types';
import { listEvents, deleteEvent, saveEvent } from '../lib/storage';
import styles from './EventsListScreen.module.css';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    || 'event';
}

export function EventsListScreen() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<{ slug: string; event: ShareableEvent }[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    const all = await listEvents();
    all.sort((a, b) => b.event.date.localeCompare(a.event.date));
    setEvents(all);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleDelete = useCallback(async (e: React.MouseEvent, slug: string, name: string) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${name || 'Untitled Gathering'}"? This will remove all talks and data.`)) {
      return;
    }
    await deleteEvent(slug);
    loadEvents();
  }, [loadEvents]);

  const handleRun = useCallback((e: React.MouseEvent, slug: string) => {
    e.stopPropagation();
    navigate(`/admin/events/${slug}/run`);
  }, [navigate]);

  const handleSelectEvent = useCallback((slug: string) => {
    navigate(`/admin/events/${slug}`);
  }, [navigate]);

  const handleCreateEvent = useCallback(async () => {
    const city = prompt('City name (e.g. Tallinn):');
    if (!city?.trim()) return;
    const date = new Date().toISOString().split('T')[0];
    const slug = `${slugify(city)}/${date}`;
    const newEvent: ShareableEvent = {
      name: '',
      city: city.trim(),
      date,
      link: '',
      presentations: [],
    };
    await saveEvent(slug, newEvent);
    navigate(`/admin/events/${slug}`);
  }, [navigate]);

  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const handleCopyLink = useCallback((e: React.MouseEvent, slug: string) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}${import.meta.env.BASE_URL}events/${slug}/`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopiedSlug(slug);
      setTimeout(() => setCopiedSlug(null), 2000);
    });
  }, []);

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

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading events...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Cafe 2035</h1>
        <p className={styles.subtitle}>A worldwide movement of builders, dreamers, and storytellers</p>
        <p className={styles.quote}>"How many things have been denied one day, only to become realities the next!" — Jules Verne</p>
      </header>

      {events.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <p className={styles.emptyText}>No gatherings yet</p>
          <button className={styles.createButton} onClick={handleCreateEvent}>
            Open a window into 2035
          </button>
        </div>
      ) : (
        <div className={styles.grid}>
          {events.map(({ slug, event }) => (
            <div
              key={slug}
              className={styles.card}
              onClick={() => handleSelectEvent(slug)}
            >
              <div className={styles.cardLogo}>
                {event.logo ? (
                  <img src={event.logo} alt="" className={styles.logoImage} />
                ) : (
                  <div className={styles.logoPlaceholder}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  </div>
                )}
              </div>
              <div className={styles.cardInfo}>
                <h3 className={styles.cardName}>{event.name || 'Untitled Gathering'}</h3>
                <div className={styles.cardMeta}>
                  {event.city && <span>{event.city}</span>}
                  {event.city && event.date && <span className={styles.metaDot}>&middot;</span>}
                  {event.date && <span>{formatDate(event.date)}</span>}
                </div>
              </div>
              <div className={styles.cardActions}>
                <button
                  className={styles.copyLinkButton}
                  onClick={(e) => handleCopyLink(e, slug)}
                  title="Copy share link"
                >
                  {copiedSlug === slug ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                  )}
                  {copiedSlug === slug ? 'Copied!' : 'Share'}
                </button>
                <button
                  className={styles.runCardButton}
                  onClick={(e) => handleRun(e, slug)}
                  title="Go Live"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21" />
                  </svg>
                  Go Live
                </button>
              </div>
              <button
                className={styles.deleteButton}
                onClick={(e) => handleDelete(e, slug, event.name)}
                aria-label="Delete event"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
          ))}

          <div className={styles.newCard} onClick={handleCreateEvent}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>New Gathering</span>
          </div>
        </div>
      )}
    </div>
  );
}
