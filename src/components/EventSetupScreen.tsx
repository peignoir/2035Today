import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import type { ShareableEvent, ShareablePresentation, StoryTone } from '../types';
import { loadEvent, saveEvent, uploadLogo, uploadRecording, deleteRecording, uploadPdf, deletePdf } from '../lib/storage';
import { loadAndRenderPdf, PdfValidationError } from '../lib/pdfRenderer';
import { generateLogo } from '../lib/generateLogo';
import styles from './EventSetupScreen.module.css';

export function EventSetupScreen() {
  const { '*': slugParam } = useParams();
  const slug = slugParam || '';
  const navigate = useNavigate();

  const [event, setEvent] = useState<ShareableEvent | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingRecIdx, setUploadingRecIdx] = useState<number | null>(null);
  const [uploadRecProgress, setUploadRecProgress] = useState(0);
  const [uploadRecError, setUploadRecError] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const uploadAbortRef = useRef<AbortController | null>(null);

  const isUploading = uploadingRecIdx !== null;

  // Load event data from Supabase
  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      const ev = await loadEvent(slug);
      if (cancelled) return;
      if (!ev) {
        const [city, date] = slug.split('/');
        const newEvent: ShareableEvent = {
          name: '',
          city: city || '',
          date: date || new Date().toISOString().split('T')[0],
          link: '',
          presentations: [],
        };
        await saveEvent(slug, newEvent);
        setEvent(newEvent);
      } else {
        setEvent(ev);
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  // Debounced save to Supabase
  const save = useCallback((updated: ShareableEvent) => {
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveEvent(slug, updated).catch(console.error);
    }, 800);
  }, [slug]);

  const updateField = useCallback((field: keyof ShareableEvent, value: string | boolean) => {
    setEvent((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, [field]: value };
      save(updated);
      return updated;
    });
  }, [save]);

  const toggleRecording = useCallback(() => {
    setEvent((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, recordEnabled: !prev.recordEnabled };
      save(updated);
      return updated;
    });
  }, [save]);

  const togglePublic = useCallback(() => {
    setEvent((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, isPublic: !prev.isPublic };
      save(updated);
      return updated;
    });
  }, [save]);

  // Logo upload — immediately to Supabase
  const onLogoDrop = useCallback(async (files: File[]) => {
    if (files.length === 0 || !slug || !event) return;
    const file = files[0];
    setUploadingLogo(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const cdnUrl = await uploadLogo(slug, file, ext);
      setEvent((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, logo: cdnUrl };
        save(updated);
        return updated;
      });
    } catch (e) {
      console.error('Logo upload failed:', e);
    } finally {
      setUploadingLogo(false);
    }
  }, [slug, event, save]);

  const handleRemoveLogo = useCallback(() => {
    setEvent((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, logo: undefined };
      save(updated);
      return updated;
    });
  }, [save]);

  const handleGenerateLogo = useCallback(async () => {
    if (!event || !slug) return;
    setUploadingLogo(true);
    try {
      const blob = await generateLogo(event.name, event.city);
      const cdnUrl = await uploadLogo(slug, blob, 'png');
      setEvent((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, logo: cdnUrl };
        save(updated);
        return updated;
      });
    } catch (e) {
      console.error('Logo generation failed:', e);
    } finally {
      setUploadingLogo(false);
    }
  }, [event, slug, save]);

  const logoDropzone = useDropzone({
    onDrop: onLogoDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.svg', '.webp'] },
    multiple: false,
  });

  // PDF upload — validate, upload to Supabase, add presentation to event
  const onPdfDrop = useCallback(async (files: File[]) => {
    if (files.length === 0 || !event || !slug) return;
    const file = files[0];
    setPdfError(null);
    setPdfLoading(true);
    setPdfProgress(0);

    try {
      const deck = await loadAndRenderPdf(file, (page) => setPdfProgress(page));
      deck.slides.forEach((s) => URL.revokeObjectURL(s.objectUrl));

      // Upload PDF to Supabase storage
      const newIndex = event.presentations.length;
      const pdfUrl = await uploadPdf(slug, newIndex, file);

      const newPres: ShareablePresentation = {
        fileName: file.name,
        speakerName: '',
        storyName: '',
        storyTone: 'optimistic',
        pdfUrl,
      };

      const updated = { ...event, presentations: [...event.presentations, newPres] };
      clearTimeout(saveTimerRef.current);
      await saveEvent(slug, updated);
      console.log('[Storage] JSON saved with new presentation');
      setEvent(updated);
    } catch (err) {
      if (err instanceof PdfValidationError) {
        setPdfError(err.message);
      } else {
        console.error('PDF drop failed:', err);
        setPdfError('Failed to load PDF. The file may be corrupted.');
      }
    } finally {
      setPdfLoading(false);
    }
  }, [event, slug]);

  const pdfDropzone = useDropzone({
    onDrop: onPdfDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxSize: 30 * 1024 * 1024,
    multiple: false,
    disabled: pdfLoading,
  });

  const updatePresField = useCallback((index: number, field: keyof ShareablePresentation, value: string) => {
    setEvent((prev) => {
      if (!prev) return prev;
      const presentations = prev.presentations.map((p, i) =>
        i === index ? { ...p, [field]: value } : p,
      );
      const updated = { ...prev, presentations };
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        saveEvent(slug, updated).catch(console.error);
      }, 800);
      return updated;
    });
  }, [slug]);

  const handleDeleteRecording = useCallback(async (index: number) => {
    if (!event) return;
    try { await deleteRecording(slug, index); } catch { /* ignore */ }
    setEvent((prev) => {
      if (!prev) return prev;
      const presentations = prev.presentations.map((p, i) =>
        i === index ? { ...p, recording: undefined } : p,
      );
      const updated = { ...prev, presentations };
      save(updated);
      return updated;
    });
  }, [event, slug, save]);

  const handleUploadRecording = useCallback(async (index: number) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/mp4,.mp4';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      // Validate duration (~5 min)
      const duration = await new Promise<number>((resolve, reject) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
          URL.revokeObjectURL(video.src);
          resolve(video.duration);
        };
        video.onerror = () => {
          URL.revokeObjectURL(video.src);
          reject(new Error('Cannot read video'));
        };
        video.src = URL.createObjectURL(file);
      });

      if (duration < 60 || duration > 420) {
        setUploadRecError(`Video is ${Math.round(duration)}s — expected ~5 min (1–7 min accepted).`);
        setTimeout(() => setUploadRecError(null), 5000);
        return;
      }

      const sizeMB = file.size / (1024 * 1024);
      if (sizeMB > 200) {
        setUploadRecError(`File is ${sizeMB.toFixed(0)}MB — max 200MB. Compress the video first.`);
        setTimeout(() => setUploadRecError(null), 5000);
        return;
      }

      setUploadingRecIdx(index);
      setUploadRecProgress(0);
      setUploadRecError(null);
      const abort = new AbortController();
      uploadAbortRef.current = abort;

      try {
        const cdnUrl = await uploadRecording(slug, index, file, (pct) => {
          setUploadRecProgress(pct);
        }, abort.signal);

        setUploadRecProgress(100); // Server confirmed — now show "Done!"

        setEvent((prev) => {
          if (!prev) return prev;
          const presentations = prev.presentations.map((p, i) =>
            i === index ? { ...p, recording: cdnUrl } : p,
          );
          const updated = { ...prev, presentations };
          // Flush immediately — don't debounce after recording upload
          clearTimeout(saveTimerRef.current);
          saveEvent(slug, updated).catch(console.error);
          return updated;
        });

        uploadAbortRef.current = null;
        setTimeout(() => {
          setUploadingRecIdx(null);
          setUploadRecProgress(0);
        }, 1000);
      } catch (e) {
        uploadAbortRef.current = null;
        const msg = e instanceof Error ? e.message : 'Upload failed';
        if (msg !== 'Upload cancelled') setUploadRecError(msg);
        setUploadingRecIdx(null);
        setUploadRecProgress(0);
      }
    };
    input.click();
  }, [slug, save]);

  const handleCancelUpload = useCallback(() => {
    uploadAbortRef.current?.abort();
    uploadAbortRef.current = null;
    setUploadingRecIdx(null);
    setUploadRecProgress(0);
  }, []);

  const handleFullscreenPlay = useCallback((index: number) => {
    const video = document.querySelector(`[data-rec-idx="${index}"]`) as HTMLVideoElement | null;
    if (video) {
      video.requestFullscreen?.();
      video.play();
    }
  }, []);

  // Re-upload PDF for a presentation that's missing its pdfUrl (legacy migration)
  const [reuploadingIdx, setReuploadingIdx] = useState<number | null>(null);
  const handleReuploadPdf = useCallback(async (index: number) => {
    if (!event || !slug) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf,.pdf';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setReuploadingIdx(index);
      try {
        // Skip full PDF validation — just upload the binary to Supabase.
        const pdfUrl = await uploadPdf(slug, index, file);
        // Build the updated event and await the save (don't fire-and-forget)
        const updated = {
          ...event,
          presentations: event.presentations.map((p, i) =>
            i === index ? { ...p, pdfUrl, fileName: file.name } : p,
          ),
        };
        clearTimeout(saveTimerRef.current);
        await saveEvent(slug, updated);
        console.log(`[Storage] JSON saved with pdfUrl for presentation ${index}`);
        setEvent(updated);
      } catch (e) {
        console.error('PDF re-upload failed:', e);
        alert(`PDF upload failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
      } finally {
        setReuploadingIdx(null);
      }
    };
    input.click();
  }, [event, slug]);

  const handleDeletePres = useCallback(async (index: number) => {
    if (!event) return;
    if (event.presentations[index]?.recording) {
      try { await deleteRecording(slug, index); } catch { /* ignore */ }
    }
    if (event.presentations[index]?.pdfUrl) {
      try { await deletePdf(slug, index); } catch { /* ignore */ }
    }
    setEvent((prev) => {
      if (!prev) return prev;
      const presentations = prev.presentations.filter((_, i) => i !== index);
      const updated = { ...prev, presentations };
      save(updated);
      return updated;
    });
  }, [event, slug, save]);

  const handleMove = useCallback((index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    setEvent((prev) => {
      if (!prev) return prev;
      if (newIndex < 0 || newIndex >= prev.presentations.length) return prev;
      const presentations = [...prev.presentations];
      [presentations[index], presentations[newIndex]] = [presentations[newIndex], presentations[index]];
      const updated = { ...prev, presentations };
      save(updated);
      return updated;
    });
  }, [save]);

  const [copied, setCopied] = useState(false);

  const shareUrl = `${window.location.origin}${import.meta.env.BASE_URL}events/${slug}/`;

  const handlePublish = useCallback(async () => {
    // Flush any pending debounced save
    clearTimeout(saveTimerRef.current);
    if (event) await saveEvent(slug, event);
    window.open(`${window.location.origin}${import.meta.env.BASE_URL}#/${slug}`, '_blank');
  }, [slug, event]);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [shareUrl]);

  const handleBack = useCallback(() => {
    clearTimeout(saveTimerRef.current);
    if (event) saveEvent(slug, event).catch(console.error);
    navigate('/admin');
  }, [navigate, slug, event]);

  if (!event) {
    return <div className={styles.container}><div className={styles.loading}>Loading...</div></div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backButton} onClick={handleBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Gatherings
        </button>
        <div className={styles.headerActions}>
          <button className={styles.copyLinkButton} onClick={handleCopyLink} title="Copy share link">
            {copied ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            )}
            {copied ? 'Copied!' : 'Share'}
          </button>
          <button className={styles.shareButton} onClick={handlePublish} disabled={isUploading}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="17 1 21 5 17 9" />
              <path d="M3 11V9a4 4 0 0 1 4-4h14" />
            </svg>
            Publish
          </button>
        </div>
      </header>

      <div className={styles.form}>
        {/* Event details */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Event Details</h2>
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Event Name</label>
            <input
              className={styles.input}
              type="text"
              value={event.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="e.g. Caf\u00e9 2035 Tallinn"
              autoFocus={!event.name}
            />
          </div>
          <div className={styles.row}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>City</label>
              <input
                className={styles.input}
                type="text"
                value={event.city}
                onChange={(e) => updateField('city', e.target.value)}
                placeholder="e.g. Tallinn"
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Date</label>
              <input
                className={styles.input}
                type="date"
                value={event.date}
                onChange={(e) => updateField('date', e.target.value)}
              />
            </div>
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Gathering Link</label>
            <input
              className={styles.input}
              type="url"
              value={event.link ?? ''}
              onChange={(e) => updateField('link', e.target.value)}
              placeholder="e.g. https://lu.ma/your-event"
            />
          </div>

          <div className={styles.toggleRow}>
            <button
              className={`${styles.toggle} ${event.recordEnabled ? styles.toggleOn : ''}`}
              onClick={toggleRecording}
              type="button"
              aria-pressed={event.recordEnabled ?? false}
            >
              <span className={styles.toggleThumb} />
            </button>
            <span className={styles.toggleLabel}>
              Capture {event.recordEnabled ? 'ON' : 'OFF'}
            </span>
          </div>

          <div className={styles.toggleRow}>
            <button
              className={`${styles.toggle} ${event.isPublic ? styles.toggleOn : ''}`}
              onClick={togglePublic}
              type="button"
              aria-pressed={event.isPublic ?? false}
            >
              <span className={styles.toggleThumb} />
            </button>
            <span className={styles.toggleLabel}>
              Public {event.isPublic ? 'ON' : 'OFF'}
              <span style={{ fontSize: '0.8em', color: '#888', marginLeft: 6 }}>
                (shows on community homepage)
              </span>
            </span>
          </div>
        </section>

        {/* Logo */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Event Logo</h2>
          {uploadingLogo ? (
            <div className={styles.logoPreview}>
              <p style={{ color: '#999' }}>Uploading...</p>
            </div>
          ) : event.logo ? (
            <div className={styles.logoPreview}>
              <img src={event.logo} alt="Event logo" className={styles.logoImage} />
              <button className={styles.removeLogo} onClick={handleRemoveLogo}>Remove</button>
            </div>
          ) : (
            <div>
              <div {...logoDropzone.getRootProps()} className={`${styles.dropzone} ${styles.dropzoneSmall}`}>
                <input {...logoDropzone.getInputProps()} />
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <span>Drop your event logo, or click to browse</span>
              </div>
              <button
                className={styles.removeLogo}
                onClick={handleGenerateLogo}
                style={{ marginTop: '8px' }}
              >
                Auto-generate logo
              </button>
            </div>
          )}
        </section>

        {/* Presentations */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            Stories
            {event.presentations.length > 0 && (
              <span className={styles.badge}>{event.presentations.length}</span>
            )}
          </h2>

          {event.presentations.length > 0 && (
            <div className={styles.presList}>
              {event.presentations.map((pres, index) => (
                <div key={index} className={styles.presItem}>
                  <div className={styles.presOrder}>
                    <button
                      className={styles.arrowButton}
                      onClick={() => handleMove(index, -1)}
                      disabled={index === 0}
                      aria-label="Move up"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15" /></svg>
                    </button>
                    <span className={styles.presNumber}>{index + 1}</span>
                    <button
                      className={styles.arrowButton}
                      onClick={() => handleMove(index, 1)}
                      disabled={index === event.presentations.length - 1}
                      aria-label="Move down"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                    </button>
                  </div>
                  <div className={styles.presInfo}>
                    <div className={styles.presFileRow}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                      <span className={styles.presFileName}>{pres.fileName || 'Story'}</span>
                      <span className={styles.presSlides}>20 slides</span>
                      {pres.pdfUrl ? (
                        <span className={styles.pdfOk} title="PDF stored in cloud">☁️</span>
                      ) : (
                        reuploadingIdx === index ? (
                          <span className={styles.pdfMissing}>Uploading…</span>
                        ) : (
                          <button
                            className={styles.pdfMissingBtn}
                            onClick={() => handleReuploadPdf(index)}
                            title="PDF not in cloud — click to upload"
                          >
                            ⚠️ Upload PDF
                          </button>
                        )
                      )}
                    </div>
                    <div className={styles.presFields}>
                      <input
                        className={`${styles.presInput} ${!pres.speakerName?.trim() ? styles.presInputRequired : ''}`}
                        type="text"
                        value={pres.speakerName ?? ''}
                        onChange={(e) => updatePresField(index, 'speakerName', e.target.value)}
                        placeholder="Speaker name *"
                      />
                      <input
                        className={`${styles.presInput} ${!pres.storyName?.trim() ? styles.presInputRequired : ''}`}
                        type="text"
                        value={pres.storyName ?? ''}
                        onChange={(e) => updatePresField(index, 'storyName', e.target.value)}
                        placeholder="Story name *"
                      />
                    </div>
                    <div className={styles.toneRow}>
                      <span className={styles.toneRowLabel}>Story vibe</span>
                      {([
                        ['optimistic', '\u2600\uFE0F', 'Optimistic'],
                        ['dystopian', '\uD83C\uDF11', 'Dystopian'],
                      ] as [StoryTone, string, string][]).map(([tone, emoji, label]) => (
                        <button
                          key={tone}
                          className={`${styles.toneButton} ${((pres.storyTone as string) === 'dystopian' || (pres.storyTone as string) === 'black' ? 'dystopian' : 'optimistic') === tone ? styles.toneActive : ''}`}
                          onClick={() => updatePresField(index, 'storyTone', tone)}
                          title={label}
                          type="button"
                        >
                          <span>{emoji}</span>
                          <span className={styles.toneLabel}>{label}</span>
                        </button>
                      ))}
                    </div>
                    <textarea
                      className={styles.presTextarea}
                      value={pres.speakerBio ?? ''}
                      onChange={(e) => updatePresField(index, 'speakerBio', e.target.value)}
                      placeholder="Short speaker bio (optional)"
                      rows={2}
                    />
                    <div className={styles.socialRow}>
                      <div className={styles.socialField}>
                        <span className={styles.socialIcon}>{'\uD835\uDD4F'}</span>
                        <input
                          className={styles.presInput}
                          type="text"
                          value={pres.socialX ?? ''}
                          onChange={(e) => updatePresField(index, 'socialX', e.target.value)}
                          placeholder="@handle"
                        />
                      </div>
                      <div className={styles.socialField}>
                        <span className={styles.socialIcon}>IG</span>
                        <input
                          className={styles.presInput}
                          type="text"
                          value={pres.socialInstagram ?? ''}
                          onChange={(e) => updatePresField(index, 'socialInstagram', e.target.value)}
                          placeholder="@handle"
                        />
                      </div>
                      <div className={styles.socialField}>
                        <span className={styles.socialIcon}>in</span>
                        <input
                          className={styles.presInput}
                          type="text"
                          value={pres.socialLinkedin ?? ''}
                          onChange={(e) => updatePresField(index, 'socialLinkedin', e.target.value)}
                          placeholder="LinkedIn URL"
                        />
                      </div>
                    </div>
                    {pres.recording ? (
                      <div className={styles.recordingPreview}>
                        <video
                          className={styles.recordingVideo}
                          data-rec-idx={index}
                          src={pres.recording}
                          controls
                          preload="metadata"
                        />
                        <div className={styles.recordingActions}>
                          <button
                            className={styles.recordingAction}
                            onClick={() => handleFullscreenPlay(index)}
                            title="Play fullscreen"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="15 3 21 3 21 9" />
                              <polyline points="9 21 3 21 3 15" />
                              <line x1="21" y1="3" x2="14" y2="10" />
                              <line x1="3" y1="21" x2="10" y2="14" />
                            </svg>
                            Fullscreen
                          </button>
                          <a
                            className={styles.recordingAction}
                            href={pres.recording}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Download"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="7 10 12 15 17 10" />
                              <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            Download
                          </a>
                          <button
                            className={`${styles.recordingAction} ${styles.recordingActionDanger}`}
                            onClick={() => handleDeleteRecording(index)}
                            title="Delete recording"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                              <path d="M10 11v6" />
                              <path d="M14 11v6" />
                            </svg>
                            Delete
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className={styles.uploadRecording}>
                        {uploadingRecIdx === index ? (
                          <div className={styles.uploadRecRow}>
                            <div className={styles.uploadRecBar}>
                              <div className={styles.uploadRecFill} style={{ width: `${uploadRecProgress}%` }} />
                              <span>{uploadRecProgress >= 100 ? 'Done!' : uploadRecProgress >= 99 ? 'Finalizing…' : `Uploading… ${uploadRecProgress}%`}</span>
                            </div>
                            {uploadRecProgress < 100 && (
                              <button className={styles.uploadRecCancel} onClick={handleCancelUpload} title="Cancel upload">
                                ✕
                              </button>
                            )}
                          </div>
                        ) : (
                          <button
                            className={styles.uploadRecButton}
                            onClick={() => handleUploadRecording(index)}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="17 8 12 3 7 8" />
                              <line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                            Upload recording (MP4, ~5 min)
                          </button>
                        )}
                        {uploadRecError && (
                          <p className={styles.uploadRecError}>{uploadRecError}</p>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    className={styles.presDelete}
                    onClick={() => handleDeletePres(index)}
                    aria-label="Delete presentation"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          <div
            {...pdfDropzone.getRootProps()}
            className={`${styles.dropzone} ${pdfLoading ? styles.dropzoneLoading : ''}`}
          >
            <input {...pdfDropzone.getInputProps()} />
            {pdfLoading ? (
              <div className={styles.pdfLoadingBar}>
                <div className={styles.pdfLoadingFill} style={{ width: `${(pdfProgress / 20) * 100}%` }} />
                <span>Validating slide {pdfProgress} of 20...</span>
              </div>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>Add story (PDF, 20 slides, max 30 MB)</span>
              </>
            )}
          </div>

          {pdfError && (
            <div className={styles.error}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
              {pdfError}
            </div>
          )}
        </section>
      </div>

      <div className={styles.bottomActions}>
        <button className={styles.saveButton} onClick={handleBack} disabled={isUploading}>
          Save
        </button>
      </div>
    </div>
  );
}
