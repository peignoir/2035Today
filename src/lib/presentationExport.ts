import type { FFmpeg } from '@ffmpeg/ffmpeg';
import type { SlideImage } from '../types';
import {
  buildOverlayForElapsed,
  drawOverlayOnCanvas,
  getRecordingCanvasSize,
  type OverlayInfo,
} from './recordingOverlay';

const FRAME_INTERVAL_MS = 1_000;
const INPUT_FPS = 1000 / FRAME_INTERVAL_MS;
const OUTPUT_FPS = 30;
const PNG_TIMEOUT_MS = 10_000;

export interface PauseRange {
  startMs: number;
  endMs: number;
}

export interface ExportProgress {
  label: string;
  progress: number | null;
}

interface ExportPresentationRecordingOptions {
  slides: SlideImage[];
  overlayBase: Omit<OverlayInfo, 'currentSlide' | 'slideSecondsLeft'>;
  activeDurationMs: number;
  wallDurationMs: number;
  pauseRanges: PauseRange[];
  audioBlob?: Blob | null;
  audioMimeType?: string;
  onProgress?: (progress: ExportProgress) => void;
}

let ffmpegPromise: Promise<FFmpeg> | null = null;

function sanitizeProgress(progress: number): number {
  if (!Number.isFinite(progress)) return 0;
  return Math.max(0, Math.min(progress, 1));
}

function setProgress(
  callback: ExportPresentationRecordingOptions['onProgress'],
  label: string,
  progress: number | null,
) {
  callback?.({
    label,
    progress: progress === null ? null : sanitizeProgress(progress),
  });
}

async function getFFmpeg(): Promise<FFmpeg> {
  if (!ffmpegPromise) {
    ffmpegPromise = (async () => {
      const [{ FFmpeg }, { default: ffmpegWorkerUrl }, { default: ffmpegCoreUrl }, { default: ffmpegWasmUrl }] = await Promise.all([
        import('@ffmpeg/ffmpeg'),
        import('@ffmpeg/ffmpeg/worker?url'),
        import('@ffmpeg/core?url'),
        import('@ffmpeg/core/wasm?url'),
      ]);
      const ffmpeg = new FFmpeg();
      await ffmpeg.load({
        classWorkerURL: ffmpegWorkerUrl,
        coreURL: ffmpegCoreUrl,
        wasmURL: ffmpegWasmUrl,
      });
      return ffmpeg;
    })().catch((error) => {
      ffmpegPromise = null;
      throw error;
    });
  }

  return ffmpegPromise;
}

export async function preloadPresentationExporter(): Promise<void> {
  await getFFmpeg();
}

function guessAudioExtension(mimeType: string): string {
  if (mimeType.includes('webm')) return 'webm';
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('mp4') || mimeType.includes('m4a') || mimeType.includes('aac')) return 'm4a';
  return 'webm';
}

function msToSeconds(ms: number): string {
  return (ms / 1000).toFixed(3);
}

function buildActiveSegments(wallDurationMs: number, pauseRanges: PauseRange[]): PauseRange[] {
  const safeWallDurationMs = Math.max(0, wallDurationMs);
  const pauses = [...pauseRanges]
    .map((range) => ({
      startMs: Math.max(0, Math.min(range.startMs, safeWallDurationMs)),
      endMs: Math.max(0, Math.min(range.endMs, safeWallDurationMs)),
    }))
    .filter((range) => range.endMs > range.startMs)
    .sort((a, b) => a.startMs - b.startMs);

  const active: PauseRange[] = [];
  let cursor = 0;

  for (const pause of pauses) {
    if (pause.startMs > cursor) {
      active.push({ startMs: cursor, endMs: pause.startMs });
    }
    cursor = Math.max(cursor, pause.endMs);
  }

  if (cursor < safeWallDurationMs) {
    active.push({ startMs: cursor, endMs: safeWallDurationMs });
  }

  return active.filter((segment) => segment.endMs - segment.startMs >= 10);
}

