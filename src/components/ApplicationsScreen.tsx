import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import type { Application } from '../types';
import { supabase } from '../lib/supabase';
import styles from './ApplicationsScreen.module.css';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected';

export function ApplicationsScreen() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadApplications = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to load applications:', error);
    }
    setApplications((data as Application[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const handleAction = useCallback(async (applicationId: string, action: 'approved' | 'rejected') => {
    const pwd = prompt(`Type admin password to ${action === 'approved' ? 'approve' : 'reject'}:`);
    if (!pwd) return;
    setActionLoading(applicationId);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/review-application`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ applicationId, action, adminPassword: pwd }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update');
      }

      // Update locally
      setApplications((prev) =>
        prev.map((app) =>
          app.id === applicationId
            ? { ...app, status: action, reviewed_at: new Date().toISOString() }
            : app,
        ),
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(null);
    }
  }, []);

  const handleDelete = useCallback(async (app: Application) => {
    if (!confirm(`Delete application from ${app.name}? This cannot be undone.`)) return;
    setActionLoading(app.id);
    try {
      const { error } = await supabase
        .from('applications')
        .delete()
        .eq('id', app.id);
      if (error) throw new Error(error.message);
      setApplications((prev) => prev.filter((a) => a.id !== app.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setActionLoading(null);
    }
  }, []);

  const handleUndoReject = useCallback(async (applicationId: string) => {
    setActionLoading(applicationId);
    try {
      const { error } = await supabase
        .from('applications')
        .update({ status: 'pending', reviewed_at: null })
        .eq('id', applicationId);
      if (error) throw new Error(error.message);
      setApplications((prev) =>
        prev.map((app) =>
          app.id === applicationId
            ? { ...app, status: 'pending' as const, reviewed_at: undefined }
            : app,
        ),
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to undo');
    } finally {
      setActionLoading(null);
    }
  }, []);

  const filtered = filter === 'all'
    ? applications
    : applications.filter((a) => a.status === filter);

  const pendingCount = applications.filter((a) => a.status === 'pending').length;

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading applications...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Organizer Applications</h1>
        <Link to="/admin" className={styles.backLink}>&larr; Back to events</Link>
      </header>

      {applications.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>&#x1F4EC;</div>
          <p className={styles.emptyText}>No applications yet</p>
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className={styles.filters}>
            {(['all', 'pending', 'approved', 'rejected'] as FilterStatus[]).map((status) => (
              <button
                key={status}
                className={filter === status ? styles.filterTabActive : styles.filterTab}
                onClick={() => setFilter(status)}
              >
                {status === 'all' ? `All (${applications.length})` :
                 status === 'pending' ? `Pending (${pendingCount})` :
                 status === 'approved' ? `Approved (${applications.filter((a) => a.status === 'approved').length})` :
                 `Rejected (${applications.filter((a) => a.status === 'rejected').length})`}
              </button>
            ))}
          </div>

          {/* List */}
          <div className={styles.list}>
            {filtered.map((app) => (
              <div key={app.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardNameRow}>
                    <span className={styles.cardName}>{app.name}</span>
                    <span className={
                      app.status === 'pending' ? styles.statusPending :
                      app.status === 'approved' ? styles.statusApproved :
                      styles.statusRejected
                    }>
                      {app.status}
                    </span>
                  </div>
                  <span className={styles.cardDate}>
                    {formatDate(app.created_at)}
                  </span>
                </div>

                <div className={styles.cardMeta}>
                  <span className={styles.metaItem}>
                    &#x1F4CD; {app.city}
                  </span>
                  <span className={styles.metaItem}>
                    &#x2709;&#xFE0F; {app.email}
                  </span>
                  {app.company && (
                    <span className={styles.metaItem}>
                      &#x1F3E2; {app.company}
                    </span>
                  )}
                  {app.github_url && (
                    <a href={app.github_url} target="_blank" rel="noopener noreferrer" className={styles.metaLink}>
                      GitHub
                    </a>
                  )}
                  {app.linkedin_url && (
                    <a href={app.linkedin_url} target="_blank" rel="noopener noreferrer" className={styles.metaLink}>
                      LinkedIn
                    </a>
                  )}
                </div>

                {app.comment && (
                  <p className={styles.cardComment}>"{app.comment}"</p>
                )}

                {app.generated_bio && (
                  <div className={styles.cardBio}>{app.generated_bio}</div>
                )}

                {app.ai_profile && (
                  <details className={styles.cardAiProfile}>
                    <summary>AI-generated profile</summary>
                    <p>{app.ai_profile}</p>
                  </details>
                )}

                {(app.search_data as any)?.openai_usage && (
                  <span className={styles.tokenBadge}>
                    {(app.search_data as any).openai_usage.total_tokens} tokens
                  </span>
                )}

                <div className={styles.cardActions}>
                  {app.status === 'pending' && (
                    <>
                      <button
                        className={styles.approveButton}
                        onClick={() => handleAction(app.id, 'approved')}
                        disabled={actionLoading === app.id}
                      >
                        {actionLoading === app.id ? '...' : 'Approve'}
                      </button>
                      <button
                        className={styles.rejectButton}
                        onClick={() => handleAction(app.id, 'rejected')}
                        disabled={actionLoading === app.id}
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {app.status === 'rejected' && (
                    <button
                      className={styles.approveButton}
                      onClick={() => handleUndoReject(app.id)}
                      disabled={actionLoading === app.id}
                    >
                      {actionLoading === app.id ? '...' : 'Undo reject'}
                    </button>
                  )}
                  <button
                    className={styles.deleteButton}
                    onClick={() => handleDelete(app)}
                    disabled={actionLoading === app.id}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
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
