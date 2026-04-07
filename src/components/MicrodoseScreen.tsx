import { Link } from 'react-router-dom';
import styles from './MicrodoseScreen.module.css';

export function MicrodoseScreen() {
  return (
    <section className={styles.hero}>
      <h1 className={styles.headline}>Startup Microdosing</h1>
      <p className={styles.tagline}>Idea-to-launch in 60 minutes. Coming soon.</p>
      <div className={styles.comingSoon}>
        <p>The Microdose process page is under construction.</p>
        <Link to="/" className={styles.backLink}>&larr; Back to 2035Today</Link>
      </div>
    </section>
  );
}