function buildAudioFilter(activeSegments: PauseRange[]): string | null {
  if (activeSegments.length === 0) return null;

  if (activeSegments.length === 1) {
    const segment = activeSegments[0];
    return `[1:a]atrim=start=${msToSeconds(segment.startMs)}:end=${msToSeconds(segment.endMs)},asetpts=PTS-STARTPTS,aresample=async=1:first_pts=0[aout]`;
  }

  const filterParts: string[] = [];
  const labels: string[] = [];

  activeSegments.forEach((segment, index) => {
    const label = `a${index}`;
    filterParts.push(
      `[1:a]atrim=start=${msToSeconds(segment.startMs)}:end=${msToSeconds(segment.endMs)},asetpts=PTS-STARTPTS[${label}]`,
    );
    labels.push(`[${label}]`);
  });

  filterParts.push(
    `${labels.join('')}concat=n=${activeSegments.length}:v=0:a=1,aresample=async=1:first_pts=0[aout]`,
  );

  return filterParts.join(';');
}

async function blobToUint8Array(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await blob.arrayBuffer());
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load slide image: ${url}`));
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error('Timed out while rendering recording frame'));
    }, PNG_TIMEOUT_MS);

    canvas.toBlob((blob) => {
      window.clearTimeout(timer);
      if (!blob) {
        reject(new Error('Failed to generate recording frame'));
        return;
      }
      resolve(blob);
    }, 'image/png');
  });
}

async function writeFrameFiles(
  ffmpeg: FFmpeg,
  workDir: string,
  slides: SlideImage[],
  overlayBase: ExportPresentationRecordingOptions['overlayBase'],
  activeDurationMs: number,
  onProgress?: ExportPresentationRecordingOptions['onProgress'],
): Promise<{ framePattern: string; createdFiles: string[] }> {
  const slideImages = await Promise.all(slides.map((slide) => loadImage(slide.objectUrl)));
  const size = getRecordingCanvasSize(slides[0]);
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to create recording canvas');
  }

  const frameCount = Math.max(1, Math.ceil(activeDurationMs / FRAME_INTERVAL_MS));
  const createdFiles: string[] = [];

  for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
    const frameStartMs = frameIndex * FRAME_INTERVAL_MS;
    const sampleTimeMs = Math.min(frameStartMs, Math.max(activeDurationMs - 1, 0));
    const overlay = buildOverlayForElapsed(overlayBase, sampleTimeMs);
    const slideImage = slideImages[Math.min(overlay.currentSlide, slideImages.length - 1)];

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(slideImage, 0, 0, canvas.width, canvas.height);
    drawOverlayOnCanvas(ctx, canvas.width, canvas.height, overlay);

    const frameName = `frame-${String(frameIndex).padStart(4, '0')}.png`;
    const framePath = `${workDir}/${frameName}`;
    const frameBlob = await canvasToBlob(canvas);
    await ffmpeg.writeFile(framePath, await blobToUint8Array(frameBlob));
    createdFiles.push(framePath);

    setProgress(
      onProgress,
      `Rendering video ${frameIndex + 1}/${frameCount}`,
      0.12 + ((frameIndex + 1) / frameCount) * 0.48,
    );
  }

  return { framePattern: `${workDir}/frame-%04d.png`, createdFiles };
}

function buildEncodeArgs(options: {
  framePattern: string;
  durationSeconds: string;
  audioPath: string | null;
  audioFilter: string | null;
  outputPath: string;
  videoCodecArgs: string[];
}): string[] {
  const { framePattern, durationSeconds, audioPath, audioFilter, outputPath, videoCodecArgs } = options;
  const args = [
    '-framerate',
    String(INPUT_FPS),
    '-start_number',
    '0',
    '-i',
    framePattern,
  ];

  if (audioPath) {
    args.push('-i', audioPath);
  }

  if (audioFilter) {
    args.push('-filter_complex', audioFilter);
  }

  args.push(
    '-map',
    '0:v:0',
    '-t',
    durationSeconds,
  );

  if (audioPath && audioFilter) {
    args.push('-map', '[aout]');
  }

  args.push(
    '-vf',
    `fps=${OUTPUT_FPS},format=yuv420p`,
    '-r',
    String(OUTPUT_FPS),
    ...videoCodecArgs,
    '-movflags',
    '+faststart',
  );

  if (audioPath && audioFilter) {
    args.push('-c:a', 'aac', '-b:a', '128k');
  } else {
    args.push('-an');
  }

  args.push(outputPath);

  return args;
}

async function runEncode(
  ffmpeg: FFmpeg,
  argsVariants: string[][],
  onProgress?: ExportPresentationRecordingOptions['onProgress'],
): Promise<void> {
  const progressHandler = ({ progress }: { progress: number }) => {
    setProgress(onProgress, 'Encoding MP4', 0.60 + sanitizeProgress(progress) * 0.35);
  };

  ffmpeg.on('progress', progressHandler);
  try {
    let lastError: Error | null = null;

    for (const args of argsVariants) {
      const exitCode = await ffmpeg.exec(args);
      if (exitCode === 0) return;
      lastError = new Error(`Recording export failed with ffmpeg exit code ${exitCode}`);
    }

    throw lastError ?? new Error('Recording export failed');
  } finally {
    ffmpeg.off('progress', progressHandler);
  }
}

async function cleanupWorkDir(ffmpeg: FFmpeg, workDir: string, createdFiles: string[]) {
  for (const filePath of createdFiles) {
    try {
      await ffmpeg.deleteFile(filePath);
    } catch {
      // Ignore cleanup failures; the next export uses a fresh work dir.
    }
  }

  try {
    await ffmpeg.deleteDir(workDir);
  } catch {
    // Ignore cleanup failures.
  }
}

export async function exportPresentationRecording({
  slides,
  overlayBase,
  activeDurationMs,
  wallDurationMs,
  pauseRanges,
  audioBlob,
  audioMimeType = '',
  onProgress,
}: ExportPresentationRecordingOptions): Promise<Blob> {
  if (slides.length === 0) {
    throw new Error('No slides available for recording export');
  }

  if (activeDurationMs <= 0) {
    throw new Error('Recording ended before any presentation time elapsed');
  }

  setProgress(onProgress, 'Loading video engine', null);
  const ffmpeg = await getFFmpeg();

  const workDir = `recording-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const createdFiles: string[] = [];

  await ffmpeg.createDir(workDir);

  try {
    const { framePattern, createdFiles: frameFiles } = await writeFrameFiles(
      ffmpeg,
      workDir,
      slides,
      overlayBase,
      activeDurationMs,
      onProgress,
    );
    createdFiles.push(...frameFiles);

    const activeSegments = buildActiveSegments(wallDurationMs, pauseRanges);
    let audioPath: string | null = null;
    let audioFilter: string | null = null;

    if (audioBlob && audioBlob.size > 0 && activeSegments.length > 0) {
      const audioExt = guessAudioExtension(audioMimeType || audioBlob.type || '');
      audioPath = `${workDir}/audio.${audioExt}`;
      await ffmpeg.writeFile(audioPath, await blobToUint8Array(audioBlob));
      createdFiles.push(audioPath);
      audioFilter = buildAudioFilter(activeSegments);
    }

    const outputPath = `${workDir}/output.mp4`;
    createdFiles.push(outputPath);
    const durationSeconds = msToSeconds(activeDurationMs);

    setProgress(onProgress, 'Starting encode', 0.60);
    await runEncode(
      ffmpeg,
      [
        buildEncodeArgs({
          framePattern,
          durationSeconds,
          audioPath,
          audioFilter,
          outputPath,
          videoCodecArgs: [
            '-c:v', 'libx264',
            '-preset', 'veryfast',
            '-tune', 'stillimage',
            '-g', String(OUTPUT_FPS),
            '-keyint_min', String(OUTPUT_FPS),
            '-sc_threshold', '0',
            '-pix_fmt', 'yuv420p',
          ],
        }),
        buildEncodeArgs({
          framePattern,
          durationSeconds,
          audioPath,
          audioFilter,
          outputPath,
          videoCodecArgs: ['-c:v', 'mpeg4', '-q:v', '3'],
        }),
      ],
      onProgress,
    );

    setProgress(onProgress, 'Finalizing recording', 0.98);
    const output = await ffmpeg.readFile(outputPath);
    if (!(output instanceof Uint8Array)) {
      throw new Error('Recording export returned invalid output');
    }
    const outputCopy = new Uint8Array(output.byteLength);
    outputCopy.set(output);

    setProgress(onProgress, 'Recording ready', 1);
    return new Blob([outputCopy.buffer], { type: 'video/mp4' });
  } finally {
    await cleanupWorkDir(ffmpeg, workDir, createdFiles);
  }
}
