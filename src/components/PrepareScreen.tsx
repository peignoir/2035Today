import { useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { loadAndRenderPdf, PdfValidationError } from '../lib/pdfRenderer';
import type { SlideImage } from '../types';
import styles from './PrepareScreen.module.css';

export function PrepareScreen() {
  const { city, date } = useParams<{ city: string; date: string }>();
  const cityName = (city || '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const eventLabel = `Cafe2035 ${cityName}`;

  const [pdfSlides, setPdfSlides] = useState<SlideImage[] | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);

  // Auto-advance slideshow
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
        setVideoError(`Video is ${Math.round(video.duration)}s — should be around 5 minutes (300s). Consider trimming it.`);
      } else if (video.duration < 60) {
        setVideoError(`Video is only ${Math.round(video.duration)}s — it should be around 5 minutes.`);
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
        {city && date && (
          <a href={`#/${city}/${date}`} className={styles.navLink}>&larr; Back to event</a>
        )}
      </nav>

      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Speaker Prep</h1>
          {eventLabel && <p className={styles.subtitle}>{eventLabel}</p>}
        </header>

        {/* Story crafting guide */}
        <section className={styles.directions}>
          <h2 className={styles.sectionTitle}>How to craft your 5-minute story</h2>

          <div className={styles.steps}>
            <div className={styles.step}>
              <span className={styles.stepNumber}>1</span>
              <div>
                <h3 className={styles.stepTitle}>Start with what you believe</h3>
                <p className={styles.stepDesc}>
                  The key is a <strong>good story</strong> — focus on your characters. Think first about what you truly believe 2035 will look like. That conviction becomes the background of your world.
                </p>
              </div>
            </div>
            <div className={styles.step}>
              <span className={styles.stepNumber}>2</span>
              <div>
                <h3 className={styles.stepTitle}>Find your everyday story</h3>
                <p className={styles.stepDesc}>
                  Think of an everyday-life story set in your 2035 — something normal that would seem <strong>amazing by today's standards</strong>. A morning commute, a doctor visit, a kid's homework. The mundane is what makes it real.
                </p>
              </div>
            </div>
            <div className={styles.step}>
              <span className={styles.stepNumber}>3</span>
              <div>
                <h3 className={styles.stepTitle}>Break it into 20 scenes</h3>
                <p className={styles.stepDesc}>
                  Each scene = 1 slide = <strong>15 seconds of narration</strong>. Keep each scene tight — a single moment, a single image. 20 scenes &times; 15s = 5 minutes total.
                </p>
              </div>
            </div>
            <div className={styles.step}>
              <span className={styles.stepNumber}>4</span>
              <div>
                <h3 className={styles.stepTitle}>Write the story</h3>
                <p className={styles.stepDesc}>
                  Assemble your 20 scenes in your favorite text editor. Read it out loud — does it flow? Does each scene transition naturally? Adjust until the story feels right.
                </p>
              </div>
            </div>
            <div className={styles.step}>
              <span className={styles.stepNumber}>5</span>
              <div>
                <h3 className={styles.stepTitle}>Generate the images</h3>
                <p className={styles.stepDesc}>
                  Once your story and scenes are solid, start generating images (e.g. using <strong>Midjourney, DALL-E, Flux, Nano Banana</strong>). Pro tip: keep a general prompt for your "world" — e.g. <em>"a world where everyone wears AI AR glasses unless they're older and use iPhone-like devices"</em> — plus character descriptions to keep them coherent across scenes.
                </p>
              </div>
            </div>
            <div className={styles.step}>
              <span className={styles.stepNumber}>6</span>
              <div>
                <h3 className={styles.stepTitle}>Assemble as a 20-slide PDF</h3>
                <p className={styles.stepDesc}>
                  Use Google Slides, Canva, Keynote, or PowerPoint. One image per slide, <strong>landscape 16:9</strong>. Export as PDF — exactly <strong>20 pages</strong>, max 30 MB.
                </p>
              </div>
            </div>
            <div className={styles.step}>
              <span className={styles.stepNumber}>7</span>
              <div>
                <h3 className={styles.stepTitle}>Iterate &amp; rehearse</h3>
                <p className={styles.stepDesc}>
                  Check if it flows. Adjust scenes and narration. Do a couple of test runs with the auto-advancing timer below to nail your <strong>5-minute timing</strong>. 15 seconds goes fast!
                </p>
              </div>
            </div>
          </div>

          <div className={styles.tips}>
            <h3 className={styles.tipsTitle}>Good luck! A few tips:</h3>
            <ul className={styles.tipsList}>
              <li>The <strong>story is what matters</strong> — AI is how you bring it to life</li>
              <li>Big images, minimal text — the audience listens to YOU, not reads slides</li>
              <li>Optimistic or dystopian, your choice — both are welcome</li>
              <li>Keep a consistent visual style across your 20 images (same prompt base + characters)</li>
              <li>Practice with the auto-advance timer below — it's the best way to prepare</li>
            </ul>
          </div>
        </section>

        {/* PDF Test */}
        <section className={styles.testSection}>
          <h2 className={styles.sectionTitle}>Test your PDF (20 slides)</h2>
          <label className={styles.fileInput}>
            <input type="file" accept=".pdf,application/pdf" onChange={handlePdfUpload} />
            <span className={styles.fileButton}>Choose PDF (20 slides)</span>
          </label>

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
                &#10003; PDF is valid — {pdfSlides.length} slides detected. You're good to go!
              </p>
            </div>
          )}
        </section>

        {/* Video Test */}
        <section className={styles.testSection}>
          <h2 className={styles.sectionTitle}>Test your video (~5 min, optional)</h2>
          <p className={styles.sectionDesc}>
            If you can't attend in person, record yourself narrating over your slides (screen + camera). Upload the MP4 below to verify it plays correctly. Keep it around <strong>5 minutes</strong> and under <strong>200 MB</strong>.
          </p>
          <label className={styles.fileInput}>
            <input type="file" accept="video/mp4,.mp4,video/*" onChange={handleVideoUpload} />
            <span className={styles.fileButton}>Choose video (MP4, ~5 min)</span>
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
                &#10003; Video loads correctly. Check that audio and visuals are in sync.
              </p>
            </div>
          )}
        </section>

        <footer className={styles.footer}>
          <p>Questions? Reach out to your event organizer.</p>
          <a href="#/" className={styles.footerBrand}>Cafe2035</a>
        </footer>
      </div>
    </div>
  );
}
