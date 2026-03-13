import { Link } from 'react-router-dom';
import styles from './CommunityScreen.module.css';

/* ── Inline SVG illustrations ── */

function CoffeeBeerIcon() {
  return (
    <svg viewBox="0 0 120 120" className={styles.heroIcon} aria-hidden="true">
      {/* Steam / bubbles */}
      <circle cx="35" cy="20" r="3" fill="#6366f1" opacity="0.6">
        <animate attributeName="cy" values="20;8;20" dur="3s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.6;0;0.6" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle cx="50" cy="16" r="2.5" fill="#818cf8" opacity="0.4">
        <animate attributeName="cy" values="16;4;16" dur="2.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.4;0;0.4" dur="2.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="42" cy="22" r="2" fill="#a5b4fc" opacity="0.5">
        <animate attributeName="cy" values="22;10;22" dur="3.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.5;0;0.5" dur="3.5s" repeatCount="indefinite" />
      </circle>
      {/* Coffee cup */}
      <rect x="22" y="32" width="42" height="50" rx="6" fill="none" stroke="#6366f1" strokeWidth="2.5" />
      <path d="M64 45 C78 45, 78 70, 64 70" fill="none" stroke="#6366f1" strokeWidth="2.5" />
      <rect x="18" y="85" width="50" height="4" rx="2" fill="#6366f1" opacity="0.4" />
      {/* Beer glass */}
      <rect x="75" y="28" width="28" height="55" rx="4" fill="none" stroke="#22c55e" strokeWidth="2" opacity="0.7" />
      <rect x="79" y="34" width="20" height="6" rx="2" fill="#22c55e" opacity="0.2" />
      <rect x="75" y="85" width="28" height="4" rx="2" fill="#22c55e" opacity="0.3" />
      {/* Bubbles in beer */}
      <circle cx="85" cy="60" r="1.5" fill="#22c55e" opacity="0.3">
        <animate attributeName="cy" values="70;40;70" dur="4s" repeatCount="indefinite" />
      </circle>
      <circle cx="92" cy="55" r="1" fill="#22c55e" opacity="0.25">
        <animate attributeName="cy" values="65;35;65" dur="3s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

function WhiteMirrorIcon() {
  return (
    <svg viewBox="0 0 100 100" className={styles.stepIcon} aria-hidden="true">
      {/* Eye shape */}
      <ellipse cx="50" cy="50" rx="40" ry="25" fill="none" stroke="#6366f1" strokeWidth="2">
        <animate attributeName="ry" values="25;22;25" dur="4s" repeatCount="indefinite" />
      </ellipse>
      {/* Iris */}
      <circle cx="50" cy="50" r="14" fill="none" stroke="#818cf8" strokeWidth="2" />
      {/* Pupil */}
      <circle cx="50" cy="50" r="6" fill="#6366f1">
        <animate attributeName="r" values="6;8;6" dur="3s" repeatCount="indefinite" />
      </circle>
      {/* Glint */}
      <circle cx="45" cy="46" r="2" fill="#f0f0f5" opacity="0.8" />
      {/* Scan lines */}
      <line x1="10" y1="50" x2="20" y2="50" stroke="#6366f1" strokeWidth="1" opacity="0.3" />
      <line x1="80" y1="50" x2="90" y2="50" stroke="#6366f1" strokeWidth="1" opacity="0.3" />
    </svg>
  );
}

function MicrodoseIcon() {
  return (
    <svg viewBox="0 0 100 100" className={styles.stepIcon} aria-hidden="true">
      {/* Lightning bolt */}
      <polygon points="55,10 35,48 50,48 40,90 70,42 52,42" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinejoin="round">
        <animate attributeName="opacity" values="1;0.6;1" dur="2s" repeatCount="indefinite" />
      </polygon>
      {/* Energy rings */}
      <circle cx="50" cy="50" r="35" fill="none" stroke="#f59e0b" strokeWidth="1" opacity="0.2">
        <animate attributeName="r" values="35;42;35" dur="3s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.2;0;0.2" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle cx="50" cy="50" r="28" fill="none" stroke="#f59e0b" strokeWidth="1" opacity="0.15">
        <animate attributeName="r" values="28;36;28" dur="2.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.15;0;0.15" dur="2.5s" repeatCount="indefinite" />
      </circle>
      {/* Sparks */}
      <circle cx="30" cy="30" r="1.5" fill="#f59e0b" opacity="0.4">
        <animate attributeName="opacity" values="0.4;0;0.4" dur="1.8s" repeatCount="indefinite" />
      </circle>
      <circle cx="72" cy="65" r="1.5" fill="#f59e0b" opacity="0.3">
        <animate attributeName="opacity" values="0;0.5;0" dur="2.2s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

function CircleIcon() {
  return (
    <svg viewBox="0 0 100 100" className={styles.stepIcon} aria-hidden="true">
      {/* Center node */}
      <circle cx="50" cy="50" r="8" fill="#22c55e" opacity="0.6" />
      {/* Outer nodes */}
      <circle cx="50" cy="18" r="5" fill="#6366f1" opacity="0.7" />
      <circle cx="78" cy="34" r="5" fill="#818cf8" opacity="0.7" />
      <circle cx="78" cy="66" r="5" fill="#a5b4fc" opacity="0.7" />
      <circle cx="50" cy="82" r="5" fill="#6366f1" opacity="0.7" />
      <circle cx="22" cy="66" r="5" fill="#818cf8" opacity="0.7" />
      <circle cx="22" cy="34" r="5" fill="#a5b4fc" opacity="0.7" />
      {/* Connections */}
      <line x1="50" y1="18" x2="78" y2="34" stroke="#6366f1" strokeWidth="1" opacity="0.3" />
      <line x1="78" y1="34" x2="78" y2="66" stroke="#6366f1" strokeWidth="1" opacity="0.3" />
      <line x1="78" y1="66" x2="50" y2="82" stroke="#6366f1" strokeWidth="1" opacity="0.3" />
      <line x1="50" y1="82" x2="22" y2="66" stroke="#6366f1" strokeWidth="1" opacity="0.3" />
      <line x1="22" y1="66" x2="22" y2="34" stroke="#6366f1" strokeWidth="1" opacity="0.3" />
      <line x1="22" y1="34" x2="50" y2="18" stroke="#6366f1" strokeWidth="1" opacity="0.3" />
      {/* Center connections */}
      <line x1="50" y1="50" x2="50" y2="18" stroke="#22c55e" strokeWidth="1" opacity="0.25" />
      <line x1="50" y1="50" x2="78" y2="34" stroke="#22c55e" strokeWidth="1" opacity="0.25" />
      <line x1="50" y1="50" x2="78" y2="66" stroke="#22c55e" strokeWidth="1" opacity="0.25" />
      <line x1="50" y1="50" x2="50" y2="82" stroke="#22c55e" strokeWidth="1" opacity="0.25" />
      <line x1="50" y1="50" x2="22" y2="66" stroke="#22c55e" strokeWidth="1" opacity="0.25" />
      <line x1="50" y1="50" x2="22" y2="34" stroke="#22c55e" strokeWidth="1" opacity="0.25" />
      {/* Pulse */}
      <circle cx="50" cy="50" r="8" fill="none" stroke="#22c55e" strokeWidth="1" opacity="0.3">
        <animate attributeName="r" values="8;30;8" dur="4s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.3;0;0.3" dur="4s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

function RocketIcon() {
  return (
    <svg viewBox="0 0 80 80" className={styles.afterIcon} aria-hidden="true">
      {/* Rocket body */}
      <path d="M40 10 C40 10, 55 25, 55 45 L55 55 L25 55 L25 45 C25 25, 40 10, 40 10Z"
            fill="none" stroke="#f59e0b" strokeWidth="2" />
      {/* Window */}
      <circle cx="40" cy="35" r="5" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
      {/* Fins */}
      <path d="M25 48 L15 58 L25 55" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
      <path d="M55 48 L65 58 L55 55" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
      {/* Flame */}
      <path d="M32 55 Q40 72, 48 55" fill="none" stroke="#ef4444" strokeWidth="1.5" opacity="0.7">
        <animate attributeName="d" values="M32 55 Q40 72, 48 55;M32 55 Q40 68, 48 55;M32 55 Q40 72, 48 55" dur="0.6s" repeatCount="indefinite" />
      </path>
      <path d="M36 55 Q40 65, 44 55" fill="none" stroke="#f59e0b" strokeWidth="1" opacity="0.5">
        <animate attributeName="d" values="M36 55 Q40 65, 44 55;M36 55 Q40 60, 44 55;M36 55 Q40 65, 44 55" dur="0.4s" repeatCount="indefinite" />
      </path>
    </svg>
  );
}

function CommunityIcon() {
  return (
    <svg viewBox="0 0 80 80" className={styles.afterIcon} aria-hidden="true">
      {/* People outlines */}
      <circle cx="25" cy="28" r="6" fill="none" stroke="#6366f1" strokeWidth="1.5" />
      <path d="M13 50 C13 40, 37 40, 37 50" fill="none" stroke="#6366f1" strokeWidth="1.5" />
      <circle cx="55" cy="28" r="6" fill="none" stroke="#818cf8" strokeWidth="1.5" />
      <path d="M43 50 C43 40, 67 40, 67 50" fill="none" stroke="#818cf8" strokeWidth="1.5" />
      <circle cx="40" cy="42" r="6" fill="none" stroke="#22c55e" strokeWidth="1.5" />
      <path d="M28 64 C28 54, 52 54, 52 64" fill="none" stroke="#22c55e" strokeWidth="1.5" />
      {/* Connection dots */}
      <circle cx="40" cy="22" r="1.5" fill="#a5b4fc" opacity="0.5">
        <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

export function CommunityScreen() {
  return (
    <div className={styles.page}>
      {/* ── Nav ── */}
      <nav className={styles.topNav}>
        <Link to="/" className={styles.navBrand}>☕ Cafe2035</Link>
        <div className={styles.navRight}>
          <a href="#the2hours" className={styles.navLink}>The 2 Hours</a>
          <a href="#after" className={styles.navLink}>What's Next</a>
          <Link to="/apply" className={styles.navCta}>Organize one</Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={styles.heroGlow} />
        <div className={styles.heroContent}>
          <CoffeeBeerIcon />
          <p className={styles.heroEyebrow}>Morning coffee or evening beers — your call</p>
          <h1 className={styles.headline}>
            Get Ready for <span className={styles.accent}>2035</span>
          </h1>
          <p className={styles.subhead}>
            Feel <span className={styles.tagLost}>lost</span>?
            Feel <span className={styles.tagConfused}>confused</span>?
            Or are you <span className={styles.tagExcited}>excited</span>?
          </p>
          <p className={styles.subheadSecondary}>
            This is for you. In <strong>2 hours</strong> you'll do more than
            what used to take an entire weekend.
          </p>
          <p className={styles.trustMe}>Trust me on that.</p>
          <div className={styles.ctaRow}>
            <a href="#the2hours" className={styles.ctaPrimary}>
              See how it works ↓
            </a>
            <Link to="/apply" className={styles.ctaSecondary}>
              Run one in your city
            </Link>
          </div>
        </div>
      </section>

      {/* ── The 2 Hours ── */}
      <section id="the2hours" className={styles.section}>
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>The 2 Hours</h2>
          <p className={styles.sectionSubtitle}>
            A TED talk walked into a hackathon. This is what happened.
          </p>

          <div className={styles.timeline}>
            {/* Step 1 — White Mirror */}
            <div className={styles.timelineStep}>
              <div className={styles.timelineLine}>
                <div className={styles.timelineDot} />
                <div className={styles.timelineBar} />
              </div>
              <div className={styles.stepCard}>
                <div className={styles.stepVisual}>
                  <WhiteMirrorIcon />
                </div>
                <div className={styles.stepContent}>
                  <p className={styles.stepDuration}>
                    <span className={styles.durationNum}>15</span> min
                  </p>
                  <h3 className={styles.stepName}>White Mirror</h3>
                  <p className={styles.stepTag}>Sci-fi stories of 2035</p>
                  <p className={styles.stepDesc}>
                    Forget Black Mirror. This is the bright side.
                    20 slides, 15 seconds each — founders, artists, and scientists
                    paint vivid stories of what 2035 actually looks like when things go <em>right</em>.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 2 — Microdose */}
            <div className={styles.timelineStep}>
              <div className={styles.timelineLine}>
                <div className={`${styles.timelineDot} ${styles.dotAmber}`} />
                <div className={`${styles.timelineBar} ${styles.barAmber}`} />
              </div>
              <div className={`${styles.stepCard} ${styles.stepCardAmber}`}>
                <div className={styles.stepVisual}>
                  <MicrodoseIcon />
                </div>
                <div className={styles.stepContent}>
                  <p className={styles.stepDuration}>
                    <span className={`${styles.durationNum} ${styles.numAmber}`}>60</span> min
                  </p>
                  <h3 className={styles.stepName}>Startup Microdosing</h3>
                  <p className={styles.stepTag}>Vibing Up 🔥</p>
                  <p className={styles.stepDesc}>
                    Hands on. Build something with AI. First-timers get their "holy sh*t" moment.
                    Veterans race to ship fastest. Feel what it's like to be a 10x founder — in one hour.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 3 — AI Prepper Circle */}
            <div className={styles.timelineStep}>
              <div className={styles.timelineLine}>
                <div className={`${styles.timelineDot} ${styles.dotGreen}`} />
              </div>
              <div className={`${styles.stepCard} ${styles.stepCardGreen}`}>
                <div className={styles.stepVisual}>
                  <CircleIcon />
                </div>
                <div className={styles.stepContent}>
                  <p className={styles.stepDuration}>
                    <span className={`${styles.durationNum} ${styles.numGreen}`}>45</span> min
                  </p>
                  <h3 className={styles.stepName}>AI Prepper Circle</h3>
                  <p className={styles.stepTag}>Find Your Tribe</p>
                  <p className={styles.stepDesc}>
                    Form your long-lasting crew. 5-6 people who get it.
                    Meet monthly, share wins, cover each other's blind spots.
                    The world is moving fast — don't go alone.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.totalTime}>
            <span className={styles.totalIcon}>⏱</span>
            <span>2 hours total — then go change the world</span>
          </div>
        </div>
      </section>

      {/* ── The After ── */}
      <section id="after" className={styles.section}>
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>The After</h2>
          <p className={styles.sectionSubtitle}>
            The 2 hours are just the door. Here's what's on the other side.
          </p>

          <div className={styles.afterGrid}>
            <div className={styles.afterCard}>
              <CommunityIcon />
              <h3 className={styles.afterName}>Community</h3>
              <p className={styles.afterDesc}>
                Keep meeting. Keep building. Keep learning.
                Your AI prepper circle stays with you — weekly calls,
                shared wins, real accountability.
              </p>
              <p className={styles.afterCost}>Free, forever.</p>
            </div>

            <div className={styles.afterDivider}>
              <span className={styles.afterOr}>AND / OR</span>
            </div>

            <div className={`${styles.afterCard} ${styles.afterCardHighlight}`}>
              <RocketIcon />
              <h3 className={styles.afterName}>1-Week Collider</h3>
              <p className={styles.afterDesc}>
                For venture-backable founders who don't want to wait 3-6 months.
                Friday to Friday. Intense. The best ones walk out with
                <strong className={styles.investAmount}> $25K invested</strong> to move fast.
              </p>
              <p className={styles.afterJoke}>
                (don't spend it all on Mac minis!)
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaSectionGlow} />
        <h2 className={styles.ctaHeadline}>
          AI is changing everything.<br />
          <span className={styles.accent}>Let's make it good.</span>
        </h2>
        <p className={styles.ctaSubline}>
          Run a Cafe2035 in your city. We give you the playbook, the content, and the community.
          You bring the coffee. Or the beers.
        </p>
        <div className={styles.ctaRow}>
          <Link to="/apply" className={styles.ctaPrimary}>
            Apply to organize
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className={styles.footer}>
        <span className={styles.footerBrand}>☕ Cafe2035</span>
        <span className={styles.footerTagline}>See the future. Sleep better.</span>
      </footer>
    </div>
  );
}
