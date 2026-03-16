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
          <h1 className={styles.headline}>
            <span className={styles.brandName}>2035Cafe</span>
            <span className={styles.tagline}>Fear Nothing, Build Anything.</span>
          </h1>
          <p className={styles.heroMission}>
            A community recalibrating for what&rsquo;s coming.
            We believe everyone can be a builder now &mdash; and we&rsquo;re here
            to help you get inspired, meet your people, and start building.
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
              <h3 className={styles.beliefTitle}>Everyone is a builder now</h3>
              <p className={styles.beliefDesc}>
                AI erased the barriers. A designer ships code. A chef launches a startup.
                A 16-year-old builds what used to take a funded team. The only thing left is showing up.
              </p>
            </div>
            <div className={styles.beliefCard}>
              <h3 className={styles.beliefTitle}>Recalibrate for 2035</h3>
              <p className={styles.beliefDesc}>
                The world is changing faster than anyone expected.
                We&rsquo;re not doomers &mdash; we&rsquo;re builders who believe the future is worth preparing for,
                before everyone else.
              </p>
            </div>
            <div className={styles.beliefCard}>
              <h3 className={styles.beliefTitle}>More ambitious, more fun</h3>
              <p className={styles.beliefDesc}>
                We&rsquo;re rethinking the startup community. Less pitch decks,
                more building. Less gatekeeping, more shipping.
                And way more fun.
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
              <span className={styles.actNum}>01</span>
              <h3 className={styles.actName}>White Mirror</h3>
              <p className={styles.actMeta}>15 min &middot; Get inspired</p>
              <p className={styles.actDesc}>
                Sci-fi stories about 2035 &mdash; like Black Mirror, but things go right.
                20 auto-advancing slides or a 5-min AI film. Raw, vivid, hopeful.
              </p>
            </div>
            <div className={`${styles.actCard} ${styles.actAmber}`}>
              <span className={`${styles.actNum} ${styles.numAmber}`}>02</span>
              <h3 className={styles.actName}>Startup Microdosing</h3>
              <p className={styles.actMeta}>60 min &middot; Build something</p>
              <p className={styles.actDesc}>
                Idea to launch, live. Build with AI mentoring.
                First-timers ship their first thing. Veterans compete to ship fastest.
              </p>
            </div>
            <div className={`${styles.actCard} ${styles.actGreen}`}>
              <span className={`${styles.actNum} ${styles.numGreen}`}>03</span>
              <h3 className={styles.actName}>Builder Circle</h3>
              <p className={styles.actMeta}>45 min &middot; Find your crew</p>
              <p className={styles.actDesc}>
                Form your tribe &mdash; 5-6 people who get it.
                Meet monthly, share wins, cover blind spots. Your long-lasting builder network.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── The Collider ── */}
      <section id="collider" className={styles.section}>
        <div className={styles.inner}>
          <p className={styles.ventureTag}>2035.vc &mdash; our venture arm</p>
          <h2 className={styles.sectionTitle}>The 7-Day Collider</h2>
          <p className={styles.sectionSub}>
            The fastest startup program ever built.
            From nothing to launch in 7 days with p2p human and AI mentoring.
            The best solo founders get <strong className={styles.investAmount}>$25K</strong>.
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
              <p>One week, all in. Build with your peers and AI. Best founders get <strong>funded</strong>.</p>
            </div>
          </div>

          <p className={styles.colliderVision}>
            VC is a tool. At some point money won&rsquo;t matter &mdash; but while it does,
            we invest in the best solo founders out there. Our mission: rethink the startup
            community for 2035 and make it a lot more ambitious and fun.
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
        <span className={styles.footerBrand}>☕ 2035Cafe</span>
        <span className={styles.footerMotto}>Fear Nothing, Build Anything.</span>
        <Link to="/admin" className={styles.footerLink}>Login</Link>
      </footer>
    </div>
  );
}
