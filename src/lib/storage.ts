import type { ShareableEvent, ShareablePresentation, SpeakerSignup } from '../types';
import { supabase, EVENTS_BUCKET } from './supabase';

type StorageListFile = {
  name: string;
  created_at?: string;
  updated_at?: string;
};

type RecordingAsset = {
  path: string;
  cacheBust: string;
  updatedAtMs: number;
};

function withCacheBust(url: string, cacheBust?: string | number): string {
  if (cacheBust === undefined || cacheBust === null || cacheBust === '') return url;
  const joiner = url.includes('?') ? '&' : '?';
  return `${url}${joiner}v=${encodeURIComponent(String(cacheBust))}`;
}

/** Get the public CDN URL for a file in the events bucket. */
export function publicUrl(path: string, cacheBust?: string | number): string {
  const { data } = supabase.storage.from(EVENTS_BUCKET).getPublicUrl(path);
  return withCacheBust(data.publicUrl, cacheBust);
}

/** Upload a file, overwriting if it exists. */
async function upload(path: string, data: Blob | string, contentType: string): Promise<void> {
  const body = typeof data === 'string' ? new Blob([data], { type: contentType }) : data;
  const { error } = await supabase.storage
    .from(EVENTS_BUCKET)
    .upload(path, body, { contentType, upsert: true });
  if (error) throw new Error(`Upload failed for ${path}: ${error.message}`);
}

function fileVersion(file: StorageListFile): string {
  return file.updated_at || file.created_at || Date.now().toString();
}

function fileUpdatedAtMs(file: StorageListFile): number {
  const raw = file.updated_at || file.created_at;
  const value = raw ? Date.parse(raw) : NaN;
  return Number.isFinite(value) ? value : 0;
}

function recordingExtensionForMimeType(mimeType: string): 'mp4' | 'webm' {
  return mimeType.includes('webm') ? 'webm' : 'mp4';
}

function recordingPaths(slug: string, index: number): string[] {
  return [`${slug}-${index}.mp4`, `${slug}-${index}.webm`];
}

function applyDiscoveredAssets(
  event: ShareableEvent,
  city: string,
  date: string,
  files: StorageListFile[],
): ShareableEvent {
  const presentations: ShareablePresentation[] = event.presentations.map((presentation) => ({
    ...presentation,
    recording: undefined,
    pdfUrl: undefined,
  }));
  const recordings = new Map<number, RecordingAsset>();

  let logo: string | undefined;

  for (const file of files) {
    const version = fileVersion(file);

    const recordingMatch = file.name.match(new RegExp(`^${date}-(\\d+)\\.(mp4|webm)$`));
    if (recordingMatch) {
      const index = parseInt(recordingMatch[1], 10);
      if (index < presentations.length) {
        const existing = recordings.get(index);
        const candidate: RecordingAsset = {
          path: `${city}/${file.name}`,
          cacheBust: version,
          updatedAtMs: fileUpdatedAtMs(file),
        };
        if (!existing || candidate.updatedAtMs >= existing.updatedAtMs) {
          recordings.set(index, candidate);
        }
      }
      continue;
    }

    const pdfMatch = file.name.match(new RegExp(`^${date}-(\\d+)\\.pdf$`));
    if (pdfMatch) {
      const index = parseInt(pdfMatch[1], 10);
      if (index < presentations.length) {
        presentations[index].pdfUrl = publicUrl(`${city}/${file.name}`, version);
      }
      continue;
    }

    if (file.name.match(new RegExp(`^${date}-logo\\.`))) {
      logo = publicUrl(`${city}/${file.name}`, version);
    }
  }

  for (const [index, recording] of recordings.entries()) {
    presentations[index].recording = publicUrl(recording.path, recording.cacheBust);
  }

  return {
    ...event,
    presentations,
    logo,
  };
}

