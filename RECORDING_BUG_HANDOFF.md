# Recording Video Truncation Bug — Handoff

## Symptom

Full 5-minute recording produces an MP4 where:
- **Audio track:** complete 5:00, plays end-to-end correctly
- **Video track:** truncates at an apparently-random point (observed: 17s, 75s, 28s) then shows a frozen single frame for the rest of playback duration
- **Total file duration metadata:** correct (matches wall-clock recording time)

No errors, no warnings. The recording "succeeds" and uploads cleanly. The problem is purely in the encoded video track length.

## Browser / Platform

- Safari on macOS (user's primary browser)
- MediaRecorder MIME: `video/mp4;codecs=avc1,mp4a.40.2`
- H.264 + AAC MP4 output
- Not verified on Chrome — user uses Safari

## Diagnostic signals during recording

A 5-second heartbeat logs recorder + track state. Throughout a 300-second recording:
- `rec=recording` (never transitions to paused or inactive)
- `video track: readyState=live, muted=false, enabled=true` (NEVER changes)
- `audio track: readyState=live, muted=false, enabled=true` (NEVER changes)

So from the MediaRecorder API's perspective, **nothing is wrong**. Tracks stay alive. The bug is inside Safari's MP4 muxer/encoder — frames arrive at the encoder but don't make it into the output file past a certain point.

## What has been tried (and didn't work)

All in `src/hooks/useMediaRecorder.ts`:

1. **Timeslice concatenation** (`recorder.start(10000)`) — Safari emits each chunk as a self-contained MP4; concatenation produces a file that only plays the first chunk.
2. **No timeslice** (`recorder.start()`) — resolved the 10s-only-playback bug but didn't fix truncation.
3. **`captureStream(1)` + manual `requestFrame()` via 30fps RAF loop** — produced "17s video" because frame timestamps were irregular.
4. **`captureStream(30)` auto-capture + manual requestFrame** — undefined interleaving; didn't help.
5. **`captureStream(0)` manual-only mode** — same truncation.
6. **Offscreen canvas at `left: -99999px, opacity: 0`** — suspected non-rendering; moved to DOM visible.
7. **Visible canvas at 2×2px top-left corner, max z-index** — still truncates.
8. **Lower resolution (960×540 instead of 1280×720)** — no change.
9. **Explicit bitrates (1.5 Mbps video / 128 kbps audio)** — no change.
10. **5s flush delay before `stop()`** — no change (because frames were never captured in the first place).
11. **`requestData()` before `stop()`** — made Safari emit 0-byte blobs. Removed.
12. **Plain `video/mp4` MIME without codecs** — made Safari emit 0-byte blobs. Reverted.
13. **Auto-pause on `visibilitychange`** — corrupted Safari MP4 output when user tabbed away briefly. Removed.
14. **30fps canvas-damage loop** (draws a toggling 1px pixel at 30Hz to force Safari's captureStream to sample) — **user reports still truncates**.

## Current state (commit `1fb7ff3`, latest on main)

- Canvas: 960×540 intrinsic, attached to DOM at `top:0 left:0 width:2px height:2px z-index:max`
- `captureStream(30)` automatic mode
- RAF loop at 30fps drawing 1px in bottom-right corner (damage-forcing)
- MediaRecorder no-timeslice, MIME `video/mp4;codecs=avc1,mp4a.40.2`, bitrates 1.5Mbps/128kbps
- `start()` → drawSlide on slide change → drawOverlay on 1Hz tick → `stop()` waits for both `dataavailable` and `onstop`
- 5s heartbeat log + diagnostic upload log
- Download-on-upload-error safety net in `EventRunScreen.tsx`

## Core hypothesis (unverified)

This is a known WebKit bug: Safari's MediaRecorder + canvas.captureStream combination truncates the video track under certain conditions that aren't clearly documented in the spec. Possibilities:

1. **Encoder backpressure** — encoder can't process frames as fast as they arrive, drops them silently after an internal buffer fills. But lowering resolution + bitrate didn't help.
2. **Muxer frame-timestamp drift** — encoded frames' timestamps drift from the audio track, muxer drops video frames that fall outside some tolerance window.
3. **Canvas compositor throttling** — despite the damage loop, Safari may still de-prioritize rendering of tiny/occluded canvases, starving captureStream.
4. **MediaStream lifetime issue** — the MediaStream built from combining canvas+audio tracks may silently drop the video track after some internal timer.

## Untried approaches worth exploring

1. **WebCodecs API (VideoEncoder + MediaStreamTrackProcessor/Generator)** — bypass MediaRecorder entirely. Safari 15.4+ supports VideoEncoder. Build encoded video frames manually, mux with AudioEncoder output using mp4-muxer (npm library). Full control over timing.
2. **Chunked recording with client-side remux** — use `start(timeslice)` to get multiple MP4 files, re-mux them into one using `@ffmpeg/wasm` or `mp4-muxer`.
3. **Switch the visible SlideCanvas (the real presentation canvas the user sees, not a hidden one) to be the capture source.** It's actually on-screen being painted at full size — no compositor throttling. Add overlay to that canvas too or composite at render.
4. **Drop MediaRecorder entirely.** Record audio with AudioContext/MediaRecorder(audio-only). Record slide change timestamps. Reconstruct video at export time by sequencing the 20 slide PNGs with proper timing using `mp4-muxer` or server-side ffmpeg.
5. **Try Chrome and add UA-detect warning for Safari.** If Chrome works reliably, punt on Safari until WebKit fixes the bug.
6. **Test with a different MP4 codec string** — `avc1.42E01E` (baseline) or `avc1.4D401E` (main) instead of the default `avc1` — might pick a more stable encoder path.

## Files involved

- `src/hooks/useMediaRecorder.ts` — all the recording logic
- `src/components/PresentationScreen.tsx` — consumes the hook, drives slide/overlay updates
- `src/components/EventRunScreen.tsx` — orchestrates recording + upload + retry/download UX
- `src/lib/storage.ts` — Supabase upload with detailed logging (working correctly — confirmed 6MB/5min uploads succeed)

## What IS working

- Upload to Supabase Storage (verified 6MB uploads in ~3s, 200 response)
- Audio track capture (full 5 min, reliable)
- MediaRecorder stop/finalize dual-event handling
- PDF → slide image rendering
- Saving indicator UI during stop
- Download blob fallback on upload error

## Backup branch

`backup/pre-changes-2026-04-04` has the state from before this whole session's changes.

## Commits in this session (most recent first)

```
1fb7ff3 Force 30fps canvas damage so Safari captureStream keeps sampling
3aab71f Stop auto-pausing recorder on visibility change
9bf26cc Detailed Supabase upload logging for diagnostics
cc89328 Add Download button on upload error so recording can't be lost
8477f7d Diagnose 17s freeze: lower res, explicit bitrates, track heartbeat
f3801bf Rewrite recorder: visible tiny canvas + auto-capture, no RAF loop
ad5ea51 Bump encoder-flush delay to 5s + safety timeout to 12s
e53c914 Show Saving indicator on early-exit too
2ce1e12 Revert MIME simplification + drop requestData, add Saving indicator
d67fda9 Bump encoder-flush delay to 3s + safety timeout to 10s
9321d69 Restore 30fps capture, flush encoder pipeline with requestData
d461daf Fix truncated video tail: drop to 15fps + flush delay before stop
9fcbff8 Harden recording + drop dead code
98cd4ba Fix frozen video: attach canvas to DOM, use captureStream(0) manual mode
5f6621b Wait for both dataavailable and stop events before finalizing blob
9196472 Drop timeslice from MediaRecorder to fix short-playback bug
bad7a18 Fix video-cut-short: drive captureStream at 30fps via RAF loop
979093b Show OpenAI token usage badge on application cards
```
