import { useRef, useState, useCallback } from 'react';
import type { SlideImage } from '../types';

function pickMimeType(): string {
  // Prefer fully-qualified codec strings first. Safari's plain "video/mp4"
  // path can produce empty encoder output on some versions; specifying
  // codecs explicitly forces the known-good H.264/AAC pipeline.
  const candidates = [
    'video/mp4;codecs=avc1,mp4a.40.2', // Safari: forces H.264 + AAC
    'video/mp4',                        // fallback
    'video/webm;codecs=vp8,opus',       // Chrome/Firefox
    'video/webm',                       // Chrome/Firefox fallback
  ];
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return '';
}

/** Overlay data burned into the recorded video */
export interface OverlayInfo {
  eventTitle: string;
  storyName: string;
  speakerName: string;
  currentSlide: number;     // 0-based (0–19)
  totalSlides: number;      // 20
  slideSecondsLeft: number; // countdown per slide (15→0)
}

export interface MediaRecorderHandle {
  startRecording: (slides: SlideImage[], preAcquiredAudio?: MediaStream | null) => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  drawSlide: (slide: SlideImage, overlay?: OverlayInfo) => void;
  updateOverlay: (overlay: OverlayInfo) => void;
  setPaused: (paused: boolean) => void;
  isRecording: boolean;
  micDenied: boolean;
}

