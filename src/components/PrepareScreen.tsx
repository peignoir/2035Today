import { useState, useCallback, useRef, useEffect } from 'react';
import { loadAndRenderPdf, PdfValidationError } from '../lib/pdfRenderer';
import type { SlideImage } from '../types';
import styles from './PrepareScreen.module.css';

const QUOTES = [
  { text: 'How many things have been denied one day, only to become realities the next!', author: 'Jules Verne' },
  { text: 'The future is already here — it\'s just not evenly distributed.', author: 'William Gibson' },
  { text: 'Any sufficiently advanced technology is indistinguishable from magic.', author: 'Arthur C. Clarke' },
  { text: 'The best way to predict the future is to invent it.', author: 'Alan Kay' },
  { text: 'Science fiction is the most important literature in the history of the world.', author: 'Ray Bradbury' },
  { text: 'We are called to be architects of the future, not its victims.', author: 'Buckminster Fuller' },
];

export function PrepareScreen() {
  const [quoteIdx, setQuoteIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setQuoteIdx((i) => (i + 1) % QUOTES.length), 8000);
    return () => clearInterval(id);
  }, []);

  const [pdfSlides, setPdfSlides] = useState<SlideImage[] | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);

  const [playing, setPlaying] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const handlePdfUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPdfError(null);
    setPdfSlides(null);
    setPdfLoading(true);
    setPdfProgress(0);
    setPlaying(false);
    clearInterval(timerRef.current);
    setCurrentSlide(0);

    try {
      const deck = await loadAndRenderPdf(file, (page) => setPdfProgress(page));
      setPdfSlides(deck.slides);
    } catch (err) {
      if (err instanceof PdfValidationError) {
        setPdfError(err.message);
      } else {
        setPdfError('Failed to load PDF. Make sure it has exactly 20 slides.');
      }
    } finally {
      setPdfLoading(false);
    }
  }, []);

  const handleVideoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideoError(null);

    if (!file.type.startsWith('video/')) {
      setVideoError('Please select a video file (MP4 recommended).');
      return;
    }
    if (file.size > 200 * 1024 * 1024) {
      setVideoError('Video must be under 200 MB.');
      return;
    }

    if (videoUrl) URL.revokeObjectURL(videoUrl);
    const url = URL.createObjectURL(file);
    setVideoUrl(url);

    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      if (video.duration > 330) {
        setVideoError(`Video is ${Math.round(video.duration)}s \u2014 should be around 5 minutes (300s). Consider trimming.`);
      } else if (video.duration < 60) {
        setVideoError(`Video is only ${Math.round(video.duration)}s \u2014 it should be around 5 minutes.`);
      }
    };
    video.src = URL.createObjectURL(file);
  }, [videoUrl]);

  const handlePlay = useCallback(() => {
    if (!pdfSlides) return;
    setPlaying(true);
    setCurrentSlide(0);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrentSlide((prev) => {
        if (prev >= 19) {
          clearInterval(timerRef.current);
          setPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 15000);
  }, [pdfSlides]);

  const handleStop = useCallback(() => {
    clearInterval(timerRef.current);
    setPlaying(false);
    setCurrentSlide(0);
  }, []);

  return (
    <>
      <div className={styles.container}>
        {/* Welcome */}
        <header className={styles.hero}>
          <h1 className={styles.heroTitle}>
            Join the <span className={styles.accent}>2035 Storytellers Guild</span>
          </h1>
          <p className={styles.heroLead}>
            We invite successful founders, creative sci-fi writers,
            and amazing experts in their fields to tell the story
            of the future they're building.
          </p>

          <div className={styles.heroDivider} />

          <div className={styles.heroCards}>
            <div className={`${styles.heroCard} ${styles.heroCardUtopia}`}>
              <svg className={styles.heroCardSvg} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="40" cy="40" r="36" stroke="#e8913a" strokeWidth="1.5" opacity="0.3" />
                <circle cx="40" cy="40" r="24" stroke="#e8913a" strokeWidth="1" opacity="0.2" />
                <path d="M40 12 L42 30 L52 18 L44 32 L56 28 L46 36 L60 40 L46 44 L56 52 L44 48 L52 62 L42 50 L40 68 L38 50 L28 62 L36 48 L24 52 L34 44 L20 40 L34 36 L24 28 L36 32 L28 18 L38 30 Z" fill="#e8913a" opacity="0.6" />
                <circle cx="40" cy="40" r="8" fill="#e8913a" opacity="0.8" />
              </svg>
              <h3 className={styles.heroCardTitle}>Utopian</h3>
              <p>Your story might look like <strong>Star Trek</strong> &mdash; abundance, humanity at its best. A world you'd want to live in.</p>
            </div>
            <div className={`${styles.heroCard} ${styles.heroCardDystopia}`}>
              <svg className={styles.heroCardSvg} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="16" y="24" width="12" height="40" rx="1" fill="#c44" opacity="0.3" />
                <rect x="34" y="16" width="12" height="48" rx="1" fill="#c44" opacity="0.4" />
                <rect x="52" y="20" width="12" height="44" rx="1" fill="#c44" opacity="0.3" />
                <path d="M10 64 L70 64" stroke="#c44" strokeWidth="1.5" opacity="0.5" />
                <circle cx="40" cy="10" r="4" fill="#c44" opacity="0.6" />
                <path d="M36 10 L44 10" stroke="#111" strokeWidth="1" />
                <path d="M40 8 L40 12" stroke="#111" strokeWidth="1" />
                <path d="M15 30 L25 35 M55 28 L65 33" stroke="#c44" strokeWidth="0.8" opacity="0.3" />
              </svg>
              <h3 className={styles.heroCardTitle}>Dystopian <span className={styles.hopeNote}>(with a touch of hope!)</span></h3>
              <p>Or like <strong>Mad Max</strong> &mdash; a warning worth hearing. Both are powerful. Both are needed.</p>
            </div>
          </div>

          <p className={styles.heroBody}>
            You've been invited to speak &mdash; or you're curious and want to{' '}
            <a href="#/signup" className={styles.inlineLink}>apply</a> &mdash;
            either way, welcome.
            The world is moving so fast we're basically hunter-gatherers staring at the horizon,
            trying to imagine what "agriculture" will bring.
          </p>

          <p className={styles.heroBody}>
            Think of it as a <span className={styles.accent}>campfire story</span> &mdash;
            you talk, the images illustrate. Not a pitch deck. A <em>story</em>.
          </p>

          <blockquote className={styles.heroQuote} key={quoteIdx}>
            <p className={styles.quoteText}>&ldquo;{QUOTES[quoteIdx].text}&rdquo;</p>
            <cite className={styles.quoteAuthor}>&mdash; {QUOTES[quoteIdx].author}</cite>
          </blockquote>
        </header>

        {/* Mission visual */}
        <section className={styles.missionSection}>
          <div className={styles.missionVisual}>
            <svg className={styles.missionSvg} viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Open book */}
              <path d="M60 25 Q40 20 20 30 L20 80 Q40 72 60 78 Q80 72 100 80 L100 30 Q80 20 60 25 Z" fill="rgba(232,145,58,0.08)" stroke="#e8913a" strokeWidth="1.2" />
              <path d="M60 25 L60 78" stroke="#e8913a" strokeWidth="0.8" opacity="0.5" />
              {/* Page lines left */}
              <path d="M28 40 L52 36" stroke="#e8913a" strokeWidth="0.5" opacity="0.3" />
              <path d="M28 48 L52 44" stroke="#e8913a" strokeWidth="0.5" opacity="0.3" />
              <path d="M28 56 L52 52" stroke="#e8913a" strokeWidth="0.5" opacity="0.3" />
              <path d="M28 64 L52 60" stroke="#e8913a" strokeWidth="0.5" opacity="0.3" />
              {/* Page lines right */}
              <path d="M68 36 L92 40" stroke="#e8913a" strokeWidth="0.5" opacity="0.3" />
              <path d="M68 44 L92 48" stroke="#e8913a" strokeWidth="0.5" opacity="0.3" />
              <path d="M68 52 L92 56" stroke="#e8913a" strokeWidth="0.5" opacity="0.3" />
              <path d="M68 60 L92 64" stroke="#e8913a" strokeWidth="0.5" opacity="0.3" />
              {/* Stars rising from book */}
              <circle cx="45" cy="18" r="2" fill="#e8913a" opacity="0.6" />
              <circle cx="60" cy="10" r="2.5" fill="#e8913a" opacity="0.8" />
              <circle cx="75" cy="16" r="1.8" fill="#e8913a" opacity="0.5" />
              <circle cx="52" cy="8" r="1.2" fill="#e8913a" opacity="0.4" />
              <circle cx="70" cy="6" r="1.5" fill="#e8913a" opacity="0.3" />
            </svg>
          </div>
          <div className={styles.missionText}>
            <h2 className={styles.missionTitle}>We are AI optimists <span className={styles.accent}>&amp;</span> realists</h2>
            <p className={styles.missionBody}>
              We're recruiting the founders, writers, and visionaries who are actually building the future &mdash;
              to share their stories and <span className={styles.accent}>tilt the balance in the right direction</span>.
            </p>
            <p className={styles.missionBody}>
              Every story told at a 2035Cafe is an act of hope. Not blind optimism &mdash;
              <em>informed</em> optimism, from people who've seen both the promise and the peril up close.
            </p>
          </div>
        </section>

        {/* White Mirror */}
        <section className={styles.whiteSection}>
          <h2 className={styles.sectionTitle}>
            Your <span className={styles.accent}>White Mirror</span> presentation
          </h2>
          <p className={styles.sectionDesc}>
            We call them <strong>White Mirror</strong> stories &mdash; the opposite of the always-negative
            future on screen. Even dystopian tales need a spark of hope: like Pandora's box,
            the last thing that remains is <span className={styles.accent}>hope</span>.
          </p>
        </section>

        {/* Steps */}
        <section className={styles.directions}>
          <h2 className={styles.sectionTitle}>7 steps to your 5-minute story</h2>

          <div className={styles.steps}>
            <div className={styles.step}>
              <span className={styles.stepNumber}>1</span>
              <div>
                <h3 className={styles.stepTitle}>What do <em>you</em> believe?</h3>
                <p className={styles.stepDesc}>
                  What does <span className={styles.accent}>your 2035</span> look like?
                  That conviction is the world your characters live in.
                </p>
              </div>
            </div>
            <div className={styles.step}>
              <span className={styles.stepNumber}>2</span>
              <div>
                <h3 className={styles.stepTitle}>Find an everyday moment</h3>
                <p className={styles.stepDesc}>
                  Something <span className={styles.accent}>totally normal in 2035</span> but
                  mind-blowing today. A kid's homework. A doctor visit.
                  The more mundane, the more real.
                </p>
              </div>
            </div>
            <div className={styles.step}>
              <span className={styles.stepNumber}>3</span>
              <div>
                <h3 className={styles.stepTitle}>20 scenes, 15 seconds each</h3>
                <p className={styles.stepDesc}>
                  One scene = one slide = <span className={styles.accent}>15 sec of narration</span>.
                  20 &times; 15s = 5 minutes. Keep each scene tight.
                </p>
              </div>
            </div>
            <div className={styles.step}>
              <span className={styles.stepNumber}>4</span>
              <div>
                <h3 className={styles.stepTitle}>Write it out</h3>
                <p className={styles.stepDesc}>
                  Assemble your scenes. Read out loud. Does it flow?
                  Trim and sharpen until it feels alive.
                </p>
              </div>
            </div>
            <div className={styles.step}>
              <span className={styles.stepNumber}>5</span>
              <div>
                <h3 className={styles.stepTitle}>Generate the images</h3>
                <p className={styles.stepDesc}>
                  Use <span className={styles.accent}>Midjourney, DALL-E, Flux, Nano Banana</span> &mdash;
                  whatever you like. <span className={styles.warn}>Zero text on the images!</span> You're
                  the narrator, not the slides. Keep a consistent "world prompt" + character descriptions
                  so everything looks coherent.
                </p>
              </div>
            </div>
            <div className={styles.step}>
              <span className={styles.stepNumber}>6</span>
              <div>
                <h3 className={styles.stepTitle}>Deliver your storyboard</h3>
                <p className={styles.stepDesc}>
                  <span className={styles.accent}>Option A:</span> A <span className={styles.accent}>20-image PDF</span> &mdash;
                  one image per slide, landscape 16:9, exactly 20 pages, max 30 MB.
                  Slides auto-advance on stage while you narrate live.<br />
                  <span className={styles.accent}>Option B:</span> A <span className={styles.accent}>5-minute video</span> &mdash;
                  record yourself narrating over your storyboard. MP4, max 200 MB.
                </p>
              </div>
            </div>
            <div className={styles.step}>
              <span className={styles.stepNumber}>7</span>
              <div>
                <h3 className={styles.stepTitle}>Rehearse!</h3>
                <p className={styles.stepDesc}>
                  Use the timer below. Hit Play, practice narrating while slides auto-advance.
                  Do it 2-3 times. <span className={styles.accent}>15 seconds goes fast!</span>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* PDF Test */}
        <section className={styles.testSection}>
          <h2 className={styles.sectionTitle}>Test your PDF</h2>
          <div className={styles.pdfActions}>
            <label className={styles.fileInput}>
              <input type="file" accept=".pdf,application/pdf" onChange={handlePdfUpload} />
              <span className={styles.fileButton}>Choose your PDF (20 slides)</span>
            </label>
            <a
              href={`${import.meta.env.BASE_URL}example-story.pdf`}
              download="Cafe2035-example-story.pdf"
              className={styles.exampleLink}
            >
              &#8595; Download an example story
            </a>
          </div>

          {pdfLoading && (
            <div className={styles.loadingBar}>
              <div className={styles.loadingFill} style={{ width: `${(pdfProgress / 20) * 100}%` }} />
              <span>Rendering slide {pdfProgress} of 20...</span>
            </div>
          )}

          {pdfError && <p className={styles.error}>{pdfError}</p>}

          {pdfSlides && (
            <div className={styles.slidePreview}>
              <div className={styles.slideDisplay}>
                <img
                  src={pdfSlides[currentSlide].objectUrl}
                  alt={`Slide ${currentSlide + 1}`}
                  className={styles.slideImage}
                />
                <div className={styles.slideOverlay}>
                  <span>Slide {currentSlide + 1} / 20</span>
                  {playing && <span className={styles.timer}>15s auto-advance</span>}
                </div>
              </div>
              <div className={styles.slideControls}>
                {!playing ? (
                  <button className={styles.playButton} onClick={handlePlay}>
                    &#9654; Play (auto-advance 15s)
                  </button>
                ) : (
                  <button className={styles.stopButton} onClick={handleStop}>
                    &#9209; Stop
                  </button>
                )}
                <div className={styles.slideNav}>
                  <button
                    disabled={currentSlide === 0 || playing}
                    onClick={() => setCurrentSlide((p) => p - 1)}
                  >
                    &larr; Prev
                  </button>
                  <button
                    disabled={currentSlide === 19 || playing}
                    onClick={() => setCurrentSlide((p) => p + 1)}
                  >
                    Next &rarr;
                  </button>
                </div>
              </div>
              <p className={styles.slideCheck}>
                &#10003; {pdfSlides.length} slides &mdash; you're good to go!
              </p>
            </div>
          )}
        </section>

        {/* Video Test */}
        <section className={styles.testSection}>
          <h2 className={styles.sectionTitle}>Test your video (5 min, optional)</h2>
          <p className={styles.sectionDesc}>
            Can't be there in person? Record yourself narrating over your slides.
            Aim for <span className={styles.accent}>exactly 5 minutes</span>, max 200 MB.
          </p>
          <label className={styles.fileInput}>
            <input type="file" accept="video/mp4,.mp4,video/*" onChange={handleVideoUpload} />
            <span className={styles.fileButton}>Choose video (MP4)</span>
          </label>

          {videoError && <p className={styles.error}>{videoError}</p>}

          {videoUrl && (
            <div className={styles.videoPreview}>
              <video
                src={videoUrl}
                controls
                preload="metadata"
                playsInline
                className={styles.videoPlayer}
              />
              <p className={styles.slideCheck}>
                &#10003; Video loads. Check audio and visuals are in sync.
              </p>
            </div>
          )}
        </section>

        {/* Story ideas */}
        <section className={styles.ideasSection}>
          <h2 className={styles.sectionTitle}>Need inspiration?</h2>
          <p className={styles.sectionDesc}>
            Tell the story of how we&hellip;
          </p>
          <div className={styles.ideasGrid}>
            {[
              { icon: '🍽', label: 'Eat in 2035' },
              { icon: '🗳', label: 'Vote in 2035' },
              { icon: '💼', label: 'Work (or not) in 2035' },
              { icon: '💰', label: 'Invest in 2035' },
              { icon: '🏥', label: 'Heal in 2035' },
              { icon: '🎓', label: 'Learn in 2035' },
              { icon: '🚀', label: 'Travel in 2035' },
              { icon: '🏠', label: 'Live in 2035' },
              { icon: '🤖', label: 'Coexist with AI in 2035' },
              { icon: '🌍', label: 'Save the planet in 2035' },
            ].map((idea) => (
              <div key={idea.label} className={styles.ideaChip}>
                <span className={styles.ideaIcon}>{idea.icon}</span>
                <span>{idea.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.signupCta}>
          <h2 className={styles.ctaTitle}>Ready?</h2>
          <a href="#/signup" className={styles.ctaButton}>Submit your story</a>
        </section>

        <footer className={styles.footer}>
          <p className={styles.footerMessage}>
            Fear nothing. Build anything.
          </p>
          <p className={styles.footerSub}>Questions? Reach out to your event organizer.</p>
          <a href="#/" className={styles.footerBrand}>Cafe2035</a>
        </footer>
      </div>
    </>
  );
}