function splitStoragePath(path: string): { folder: string; fileName: string } {
  const slashIndex = path.lastIndexOf('/');
  if (slashIndex === -1) {
    return { folder: '', fileName: path };
  }

  return {
    folder: path.slice(0, slashIndex),
    fileName: path.slice(slashIndex + 1),
  };
}

async function storageFileExists(path: string): Promise<boolean> {
  const { folder, fileName } = splitStoragePath(path);
  const { data: files, error } = await supabase.storage
    .from(EVENTS_BUCKET)
    .list(folder, { limit: 200 });
  if (error) {
    throw new Error(`Failed to verify storage file ${path}: ${error.message}`);
  }
  return (files ?? []).some((file) => file.name === fileName);
}

async function deleteStorageFile(path: string, label: string): Promise<void> {
  const existedBefore = await storageFileExists(path);
  if (!existedBefore) return;

  const { error } = await supabase.storage.from(EVENTS_BUCKET).remove([path]);
  if (error) {
    throw new Error(`Failed to delete ${label}: ${error.message}`);
  }

  if (await storageFileExists(path)) {
    throw new Error(`Failed to delete ${label}: file still exists in storage. Check the Supabase Storage DELETE policy.`);
  }
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
    // Skip the "open" folder (used for open-application signups, not real events)
    if (folder.name.replace(/\/$/, '') === 'open') continue;
    // List files inside each city folder
    const { data: files } = await supabase.storage
      .from(EVENTS_BUCKET)
      .list(folder.name, { limit: 200 });
    if (!files) continue;

    for (const file of files) {
      if (!file.name.endsWith('.json')) continue;
      // Skip signups files — they aren't event JSON
      if (file.name.includes('-signups')) continue;
      const path = `${folder.name}/${file.name}`;
      try {
        const { data: blob, error: dlErr } = await supabase.storage
          .from(EVENTS_BUCKET)
          .download(path);
        if (dlErr || !blob) continue;
        const rawEvent = JSON.parse(await blob.text()) as ShareableEvent;
        const slug = path.replace(/\.json$/, '');
        const date = file.name.replace(/\.json$/, '');
        const event = applyDiscoveredAssets(rawEvent, folder.name, date, files);

        results.push({ slug, event });
      } catch { /* skip broken files */ }
    }
  }

  return results;
}

/** List all public events (isPublic=true). Returns slug + event, sorted by date descending. */
export async function listPublicEvents(): Promise<{ slug: string; event: ShareableEvent }[]> {
  const all = await listEvents();
  return all
    .filter((e) => e.event.isPublic)
    .sort((a, b) => b.event.date.localeCompare(a.event.date));
}

/** Load a single event by slug (e.g. "tallinn/2026-02-27").
 *  Uses Supabase API (not CDN) to avoid stale cache issues.
 *  Auto-discovers recordings, PDFs & logo from storage so the bucket is the source of truth. */
export async function loadEvent(slug: string): Promise<ShareableEvent | null> {
  try {
    // Use supabase.storage.download() to bypass CDN cache (publicUrl has max-age=3600)
    const { data: blob, error } = await supabase.storage
      .from(EVENTS_BUCKET)
      .download(`${slug}.json`);
    if (error || !blob) return null;
    const rawEvent = JSON.parse(await blob.text()) as ShareableEvent;

    // Discover recordings, PDFs & logo from the actual bucket files
    const [city, date] = slug.split('/');
    if (city && date) {
      const { data: files } = await supabase.storage
        .from(EVENTS_BUCKET)
        .list(city, { limit: 200 });
      return applyDiscoveredAssets(rawEvent, city, date, files ?? []);
    }

    return rawEvent;
  } catch {
    return null;
  }
}

/** Save (create or update) an event's JSON. */
export async function saveEvent(slug: string, event: ShareableEvent): Promise<void> {
  const json = JSON.stringify(event, null, 2);
  await upload(`${slug}.json`, json, 'application/json');
}

