export type DiagnosticStatus = "pass" | "strong" | "good" | "partial" | "review" | "needs_improvement" | "weak" | "critical" | "not_applicable";
export type DiagnosticSeverity = "info" | "good" | "low" | "medium" | "high" | "critical";
export type Fixability = "fixable_now" | "strengthen" | "optional" | "not_fixable_by_wording";
export type EvidenceStatus = "supported" | "partial" | "missing" | "conflicting" | "unknown";
export type EvidenceStrength = "direct" | "transferable" | "weak" | "none";
export type RequirementImportance = "critical" | "high" | "medium" | "low";
export type KeywordCategory = "hard_skill" | "soft_skill" | "tool" | "qualification" | "responsibility" | "industry" | "seniority" | "location" | "education" | "other";
export type RequirementPriority = "must_have" | "preferred" | "general";
export type AnalysisStatus = "strong" | "good" | "needs_improvement" | "weak" | "critical" | "not_applicable";
export type ScoreDimension = "resume_quality" | "job_match" | "application_readiness";

export interface Finding {
  title: string;
  detail: string;
  evidence: string[];
}

export interface CheckEvidence {
  source: "resume" | "job_description" | "both";
  section?: string;
  text?: string;
}

export interface DiagnosticCheck {
  id: string;
  title: string;
  name?: string;
  category: string;
  status: DiagnosticStatus;
  severity: DiagnosticSeverity;
  score: number;
  maxScore?: number;
  summary?: string;
  evidence: string[] | CheckEvidence[];
  explanation: string;
  reasoning?: string;
  recommendation?: string;
  fixability: Fixability;
  recommendedAction?: string;
  affectedSection?: string;
  jobRequirementId?: string | null;
}

export interface AnalysisScores {
  overall: number;
  resumeQuality: number;
  jobMatch: number;
  applicationReadiness: number;
  roleRelevance: number;
  skillsCoverage: number;
  evidenceQuality: number;
  seniorityFit: number;
  atsParseability: number;
  keywordContext: number;
  clarityBrevity: number;
}

export interface KeywordFinding {
  phrase: string;
  normalizedPhrase: string;
  category: KeywordCategory;
  required: RequirementPriority;
  frequencyInJD: number;
  frequencyInResume: number;
  evidenceStatus: EvidenceStatus;
  evidenceStrength: EvidenceStrength;
  importance: RequirementImportance;
  fixability: Fixability;
  contextQuality: number;
  explanation: string;
}

export interface EvidenceMapEntry {
  requirementId: string;
  requirement: string;
  category: KeywordCategory;
  importance: RequirementImportance;
  evidenceStatus: EvidenceStatus;
  resumeEvidence: string[];
  evidenceStrength: EvidenceStrength;
  fixability: Fixability;
  explanation: string;
  recommendedAction?: string;
}

export interface Recommendation {
  priority: number;
  title: string;
  problem: string;
  whyItMatters: string;
  evidence: string[];
  action: string;
  fixability: Fixability;
}

export interface SectionFeedback {
  section: string;
  score: number;
  strengths: Finding[];
  issues: Finding[];
  suggestions: Finding[];
}

export interface ResumeLineFinding {
  section: string;
  itemId: string;
  originalText: string;
  checks: string[];
  severity: "good" | "review" | "problem";
  explanation: string;
  suggestedApproach?: string;
}

export interface Blocker {
  id: string;
  severity: "critical" | "high" | "medium";
  requirement: string;
  evidenceStatus: "missing" | "partial" | "conflicting";
  fixability: Fixability;
  explanation: string;
}

export interface ResumeAnalysis {
  id: string;
  userId: string;
  resumeId: string;
  createdAt: string;
  source: {
    resumeFileName: string;
    resumeText: string;
    jobDescription: string;
  };
  targetRole: {
    title: string;
    company?: string | null;
    seniority?: string | null;
    location?: string | null;
    relocationRequired?: boolean;
    workModel?: string | null;
  };
  executiveAssessment: {
    headline: string;
    summary: string;
    bottomLine: string;
  };
  scores: AnalysisScores;
  diagnostic: DiagnosticCheck[];
  strengths: Finding[];
  blockers: Blocker[];
  keywords: KeywordFinding[];
  evidenceMap: EvidenceMapEntry[];
  recommendations: Recommendation[];
  sectionFeedback: SectionFeedback[];
  lineFindings: ResumeLineFinding[];
  metadata: {
    parserVersion: string;
    analysisVersion: string;
    model?: string;
  };
}

export interface AIModelMetadata {
  provider: "gemini";
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
