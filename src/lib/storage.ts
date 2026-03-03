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
        const resp = await fetch(publicUrl(path));
        if (!resp.ok) continue;
        const event = (await resp.json()) as ShareableEvent;
        const slug = path.replace(/\.json$/, '');
        results.push({ slug, event });
      } catch { /* skip broken files */ }
    }
  }

  return results;
}

/** Load a single event by slug (e.g. "tallinn/2026-02-27"). */
export async function loadEvent(slug: string): Promise<ShareableEvent | null> {
  try {
    const resp = await fetch(publicUrl(`${slug}.json`));
    if (!resp.ok) return null;
    return (await resp.json()) as ShareableEvent;
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
  const { data: files } = await supabase.storage
    .from(EVENTS_BUCKET)
    .list(city, { limit: 200 });
  if (!files) return;

  const toDelete = files
    .filter((f) => f.name.startsWith(date))
    .map((f) => `${city}/${f.name}`);

  if (toDelete.length > 0) {
    await supabase.storage.from(EVENTS_BUCKET).remove(toDelete);
  }
}

/** Upload a recording blob. Returns the CDN URL. */
export async function uploadRecording(slug: string, index: number, blob: Blob): Promise<string> {
  const path = `${slug}-${index}.mp4`;
  console.log(`[Storage] Uploading recording ${index} (${(blob.size / 1024 / 1024).toFixed(1)}MB)`);
  await upload(path, blob, 'video/mp4');
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