/** Load the city registry (explicit list of active city slugs). */
async function loadCityRegistry(): Promise<string[] | null> {
  try {
    const { data: blob, error } = await supabase.storage
      .from(EVENTS_BUCKET)
      .download('cities-registry.json');
    if (error || !blob) return null;
    return JSON.parse(await blob.text()) as string[];
  } catch {
    return null;
  }
}

/** Save the city registry. */
async function saveCityRegistry(cities: string[]): Promise<void> {
  const json = JSON.stringify(cities, null, 2);
  await upload('cities-registry.json', json, 'application/json');
}

/** List all distinct city slugs. Uses registry if it exists, otherwise seeds from bucket folders. */
export async function listCities(): Promise<string[]> {
  const registry = await loadCityRegistry();
  if (registry) return registry;

  // Seed registry from existing bucket folders
  const { data: folders } = await supabase.storage
    .from(EVENTS_BUCKET)
    .list('', { limit: 200 });
  if (!folders) return [];
  const cities = folders
    .filter((f) => (f.id === null || f.name.endsWith('/')) && f.name.replace(/\/$/, '') !== 'open')
    .map((f) => f.name.replace(/\/$/, ''));
  await saveCityRegistry(cities);
  return cities;
}

/** Register a city slug (no-op if already present). */
export async function registerCity(citySlug: string): Promise<void> {
  const cities = (await loadCityRegistry()) ?? [];
  if (cities.includes(citySlug)) return;
  cities.push(citySlug);
  await saveCityRegistry(cities);
}

/** Unregister a city slug (remove from registry; events stay in storage). */
export async function unregisterCity(citySlug: string): Promise<void> {
  const cities = (await loadCityRegistry()) ?? [];
  const filtered = cities.filter((c) => c !== citySlug);
  await saveCityRegistry(filtered);
}

/** Move all files for an event from one slug to another (different city folder).
 *  Downloads each file and re-uploads to the new path, then deletes originals. */
