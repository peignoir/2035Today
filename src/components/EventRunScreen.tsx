import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { ShareableEvent, LoadedDeck } from '../types';
import { loadEvent, saveEvent, uploadRecording, deleteRecording, downloadPdf } from '../lib/storage';
import { renderPdfFromBlob } from '../lib/pdfRenderer';
import { generateLogo } from '../lib/generateLogo';
import { useFullscreen } from '../hooks/useFullscreen';
import { PresentationScreen } from './PresentationScreen';
import { LogoSplash } from './LogoSplash';
import styles from './EventRunScreen.module.css';

type RunState = 'loading' | 'logo-splash' | 'rendering' | 'presenting';

interface UploadState {
  presIndex: number;
  blob: Blob;
  status: 'confirm' | 'uploading' | 'done' | 'error';
  progress: number;
  error?: string;
}

export function EventRunScreen() {
  const { '*': slugParam } = useParams();
  const slug = slugParam?.replace(/\/run$/, '') || '';
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const { exitFullscreen } = useFullscreen();

  const [runState, setRunState] = useState<RunState>('loading');
  const [event, setEvent] = useState<ShareableEvent | null>(null);
  const [playedIds, setPlayedIds] = useState<Set<number>>(new Set());
  const [currentPresIndex, setCurrentPresIndex] = useState<number | null>(null);
  const [currentDeck, setCurrentDeck] = useState<LoadedDeck | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [renderProgress, setRenderProgress] = useState(0);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [confirmPresIndex, setConfirmPresIndex] = useState<number | null>(null);
  const [uploadState, setUploadState] = useState<UploadState | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  const pdfCacheRef = useRef<Map<number, Blob>>(new Map());

  // Load event from Supabase
  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      const ev = await loadEvent(slug);
      if (cancelled) return;
      if (!ev) {
        navigate(`/admin/events/${slug}`, { replace: true });
        return;
      }
      setEvent(ev);

      if (ev.logo) {
        setLogoUrl(ev.logo);
      } else {
        try {
          const generated = await generateLogo(ev.name, ev.city);
          if (!cancelled) setLogoUrl(URL.createObjectURL(generated));
        } catch { /* text fallback */ }
      }

      setRunState('logo-splash');
    })();
    return () => { cancelled = true; };
  }, [slug, navigate]);

  useEffect(() => {
    return () => {
      if (logoUrl && logoUrl.startsWith('blob:')) URL.revokeObjectURL(logoUrl);
    };
  }, [logoUrl]);

  const startPlay = useCallback(async (presIndex: number) => {
    if (!event || !slug) return;
    const pres = event.presentations[presIndex];
    if (!pres) return;
    setConfirmPresIndex(null);
    setRunError(null);

    // ── Step 1: Obtain PDF blob (stays on logo-splash while doing this) ──

    if (!pres.pdfUrl) {
      setRunError('No PDF uploaded for this presentation. Go back to setup and upload it.');
      return;
    }

    let pdfBlob: Blob | null = pdfCacheRef.current.get(presIndex) ?? null;

    if (!pdfBlob) {
      try {
        pdfBlob = await downloadPdf(slug, presIndex);
        pdfCacheRef.current.set(presIndex, pdfBlob);
      } catch (e) {
        console.error('[GoLive] PDF download failed:', e);
        setRunError(`Failed to download PDF: ${e instanceof Error ? e.message : 'unknown error'}`);
        return;
      }
    }

    // ── Step 2: We have a PDF — now show rendering UI ──

    setCurrentPresIndex(presIndex);
    setRunState('rendering');
    setRenderProgress(0);

    try {
      let micStream: MediaStream | null = null;
      if (event.recordEnabled) {
        try {
          micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch { /* video-only */ }
        setAudioStream(micStream);
      }

      const deck = await renderPdfFromBlob(pdfBlob, pres.fileName || 'slides.pdf', (page) => {
        setRenderProgress(page);
      });
      setCurrentDeck(deck);
      setRunState('presenting');
    } catch (e) {
      console.error('[GoLive] PDF render failed:', e);
      setRunError(`Failed to render slides: ${e instanceof Error ? e.message : 'unknown error'}`);
      setRunState('logo-splash');
    }
  }, [event, slug]);

  const handlePlay = useCallback((presIndex: number) => {
    if (event?.recordEnabled && event.presentations[presIndex]?.recording) {
      setConfirmPresIndex(presIndex);
    } else {
      startPlay(presIndex);
    }
  }, [event, startPlay]);

  const handleRecordingComplete = useCallback(async (blob: Blob) => {
    if (currentPresIndex === null) return;
    setUploadState({
      presIndex: currentPresIndex,
      blob,
      status: 'confirm',
      progress: 0,
    });
  }, [currentPresIndex]);

  const handleRecordingFailed = useCallback(() => {
    setRunError('Recording failed — no audio/video data was captured. Please try again.');
  }, []);

  const handleConfirmUpload = useCallback(async () => {
    if (!uploadState || !event) return;
    const { presIndex, blob } = uploadState;
    setUploadState((prev) => prev ? { ...prev, status: 'uploading', progress: 10 } : null);

    try {
      const progressTimer = setInterval(() => {
        setUploadState((prev) => {
          if (!prev || prev.status !== 'uploading') return prev;
          return { ...prev, progress: Math.min(prev.progress + 8, 90) };
        });
      }, 500);

      const cdnUrl = await uploadRecording(slug, presIndex, blob);

      clearInterval(progressTimer);
      setUploadState((prev) => prev ? { ...prev, status: 'done', progress: 100 } : null);

      setEvent((prev) => {
        if (!prev) return prev;
        const presentations = prev.presentations.map((p, i) =>
          i === presIndex ? { ...p, recording: cdnUrl } : p,
        );
        const updated = { ...prev, presentations };
        saveEvent(slug, updated).catch(console.error);
        return updated;
      });

      setTimeout(() => setUploadState(null), 2000);
    } catch (e) {
      setUploadState((prev) => prev ? {
        ...prev,
        status: 'error',
        error: e instanceof Error ? e.message : 'Upload failed',
      } : null);
    }
  }, [uploadState, event, slug]);

  const handleSkipUpload = useCallback(() => {
    setUploadState(null);
  }, []);

  const handleDeleteRecording = useCallback(async (presIndex: number) => {
    if (!event) return;
    try { await deleteRecording(slug, presIndex); } catch { /* ignore */ }
    setEvent((prev) => {
      if (!prev) return prev;
      const presentations = prev.presentations.map((p, i) =>
        i === presIndex ? { ...p, recording: undefined } : p,
      );
      const updated = { ...prev, presentations };
      saveEvent(slug, updated).catch(console.error);
      return updated;
    });
  }, [event, slug]);

  const handlePresentationFinish = useCallback(() => {
    if (currentDeck) {
      currentDeck.slides.forEach((s) => URL.revokeObjectURL(s.objectUrl));
    }
    setCurrentDeck(null);
    if (currentPresIndex !== null) {
      setPlayedIds((prev) => new Set(prev).add(currentPresIndex));
    }
    setCurrentPresIndex(null);
    setRunState('logo-splash');
  }, [currentDeck, currentPresIndex]);

  const handleStop = useCallback(() => {
    if (currentDeck) {
      currentDeck.slides.forEach((s) => URL.revokeObjectURL(s.objectUrl));
    }
    setCurrentDeck(null);
    setCurrentPresIndex(null);
    setRunState('logo-splash');
  }, [currentDeck]);

  const handleExit = useCallback(() => {
    if (currentDeck) {
      currentDeck.slides.forEach((s) => URL.revokeObjectURL(s.objectUrl));
    }
    exitFullscreen().then(() => navigate(`/admin/events/${slug}`));
  }, [currentDeck, exitFullscreen, navigate, slug]);

  const eventName = event?.name ?? '';
  const presentations = event?.presentations ?? [];

  return (
    <div ref={containerRef} className={styles.container}>
      {runState === 'loading' && (
        <div className={styles.loadingScreen}>Loading...</div>
      )}

      {runState === 'rendering' && (
        <div className={styles.loadingScreen}>
          <div className={styles.renderBar}>
            <div className={styles.renderFill} style={{ width: `${(renderProgress / 20) * 100}%` }} />
          </div>
          <p>Rendering slide {renderProgress} of 20...</p>
        </div>
      )}

      {runState === 'logo-splash' && (
        <>
          <LogoSplash
            logoUrl={logoUrl}
            eventName={eventName}
            presentations={presentations}
            playedIds={playedIds}
            recordEnabled={event?.recordEnabled ?? false}
            onPlay={handlePlay}
            onDeleteRecording={handleDeleteRecording}
            onExit={handleExit}
          />
          {runError && (
            <div className={styles.confirmOverlay}>
              <div className={styles.confirmDialog}>
                <p className={styles.confirmText} style={{ color: '#ef4444' }}>
                  {runError}
                </p>
                <div className={styles.confirmButtons}>
                  <button className={styles.confirmProceed} onClick={() => setRunError(null)}>
                    OK
                  </button>
                </div>
              </div>
            </div>
          )}
          {confirmPresIndex !== null && (
            <div className={styles.confirmOverlay}>
              <div className={styles.confirmDialog}>
                <p className={styles.confirmText}>
                  This talk already has a recording. Starting a new one will <strong>delete the previous recording</strong>.
                </p>
                <div className={styles.confirmButtons}>
                  <button className={styles.confirmCancel} onClick={() => setConfirmPresIndex(null)}>
                    Cancel
                  </button>
                  <button className={styles.confirmProceed} onClick={() => startPlay(confirmPresIndex)}>
                    Record again
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {runState === 'presenting' && currentDeck && (() => {
        const currentPres = currentPresIndex !== null ? presentations[currentPresIndex] : null;
        return (
          <PresentationScreen
            deck={currentDeck}
            eventName={eventName}
            storyName={currentPres?.storyName ?? ''}
            speakerName={currentPres?.speakerName ?? ''}
            onExit={handleStop}
            onFinish={handlePresentationFinish}
            manageFullscreen={false}
            recordingEnabled={event?.recordEnabled ?? false}
            onRecordingComplete={handleRecordingComplete}
            onRecordingFailed={handleRecordingFailed}
            audioStream={audioStream}
          />
        );
      })()}

      {/* Upload dialog with progress bar */}
      {uploadState && (
        <div className={styles.confirmOverlay}>
          <div className={styles.confirmDialog}>
            {uploadState.status === 'confirm' && (
              <>
                <p className={styles.confirmText}>
                  Recording captured ({(uploadState.blob.size / 1024 / 1024).toFixed(1)} MB). Upload to cloud?
                </p>
                <div className={styles.confirmButtons}>
                  <button className={styles.confirmCancel} onClick={handleSkipUpload}>
                    Skip
                  </button>
                  <button className={styles.confirmProceed} onClick={handleConfirmUpload}>
                    Upload now
                  </button>
                </div>
              </>
            )}
            {uploadState.status === 'uploading' && (
              <>
                <p className={styles.confirmText}>Uploading recording...</p>
                <div className={styles.renderBar} style={{ marginTop: '12px' }}>
                  <div
                    className={styles.renderFill}
                    style={{ width: `${uploadState.progress}%`, transition: 'width 0.3s ease' }}
                  />
                </div>
                <p style={{ color: '#999', fontSize: '13px', marginTop: '8px' }}>
                  {uploadState.progress}%
                </p>
              </>
            )}
            {uploadState.status === 'done' && (
              <p className={styles.confirmText} style={{ color: '#22c55e' }}>
                Uploaded successfully!
              </p>
            )}
            {uploadState.status === 'error' && (
              <>
                <p className={styles.confirmText} style={{ color: '#ef4444' }}>
                  Upload failed: {uploadState.error}
                </p>
                <div className={styles.confirmButtons}>
                  <button className={styles.confirmCancel} onClick={handleSkipUpload}>
                    Dismiss
                  </button>
                  <button className={styles.confirmProceed} onClick={handleConfirmUpload}>
                    Retry
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
