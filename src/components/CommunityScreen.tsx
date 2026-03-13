import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import styles from './CommunityScreen.module.css';

/** HashRouter swallows #anchors — scroll manually instead */
function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

/* ── Random joke pools ── */

const HERO_JOKES = [
  'Yes, even T-800 models.',
  'Welcome, Mr. Anderson.',
  'Skynet wished it had this community.',
  "Not the droids you're looking for? Too bad.",
  'Replicants welcome. Turing test optional.',
  'Furiosa approved. ⛽',
  'Red pill or blue pill? We chose espresso.',
  'Come with me if you want to build.',
  'The spice must flow. So must the code.',
  "Winter is coming. So is AI. We're ready.",
];

const TIMELINE_JOKES: [string, string, string][] = [
  // [white mirror joke, microdose joke, circle joke]
  [
    'No T-800s on stage. Probably.',
    "You'll feel like Neo learning kung fu — except it's React.",
    'The AI apocalypse is more fun with friends. 🧟',
  ],
  [
    'Like a Blade Runner briefing, but optimistic.',
    'Mad Max with a MacBook. Fury Road, but shipping SaaS.',
    "Morpheus said 'free your mind.' We say 'find your crew.' 🕶️",
  ],
  [
    'Imagine TED talks, but in the Mos Eisley cantina.',
    'Move fast, build things. The Terminator would be proud.',
    'Your survival squad for the robot uprising. Just kidding. Mostly. 🤖',
  ],
  [
    'Sci-fi writers telling you about Tuesday. In 2035.',
    'Ship faster than the Millennium Falcon. Almost.',
    'Like the Fellowship, but for AI. One does not simply build alone. 💍',
  ],
  [
    'Black Mirror, but make it a rom-com with robots.',
    "Hasta la vista, impostor syndrome. You're building now.",
    'Your crew for when the machines... you know what, never mind. 🧟',
  ],
];

