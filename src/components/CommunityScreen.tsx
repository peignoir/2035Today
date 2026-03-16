import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import type { ShareableEvent } from '../types';
import { listPublicEvents } from '../lib/storage';
import { Navbar } from './Navbar';
import styles from './CommunityScreen.module.css';

/** HashRouter swallows #anchors — scroll manually instead */
function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

/* ── Rotating hero phrases ── */
const HERO_PHRASES = [
  { text: 'Sci-fi writers', color: '#e89b2d' },
  { text: 'Teachers rethinking education', color: '#5a8a3c' },
  { text: 'Solo founders obsessed with product', color: '#d4603a' },
  { text: 'Designers who ship code', color: '#e89b2d' },
  { text: 'Chefs launching startups', color: '#5a8a3c' },
  { text: 'Dreamers building for 2035', color: '#d4603a' },
];

function RotatingWho() {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const advance = useCallback(() => {
    setVisible(false);
    setTimeout(() => {
      setIdx((i) => (i + 1) % HERO_PHRASES.length);
      setVisible(true);
    }, 400);
  }, []);
  useEffect(() => {
    const id = setInterval(advance, 2800);
    return () => clearInterval(id);
  }, [advance]);
  const phrase = HERO_PHRASES[idx];
  return (
    <p className={styles.heroWho}>
      <span
        className={`${styles.rotatingText} ${visible ? styles.rotatingIn : styles.rotatingOut}`}
        style={{ color: phrase.color }}
      >
        {phrase.text}
      </span>
      <br />
      <span className={styles.heroWhoSub}>
        If you care more about <em>what</em> you build than <em>how</em>, you belong here.
      </span>
    </p>
  );
}

/* ── Inline SVG icons ── */

/** Tiny founder + 9 robot helpers + 1 lobster — "become a 10x founder" */
function FounderArmyIcon() {
  /* Mini robot: head square + antenna + two dot eyes, ~6px wide */
  const bot = (x: number, y: number, key: number) => (
    <g key={key}>
      <rect x={x} y={y + 2} width="5" height="5" rx="1" fill="#e89b2d" opacity="0.25" stroke="#e89b2d" strokeWidth="0.8" />
      <line x1={x + 2.5} y1={y + 2} x2={x + 2.5} y2={y} stroke="#e89b2d" strokeWidth="0.7" />
      <circle cx={x + 2.5} cy={y} r="0.7" fill="#e89b2d" opacity="0.5" />
      <circle cx={x + 1.5} cy={y + 4.2} r="0.5" fill="#e89b2d" />
      <circle cx={x + 3.5} cy={y + 4.2} r="0.5" fill="#e89b2d" />
    </g>
  );
  return (
    <svg viewBox="0 0 56 32" className={styles.beliefIconWide} aria-hidden="true">
      {/* The founder — center, slightly taller */}
      <circle cx="28" cy="6" r="3" fill="none" stroke="#d4603a" strokeWidth="1.5" />
      <line x1="28" y1="9" x2="28" y2="19" stroke="#d4603a" strokeWidth="1.5" />
      <line x1="28" y1="12" x2="23" y2="16" stroke="#d4603a" strokeWidth="1.3" />
      <line x1="28" y1="12" x2="33" y2="16" stroke="#d4603a" strokeWidth="1.3" />
      <line x1="28" y1="19" x2="25" y2="25" stroke="#d4603a" strokeWidth="1.3" />
      <line x1="28" y1="19" x2="31" y2="25" stroke="#d4603a" strokeWidth="1.3" />
      {/* 9 mini robots in two rows flanking the founder */}
      {bot(2, 14, 0)}
      {bot(9, 12, 1)}
      {bot(16, 16, 2)}
      {bot(36, 16, 3)}
      {bot(43, 12, 4)}
      {bot(50, 14, 5)}
      {bot(5, 23, 6)}
      {bot(13, 25, 7)}
      {bot(43, 25, 8)}
      {/* The lobster! (OpenClaw) — bottom right */}
      <text x="50" y="30" fontSize="8" textAnchor="middle">&#x1F99E;</text>
    </svg>
  );
}

