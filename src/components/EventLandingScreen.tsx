import { useCallback, useState, useEffect } from 'react';
import type { ShareableEvent } from '../types';
import { generateLogo } from '../lib/generateLogo';
import { listEvents } from '../lib/storage';
import styles from './EventLandingScreen.module.css';

interface EventLandingScreenProps {
  event: ShareableEvent;
  citySlug?: string;
  currentDate?: string;
}

export function EventLandingScreen({ event, citySlug, currentDate }: EventLandingScreenProps) {
  const shortDate = formatShortDate(event.date);
  const [generatedLogoUrl, setGeneratedLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (event.logo) return;
    let revoke = '';
    (async () => {
      try {
        const blob = await generateLogo(event.name, event.city);
        const url = URL.createObjectURL(blob);
        revoke = url;
        setGeneratedLogoUrl(url);
      } catch { /* text fallback */ }
    })();
    return () => { if (revoke) URL.revokeObjectURL(revoke); };
  }, [event.logo, event.name, event.city]);

  const logoUrl = event.logo || generatedLogoUrl;

  // Fetch past events from the same city that have recordings
  const [pastStories, setPastStories] = useState<{ slug: string; event: ShareableEvent }[]>([]);
  useEffect(() => {
    if (!citySlug) return;
    let cancelled = false;
    listEvents().then((all) => {
      if (cancelled) return;
      const others = all
        .filter((e) => {
          const eCity = e.slug.split('/')[0];
          const eDate = e.slug.split('/')[1];
          return eCity === citySlug && eDate !== currentDate && e.event.presentations.some((p) => p.recording);
        })
        .sort((a, b) => b.event.date.localeCompare(a.event.date));
      setPastStories(others);
    }).catch(console.error);
    return () => { cancelled = true; };
  }, [citySlug, currentDate]);

  const scrollToReserve = useCallback(() => {
    if (event.link) {
      window.open(event.link, '_blank', 'noopener');
    }
  }, [event.link]);

  return (
    <>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroLeft}>
            <div className={styles.chips}>
              {event.city && <span className={styles.chip}>{event.city}</span>}
              {shortDate && <span className={styles.chip}>{shortDate}</span>}
            </div>
            <h1 className={styles.headline}>
              {event.name || <>See <span className={styles.accent}>2035</span> before it arrives.</>}
            </h1>
            <p className={styles.subhead}>
              A local event for future founders. Get inspired by five-minute stories from builders, artists, scientists, and founders who are making 2035 real. <span className={styles.accent}>Meet your peers. Leave with momentum.</span>
            </p>
            <div className={styles.ctaRow}>
              {event.link && (
                <a href={event.link} target="_blank" rel="noopener noreferrer" className={styles.ctaPrimary}>
                  Reserve a seat
                </a>
              )}
              <button className={styles.ctaSecondary} onClick={() => document.getElementById('speakers')?.scrollIntoView({ behavior: 'smooth' })}>
                See the lineup
              </button>
            </div>
          </div>
          <div className={styles.heroRight}>
            {logoUrl ? (
              <>
                <img src={logoUrl} alt={event.name} className={styles.heroLogo} />
                {event.name && <p className={styles.heroChapterName}>{event.name}</p>}
              </>
            ) : (
              <div className={styles.heroLogoFallback}>
                <span className={styles.heroLogoText}>{event.name || '2035Today'}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 3 Acts — 2 hours */}
      <section id="how-it-works" className={styles.actsSection}>
        <h2 className={styles.sectionTitle}>2 hours. 3 acts.</h2>
        <p className={styles.actsSub}>A fast, social event for future founders. Come solo. Leave with momentum.</p>
        <div className={styles.actGrid}>
          <div className={styles.actCard}>
            <div className={styles.actHeader}>
              <span className={styles.actNum} style={{ color: '#44FF88' }}>1</span>
              <span className={styles.actTime}>20 min</span>
            </div>
            <h3 className={styles.actName} style={{ color: '#44FF88' }}>White Mirror</h3>
            <p className={styles.actDesc}>
              Short stories about the future. Bold visions of 2035, what AI is changing, and what new kinds of startups are becoming possible.
            </p>
          </div>
          <div className={styles.actCard}>
            <div className={styles.actHeader}>
              <span className={styles.actNum} style={{ color: '#FF6B4A' }}>2</span>
              <span className={styles.actTime}>20 min</span>
            </div>
            <h3 className={styles.actName} style={{ color: '#FF6B4A' }}>Show Up With Your Vibe</h3>
            <p className={styles.actDesc}>
              Bring an idea, a side project, a bio, a curiosity, or just energy. Raw, real, no polish required.
            </p>
          </div>
          <div className={styles.actCard}>
            <div className={styles.actHeader}>
              <span className={styles.actNum} style={{ color: '#FFE66D' }}>3</span>
              <span className={styles.actTime}>80 min</span>
            </div>
            <h3 className={styles.actName} style={{ color: '#FFE66D' }}>Meet &amp; Collide</h3>
            <p className={styles.actDesc}>
              The conversations, the people, and the unexpected collisions that make new companies possible.
            </p>
          </div>
        </div>
      </section>

      {/* Speaker Lineup */}
      {event.presentations.length > 0 && (
        <section id="speakers" className={styles.speakersSection}>
          <h2 className={styles.sectionTitle}>The lineup</h2>
          <div className={styles.speakerGrid}>
            {event.presentations.map((pres, index) => {
              const isDystopian = pres.storyTone === 'dystopian' || pres.storyTone === 'black';
              const toneEmoji = isDystopian ? '\uD83C\uDF11' : '\u2600\uFE0F';
              const toneLabel = isDystopian ? 'Dystopian' : 'Optimistic';
              return (
                <div key={index} className={styles.speakerCard}>
                  <div className={styles.speakerHeader}>
                    <h3 className={styles.storyTitle}>{pres.storyName || 'Untitled Story'}</h3>
                    <span className={styles.toneBadge} title={toneLabel}>{toneEmoji} {toneLabel}</span>
                  </div>
                  <p className={styles.speakerName}>{pres.speakerName || 'TBA'}</p>
                  {pres.speakerBio && (
                    <p className={styles.speakerBio}>{pres.speakerBio}</p>
                  )}
                  {(pres.socialX || pres.socialInstagram || pres.socialLinkedin) && (
                    <div className={styles.socialLinks}>
                      {pres.socialX && (
                        <a href={normalizeUrl(pres.socialX, 'x')} target="_blank" rel="noopener noreferrer" className={styles.socialLink} title="X">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                          </svg>
                        </a>
                      )}
                      {pres.socialInstagram && (
                        <a href={normalizeUrl(pres.socialInstagram, 'instagram')} target="_blank" rel="noopener noreferrer" className={styles.socialLink} title="Instagram">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="2" width="20" height="20" rx="5" />
                            <circle cx="12" cy="12" r="5" />
                            <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
                          </svg>
                        </a>
                      )}
                      {pres.socialLinkedin && (
                        <a href={normalizeUrl(pres.socialLinkedin, 'linkedin')} target="_blank" rel="noopener noreferrer" className={styles.socialLink} title="LinkedIn">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                          </svg>
                        </a>
                      )}
                    </div>
                  )}
                  {pres.recording && (
                    <video
                      className={styles.recordingVideo}
                      src={pres.recording}
                      controls
                      preload="metadata"
                      playsInline
                    />
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Bottom CTA */}
      {event.link && (
        <section className={styles.bottomCta}>
          <h2 className={styles.bottomCtaHeadline}>The future is in this room. Yours included.</h2>
          <a href={event.link} target="_blank" rel="noopener noreferrer" className={styles.ctaPrimary}>
            Reserve a seat
          </a>
        </section>
      )}

      {/* Past stories from this city */}
      {pastStories.length > 0 && (
        <section className={styles.pastStoriesSection}>
          <h2 className={styles.sectionTitle}>More stories from {event.city || 'this city'}</h2>
          {pastStories.map(({ slug, event: pastEv }) => (
            <div key={slug} className={styles.pastEventBlock}>
              <a href={`#/${slug}`} className={styles.pastEventHeader}>
                <h3 className={styles.pastEventName}>{pastEv.name}</h3>
                <span className={styles.pastEventDate}>{formatShortDate(pastEv.date)}</span>
              </a>
              <div className={styles.pastStoriesGrid}>
                {pastEv.presentations.map((pres, i) =>
                  pres.recording ? (
                    <div key={i} className={styles.pastStoryCard}>
                      <video
                        className={styles.pastStoryVideo}
                        src={pres.recording}
                        controls
                        preload="metadata"
                        playsInline
                      />
                      <div className={styles.pastStoryInfo}>
                        <span className={styles.pastStoryTitle}>{pres.storyName || 'Untitled'}</span>
                        <span className={styles.pastStorySpeaker}>{pres.speakerName || 'Speaker'}</span>
                      </div>
                    </div>
                  ) : null,
                )}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Footer */}
      <footer className={styles.footer}>
        <a href="#/" className={styles.footerBrand}>2035Today</a>
        <span className={styles.footerTagline}>See the future. Sleep better.</span>
        <a href="#/apply" className={styles.footerOrganize}>Organize in your city &rarr;</a>
      </footer>

      {/* Mobile sticky CTA */}
      {event.link && (
        <div className={styles.mobileStickyBar}>
          <button className={styles.mobileStickyButton} onClick={scrollToReserve}>
            I'm in
          </button>
        </div>
      )}
    </>
  );
}

function formatShortDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function normalizeUrl(input: string, platform: 'x' | 'instagram' | 'linkedin'): string {
  const trimmed = input.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  const handle = trimmed.replace(/^@/, '');
  switch (platform) {
    case 'x': return `https://x.com/${handle}`;
    case 'instagram': return `https://instagram.com/${handle}`;
    case 'linkedin': return trimmed.includes('/') ? `https://linkedin.com/${trimmed}` : `https://linkedin.com/in/${handle}`;
  }
}
