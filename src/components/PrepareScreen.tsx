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

    // Validate file
    if (!file.type.startsWith('video/')) {
      setVideoError('Please select a video file (MP4 recommended).');
      return;
    }
    if (file.size > 200 * 1024 * 1024) {
      setVideoError('Video must be under 200 MB.');
      return;
    }

    // Revoke previous
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    const url = URL.createObjectURL(file);
    setVideoUrl(url);

    // Validate duration
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      if (video.duration > 420) {
        setVideoError(`Video is ${Math.round(video.duration)}s — max is 7 minutes (420s). Consider trimming it.`);
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
    }, 15000); // 15 seconds per slide
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
          <a href={`#/${city}/${date}`} className={styles.navLink}>← Back to event</a>
        )}
      </nav>

      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Speaker Prep</h1>
          {eventLabel && <p className={styles.subtitle}>{eventLabel}</p>}
        </header>

        {/* Directions */}
        <section className={styles.directions}>
          <h2 className={styles.sectionTitle}>How to prepare your 5-minute story</h2>
          <div className={styles.steps}>
            <div className={styles.step}>
              <span className={styles.stepNumber}>1</span>
              <div>
                <h3 className={styles.stepTitle}>Create 20 slides</h3>
                <p className={styles.stepDesc}>
                  Use any tool — Google Slides, Canva, Keynote, PowerPoint. Each slide will auto-advance every <strong>15 seconds</strong> (20 × 15s = 5 minutes total). Think visual, not text-heavy. AI-generated images work great.
                </p>
              </div>
            </div>
            <div className={styles.step}>
              <span className={styles.stepNumber}>2</span>
              <div>
                <h3 className={styles.stepTitle}>Export as PDF</h3>
                <p className={styles.stepDesc}>
                  File → Download → PDF. Make sure you have <strong>exactly 20 pages</strong> (one per slide). Max 30 MB.
                </p>
              </div>
            </div>
            <div className={styles.step}>
              <span className={styles.stepNumber}>3</span>
              <div>
                <h3 className={styles.stepTitle}>Test it below</h3>
                <p className={styles.stepDesc}>
                  Upload your PDF to preview how it looks. Click <strong>Play</strong> to simulate the auto-advance timing. Practice your narration while slides change!
                </p>
              </div>
            </div>
            <div className={styles.step}>
              <span className={styles.stepNumber}>4</span>
              <div>
                <h3 className={styles.stepTitle}>Optional: pre-record a video</h3>
                <p className={styles.stepDesc}>
                  If you can't attend in person, record yourself narrating over your slides (screen + camera). Upload the MP4 below to verify it plays correctly. Keep it under <strong>7 minutes</strong> and <strong>200 MB</strong>.
                </p>
              </div>
            </div>
          </div>

          <div className={styles.tips}>
            <h3 className={styles.tipsTitle}>💡 Tips</h3>
            <ul className={styles.tipsList}>
              <li>Use <strong>landscape</strong> (16:9) slides — they fill the screen better</li>
              <li>Big images, minimal text — the audience listens to YOU, not reads slides</li>
              <li>Tell a story about 2035 — optimistic or dystopian, your choice</li>
              <li>Practice with the auto-advance timer — 15 seconds goes fast!</li>
              <li>AI-generated visuals (Midjourney, DALL-E, Flux) are encouraged</li>
            </ul>
          </div>
        </section>

        {/* PDF Test */}
        <section className={styles.testSection}>
          <h2 className={styles.sectionTitle}>🎯 Test your PDF</h2>
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
                    ▶ Play (auto-advance 15s)
                  </button>
                ) : (
                  <button className={styles.stopButton} onClick={handleStop}>
                    ⏹ Stop
                  </button>
                )}
                <div className={styles.slideNav}>
                  <button
                    disabled={currentSlide === 0 || playing}
                    onClick={() => setCurrentSlide((p) => p - 1)}
                  >
                    ← Prev
                  </button>
                  <button
                    disabled={currentSlide === 19 || playing}
                    onClick={() => setCurrentSlide((p) => p + 1)}
                  >
                    Next →
                  </button>
                </div>
              </div>
              <p className={styles.slideCheck}>
                ✅ PDF is valid — {pdfSlides.length} slides detected. You're good to go!
              </p>
            </div>
          )}
        </section>

        {/* Video Test */}
        <section className={styles.testSection}>
          <h2 className={styles.sectionTitle}>🎬 Test your video (optional)</h2>
          <label className={styles.fileInput}>
            <input type="file" accept="video/mp4,.mp4,video/*" onChange={handleVideoUpload} />
            <span className={styles.fileButton}>Choose video (MP4, max 200 MB)</span>
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
                ✅ Video loads correctly. Check that audio and visuals are in sync.
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
