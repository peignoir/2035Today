import { useCallback, useRef, useState, type MutableRefObject } from 'react';
import type { SlideImage } from '../types';
import {
  exportPresentationRecording,
  type PauseRange,
  type ExportProgress,
} from '../lib/presentationExport';
import { SLIDE_DURATION_MS, type OverlayInfo } from '../lib/recordingOverlay';

function pickAudioMimeType(): string {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return '';
  }

  const candidates = [
    'audio/webm;codecs=opus',
    'audio/mp4;codecs=mp4a.40.2',
    'audio/webm',
    'audio/mp4',
  ];

  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }

  return '';
}

export type { OverlayInfo } from '../lib/recordingOverlay';

export interface MediaRecorderHandle {
  startRecording: (slides: SlideImage[], preAcquiredAudio?: MediaStream | null) => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  drawSlide: (_slide: SlideImage, overlay?: OverlayInfo) => void;
  updateOverlay: (overlay: OverlayInfo) => void;
  setPaused: (paused: boolean) => void;
  isRecording: boolean;
  isProcessing: boolean;
  processingLabel: string;
  processingProgress: number | null;
  micDenied: boolean;
}

async function stopAudioRecorder(
  recorder: MediaRecorder,
  mimeType: string,
  chunksRef: MutableRefObject<Blob[]>,
): Promise<Blob | null> {
  return new Promise((resolve, reject) => {
    if (recorder.state === 'inactive') {
      const blob = chunksRef.current.length > 0
        ? new Blob(chunksRef.current, { type: mimeType || recorder.mimeType || 'application/octet-stream' })
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
        ? new Blob(chunksRef.current, { type: mimeType || recorder.mimeType || 'application/octet-stream' })
        : null;
      resolve(blob);
    };

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
      dataSeen = true;
      finalize();
    };

    recorder.onstop = () => {
      stopSeen = true;
      finalize();
    };

    recorder.onerror = () => {
      if (settled) return;
      settled = true;
      reject(new Error('Audio recording failed while finalizing'));
    };

    try {
      recorder.stop();
    } catch (error) {
      if (settled) return;
      settled = true;
      reject(error instanceof Error ? error : new Error('Failed to stop audio recorder'));
      return;
    }

    window.setTimeout(() => {
      if (settled) return;
      settled = true;
      const blob = chunksRef.current.length > 0
        ? new Blob(chunksRef.current, { type: mimeType || recorder.mimeType || 'application/octet-stream' })
        : null;
      resolve(blob);
    }, 8_000);
  });
}

