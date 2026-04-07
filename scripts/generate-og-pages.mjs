/**
 * Post-build script: generates per-event HTML pages with OG meta tags.
 *
 * Reads event data from Supabase Storage and creates
 * dist/events/{city}/{date}/index.html with event-specific OG tags
 * and a redirect to the SPA hash URL.
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';

const DIST = join(dirname(new URL(import.meta.url).pathname), '..', 'dist');
const BASE_URL = '/2035VC/';
const ORIGIN = 'https://peignoir.github.io';
const SITE_URL = `${ORIGIN}${BASE_URL.replace(/\/$/, '')}`;

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const EVENTS_BUCKET = 'events';

async function fetchSupabaseEvents() {
  if (!SUPABASE_URL || SUPABASE_URL.includes('REPLACE_ME')) return [];
  if (!SUPABASE_ANON_KEY) {
    console.warn('[OG] VITE_SUPABASE_ANON_KEY not set, skipping OG generation');
    return [];
  }

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'apikey': SUPABASE_ANON_KEY,
  };

  const events = [];
  try {
    const listUrl = `${SUPABASE_URL}/storage/v1/object/list/${EVENTS_BUCKET}`;
    const resp = await fetch(listUrl, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ prefix: '', limit: 1000 }),
    });
    if (!resp.ok) return [];

    const files = await resp.json();
    const jsonFiles = await listJsonFiles(files, '', authHeaders);

    for (const path of jsonFiles) {
      try {
        const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${EVENTS_BUCKET}/${path}`;
        const jsonResp = await fetch(publicUrl);
        if (jsonResp.ok) {
          const event = await jsonResp.json();
          const slug = path.replace(/\.json$/, '');
          events.push({ slug, event });
        }
      } catch { /* skip broken files */ }
    }
  } catch (e) {
    console.warn('[OG] Could not fetch from Supabase:', e.message);
  }
  return events;
}

async function listJsonFiles(entries, prefix, authHeaders) {
  const results = [];
  for (const entry of entries) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.id === null && entry.name) {
      try {
        const listUrl = `${SUPABASE_URL}/storage/v1/object/list/${EVENTS_BUCKET}`;
        const resp = await fetch(listUrl, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ prefix: path, limit: 1000 }),
        });
        if (resp.ok) {
          const subEntries = await resp.json();
          results.push(...await listJsonFiles(subEntries, path, authHeaders));
        }
      } catch { /* skip */ }
    } else if (entry.name?.endsWith('.json')) {
      results.push(path);
    }
  }
  return results;
}

function formatDate(dateStr) {
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function generateOgHtml(slug, event) {
  const title = escapeHtml(event.name || `2035Today ${event.city || ''}`);
  const date = formatDate(event.date);
  const city = event.city || '';
  const description = escapeHtml(
    `Stories from the future — ${date} in ${city}. ` +
    `${event.presentations?.length || 0} speakers, 5 minutes each.`
  );

  const recording = event.presentations?.find(p => p.recording)?.recording;
  let videoUrl = null;
  if (recording) {
    videoUrl = recording.startsWith('http') ? recording : `${ORIGIN}${recording.startsWith('/') ? '' : '/'}${recording}`;
  }

  let logoUrl = null;
  if (event.logo && !event.logo.startsWith('data:')) {
    logoUrl = event.logo.startsWith('http') ? event.logo : `${ORIGIN}${event.logo.startsWith('/') ? '' : '/'}${event.logo}`;
  }

  const canonicalUrl = `${SITE_URL}/events/${slug}/`;
  const hashUrl = `${SITE_URL}/#/${slug}`;

  let videoTags = '';
  if (videoUrl) {
    videoTags = `
    <meta property="og:video" content="${escapeHtml(videoUrl)}" />
    <meta property="og:video:type" content="video/mp4" />
    <meta name="twitter:card" content="player" />
    <meta name="twitter:player" content="${escapeHtml(videoUrl)}" />
    <meta name="twitter:player:width" content="1280" />
    <meta name="twitter:player:height" content="720" />`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />${logoUrl ? `\n  <meta property="og:image" content="${escapeHtml(logoUrl)}" />` : ''}${videoTags}
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />${!videoUrl ? '\n  <meta name="twitter:card" content="summary_large_image" />' : ''}
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
  <meta http-equiv="refresh" content="0;url=${escapeHtml(hashUrl)}" />
</head>
<body>
  <p>Redirecting to <a href="${escapeHtml(hashUrl)}">${escapeHtml(title)}</a>...</p>
</body>
</html>
`;
}

async function main() {
  const eventsDir = join(DIST, 'events');
  let generated = 0;

  const events = await fetchSupabaseEvents();
  for (const { slug, event } of events) {
    try {
      const html = generateOgHtml(slug, event);
      const outDir = join(eventsDir, slug);
      await mkdir(outDir, { recursive: true });
      await writeFile(join(outDir, 'index.html'), html, 'utf-8');
      generated++;
      console.log(`[OG] Generated ${slug}/index.html`);
    } catch (err) {
      console.error(`[OG] Failed for ${slug}:`, err.message);
    }
  }

  console.log(`[OG] Done: ${generated} event page(s) generated.`);
}

main().catch(console.error);
