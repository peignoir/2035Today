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

/* ── Reusable pixel character builder ── */
function PixelPerson({ hairColor, shirtColor, flip, className }: {
  hairColor: string; shirtColor: string; flip?: boolean; className?: string;
}) {
  const S = 4;
  const px = (x: number, y: number, fill: string) => (
    <rect key={`${x}-${y}`} x={x * S} y={y * S} width={S} height={S} fill={fill} shapeRendering="crispEdges" />
  );
  return (
    <svg viewBox="0 0 28 44" className={className || styles.pixelPerson}
      style={{ imageRendering: 'pixelated', transform: flip ? 'scaleX(-1)' : undefined }} aria-hidden="true">
      {/* Hair */}
      {px(2, 0, hairColor)}{px(3, 0, hairColor)}{px(4, 0, hairColor)}
      {/* Face */}
      {px(2, 1, '#EEEEEE')}{px(3, 1, '#EEEEEE')}{px(4, 1, '#EEEEEE')}
      {/* Eyes */}
      {px(2, 1, '#0D0F0E')}{px(4, 1, '#0D0F0E')}
      {/* Torso */}
      {px(3, 2, shirtColor)}
      {px(2, 3, shirtColor)}{px(3, 3, shirtColor)}{px(4, 3, shirtColor)}
      {/* Arms */}
      {px(1, 2, '#EEEEEE')}{px(5, 2, '#EEEEEE')}
      {/* Legs */}
      {px(2, 4, '#445544')}{px(4, 4, '#445544')}
      {/* Feet */}
      {px(1, 5, '#778877')}{px(2, 5, '#778877')}{px(4, 5, '#778877')}{px(5, 5, '#778877')}
    </svg>
  );
}

