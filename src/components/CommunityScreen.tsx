import { Link } from 'react-router-dom';
import styles from './CommunityScreen.module.css';

export function CommunityScreen() {
  return (
    <div className={styles.page}>
      {/* ── Nav ── */}
      <nav className={styles.topNav}>
        <Link to="/" className={styles.navBrand}>Cafe2035</Link>
        <div className={styles.navRight}>
          <a href="#what" className={styles.navLink}>What is this</a>
          <a href="#experience" className={styles.navLink}>The experience</a>
          <a href="#types" className={styles.navLink}>Founder types</a>
          <Link to="/apply" className={styles.navCta}>Organize in your city</Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.headline}>
            See <span className={styles.accent}>2035</span> before it arrives.
          </h1>
          <p className={styles.subhead}>
            Enter an open window into 2035 — a world where AI and robotics have reshaped how we work, learn, create, and live.
            Not a prediction. Not a trend report. <strong>A vision.</strong>
          </p>
          <div className={styles.ctaRow}>
            <Link to="/apply" className={styles.ctaPrimary}>
              Bring it to your city
            </Link>
            <a href="#experience" className={styles.ctaSecondary}>
              See how it works
            </a>
          </div>
        </div>
      </section>

      {/* ── What is Cafe2035 ── */}
      <section id="what" className={styles.section}>
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>
            The grassroots builder community for the AI-changed world.
          </h2>
          <p className={styles.sectionSubtitle}>
            Told in five-minute stories by the founders, artists, scientists, and builders who are making it real.
          </p>

          <div className={styles.beliefGrid}>
            <div className={styles.beliefCard}>
              <p className={styles.beliefNumber}>01</p>
              <h3 className={styles.beliefTitle}>100x founders exist.</h3>
              <p className={styles.beliefDesc}>
                A single founder with the right AI stack can now outbuild what took a team of ten. This is the new normal — not the exception.
              </p>
            </div>
            <div className={styles.beliefCard}>
              <p className={styles.beliefNumber}>02</p>
              <h3 className={styles.beliefTitle}>10x is the new baseline.</h3>
              <p className={styles.beliefDesc}>
                Whatever standard you set last year, the benchmark has shifted. If you're not compounding your leverage, you're already falling behind.
              </p>
            </div>
            <div className={styles.beliefCard}>
              <p className={styles.beliefNumber}>03</p>
              <h3 className={styles.beliefTitle}>Humans still need humans.</h3>
              <p className={styles.beliefDesc}>
                AI is great — but it can feel lonely to have Claude as your only co-founder. Community is what matters most.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── The Experience ── */}
      <section id="experience" className={styles.section}>
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>
            TED x Hackathon. 2 hours. Leaves a mark.
          </h2>
          <p className={styles.sectionSubtitle}>
            Every event follows the same format — reproducible in any city.
          </p>

          <div className={styles.formatGrid}>
            <div className={styles.formatCard}>
              <p className={styles.formatTime}>0:00 – 0:30</p>
              <h3 className={styles.formatName}>White Mirror</h3>
              <p className={styles.formatSub}>Vision Drop</p>
              <p className={styles.formatDesc}>
                20 slides x 15 sec. A Black Mirror–style story, with a White Mirror future. Sci-fi writers, Michelin chefs, rogue founders — vision from outside the startup bubble.
              </p>
            </div>
            <div className={styles.formatCard}>
              <p className={styles.formatTime}>0:30 – 1:30</p>
              <h3 className={styles.formatName}>Microdose</h3>
              <p className={styles.formatSub}>AI Crash Experience</p>
              <p className={styles.formatDesc}>
                60 min hands-on AI building. First-timers get their "wow" moment. Veterans compete to ship fastest. First taste of what it feels like to be a 10x founder.
              </p>
            </div>
            <div className={styles.formatCard}>
              <p className={styles.formatTime}>1:30 – 2:00</p>
              <h3 className={styles.formatName}>Collider</h3>
              <p className={styles.formatSub}>Meet Your Tribe</p>
              <p className={styles.formatDesc}>
                AI assessment reveals your founder type. Raise your phone, show your color, form your crew. Take the offline community with you.
              </p>
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <p className={styles.formatBadge}>2 hours. Any city. Reproducible.</p>
            <p className={styles.formatFootnote}>2–3x per month · organizer-in-a-box</p>
          </div>
        </div>
      </section>

      {/* ── Sorting Hat / Founder Types ── */}
      <section id="types" className={styles.section}>
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>
            Every founder gets a color.
          </h2>
          <p className={styles.sectionSubtitle}>
            Based on Steve Blank's founder archetypes — refined with 1,500+ founders. Your AI assessment at the end of every event.
          </p>

          <div className={styles.typeGrid}>
            <div className={styles.typeCard}>
              <div className={styles.typeEmoji}>&#x1F3D6;</div>
              <h3 className={styles.typeName}>Lifestyle</h3>
              <p className={styles.typeDesc}>Building freedom first. Profitability over scale.</p>
            </div>
            <div className={styles.typeCard}>
              <div className={styles.typeEmoji}>&#x1F30D;</div>
              <h3 className={styles.typeName}>Social</h3>
              <p className={styles.typeDesc}>Mission before margin. Impact is the product.</p>
            </div>
            <div className={styles.typeCard}>
              <div className={styles.typeEmoji}>&#x1F680;</div>
              <h3 className={styles.typeName}>Venture</h3>
              <p className={styles.typeDesc}>Swing for the fences. VC-backable or bust.</p>
            </div>
            <div className={styles.typeCard}>
              <div className={styles.typeEmoji}>&#x1F527;</div>
              <h3 className={styles.typeName}>Bootstrap</h3>
              <p className={styles.typeDesc}>No VC needed. Revenue-first powerhouse.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className={styles.ctaSection}>
        <h2 className={styles.ctaHeadline}>The transition is coming. Let's make it good.</h2>
        <p className={styles.ctaSubline}>
          We're looking for city leads — operators who want to run Cafe2035 in their city.
        </p>
        <div className={styles.ctaRow}>
          <Link to="/apply" className={styles.ctaPrimary}>
            Apply to organize
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className={styles.footer}>
        <span className={styles.footerBrand}>Cafe2035</span>
        <span className={styles.footerTagline}>See the future. Sleep better.</span>
      </footer>
    </div>
  );
}
