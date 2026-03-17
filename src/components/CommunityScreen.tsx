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

/* ── Rotating welcome phrases ── */
const WELCOME_PHRASES = [
  { text: 'A teacher reinventing education', color: '#5a8a3c' },
  { text: 'A sci-fi writer imagining 2035', color: '#e89b2d' },
  { text: 'A solo founder obsessed with product', color: '#d4603a' },
  { text: 'A teenager building a robot', color: '#e89b2d' },
  { text: 'A chef launching a food app', color: '#5a8a3c' },
  { text: 'A musician making AI instruments', color: '#d4603a' },
  { text: 'A nurse automating paperwork', color: '#5a8a3c' },
  { text: 'A retiree building for fun', color: '#e89b2d' },
  { text: 'A designer who ships code', color: '#d4603a' },
  { text: 'An architect rethinking cities', color: '#5a8a3c' },
  { text: 'A farmer optimizing harvests', color: '#e89b2d' },
  { text: 'A parent building a kids\' app', color: '#d4603a' },
];

function RotatingWelcome() {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const advance = useCallback(() => {
    setVisible(false);
    setTimeout(() => {
      setIdx((i) => (i + 1) % WELCOME_PHRASES.length);
      setVisible(true);
    }, 400);
  }, []);
  useEffect(() => {
    const id = setInterval(advance, 2800);
    return () => clearInterval(id);
  }, [advance]);
  const phrase = WELCOME_PHRASES[idx];
  return (
    <div className={styles.welcomeRotator}>
      <span
        className={`${styles.rotatingText} ${visible ? styles.rotatingIn : styles.rotatingOut}`}
        style={{ color: phrase.color }}
      >
        {phrase.text}
      </span>
    </div>
  );
}

/** Crystal ball / portal — White Mirror */
function WhiteMirrorIcon() {
  return (
    <svg viewBox="0 0 40 40" className={styles.actIcon} aria-hidden="true">
      {/* Crystal ball */}
      <circle cx="20" cy="17" r="12" fill="none" stroke="#d4603a" strokeWidth="1.5" />
      <circle cx="20" cy="17" r="12" fill="#d4603a" opacity="0.06" />
      {/* Inner glow / vision */}
      <circle cx="20" cy="15" r="5" fill="#d4603a" opacity="0.1">
        <animate attributeName="r" values="5;7;5" dur="3s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.1;0.2;0.1" dur="3s" repeatCount="indefinite" />
      </circle>
      {/* Stars inside */}
      <circle cx="16" cy="13" r="0.8" fill="#e89b2d" opacity="0.6">
        <animate attributeName="opacity" values="0.6;0.1;0.6" dur="1.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="23" cy="11" r="0.6" fill="#e89b2d" opacity="0.4">
        <animate attributeName="opacity" values="0.1;0.6;0.1" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx="20" cy="18" r="0.7" fill="#e89b2d" opacity="0.5">
        <animate attributeName="opacity" values="0.5;0;0.5" dur="1.2s" repeatCount="indefinite" />
      </circle>
      {/* Base */}
      <path d="M13 29 Q16 26 20 26 Q24 26 27 29" fill="none" stroke="#d4603a" strokeWidth="1.3" />
      <line x1="11" y1="30" x2="29" y2="30" stroke="#d4603a" strokeWidth="1.3" />
    </svg>
  );
}

