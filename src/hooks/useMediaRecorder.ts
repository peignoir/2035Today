import { useRef, useState, useCallback } from 'react';
import type { SlideImage } from '../types';

function pickMimeType(): string {
  // Keep strings plain — some Safari versions reject fully-qualified codec
  // strings (e.g. 'video/mp4;codecs=avc1,mp4a.40.2') even when the underlying
  // codec is supported. Plain MIME + browser default codec is the most robust.
  const candidates = [
    'video/mp4',                    // Safari 14.1+, Chrome 126+
    'video/webm;codecs=vp8,opus',   // Chrome/Firefox
    'video/webm',                   // Chrome/Firefox fallback
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
  const frameLoopIdRef = useRef<number>(0);
  const pausedRef = useRef(false);
  const userPausedRef = useRef(false); // paused by the user via setPaused
  const visibilityHandlerRef = useRef<(() => void) | null>(null);

  const pushFrame = useCallback(() => {
    const stream = canvasStreamRef.current;
    const videoTrack = stream?.getVideoTracks()[0];
    if (videoTrack && 'requestFrame' in videoTrack) {
      (videoTrack as CanvasCaptureMediaStreamTrack).requestFrame();
    }
  }, []);

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
      pushFrame();
    };
    img.src = slide.objectUrl;
  }, [pushFrame]);

  /** Redraw cached slide + updated overlay (called every second for timer updates) */
  const updateOverlay = useCallback((overlay: OverlayInfo) => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    const img = lastImageRef.current;
    if (!ctx || !canvas || !img) return;

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    drawOverlayOnCanvas(ctx, canvas.width, canvas.height, overlay);
    pushFrame();
  }, [pushFrame]);

  const startRecording = useCallback(async (slides: SlideImage[], preAcquiredAudio?: MediaStream | null) => {
    // Check browser support
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

    // Bail if captureStream not supported
    const testCanvas = document.createElement('canvas');
    if (!testCanvas.captureStream) {
      console.warn('[MediaRecorder] canvas.captureStream not supported');
      return;
    }

    // Create offscreen canvas – cap at 1280×720 to keep memory low during 5-min recordings.
    // Slides are rendered at 2× for display, but that resolution is overkill for recording.
    const firstSlide = slides[0];
    if (!firstSlide) {
      console.warn('[MediaRecorder] No slides provided');
      return;
    }

    const MAX_W = 1280;
    const MAX_H = 720;
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

    // Attach canvas to DOM (hidden off-screen) — Safari only emits capture
    // frames from canvases that are actually painted. A fully detached
    // canvas produces a frozen/single-frame video track.
    canvas.style.position = 'fixed';
    canvas.style.left = '-99999px';
    canvas.style.top = '0';
    canvas.style.pointerEvents = 'none';
    canvas.style.opacity = '0';
    document.body.appendChild(canvas);

    canvasRef.current = canvas;
    ctxRef.current = ctx;

    // Use captureStream(0) so frames are emitted ONLY when we call
    // requestFrame(). Our RAF loop calls requestFrame() at ~30fps, so
    // the stream gets steady real-time frame timestamps. Mixing auto-
    // capture (captureStream(30)) with manual requestFrame() has
    // undefined behavior in some browsers.
    const canvasStream = canvas.captureStream(0);
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

    // Detect unexpected audio-track termination (phone call, system audio
    // interrupt, headset unplugged). Log + surface via micDenied so the
    // parent can display feedback. Don't auto-stop — the partial recording
    // is still valuable.
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

    // Create recorder
    chunksRef.current = [];
    const recorder = new MediaRecorder(combinedStream, { mimeType: mime });
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
    // IMPORTANT: no timeslice. Safari (and Chrome with MP4) emit each
    // timeslice chunk as a self-contained MP4 file rather than a
    // concatenable fragment. If we pass a timeslice, the resulting blob
    // only plays back the first chunk. A single stop-time emission
    // produces one valid, complete MP4/WebM file.
    recorder.start();
    startTimeRef.current = Date.now();
    pausedRef.current = false;
    userPausedRef.current = false;
    setIsRecording(true);
    console.log(`[MediaRecorder] Recording started (${recW}x${recH}, ${mime}, audio: ${!!audioStream})`);

    // Pause recording + RAF frame loop when the tab is backgrounded — the
    // browser throttles requestAnimationFrame to ~1Hz on hidden tabs, which
    // would desync video timestamps from audio. Resume when visible again,
    // unless the user has paused manually.
    const visibilityHandler = () => {
      const rec = recorderRef.current;
      if (!rec || rec.state === 'inactive') return;
      if (document.hidden) {
        if (rec.state === 'recording') {
          console.log('[MediaRecorder] tab hidden — pausing');
          pausedRef.current = true;
          try { rec.pause(); } catch { /* ignore */ }
        }
      } else {
        // Only auto-resume if the user hasn't manually paused.
        if (rec.state === 'paused' && !userPausedRef.current) {
          console.log('[MediaRecorder] tab visible — resuming');
          pausedRef.current = false;
          try { rec.resume(); } catch { /* ignore */ }
        }
      }
    };
    document.addEventListener('visibilitychange', visibilityHandler);
    visibilityHandlerRef.current = visibilityHandler;

    // Draw first slide (overlay will be added by PresentationScreen interval)
    drawSlide(firstSlide);

    // Drive the canvas stream at ~15fps. Slides change once every 15s and
    // the countdown overlay updates once per second, so 15fps is plenty and
    // halves the encoder load vs 30fps. At 30fps with 1280x720, Safari's
    // software H.264 encoder falls behind and drops the last several seconds
    // of frames when stop() is called.
    const FRAME_INTERVAL_MS = 1000 / 15;
    let lastFrameTime = performance.now();
    let frameCount = 0;
    let lastLogTime = performance.now();
    const frameLoop = () => {
      if (!canvasStreamRef.current) return; // stopped
      const now = performance.now();
      if (!pausedRef.current && now - lastFrameTime >= FRAME_INTERVAL_MS) {
        pushFrame();
        frameCount++;
        lastFrameTime = now;
      }
      // Log frame throughput every 10s
      if (now - lastLogTime >= 10_000) {
        console.log(`[MediaRecorder] frames pushed: ${frameCount} (last 10s), total elapsed: ${((now - lastLogTime) / 1000).toFixed(1)}s`);
        frameCount = 0;
        lastLogTime = now;
      }
      frameLoopIdRef.current = requestAnimationFrame(frameLoop);
    };
    frameLoopIdRef.current = requestAnimationFrame(frameLoop);
  }, [drawSlide, pushFrame]);

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        console.warn('[MediaRecorder] stopRecording called but no active recorder (state:', recorder?.state ?? 'null', ')');
        cleanup();
        resolve(null);
        return;
      }

      const elapsed = Date.now() - startTimeRef.current;
      console.log(`[MediaRecorder] Stopping recording after ${(elapsed / 1000).toFixed(1)}s, chunks so far: ${chunksRef.current.length}`);

      // With no timeslice, exactly one dataavailable event fires during stop().
      // We must wait for BOTH ondataavailable AND onstop before building the
      // blob — the event order isn't guaranteed across browsers, and if we
      // build the blob in onstop alone, Safari sometimes reports empty chunks.
      let dataSeen = false;
      let stopSeen = false;
      let resolved = false;
      const tryFinalize = () => {
        if (resolved || !dataSeen || !stopSeen) return;
        resolved = true;
        const blob = new Blob(chunksRef.current, { type: mimeRef.current });
        console.log(`[MediaRecorder] Final blob: ${(blob.size / 1024 / 1024).toFixed(2)}MB (${chunksRef.current.length} chunks)`);
        // Sanity check: if we recorded >30s but got <100KB, the encoder likely
        // produced a malformed/partial file. Log for diagnostics — the parent
        // still decides via onRecordingComplete/onRecordingFailed.
        if (elapsed > 30_000 && blob.size < 100_000) {
          console.warn(`[MediaRecorder] suspiciously small blob: ${blob.size} bytes for ${(elapsed / 1000).toFixed(1)}s recording — output may be corrupt`);
        }
        chunksRef.current = [];
        cleanup();
        resolve(blob);
      };

      // Replace the ondataavailable handler to also fire tryFinalize.
      // (The original handler pushes to chunksRef, same behavior.)
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
        console.log(`[MediaRecorder] dataavailable fired, size=${e.data?.size ?? 0}, total chunks=${chunksRef.current.length}`);
        dataSeen = true;
        tryFinalize();
      };
      recorder.onstop = () => {
        console.log('[MediaRecorder] onstop fired');
        stopSeen = true;
        tryFinalize();
      };

      // Resume first if paused — stop only flushes from 'recording' state cleanly.
      try {
        if (recorder.state === 'paused') {
          recorder.resume();
        }
      } catch {
        // safe to ignore
      }

      // Stop pushing new frames into the canvas stream so the H.264 encoder
      // can catch up with its queue before we call recorder.stop(). Safari's
      // software encoder runs asynchronously and falls behind on 720p content;
      // if we call stop() while its input queue is full, the trailing frames
      // are discarded and the video freezes several seconds before the end.
      pausedRef.current = true; // halts pushFrame() in the RAF loop
      const FLUSH_DELAY_MS = 800;
      setTimeout(() => {
        try {
          recorder.stop();
        } catch (e) {
          console.error('[MediaRecorder] recorder.stop() threw:', e);
          cleanup();
          resolved = true;
          resolve(null);
        }
      }, FLUSH_DELAY_MS);

      // Safety timeout: if neither event fires within 5s, resolve with whatever we have.
      setTimeout(() => {
        if (resolved) return;
        console.warn(`[MediaRecorder] stop timeout reached — dataSeen=${dataSeen}, stopSeen=${stopSeen}, chunks=${chunksRef.current.length}`);
        resolved = true;
        const blob = new Blob(chunksRef.current, { type: mimeRef.current });
        chunksRef.current = [];
        cleanup();
        resolve(blob);
      }, 5000);
    });
  }, []);

  const setPaused = useCallback((paused: boolean) => {
    pausedRef.current = paused;
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
    // Stop the frame-push RAF loop
    if (frameLoopIdRef.current) {
      cancelAnimationFrame(frameLoopIdRef.current);
      frameLoopIdRef.current = 0;
    }
    pausedRef.current = false;
    userPausedRef.current = false;

    // Remove tab-visibility listener
    if (visibilityHandlerRef.current) {
      document.removeEventListener('visibilitychange', visibilityHandlerRef.current);
      visibilityHandlerRef.current = null;
    }

    // Clear audio-track onended handlers
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