export async function moveEvent(oldSlug: string, newSlug: string): Promise<void> {
  const [oldCity, date] = oldSlug.split('/');
  const [newCity] = newSlug.split('/');
  if (!oldCity || !date || !newCity || oldCity === newCity) return;

  const { data: files } = await supabase.storage
    .from(EVENTS_BUCKET)
    .list(oldCity, { limit: 200 });
  if (!files) return;

  const eventFiles = files.filter((f) => f.name === `${date}.json` || f.name.startsWith(`${date}-`));
  for (const file of eventFiles) {
    const oldPath = `${oldCity}/${file.name}`;
    const newPath = `${newCity}/${file.name}`;
    console.log(`[Storage] Moving ${oldPath} → ${newPath}`);
    const { data: blob, error: dlErr } = await supabase.storage
      .from(EVENTS_BUCKET)
      .download(oldPath);
    if (dlErr || !blob) { console.error(`[Storage] Failed to download ${oldPath}:`, dlErr); continue; }
    const { error: upErr } = await supabase.storage
      .from(EVENTS_BUCKET)
      .upload(newPath, blob, { contentType: blob.type || 'application/octet-stream', upsert: true });
    if (upErr) { console.error(`[Storage] Failed to upload ${newPath}:`, upErr); continue; }
  }

  // Delete old files
  const toDelete = eventFiles.map((f) => `${oldCity}/${f.name}`);
  if (toDelete.length > 0) {
    await supabase.storage.from(EVENTS_BUCKET).remove(toDelete);
  }
  console.log(`[Storage] Moved event ${oldSlug} → ${newSlug}`);
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
    .filter((f) => f.name === `${date}.json` || f.name.startsWith(`${date}-`))
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
  const ext = recordingExtensionForMimeType(blob.type || '');
  const path = `${slug}-${index}.${ext}`;
  const sizeMB = (blob.size / 1024 / 1024).toFixed(2);
  const startedAt = Date.now();
  console.log(`[Storage] Uploading recording ${index} (${sizeMB}MB, ${blob.size} bytes, type=${blob.type || 'unknown'}) path=${path}`);
  console.log(`[Storage] Network online=${navigator.onLine}`);

  // Delete existing file first to avoid upsert issues with large files
  try {
    const { error: rmErr } = await supabase.storage.from(EVENTS_BUCKET).remove(recordingPaths(slug, index));
    if (rmErr) {
      console.warn(`[Storage] Pre-upload delete returned error (non-fatal):`, rmErr);
    } else {
      console.log(`[Storage] Pre-upload delete ok`);
    }
  } catch (e) {
    console.warn(`[Storage] Pre-upload delete threw (non-fatal):`, e);
  }

  // Upload via XHR for real progress tracking
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  const url = `${supabaseUrl}/storage/v1/object/${EVENTS_BUCKET}/${path}`;
  console.log(`[Storage] POST ${url}`);

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.setRequestHeader('Authorization', `Bearer ${supabaseKey}`);
    xhr.setRequestHeader('apikey', supabaseKey);
    xhr.setRequestHeader('Content-Type', blob.type || 'application/octet-stream');
    xhr.setRequestHeader('x-upsert', 'true');

    if (signal) {
      signal.addEventListener('abort', () => {
        console.warn(`[Storage] Upload aborted by signal`);
        xhr.abort();
        reject(new Error('Upload cancelled'));
      });
    }

    let lastLoggedPct = -1;
    let lastProgressAt = Date.now();
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        // Log every 10% progress milestone
        if (pct >= lastLoggedPct + 10) {
          lastLoggedPct = pct;
          const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
          const kbps = e.loaded > 0 ? (((e.loaded * 8) / 1000) / ((Date.now() - startedAt) / 1000)).toFixed(0) : '0';
          console.log(`[Storage] Upload progress ${pct}% (${(e.loaded / 1024 / 1024).toFixed(2)}/${(e.total / 1024 / 1024).toFixed(2)} MB, t=${elapsed}s, ~${kbps} kbps)`);
        }
        lastProgressAt = Date.now();
        if (onProgress) onProgress(Math.min(99, pct));
      }
    };
    xhr.upload.onloadstart = () => {
      console.log(`[Storage] Upload loadstart — connection opened`);
    };
    xhr.upload.onloadend = () => {
      const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
      console.log(`[Storage] Upload loadend t=${elapsed}s (xhr.status=${xhr.status}, readyState=${xhr.readyState})`);
    };
    xhr.onreadystatechange = () => {
      console.log(`[Storage] xhr readyState=${xhr.readyState} status=${xhr.status}`);
    };
    xhr.onload = () => {
      const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
      if (xhr.status >= 200 && xhr.status < 300) {
        console.log(`[Storage] Upload succeeded (${xhr.status}) in ${elapsed}s`);
        resolve();
      } else {
        console.error(`[Storage] Upload failed status=${xhr.status} body=${xhr.responseText}`);
        reject(new Error(`Upload failed (${xhr.status}): ${xhr.responseText}`));
      }
    };
    xhr.onerror = () => {
      const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
      const stalled = ((Date.now() - lastProgressAt) / 1000).toFixed(1);
      console.error(`[Storage] Upload xhr.onerror after t=${elapsed}s, stalled ${stalled}s, lastPct=${lastLoggedPct}%, online=${navigator.onLine}`);
      reject(new Error('Network error during upload'));
    };
    xhr.ontimeout = () => {
      console.error(`[Storage] Upload timed out after ${xhr.timeout / 1000}s`);
      reject(new Error('Upload timed out'));
    };
    xhr.timeout = 600_000; // 10 min for large files
    xhr.send(blob);
  });

  const totalElapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`[Storage] Recording ${index} uploaded in ${totalElapsed}s`);
  return publicUrl(path, Date.now());
}

/** Delete a recording from storage. */
export async function deleteRecording(slug: string, index: number): Promise<void> {
  let deleted = false;
  for (const path of recordingPaths(slug, index)) {
    const exists = await storageFileExists(path);
    if (!exists) continue;
    await deleteStorageFile(path, `recording ${index}`);
    deleted = true;
  }

  if (!deleted) {
    console.log(`[Storage] Recording ${index} already absent`);
  }
}