export function useMediaRecorder(): MediaRecorderHandle {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingLabel, setProcessingLabel] = useState('');
  const [processingProgress, setProcessingProgress] = useState<number | null>(null);
  const [micDenied, setMicDenied] = useState(false);

  const slidesRef = useRef<SlideImage[]>([]);
  const overlayBaseRef = useRef<Omit<OverlayInfo, 'currentSlide' | 'slideSecondsLeft'>>({
    eventTitle: '',
    storyName: '',
    speakerName: '',
    totalSlides: 0,
  });
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioMimeRef = useRef('');
  const startedAtRef = useRef(0);
  const openPauseStartedAtRef = useRef<number | null>(null);
  const pauseRangesRef = useRef<PauseRange[]>([]);

  const applyProgress = useCallback((progress: ExportProgress) => {
    setProcessingLabel(progress.label);
    setProcessingProgress(progress.progress);
  }, []);

  const rememberOverlay = useCallback((overlay?: OverlayInfo) => {
    if (!overlay) return;
    overlayBaseRef.current = {
      eventTitle: overlay.eventTitle,
      storyName: overlay.storyName,
      speakerName: overlay.speakerName,
      totalSlides: overlay.totalSlides,
    };
  }, []);

  const cleanup = useCallback(() => {
    recorderRef.current = null;

    audioStreamRef.current?.getAudioTracks().forEach((track) => {
      track.onended = null;
    });
    audioStreamRef.current?.getTracks().forEach((track) => track.stop());
    audioStreamRef.current = null;

    chunksRef.current = [];
    slidesRef.current = [];
    overlayBaseRef.current = {
      eventTitle: '',
      storyName: '',
      speakerName: '',
      totalSlides: 0,
    };
    audioMimeRef.current = '';
    startedAtRef.current = 0;
    openPauseStartedAtRef.current = null;
    pauseRangesRef.current = [];
    setIsRecording(false);
    setIsProcessing(false);
    setProcessingLabel('');
    setProcessingProgress(null);
  }, []);

  const startRecording = useCallback(async (slides: SlideImage[], preAcquiredAudio?: MediaStream | null) => {
    if (slides.length === 0) {
      throw new Error('No slides provided for recording');
    }

    cleanup();
    slidesRef.current = slides;
    overlayBaseRef.current = {
      eventTitle: '',
      storyName: '',
      speakerName: '',
      totalSlides: slides.length,
    };
    pauseRangesRef.current = [];
    openPauseStartedAtRef.current = null;
    chunksRef.current = [];
    startedAtRef.current = performance.now();
    setMicDenied(false);

    let audioStream: MediaStream | null = preAcquiredAudio ?? null;
    if (!audioStream) {
      try {
        audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        setMicDenied(true);
      }
    }

    audioStreamRef.current = audioStream;

    audioStream?.getAudioTracks().forEach((track) => {
      track.onended = () => {
        setMicDenied(true);
      };
    });

    if (audioStream && typeof MediaRecorder !== 'undefined') {
      const mimeType = pickAudioMimeType();
      audioMimeRef.current = mimeType;

      try {
        const recorder = mimeType
          ? new MediaRecorder(audioStream, { mimeType, audioBitsPerSecond: 128_000 })
          : new MediaRecorder(audioStream);

        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            chunksRef.current.push(event.data);
          }
        };
        recorder.onerror = (event) => {
          console.error('[Recording] audio recorder error:', event);
        };
        recorder.start();
        recorderRef.current = recorder;
      } catch (error) {
        console.error('[Recording] failed to start audio recorder:', error);
        setMicDenied(true);
      }
    }

    setIsRecording(true);
  }, [cleanup]);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    if (startedAtRef.current === 0) {
      cleanup();
      return null;
    }

    const stoppedAt = performance.now();
    if (openPauseStartedAtRef.current !== null) {
      pauseRangesRef.current.push({
        startMs: openPauseStartedAtRef.current - startedAtRef.current,
        endMs: stoppedAt - startedAtRef.current,
      });
      openPauseStartedAtRef.current = null;
    }

    const wallDurationMs = Math.max(0, stoppedAt - startedAtRef.current);
    const totalPausedMs = pauseRangesRef.current.reduce(
      (sum, range) => sum + Math.max(0, range.endMs - range.startMs),
      0,
    );
    const maxDurationMs = slidesRef.current.length * SLIDE_DURATION_MS;
    const activeDurationMs = Math.max(
      0,
      Math.min(maxDurationMs, wallDurationMs - totalPausedMs),
    );

    setIsRecording(false);
    setIsProcessing(true);
    setProcessingLabel('Finalizing audio');
    setProcessingProgress(null);

    try {
      let audioBlob: Blob | null = null;
      const recorder = recorderRef.current;
      if (recorder) {
        audioBlob = await stopAudioRecorder(recorder, audioMimeRef.current, chunksRef);
      }

      const blob = await exportPresentationRecording({
        slides: slidesRef.current,
        overlayBase: overlayBaseRef.current,
        activeDurationMs,
        wallDurationMs,
        pauseRanges: pauseRangesRef.current,
        audioBlob,
        audioMimeType: audioMimeRef.current,
        onProgress: applyProgress,
      });

      cleanup();
      return blob;
    } catch (error) {
      cleanup();
      throw error instanceof Error ? error : new Error('Recording export failed');
    }
  }, [applyProgress, cleanup]);

  const drawSlide = useCallback((_slide: SlideImage, overlay?: OverlayInfo) => {
    rememberOverlay(overlay);
  }, [rememberOverlay]);

  const updateOverlay = useCallback((overlay: OverlayInfo) => {
    rememberOverlay(overlay);
  }, [rememberOverlay]);

  const setPaused = useCallback((paused: boolean) => {
    if (startedAtRef.current === 0) return;
    const now = performance.now();

    if (paused) {
      if (openPauseStartedAtRef.current === null) {
        openPauseStartedAtRef.current = now;
      }
      return;
    }

    if (openPauseStartedAtRef.current !== null) {
      pauseRangesRef.current.push({
        startMs: openPauseStartedAtRef.current - startedAtRef.current,
        endMs: now - startedAtRef.current,
      });
      openPauseStartedAtRef.current = null;
    }
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
