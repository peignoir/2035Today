import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import styles from './ApplyScreen.module.css';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

type Phase = 'form' | 'loading' | 'review' | 'saving' | 'success' | 'error';

interface FormData {
  name: string;
  email: string;
  city: string;
  company: string;
  github_url: string;
  linkedin_url: string;
  comment: string;
}

const EMPTY_FORM: FormData = {
  name: '',
  email: '',
  city: '',
  company: '',
  github_url: '',
  linkedin_url: '',
  comment: '',
};

export function ApplyScreen() {
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [phase, setPhase] = useState<Phase>('form');
  const [bio, setBio] = useState('');
  const [editedBio, setEditedBio] = useState('');
  const [applicationId, setApplicationId] = useState('');
  const [error, setError] = useState('');

  const update = useCallback((field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const canSubmit = form.name.trim() && form.email.trim() && form.city.trim() && form.comment.trim();

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setPhase('loading');
    setError('');

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          city: form.city.trim(),
          company: form.company.trim() || undefined,
          github_url: form.github_url.trim() || undefined,
          linkedin_url: form.linkedin_url.trim() || undefined,
          comment: form.comment.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      const generatedBio = data.bio || '';
      setBio(generatedBio);
      setEditedBio(generatedBio);
      setApplicationId(data.applicationId || '');
      setPhase('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit application');
      setPhase('error');
    }
  }, [form, canSubmit]);

  const handleConfirmBio = useCallback(async () => {
    // If bio was edited, update it in the DB
    if (editedBio.trim() !== bio && applicationId) {
      setPhase('saving');
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/review-application`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            applicationId,
            action: 'update-bio',
            bio: editedBio.trim(),
          }),
        });
        // Don't block on failure — bio update is best-effort
        if (!res.ok) console.warn('Bio update failed, continuing anyway');
      } catch {
        console.warn('Bio update failed, continuing anyway');
      }
    }
    setBio(editedBio.trim());
    setPhase('success');
  }, [editedBio, bio, applicationId]);

  return (
    <>
      {phase === 'form' || phase === 'error' ? (
        <>
          {/* Hero */}
          <section className={styles.hero}>
            <h1 className={styles.headline}>
              Bring <span className={styles.accent}>2035</span> to your city.
            </h1>
            <p className={styles.subhead}>
              Cafe2035 is growing — one city at a time. If you want to organize a gathering of builders, dreamers, and storytellers, start here.
            </p>
          </section>

          {/* Form */}
          <section className={styles.formSection}>
            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.row}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Name</label>
                  <input
                    className={styles.input}
                    type="text"
                    value={form.name}
                    onChange={(e) => update('name', e.target.value)}
                    placeholder="Your full name"
                    required
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Email</label>
                  <input
                    className={styles.input}
                    type="email"
                    value={form.email}
                    onChange={(e) => update('email', e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>

              <div className={styles.row}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>City</label>
                  <input
                    className={styles.input}
                    type="text"
                    value={form.city}
                    onChange={(e) => update('city', e.target.value)}
                    placeholder="Where would you organize?"
                    required
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>
                    Company <span className={styles.labelHint}>(optional)</span>
                  </label>
                  <input
                    className={styles.input}
                    type="text"
                    value={form.company}
                    onChange={(e) => update('company', e.target.value)}
                    placeholder="Where you work"
                  />
                </div>
              </div>

              <div className={styles.row}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>
                    GitHub <span className={styles.labelHint}>(optional)</span>
                  </label>
                  <input
                    className={styles.input}
                    type="url"
                    value={form.github_url}
                    onChange={(e) => update('github_url', e.target.value)}
                    placeholder="https://github.com/you"
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>
                    LinkedIn <span className={styles.labelHint}>(optional)</span>
                  </label>
                  <input
                    className={styles.input}
                    type="url"
                    value={form.linkedin_url}
                    onChange={(e) => update('linkedin_url', e.target.value)}
                    placeholder="https://linkedin.com/in/you"
                  />
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>Why do you want to bring Cafe2035 to your city?</label>
                <textarea
                  className={styles.textarea}
                  value={form.comment}
                  onChange={(e) => update('comment', e.target.value)}
                  placeholder="2-3 sentences about what excites you about organizing..."
                  required
                />
              </div>

              {phase === 'error' && error && (
                <div className={styles.errorBox}>{error}</div>
              )}

              <button
                className={styles.submitButton}
                type="submit"
                disabled={!canSubmit}
              >
                Apply
              </button>
            </form>
          </section>
        </>
      ) : phase === 'loading' ? (
        <section className={styles.loadingSection}>
          <div className={styles.spinner} />
          <p className={styles.loadingText}>Researching you...</p>
          <p className={styles.loadingSubtext}>
            We're checking your GitHub, searching the web, and crafting your story. This takes 10-20 seconds.
          </p>
        </section>
      ) : phase === 'review' || phase === 'saving' ? (
        <section className={styles.reviewSection}>
          <div className={styles.successEmoji}>&#x1F4DD;</div>
          <h2 className={styles.successTitle}>Here's what we found.</h2>
          <p className={styles.reviewSubtext}>
            Edit your bio if you'd like — this is what we'll use to introduce you.
          </p>

          <div className={styles.bioCard}>
            <p className={styles.bioLabel}>Your bio</p>
            <textarea
              className={styles.bioTextarea}
              value={editedBio}
              onChange={(e) => setEditedBio(e.target.value)}
              disabled={phase === 'saving'}
            />
          </div>

          <div className={styles.reviewActions}>
            <button
              className={styles.submitButton}
              onClick={handleConfirmBio}
              disabled={phase === 'saving' || !editedBio.trim()}
            >
              {phase === 'saving' ? 'Saving...' : 'Looks good — submit!'}
            </button>
            <button
              className={styles.secondaryButton}
              onClick={() => { setPhase('form'); }}
              disabled={phase === 'saving'}
            >
              Start over
            </button>
          </div>
        </section>
      ) : phase === 'success' ? (
        <section className={styles.successSection}>
          <div className={styles.successEmoji}>&#x1F680;</div>
          <h2 className={styles.successTitle}>You're in the queue.</h2>

          {bio && (
            <div className={styles.bioCard}>
              <p className={styles.bioLabel}>Your bio</p>
              <p className={styles.bioText}>{bio}</p>
            </div>
          )}

          <p className={styles.successMessage}>
            Thanks for applying! We'll review your application and get back to you at <strong>{form.email}</strong>. In the meantime, tell your friends about Cafe2035.
          </p>

          <Link to="/" className={styles.backLink}>
            &larr; Back to Cafe2035
          </Link>
        </section>
      ) : null}

      {/* Footer */}
      <footer className={styles.footer}>
        <span className={styles.footerBrand}>Cafe2035</span>
        <span className={styles.footerTagline}>See the future. Sleep better.</span>
      </footer>
    </>
  );
}