/** Upload a PDF to storage. Returns the CDN URL. */
export async function uploadPdf(slug: string, index: number, blob: Blob): Promise<string> {
  const path = `${slug}-${index}.pdf`;
  console.log(`[Storage] Uploading PDF ${index}`);
  await upload(path, blob, 'application/pdf');
  console.log(`[Storage] PDF ${index} uploaded`);
  return publicUrl(path, Date.now());
}

/** Delete a PDF from storage. */
export async function deletePdf(slug: string, index: number): Promise<void> {
  const path = `${slug}-${index}.pdf`;
  await deleteStorageFile(path, `PDF ${index}`);
}

/** Download a PDF blob from its public URL with progress reporting. */
export async function downloadPdf(
  pdfUrl: string,
  onProgress?: (loaded: number, total: number | null) => void,
  signal?: AbortSignal,
): Promise<Blob> {
  console.log(`[Storage] Downloading PDF ${pdfUrl}`);

  return await new Promise<Blob>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', pdfUrl, true);
    xhr.responseType = 'blob';
    xhr.timeout = 180_000;

    if (signal) {
      signal.addEventListener('abort', () => {
        xhr.abort();
        reject(new Error('PDF download cancelled'));
      }, { once: true });
    }

    xhr.onprogress = (event) => {
      const total = event.lengthComputable ? event.total : null;
      onProgress?.(event.loaded, total);
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300 && xhr.response) {
        const blob = xhr.response as Blob;
        console.log(`[Storage] PDF downloaded (${(blob.size / 1024).toFixed(0)} KB)`);
        resolve(blob);
      } else {
        reject(new Error(`Failed to download PDF (${xhr.status})`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error while downloading PDF'));
    xhr.ontimeout = () => reject(new Error('PDF download timed out'));
    xhr.send();
  });
}

/** Upload a logo blob. Returns the CDN URL.
 *  Cleans up any old logo files first to prevent stale auto-discovered logos. */
export async function uploadLogo(slug: string, blob: Blob, ext: string): Promise<string> {
  const path = `${slug}-logo.${ext}`;
  const [city, date] = slug.split('/');

  // Remove any existing logo files (e.g. switching from .png to .jpg)
  if (city && date) {
    const { data: files } = await supabase.storage
      .from(EVENTS_BUCKET)
      .list(city, { limit: 200 });
    if (files) {
      const oldLogos = files
        .filter((f) => f.name.match(new RegExp(`^${date}-logo\\.`)))
        .map((f) => `${city}/${f.name}`);
      if (oldLogos.length > 0) {
        await supabase.storage.from(EVENTS_BUCKET).remove(oldLogos);
      }
    }
  }

  console.log(`[Storage] Uploading logo as ${path}`);
  await upload(path, blob, blob.type || `image/${ext}`);
  console.log(`[Storage] Logo uploaded`);
  return publicUrl(path, Date.now());
}

/** Load speaker signups for an event. */
export async function loadSignups(slug: string): Promise<SpeakerSignup[]> {
  const path = `${slug}-signups.json`;
  try {
    const { data: blob, error } = await supabase.storage
      .from(EVENTS_BUCKET)
      .download(path);
    if (error || !blob) return [];
    return JSON.parse(await blob.text()) as SpeakerSignup[];
  } catch {
    return [];
  }
}

/** Save a new speaker signup for an event. */
export async function addSignup(slug: string, signup: SpeakerSignup): Promise<void> {
  const existing = await loadSignups(slug);
  existing.push(signup);
  const json = JSON.stringify(existing, null, 2);
  await upload(`${slug}-signups.json`, json, 'application/json');
}

/** Save the full signups array for an event (e.g. after updating status). */
export async function saveSignups(slug: string, signups: SpeakerSignup[]): Promise<void> {
  const json = JSON.stringify(signups, null, 2);
  await upload(`${slug}-signups.json`, json, 'application/json');
}
