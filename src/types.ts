export interface RoadmapModule {
  id: string;
  title: string;
  description: string;
  icon: string;
  duration: string;
}

export interface Roadmap {
  topic: string;
  difficulty: string;
  totalDuration: string;
  tagline: string;
  objectives: string[];
  modules: RoadmapModule[];
}

export interface KeyTerm {
  term: string;
  definition: string;
}

export interface LessonCard {
  id: string;
  moduleId: string;
  moduleTitle: string;
  moduleIcon: string;
  title: string;
  explanation: string;
  analogy: string;
  keyTerms: KeyTerm[];
  quizQuestion: string;
  quizOptions: string[];
  quizCorrectIndex: number;
  quizExplanation: string;
  /** 2–4 word visual keyword for Cloudinary contextual image (e.g. "neural network diagram") */
  imageKeyword?: string;
}

export interface Lesson {
  topic: string;
  cards: LessonCard[];
}

export type Confidence = 'low' | 'medium' | 'high';

export interface QuizResponse {
  cardId: string;
  question: string;
  selectedIndex: number;
  correctIndex: number;
  isCorrect: boolean;
  confidence: Confidence;
  explanation: string;
}

export interface CheckpointData {
  moduleId: string;
  moduleTitle: string;
  moduleIcon: string;
  cards: LessonCard[];
  resumeIndex: number; // card index to return to after quiz
}

export interface UploadConcept {
  title: string;
  explanation: string;
}

export interface UploadQuizItem {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface UploadAnalysis {
  topic: string;
  summary: string;
  concepts: UploadConcept[];
  glossary: KeyTerm[];
  quiz: UploadQuizItem[];
}

// ── Lesson recap (Screen 6) ───────────────────────────────────────────────────
export interface RelatedTopic {
  topic: string;
  reason: string;
  emoji: string;
}

export interface RecapData {
  takeaways: string[];
  strengths: string[];
  weakSpots: string[];
  relatedTopics: RelatedTopic[];
}

export interface LessonCompletion {
  roadmap: Roadmap;
  responses: QuizResponse[];
  uploadedPublicId?: string;
}

// ── Persisted lesson history (Screen 7) ──────────────────────────────────────
export interface LessonRecord {
  id: string;
  topic: string;
  difficulty: string;
  totalDuration: string;
  moduleCount: number;
  completedAt: number; // Unix ms
  quizScore: number;   // 0–100
  avgConfidence: number; // 0–100
  relatedTopics: RelatedTopic[];
  uploadedPublicId?: string;
}
