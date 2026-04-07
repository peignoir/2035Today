import { useEffect, useCallback } from 'react';
import type { ShareablePresentation } from '../types';
import styles from './LogoSplash.module.css';

interface LogoSplashProps {
  logoUrl: string | null;
  eventName: string;
  presentations: ShareablePresentation[];
  playedIds: Set<number>;
  recordEnabled?: boolean;
  uploadBusy?: boolean;
  onPlay: (presIndex: number) => void;
  onDeleteRecording?: (presIndex: number) => void;
  onExit: () => void;
}

export function LogoSplash({
  logoUrl,
  eventName,
  presentations,
  playedIds,
  recordEnabled = false,
  uploadBusy = false,
  onPlay,
  onDeleteRecording,
  onExit,
}: LogoSplashProps) {
  const allPlayed = presentations.length > 0 && presentations.every((_, i) => playedIds.has(i));

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        e.preventDefault();
        // Don't exit while a recording is being uploaded
        if (!uploadBusy) onExit();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onExit, uploadBusy]);

  const handleFullscreen = useCallback((index: number) => {
    const video = document.querySelector(`video[data-rec-idx="${index}"]`) as HTMLVideoElement | null;
    if (video) {
      video.requestFullscreen();
      video.play();
    }
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {logoUrl ? (
          <img src={logoUrl} alt={eventName} className={styles.logo} draggable={false} />
        ) : (
          <h1 className={styles.eventName}>{eventName || '2035Today'}</h1>
        )}

        <div className={styles.action}>
          {allPlayed && (
            <p className={styles.status}>All talks delivered</p>
          )}

          <div className={styles.presList}>
            {presentations.map((pres, index) => {
              const played = playedIds.has(index);
              const name = pres.storyName || pres.speakerName || pres.fileName || 'Story';
              const speaker = pres.storyName && pres.speakerName ? pres.speakerName : null;
              const tone = pres.storyTone as string;
              const toneEmoji = (tone === 'dystopian' || tone === 'black') ? '\uD83C\uDF11' : '\u2600\uFE0F';
              const hasRecording = !!pres.recording;
              const hasPdf = !!pres.pdfUrl;

              return (
                <div key={index} className={styles.presWrapper}>
                  <button
                    className={`${styles.presButton} ${played ? styles.presPlayed : ''} ${!hasPdf ? styles.presDisabled : ''}`}
                    onClick={() => hasPdf && onPlay(index)}
                    disabled={!hasPdf}
                  >
                    <span className={styles.toneEmoji}>{toneEmoji}</span>
                    <span className={`${styles.presIcon} ${hasRecording ? styles.presIconRestart : ''}`}>
                      {!hasPdf ? (
                        <span className={styles.presActionLabel} style={{ color: '#f59e0b' }}>No PDF</span>
                      ) : hasRecording ? (
                        <span className={styles.presActionLabel}>Start Over</span>
                      ) : played ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <span className={styles.presActionLabel}>Go Live</span>
                      )}
                    </span>
                    <span className={styles.presLabel}>
                      <span className={styles.presName}>{name}</span>
                      {speaker && <span className={styles.presSubtitle}>{speaker}</span>}
                    </span>
                    {recordEnabled && hasRecording && (
                      <span className={styles.recBadgeDone} title="Recorded">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        REC
                      </span>
                    )}
                    {recordEnabled && !hasRecording && !played && (
                      <span className={styles.recBadge} title="Will be recorded">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="#ef4444" stroke="none">
                          <circle cx="12" cy="12" r="10" />
                        </svg>
                        REC
                      </span>
                    )}
                  </button>

                  {hasRecording && pres.recording && (
                    <div className={styles.recStrip}>
                      <video
                        className={styles.recVideo}
                        src={pres.recording}
                        data-rec-idx={index}
                        preload="auto"
                        controls
                        playsInline
                      />
                      <div className={styles.recActions}>
                        <button
                          className={styles.recAction}
                          onClick={() => handleFullscreen(index)}
                          title="Fullscreen"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 3 21 3 21 9" />
                            <polyline points="9 21 3 21 3 15" />
                            <line x1="21" y1="3" x2="14" y2="10" />
                            <line x1="3" y1="21" x2="10" y2="14" />
                          </svg>
                          <span>Fullscreen</span>
                        </button>
                        <a
                          className={styles.recAction}
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
                          <span>Download</span>
                        </a>
                        <button
                          className={`${styles.recAction} ${styles.recActionDanger}`}
                          onClick={() => onDeleteRecording?.(index)}
                          title="Delete recording"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <p className={styles.letsGo}>See 2035.</p>

          <button className={styles.exitButton} onClick={onExit}>
            Close the Window
          </button>
        </div>
      </div>

      <div className={styles.bottomInfo}>
        {eventName && <span>{eventName}</span>}
        {presentations.length > 0 && (
          <span className={styles.presCounter}>
            {playedIds.size} / {presentations.length}
          </span>
        )}
      </div>
    </div>
  );
}
