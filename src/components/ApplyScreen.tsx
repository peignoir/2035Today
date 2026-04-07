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
  ai_profile: string;
  comment: string;
}

const EMPTY_FORM: FormData = {
  name: '',
  email: '',
  city: '',
  company: '',
  github_url: '',
  linkedin_url: '',
  ai_profile: '',
  comment: '',
};

const AI_PROFILE_PROMPT = `Using everything you know about me — including LinkedIn, past resumes, prior conversations, and any other available context — generate the strongest fact-based executive profile you can, as if building my resume from scratch.

Include:

- My full name, city, and current role/company
- A detailed professional background covering what I've built, launched, led, or created, and the real-world impact
- Prior ventures, leadership roles, companies founded or co-founded, capital raised, exits, notable investors, revenue if known, and any major scale metrics
- Major institutions, communities, or movements I helped build, and their downstream impact
- Any top companies I've worked at, major brands or institutions I've been associated with, top schools I attended, and any awards, press, articles, public recognition, or notable speaking roles
- My top skills and deepest areas of expertise
- My most meaningful achievements or projects, and why they mattered
- What I'm genuinely exceptional at — what people consistently come to me for
- The kind of work that makes me lose track of time
- One story from my life or career that feels uniquely mine and could not describe someone else

Be specific. Use real details only. No fluff, no generic founder language, no invented facts.

If something important appears to be missing, do not skip it silently. Instead, add a final section called "What seems missing or unverified" and list exactly which facts, roles, companies, dates, metrics, raises, exits, employers, schools, awards, press mentions, or impact claims would make the profile materially stronger.

Also: if I am a founder, be precise about whether I have previously founded, scaled, raised capital, exited, worked at major companies, attended top schools, won awards, or built a major community with meaningful economic or institutional impact. Prioritize the strongest credible signals.

At the end, rank the top 5 strongest signals in my background by importance and explain briefly why each one matters.`;

export function ApplyScreen() {
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [phase, setPhase] = useState<Phase>('form');
  const [bio, setBio] = useState('');
  const [editedBio, setEditedBio] = useState('');
  const [applicationId, setApplicationId] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

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
          ai_profile: form.ai_profile.trim() || undefined,
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
              2035Today is growing — one city at a time. If you want to organize a gathering of builders, dreamers, and storytellers, start here.
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

              {/* Profile section: LinkedIn + AI profile */}
              <div className={styles.profileSection}>
                <label className={styles.label}>
                  Help us learn about you <span className={styles.labelHint}>(optional but recommended)</span>
                </label>
                <p className={styles.profileHint}>
                  Share your LinkedIn URL, paste an AI-generated profile, or both for the strongest match.
                </p>

                <div className={styles.profileOption}>
                  <span className={styles.optionLabel}>Option 1 — LinkedIn URL</span>
                  <input
                    className={styles.input}
                    type="url"
                    value={form.linkedin_url}
                    onChange={(e) => update('linkedin_url', e.target.value)}
                    placeholder="https://linkedin.com/in/you"
                  />
                </div>

                <div className={styles.profileOption}>
                  <span className={styles.optionLabel}>Option 2 — AI-generated profile</span>
                  <p className={styles.optionHint}>
                    Copy the prompt below into ChatGPT or Claude, then paste the result here.
                  </p>
                  <div className={styles.promptBlock}>
                    <button
                      type="button"
                      className={styles.copyButton}
                      onClick={() => {
                        navigator.clipboard.writeText(AI_PROFILE_PROMPT).catch(() => {});
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                    >
                      {copied ? 'Copied!' : 'Copy prompt'}
                    </button>
                    <pre className={styles.promptText}>{AI_PROFILE_PROMPT}</pre>
                  </div>
                  <textarea
                    className={styles.aiProfileTextarea}
                    value={form.ai_profile}
                    onChange={(e) => update('ai_profile', e.target.value)}
                    placeholder="Paste the AI-generated profile here..."
                    rows={8}
                  />
                </div>

                <p className={styles.profileFootnote}>
                  Providing both gives us the strongest signal to match you.
                </p>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label}>Why do you want to bring 2035Today to your city?</label>
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
            Thanks for applying! We'll review your application and get back to you at <strong>{form.email}</strong>. In the meantime, tell your friends about 2035Today.
          </p>

          <Link to="/" className={styles.backLink}>
            &larr; Back to 2035Today
          </Link>
        </section>
      ) : null}

      {/* Footer */}
      <footer className={styles.footer}>
        <span className={styles.footerBrand}>2035Today</span>
        <span className={styles.footerTagline}>See the future. Sleep better.</span>
      </footer>
    </>
  );
}
