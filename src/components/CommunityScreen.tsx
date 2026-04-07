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
  { text: 'A teacher reinventing education', color: '#44FF88' },
  { text: 'A sci-fi writer imagining 2035', color: '#4ECDC4' },
  { text: 'A solo founder obsessed with product', color: '#FF6B4A' },
  { text: 'A teenager building a robot', color: '#FFE66D' },
  { text: 'A chef launching a food app', color: '#44FF88' },
  { text: 'A musician making AI instruments', color: '#4ECDC4' },
  { text: 'A nurse automating paperwork', color: '#FF6B4A' },
  { text: 'A retiree building for fun', color: '#FFE66D' },
  { text: 'A designer who ships code', color: '#44FF88' },
  { text: 'An architect rethinking cities', color: '#4ECDC4' },
  { text: 'A farmer optimizing harvests', color: '#FF6B4A' },
  { text: 'A parent building a kids\' app', color: '#FFE66D' },
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

/* ── Logo SVG — horizontal pixel rocket with rider on top ── */
function LogoSVG() {
  const S = 4; // pixel size
  const px = (x: number, y: number, fill: string, o = 1) => (
    <rect key={`${x}-${y}-${fill}`} x={x * S} y={y * S} width={S} height={S} fill={fill} opacity={o} shapeRendering="crispEdges" />
  );

  return (
    <svg viewBox="80 -2 120 68" className={styles.heroIcon} aria-hidden="true" style={{ imageRendering: 'pixelated' }}>
      <defs>
        <linearGradient id="trailGrad" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0%" stopColor="#FF6B4A" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#FFE66D" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#44FF88" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* ── Speed lines streaking left (horizontal) ── */}
      <rect x="0" y="18" width="14" height="1.5" fill="#44FF88" opacity="0.45">
        <animate attributeName="x" values="200;-20" dur="0.5s" repeatCount="indefinite" />
      </rect>
      <rect x="0" y="32" width="10" height="1.5" fill="#4ECDC4" opacity="0.3">
        <animate attributeName="x" values="210;-15" dur="0.65s" repeatCount="indefinite" />
      </rect>
      <rect x="0" y="48" width="12" height="1.5" fill="#44FF88" opacity="0.4">
        <animate attributeName="x" values="205;-18" dur="0.55s" repeatCount="indefinite" />
      </rect>
      <rect x="0" y="60" width="8" height="1.5" fill="#778877" opacity="0.25">
        <animate attributeName="x" values="195;-12" dur="0.4s" repeatCount="indefinite" />
      </rect>

      {/* ── Pixel stars streaking left ── */}
      <rect x="0" y="10" width="3" height="3" fill="#44FF88" opacity="0.6" shapeRendering="crispEdges">
        <animate attributeName="x" values="210;-10" dur="0.75s" repeatCount="indefinite" />
      </rect>
      <rect x="0" y="42" width="3" height="3" fill="#FFE66D" opacity="0.5" shapeRendering="crispEdges">
        <animate attributeName="x" values="220;-10" dur="0.9s" repeatCount="indefinite" />
      </rect>
      <rect x="0" y="55" width="3" height="3" fill="#FF6B4A" opacity="0.4" shapeRendering="crispEdges">
        <animate attributeName="x" values="200;-10" dur="1.1s" repeatCount="indefinite" />
      </rect>

      {/* ── Rocket + rider group — shakes ── */}
      <g>
        <animateTransform
          attributeName="transform"
          type="translate"
          values="0,0; 0.5,-0.6; -0.3,0.5; 0.4,-0.3; 0,0"
          dur="0.18s"
          repeatCount="indefinite"
        />

        {/* ── HORIZONTAL ROCKET (nose pointing right) ── */}
        {/* Nose cone — rightmost */}
        {px(37, 9, '#EEEEEE')}
        {px(36, 8, '#EEEEEE')}{px(36, 9, '#DDDDDD')}{px(36, 10, '#EEEEEE')}

        {/* Hull */}
        {px(35, 7, '#EEEEEE')}{px(35, 8, '#CCCCCC')}{px(35, 9, '#CCCCCC')}{px(35, 10, '#CCCCCC')}{px(35, 11, '#EEEEEE')}
        {/* Window stripe */}
        {px(34, 7, '#EEEEEE')}{px(34, 8, '#4ECDC4')}{px(34, 9, '#44FF88')}{px(34, 10, '#4ECDC4')}{px(34, 11, '#EEEEEE')}
        {/* More hull */}
        {px(33, 7, '#EEEEEE')}{px(33, 8, '#CCCCCC')}{px(33, 9, '#CCCCCC')}{px(33, 10, '#CCCCCC')}{px(33, 11, '#EEEEEE')}
        {px(32, 7, '#EEEEEE')}{px(32, 8, '#CCCCCC')}{px(32, 9, '#CCCCCC')}{px(32, 10, '#CCCCCC')}{px(32, 11, '#EEEEEE')}
        {px(31, 7, '#EEEEEE')}{px(31, 8, '#CCCCCC')}{px(31, 9, '#CCCCCC')}{px(31, 10, '#CCCCCC')}{px(31, 11, '#EEEEEE')}
        {px(30, 7, '#EEEEEE')}{px(30, 8, '#CCCCCC')}{px(30, 9, '#CCCCCC')}{px(30, 10, '#CCCCCC')}{px(30, 11, '#EEEEEE')}

        {/* Tail */}
        {px(29, 7, '#EEEEEE')}{px(29, 8, '#CCCCCC')}{px(29, 9, '#CCCCCC')}{px(29, 10, '#CCCCCC')}{px(29, 11, '#EEEEEE')}

        {/* Fins (top and bottom) */}
        {px(29, 6, '#FF6B4A')}{px(30, 6, '#FF6B4A')}
        {px(28, 5, '#FF6B4A')}{px(29, 5, '#FF6B4A')}
        {px(29, 12, '#FF6B4A')}{px(30, 12, '#FF6B4A')}
        {px(28, 13, '#FF6B4A')}{px(29, 13, '#FF6B4A')}

        {/* ── Exhaust flame (left of rocket, horizontal) ── */}
        <g>
          {px(28, 8, '#FFE66D')}{px(28, 9, '#FFE66D')}{px(28, 10, '#FFE66D')}
          {px(27, 7, '#FF6B4A')}{px(27, 8, '#FFE66D')}{px(27, 9, '#FFFFFF')}{px(27, 10, '#FFE66D')}{px(27, 11, '#FF6B4A')}
          {px(26, 8, '#FF6B4A')}{px(26, 9, '#FFE66D')}{px(26, 10, '#FF6B4A')}
          {px(25, 9, '#FF6B4A')}
          <animate attributeName="opacity" values="1;0.5;1" dur="0.1s" repeatCount="indefinite" />
        </g>
        <g>
          {px(26, 7, '#FF6B4A', 0.7)}{px(26, 11, '#FF6B4A', 0.7)}
          {px(25, 8, '#FF6B4A', 0.5)}{px(25, 10, '#FF6B4A', 0.5)}
          {px(24, 9, '#FF6B4A', 0.3)}
          {px(24, 8, '#FF6B4A', 0.2)}{px(24, 10, '#FF6B4A', 0.2)}
          <animate attributeName="opacity" values="0.7;0.15;0.7" dur="0.08s" repeatCount="indefinite" />
        </g>

        {/* ── Exhaust trail (long, fading left) ── */}
        <rect x="0" y="34" width="96" height="8" fill="url(#trailGrad)" opacity="0.35" rx="1">
          <animate attributeName="opacity" values="0.35;0.12;0.35" dur="0.2s" repeatCount="indefinite" />
        </rect>

        {/* ── Pixel person sitting on top ── */}
        {/* Legs dangling on sides of rocket */}
        {px(32, 6, '#EEEEEE')}{px(34, 6, '#EEEEEE')}
        {/* Body / torso on top of hull */}
        {px(33, 5, '#FF6B4A')}
        {px(32, 4, '#FF6B4A')}{px(33, 4, '#FF6B4A')}{px(34, 4, '#FF6B4A')}
        {/* Arms — one forward, one up */}
        {px(35, 3, '#EEEEEE')}{px(36, 2, '#EEEEEE')}
        {px(31, 3, '#EEEEEE')}{px(30, 2, '#EEEEEE')}
        {/* Head */}
        {px(32, 3, '#EEEEEE')}{px(33, 3, '#EEEEEE')}{px(34, 3, '#EEEEEE')}
        {/* Eyes (looking forward = right) */}
        {px(34, 3, '#0D0F0E')}
        {/* Green hair blowing back */}
        {px(31, 2, '#44FF88')}{px(32, 2, '#44FF88')}{px(33, 2, '#44FF88')}{px(34, 2, '#44FF88')}
        {px(30, 1, '#44FF88')}{px(31, 1, '#44FF88')}
      </g>
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
          <LogoSVG />
          <h1 className={styles.headline}>
            <span className={styles.brandName}>2035 Today</span>
            <span className={styles.tagline}>What was impossible is now a <span className={styles.flicker}>solo project.</span></span>
          </h1>
          <p className={styles.heroSub}>the global solo founders community</p>
          <p className={styles.heroMission}>
            Post-AGI. On the way to ASI.
            One person with AI agents will build what teams of 50 couldn&rsquo;t.
            We&rsquo;re the AI preppers &mdash; the builder kind.
          </p>
          <div className={styles.ctaRow}>
            <button onClick={() => scrollTo('cities')} className={styles.ctaPrimary}>
              Find a Solo Jam
            </button>
            <button onClick={() => scrollTo('solojam')} className={styles.ctaGhost}>
              How it works &darr;
            </button>
          </div>
        </div>
      </section>

      {/* ── Beliefs ── */}
      <section className={styles.beliefs}>
        <div className={styles.inner}>
          <h2 className={styles.sectionTitle}>2035 is coming fast. We need to get ready.</h2>
          <div className={styles.beliefGrid}>
            <div className={styles.beliefCard}>
              <span className={styles.beliefEmoji}>&#x1f9d1;&#x200d;&#x1f4bb;</span>
              <h3 className={styles.beliefTitle}>Solo is the new startup</h3>
              <p className={styles.beliefDesc}>
                AI made everyone a builder. A designer ships code.
                A chef launches a startup. <strong>It takes only a week to get started.</strong>
              </p>
            </div>
            <div className={styles.beliefCard}>
              <span className={styles.beliefEmoji}>&#x1f680;</span>
              <h3 className={styles.beliefTitle}>1M+ solo founders by 2035</h3>
              <p className={styles.beliefDesc}>
                10x founders. 10x the economy. 10x faster to build, to ship, to learn.
                We believe <strong>abundance is coming</strong>, and we want to help get us there.
              </p>
            </div>
            <div className={styles.beliefCard}>
              <span className={styles.beliefEmoji}>&#x1f916;</span>
              <h3 className={styles.beliefTitle}>AI-friendly by design</h3>
              <p className={styles.beliefDesc}>
                We believe sharing data with AI is key. Sessions are recorded.
                We use it to give you <strong>better intros, better direction, better matches</strong>.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Solo Jam ── */}
      <section id="solojam" className={styles.section}>
        <div className={styles.inner}>
          <div className={styles.productHeader}>
            <h2 className={`${styles.productTitle} ${styles.orangeText}`}>Solo Jam</h2>
            <span className={`${styles.productBadge} ${styles.orangeBadge}`}>Offline &middot; In your city</span>
          </div>
          <p className={styles.productTagline}>2 hours that change everything.</p>
          <p className={styles.sectionSub}>
            What used to take months now takes 2 hours + 1 week.
            A light, powerful engine. Running every month. Scaling globally.
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
                <span className={styles.actNum} style={{ color: '#44FF88' }}>1</span>
                <span className={styles.actTime}>45 min</span>
              </div>
              <h3 className={styles.actName} style={{ color: '#44FF88' }}>AI Prepper Stories</h3>
              <p className={styles.actDesc}>
                5-minute talks about the world in 2035.
                Volunteer speakers from past events,
                curated by local organizers.
              </p>
            </div>
            <div className={styles.actCard}>
              <div className={styles.actHeader}>
                <span className={styles.actNum} style={{ color: '#FF6B4A' }}>2</span>
                <span className={styles.actTime}>30 min</span>
              </div>
              <h3 className={styles.actName} style={{ color: '#FF6B4A' }}>Vibe Launch</h3>
              <p className={styles.actDesc}>
                Solo founders pitch what they&rsquo;re working on.
                Raw, real, no polish.
                Just the idea and the energy.
              </p>
            </div>
            <div className={styles.actCard}>
              <div className={styles.actHeader}>
                <span className={styles.actNum} style={{ color: '#FFE66D' }}>3</span>
                <span className={styles.actTime}>45 min</span>
              </div>
              <h3 className={styles.actName} style={{ color: '#FFE66D' }}>Meet &amp; Collide</h3>
              <p className={styles.actDesc}>
                The mixer. Find your people.
                Collide with ideas you didn&rsquo;t know you needed.
              </p>
            </div>
          </div>

          <p className={styles.actFootnote}>
            That&rsquo;s it. 2 hours. Then go build the future.
          </p>
        </div>
      </section>

      {/* ── Solo HA ── */}
      <section id="soloha" className={styles.section}>
        <div className={styles.inner}>
          <div className={styles.productHeader}>
            <h2 className={`${styles.productTitle} ${styles.tealText}`}>Solo HA</h2>
            <span className={`${styles.productBadge} ${styles.tealBadge}`}>Online</span>
          </div>
          <p className={styles.productSubtitle}>Hyper Accelerator</p>
          <p className={`${styles.productTagline} ${styles.tealText}`}>At the speed of AI.</p>
          <p className={styles.sectionSub}>
            One week. Every month. A gamified web app.
            AI-scored and tracked. For founders who want to go deeper.
            From idea to investable signal.
          </p>
          <p className={styles.terminalLine}>&gt; the startup world needs to catch up_</p>
        </div>
      </section>

      {/* ── 2035.VC ── */}
      <section id="vc" className={styles.section}>
        <div className={styles.inner}>
          <h2 className={styles.sectionTitle}>2035.VC</h2>
          <p className={`${styles.productTagline}`}>VC, reinvented for the AI era.</p>
          <p className={styles.sectionSub}>
            Why would you invest in an old-type VC fund if you believe the next 10 years
            will change how we invest and launch startups?
          </p>

          <div className={styles.vcGrid}>
            <div className={styles.vcCard}>
              <h3 className={styles.vcTitle} style={{ color: '#FF6B4A' }}>Micro Investment at AI Speed</h3>
              <p className={styles.vcDesc}>
                Score-triggered micro investments. AI due diligence at scale.
                Global founders, US-incorporated startups.
              </p>
            </div>
            <div className={styles.vcCard}>
              <h3 className={styles.vcTitle} style={{ color: '#4ECDC4' }}>Data Streams, not Data Rooms</h3>
              <p className={styles.vcDesc}>
                Real-time founder signals from the Solo Jam pipeline.
                Always-on deal flow. No PDFs in Dropbox.
              </p>
            </div>
            <div className={styles.vcCard}>
              <h3 className={styles.vcTitle} style={{ color: '#44FF88' }}>FSD for Investment</h3>
              <p className={styles.vcDesc}>
                Full Self-Driving diligence. AI scoring, tracking,
                and mentoring at scale. Humans for taste.
              </p>
            </div>
            <div className={styles.vcCard}>
              <h3 className={styles.vcTitle} style={{ color: '#FFE66D' }}>Serendipity &amp; Network Effects</h3>
              <p className={styles.vcDesc}>
                Unique LP interface maximizing serendipity and network effects
                across 120+ countries to increase liquidity.
              </p>
            </div>
          </div>

          <p className={styles.terminalLine}>&gt; ready to invest in the future of solo founders?_</p>
        </div>
      </section>

      {/* ── Cities ── */}
      <section id="cities" className={styles.citiesSection}>
        <div className={styles.inner}>
          <h2 className={styles.sectionTitle}>Find your city</h2>
          <p className={styles.sectionSub}>
            Join an upcoming Solo Jam or start one where you are.
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
          <span className={styles.accentText}>What was impossible is now a solo project.</span>
        </h2>
        <p className={styles.finalSub}>
          Join a Solo Jam near you, or start one in your city.
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
        <span className={styles.footerBrand}>2035 Today</span>
        <span className={styles.footerMotto}>the global solo founders community</span>
        <span className={styles.footerVibe}>Vibe coded by Franck Nouyrigat</span>
        <Link to="/admin" className={styles.footerLink}>Login</Link>
      </footer>
    </div>
  );
}
