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
  pdfUrl?: string;        // CDN URL to stored PDF
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
  isPublic?: boolean;         // show on community homepage
}

// Organizer application
export interface Application {
  id: string;
  created_at: string;
  name: string;
  email: string;
  city: string;
  company?: string;
  github_url?: string;
  linkedin_url?: string;
  comment?: string;
  search_data?: Record<string, unknown>;
  generated_bio?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_at?: string;
}

// Speaker signup (public form)
export interface SpeakerSignup {
  id: string;
  created_at: string;
  name: string;
  email: string;
  phone?: string;
  format: 'slides' | 'video';
  storyTitle: string;
  authorName: string;
  tone: 'positive' | 'negative';
  description: string;
  status?: 'rejected'; // undefined = pending/active
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
