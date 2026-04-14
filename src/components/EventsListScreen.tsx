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
    if (!confirm(`Delete "${name || 'Untitled Gathering'}"? This cannot be undone.`)) return;
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

  // Create-event modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createCity, setCreateCity] = useState('');
  const [createNewCity, setCreateNewCity] = useState('');
  const [createDate, setCreateDate] = useState(() => new Date().toISOString().split('T')[0]);

  const openCreateModal = useCallback(() => {
    setCreateName('');
    setCreateCity('');
    setCreateNewCity('');
    setCreateDate(new Date().toISOString().split('T')[0]);
    setShowCreateModal(true);
  }, []);

  const handleCreateSubmit = useCallback(async () => {
    const name = createName.trim();
    if (!name) return;
    const city = createCity === '__new__' ? createNewCity.trim() : (createCity ? titleCase(createCity) : '');
    if (!city) return;
    const date = createDate;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return;

    const citySlug = slugify(city);
    let slug = `${citySlug}/${date}`;
    const existingSlugs = new Set(events.map((e) => e.slug));
    if (existingSlugs.has(slug)) {
      let suffix = 2;
      while (existingSlugs.has(`${citySlug}/${date}_${suffix}`)) suffix++;
      slug = `${citySlug}/${date}_${suffix}`;
    }
    const newEvent: ShareableEvent = {
      name,
      city,
      date,
      link: '',
      presentations: [],
    };
    await saveEvent(slug, newEvent);
    generateLogo(name, city).then(async (blob) => {
      try { await uploadLogo(slug, blob, 'png'); } catch { /* ignore */ }
    });
    setShowCreateModal(false);
    navigate(`/admin/events/${slug}`);
  }, [createName, createCity, createNewCity, createDate, events, navigate]);

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
        <h1 className={styles.title}>2035Today</h1>
        <p className={styles.subtitle}>A worldwide movement of builders, dreamers, and storytellers</p>
        <p className={styles.quote}>"How many things have been denied one day, only to become realities the next!" — Jules Verne</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button className={styles.applicationsLink} onClick={() => navigate('/admin/applications')}>
            &#x1F4EC; Fellow Applications
          </button>
          <button className={styles.applicationsLink} onClick={() => navigate('/admin/signups')}>
            &#x1F399; Storyteller Signups
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
          <button className={styles.createButton} onClick={openCreateModal}>
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

                <div className={styles.newCard} onClick={openCreateModal}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span>New Gathering</span>
                </div>
              </div>
            </div>
          ))}

          <div className={styles.newCityCard} onClick={openCreateModal}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>New City</span>
          </div>
        </>
      )}
      {showCreateModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>New Gathering</h2>
            <label className={styles.modalLabel}>
              Event Name
              <input
                className={styles.modalInput}
                type="text"
                placeholder="e.g. 2035Today SF"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                autoFocus
              />
            </label>
            <div className={styles.modalRow}>
              <label className={styles.modalLabel} style={{ flex: 1 }}>
                City
                <select
                  className={styles.modalInput}
                  value={createCity}
                  onChange={(e) => setCreateCity(e.target.value)}
                >
                  <option value="" disabled>Select a city...</option>
                  {knownCities.map((c) => (
                    <option key={c} value={c}>{titleCase(c)}</option>
                  ))}
                  <option value="__new__">+ New city...</option>
                </select>
              </label>
              <label className={styles.modalLabel} style={{ flex: 1 }}>
                Date
                <input
                  className={styles.modalInput}
                  type="date"
                  value={createDate}
                  onChange={(e) => setCreateDate(e.target.value)}
                />
              </label>
            </div>
            {createCity === '__new__' && (
              <label className={styles.modalLabel}>
                New City Name
                <input
                  className={styles.modalInput}
                  type="text"
                  placeholder="e.g. San Francisco"
                  value={createNewCity}
                  onChange={(e) => setCreateNewCity(e.target.value)}
                  autoFocus
                />
              </label>
            )}
            <div className={styles.modalActions}>
              <button className={styles.modalCancel} onClick={() => setShowCreateModal(false)}>
                Cancel
              </button>
              <button
                className={styles.modalCreate}
                onClick={handleCreateSubmit}
                disabled={!createName.trim() || (!createCity || (createCity === '__new__' && !createNewCity.trim()))}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
