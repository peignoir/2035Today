/**
 * Compress and resize an image file before upload.
 * Returns a Blob (JPEG) capped at MAX_WIDTH px, quality 0.8.
 * SVGs are returned unchanged.
 */

const MAX_WIDTH = 1200;
const JPEG_QUALITY = 0.8;

export async function compressImage(file: Blob): Promise<{ blob: Blob; ext: string }> {
  // Don't compress SVGs
  if (file.type === 'image/svg+xml') {
    return { blob: file, ext: 'svg' };
  }

  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;

  // Calculate target size
  let targetW = width;
  let targetH = height;
  if (width > MAX_WIDTH) {
    targetW = MAX_WIDTH;
    targetH = Math.round(height * (MAX_WIDTH / width));
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, targetW, targetH);
  bitmap.close();

  // canvas.toBlob can silently never fire on Safari under memory pressure,
  // so race it against a 10s timeout to surface the hang.
  const blob = await new Promise<Blob>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('canvas.toBlob timed out')), 10_000);
    canvas.toBlob(
      (b) => {
        clearTimeout(timer);
        if (b) resolve(b);
        else reject(new Error('Compression failed'));
      },
      'image/jpeg',
      JPEG_QUALITY,
    );
  });

  return { blob, ext: 'jpg' };
}
