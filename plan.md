# Storage Migration Plan: Supabase Storage

## Problem
- Videos pushed to GitHub via base64 API calls (fragile, slow, 100MB limit)
- Race conditions between blob URLs and publish flow
- IndexedDB recordings lost if browser data cleared
- Safari fMP4 playback issues
- No proper CDN for video delivery

## Solution: Supabase Storage (minimal change approach)

Replace GitHub API uploads with Supabase Storage. Keep everything else the same.

**Why Supabase Storage:**
- Direct binary upload (no base64 encoding — eliminates the #1 pain point)
- S3-backed with CDN — fast on mobile and desktop
- File size up to 5GB (vs GitHub's 100MB)
- Free tier: 1GB storage, 5GB bandwidth
- One `npm install`, one new config file, one file rewrite
- Upgrade path to Postgres + Auth when multi-organizer is needed

**What stays the same:**
- IndexedDB for drafts/editing (works fine for single organizer)
- React Router, GitHub Pages for the SPA itself
- Client-side MP4 remux before upload
- EventLandingScreen, EventSetupScreen, EventsListScreen — unchanged
- `publishEvent()` function signature — unchanged (callers don't change)

## Changes

### 1. Setup (manual, no code)
- Create Supabase project (free tier)
- Create public storage bucket `events`
- Note project URL + anon key

### 2. New file: `src/lib/supabase.ts` (~10 lines)
- Initialize Supabase client with env vars

### 3. Rewrite: `src/lib/publishEvent.ts`
- Replace GitHub API calls with `supabase.storage.from('events').upload()`
- Direct blob upload (no blobToBase64 — this was the fragile part)
- Remove GitHub token prompt, use Supabase anon key
- Recording URLs become full Supabase CDN URLs
- Same function signature: `publishEvent(slug, event, presentationIds)`

### 4. Small edit: `src/components/EventLandingPage.tsx` (1 line)
- Change JSON fetch URL from GitHub Pages path to Supabase Storage URL

### 5. Small edit: `scripts/generate-og-pages.mjs`
- Handle absolute Supabase URLs in video/logo OG tags
- Keep JSON files in repo for build-time OG generation (they're <1KB each)

### 6. Config: `.env` file
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### 7. Dependency: `@supabase/supabase-js`

### 8. Migrate existing event
- Upload tallinn/2026-02-27 MP4 + logo + JSON to Supabase bucket

## Files changed summary
| File | Change |
|------|--------|
| `src/lib/supabase.ts` | New (10 lines) |
| `src/lib/publishEvent.ts` | Rewrite (same signature) |
| `src/components/EventLandingPage.tsx` | 1 line URL change |
| `scripts/generate-og-pages.mjs` | Handle absolute URLs |
| `.env` | New (2 vars) |
| `package.json` | Add @supabase/supabase-js |

No changes to: db.ts, EventLandingScreen, EventSetupScreen, EventsListScreen, convertToMp4, App.tsx
