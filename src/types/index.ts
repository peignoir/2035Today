export type StoryTone = 'optimistic' | 'dystopian';

export interface ShareablePresentation {
  speakerName: string;
  storyName: string;
  storyTone: string;
  speakerBio?: string;
  socialX?: string;
  socialInstagram?: string;
  socialLinkedin?: string;
  recording?: string;     // CDN URL
  fileName?: string;      // PDF filename (admin display)
}

export interface ShareableEvent {
  name: string;
  city: string;
  date: string;
  link: string;
  presentations: ShareablePresentation[];
  logo?: string;              // CDN URL
  recordEnabled?: boolean;    // admin-only flag
}

// Presentation runtime types (in-memory only)
export interface SlideImage {
  pageNumber: number;
  objectUrl: string;
  width: number;
  height: number;
}

export interface LoadedDeck {
  fileName: string;
  slides: SlideImage[];
  aspectRatio: number;
}

export interface TimerState {
  currentSlide: number;
  slideElapsed: number;
  totalElapsed: number;
  isPaused: boolean;
  isFinished: boolean;
}
