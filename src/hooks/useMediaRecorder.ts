import { useCallback, useRef, useState, type MutableRefObject } from 'react';
import type { SlideImage } from '../types';
import {
  drawOverlayOnCanvas,
  getRecordingCanvasSize,
  type OverlayInfo,
} from '../lib/recordingOverlay';

const FINAL_FRAME_SETTLE_MS = 250;
const RECORDER_STOP_TIMEOUT_MS = 8_000;
const SAFARI_VIDEO_BITRATE = 1_200_000;
const DEFAULT_VIDEO_BITRATE = 900_000;
const AUDIO_BITRATE = 64_000;
const FRAME_PUMP_FPS = 5;
const FRAME_PUMP_INTERVAL_MS = Math.round(1000 / FRAME_PUMP_FPS);
const RECORDER_TIMESLICE_MS = 1_000;

function isProbablySafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /Safari\//.test(ua) && !/(Chrome|Chromium|Edg|OPR|Firefox|CriOS|FxiOS|EdgiOS|OPiOS)/.test(ua);
}

function getVideoBitrate(): number {
  return isProbablySafari() ? SAFARI_VIDEO_BITRATE : DEFAULT_VIDEO_BITRATE;
}

function pickVideoMimeType(): string {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return '';
  }

  const canPlay = (mime: string): boolean => {
    const video = document.createElement('video');
    return video.canPlayType(mime) !== '';
  };

  const webmCandidates = [
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp8',
    'video/webm',
  ];
  const mp4Candidates = [
    'video/mp4;codecs=avc1,mp4a.40.2',
    'video/mp4;codecs=avc1',
    'video/mp4',
  ];
  const candidates = isProbablySafari()
    ? [...mp4Candidates, ...webmCandidates]
    : [...webmCandidates, ...mp4Candidates];

  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime) && canPlay(mime)) return mime;
  }

  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }

  return '';
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function stopRecorder(
  recorder: MediaRecorder,
  mimeType: string,
  chunksRef: MutableRefObject<Blob[]>,
): Promise<Blob | null> {
  return new Promise((resolve, reject) => {
    if (recorder.state === 'inactive') {
      const blob = chunksRef.current.length > 0
        ? new Blob(chunksRef.current, { type: mimeType || recorder.mimeType || 'video/mp4' })
        : null;
      resolve(blob);
      return;
    }

    let dataSeen = false;
    let stopSeen = false;
    let settled = false;

    const finalize = () => {
      if (settled || !dataSeen || !stopSeen) return;
      settled = true;
      const blob = chunksRef.current.length > 0
        ? new Blob(chunksRef.current, { type: mimeType || recorder.mimeType || 'video/mp4' })
        : null;
      resolve(blob);
    };

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
      console.log(`[MediaRecorder] dataavailable fired, size=${event.data?.size ?? 0}`);
      dataSeen = true;
      finalize();
    };

    recorder.onstop = () => {
      console.log('[MediaRecorder] onstop fired');
      stopSeen = true;
      finalize();
    };

    recorder.onerror = (event) => {
      if (settled) return;
      settled = true;
      reject(new Error(`Recording finalization failed: ${String(event)}`));
    };

    try {
      recorder.stop();
    } catch (error) {
      if (settled) return;
      settled = true;
      reject(error instanceof Error ? error : new Error('Failed to stop recorder'));
      return;
    }

    window.setTimeout(() => {
      if (settled) return;
      settled = true;
      console.warn(`[MediaRecorder] stop timeout — dataSeen=${dataSeen}, stopSeen=${stopSeen}`);
      const blob = chunksRef.current.length > 0
        ? new Blob(chunksRef.current, { type: mimeType || recorder.mimeType || 'video/mp4' })
        : null;
      resolve(blob);
    }, RECORDER_STOP_TIMEOUT_MS);
  });
}

export type { OverlayInfo } from '../lib/recordingOverlay';

export interface MediaRecorderHandle {
  startRecording: (slides: SlideImage[], preAcquiredAudio?: MediaStream | null) => Promise<void>;
  stopRecording: (finalActiveDurationMs?: number) => Promise<Blob | null>;
  drawSlide: (slide: SlideImage, overlay?: OverlayInfo) => void;
  updateOverlay: (overlay: OverlayInfo) => void;
  setPaused: (paused: boolean) => void;
  isRecording: boolean;
  isProcessing: boolean;
  processingLabel: string;
  processingProgress: number | null;
  micDenied: boolean;
}

