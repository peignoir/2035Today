import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ShareableEvent } from '../types';
import { listEvents, deleteEvent, saveEvent, uploadLogo, listCities } from '../lib/storage';
import { generateLogo } from '../lib/generateLogo';
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

/** Capitalize first letter of each word */
function titleCase(s: string): string {
  return s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function EventsListScreen() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<{ slug: string; event: ShareableEvent }[]>([]);
  const [loading, setLoading] = useState(true);
  const [knownCities, setKnownCities] = useState<string[]>([]);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    const [all, cities] = await Promise.all([listEvents(), listCities()]);
    all.sort((a, b) => b.event.date.localeCompare(a.event.date));
    setEvents(all);
    setKnownCities(cities);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Group events by city (slug prefix)
  const cityGroups = useMemo(() => {
    const groups = new Map<string, { slug: string; event: ShareableEvent }[]>();
    for (const item of events) {
      const citySlug = item.slug.split('/')[0];
      const cityName = item.event.city || titleCase(citySlug);
      if (!groups.has(cityName)) groups.set(cityName, []);
      groups.get(cityName)!.push(item);
    }
    return Array.from(groups.entries());
  }, [events]);

  const handleDelete = useCallback(async (e: React.MouseEvent, slug: string, name: string) => {
    e.stopPropagation();
    const pw = prompt(`Type admin password to delete "${name || 'Untitled Gathering'}":`);
    if (!pw) return;
    if (pw !== 'pofpof') { alert('Wrong password'); return; }
    try {
      await deleteEvent(slug);
      loadEvents();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  }, [loadEvents]);

  const handleRun = useCallback((e: React.MouseEvent, slug: string) => {
    e.stopPropagation();
    navigate(`/admin/events/${slug}/run`);
  }, [navigate]);

  const handleSelectEvent = useCallback((slug: string) => {
    navigate(`/admin/events/${slug}`);
  }, [navigate]);

  const handleCreateEvent = useCallback(async (prefillCity?: string) => {
    const name = prompt('Event name (e.g. Cafe2035 SF):');
    if (!name?.trim()) return;

    let city = prefillCity || '';
    if (!city) {
      // Build a picker string from known cities
      if (knownCities.length > 0) {
        const options = knownCities.map((c, i) =>
          `${i + 1}. ${c.replace(/-/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase())}`
        ).join('\n');
        const choice = prompt(`Pick a city (number) or type a new city name:\n\n${options}`);
        if (!choice?.trim()) return;
        const num = parseInt(choice.trim(), 10);
        if (num >= 1 && num <= knownCities.length) {
          city = knownCities[num - 1].replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        } else {
          city = choice.trim();
        }
      } else {
        city = prompt('City:')?.trim() || '';
      }
    }

    const date = new Date().toISOString().split('T')[0];
    const citySlug = city ? slugify(city) : slugify(name);
    const slug = `${citySlug}/${date}`;
    const newEvent: ShareableEvent = {
      name: name.trim(),
      city,
      date,
      link: '',
      presentations: [],
    };
    await saveEvent(slug, newEvent);
    generateLogo(name.trim(), city).then(async (blob) => {
      try { await uploadLogo(slug, blob, 'png'); } catch { /* ignore */ }
    });
    navigate(`/admin/events/${slug}`);
  }, [navigate, knownCities]);

  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const handleCopyLink = useCallback((e: React.MouseEvent, slug: string) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/#/${slug}`;
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
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button className={styles.applicationsLink} onClick={() => navigate('/admin/applications')}>
            &#x1F4EC; Applications
          </button>
          <button className={styles.applicationsLink} onClick={() => { sessionStorage.removeItem('admin_unlocked'); navigate('/admin'); }}>
            Logout
          </button>
        </div>
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
          <button className={styles.createButton} onClick={() => handleCreateEvent()}>
            Open a window into 2035
          </button>
        </div>
      ) : (
        <>
          {cityGroups.map(([cityName, cityEvents]) => (
            <div key={cityName} className={styles.cityGroup}>
              <div className={styles.cityHeader}>
                <h2 className={styles.cityName}>{cityName}</h2>
                <span className={styles.cityCount}>{cityEvents.length}</span>
              </div>
              <div className={styles.grid}>
                {cityEvents.map(({ slug, event }) => (
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

                <div className={styles.newCard} onClick={() => handleCreateEvent(cityName)}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span>New Gathering</span>
                </div>
              </div>
            </div>
          ))}

          <div className={styles.newCityCard} onClick={() => handleCreateEvent()}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>New City</span>
          </div>
        </>
      )}
    </div>
  );
}
