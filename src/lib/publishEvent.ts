import type { ShareableEvent } from '../types';
import { getRecordingBlob } from './db';
import { remuxToProgressiveMp4, convertWebmToMp4 } from './convertToMp4';

const TOKEN_KEY = 'github_token';

function getRepoInfo(): { owner: string; repo: string } {
  const owner = window.location.hostname.split('.')[0];
  const repo = import.meta.env.BASE_URL.replace(/\//g, '');
  return { owner, repo };
}

function getToken(): string | null {
  let token = localStorage.getItem(TOKEN_KEY);
  if (token) return token;
  token = window.prompt('Enter a GitHub token with Contents write access to publish this event:');
  if (token) {
    localStorage.setItem(TOKEN_KEY, token.trim());
    return token.trim();
  }
  return null;
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function pushFile(
  owner: string, repo: string, path: string,
  content: string, message: string, headers: Record<string, string>,
): Promise<void> {
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

  // Check if file already exists (need SHA for updates)
  let sha: string | undefined;
  try {
    const existing = await fetch(apiUrl, { headers });
    if (existing.ok) {
      sha = (await existing.json()).sha;
    }
  } catch { /* file doesn't exist yet */ }

  const resp = await fetch(apiUrl, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ message, content, ...(sha && { sha }) }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    if (resp.status === 401 || resp.status === 403) {
      localStorage.removeItem(TOKEN_KEY);
      alert('GitHub token is invalid or lacks permissions. It has been cleared — try again.');
    }
    throw new Error(`Push failed for ${path}: ${resp.status} ${body}`);
  }
}

/** Publish event JSON, recordings, and logo to the repo.
 *  Works on a deep copy to avoid races with callers mutating the original. */
export async function publishEvent(
  slug: string,
  event: ShareableEvent,
  presentationIds?: string[],
): Promise<void> {
  const token = getToken();
  if (!token) return;

  // Deep-clone so callers can freely mutate the original (e.g. set blob URLs)
  const pub: ShareableEvent = JSON.parse(JSON.stringify(event));

  const { owner, repo } = getRepoInfo();
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept': 'application/vnd.github+json',
  };

  // Publish recordings as separate files
  if (presentationIds) {
    for (let i = 0; i < presentationIds.length; i++) {
      let blob = await getRecordingBlob(presentationIds[i]);
      if (!blob) continue;
      try {
        // Convert to standard progressive MP4 for maximum compatibility
        // Safari's MediaRecorder produces fragmented MP4 (fMP4) which Safari
        // itself can't play as a progressive download. WebM needs full transcode.
        if (blob.type.includes('webm')) {
          console.log(`[Publish] Converting WebM recording ${i} to MP4…`);
          blob = await convertWebmToMp4(blob);
        } else if (blob.type.includes('mp4')) {
          console.log(`[Publish] Re-muxing fMP4 recording ${i} to progressive MP4…`);
          blob = await remuxToProgressiveMp4(blob);
        }
        const recPath = `public/events/${slug}-${i}.mp4`;
        console.log(`[Publish] Uploading recording ${i} (${(blob.size / 1024 / 1024).toFixed(1)}MB ${blob.type})`);
        const recContent = await blobToBase64(blob);
        await pushFile(owner, repo, recPath, recContent, `Publish recording: ${slug} #${i}`, headers);
        // Only set URL after successful push
        pub.presentations[i].recording = `${import.meta.env.BASE_URL}events/${slug}-${i}.mp4`;
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

  // Upload logo as separate file (instead of embedding as data URL)
  if (pub.logo && pub.logo.startsWith('data:')) {
    try {
      // Extract mime type and base64 from data URL
      const match = pub.logo.match(/^data:image\/([\w+]+);base64,(.+)$/);
      if (match) {
        const ext = match[1] === 'svg+xml' ? 'svg' : match[1];
        const logoContent = match[2];
        const logoPath = `public/events/${slug}-logo.${ext}`;
        console.log(`[Publish] Uploading logo as ${logoPath}`);
        await pushFile(owner, repo, logoPath, logoContent, `Publish logo: ${slug}`, headers);
        // Replace data URL with path reference
        pub.logo = `${import.meta.env.BASE_URL}events/${slug}-logo.${ext}`;
        console.log(`[Publish] Logo uploaded successfully`);
      }
    } catch (e) {
      console.error('[Publish] Failed to upload logo', e);
      // Keep data URL as fallback if upload fails
    }
  }

  // Publish event JSON (after recording/logo URLs are set)
  const jsonContent = btoa(unescape(encodeURIComponent(JSON.stringify(pub, null, 2))));
  await pushFile(owner, repo, `public/events/${slug}.json`, jsonContent, `Publish event: ${slug}`, headers);
}
