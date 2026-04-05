import type { SlideImage } from '../types';

export const SLIDE_DURATION_MS = 15_000;
export const TOTAL_SLIDES = 20;
export const RECORDING_EXPORT_VERSION = 'rec-v2026-04-05c';
const MAX_RECORDING_WIDTH = 1280;
const MAX_RECORDING_HEIGHT = 720;

export interface OverlayInfo {
  eventTitle: string;
  storyName: string;
  speakerName: string;
  currentSlide: number;
  totalSlides: number;
  slideSecondsLeft: number;
}

export interface RecordingCanvasSize {
  width: number;
  height: number;
}

export function getRecordingCanvasSize(firstSlide: Pick<SlideImage, 'width' | 'height'>): RecordingCanvasSize {
  const aspect = firstSlide.width / firstSlide.height;
  let width = firstSlide.width;
  let height = firstSlide.height;

  if (width > MAX_RECORDING_WIDTH) {
    width = MAX_RECORDING_WIDTH;
    height = Math.round(width / aspect);
  }
  if (height > MAX_RECORDING_HEIGHT) {
    height = MAX_RECORDING_HEIGHT;
    width = Math.round(height * aspect);
  }

  if (width % 2 !== 0) width -= 1;
  if (height % 2 !== 0) height -= 1;

  return { width, height };
}

export function buildOverlayForElapsed(
  base: Omit<OverlayInfo, 'currentSlide' | 'slideSecondsLeft'>,
  elapsedMs: number,
): OverlayInfo {
  const safeElapsed = Math.max(0, elapsedMs);
  const currentSlide = Math.min(
    Math.floor(safeElapsed / SLIDE_DURATION_MS),
    Math.max(base.totalSlides - 1, 0),
  );
  const slideEndMs = (currentSlide + 1) * SLIDE_DURATION_MS;
  const slideSecondsLeft = Math.max(
    1,
    Math.ceil((slideEndMs - safeElapsed) / 1000),
  );

  return {
    ...base,
    currentSlide,
    slideSecondsLeft,
  };
}

/** Draw event/story/speaker info + progress bar over the current canvas content. */
export function drawOverlayOnCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  overlay: OverlayInfo,
) {
  const { eventTitle, storyName, speakerName, currentSlide, totalSlides, slideSecondsLeft } = overlay;

  const lineHeight = Math.round(height * 0.032);
  const baseFontSize = Math.round(height * 0.026);
  const padX = Math.round(width * 0.02);
  const padY = Math.round(height * 0.02);

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;
  ctx.textBaseline = 'top';

  let y = padY;

  if (eventTitle) {
    ctx.font = `bold ${baseFontSize}px sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(eventTitle, padX, y);
    y += lineHeight;
  }

  if (storyName) {
    ctx.font = `600 ${Math.round(baseFontSize * 0.9)}px sans-serif`;
    ctx.fillStyle = '#e0e0e0';
    ctx.fillText(storyName, padX, y);
    y += lineHeight;
  }

  if (speakerName) {
    ctx.font = `400 ${Math.round(baseFontSize * 0.85)}px sans-serif`;
    ctx.fillStyle = '#b0b0b0';
    ctx.fillText(speakerName, padX, y);
  }

  const versionFontSize = Math.max(10, Math.round(height * 0.017));
  ctx.font = `600 ${versionFontSize}px monospace`;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255,255,255,0.78)';
  ctx.fillText(RECORDING_EXPORT_VERSION, width - padX, padY);
  ctx.textAlign = 'left';

  ctx.restore();

  const barHeight = Math.round(height * 0.04);
  const barY = height - barHeight;
  const barPad = Math.round(width * 0.015);
  const segmentGap = Math.round(width * 0.003);

  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(0, barY, width, barHeight);

  const countFontSize = Math.round(barHeight * 0.55);
  ctx.font = `bold ${countFontSize}px monospace`;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ef4444';
  const countText = String(slideSecondsLeft);
  const countWidth = ctx.measureText('00').width;
  ctx.fillText(countText, barPad, barY + barHeight / 2);

  ctx.font = `600 ${Math.round(barHeight * 0.45)}px monospace`;
  ctx.fillStyle = '#ffffff';
  const labelText = '5 min';
  const labelWidth = ctx.measureText(labelText).width;
  ctx.fillText(labelText, width - barPad - labelWidth, barY + barHeight / 2);

  const segmentsLeft = barPad + countWidth + barPad;
  const segmentsRight = width - barPad - labelWidth - barPad;
  const totalSegmentsWidth = segmentsRight - segmentsLeft;
  const segmentWidth = (totalSegmentsWidth - (totalSlides - 1) * segmentGap) / totalSlides;
  const segmentHeight = Math.round(barHeight * 0.25);
  const segmentY = barY + (barHeight - segmentHeight) / 2;

  for (let i = 0; i < totalSlides; i++) {
    const segmentX = segmentsLeft + i * (segmentWidth + segmentGap);

    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(segmentX, segmentY, segmentWidth, segmentHeight);

    if (i < currentSlide) {
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(segmentX, segmentY, segmentWidth, segmentHeight);
    } else if (i === currentSlide) {
      const progress = 1 - slideSecondsLeft / 15;
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(segmentX, segmentY, segmentWidth * Math.max(0, Math.min(progress, 1)), segmentHeight);
    }
  }

  ctx.restore();
}