/** Draw event/story/speaker info + progress bar over the current canvas content */
function drawOverlayOnCanvas(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  overlay: OverlayInfo,
) {
  const { eventTitle, storyName, speakerName, currentSlide, totalSlides, slideSecondsLeft } = overlay;

  // ── Top-left info block: event name, story name, speaker name ──
  const lineH = Math.round(h * 0.032);
  const baseFontSize = Math.round(h * 0.026);
  const padX = Math.round(w * 0.02);
  const padY = Math.round(h * 0.02);

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;
  ctx.textBaseline = 'top';

  let y = padY;

  // Event name (bold)
  if (eventTitle) {
    ctx.font = `bold ${baseFontSize}px sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(eventTitle, padX, y);
    y += lineH;
  }

  // Story name (semibold, slightly smaller)
  if (storyName) {
    ctx.font = `600 ${Math.round(baseFontSize * 0.9)}px sans-serif`;
    ctx.fillStyle = '#e0e0e0';
    ctx.fillText(storyName, padX, y);
    y += lineH;
  }

  // Speaker name (normal weight)
  if (speakerName) {
    ctx.font = `400 ${Math.round(baseFontSize * 0.85)}px sans-serif`;
    ctx.fillStyle = '#b0b0b0';
    ctx.fillText(speakerName, padX, y);
  }

  ctx.restore();

  // ── Bottom bar ──
  const barH = Math.round(h * 0.04);
  const barY = h - barH;
  const barPad = Math.round(w * 0.015);
  const segGap = Math.round(w * 0.003);

  // Semi-transparent background
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(0, barY, w, barH);

  // Countdown number (left)
  const countFontSize = Math.round(barH * 0.55);
  ctx.font = `bold ${countFontSize}px monospace`;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ef4444';
  const countText = String(slideSecondsLeft);
  const countWidth = ctx.measureText('00').width;
  ctx.fillText(countText, barPad, barY + barH / 2);

  // "5 min" label (right)
  ctx.font = `600 ${Math.round(barH * 0.45)}px monospace`;
  ctx.fillStyle = '#ffffff';
  const labelText = '5 min';
  const labelWidth = ctx.measureText(labelText).width;
  ctx.fillText(labelText, w - barPad - labelWidth, barY + barH / 2);

  // Segments area
  const segsLeft = barPad + countWidth + barPad;
  const segsRight = w - barPad - labelWidth - barPad;
  const totalSegsWidth = segsRight - segsLeft;
  const segWidth = (totalSegsWidth - (totalSlides - 1) * segGap) / totalSlides;
  const segH = Math.round(barH * 0.25);
  const segY = barY + (barH - segH) / 2;

  for (let i = 0; i < totalSlides; i++) {
    const sx = segsLeft + i * (segWidth + segGap);

    // Background segment
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(sx, segY, segWidth, segH);

    // Fill for completed slides
    if (i < currentSlide) {
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(sx, segY, segWidth, segH);
    } else if (i === currentSlide) {
      // Active slide: partial fill based on elapsed time
      const progress = 1 - slideSecondsLeft / 15;
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(sx, segY, segWidth * Math.max(0, Math.min(progress, 1)), segH);
    }
  }

  ctx.restore();
}

export function useMediaRecorder(): MediaRecorderHandle {
  const [isRecording, setIsRecording] = useState(false);
  const [micDenied, setMicDenied] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const canvasStreamRef = useRef<MediaStream | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeRef = useRef('');
  const startTimeRef = useRef(0);
  const lastImageRef = useRef<HTMLImageElement | null>(null);
  const visibilityHandlerRef = useRef<(() => void) | null>(null);
  const userPausedRef = useRef(false);
  const heartbeatIdRef = useRef<number>(0);
  const dirtyLoopIdRef = useRef<number>(0);

  const drawSlide = useCallback((slide: SlideImage, overlay?: OverlayInfo) => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      lastImageRef.current = img;
      if (overlay) {
        drawOverlayOnCanvas(ctx, canvas.width, canvas.height, overlay);
      }
    };
    img.src = slide.objectUrl;
  }, []);

  /** Redraw cached slide + updated overlay (called every second for timer updates) */
  const updateOverlay = useCallback((overlay: OverlayInfo) => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    const img = lastImageRef.current;
    if (!ctx || !canvas || !img) return;

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    drawOverlayOnCanvas(ctx, canvas.width, canvas.height, overlay);
  }, []);

  const startRecording = useCallback(async (slides: SlideImage[], preAcquiredAudio?: MediaStream | null) => {
    if (typeof MediaRecorder === 'undefined') {
      console.warn('[MediaRecorder] MediaRecorder API not available');
      return;
    }
    const mime = pickMimeType();
    if (!mime) {
      console.warn('[MediaRecorder] No supported MIME type found');
      return;
    }
    mimeRef.current = mime;
    console.log('[MediaRecorder] Using MIME type:', mime);

    const testCanvas = document.createElement('canvas');
    if (!testCanvas.captureStream) {
      console.warn('[MediaRecorder] canvas.captureStream not supported');
      return;
    }

    const firstSlide = slides[0];
    if (!firstSlide) {
      console.warn('[MediaRecorder] No slides provided');
      return;
    }

    // Recording canvas at 960x540 max. Keeps encoder bandwidth low so
    // Safari's H.264 doesn't fall behind and drop frames mid-recording.
    const MAX_W = 960;
    const MAX_H = 540;
    const aspect = firstSlide.width / firstSlide.height;
    let recW = firstSlide.width;
    let recH = firstSlide.height;
    if (recW > MAX_W) { recW = MAX_W; recH = Math.round(recW / aspect); }
    if (recH > MAX_H) { recH = MAX_H; recW = Math.round(recH * aspect); }

    const canvas = document.createElement('canvas');
    canvas.width = recW;
    canvas.height = recH;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.warn('[MediaRecorder] Failed to get canvas 2d context');
      return;
    }

    // Attach canvas to the DOM, VISIBLE but small (2x2 px in a corner).
    // Browsers throttle/suspend the render loop for off-viewport or
    // opacity:0 canvases, which silently stops captureStream frame
    // production after ~17s. A tiny visible canvas forces continuous
    // painting, so captureStream(30) stays live for the full recording.
    // Note: intrinsic bitmap (1280x720) is what captureStream samples —
    // the 2x2 CSS size only affects screen layout.
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '2px';
    canvas.style.height = '2px';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '2147483647'; // on top so compositor keeps painting
    document.body.appendChild(canvas);

    canvasRef.current = canvas;
    ctxRef.current = ctx;

    // Draw the first slide BEFORE capturing, so the first frame isn't blank.
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, recW, recH);

    // captureStream(30): browser automatically samples the canvas at 30fps.
    // No manual requestFrame / RAF loop needed — the browser handles frame
    // timing, which gives real-time-synced frame timestamps.
    const canvasStream = canvas.captureStream(30);
    canvasStreamRef.current = canvasStream;

    // Use pre-acquired audio stream, or request mic if not provided
    let audioStream: MediaStream | null = preAcquiredAudio ?? null;
    if (!audioStream) {
      try {
        audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setMicDenied(false);
      } catch {
        setMicDenied(true);
      }
    } else {
      setMicDenied(false);
    }
    audioStreamRef.current = audioStream;

    // Detect unexpected audio-track termination (phone call, headset
    // unplugged). Surface via micDenied; the partial recording is still
    // valuable, so we don't auto-stop.
    if (audioStream) {
      audioStream.getAudioTracks().forEach((track) => {
        track.onended = () => {
          console.warn('[MediaRecorder] audio track ended unexpectedly');
          setMicDenied(true);
        };
      });
    }

    // Combine streams
    const combinedStream = new MediaStream();
    for (const track of canvasStream.getTracks()) {
      combinedStream.addTrack(track);
    }
    if (audioStream) {
      for (const track of audioStream.getTracks()) {
        combinedStream.addTrack(track);
      }
    }

    // Create recorder. IMPORTANT: no timeslice — Safari and Chrome with MP4
    // emit each timeslice chunk as a self-contained MP4 file, so
    // concatenating them would only play back the first chunk. A single
    // stop-time emission produces one valid, complete file.
    // Explicit conservative bitrates keep the encoder from falling behind.
    chunksRef.current = [];
    const recorder = new MediaRecorder(combinedStream, {
      mimeType: mime,
      videoBitsPerSecond: 1_500_000, // 1.5 Mbps — plenty for static slides
      audioBitsPerSecond: 128_000,
    });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };
    recorder.onerror = (e) => {
      console.error('[MediaRecorder] error – stopping:', e);
      cleanup();
    };
    recorderRef.current = recorder;
    recorder.start();
    startTimeRef.current = Date.now();
    userPausedRef.current = false;
    setIsRecording(true);
    console.log(`[MediaRecorder] Recording started (${recW}x${recH}, ${mime}, audio: ${!!audioStream})`);

    // Draw first slide now that capture is live
    drawSlide(firstSlide);

    // Just log visibility changes for diagnostics — do NOT auto-pause.
    // Pausing + resuming MediaRecorder mid-stream corrupts Safari's MP4
    // output. If the tab is briefly hidden, we'd rather have slightly-
    // desynced frames than a broken file.
    const visibilityHandler = () => {
      console.log(`[MediaRecorder] visibility change: hidden=${document.hidden}`);
    };
    document.addEventListener('visibilitychange', visibilityHandler);
    visibilityHandlerRef.current = visibilityHandler;

    // Safari's captureStream(30) only samples on canvas damage — despite
    // the spec saying it should sample on a timer. With mostly-static
    // slides (change every 15s, overlay update 1Hz), damage events are
    // too sparse and the video track truncates mid-recording. Solution:
    // force constant canvas damage at 30fps by drawing a 1x1 nearly-
    // invisible pixel in the bottom-right corner. This guarantees Safari
    // samples a fresh frame every ~33ms for the entire recording.
    let dirtyPhase = 0;
    const dirtyLoop = () => {
      const c = ctxRef.current;
      const cv = canvasRef.current;
      if (!c || !cv) return;
      // Toggle pixel color every frame so there's always real damage
      dirtyPhase = (dirtyPhase + 1) % 2;
      c.fillStyle = dirtyPhase ? 'rgba(0,0,0,0.01)' : 'rgba(255,255,255,0.01)';
      c.fillRect(cv.width - 1, cv.height - 1, 1, 1);
      dirtyLoopIdRef.current = requestAnimationFrame(dirtyLoop);
    };
    dirtyLoopIdRef.current = requestAnimationFrame(dirtyLoop); surface the state of the tracks +
    // recorder so we can see WHERE the video track dies during a run.
    heartbeatIdRef.current = window.setInterval(() => {
      const rec = recorderRef.current;
      const vStream = canvasStreamRef.current;
      const vTrack = vStream?.getVideoTracks()[0];
      const aTrack = audioStreamRef.current?.getAudioTracks()[0];
      const elapsed = ((Date.now() - startTimeRef.current) / 1000).toFixed(1);
      console.log(
        `[MediaRecorder] HB t=${elapsed}s | rec=${rec?.state ?? 'none'} | ` +
        `video=${vTrack?.readyState ?? 'none'}/${vTrack?.muted ? 'muted' : 'live'}/${vTrack?.enabled ? 'en' : 'dis'} | ` +
        `audio=${aTrack?.readyState ?? 'none'}/${aTrack?.muted ? 'muted' : 'live'}/${aTrack?.enabled ? 'en' : 'dis'}`
      );
    }, 5000);
  }, [drawSlide]);

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        console.warn('[MediaRecorder] stopRecording called but no active recorder');
        cleanup();
        resolve(null);
        return;
      }

      const elapsed = Date.now() - startTimeRef.current;
      console.log(`[MediaRecorder] Stopping recording after ${(elapsed / 1000).toFixed(1)}s`);

      // With no timeslice, exactly one dataavailable event fires during stop().
      // Wait for BOTH ondataavailable AND onstop before building the blob —
      // Safari can fire onstop before ondataavailable, which would leave us
      // with empty chunks. We finalize only when both have arrived.
      let dataSeen = false;
      let stopSeen = false;
      let resolved = false;
      const tryFinalize = () => {
        if (resolved || !dataSeen || !stopSeen) return;
        resolved = true;
        const blob = new Blob(chunksRef.current, { type: mimeRef.current });
        console.log(`[MediaRecorder] Final blob: ${(blob.size / 1024 / 1024).toFixed(2)}MB`);
        if (elapsed > 30_000 && blob.size < 100_000) {
          console.warn(`[MediaRecorder] suspiciously small blob: ${blob.size} bytes for ${(elapsed / 1000).toFixed(1)}s — output may be corrupt`);
        }
        chunksRef.current = [];
        cleanup();
        resolve(blob);
      };

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
        console.log(`[MediaRecorder] dataavailable fired, size=${e.data?.size ?? 0}`);
        dataSeen = true;
        tryFinalize();
      };
      recorder.onstop = () => {
        console.log('[MediaRecorder] onstop fired');
        stopSeen = true;
        tryFinalize();
      };

      // Resume first if paused — stop() only flushes cleanly from
      // 'recording' state.
      try {
        if (recorder.state === 'paused') recorder.resume();
      } catch { /* ignore */ }

      try {
        recorder.stop();
      } catch (e) {
        console.error('[MediaRecorder] recorder.stop() threw:', e);
        cleanup();
        resolved = true;
        resolve(null);
        return;
      }

      // Safety timeout: resolve with whatever we have if neither event
      // fires within 8s. In practice stop() + ondataavailable fire within
      // ~200ms, but give plenty of slack for slow hardware.
      setTimeout(() => {
        if (resolved) return;
        console.warn(`[MediaRecorder] stop timeout — dataSeen=${dataSeen}, stopSeen=${stopSeen}`);
        resolved = true;
        const blob = new Blob(chunksRef.current, { type: mimeRef.current });
        chunksRef.current = [];
        cleanup();
        resolve(blob);
      }, 8000);
    });
  }, []);

  const setPaused = useCallback((paused: boolean) => {
    userPausedRef.current = paused;
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;

    if (paused && recorder.state === 'recording') {
      recorder.pause();
    } else if (!paused && recorder.state === 'paused') {
      recorder.resume();
    }
  }, []);

  function cleanup() {
    userPausedRef.current = false;

    if (heartbeatIdRef.current) {
      clearInterval(heartbeatIdRef.current);
      heartbeatIdRef.current = 0;
    }

    if (dirtyLoopIdRef.current) {
      cancelAnimationFrame(dirtyLoopIdRef.current);
      dirtyLoopIdRef.current = 0;
    }

    // Remove tab-visibility listener
    if (visibilityHandlerRef.current) {
      document.removeEventListener('visibilitychange', visibilityHandlerRef.current);
      visibilityHandlerRef.current = null;
    }

    // Clear audio-track onended handlers before stopping tracks, so
    // track.stop() doesn't trigger a false-positive setMicDenied.
    audioStreamRef.current?.getAudioTracks().forEach((track) => {
      track.onended = null;
    });

    // Stop all audio tracks
    audioStreamRef.current?.getTracks().forEach((t) => t.stop());
    audioStreamRef.current = null;

    // Stop canvas stream tracks
    canvasStreamRef.current?.getTracks().forEach((t) => t.stop());
    canvasStreamRef.current = null;

    // Remove canvas from DOM
    if (canvasRef.current && canvasRef.current.parentNode) {
      canvasRef.current.parentNode.removeChild(canvasRef.current);
    }

    canvasRef.current = null;
    ctxRef.current = null;
    recorderRef.current = null;
    lastImageRef.current = null;
    setIsRecording(false);
  }

  return {
    startRecording,
    stopRecording,
    drawSlide,
    updateOverlay,
    setPaused,
    isRecording,
    micDenied,
  };
}
