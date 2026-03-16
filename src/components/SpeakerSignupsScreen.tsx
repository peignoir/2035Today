import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import type { ShareableEvent, SpeakerSignup } from '../types';
import { listEvents, loadSignups, loadEvent, saveEvent } from '../lib/storage';
import styles from './ApplicationsScreen.module.css';

interface SignupRow {
  signup: SpeakerSignup;
  slug: string;
  event: ShareableEvent;
  approved: boolean;
}

export function SpeakerSignupsScreen() {
  const [rows, setRows] = useState<SignupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const events = await listEvents();
    const allRows: SignupRow[] = [];

    for (const { slug, event } of events) {
      const signups = await loadSignups(slug);
      for (const signup of signups) {
        // Check if already added to presentations
        const approved = event.presentations.some(
          (p) => p.speakerName === signup.name && p.storyName === signup.storyTitle,
        );
        allRows.push({ signup, slug, event, approved });
      }
    }

    // Sort newest first
    allRows.sort((a, b) => b.signup.created_at.localeCompare(a.signup.created_at));
    setRows(allRows);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleApprove = useCallback(async (row: SignupRow) => {
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

  const formatEventLabel = (row: SignupRow) => {
    const city = row.event.city || row.slug.split('/')[0];
    const d = new Date(row.event.date + 'T12:00:00');
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

      {rows.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>&#x1F399;</div>
          <p className={styles.emptyText}>No storyteller signups yet</p>
        </div>
      ) : (
        <div className={styles.list}>
          {rows.map((row) => (
            <div key={row.signup.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardNameRow}>
                  <span className={styles.cardName}>{row.signup.name}</span>
                  <span className={row.approved ? styles.statusApproved : styles.statusPending}>
                    {row.approved ? 'added' : 'pending'}
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

              {!row.approved && (
                <div className={styles.cardActions}>
                  <button
                    className={styles.approveButton}
                    onClick={() => handleApprove(row)}
                    disabled={actionLoading === row.signup.id}
                  >
                    {actionLoading === row.signup.id ? '...' : 'Approve & add to event'}
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
