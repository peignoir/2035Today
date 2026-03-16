import { useState, useCallback, useRef } from 'react';
import { loadAndRenderPdf, PdfValidationError } from '../lib/pdfRenderer';
import type { SlideImage } from '../types';
import styles from './PrepareScreen.module.css';

export function PrepareScreen() {

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
    <div className={styles.page}>
      <nav className={styles.topNav}>
        <a href="#/" className={styles.navBrand}>Cafe2035</a>
      </nav>

      <div className={styles.container}>
        {/* Welcome */}
        <header className={styles.hero}>
          <p className={styles.heroEmoji}>&#9749;</p>
          <h1 className={styles.heroTitle}>
            Welcome to the <span className={styles.accent}>2035 Storytellers Guild</span>.
          </h1>
          <p className={styles.heroLead}>
            We can't wait to hear your story.
          </p>
          <p className={styles.heroBody}>
            Sci-fi novelist or first-timer &mdash; doesn't matter.
            What matters is <span className={styles.accent}>your vision</span>.
            No wrong story. No wrong future.
          </p>
          <p className={styles.heroBody}>
            The world is moving so fast we're basically <span className={styles.accent}>hunter-gatherers
            staring at the horizon</span>, trying to imagine what "agriculture" will bring.
            Your story might look like <span className={styles.accent2}>Star Trek</span> &mdash; abundance, humanity at its
            best. Or like <span className={styles.accent2}>Mad Max</span> &mdash; a warning worth hearing.
            Both are powerful. Both are needed.
          </p>
          <p className={styles.heroBody}>
            Think of it as a <span className={styles.accent}>campfire story</span> &mdash;
            you talk, the images illustrate. Not a pitch deck. A <em>story</em>.
          </p>
        </header>

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
                <h3 className={styles.stepTitle}>Make a 20-slide PDF</h3>
                <p className={styles.stepDesc}>
                  One image per slide, <span className={styles.accent}>landscape 16:9</span>.
                  Export as PDF &mdash; exactly <span className={styles.accent}>20 pages</span>, max 30 MB.
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

        <footer className={styles.footer}>
          <p className={styles.footerMessage}>
            Fear nothing. Build anything.
          </p>
          <p className={styles.footerSub}>Questions? Reach out to your event organizer.</p>
          <a href="#/" className={styles.footerBrand}>Cafe2035</a>
        </footer>
      </div>
    </div>
  );
}