/* ── Logo SVG — horizontal pixel rocket with rider on top ── */
function LogoSVG() {
  const S = 4;
  const px = (x: number, y: number, fill: string, o = 1) => (
    <rect key={`${x}-${y}-${fill}`} x={x * S} y={y * S} width={S} height={S} fill={fill} opacity={o} shapeRendering="crispEdges" />
  );

  return (
    <svg viewBox="80 -2 120 68" className={styles.heroIcon} aria-hidden="true" style={{ imageRendering: 'pixelated', overflow: 'visible' }}>
      <defs>
        <linearGradient id="trailGrad" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0%" stopColor="#FF6B4A" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#FFE66D" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#44FF88" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="fadeMask" cx="0.55" cy="0.45" rx="0.5" ry="0.5">
          <stop offset="40%" stopColor="white" stopOpacity="1" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <mask id="edgeFade">
          <rect x="60" y="-20" width="160" height="100" fill="url(#fadeMask)" />
        </mask>
      </defs>

      <g mask="url(#edgeFade)">
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
        <rect x="0" y="10" width="3" height="3" fill="#44FF88" opacity="0.6" shapeRendering="crispEdges">
          <animate attributeName="x" values="210;-10" dur="0.75s" repeatCount="indefinite" />
        </rect>
        <rect x="0" y="42" width="3" height="3" fill="#FFE66D" opacity="0.5" shapeRendering="crispEdges">
          <animate attributeName="x" values="220;-10" dur="0.9s" repeatCount="indefinite" />
        </rect>
        <rect x="0" y="55" width="3" height="3" fill="#FF6B4A" opacity="0.4" shapeRendering="crispEdges">
          <animate attributeName="x" values="200;-10" dur="1.1s" repeatCount="indefinite" />
        </rect>
      </g>

      {/* ── Rocket (no rider) — light, clean ── */}
      <g opacity="0.75">
        <animateTransform attributeName="transform" type="translate"
          values="0,0; 0.4,-0.4; -0.3,0.3; 0.2,-0.2; 0,0" dur="0.22s" repeatCount="indefinite" />

        {/* Rocket body */}
        {px(37, 9, '#EEEEEE')}
        {px(36, 8, '#EEEEEE')}{px(36, 9, '#DDDDDD')}{px(36, 10, '#EEEEEE')}
        {px(35, 7, '#EEEEEE')}{px(35, 8, '#CCCCCC')}{px(35, 9, '#CCCCCC')}{px(35, 10, '#CCCCCC')}{px(35, 11, '#EEEEEE')}
        {px(34, 7, '#EEEEEE')}{px(34, 8, '#4ECDC4')}{px(34, 9, '#44FF88')}{px(34, 10, '#4ECDC4')}{px(34, 11, '#EEEEEE')}
        {px(33, 7, '#EEEEEE')}{px(33, 8, '#CCCCCC')}{px(33, 9, '#CCCCCC')}{px(33, 10, '#CCCCCC')}{px(33, 11, '#EEEEEE')}
        {px(32, 7, '#EEEEEE')}{px(32, 8, '#CCCCCC')}{px(32, 9, '#CCCCCC')}{px(32, 10, '#CCCCCC')}{px(32, 11, '#EEEEEE')}
        {px(31, 7, '#EEEEEE')}{px(31, 8, '#CCCCCC')}{px(31, 9, '#CCCCCC')}{px(31, 10, '#CCCCCC')}{px(31, 11, '#EEEEEE')}
        {px(30, 7, '#EEEEEE')}{px(30, 8, '#CCCCCC')}{px(30, 9, '#CCCCCC')}{px(30, 10, '#CCCCCC')}{px(30, 11, '#EEEEEE')}
        {px(29, 7, '#EEEEEE')}{px(29, 8, '#CCCCCC')}{px(29, 9, '#CCCCCC')}{px(29, 10, '#CCCCCC')}{px(29, 11, '#EEEEEE')}
        {/* Fins */}
        {px(29, 6, '#FF6B4A')}{px(30, 6, '#FF6B4A')}
        {px(28, 5, '#FF6B4A')}{px(29, 5, '#FF6B4A')}
        {px(29, 12, '#FF6B4A')}{px(30, 12, '#FF6B4A')}
        {px(28, 13, '#FF6B4A')}{px(29, 13, '#FF6B4A')}

        {/* Exhaust flame */}
        <g>
          {px(28, 8, '#FFE66D')}{px(28, 9, '#FFE66D')}{px(28, 10, '#FFE66D')}
          {px(27, 7, '#FF6B4A')}{px(27, 8, '#FFE66D')}{px(27, 9, '#FFFFFF')}{px(27, 10, '#FFE66D')}{px(27, 11, '#FF6B4A')}
          {px(26, 8, '#FF6B4A')}{px(26, 9, '#FFE66D')}{px(26, 10, '#FF6B4A')}
          {px(25, 9, '#FF6B4A')}
          <animate attributeName="opacity" values="1;0.5;1" dur="0.1s" repeatCount="indefinite" />
        </g>
        <g>
          {px(26, 7, '#FF6B4A', 0.6)}{px(26, 11, '#FF6B4A', 0.6)}
          {px(25, 8, '#FF6B4A', 0.4)}{px(25, 10, '#FF6B4A', 0.4)}
          {px(24, 9, '#FF6B4A', 0.2)}
          <animate attributeName="opacity" values="0.6;0.1;0.6" dur="0.08s" repeatCount="indefinite" />
        </g>

        {/* Exhaust trail */}
        <rect x="0" y="34" width="96" height="8" fill="url(#trailGrad)" opacity="0.25" rx="1">
          <animate attributeName="opacity" values="0.25;0.08;0.25" dur="0.2s" repeatCount="indefinite" />
        </rect>
      </g>

      {/* ── Mini pixel robot floating nearby — subtle ── */}
      <g opacity="0.5">
        <animateTransform attributeName="transform" type="translate"
          values="0,0; 0,-2; 0,0; 0,2; 0,0" dur="2s" repeatCount="indefinite" />
        {/* Robot head */}
        {px(39, 4, '#4ECDC4')}{px(40, 4, '#4ECDC4')}{px(41, 4, '#4ECDC4')}
        {px(39, 5, '#4ECDC4')}{px(40, 5, '#44FF88')}{px(41, 5, '#4ECDC4')}
        {/* Eyes */}
        {px(39, 5, '#0D0F0E')}{px(41, 5, '#0D0F0E')}
        {/* Antenna */}
        {px(40, 3, '#44FF88')}
        {/* Body */}
        {px(39, 6, '#778877')}{px(40, 6, '#778877')}{px(41, 6, '#778877')}
        {/* Arms */}
        {px(38, 6, '#778877')}{px(42, 6, '#778877')}
      </g>
    </svg>
  );
}