/** Futuristic city skyline with rising graph — "10x the economy" */
function SkyscraperIcon() {
  return (
    <svg viewBox="0 0 48 48" className={styles.beliefIcon} aria-hidden="true">
      {/* Buildings */}
      <rect x="4" y="28" width="6" height="16" fill="#d4603a" opacity="0.1" stroke="#d4603a" strokeWidth="1.2" />
      <rect x="12" y="22" width="5" height="22" fill="#d4603a" opacity="0.1" stroke="#d4603a" strokeWidth="1.2" />
      <rect x="19" y="16" width="7" height="28" fill="#d4603a" opacity="0.15" stroke="#d4603a" strokeWidth="1.2" />
      <rect x="28" y="24" width="5" height="20" fill="#d4603a" opacity="0.1" stroke="#d4603a" strokeWidth="1.2" />
      <rect x="35" y="30" width="6" height="14" fill="#d4603a" opacity="0.1" stroke="#d4603a" strokeWidth="1.2" />
      {/* Antenna on tallest */}
      <line x1="22.5" y1="16" x2="22.5" y2="10" stroke="#d4603a" strokeWidth="1" />
      <circle cx="22.5" cy="9" r="1.5" fill="#e89b2d" opacity="0.6">
        <animate attributeName="opacity" values="0.6;0.2;0.6" dur="1.5s" repeatCount="indefinite" />
      </circle>
      {/* Growth arrow */}
      <polyline points="6,38 16,30 26,24 38,12" fill="none" stroke="#e89b2d" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
      <polygon points="38,12 38,18 32,14" fill="#e89b2d" opacity="0.5" />
      {/* Ground */}
      <line x1="2" y1="44" x2="46" y2="44" stroke="#d4603a" strokeWidth="1" opacity="0.3" />
    </svg>
  );
}