export function useMediaRecorder(): MediaRecorderHandle {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingLabel, setProcessingLabel] = useState('');
  const [processingProgress, setProcessingProgress] = useState<number | null>(null);
  const [micDenied, setMicDenied] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const canvasStreamRef = useRef<MediaStream | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeRef = useRef('');
  const startedAtRef = useRef(0);
  const overlayRef = useRef<OverlayInfo | null>(null);
  const lastImageRef = useRef<HTMLImageElement | null>(null);
  const drawTokenRef = useRef(0);
  const framePumpIdRef = useRef<number>(0);
  const framePumpPhaseRef = useRef(0);

  const cleanup = useCallback(() => {
    recorderRef.current = null;

    audioStreamRef.current?.getAudioTracks().forEach((track) => {
      track.onended = null;
    });
    audioStreamRef.current?.getTracks().forEach((track) => track.stop());
    audioStreamRef.current = null;

    canvasStreamRef.current?.getTracks().forEach((track) => track.stop());
    canvasStreamRef.current = null;

    if (canvasRef.current?.parentNode) {
      canvasRef.current.parentNode.removeChild(canvasRef.current);
    }

    canvasRef.current = null;
    ctxRef.current = null;
    chunksRef.current = [];
    mimeRef.current = '';
    startedAtRef.current = 0;
    overlayRef.current = null;
    lastImageRef.current = null;
    drawTokenRef.current = 0;
    if (framePumpIdRef.current) {
      window.clearInterval(framePumpIdRef.current);
      framePumpIdRef.current = 0;
    }
    framePumpPhaseRef.current = 0;

    setIsRecording(false);
    setIsProcessing(false);
    setProcessingLabel('');
    setProcessingProgress(null);
  }, []);

  const tickFramePump = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;

    framePumpPhaseRef.current = framePumpPhaseRef.current === 0 ? 1 : 0;
    ctx.fillStyle = framePumpPhaseRef.current === 0 ? 'rgba(0,0,0,0.015)' : 'rgba(255,255,255,0.015)';
    ctx.fillRect(canvas.width - 1, canvas.height - 1, 1, 1);
  }, []);

  const paintCurrentFrame = useCallback((): boolean => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    const img = lastImageRef.current;
    if (!canvas || !ctx || !img) return false;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    if (overlayRef.current) {
      drawOverlayOnCanvas(ctx, canvas.width, canvas.height, overlayRef.current);
    }

    return true;
  }, []);

  const rememberOverlay = useCallback((overlay?: OverlayInfo) => {
    if (!overlay) return;
    overlayRef.current = overlay;
  }, []);

  const drawSlide = useCallback((slide: SlideImage, overlay?: OverlayInfo) => {
    rememberOverlay(overlay);

    const token = drawTokenRef.current + 1;
    drawTokenRef.current = token;

    const image = new Image();
    image.decoding = 'async';
    image.onload = () => {
      if (token !== drawTokenRef.current) return;
      lastImageRef.current = image;
      paintCurrentFrame();
    };
    image.onerror = () => {
      if (token !== drawTokenRef.current) return;
      console.error(`[MediaRecorder] Failed to load slide image: ${slide.objectUrl}`);
    };
    image.src = slide.objectUrl;
  }, [paintCurrentFrame, rememberOverlay]);

  const updateOverlay = useCallback((overlay: OverlayInfo) => {
    rememberOverlay(overlay);
    paintCurrentFrame();
  }, [paintCurrentFrame, rememberOverlay]);

  const startRecording = useCallback(async (slides: SlideImage[], preAcquiredAudio?: MediaStream | null) => {
    cleanup();

    if (slides.length === 0) {
      throw new Error('No slides provided for recording.');
    }
    if (typeof MediaRecorder === 'undefined') {
      throw new Error('This browser does not support recording.');
    }

    const requestedMimeType = pickVideoMimeType();
    if (!requestedMimeType) {
      throw new Error('This browser does not support a recording format we can use.');
    }

    const probeCanvas = document.createElement('canvas');
    if (typeof probeCanvas.captureStream !== 'function') {
      throw new Error('Canvas capture is not available in this browser.');
    }

    const size = getRecordingCanvasSize(slides[0]);
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '2px';
    canvas.style.height = '2px';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '2147483647';
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      cleanup();
      throw new Error('Failed to create recording canvas.');
    }

    canvasRef.current = canvas;
    ctxRef.current = ctx;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const canvasStream = canvas.captureStream(FRAME_PUMP_FPS);
    const canvasTrack = canvasStream.getVideoTracks()[0];
    if (!canvasTrack) {
      cleanup();
      throw new Error('Failed to create a video track for recording.');
    }

    canvasStreamRef.current = canvasStream;

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
    audioStream?.getAudioTracks().forEach((track) => {
      track.onended = () => {
        console.warn('[MediaRecorder] audio track ended unexpectedly');
        setMicDenied(true);
      };
    });

    const combinedStream = new MediaStream();
    combinedStream.addTrack(canvasTrack);
    audioStream?.getAudioTracks().forEach((track) => combinedStream.addTrack(track));

    chunksRef.current = [];
    mimeRef.current = requestedMimeType;

    let recorder: MediaRecorder;
    const videoBitrate = getVideoBitrate();
    try {
      recorder = new MediaRecorder(combinedStream, {
        mimeType: requestedMimeType,
        videoBitsPerSecond: videoBitrate,
        audioBitsPerSecond: audioStream?.getAudioTracks().length ? AUDIO_BITRATE : undefined,
      });
    } catch (error) {
      cleanup();
      throw error instanceof Error ? error : new Error('Failed to start recording.');
    }
    const actualMimeType = recorder.mimeType || requestedMimeType;
    mimeRef.current = actualMimeType;

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };
    recorder.onerror = (event) => {
      console.error('[MediaRecorder] recorder error:', event);
    };

    recorderRef.current = recorder;
    startedAtRef.current = Date.now();
    recorder.start(RECORDER_TIMESLICE_MS);

    setIsRecording(true);
    console.log(`[MediaRecorder] Requested MIME type: ${requestedMimeType}`);
    console.log(`[MediaRecorder] Recorder MIME type: ${actualMimeType}`);
    console.log(
      `[MediaRecorder] Recording started (${size.width}x${size.height}, ${actualMimeType}, ` +
      `mode=${FRAME_PUMP_FPS}fps-auto, vbr=${Math.round(videoBitrate / 1000)}kbps, ` +
      `abr=${audioStream ? Math.round(AUDIO_BITRATE / 1000) : 0}kbps, audio: ${!!audioStream})`,
    );

    drawSlide(slides[0], overlayRef.current ?? undefined);
    framePumpIdRef.current = window.setInterval(() => {
      tickFramePump();
    }, FRAME_PUMP_INTERVAL_MS);
  }, [cleanup, drawSlide, tickFramePump]);

  const stopRecording = useCallback(async (_finalActiveDurationMs?: number): Promise<Blob | null> => {
    void _finalActiveDurationMs;
    const recorder = recorderRef.current;
    if (!recorder) {
      cleanup();
      return null;
    }

    const elapsedMs = startedAtRef.current > 0 ? Date.now() - startedAtRef.current : 0;
    console.log(`[MediaRecorder] Stopping recording after ${(elapsedMs / 1000).toFixed(1)}s`);

    setIsRecording(false);
    setIsProcessing(true);
    setProcessingLabel('Finalizing recording');
    setProcessingProgress(null);

    if (paintCurrentFrame()) {
      await wait(FINAL_FRAME_SETTLE_MS);
    }

    try {
      const blob = await stopRecorder(recorder, mimeRef.current, chunksRef);
      if (blob) {
        console.log(`[MediaRecorder] Final blob: ${(blob.size / 1024 / 1024).toFixed(2)}MB`);
      }
      cleanup();
      return blob && blob.size > 0 ? blob : null;
    } catch (error) {
      cleanup();
      throw error instanceof Error ? error : new Error('Recording finalization failed.');
    }
  }, [cleanup, paintCurrentFrame]);

  const setPaused = useCallback((_paused: boolean) => {
    void _paused;
    // Intentionally keep MediaRecorder running. Safari MP4 output is more
    // reliable when we leave the native encoder in recording state.
  }, []);

  return {
    startRecording,
    stopRecording,
    drawSlide,
    updateOverlay,
    setPaused,
    isRecording,
    isProcessing,
    processingLabel,
    processingProgress,
    micDenied,
  };
}
