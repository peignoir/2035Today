import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import type { ShareableEvent, SpeakerSignup } from '../types';
import { listEvents, loadSignups, loadEvent, saveEvent, saveSignups } from '../lib/storage';
import { supabase, EVENTS_BUCKET } from '../lib/supabase';
import styles from './ApplicationsScreen.module.css';

interface SignupRow {
  signup: SpeakerSignup;
  slug: string;
  event: ShareableEvent | null;
  approved: boolean;
  isOpen: boolean; // open application (no specific event)
}

export function SpeakerSignupsScreen() {
  const [rows, setRows] = useState<SignupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [availableEvents, setAvailableEvents] = useState<{ slug: string; event: ShareableEvent }[]>([]);
  const [assigningId, setAssigningId] = useState<string | null>(null); // show event picker
  const [hideRejected, setHideRejected] = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const allRows: SignupRow[] = [];

    // 1. Load signups for real events
    const events = await listEvents();
    for (const { slug, event } of events) {
      const signups = await loadSignups(slug);
      for (const signup of signups) {
        const approved = event.presentations.some(
          (p) => p.speakerName === signup.name && p.storyName === signup.storyTitle,
        );
        allRows.push({ signup, slug, event, approved, isOpen: false });
      }
    }

    setAvailableEvents(events);

    // 2. Load open applications (stored under open/{city}-signups.json)
    try {
      const { data: files } = await supabase.storage
        .from(EVENTS_BUCKET)
        .list('open', { limit: 200 });
      if (files) {
        for (const file of files) {
          if (!file.name.endsWith('-signups.json')) continue;
          const citySlug = file.name.replace(/-signups\.json$/, '');
          const signups = await loadSignups(`open/${citySlug}`);
          for (const signup of signups) {
            allRows.push({
              signup,
              slug: `open/${citySlug}`,
              event: null,
              approved: false,
              isOpen: true,
            });
          }
        }
      }
    } catch { /* open folder may not exist yet */ }

    // Sort newest first
    allRows.sort((a, b) => b.signup.created_at.localeCompare(a.signup.created_at));
    setRows(allRows);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleApprove = useCallback(async (row: SignupRow) => {
    if (!row.event || row.isOpen) {
      alert('Open applications must be assigned to an event first.');
      return;
    }
    setActionLoading(row.signup.id);
    try {
      // Re-load event to get latest data
      const event = await loadEvent(row.slug);
      if (!event) throw new Error('Event not found');

      // Add as a new presentation
      event.presentations.push({
        speakerName: row.signup.name,
        storyName: row.signup.storyTitle,
        storyTone: row.signup.tone === 'positive' ? 'optimistic' : 'dystopian',
        speakerBio: row.signup.description,
      });

      await saveEvent(row.slug, event);

      // Update local state
      setRows((prev) =>
        prev.map((r) =>
          r.signup.id === row.signup.id ? { ...r, approved: true, event } : r,
        ),
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to approve');
    } finally {
      setActionLoading(null);
    }
  }, []);

  const handleReject = useCallback(async (row: SignupRow) => {
    setActionLoading(row.signup.id);
    try {
      const signups = await loadSignups(row.slug);
      const updated = signups.map((s) =>
        s.id === row.signup.id ? { ...s, status: 'rejected' as const } : s,
      );
      await saveSignups(row.slug, updated);

      setRows((prev) =>
        prev.map((r) =>
          r.signup.id === row.signup.id
            ? { ...r, signup: { ...r.signup, status: 'rejected' } }
            : r,
        ),
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to reject');
    } finally {
      setActionLoading(null);
    }
  }, []);

  const handleUnreject = useCallback(async (row: SignupRow) => {
    setActionLoading(row.signup.id);
    try {
      const signups = await loadSignups(row.slug);
      const updated = signups.map((s) => {
        if (s.id === row.signup.id) {
          const { status: _, ...rest } = s;
          return rest;
        }
        return s;
      });
      await saveSignups(row.slug, updated);

      setRows((prev) =>
        prev.map((r) =>
          r.signup.id === row.signup.id
            ? { ...r, signup: { ...r.signup, status: undefined } }
            : r,
        ),
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to undo rejection');
    } finally {
      setActionLoading(null);
    }
  }, []);

  const handleRemoveFromEvent = useCallback(async (row: SignupRow) => {
    if (!row.event) return;
    setActionLoading(row.signup.id);
    try {
      const event = await loadEvent(row.slug);
      if (!event) throw new Error('Event not found');

      event.presentations = event.presentations.filter(
        (p) => !(p.speakerName === row.signup.name && p.storyName === row.signup.storyTitle),
      );

      await saveEvent(row.slug, event);

      setRows((prev) =>
        prev.map((r) =>
          r.signup.id === row.signup.id ? { ...r, approved: false, event } : r,
        ),
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove from event');
    } finally {
      setActionLoading(null);
    }
  }, []);

  const handleAssignToEvent = useCallback(async (row: SignupRow, targetSlug: string) => {
    setActionLoading(row.signup.id);
    try {
      const targetEvent = await loadEvent(targetSlug);
      if (!targetEvent) throw new Error('Event not found');

      // Add signup to target event's signups
      const targetSignups = await loadSignups(targetSlug);
      targetSignups.push(row.signup);
      await saveSignups(targetSlug, targetSignups);

      // Remove from open signups
      const openSignups = await loadSignups(row.slug);
      const filtered = openSignups.filter((s) => s.id !== row.signup.id);
      await saveSignups(row.slug, filtered);

      // Update local state — move row to the target event
      setRows((prev) =>
        prev.map((r) =>
          r.signup.id === row.signup.id
            ? { ...r, slug: targetSlug, event: targetEvent, isOpen: false }
            : r,
        ),
      );
      setAssigningId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to assign');
    } finally {
      setActionLoading(null);
    }
  }, []);

  const handleDelete = useCallback(async (row: SignupRow) => {
    const pwd = prompt(`Delete signup from ${row.signup.name}? Type admin password to confirm.`);
    if (!pwd) return;
    if (pwd !== (import.meta.env.VITE_ADMIN_PASSWORD || 'pofpof')) {
      alert('Wrong password');
      return;
    }
    setActionLoading(row.signup.id);
    try {
      const signups = await loadSignups(row.slug);
      const filtered = signups.filter((s) => s.id !== row.signup.id);
      await saveSignups(row.slug, filtered);
      setRows((prev) => prev.filter((r) => r.signup.id !== row.signup.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setActionLoading(null);
    }
  }, []);

  const formatEventLabel = (row: SignupRow) => {
    if (row.isOpen) {
      const city = row.slug.replace('open/', '').replace(/-/g, ' ');
      return `Open — ${city}`;
    }
    const city = row.event?.city || row.slug.split('/')[0];
    const d = new Date((row.event?.date || '') + 'T12:00:00');
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${city} — ${dateStr}`;
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading signups...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Storyteller Signups</h1>
        <Link to="/admin" className={styles.backLink}>&larr; Back to events</Link>
      </header>

      <div className={styles.filters}>
        <button
          className={hideRejected ? styles.filterTabActive : styles.filterTab}
          onClick={() => setHideRejected(true)}
        >
          Active
        </button>
        <button
          className={!hideRejected ? styles.filterTabActive : styles.filterTab}
          onClick={() => setHideRejected(false)}
        >
          All ({rows.length})
        </button>
      </div>

      {rows.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>&#x1F399;</div>
          <p className={styles.emptyText}>No storyteller signups yet</p>
        </div>
      ) : (
        <div className={styles.list}>
          {rows.filter((r) => !hideRejected || r.signup.status !== 'rejected').map((row) => (
            <div key={row.signup.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardNameRow}>
                  <span className={styles.cardName}>{row.signup.name}</span>
                  <span className={
                    row.signup.status === 'rejected' ? styles.statusRejected :
                    row.isOpen ? styles.statusPending :
                    row.approved ? styles.statusApproved :
                    styles.statusPending
                  }>
                    {row.signup.status === 'rejected' ? 'rejected' :
                     row.isOpen ? 'open' :
                     row.approved ? 'added' : 'pending'}
                  </span>
                </div>
                <span className={styles.cardDate}>
                  {formatDate(row.signup.created_at)}
                </span>
              </div>

              <div className={styles.cardMeta}>
                <span className={styles.metaItem}>
                  &#x1F3AD; {formatEventLabel(row)}
                </span>
                <span className={styles.metaItem}>
                  &#x2709;&#xFE0F; {row.signup.email}
                </span>
                {row.signup.phone && (
                  <span className={styles.metaItem}>
                    &#x1F4DE; {row.signup.phone}
                  </span>
                )}
                {row.signup.linkedin && (
                  <span className={styles.metaItem}>
                    <a href={row.signup.linkedin} target="_blank" rel="noopener noreferrer" style={{ color: '#6ca0dc', textDecoration: 'none' }}>
                      🔗 LinkedIn
                    </a>
                  </span>
                )}
                <span className={styles.metaItem}>
                  {row.signup.format === 'slides' ? '🖼 Slides' : '🎬 Video'}
                </span>
                <span className={styles.metaItem}>
                  {row.signup.tone === 'positive' ? '☀ Positive' : '⚡ Dystopian'}
                </span>
              </div>

              <p className={styles.cardComment}>
                <strong>{row.signup.storyTitle}</strong>
                {row.signup.authorName !== row.signup.name && (
                  <> by {row.signup.authorName}</>
                )}
              </p>

              {row.signup.description && (
                <div className={styles.cardBio}>{row.signup.description}</div>
              )}

              {row.signup.status === 'rejected' ? (
                <div className={styles.cardActions}>
                  <button
                    className={styles.undoButton}
                    onClick={() => handleUnreject(row)}
                    disabled={actionLoading === row.signup.id}
                  >
                    {actionLoading === row.signup.id ? '...' : 'Undo reject'}
                  </button>
                  <button
                    className={styles.deleteButton}
                    onClick={() => handleDelete(row)}
                    disabled={actionLoading === row.signup.id}
                  >
                    {actionLoading === row.signup.id ? '...' : 'Delete'}
                  </button>
                </div>
              ) : row.approved ? (
                <div className={styles.cardActions}>
                  <button
                    className={styles.rejectButton}
                    onClick={() => handleRemoveFromEvent(row)}
                    disabled={actionLoading === row.signup.id}
                  >
                    {actionLoading === row.signup.id ? '...' : 'Remove from event'}
                  </button>
                </div>
              ) : row.isOpen ? (
                <div className={styles.cardActions}>
                  {assigningId === row.signup.id ? (
                    <select
                      className={styles.eventSelect}
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) handleAssignToEvent(row, e.target.value);
                      }}
                      disabled={actionLoading === row.signup.id}
                    >
                      <option value="" disabled>Pick an event...</option>
                      {availableEvents.map(({ slug, event }) => (
                        <option key={slug} value={slug}>
                          {event.city} — {event.date}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <button
                      className={styles.approveButton}
                      onClick={() => setAssigningId(row.signup.id)}
                      disabled={actionLoading === row.signup.id}
                    >
                      Assign to event
                    </button>
                  )}
                  <button
                    className={styles.rejectButton}
                    onClick={() => handleReject(row)}
                    disabled={actionLoading === row.signup.id}
                  >
                    {actionLoading === row.signup.id ? '...' : 'Reject'}
                  </button>
                </div>
              ) : (
                <div className={styles.cardActions}>
                  <button
                    className={styles.approveButton}
                    onClick={() => handleApprove(row)}
                    disabled={actionLoading === row.signup.id}
                  >
                    {actionLoading === row.signup.id ? '...' : 'Approve & add to event'}
                  </button>
                  <button
                    className={styles.rejectButton}
                    onClick={() => handleReject(row)}
                    disabled={actionLoading === row.signup.id}
                  >
                    {actionLoading === row.signup.id ? '...' : 'Reject'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}
