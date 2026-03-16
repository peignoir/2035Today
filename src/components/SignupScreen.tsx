import { useState, useEffect, useCallback } from 'react';
import { listEvents, addSignup } from '../lib/storage';
import type { ShareableEvent, SpeakerSignup } from '../types';
import styles from './SignupScreen.module.css';

interface EventOption {
  slug: string;
  event: ShareableEvent;
}

const OPEN_APPLICATION = '__open__';

export function SignupScreen() {
  const [events, setEvents] = useState<EventOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlug, setSelectedSlug] = useState('');
  const [customCity, setCustomCity] = useState('');

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [format, setFormat] = useState<'slides' | 'video'>('slides');
  const [storyTitle, setStoryTitle] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [tone, setTone] = useState<'positive' | 'negative'>('positive');
  const [linkedin, setLinkedin] = useState('');
  const [description, setDescription] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listEvents().then((list) => {
      // Filter out past events, sort by date ascending
      const today = new Date().toISOString().split('T')[0];
      const sorted = list
        .filter((e) => e.event.date >= today)
        .sort((a, b) => a.event.date.localeCompare(b.event.date));
      setEvents(sorted);
      if (sorted.length === 1) setSelectedSlug(sorted[0].slug);
      setLoading(false);
    });
  }, []);

  const isOpenApplication = selectedSlug === OPEN_APPLICATION;

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlug) { setError('Please select an event or choose open application.'); return; }
    if (isOpenApplication && !customCity.trim()) { setError('Please enter your city.'); return; }
    if (!name.trim()) { setError('Please enter your name.'); return; }
    if (!email.trim()) { setError('Please enter your email.'); return; }
    if (!storyTitle.trim()) { setError('Please enter a story title.'); return; }
    if (!authorName.trim()) { setError('Please enter the author name.'); return; }
    if (!linkedin.trim() && !description.trim()) { setError('Please provide your LinkedIn profile or a short bio (or both).'); return; }

    setError(null);
    setSubmitting(true);

    const signup: SpeakerSignup = {
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      linkedin: linkedin.trim() || undefined,
      format,
      storyTitle: storyTitle.trim(),
      authorName: authorName.trim(),
      tone,
      description: description.trim(),
    };

    try {
      if (isOpenApplication) {
        // Store under a special "open-applications" path
        const citySlug = customCity.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'unknown';
        await addSignup(`open/${citySlug}`, signup);
      } else {
        await addSignup(selectedSlug, signup);
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit. Try again.');
    } finally {
      setSubmitting(false);
    }
  }, [selectedSlug, isOpenApplication, customCity, name, email, phone, linkedin, format, storyTitle, authorName, tone, description]);

  const formatEventLabel = (opt: EventOption) => {
    const city = opt.event.city || opt.slug.split('/')[0];
    const d = new Date(opt.event.date + 'T12:00:00');
    const dateStr = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    return `${city} — ${dateStr}`;
  };

  if (submitted) {
    return (
      <div className={styles.container}>
          <div className={styles.success}>
            <p className={styles.successEmoji}>&#10003;</p>
            <h1 className={styles.successTitle}>You're in!</h1>
            <p className={styles.successBody}>
              We've received your story. The organizer will be in touch soon.
            </p>
            <p className={styles.successBody}>
              In the meantime, <a href="#/prepare" className={styles.link}>prepare your story</a>.
            </p>
          </div>
        </div>
    );
  }

  return (
    <>
      <div className={styles.container}>
        <header className={styles.hero}>
          <p className={styles.heroEmoji}>&#9749;</p>
          <h1 className={styles.heroTitle}>
            Submit your <span className={styles.accent}>story</span>
          </h1>
          <p className={styles.heroLead}>
            Pick your event, tell us about your story.
          </p>
        </header>

        {loading ? (
          <p className={styles.loadingText}>Loading events...</p>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit}>
            {/* Event picker */}
            <div className={styles.field}>
              <label className={styles.label}>Event</label>
              <select
                className={styles.select}
                value={selectedSlug}
                onChange={(e) => setSelectedSlug(e.target.value)}
              >
                <option value="">Select an event...</option>
                {events.map((opt) => (
                  <option key={opt.slug} value={opt.slug}>
                    {formatEventLabel(opt)}
                  </option>
                ))}
                <option value={OPEN_APPLICATION}>
                  Open application — my city isn't listed
                </option>
              </select>
            </div>

            {/* Custom city (only for open application) */}
            {isOpenApplication && (
              <div className={styles.field}>
                <label className={styles.label}>Your city</label>
                <input
                  type="text"
                  className={styles.input}
                  value={customCity}
                  onChange={(e) => setCustomCity(e.target.value)}
                  placeholder="San Francisco, Tokyo, Berlin..."
                />
              </div>
            )}

            {/* Name */}
            <div className={styles.field}>
              <label className={styles.label}>Your name</label>
              <input
                type="text"
                className={styles.input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
              />
            </div>

            {/* Email */}
            <div className={styles.field}>
              <label className={styles.label}>Email</label>
              <input
                type="email"
                className={styles.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.com"
              />
            </div>

            {/* Phone */}
            <div className={styles.field}>
              <label className={styles.label}>Phone <span className={styles.optional}>(optional)</span></label>
              <input
                type="tel"
                className={styles.input}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 555 123 4567"
              />
            </div>

            {/* LinkedIn */}
            <div className={styles.field}>
              <label className={styles.label}>LinkedIn {description.trim() ? <span className={styles.optional}>(optional if bio provided)</span> : null}</label>
              <input
                type="url"
                className={styles.input}
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
                placeholder="https://linkedin.com/in/yourprofile"
              />
            </div>

            {/* Author name */}
            <div className={styles.field}>
              <label className={styles.label}>Author name (as shown on stage)</label>
              <input
                type="text"
                className={styles.input}
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Jane D."
              />
            </div>

            {/* Story title */}
            <div className={styles.field}>
              <label className={styles.label}>Story title</label>
              <input
                type="text"
                className={styles.input}
                value={storyTitle}
                onChange={(e) => setStoryTitle(e.target.value)}
                placeholder="The Last Farmer on Mars"
              />
            </div>

            {/* Format */}
            <div className={styles.field}>
              <label className={styles.label}>Format</label>
              <div className={styles.radioGroup}>
                <label className={`${styles.radioLabel} ${format === 'slides' ? styles.radioActive : ''}`}>
                  <input
                    type="radio"
                    name="format"
                    value="slides"
                    checked={format === 'slides'}
                    onChange={() => setFormat('slides')}
                  />
                  <span className={styles.radioIcon}>&#128444;</span>
                  20-slide PDF (narrate live)
                </label>
                <label className={`${styles.radioLabel} ${format === 'video' ? styles.radioActive : ''}`}>
                  <input
                    type="radio"
                    name="format"
                    value="video"
                    checked={format === 'video'}
                    onChange={() => setFormat('video')}
                  />
                  <span className={styles.radioIcon}>&#127909;</span>
                  5-minute video
                </label>
              </div>
            </div>

            {/* Tone */}
            <div className={styles.field}>
              <label className={styles.label}>Future tone</label>
              <div className={styles.radioGroup}>
                <label className={`${styles.radioLabel} ${tone === 'positive' ? styles.radioActive : ''}`}>
                  <input
                    type="radio"
                    name="tone"
                    value="positive"
                    checked={tone === 'positive'}
                    onChange={() => setTone('positive')}
                  />
                  <span className={styles.radioIcon}>&#9728;</span>
                  Positive future
                </label>
                <label className={`${styles.radioLabel} ${tone === 'negative' ? styles.radioActive : ''}`}>
                  <input
                    type="radio"
                    name="tone"
                    value="negative"
                    checked={tone === 'negative'}
                    onChange={() => setTone('negative')}
                  />
                  <span className={styles.radioIcon}>&#9889;</span>
                  Dystopian future
                </label>
              </div>
            </div>

            {/* Description / Bio */}
            <div className={styles.field}>
              <label className={styles.label}>Short bio {linkedin.trim() ? <span className={styles.optional}>(optional if LinkedIn provided)</span> : null}</label>
              <textarea
                className={styles.textarea}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="In 2-3 sentences, what's your story about?"
                rows={3}
              />
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <button
              type="submit"
              className={styles.submitButton}
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit your story'}
            </button>

            <p className={styles.prepLink}>
              First time? <a href="#/prepare" className={styles.link}>Read the storyteller guide</a>
            </p>
          </form>
        )}

        <footer className={styles.footer}>
          <a href="#/" className={styles.footerBrand}>Cafe2035</a>
        </footer>
      </div>
    </>
  );
}