/** Lightning launch — Startup Microdosing */
function MicrodosingIcon() {
  return (
    <svg viewBox="0 0 40 40" className={styles.actIcon} aria-hidden="true">
      {/* Laptop base */}
      <rect x="8" y="14" width="24" height="16" rx="2" fill="none" stroke="#e89b2d" strokeWidth="1.3" />
      <rect x="8" y="14" width="24" height="16" rx="2" fill="#e89b2d" opacity="0.05" />
      {/* Screen content — code lines */}
      <line x1="12" y1="19" x2="20" y2="19" stroke="#e89b2d" strokeWidth="0.8" opacity="0.4" />
      <line x1="12" y1="22" x2="18" y2="22" stroke="#e89b2d" strokeWidth="0.8" opacity="0.3" />
      <line x1="12" y1="25" x2="22" y2="25" stroke="#e89b2d" strokeWidth="0.8" opacity="0.3" />
      {/* Lightning bolt shooting out */}
      <polygon points="28,8 24,18 27,18 23,28 30,16 27,16" fill="#e89b2d" opacity="0.5" stroke="#e89b2d" strokeWidth="0.8" strokeLinejoin="round" />
      {/* Sparks */}
      <circle cx="34" cy="10" r="1" fill="#e89b2d" opacity="0.4">
        <animate attributeName="opacity" values="0.4;0;0.4" dur="0.8s" repeatCount="indefinite" />
      </circle>
      <circle cx="30" cy="6" r="0.8" fill="#d4603a" opacity="0.3">
        <animate attributeName="opacity" values="0;0.5;0" dur="1.1s" repeatCount="indefinite" />
      </circle>
      {/* Keyboard base */}
      <path d="M6 30 L34 30" stroke="#e89b2d" strokeWidth="1.3" />
    </svg>
  );
}

