export interface ScoreBreakdown {
  ats: number;
  content: number;
  structure: number;
  impact: number;
  clarity: number;
}

export interface SectionFeedback {
  score: number;
  strengths: string[];
  issues: string[];
  suggestions: string[];
}

export interface ResumeAnalysis {
  overallScore: number;
  categoryScores: ScoreBreakdown;
  summary: string;
  strengths: string[];
  criticalIssues: string[];
  recommendations: string[];
  sections: {
    summary: SectionFeedback;
    experience: SectionFeedback;
    education: SectionFeedback;
    skills: SectionFeedback;
  };
  keywords: {
    present: string[];
    missing: string[];
  };
}

export interface AIModelMetadata {
  provider: "openai";
  model: string;
  schemaVersion: string;
  analyzedAt: string;
}

export interface StoredAnalysis extends ResumeAnalysis {
  id: string;
  ownerId: string;
  resumeId: string;
  createdAt: string;
  model: AIModelMetadata;
}
