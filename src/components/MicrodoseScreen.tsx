import { Link } from 'react-router-dom';
import styles from './MicrodoseScreen.module.css';

export function MicrodoseScreen() {
  return (
    <div className={styles.page}>
      <nav className={styles.topNav}>
        <Link to="/" className={styles.navBrand}>☕ 2035Cafe</Link>
        <div className={styles.navRight}>
          <Link to="/" className={styles.navLink}>Home</Link>
          <Link to="/apply" className={styles.navCta}>Organize one</Link>
        </div>
      </nav>

      <section className={styles.hero}>
        <h1 className={styles.headline}>Startup Microdosing</h1>
        <p className={styles.tagline}>Idea-to-launch in 60 minutes. Coming soon.</p>
        <div className={styles.comingSoon}>
          <p>The Microdose process page is under construction.</p>
          <Link to="/" className={styles.backLink}>&larr; Back to 2035Cafe</Link>
        </div>
      </section>
    </div>
  );
}