/** Circle of people — Builder Circle */
function BuilderCircleIcon() {
  return (
    <svg viewBox="0 0 40 40" className={styles.actIcon} aria-hidden="true">
      {/* Circle path */}
      <circle cx="20" cy="20" r="13" fill="none" stroke="#5a8a3c" strokeWidth="0.8" opacity="0.3" strokeDasharray="3 3" />
      {/* 5 people around the circle */}
      {[0, 72, 144, 216, 288].map((angle, i) => {
        const rad = (angle - 90) * Math.PI / 180;
        const cx = 20 + 13 * Math.cos(rad);
        const cy = 20 + 13 * Math.sin(rad);
        return (
          <g key={i}>
            <circle cx={cx} cy={cy} r="3" fill="#5a8a3c" opacity="0.15" stroke="#5a8a3c" strokeWidth="0.8" />
            <circle cx={cx} cy={cy - 1} r="1.2" fill="none" stroke="#5a8a3c" strokeWidth="0.7" />
            <line x1={cx} y1={cy + 0.5} x2={cx} y2={cy + 2} stroke="#5a8a3c" strokeWidth="0.7" />
          </g>
        );
      })}
      {/* Connection lines */}
      <circle cx="20" cy="20" r="3" fill="#5a8a3c" opacity="0.08">
        <animate attributeName="r" values="3;6;3" dur="3s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.08;0.15;0.08" dur="3s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

/* ── Inline SVG icons ── */

/** Sleek 10x multiplier — person with holographic "10x" */
function TenXIcon() {
  return (
    <svg viewBox="0 0 48 48" className={styles.beliefIcon} aria-hidden="true">
      {/* Person silhouette */}
      <circle cx="16" cy="12" r="4.5" fill="none" stroke="#d4603a" strokeWidth="1.5" />
      <path d="M16 17 L16 30" stroke="#d4603a" strokeWidth="1.5" />
      <path d="M16 21 L10 26" stroke="#d4603a" strokeWidth="1.3" />
      <path d="M16 21 L22 26" stroke="#d4603a" strokeWidth="1.3" />
      <path d="M16 30 L12 38" stroke="#d4603a" strokeWidth="1.3" />
      <path d="M16 30 L20 38" stroke="#d4603a" strokeWidth="1.3" />
      {/* 10x holographic text */}
      <text x="35" y="22" fill="#e89b2d" fontSize="11" fontWeight="900" fontFamily="system-ui, sans-serif" textAnchor="middle" opacity="0.8">10x</text>
      {/* Glow ring around 10x */}
      <circle cx="35" cy="18" r="12" fill="none" stroke="#e89b2d" strokeWidth="0.8" opacity="0.2" strokeDasharray="2 2">
        <animate attributeName="stroke-dashoffset" values="0;12" dur="3s" repeatCount="indefinite" />
      </circle>
      {/* Energy connection */}
      <line x1="22" y1="18" x2="23" y2="18" stroke="#e89b2d" strokeWidth="1" opacity="0.4" strokeDasharray="1 1">
        <animate attributeName="opacity" values="0.4;0.1;0.4" dur="1.5s" repeatCount="indefinite" />
      </line>
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

/** AI-friendly data sharing — brain + data flow */
function AiDataIcon() {
  return (
    <svg viewBox="0 0 48 48" className={styles.beliefIcon} aria-hidden="true">
      {/* AI brain outline */}
      <path d="M24 8 C14 8 10 16 10 22 C10 28 14 34 24 34 C34 34 38 28 38 22 C38 16 34 8 24 8Z"
            fill="none" stroke="#d4603a" strokeWidth="1.4" />
      <path d="M24 8 C14 8 10 16 10 22 C10 28 14 34 24 34 C34 34 38 28 38 22 C38 16 34 8 24 8Z"
            fill="#d4603a" opacity="0.05" />
      {/* Neural network inside */}
      <circle cx="18" cy="18" r="2" fill="#e89b2d" opacity="0.3" />
      <circle cx="30" cy="18" r="2" fill="#e89b2d" opacity="0.3" />
      <circle cx="24" cy="26" r="2" fill="#e89b2d" opacity="0.3" />
      <circle cx="24" cy="14" r="1.5" fill="#e89b2d" opacity="0.3" />
      {/* Connections */}
      <line x1="18" y1="18" x2="30" y2="18" stroke="#e89b2d" strokeWidth="0.7" opacity="0.3" />
      <line x1="18" y1="18" x2="24" y2="26" stroke="#e89b2d" strokeWidth="0.7" opacity="0.3" />
      <line x1="30" y1="18" x2="24" y2="26" stroke="#e89b2d" strokeWidth="0.7" opacity="0.3" />
      <line x1="24" y1="14" x2="18" y2="18" stroke="#e89b2d" strokeWidth="0.7" opacity="0.3" />
      <line x1="24" y1="14" x2="30" y2="18" stroke="#e89b2d" strokeWidth="0.7" opacity="0.3" />
      {/* Data flow arrows in/out */}
      <path d="M6 22 L10 22" stroke="#e89b2d" strokeWidth="1" opacity="0.5">
        <animate attributeName="opacity" values="0.5;0.1;0.5" dur="1.5s" repeatCount="indefinite" />
      </path>
      <path d="M38 22 L42 22" stroke="#e89b2d" strokeWidth="1" opacity="0.5">
        <animate attributeName="opacity" values="0.1;0.5;0.1" dur="1.5s" repeatCount="indefinite" />
      </path>
      <path d="M24 34 L24 40" stroke="#e89b2d" strokeWidth="1" opacity="0.4">
        <animate attributeName="opacity" values="0.4;0;0.4" dur="2s" repeatCount="indefinite" />
      </path>
      {/* Pulse on nodes */}
      <circle cx="18" cy="18" r="2" fill="none" stroke="#e89b2d" strokeWidth="0.5" opacity="0.3">
        <animate attributeName="r" values="2;4;2" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite" />
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
            <span className={styles.tagline}>What was impossible is now a <span className={styles.flicker}>side project.</span></span>
          </h1>
          <p className={styles.heroMission}>
            An AI prepper community.
            Optimistic, moving fast, racing toward a world of abundance
            powered by AI and robots. Get ready before everyone else.
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
          <h2 className={styles.sectionTitle}>Fear nothing! Recalibrate for 2035</h2>
          <div className={styles.beliefGrid}>
            <div className={styles.beliefCard}>
              <TenXIcon />
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
              <AiDataIcon />
              <h3 className={styles.beliefTitle}>AI-friendly by design</h3>
              <p className={styles.beliefDesc}>
                We believe sharing data with AI is key. Sessions are recorded.
                We won&rsquo;t share your data, but we use it to give you
                <strong> better intros, better direction, and better matches</strong>.
                Our community is built for the AI age.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── The 2 Hours ── */}
      <section id="the2hours" className={styles.section}>
        <div className={styles.inner}>
          <h2 className={styles.sectionTitle}><span className={styles.accent}>2h</span> to get ahead and stay ahead.</h2>
          <p className={styles.sectionSub}>
            Cut through the noise. Every month, the AI landscape shifts.
            We break it down, you build on it.
            Morning caf&eacute; or evening Irish coffee, the curator
            picks the vibe. An AI runs the show.
          </p>

          <div className={styles.welcomeBlock}>
            <p className={styles.welcomeLabel}>We welcome</p>
            <RotatingWelcome />
            <p className={styles.welcomeSub}>
              If you have passion, we want to support you.
              Being a solo founder is lonely. You&rsquo;re not alone anymore.
            </p>
          </div>

          <div className={styles.actGrid}>
            <div className={styles.actCard}>
              <div className={styles.actHeader}>
                <WhiteMirrorIcon />
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
                <MicrodosingIcon />
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
                <BuilderCircleIcon />
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
          <h2 className={styles.sectionTitle}>The 7-Day Collider</h2>
          <p className={styles.colliderTagline}>From 0 to Viral in 7 days.</p>
          <p className={styles.sectionSub}>
            Friday to Friday. <strong>Fully AI-ran</strong>, with strong peer-to-peer mentoring
            and a lot of fun. We don&rsquo;t care about MVPs, market size, or traction.
            We care about <strong>talent and crazy ideas that were impossible yesterday</strong>.
          </p>

          <p className={styles.sectionSub}>
            Powered by AI, but more importantly <strong>powered by the community</strong>.
            This is open-source energy applied to startups. Dates TBD &mdash; but when it drops, it drops hard.
          </p>

          <div className={styles.colliderSteps}>
            <div className={styles.colliderStep}>
              <span className={styles.stepNum}>&#x1f91d;</span>
              <div>
                <p><strong>Pledge #1 &mdash; Share your data.</strong></p>
                <p>
                  The AI needs it to track your progress. The community needs it to help you.
                  This is an <strong>open community</strong> &mdash; all AI tools used are open-source.
                  Radical transparency is a feature, not a bug.
                </p>
              </div>
            </div>
            <div className={styles.colliderStep}>
              <span className={styles.stepNum}>&#x1f525;</span>
              <div>
                <p><strong>Pledge #2 &mdash; Whoever wins, you support them.</strong></p>
                <p>
                  Push them, hype them, make noise.
                  If one project goes viral, <strong>we invest so they can drop everything and focus</strong>.
                </p>
              </div>
            </div>
            <div className={styles.colliderStep}>
              <span className={styles.stepNum}>&#x1f680;</span>
              <div>
                <p><strong>The Deal</strong></p>
                <p>
                  <strong className={styles.investAmount}>$25K</strong> for 1-2% (based on our AI assessment).
                  We don&rsquo;t care if you&rsquo;re venture-backable or not.
                  We want the craziest projects to take off &mdash; think <strong>OpenClaw</strong>,{' '}
                  <strong>AutoResearch</strong>, or <strong>saving your dog from cancer</strong>.
                  We&rsquo;d love to invest more later, but that&rsquo;s for later.
                  First, let&rsquo;s test a bunch of things.
                </p>
              </div>
            </div>
          </div>

          <p className={styles.colliderVision}>
            Even if we believe by 2035 money won&rsquo;t matter much &mdash;
            <strong> it does now</strong>. So let&rsquo;s use it to support the
            boldest builders on the planet.
          </p>

          <p className={styles.colliderPromise}>
            Our promise: whatever happens, you&rsquo;ll walk out <strong>recalibrated</strong> and
            ready for the world that&rsquo;s coming.
          </p>

          <p className={styles.ventureTag}>Powered by 2035.vc</p>
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
        <span className={styles.footerVibe}>Vibe coded by Franck Nouyrigat</span>
        <Link to="/admin" className={styles.footerLink}>Login</Link>
      </footer>
    </div>
  );
}
