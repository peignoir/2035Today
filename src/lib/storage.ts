import type { ShareableEvent } from '../types';
import { supabase, EVENTS_BUCKET } from './supabase';

/** Get the public CDN URL for a file in the events bucket. */
export function publicUrl(path: string): string {
  const { data } = supabase.storage.from(EVENTS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Upload a file, overwriting if it exists. */
async function upload(path: string, data: Blob | string, contentType: string): Promise<void> {
  const body = typeof data === 'string' ? new Blob([data], { type: contentType }) : data;
  const { error } = await supabase.storage
    .from(EVENTS_BUCKET)
    .upload(path, body, { contentType, upsert: true });
  if (error) throw new Error(`Upload failed for ${path}: ${error.message}`);
}

/** List all events from the bucket. Returns slug + parsed JSON. */
export async function listEvents(): Promise<{ slug: string; event: ShareableEvent }[]> {
  const results: { slug: string; event: ShareableEvent }[] = [];

  // List top-level folders (city slugs)
  const { data: folders, error } = await supabase.storage
    .from(EVENTS_BUCKET)
    .list('', { limit: 200 });
  if (error || !folders) return results;

  for (const folder of folders) {
    // Skip files at root that aren't folders
    if (folder.id !== null && !folder.name.endsWith('/')) {
      // Could be a root-level .json — skip
      continue;
    }
    // List files inside each city folder
    const { data: files } = await supabase.storage
      .from(EVENTS_BUCKET)
      .list(folder.name, { limit: 200 });
    if (!files) continue;

    for (const file of files) {
      if (!file.name.endsWith('.json')) continue;
      const path = `${folder.name}/${file.name}`;
      try {
        const { data: blob, error: dlErr } = await supabase.storage
          .from(EVENTS_BUCKET)
          .download(path);
        if (dlErr || !blob) continue;
        const event = JSON.parse(await blob.text()) as ShareableEvent;
        const slug = path.replace(/\.json$/, '');
        const date = file.name.replace(/\.json$/, '');

        // Auto-discover logo from bucket (source of truth)
        if (!event.logo) {
          const logoFile = files.find((f) => f.name.match(new RegExp(`^${date}-logo\\.`)));
          if (logoFile) {
            event.logo = publicUrl(`${folder.name}/${logoFile.name}`);
          }
        }

        results.push({ slug, event });
      } catch { /* skip broken files */ }
    }
  }

  return results;
}

/** Load a single event by slug (e.g. "tallinn/2026-02-27").
 *  Auto-discovers recordings + logo from storage so the bucket is the source of truth. */
export async function loadEvent(slug: string): Promise<ShareableEvent | null> {
  try {
    const resp = await fetch(publicUrl(`${slug}.json`));
    if (!resp.ok) return null;
    const event = (await resp.json()) as ShareableEvent;

    // Discover recordings & logo from the actual bucket files
    const [city, date] = slug.split('/');
    if (city && date) {
      const { data: files } = await supabase.storage
        .from(EVENTS_BUCKET)
        .list(city, { limit: 200 });
      if (files) {
        for (const file of files) {
          // Match recordings: {date}-{index}.mp4
          const recMatch = file.name.match(new RegExp(`^${date}-(\\d+)\\.mp4$`));
          if (recMatch) {
            const idx = parseInt(recMatch[1], 10);
            if (idx < event.presentations.length) {
              event.presentations[idx].recording = publicUrl(`${city}/${file.name}`);
            }
          }
          // Match logo: {date}-logo.{ext}
          const logoMatch = file.name.match(new RegExp(`^${date}-logo\\.`));
          if (logoMatch) {
            event.logo = publicUrl(`${city}/${file.name}`);
          }
        }
      }
    }

    return event;
  } catch {
    return null;
  }
}

/** Save (create or update) an event's JSON. */
export async function saveEvent(slug: string, event: ShareableEvent): Promise<void> {
  const json = JSON.stringify(event, null, 2);
  await upload(`${slug}.json`, json, 'application/json');
}

/** Delete all files for an event (JSON, recordings, logo). */
export async function deleteEvent(slug: string): Promise<void> {
  const city = slug.split('/')[0];
  const date = slug.split('/')[1];
  if (!city || !date) return;

  // List all files in the city folder that start with the date
  const { data: files, error: listErr } = await supabase.storage
    .from(EVENTS_BUCKET)
    .list(city, { limit: 200 });
  if (listErr) { console.error('[Storage] Delete list error:', listErr); throw listErr; }
  if (!files) return;

  const toDelete = files
    .filter((f) => f.name.startsWith(date))
    .map((f) => `${city}/${f.name}`);

  if (toDelete.length > 0) {
    console.log('[Storage] Deleting files:', toDelete);
    const { data: deleted, error: rmErr } = await supabase.storage.from(EVENTS_BUCKET).remove(toDelete);
    if (rmErr) { console.error('[Storage] Delete error:', rmErr); throw rmErr; }

    // Verify deletion actually worked (RLS may silently block it)
    if (!deleted || deleted.length === 0) {
      throw new Error('Delete blocked — add a DELETE policy to your Supabase Storage bucket (Storage → Policies → events → New Policy → DELETE).');
    }
  }
}

/** Upload a recording with real progress tracking via XHR. Returns the CDN URL. */
export async function uploadRecording(
  slug: string,
  index: number,
  blob: Blob,
  onProgress?: (pct: number) => void,
  signal?: AbortSignal,
): Promise<string> {
  const path = `${slug}-${index}.mp4`;
  const sizeMB = (blob.size / 1024 / 1024).toFixed(1);
  console.log(`[Storage] Uploading recording ${index} (${sizeMB}MB)`);

  // Delete existing file first to avoid upsert issues with large files
  await supabase.storage.from(EVENTS_BUCKET).remove([path]);

  // Upload via XHR for real progress tracking
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  const url = `${supabaseUrl}/storage/v1/object/${EVENTS_BUCKET}/${path}`;

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.setRequestHeader('Authorization', `Bearer ${supabaseKey}`);
    xhr.setRequestHeader('apikey', supabaseKey);
    xhr.setRequestHeader('Content-Type', 'video/mp4');
    xhr.setRequestHeader('x-upsert', 'true');

    if (signal) {
      signal.addEventListener('abort', () => {
        xhr.abort();
        reject(new Error('Upload cancelled'));
      });
    }

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        // Cap at 99% — 100% only after server confirms
        onProgress(Math.min(99, Math.round((e.loaded / e.total) * 100)));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed (${xhr.status}): ${xhr.responseText}`));
      }
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.ontimeout = () => reject(new Error('Upload timed out'));
    xhr.timeout = 600_000; // 10 min for large files
    xhr.send(blob);
  });

  console.log(`[Storage] Recording ${index} uploaded`);
  return publicUrl(path);
}

/** Delete a recording from storage. */
export async function deleteRecording(slug: string, index: number): Promise<void> {
  const path = `${slug}-${index}.mp4`;
  await supabase.storage.from(EVENTS_BUCKET).remove([path]);
}

/** Upload a logo blob. Returns the CDN URL. */
export async function uploadLogo(slug: string, blob: Blob, ext: string): Promise<string> {
  const path = `${slug}-logo.${ext}`;
  console.log(`[Storage] Uploading logo as ${path}`);
  await upload(path, blob, blob.type || `image/${ext}`);
  console.log(`[Storage] Logo uploaded`);
  return publicUrl(path);
}
