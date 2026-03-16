import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { ShareableEvent } from '../types';
import { listPublicEvents } from '../lib/storage';
import { Navbar } from './Navbar';
import styles from './CommunityScreen.module.css';

/** HashRouter swallows #anchors — scroll manually instead */
function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

/* ── Inline SVG icons ── */

function BoltIcon() {
  return (
    <svg viewBox="0 0 32 32" className={styles.beliefIcon} aria-hidden="true">
      <polygon points="18,2 8,18 14,18 12,30 24,13 17,13" fill="none" stroke="#d4603a" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function CompassIcon() {
  return (
    <svg viewBox="0 0 32 32" className={styles.beliefIcon} aria-hidden="true">
      <circle cx="16" cy="16" r="13" fill="none" stroke="#d4603a" strokeWidth="1.8" />
      <circle cx="16" cy="16" r="2" fill="#d4603a" opacity="0.4" />
      <polygon points="16,6 18,14 16,16 14,14" fill="#d4603a" opacity="0.7" />
      <polygon points="16,26 14,18 16,16 18,18" fill="#d4603a" opacity="0.3" />
      <line x1="16" y1="1" x2="16" y2="5" stroke="#d4603a" strokeWidth="1.2" opacity="0.4" />
      <line x1="16" y1="27" x2="16" y2="31" stroke="#d4603a" strokeWidth="1.2" opacity="0.4" />
      <line x1="1" y1="16" x2="5" y2="16" stroke="#d4603a" strokeWidth="1.2" opacity="0.4" />
      <line x1="27" y1="16" x2="31" y2="16" stroke="#d4603a" strokeWidth="1.2" opacity="0.4" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 32 32" className={styles.beliefIcon} aria-hidden="true">
      <path d="M16 2 L18 12 L28 10 L20 16 L28 22 L18 20 L16 30 L14 20 L4 22 L12 16 L4 10 L14 12Z"
            fill="none" stroke="#d4603a" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="16" cy="16" r="2.5" fill="#d4603a" opacity="0.3" />
    </svg>
  );
}

function RocketIcon() {
  return (
    <svg viewBox="0 0 32 32" className={styles.rocketIcon} aria-hidden="true">
      <path d="M16 4 C16 4 22 10 22 20 L22 24 L10 24 L10 20 C10 10 16 4 16 4Z"
            fill="none" stroke="#e89b2d" strokeWidth="1.8" />
      <circle cx="16" cy="15" r="2.5" fill="none" stroke="#e89b2d" strokeWidth="1.2" />
      <path d="M10 21 L6 26 L10 24" fill="none" stroke="#e89b2d" strokeWidth="1.2" />
      <path d="M22 21 L26 26 L22 24" fill="none" stroke="#e89b2d" strokeWidth="1.2" />
      <path d="M13 24 Q16 30 19 24" fill="none" stroke="#d4603a" strokeWidth="1.2" opacity="0.6">
        <animate attributeName="d" values="M13 24 Q16 30 19 24;M13 24 Q16 28 19 24;M13 24 Q16 30 19 24" dur="0.8s" repeatCount="indefinite" />
      </path>
    </svg>
  );
}

/* ── Coffee Cup SVG ── */
function CoffeeCupSVG() {
  return (
    <svg viewBox="0 0 140 140" className={styles.heroIcon} aria-hidden="true">
      {/* Steam wisps */}
      <path d="M40 30 Q44 18, 40 8" fill="none" stroke="#d4603a" strokeWidth="2" opacity="0.5" strokeLinecap="round">
        <animate attributeName="d" values="M40 30 Q44 18, 40 8;M40 30 Q36 18, 40 6;M40 30 Q44 18, 40 8" dur="3s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.5;0.15;0.5" dur="3s" repeatCount="indefinite" />
      </path>
      <path d="M58 28 Q62 14, 58 4" fill="none" stroke="#d4603a" strokeWidth="2" opacity="0.35" strokeLinecap="round">
        <animate attributeName="d" values="M58 28 Q62 14, 58 4;M58 28 Q54 14, 58 2;M58 28 Q62 14, 58 4" dur="2.6s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.35;0.1;0.35" dur="2.6s" repeatCount="indefinite" />
      </path>
      <path d="M76 30 Q80 16, 76 6" fill="none" stroke="#d4603a" strokeWidth="1.5" opacity="0.3" strokeLinecap="round">
        <animate attributeName="d" values="M76 30 Q80 16, 76 6;M76 30 Q72 16, 76 4;M76 30 Q80 16, 76 6" dur="3.4s" repeatCount="indefinite" />
      </path>
      {/* Cup body */}
      <path d="M20 40 L24 100 Q24 110, 34 112 L82 112 Q92 110, 92 100 L96 40Z" fill="none" stroke="#d4603a" strokeWidth="2.5" />
      {/* Handle */}
      <path d="M96 52 C112 52, 114 80, 96 82" fill="none" stroke="#d4603a" strokeWidth="2.5" />
      {/* Coffee level */}
      <rect x="28" y="55" width="60" height="50" rx="4" fill="#d4603a" opacity="0.12" />
      {/* Binary / code steam */}
      <text x="42" y="24" fill="#d4603a" opacity="0.2" fontSize="6" fontFamily="monospace">01</text>
      <text x="62" y="18" fill="#d4603a" opacity="0.15" fontSize="5" fontFamily="monospace">10</text>
      <text x="50" y="12" fill="#d4603a" opacity="0.1" fontSize="5" fontFamily="monospace">AI</text>
      {/* Saucer */}
      <ellipse cx="58" cy="118" rx="48" ry="6" fill="none" stroke="#d4603a" strokeWidth="1.5" opacity="0.4" />
    </svg>
  );
}

function formatEventDate(dateStr: string): string {
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

function isPastEvent(dateStr: string): boolean {
  return new Date(dateStr + 'T23:59:59') < new Date();
}

export function CommunityScreen() {
  const [publicEvents, setPublicEvents] = useState<{ slug: string; event: ShareableEvent }[]>([]);
  const [showPast, setShowPast] = useState(false);
  useEffect(() => {
    listPublicEvents().then(setPublicEvents).catch(console.error);
  }, []);

  return (
    <div className={styles.page}>
      <Navbar scrollTo={scrollTo} />

      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={styles.heroGlow} />
        <div className={styles.heroContent}>
          <CoffeeCupSVG />
          <h1 className={styles.headline}>
            <span className={styles.brandName}>2035Cafe</span>
            <span className={styles.tagline}>Fear Nothing, Build Anything.</span>
          </h1>
          <p className={styles.heroMission}>
            Think <strong className={styles.accent}>AI preppers</strong> &mdash; not
            the bunker kind, the <em>builder</em> kind. We&rsquo;re a community getting
            ready for 2035 before everyone else.
          </p>
          <p className={styles.heroPills}>
            Get inspired &middot; Meet your people &middot; Start building
          </p>
          <div className={styles.ctaRow}>
            <button onClick={() => scrollTo('cities')} className={styles.ctaPrimary}>
              Find an event
            </button>
            <button onClick={() => scrollTo('the2hours')} className={styles.ctaGhost}>
              How it works &darr;
            </button>
          </div>
        </div>
      </section>

      {/* ── What we believe ── */}
      <section className={styles.beliefs}>
        <div className={styles.inner}>
          <div className={styles.beliefGrid}>
            <div className={styles.beliefCard}>
              <BoltIcon />
              <h3 className={styles.beliefTitle}>Everyone is a builder now</h3>
              <p className={styles.beliefDesc}>
                AI erased the barriers. A designer ships code. A chef launches a startup.
                The only thing left is <strong>showing up</strong>.
              </p>
            </div>
            <div className={styles.beliefCard}>
              <CompassIcon />
              <h3 className={styles.beliefTitle}>Recalibrate for 2035</h3>
              <p className={styles.beliefDesc}>
                The world is changing faster than anyone expected.
                We&rsquo;re not doomers &mdash; we just need to <strong>get ready</strong>.
              </p>
            </div>
            <div className={styles.beliefCard}>
              <SparkIcon />
              <h3 className={styles.beliefTitle}>More ambitious, more fun</h3>
              <p className={styles.beliefDesc}>
                Less pitch decks, more building.
                Less gatekeeping, more shipping.
                <strong> Way more fun.</strong>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── The 2 Hours ── */}
      <section id="the2hours" className={styles.section}>
        <div className={styles.inner}>
          <h2 className={styles.sectionTitle}>2 hours. 3 acts. No fluff.</h2>
          <p className={styles.sectionSub}>
            Morning caf&eacute; or evening Irish coffee &mdash; the curator picks the vibe.
            An AI runs the show.
          </p>

          <div className={styles.actGrid}>
            <div className={styles.actCard}>
              <div className={styles.actHeader}>
                <span className={styles.actNum}>01</span>
                <span className={styles.actTime}>15 min</span>
              </div>
              <h3 className={styles.actName}>White Mirror</h3>
              <p className={styles.actDesc}>
                Sci-fi stories about 2035 &mdash; like Black Mirror,
                but things go <em className={styles.accent}>right</em>.
                20 auto-advancing slides or a 5-min AI film.
              </p>
            </div>
            <div className={`${styles.actCard} ${styles.actAmber}`}>
              <div className={styles.actHeader}>
                <span className={`${styles.actNum} ${styles.numAmber}`}>02</span>
                <span className={styles.actTime}>60 min</span>
              </div>
              <h3 className={styles.actName}>Startup Microdosing</h3>
              <p className={styles.actDesc}>
                Idea to launch, live. Build with AI mentoring.
                First-timers ship their first thing.
                Veterans compete to ship fastest.
              </p>
            </div>
            <div className={`${styles.actCard} ${styles.actGreen}`}>
              <div className={styles.actHeader}>
                <span className={`${styles.actNum} ${styles.numGreen}`}>03</span>
                <span className={styles.actTime}>45 min</span>
              </div>
              <h3 className={styles.actName}>Builder Circle</h3>
              <p className={styles.actDesc}>
                Form your crew &mdash; 5-6 people who get it.
                Meet monthly, share wins, cover blind spots.
              </p>
            </div>
          </div>

          <p className={styles.actFootnote}>
            That&rsquo;s it. 2 hours. Then go build the future.
          </p>
        </div>
      </section>

      {/* ── The Collider ── */}
      <section id="collider" className={styles.section}>
        <div className={styles.inner}>
          <RocketIcon />
          <p className={styles.ventureTag}>2035.vc &mdash; our venture arm</p>
          <h2 className={styles.sectionTitle}>The 7-Day Collider</h2>
          <p className={styles.sectionSub}>
            The fastest startup program ever built.
            From <strong>nothing to launch in 7 days</strong> with p2p human and AI mentoring.
          </p>

          <div className={styles.colliderSteps}>
            <div className={styles.colliderStep}>
              <span className={styles.stepNum}>1</span>
              <p>Do a <strong>Startup Microdosing</strong> session first &mdash; that&rsquo;s your entry ticket.</p>
            </div>
            <div className={styles.colliderStep}>
              <span className={styles.stepNum}>2</span>
              <p>Fresh cohorts <strong>every month</strong>. Apply, get accepted, show up.</p>
            </div>
            <div className={styles.colliderStep}>
              <span className={styles.stepNum}>3</span>
              <p>One week, all in. Best founders get <strong className={styles.investAmount}>$25K</strong> to keep going.</p>
            </div>
          </div>

          <p className={styles.colliderVision}>
            VC is a tool. At some point money won&rsquo;t matter &mdash; but while it does,
            we invest in the best solo founders out there.
          </p>
        </div>
      </section>

      {/* ── Cities ── */}
      <section id="cities" className={styles.citiesSection}>
        <div className={styles.inner}>
          <h2 className={styles.sectionTitle}>Find your city</h2>
          <p className={styles.sectionSub}>
            Join an upcoming event or start one where you are.
          </p>

          {(() => {
            const upcoming = publicEvents.filter((e) => !isPastEvent(e.event.date));
            const past = publicEvents.filter((e) => isPastEvent(e.event.date));
            return (
              <>
                {upcoming.length > 0 && (
                  <div className={styles.citiesGroup}>
                    <h3 className={styles.citiesLabel}>
                      <span className={styles.liveDot} />
                      Upcoming
                    </h3>
                    <div className={styles.citiesGrid}>
                      {upcoming.map(({ slug, event: ev }) => (
                        <Link key={slug} to={`/${slug}`} className={styles.cityCard}>
                          {ev.logo && (
                            <img src={ev.logo} alt={ev.name} className={styles.cityLogo} />
                          )}
                          <div className={styles.cityInfo}>
                            <h4 className={styles.cityName}>{ev.city}</h4>
                            <p className={styles.cityDate}>
                              {formatEventDate(ev.date)}
                              <span className={styles.badge}>Upcoming</span>
                            </p>
                            {ev.name && <p className={styles.cityEventName}>{ev.name}</p>}
                          </div>
                          <span className={styles.cityArrow}>&rarr;</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {past.length > 0 && (
                  <div className={styles.citiesGroup}>
                    <button className={styles.pastToggle} onClick={() => setShowPast(!showPast)}>
                      <span>Past Events ({past.length})</span>
                      <span className={`${styles.pastArrow} ${showPast ? styles.pastOpen : ''}`}>&rsaquo;</span>
                    </button>
                    {showPast && (
                      <div className={styles.citiesGrid}>
                        {past.map(({ slug, event: ev }) => (
                          <Link key={slug} to={`/${slug}`} className={`${styles.cityCard} ${styles.cityCardPast}`}>
                            {ev.logo && (
                              <img src={ev.logo} alt={ev.name} className={styles.cityLogo} />
                            )}
                            <div className={styles.cityInfo}>
                              <h4 className={styles.cityName}>{ev.city}</h4>
                              <p className={styles.cityDate}>{formatEventDate(ev.date)}</p>
                              {ev.name && <p className={styles.cityEventName}>{ev.name}</p>}
                            </div>
                            <span className={styles.cityArrow}>&rarr;</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {publicEvents.length === 0 && (
                  <p className={styles.emptyState}>
                    No public events yet &mdash; be the first!
                  </p>
                )}
              </>
            );
          })()}

          <div className={styles.citiesCta}>
            <Link to="/apply" className={styles.ctaGhost}>
              Don&rsquo;t see your city? Start one &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className={styles.finalCta}>
        <h2 className={styles.finalHeadline}>
          <span className={styles.accentText}>Fear Nothing, Build Anything.</span>
        </h2>
        <p className={styles.finalSub}>
          Join a 2035Cafe near you &mdash; or start one in your city.
        </p>
        <div className={styles.ctaRow}>
          <Link to="/apply" className={styles.ctaPrimary}>
            Become a curator
          </Link>
          <Link to="/prepare" className={styles.ctaGhost}>
            Become a storyteller
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className={styles.footer}>
        <span className={styles.footerBrand}>&#9749; 2035Cafe</span>
        <span className={styles.footerMotto}>Fear Nothing, Build Anything.</span>
        <Link to="/admin" className={styles.footerLink}>Login</Link>
      </footer>
    </div>
  );
}