const VIBE_WORDS = [
  'Code',
  'Up',
  'Market',
  'Build',
  'Robot',
  'Art',
  'Ship',
  'Design',
  'Launch',
  'Create',
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/* ── Inline SVG illustrations ── */

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

function WhiteMirrorIcon() {
  return (
    <svg viewBox="0 0 100 100" className={styles.stepIcon} aria-hidden="true">
      <rect x="15" y="12" width="70" height="55" rx="8" fill="none" stroke="#d4603a" strokeWidth="2" />
      <rect x="22" y="18" width="56" height="42" rx="3" fill="#d4603a" opacity="0.06" />
      <line x1="22" y1="30" x2="78" y2="30" stroke="#d4603a" strokeWidth="0.5" opacity="0.2">
        <animate attributeName="y1" values="18;60;18" dur="3s" repeatCount="indefinite" />
        <animate attributeName="y2" values="18;60;18" dur="3s" repeatCount="indefinite" />
      </line>
      <text x="50" y="44" textAnchor="middle" fill="#d4603a" opacity="0.4" fontSize="14" fontWeight="bold" fontFamily="monospace">2035</text>
      <line x1="40" y1="12" x2="30" y2="2" stroke="#d4603a" strokeWidth="1.5" />
      <line x1="60" y1="12" x2="70" y2="2" stroke="#d4603a" strokeWidth="1.5" />
      <circle cx="30" cy="2" r="2" fill="#d4603a" opacity="0.5" />
      <circle cx="70" cy="2" r="2" fill="#d4603a" opacity="0.5" />
      <line x1="30" y1="67" x2="25" y2="80" stroke="#d4603a" strokeWidth="1.5" />
      <line x1="70" y1="67" x2="75" y2="80" stroke="#d4603a" strokeWidth="1.5" />
      <circle cx="35" cy="30" r="1" fill="#d4603a" opacity="0.3">
        <animate attributeName="opacity" values="0.3;0;0.3" dur="0.8s" repeatCount="indefinite" />
      </circle>
      <circle cx="60" cy="50" r="1" fill="#d4603a" opacity="0.2">
        <animate attributeName="opacity" values="0;0.3;0" dur="1.2s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

function LightningIcon() {
  return (
    <svg viewBox="0 0 100 100" className={styles.stepIcon} aria-hidden="true">
      <rect x="15" y="55" width="70" height="6" rx="2" fill="none" stroke="#e89b2d" strokeWidth="2" />
      <rect x="20" y="20" width="60" height="38" rx="3" fill="none" stroke="#e89b2d" strokeWidth="2" />
      <polygon points="52,24 40,42 48,42 42,58 58,38 50,38" fill="none" stroke="#e89b2d" strokeWidth="1.8" strokeLinejoin="round">
        <animate attributeName="opacity" values="1;0.4;1" dur="1.5s" repeatCount="indefinite" />
      </polygon>
      <circle cx="30" cy="15" r="1.5" fill="#e89b2d" opacity="0.3">
        <animate attributeName="opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx="72" cy="28" r="1" fill="#e89b2d" opacity="0.4">
        <animate attributeName="opacity" values="0;0.5;0" dur="1.6s" repeatCount="indefinite" />
      </circle>
      <rect x="28" y="57" width="3" height="1" rx="0.5" fill="#e89b2d" opacity="0.3" />
      <rect x="34" y="57" width="3" height="1" rx="0.5" fill="#e89b2d" opacity="0.3" />
      <rect x="40" y="57" width="18" height="1" rx="0.5" fill="#e89b2d" opacity="0.3" />
      <rect x="62" y="57" width="3" height="1" rx="0.5" fill="#e89b2d" opacity="0.3" />
      <rect x="68" y="57" width="3" height="1" rx="0.5" fill="#e89b2d" opacity="0.3" />
    </svg>
  );
}

function CircleIcon() {
  return (
    <svg viewBox="0 0 100 100" className={styles.stepIcon} aria-hidden="true">
      <circle cx="50" cy="50" r="10" fill="#5a8a3c" opacity="0.15" />
      <circle cx="50" cy="50" r="10" fill="none" stroke="#5a8a3c" strokeWidth="2" />
      <text x="50" y="54" textAnchor="middle" fill="#5a8a3c" fontSize="8" fontWeight="bold">YOU</text>
      <circle cx="50" cy="15" r="6" fill="none" stroke="#d4603a" strokeWidth="1.5" />
      <circle cx="80" cy="30" r="6" fill="none" stroke="#d4603a" strokeWidth="1.5" />
      <circle cx="80" cy="70" r="6" fill="none" stroke="#d4603a" strokeWidth="1.5" />
      <circle cx="50" cy="85" r="6" fill="none" stroke="#d4603a" strokeWidth="1.5" />
      <circle cx="20" cy="70" r="6" fill="none" stroke="#d4603a" strokeWidth="1.5" />
      <circle cx="20" cy="30" r="6" fill="none" stroke="#d4603a" strokeWidth="1.5" />
      <line x1="50" y1="40" x2="50" y2="21" stroke="#d4603a" strokeWidth="1" opacity="0.3" strokeDasharray="3 2" />
      <line x1="58" y1="43" x2="75" y2="34" stroke="#d4603a" strokeWidth="1" opacity="0.3" strokeDasharray="3 2" />
      <line x1="58" y1="57" x2="75" y2="66" stroke="#d4603a" strokeWidth="1" opacity="0.3" strokeDasharray="3 2" />
      <line x1="50" y1="60" x2="50" y2="79" stroke="#d4603a" strokeWidth="1" opacity="0.3" strokeDasharray="3 2" />
      <line x1="42" y1="57" x2="25" y2="66" stroke="#d4603a" strokeWidth="1" opacity="0.3" strokeDasharray="3 2" />
      <line x1="42" y1="43" x2="25" y2="34" stroke="#d4603a" strokeWidth="1" opacity="0.3" strokeDasharray="3 2" />
      <circle cx="50" cy="50" r="10" fill="none" stroke="#5a8a3c" strokeWidth="1" opacity="0.3">
        <animate attributeName="r" values="10;35;10" dur="4s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.3;0;0.3" dur="4s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

function RocketIcon() {
  return (
    <svg viewBox="0 0 80 80" className={styles.afterIcon} aria-hidden="true">
      <path d="M40 10 C40 10, 55 25, 55 45 L55 55 L25 55 L25 45 C25 25, 40 10, 40 10Z"
            fill="none" stroke="#e89b2d" strokeWidth="2" />
      <circle cx="40" cy="35" r="5" fill="none" stroke="#e89b2d" strokeWidth="1.5" />
      <path d="M25 48 L15 58 L25 55" fill="none" stroke="#e89b2d" strokeWidth="1.5" />
      <path d="M55 48 L65 58 L55 55" fill="none" stroke="#e89b2d" strokeWidth="1.5" />
      <path d="M32 55 Q40 72, 48 55" fill="none" stroke="#d4603a" strokeWidth="1.5" opacity="0.7">
        <animate attributeName="d" values="M32 55 Q40 72, 48 55;M32 55 Q40 68, 48 55;M32 55 Q40 72, 48 55" dur="0.6s" repeatCount="indefinite" />
      </path>
    </svg>
  );
}


/* ── Rolling text component ── */
const ROLES = [
  'Founders',
  'Developers',
  'Designers',
  'Makers',
  'Builders',
  'Hackers',
  'Artists',
  'Dreamers',
  'Operators',
  'Rebels',
];

function RollingRoles() {
  const doubled = [...ROLES, ...ROLES];
  return (
    <span className={styles.rollerWrap}>
      <span className={styles.rollerTrack}>
        {doubled.map((role, i) => (
          <span key={i} className={styles.rollerItem}>{role}</span>
        ))}
      </span>
    </span>
  );
}

/* ── Rolling vibe word for motto ── */
function RollingVibe() {
  const doubled = [...VIBE_WORDS, ...VIBE_WORDS];
  return (
    <span className={styles.vibeWrap}>
      <span className={styles.vibeTrack}>
        {doubled.map((word, i) => (
          <span key={i} className={styles.vibeItem}>{word}</span>
        ))}
      </span>
    </span>
  );
}

/* ── "Expert at anything" examples — rolling horizontally ── */
const EXPERT_EXAMPLES = [
  'A designer ships production code.',
  'A chef launches a SaaS.',
  'A teacher builds an app overnight.',
  'A musician deploys a startup.',
  'A nurse automates her clinic.',
  'A 16-year-old builds a $1M product.',
  'A poet writes a smart contract.',
  'A farmer optimizes supply chains.',
  'A grandma builds her own chatbot.',
  'A DJ launches a fintech.',
];

function RollingExperts() {
  const doubled = [...EXPERT_EXAMPLES, ...EXPERT_EXAMPLES];
  return (
    <div className={styles.expertRollerWrap}>
      <div className={styles.expertRollerTrack}>
        {doubled.map((ex, i) => (
          <span key={i} className={styles.expertRollerItem}>{ex}</span>
        ))}
      </div>
    </div>
  );
}

export function CommunityScreen() {
  // Pick random jokes on each mount — stable for the session
  const heroJoke = useMemo(() => pickRandom(HERO_JOKES), []);
  const timelineJokes = useMemo(() => pickRandom(TIMELINE_JOKES), []);

  return (
    <div className={styles.page}>
      {/* ── Nav ── */}
      <nav className={styles.topNav}>
        <Link to="/" className={styles.navBrand}>☕ 2035Cafe</Link>
        <div className={styles.navRight}>
          <button onClick={() => scrollTo('the2hours')} className={styles.navLink}>The 2 Hours</button>
          <button onClick={() => scrollTo('after')} className={styles.navLink}>What's Next</button>
          <Link to="/apply" className={styles.navCta}>Organize one</Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={styles.heroGlow} />
        <div className={styles.heroContent}>
          <CoffeeCupSVG />
          <h1 className={styles.headline}>
            <span className={styles.brandName}>2035Cafe</span>
            <span className={styles.headlineSub}>The AI Prepper Community</span>
          </h1>
          <p className={styles.roleLine}>
            For <RollingRoles /> — deal with it, you're all welcome.
          </p>
          <p className={styles.heroJoke}>{heroJoke}</p>
          <p className={styles.subhead}>
            We all know the world will be different in 2035.
            This is the place where you'll know how to be ready <em>before anyone else</em>.
          </p>
          <p className={styles.pillRow}>
            <span className={styles.pill}>Be Inspired</span>
            <span className={styles.pillDot}>·</span>
            <span className={styles.pill}>Build</span>
            <span className={styles.pillDot}>·</span>
            <span className={styles.pill}>Connect</span>
          </p>
          <p className={styles.motto}>
            Stock Cans or Vibe <RollingVibe />. We Vibe <RollingVibe />.
          </p>
          <div className={styles.ctaRow}>
            <button onClick={() => scrollTo('the2hours')} className={styles.ctaPrimary}>
              How it works ↓
            </button>
            <Link to="/apply" className={styles.ctaSecondary}>
              Run one in your city
            </Link>
          </div>
        </div>
      </section>

      {/* ── The 2 Hours ── */}
      <section id="the2hours" className={styles.section}>
        <div className={styles.sectionInner}>
          <p className={styles.sectionEyebrow}>Morning coffee or evening beers — or water, we don't judge</p>
          <h2 className={styles.sectionTitle}>The Most Life-Changing 2h of Your Life</h2>
          <p className={styles.sectionSubtitle}>
            That's the goal. No fluff, no panels, no networking bingo.
            <br />
            <span className={styles.strikeJoke}>Startup Weekend?</span> That was a whole weekend. This is 2 hours. You're welcome.
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
                    Like Black Mirror, but things go <em>right</em>.
                    20 slides × 15 sec — founders, chefs, scientists paint vivid futures.
                    {' '}<span className={styles.jokeInline}>{timelineJokes[0]}</span>
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
                  <LightningIcon />
                </div>
                <div className={styles.stepContent}>
                  <p className={styles.stepDuration}>
                    <span className={`${styles.durationNum} ${styles.numAmber}`}>60</span> min
                  </p>
                  <h3 className={styles.stepName}>Startup Microdosing</h3>
                  <p className={styles.stepTag}>Instant Tech Stack Enablement 🔥</p>
                  <p className={styles.stepDesc}>
                    Idea-to-launch. Build fast, repeat. First-timers get the "holy sh*t" moment.
                    Veterans compete to ship fastest.
                    {' '}<span className={styles.jokeInline}>{timelineJokes[1]}</span>
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
                  <p className={styles.stepTag}>Your Long-Lasting Crew</p>
                  <p className={styles.stepDesc}>
                    Form your tribe. 5-6 people who get it.
                    Meet monthly, share wins, cover blind spots.
                    {' '}<span className={styles.jokeInline}>{timelineJokes[2]}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.totalTime}>
            <span className={styles.totalIcon}>⏱</span>
            <span>2 hours. That's it. Then go survive the future.</span>
          </div>
        </div>
      </section>

      {/* ── AI makes everyone expert ── */}
      <section className={styles.expertSection}>
        <div className={styles.sectionInner}>
          <h2 className={styles.expertHeadline}>
            AI is making <em>anyone</em> expert at <em>anything</em>.
          </h2>
          <p className={styles.expertSub}>We're just getting started.</p>

          <RollingExperts />

          <p className={styles.expertBody}>
            The rules changed. A designer ships code. A chef launches a SaaS.
            A 16-year-old builds what used to take a funded team.
            The only question is: are you in the room where it happens,
            or reading about it 6 months later?
          </p>
        </div>
      </section>

      {/* ── The Collider ── */}
      <section id="after" className={styles.colliderSection}>
        <div className={styles.sectionInner}>
          <RocketIcon />
          <h2 className={styles.sectionTitle}>The 1-Week Collider</h2>
          <p className={styles.sectionSubtitle}>
            Friday to Friday. The most intense week of your founder life.
          </p>

          {/* The insight */}
          <div className={styles.colliderInsight}>
            <p className={styles.colliderLead}>
              AI created a new species: the <strong>solo founder</strong>.
            </p>
            <p className={styles.colliderBody}>
              One person, one laptop, shipping what used to take a team of ten.
              They move faster than anyone. They start before they have a pitch deck.
              VCs haven't caught up — they still want co-founders, traction decks, and 6-month timelines.
            </p>
            <p className={styles.colliderBody}>
              We call this stage <strong className={styles.inceptionBadge}>Inception</strong> — it's
              better than pre-pre-seed, and it deserves its own playbook.
            </p>
          </div>

          {/* The deal */}
          <div className={styles.colliderDeal}>
            <h3 className={styles.colliderDealTitle}>The Deal</h3>
            <div className={styles.colliderSteps}>
              <div className={styles.colliderStep}>
                <span className={styles.colliderStepNum}>1</span>
                <p>Show up. Be the best. One week, all in.</p>
              </div>
              <div className={styles.colliderStep}>
                <span className={styles.colliderStepNum}>2</span>
                <p>We invest <strong className={styles.investAmount}>$25K</strong> in the top founders.
                  {' '}<span className={styles.jokeInline}>(don't spend it all on Mac minis!)</span></p>
              </div>
              <div className={styles.colliderStep}>
                <span className={styles.colliderStepNum}>3</span>
                <p>Share your data. Plug into the <strong>Data Stream</strong>.</p>
              </div>
            </div>
          </div>

          {/* The vision */}
          <div className={styles.colliderVision}>
            <h3 className={styles.colliderVisionTitle}>The Vision</h3>
            <p className={styles.colliderBody}>
              A world where AI replaces all VCs. No pitch meetings. No warm intros.
              No "let me get back to you." Just your Data Stream — the real-time pulse
              of your company — doing the talking for you.
            </p>
            <p className={styles.colliderBody}>
              Series A? Public offering? Strategic partner?
              Plug in your stream. The data does the fundraising.
              We're building toward that future. The Collider is step one.
            </p>
            <p className={styles.colliderPunchline}>
              Skynet for fundraising. But, like, the good version. 🤖
            </p>
          </div>

          <p className={styles.endorsedBy}>Endorsed by <strong>2035.vc</strong></p>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaSectionGlow} />
        <h2 className={styles.ctaHeadline}>
          AI is the grounding agent.<br />
          <span className={styles.accentText}>Be ready before everyone else.</span>
        </h2>
        <p className={styles.ctaSubline}>
          Run a 2035Cafe in your city. We give you the playbook, the content, and the community.
          You bring the coffee. Or the beers. Or a zombie costume, we won't judge.
        </p>
        <div className={styles.ctaRow}>
          <Link to="/apply" className={styles.ctaPrimary}>
            Apply to organize
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className={styles.footer}>
        <span className={styles.footerBrand}>☕ 2035Cafe</span>
        <span className={styles.footerMotto}>Stock Cans or Vibe Code. We Vibe Code.</span>
        <span className={styles.footerTagline}>Grassroots rebuild. Compress or die.</span>
      </footer>
    </div>
  );
}
