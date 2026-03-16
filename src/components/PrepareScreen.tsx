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
        setVideoError(`Video is ${Math.round(video.duration)}s \u2014 should be around 5 minutes (300s). Consider trimming it.`);
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
        {/* Welcome hero */}
        <header className={styles.hero}>
          <h1 className={styles.heroTitle}>
            You're about to show the world <span className={styles.accent}>your</span> 2035.
          </h1>
          <p className={styles.heroLead}>
            And it's going to be a lot of fun.
          </p>
          <p className={styles.heroBody}>
            Whether you're a published sci-fi author or this is your very first time on stage &mdash; it doesn't matter.
            What matters is <strong>your vision</strong>. There is no wrong story. No wrong future. You might paint an
            abundance future where technology lifts everyone up (White Mirror), or sound the alarm on a path we need to
            fight to prevent (Black Mirror). Both are powerful. Both are needed.
          </p>
          <p className={styles.heroBody}>
            All we can promise you: crafting your story will be inspiring, performing it will be
            exhilarating, and sharing your vision with a room full of curious minds will be one of those moments
            you remember.
          </p>
          <p className={styles.heroPunch}>
            Let's get you ready.
          </p>
          <span className={styles.heroBadge}>Cafe2035</span>
        </header>

        {/* Story crafting guide */}
        <section className={styles.directions}>
          <h2 className={styles.sectionTitle}>Craft your 5-minute story</h2>

          <div className={styles.steps}>
            <div className={styles.step}>
              <span className={styles.stepNumber}>1</span>
              <div>
                <h3 className={styles.stepTitle}>Start with what you believe</h3>
                <p className={styles.stepDesc}>
                  The key is a <strong>good story</strong> &mdash; and a good story starts with conviction. What do you
                  truly believe 2035 looks like? Not what the headlines say, not what a trend report predicts &mdash;
                  what do <em>you</em> see? That belief becomes the world your characters live in.
                </p>
              </div>
            </div>
            <div className={styles.step}>
              <span className={styles.stepNumber}>2</span>
              <div>
                <h3 className={styles.stepTitle}>Find your everyday story</h3>
                <p className={styles.stepDesc}>
                  Now zoom in. Think of an everyday moment in that world &mdash; something completely normal for 2035,
                  but <strong>mind-blowing by today's standards</strong>. A kid doing homework. A couple having dinner.
                  A doctor visit. The more mundane, the more powerful &mdash; because the ordinary is what makes the
                  future feel real.
                </p>
              </div>
            </div>
            <div className={styles.step}>
              <span className={styles.stepNumber}>3</span>
              <div>
                <h3 className={styles.stepTitle}>Break it into 20 scenes</h3>
                <p className={styles.stepDesc}>
                  Each scene = 1 slide = <strong>15 seconds of narration</strong>. One moment, one image. Keep it
                  tight. 20 scenes &times; 15s = your 5-minute story.
                </p>
              </div>
            </div>
            <div className={styles.step}>
              <span className={styles.stepNumber}>4</span>
              <div>
                <h3 className={styles.stepTitle}>Write it out</h3>
                <p className={styles.stepDesc}>
                  Open your favorite text editor and assemble the 20 scenes. Read it out loud. Does it flow?
                  Does each moment pull you into the next? Trim, rewrite, sharpen &mdash; until the story feels alive.
                </p>
              </div>
            </div>
            <div className={styles.step}>
              <span className={styles.stepNumber}>5</span>
              <div>
                <h3 className={styles.stepTitle}>Generate the images</h3>
                <p className={styles.stepDesc}>
                  Once your narrative is solid, bring it to life visually. Use <strong>Midjourney, DALL-E, Flux,
                  Nano Banana</strong> &mdash; whatever tool speaks to you. Pro tip: create a "world prompt" that
                  stays consistent across scenes &mdash; e.g. <em>"a world where everyone wears AI AR glasses unless
                  they're older and still use iPhone-like devices..."</em> &mdash; plus detailed character descriptions
                  so your people look like the same people in every scene.
                </p>
              </div>
            </div>
            <div className={styles.step}>
              <span className={styles.stepNumber}>6</span>
              <div>
                <h3 className={styles.stepTitle}>Assemble your 20-slide PDF</h3>
                <p className={styles.stepDesc}>
                  Drop your images into Google Slides, Canva, Keynote, or PowerPoint. One image per slide,
                  <strong> landscape 16:9</strong>. Export as PDF &mdash; exactly <strong>20 pages</strong>, max 30 MB.
                </p>
              </div>
            </div>
            <div className={styles.step}>
              <span className={styles.stepNumber}>7</span>
              <div>
                <h3 className={styles.stepTitle}>Rehearse with the timer</h3>
                <p className={styles.stepDesc}>
                  Use the test tool below. Hit Play, watch your slides auto-advance every 15 seconds, and
                  practice narrating. Do it two or three times. You'll find your rhythm &mdash; and 5 minutes will
                  feel like exactly the right amount.
                </p>
              </div>
            </div>
          </div>

          <div className={styles.tips}>
            <h3 className={styles.tipsTitle}>Remember:</h3>
            <ul className={styles.tipsList}>
              <li>The <strong>story is what matters</strong> &mdash; AI is just how you bring it to life</li>
              <li>Focus on your <strong>characters</strong> &mdash; who are they, what do they feel, what do they see?</li>
              <li>Big images, minimal text &mdash; the audience listens to you, not reads your slides</li>
              <li>White Mirror or Black Mirror &mdash; abundance or warning &mdash; both are welcome, both are needed</li>
              <li>Keep your visuals consistent: same world prompt, same characters, same style</li>
              <li>15 seconds per slide goes fast &mdash; practice is your best friend</li>
            </ul>
          </div>
        </section>

        {/* PDF Test */}
        <section className={styles.testSection}>
          <h2 className={styles.sectionTitle}>Test your PDF (20 slides)</h2>
          <p className={styles.sectionDesc}>
            Upload your PDF and preview exactly how it will look on stage. Hit Play to simulate the
            auto-advance and practice your narration in real time.
          </p>
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
                &#10003; PDF is valid &mdash; {pdfSlides.length} slides detected. You're good to go!
              </p>
            </div>
          )}
        </section>

        {/* Video Test */}
        <section className={styles.testSection}>
          <h2 className={styles.sectionTitle}>Test your video (~5 min, optional)</h2>
          <p className={styles.sectionDesc}>
            Can't be there in person? Record yourself narrating over your slides (screen + camera).
            Upload the MP4 here to make sure it plays back perfectly. Aim for <strong>~5 minutes</strong>, max 200 MB.
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
          <p className={styles.footerMessage}>
            You've got this. The future is in this room &mdash; yours included.
          </p>
          <p className={styles.footerSub}>Questions? Reach out to your event organizer.</p>
          <a href="#/" className={styles.footerBrand}>Cafe2035</a>
        </footer>
      </div>
    </div>
  );
}
