import type { ShareableEvent } from '../types';
import { getRecordingBlob } from './db';
import { remuxToProgressiveMp4, convertWebmToMp4 } from './convertToMp4';
import { supabase, EVENTS_BUCKET } from './supabase';

/**
 * Get the public URL for a file in the events bucket.
 * Returns a full HTTPS URL served by Supabase CDN.
 */
function publicUrl(path: string): string {
  const { data } = supabase.storage.from(EVENTS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Upload a file to Supabase Storage, overwriting if it exists.
 * Uses direct binary upload (no base64 encoding).
 */
async function uploadFile(
  path: string,
  data: Blob | string,
  contentType: string,
): Promise<void> {
  const body = typeof data === 'string' ? new Blob([data], { type: contentType }) : data;
  const { error } = await supabase.storage
    .from(EVENTS_BUCKET)
    .upload(path, body, { contentType, upsert: true });
  if (error) throw new Error(`Upload failed for ${path}: ${error.message}`);
}

/** Publish event JSON, recordings, and logo to Supabase Storage.
 *  Works on a deep copy to avoid races with callers mutating the original. */
export async function publishEvent(
  slug: string,
  event: ShareableEvent,
  presentationIds?: string[],
): Promise<void> {
  // Deep-clone so callers can freely mutate the original (e.g. set blob URLs)
  const pub: ShareableEvent = JSON.parse(JSON.stringify(event));

  // Publish recordings as separate files
  if (presentationIds) {
    for (let i = 0; i < presentationIds.length; i++) {
      let blob = await getRecordingBlob(presentationIds[i]);
      if (!blob) continue;
      try {
        // Convert to standard progressive MP4 for maximum compatibility
        if (blob.type.includes('webm')) {
          console.log(`[Publish] Converting WebM recording ${i} to MP4…`);
          blob = await convertWebmToMp4(blob);
        } else if (blob.type.includes('mp4')) {
          console.log(`[Publish] Re-muxing fMP4 recording ${i} to progressive MP4…`);
          blob = await remuxToProgressiveMp4(blob);
        }
        const recPath = `${slug}-${i}.mp4`;
        console.log(`[Publish] Uploading recording ${i} (${(blob.size / 1024 / 1024).toFixed(1)}MB)`);
        await uploadFile(recPath, blob, 'video/mp4');
        pub.presentations[i].recording = publicUrl(recPath);
        console.log(`[Publish] Recording ${i} uploaded successfully`);
      } catch (e) {
        console.error('[Publish] Failed to upload recording', i, e);
      }
    }
  }

  // Strip any leftover blob: URLs — they won't work outside this browser session
  for (const p of pub.presentations) {
    if (p.recording?.startsWith('blob:')) {
      delete p.recording;
    }
  }

  // Upload logo as separate file
  if (pub.logo && pub.logo.startsWith('data:')) {
    try {
      const match = pub.logo.match(/^data:image\/([\w+]+);base64,(.+)$/);
      if (match) {
        const ext = match[1] === 'svg+xml' ? 'svg' : match[1];
        const binary = Uint8Array.from(atob(match[2]), c => c.charCodeAt(0));
        const logoBlob = new Blob([binary], { type: `image/${match[1]}` });
        const logoPath = `${slug}-logo.${ext}`;
        console.log(`[Publish] Uploading logo as ${logoPath}`);
        await uploadFile(logoPath, logoBlob, `image/${match[1]}`);
        pub.logo = publicUrl(logoPath);
        console.log(`[Publish] Logo uploaded successfully`);
      }
    } catch (e) {
      console.error('[Publish] Failed to upload logo', e);
    }
  }

  // Publish event JSON (after recording/logo URLs are set)
  const jsonPath = `${slug}.json`;
  const jsonStr = JSON.stringify(pub, null, 2);
  console.log(`[Publish] Uploading event JSON as ${jsonPath}`);
  await uploadFile(jsonPath, jsonStr, 'application/json');
  console.log(`[Publish] Event published successfully`);
}