function formatEventDate(dateStr: string): string {
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch { return dateStr; }
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
            <span className={styles.tagline}>The future starts as a <span className={styles.flicker}>solo project.</span></span>
          </h1>
          <p className={styles.heroSub}>The community where solo founders build together</p>
          <div className={styles.ctaRow}>
            <button onClick={() => scrollTo('cities')} className={styles.ctaPrimary}>
              Find a Solo Jam
            </button>
            <Link to="/soloha" className={styles.ctaGhost}>
              Join the next One Week HA Free Program
            </Link>
          </div>
        </div>
      </section>

      {/* ── The Solo Founder Journey — side-by-side overview ── */}
      <section id="journey" className={styles.section}>
        <div className={styles.inner}>
          <h2 className={styles.sectionTitle}>The Solo Founder Journey</h2>
          <p className={styles.journeyMeta}>Two products &mdash; every month &mdash; 10x faster</p>
          <p className={styles.sectionSub}>
            What used to take months now takes <strong className={styles.greenText}>2 hours + 1 week.</strong>
          </p>
          <p className={styles.journeySubMeta}>
            A light, powerful engine. Running every month. Scaling to run even more.
          </p>

          {/* 1 → 2 cards */}
          <div className={styles.journeyGrid}>
            {/* Step 1 */}
            <div className={styles.journeyCard}>
              <span className={styles.journeyNum} style={{ borderColor: '#44FF88', color: '#44FF88' }}>1</span>
              <div className={styles.journeyCardInner} style={{ borderTopColor: '#44FF88' }}>
                <div className={styles.journeyCardHeader}>
                  <h3 className={`${styles.productTitle} ${styles.greenText}`} style={{ fontSize: '2rem' }}>Solo Jam</h3>
                  <span className={`${styles.productBadge} ${styles.greenBadge}`}>Offline &middot; Local</span>
                </div>
                <span className={styles.journeyLabel}>Get Inspired</span>
                <span className={styles.journeyDuration} style={{ color: '#44FF88' }}>2h event</span>
                <p className={styles.journeyDesc}>
                  Volunteer speakers share visions of 2035. 20 cities globally.
                  Universities, coworking spaces. Meet your people.
                </p>
                <div className={styles.journeyPeople}>
                  <PixelPerson hairColor="#44FF88" shirtColor="#4ECDC4" />
                  <PixelPerson hairColor="#FF6B4A" shirtColor="#FFE66D" />
                </div>
              </div>
            </div>

            {/* Arrow */}
            <div className={styles.journeyArrow}>&rarr;</div>

            {/* Step 2 */}
            <div className={styles.journeyCard}>
              <span className={styles.journeyNum} style={{ borderColor: '#4ECDC4', color: '#4ECDC4' }}>2</span>
              <div className={styles.journeyCardInner} style={{ borderTopColor: '#4ECDC4' }}>
                <div className={styles.journeyCardHeader}>
                  <h3 className={`${styles.productTitle} ${styles.tealText}`} style={{ fontSize: '2rem' }}>Solo HA</h3>
                  <span className={`${styles.productBadge} ${styles.tealBadge}`}>Online</span>
                </div>
                <span className={styles.journeyLabel}>Build &amp; Connect</span>
                <span className={styles.journeyDuration} style={{ color: '#4ECDC4' }}>1 week</span>
                <p className={styles.journeyDesc}>
                  Gamified web app for founders who want to go deeper.
                  AI-scored. From idea to investable signal.
                </p>
                <div className={styles.journeyPeople}>
                  <PixelPerson hairColor="#4ECDC4" shirtColor="#44FF88" />
                  <PixelPerson hairColor="#FFE66D" shirtColor="#FF6B4A" flip />
                </div>
              </div>
            </div>
          </div>

          <p className={styles.terminalLine}>&gt; 1M+ solo founder startups globally by 2035_</p>
        </div>
      </section>

      {/* ── Solo Jam detail ── */}
      <section id="solojam" className={styles.section}>
        <div className={styles.inner}>
          <div className={styles.productHeader}>
            <h2 className={`${styles.productTitle} ${styles.orangeText}`}>Solo Jam</h2>
            <span className={`${styles.productBadge} ${styles.orangeBadge}`}>Offline &middot; In your city</span>
          </div>
          <p className={styles.productTagline}>2 hours that change everything.</p>

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
                <span className={styles.actTime}>20 min</span>
              </div>
              <h3 className={styles.actName} style={{ color: '#44FF88' }}>AI Prepper Stories</h3>
              <p className={styles.actDesc}>
                5-minute talks about the world in 2035.
                Volunteer speakers from past events,
                curated by local organizers.
              </p>
              <div className={styles.actPeople}>
                <PixelPerson hairColor="#44FF88" shirtColor="#778877" className={styles.pixelPersonSmall} />
              </div>
            </div>
            <div className={styles.actCard}>
              <div className={styles.actHeader}>
                <span className={styles.actNum} style={{ color: '#FF6B4A' }}>2</span>
                <span className={styles.actTime}>20 min</span>
              </div>
              <h3 className={styles.actName} style={{ color: '#FF6B4A' }}>Vibe Pitch</h3>
              <p className={styles.actDesc}>
                Connect your bio, idea, or not &mdash; you&rsquo;re in!
                Raw, real, no polish.
                Just show up and the energy does the rest.
              </p>
              <div className={styles.actPeople}>
                <PixelPerson hairColor="#FF6B4A" shirtColor="#FFE66D" className={styles.pixelPersonSmall} />
              </div>
            </div>
            <div className={styles.actCard}>
              <div className={styles.actHeader}>
                <span className={styles.actNum} style={{ color: '#FFE66D' }}>3</span>
                <span className={styles.actTime}>80 min</span>
              </div>
              <h3 className={styles.actName} style={{ color: '#FFE66D' }}>Meet &amp; Collide</h3>
              <p className={styles.actDesc}>
                The mixer. Find your people.
                Collide with ideas you didn&rsquo;t know you needed.
              </p>
              <div className={styles.actPeople}>
                <PixelPerson hairColor="#FFE66D" shirtColor="#4ECDC4" className={styles.pixelPersonSmall} />
                <PixelPerson hairColor="#4ECDC4" shirtColor="#FF6B4A" flip className={styles.pixelPersonSmall} />
              </div>
            </div>
          </div>

          <p className={styles.actFootnote}>
            That&rsquo;s it. 2 hours. Then go build the future.
          </p>
        </div>
      </section>

      {/* ── Solo HA detail ── */}
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
          <p className={styles.sectionSubDim}>
            Post-AGI. On the way to ASI.
            One person with AI agents will build what teams of 50 couldn&rsquo;t.
            We&rsquo;re the AI preppers &mdash; the builder kind.
          </p>
          <p className={styles.terminalLine}>&gt; the startup world needs to catch up_</p>
        </div>
      </section>

      {/* ── 2035.VC ── */}
      <section id="vc" className={styles.section}>
        <div className={styles.inner}>
          <h2 className={styles.sectionTitle}>2035.VC</h2>
          <p className={styles.productTagline}>VC, reinvented for the AI era.</p>
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
                          {ev.logo && <img src={ev.logo} alt={ev.name} className={styles.cityLogo} />}
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
                            {ev.logo && <img src={ev.logo} alt={ev.name} className={styles.cityLogo} />}
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
                  <p className={styles.emptyState}>No public events yet, be the first!</p>
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
          <span className={styles.accentText}>The future starts as a solo project.</span>
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
        <div className={styles.finalPeople}>
          <PixelPerson hairColor="#44FF88" shirtColor="#FF6B4A" />
          <PixelPerson hairColor="#4ECDC4" shirtColor="#FFE66D" flip />
          <PixelPerson hairColor="#FF6B4A" shirtColor="#44FF88" />
          <PixelPerson hairColor="#FFE66D" shirtColor="#4ECDC4" flip />
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className={styles.footer}>
        <span className={styles.footerBrand}>2035 Today</span>
        <span className={styles.footerMotto}>The community where solo founders build together</span>
        <span className={styles.footerVibe}>Vibe coded by Franck Nouyrigat</span>
        <Link to="/admin" className={styles.footerLink}>Login</Link>
      </footer>
    </div>
  );
}