/** Exploding old rulebook — "startups need a new playbook" */
function NewPlaybookIcon() {
  return (
    <svg viewBox="0 0 48 48" className={styles.beliefIcon} aria-hidden="true">
      {/* Old book (crossed out) */}
      <rect x="12" y="10" width="18" height="24" rx="2" fill="none" stroke="#d4603a" strokeWidth="1.5" opacity="0.4" />
      <line x1="16" y1="16" x2="26" y2="16" stroke="#d4603a" strokeWidth="1" opacity="0.3" />
      <line x1="16" y1="20" x2="26" y2="20" stroke="#d4603a" strokeWidth="1" opacity="0.3" />
      <line x1="16" y1="24" x2="22" y2="24" stroke="#d4603a" strokeWidth="1" opacity="0.3" />
      {/* Big X over old book */}
      <line x1="10" y1="8" x2="32" y2="36" stroke="#d4603a" strokeWidth="2" opacity="0.5" />
      <line x1="32" y1="8" x2="10" y2="36" stroke="#d4603a" strokeWidth="2" opacity="0.5" />
      {/* Burst rays — new energy */}
      <line x1="21" y1="4" x2="21" y2="1" stroke="#e89b2d" strokeWidth="1.5" opacity="0.6" />
      <line x1="34" y1="8" x2="38" y2="4" stroke="#e89b2d" strokeWidth="1.5" opacity="0.5" />
      <line x1="38" y1="20" x2="43" y2="18" stroke="#e89b2d" strokeWidth="1.5" opacity="0.4" />
      <line x1="36" y1="32" x2="40" y2="36" stroke="#e89b2d" strokeWidth="1.5" opacity="0.5" />
      <line x1="8" y1="8" x2="4" y2="4" stroke="#e89b2d" strokeWidth="1.5" opacity="0.4" />
      <line x1="6" y1="32" x2="2" y2="36" stroke="#e89b2d" strokeWidth="1.5" opacity="0.4" />
      {/* Spark dots */}
      <circle cx="40" cy="10" r="1.5" fill="#e89b2d" opacity="0.5">
        <animate attributeName="opacity" values="0.5;0.1;0.5" dur="1.2s" repeatCount="indefinite" />
      </circle>
      <circle cx="6" cy="6" r="1" fill="#e89b2d" opacity="0.4">
        <animate attributeName="opacity" values="0.1;0.5;0.1" dur="1s" repeatCount="indefinite" />
      </circle>
      <circle cx="42" cy="26" r="1" fill="#e89b2d" opacity="0.3">
        <animate attributeName="opacity" values="0.3;0;0.3" dur="0.8s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

/** Rocket for Collider section */
function RocketIcon() {
  return (
    <svg viewBox="0 0 48 48" className={styles.rocketIcon} aria-hidden="true">
      <path d="M24 6 C24 6 32 14 32 28 L32 34 L16 34 L16 28 C16 14 24 6 24 6Z"
            fill="none" stroke="#e89b2d" strokeWidth="1.8" />
      <circle cx="24" cy="21" r="3.5" fill="none" stroke="#e89b2d" strokeWidth="1.3" />
      <path d="M16 30 L10 38 L16 35" fill="none" stroke="#e89b2d" strokeWidth="1.3" />
      <path d="M32 30 L38 38 L32 35" fill="none" stroke="#e89b2d" strokeWidth="1.3" />
      <path d="M20 34 Q24 44 28 34" fill="none" stroke="#d4603a" strokeWidth="1.5" opacity="0.6">
        <animate attributeName="d" values="M20 34 Q24 44 28 34;M20 34 Q24 40 28 34;M20 34 Q24 44 28 34" dur="0.6s" repeatCount="indefinite" />
      </path>
      {/* Stars */}
      <circle cx="8" cy="10" r="1" fill="#e89b2d" opacity="0.3">
        <animate attributeName="opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx="40" cy="16" r="1.2" fill="#e89b2d" opacity="0.4">
        <animate attributeName="opacity" values="0;0.5;0" dur="1.6s" repeatCount="indefinite" />
      </circle>
      <circle cx="12" cy="22" r="0.8" fill="#d4603a" opacity="0.3" />
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
            Think <strong className={styles.accent}>AI preppers</strong>, not
            the bunker kind, the <em>builder</em> kind. A community getting
            ready for 2035 before everyone else.
          </p>
          <RotatingWho />
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
              <FounderArmyIcon />
              <h3 className={styles.beliefTitle}>Become a 10x founder</h3>
              <p className={styles.beliefDesc}>
                AI made everyone a builder. A designer ships code.
                A chef launches a startup. We&rsquo;re here to help you
                become <strong>the founder you didn&rsquo;t know you could be</strong>.
              </p>
            </div>
            <div className={styles.beliefCard}>
              <SkyscraperIcon />
              <h3 className={styles.beliefTitle}>Think 10x everything in 10 years</h3>
              <p className={styles.beliefDesc}>
                10x founders. 10x the economy. 10x faster to build, to ship, to learn.
                Ideas worth more than execution. Brand and taste worth more than code.
                We believe <strong>abundance is coming</strong>, and we want to
                help get us there.
              </p>
            </div>
            <div className={styles.beliefCard}>
              <NewPlaybookIcon />
              <h3 className={styles.beliefTitle}>Startups need a new playbook</h3>
              <p className={styles.beliefDesc}>
                Weekend hackathons and 3-month accelerators won&rsquo;t cut it,
                trust us, we used to run the largest one in the world.
                We miss <strong>grassroots</strong>. We want the fun and creators back.
                Not a community for the 0.01%, for everyone.
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
            Morning caf&eacute; or evening Irish coffee, the curator picks the vibe.
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
                Sci-fi stories about 2035, like Black Mirror,
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
                Form your crew, 5-6 people who get it.
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
          <p className={styles.ventureTag}>2035.vc, our venture arm</p>
          <h2 className={styles.sectionTitle}>The 7-Day Collider</h2>
          <p className={styles.sectionSub}>
            The fastest startup program ever built.
            From <strong>nothing to launch in 7 days</strong> with p2p human and AI mentoring.
          </p>

          <div className={styles.colliderSteps}>
            <div className={styles.colliderStep}>
              <span className={styles.stepNum}>1</span>
              <p>Do a <strong>Startup Microdosing</strong> session first, that&rsquo;s your entry ticket.</p>
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
            We&rsquo;ll invest in the top founders, but we also support
            <strong> all of you</strong> through our platform.
            Think a positive AI prepper mafia: once you&rsquo;ve been through the
            experience, you&rsquo;re a member for life.
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
                    No public events yet, be the first!
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
          Join a 2035Cafe near you, or start one in your city.
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
