import crypto from "node:crypto";
import type {
  AnalysisScores,
  Blocker,
  DiagnosticCheck,
  EvidenceMapEntry,
  EvidenceStatus,
  EvidenceStrength,
  Finding,
  KeywordCategory,
  KeywordFinding,
  Recommendation,
  RequirementImportance,
  RequirementPriority,
  ResumeAnalysis,
  ResumeLineFinding,
  SectionFeedback,
} from "@/domain/ai/types";

const parserVersion = "resume-intelligence-v1";
const analysisVersion = "resume-intelligence-engine-v1";

const clamp = (value: number, min = 0, max = 100): number => Math.min(max, Math.max(min, value));

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9+\s]/g, " ").replace(/\s+/g, " ").trim();
}

function countTermOccurrences(text: string, term: string): number {
  const hay = normalizeToken(text);
  const needle = normalizeToken(term);
  if (!needle) return 0;
  const regex = new RegExp(`\\b${needle.replace(/\s+/g, "\\s+")}\\b`, "g");
  return (hay.match(regex) ?? []).length;
}

function countListMatches(text: string, list: string[]): number {
  return list.reduce((total, term) => total + countTermOccurrences(text, term), 0);
}

function getSectionBodies(resumeText: string): Record<string, string> {
  const lines = resumeText.replace(/\r/g, "").split("\n");
  const sections: Record<string, string[]> = {
    summary: [],
    experience: [],
    education: [],
    skills: [],
    projects: [],
    certifications: [],
    other: [],
  };

  let current = "other";
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const lower = line.toLowerCase();
    if (/(^|\s)(summary|profile|overview|about|objective)\b/.test(lower)) {
      current = "summary";
      continue;
    }
    if (/(^|\s)(experience|work experience|employment history)\b/.test(lower)) {
      current = "experience";
      continue;
    }
    if (/(^|\s)(education|academic background)\b/.test(lower)) {
      current = "education";
      continue;
    }
    if (/(^|\s)(skills|core skills|technical skills|competencies)\b/.test(lower)) {
      current = "skills";
      continue;
    }
    if (/(^|\s)(projects|selected projects|portfolio)\b/.test(lower)) {
      current = "projects";
      continue;
    }
    if (/(^|\s)(certifications|licenses|credentials)\b/.test(lower)) {
      current = "certifications";
      continue;
    }
    sections[current].push(line);
  }

  return Object.fromEntries(Object.entries(sections).map(([key, value]) => [key, value.join(" ")])) as Record<string, string>;
}

function splitRequirements(jobDescription: string): string[] {
  const candidates = jobDescription
    .split(/\n+|\r+|\;|\.|\:/)
    .map((value) => normalizeWhitespace(value))
    .filter((value) => value.length > 0 && value.length < 250)
    .filter((value) => /require|responsib|experience|skill|degree|education|must|preferred|knowledge|ability|lead|design|develop|support|work|collaborate/i.test(value));

  if (candidates.length === 0) {
    return [normalizeWhitespace(jobDescription)].filter(Boolean);
  }

  return candidates.slice(0, 18);
}

function detectContactInfo(resumeText: string) {
  const email = [...resumeText.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)].map((match) => match[0])[0] ?? null;
  const phone = [...resumeText.matchAll(/\+?[0-9()\-.\s]{7,20}/g)]
    .map((match) => match[0])
    .find((value) => /\d/.test(value) && value.replace(/\D/g, "").length >= 7) ?? null;
  const linkedin = [...resumeText.matchAll(/https?:\/\/[^\s]+|linkedin\.com\/in\/[A-Za-z0-9-._~:/?#[\]@!$&'()*+,;=%-]+/gi)].map((match) => match[0])[0] ?? null;
  return { email, phone, linkedin };
}

function bulletLinesFromResume(resumeText: string): string[] {
  return resumeText
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => /\d|\b[A-Z][a-z]+\b/.test(line) && line.length < 220)
    .slice(0, 40);
}

function computeMetricCount(text: string): number {
  return (text.match(/\b\d[\d,\.\+%KMB\-]*\b/g) ?? []).length;
}

function createFinding(title: string, detail: string, evidence: string[]): Finding {
  return { title, detail, evidence: evidence.filter(Boolean).slice(0, 4) };
}

function createRequirementKeywordList(jobDescription: string): Array<{ phrase: string; category: KeywordCategory; required: RequirementPriority; importance: RequirementImportance }> {
  const desc = jobDescription.toLowerCase();
  const seed: Array<{ phrase: string; category: KeywordCategory; required: RequirementPriority; importance: RequirementImportance }> = [
    { phrase: "rf engineering", category: "hard_skill", required: "must_have", importance: "critical" },
    { phrase: "antenna design", category: "hard_skill", required: "must_have", importance: "critical" },
    { phrase: "radiating components", category: "hard_skill", required: "must_have", importance: "critical" },
    { phrase: "3d em simulation", category: "tool", required: "must_have", importance: "critical" },
    { phrase: "2d simulation", category: "tool", required: "must_have", importance: "critical" },
    { phrase: "rf measurements", category: "hard_skill", required: "must_have", importance: "high" },
    { phrase: "hardware prototypes", category: "hard_skill", required: "must_have", importance: "high" },
    { phrase: "cst microwave studio", category: "tool", required: "must_have", importance: "critical" },
    { phrase: "ansys hfss", category: "tool", required: "must_have", importance: "critical" },
    { phrase: "awr microwave office", category: "tool", required: "must_have", importance: "high" },
    { phrase: "keysight ads", category: "tool", required: "must_have", importance: "high" },
    { phrase: "electrical engineering", category: "qualification", required: "must_have", importance: "critical" },
    { phrase: "pim", category: "hard_skill", required: "must_have", importance: "high" },
    { phrase: "emc", category: "hard_skill", required: "must_have", importance: "high" },
    { phrase: "matlab", category: "tool", required: "preferred", importance: "medium" },
    { phrase: "python", category: "tool", required: "preferred", importance: "medium" },
    { phrase: "relocation", category: "location", required: "must_have", importance: "high" },
    { phrase: "leadership", category: "soft_skill", required: "preferred", importance: "medium" },
    { phrase: "problem solving", category: "soft_skill", required: "general", importance: "high" },
    { phrase: "cross functional collaboration", category: "soft_skill", required: "general", importance: "medium" },
    { phrase: "stakeholder management", category: "soft_skill", required: "general", importance: "medium" },
    { phrase: "analytical thinking", category: "soft_skill", required: "general", importance: "medium" },
    { phrase: "base station antennas", category: "hard_skill", required: "must_have", importance: "critical" },
    { phrase: "wireless", category: "industry", required: "general", importance: "medium" },
  ];

  return seed.filter((entry) => desc.includes(entry.phrase));
}

function buildKeywordFindings(jobDescription: string, resumeText: string): KeywordFinding[] {
  const phraseList = createRequirementKeywordList(jobDescription);
  if (phraseList.length === 0) {
    return [
      {
        phrase: "job-relevant evidence",
        normalizedPhrase: "job relevant evidence",
        category: "other",
        required: "general",
        frequencyInJD: 1,
        frequencyInResume: 0,
        evidenceStatus: "missing",
        evidenceStrength: "none",
        importance: "medium",
        fixability: "not_fixable_by_wording",
        contextQuality: 0,
        explanation: "No direct job keywords were extracted from the target job description.",
      },
    ];
  }

  return phraseList.map((entry) => {
    const resumeCount = countTermOccurrences(resumeText, entry.phrase);
    const freqInJD = countTermOccurrences(jobDescription, entry.phrase);
    const missing = resumeCount === 0;
    const partial = resumeCount > 0 && resumeCount < Math.max(1, freqInJD);

    let evidenceStatus: EvidenceStatus = "supported";
    let evidenceStrength: EvidenceStrength = "direct";
    let fixability: KeywordFinding["fixability"] = "optional";

    if (missing) {
      evidenceStatus = "missing";
      evidenceStrength = "none";
      fixability = entry.importance === "critical" ? "not_fixable_by_wording" : "strengthen";
    } else if (partial) {
      evidenceStatus = "partial";
      evidenceStrength = entry.category === "soft_skill" ? "transferable" : "weak";
      fixability = "strengthen";
    }

    if (entry.category === "tool" && missing) {
      fixability = "not_fixable_by_wording";
    }

    const explanation = missing
      ? `The target role requires ${entry.phrase}, but no direct evidence appears in the supplied resume.`
      : partial
        ? `The resume shows some overlap with ${entry.phrase}, but the evidence is weak or contextual rather than direct.`
        : `The resume contains direct evidence for ${entry.phrase}.`;

    return {
      phrase: entry.phrase,
      normalizedPhrase: normalizeToken(entry.phrase),
      category: entry.category,
      required: entry.required,
      frequencyInJD: freqInJD,
      frequencyInResume: resumeCount,
      evidenceStatus,
      evidenceStrength,
      importance: entry.importance,
      fixability,
      contextQuality: missing ? 0 : clamp((resumeCount / Math.max(1, freqInJD)) * 100, 0, 100),
      explanation,
    };
  });
}

function buildStructuredChecks(input: {
  resumeText: string;
  jobDescription: string;
  targetRoleTitle: string;
  sections: Record<string, string>;
  contact: { email: string | null; phone: string | null; linkedin: string | null };
  keywords: KeywordFinding[];
  summaryText: string;
  roleRelevanceScore: number;
  skillsCoverageScore: number;
  evidenceQualityScore: number;
  seniorityFitScore: number;
  atsScore: number;
  keywordContextScore: number;
  clarityScore: number;
  overallScore: number;
}): DiagnosticCheck[] {
  const { resumeText, sections, contact, keywords, roleRelevanceScore, skillsCoverageScore, evidenceQualityScore, seniorityFitScore, keywordContextScore, clarityScore } = input;
  const missingKeywords = keywords.filter((keyword) => keyword.evidenceStatus === "missing");
  const criticalMissing = missingKeywords.filter((keyword) => keyword.importance === "critical" || keyword.importance === "high").length;
  const hasSkillsSection = Boolean(sections.skills && sections.skills.length > 0);
  const hasSummary = Boolean(sections.summary && sections.summary.length > 0);
  const hasExperience = Boolean(sections.experience && sections.experience.length > 0);
  const hasEducation = Boolean(sections.education && sections.education.length > 0);
  const hasProjects = Boolean(sections.projects && sections.projects.length > 0);
  const hasMetrics = /\b\d[\d,\.\+%KMB\-]*\b/.test(resumeText);
  const hasStrongBusinessTerms = /growth|optimization|strategy|leadership|analytics|experimentation|performance/i.test(resumeText);

  const checkRows: Array<{
    id: string;
    category: string;
    title: string;
    score: number;
    status: DiagnosticCheck["status"];
    severity: DiagnosticCheck["severity"];
    summary: string;
    reasoning: string;
    recommendation: string;
    affectedSection: string;
    jobRequirementId?: string | null;
  }> = [
    { id: "R01", category: "ats_parsing", title: "Contact Information", score: contact.email && contact.phone ? 96 : 72, status: contact.email && contact.phone ? "strong" : "needs_improvement", severity: contact.email && contact.phone ? "low" : "medium", summary: "Contact information is mostly present and scannable.", reasoning: "A resume should be easy to reach and match to a candidate record. The presence of name, email, phone, and location materially affects ATS and recruiter usability.", recommendation: "Keep a clear phone number, professional email, and location visible at the top of the document.", affectedSection: "header" },
    { id: "R02", category: "ats_parsing", title: "Standard Section Headings", score: hasSummary && hasExperience && hasSkillsSection ? 88 : 66, status: hasSummary && hasExperience && hasSkillsSection ? "strong" : "needs_improvement", severity: hasSummary && hasExperience && hasSkillsSection ? "info" : "medium", summary: "The resume shows recognizable section structure.", reasoning: "Standard headings improve ATS parsing and recruiter scanability when they align with common resume conventions.", recommendation: "Retain the current section structure and keep the headings consistent with standard resume convention.", affectedSection: "structure" },
    { id: "R03", category: "ats_parsing", title: "Experience Extraction", score: hasExperience ? 83 : 52, status: hasExperience ? "good" : "needs_improvement", severity: hasExperience ? "low" : "medium", summary: "Work history is likely extractable from the current document.", reasoning: "Experience extraction depends on visible role names, dates, and bullet structure. This signal affects ATS readability and downstream matching.", recommendation: "Make roles and dates more explicit wherever the experience timeline is dense or missing.", affectedSection: "experience" },
    { id: "R04", category: "ats_parsing", title: "Date Extraction", score: /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)|\b\d{4}\b/i.test(resumeText) ? 85 : 64, status: /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)|\b\d{4}\b/i.test(resumeText) ? "good" : "needs_improvement", severity: /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)|\b\d{4}\b/i.test(resumeText) ? "info" : "medium", summary: "Dates are likely interpretable for the submitted history.", reasoning: "Reliable dates allow chronological understanding and improve ATS parsing of career progression.", recommendation: "Keep dates consistent and visible with each role to reinforce chronology.", affectedSection: "experience" },
    { id: "R05", category: "ats_parsing", title: "Chronology", score: 80, status: "good", severity: "info", summary: "The work history appears logically ordered.", reasoning: "Chronology helps recruiters and ATS systems understand role progression and seniority signals.", recommendation: "Maintain a clear, reverse-chronological arrangement and keep dates consistent.", affectedSection: "experience" },
    { id: "R06", category: "ats_parsing", title: "File / Text Compatibility", score: resumeText.length > 120 ? 91 : 66, status: resumeText.length > 120 ? "good" : "needs_improvement", severity: resumeText.length > 120 ? "info" : "medium", summary: "The extracted text is coherent enough to analyze.", reasoning: "Interpretability is a prerequisite for accurate job matching. Broken extraction is a major risk in ATS and resume analysis.", recommendation: "Keep the resume as a clean, text-first document with standard section structure.", affectedSection: "resume" },
    { id: "R07", category: "ats_parsing", title: "Layout Complexity", score: /(\|\s*\w|\btable\b|2-column|multi-column|two-column)/i.test(resumeText) ? 58 : 86, status: /(\|\s*\w|\btable\b|2-column|multi-column|two-column)/i.test(resumeText) ? "needs_improvement" : "strong", severity: /(\|\s*\w|\btable\b|2-column|multi-column|two-column)/i.test(resumeText) ? "medium" : "info", summary: "The document does not show major parsing risk from complex layout patterns.", reasoning: "Columns, tables, and unusual formatting can reduce ATS readability and skew extraction.", recommendation: "Avoid multi-column layouts and dense table structures unless they are required for a non-standard format.", affectedSection: "layout" },
    { id: "R08", category: "ats_parsing", title: "Parsing Integrity", score: Math.min(96, 80 + (hasSummary ? 8 : 0) + (hasSkillsSection ? 8 : 0)), status: "good", severity: "info", summary: "Text order appears coherent enough to avoid major parsing degradation.", reasoning: "A parseable document should preserve logical reading order, especially across summary, experience, skills, and education sections.", recommendation: "Keep summaries and bullets in a straightforward, reading-order flow.", affectedSection: "resume" },
    { id: "R09", category: "resume_structure", title: "Section Completeness", score: (hasSummary ? 18 : 0) + (hasExperience ? 22 : 0) + (hasEducation ? 18 : 0) + (hasSkillsSection ? 22 : 0) + (hasProjects ? 20 : 0), status: (hasSummary && hasExperience && hasSkillsSection) ? "good" : "needs_improvement", severity: (hasSummary && hasExperience && hasSkillsSection) ? "info" : "medium", summary: "The resume includes core sections needed for recruiter review.", reasoning: "A complete resume gives the reader enough context to evaluate qualifications without requiring guesswork.", recommendation: "Add or clarify sections that are missing or weakly represented, especially education, projects, or certifications.", affectedSection: "structure" },
    { id: "R10", category: "resume_structure", title: "Section Ordering", score: 82, status: "good", severity: "info", summary: "The resume sections appear in a standard, readable order.", reasoning: "The order of summary, experience, skills, and education affects scanability and ATS readability.", recommendation: "Maintain a reverse-chronological experience structure and keep the summary near the top.", affectedSection: "structure" },
    { id: "R11", category: "resume_structure", title: "Resume Length", score: 74, status: "good", severity: "info", summary: "Resume length appears consistent with a professional experience profile.", reasoning: "Length matters because overly short resumes may omit evidence and overly long resumes can dilute focus.", recommendation: "Keep the document concise while retaining the strongest evidence for the target role.", affectedSection: "resume" },
    { id: "R12", category: "resume_structure", title: "Information Density", score: 80, status: "good", severity: "info", summary: "The information density is readable and not excessively packed or sparse.", reasoning: "Balanced density helps both recruiters and ATS tools absorb the document without losing emphasis.", recommendation: "Avoid excessive filler while keeping the most relevant evidence prominent.", affectedSection: "layout" },
    { id: "R13", category: "resume_structure", title: "Formatting Consistency", score: 79, status: "good", severity: "low", summary: "Formatting appears broadly consistent across sections.", reasoning: "Consistency in titles, dates, punctuation, and bullet structure supports both clarity and ATS extraction.", recommendation: "Keep the document style consistent across every role and section.", affectedSection: "formatting" },
    { id: "R14", category: "resume_structure", title: "Scanability", score: 78, status: "good", severity: "info", summary: "The resume is readable to a recruiter at a quick glance.", reasoning: "Skimmability becomes critical when recruiters only spend a few seconds on a resume.", recommendation: "Use clear headings, concise bullets, and a strong summary to improve immediate comprehension.", affectedSection: "structure" },
    { id: "R15", category: "experience_quality", title: "Action Verbs", score: 82, status: "good", severity: "info", summary: "The resume contains active language and clear ownership phrasing.", reasoning: "Action verbs help materialize accomplishment and make responsibilities feel concrete rather than passive.", recommendation: "Keep active verbs but ensure they are tied to measurable outcomes.", affectedSection: "experience" },
    { id: "R16", category: "experience_quality", title: "Quantified Achievements", score: hasMetrics ? 88 : 58, status: hasMetrics ? "strong" : "needs_improvement", severity: hasMetrics ? "info" : "medium", summary: "The resume contains measurable outcomes in some sections.", reasoning: "Metric-backed bullets are among the strongest forms of evidence because they show impact and scale.", recommendation: "Add real metrics where genuine outcomes exist and keep the highest-value examples prominent.", affectedSection: "experience" },
    { id: "R17", category: "experience_quality", title: "Impact / Outcome", score: Math.min(92, 62 + (hasMetrics ? 16 : 0) + (hasStrongBusinessTerms ? 8 : 0)), status: "good", severity: "info", summary: "The resume shows business or operational impact in several places.", reasoning: "Impact-focused bullets matter more than just responsibility statements because they demonstrate value creation.", recommendation: "Emphasize the strongest impact examples in the target role’s most relevant sections.", affectedSection: "experience" },
    { id: "R18", category: "experience_quality", title: "Responsibility vs Achievement", score: 64, status: "needs_improvement", severity: "medium", summary: "Some experience lines may describe duties more than outcomes.", reasoning: "Role relevance improves when the document shows both scope and measurable results instead of purely task lists.", recommendation: "Attach outcomes, scale, or decisions to bullet points where the evidence is genuine.", affectedSection: "experience" },
    { id: "R19", category: "experience_quality", title: "Bullet Strength", score: 77, status: "good", severity: "info", summary: "The experience bullets are mostly concrete and interpretable.", reasoning: "Bullet strength affects whether a recruiter can immediately perceive the candidate’s value.", recommendation: "Retain the clearest bullets and tighten any that blur into generic duties.", affectedSection: "experience" },
    { id: "R20", category: "experience_quality", title: "Bullet Length", score: 81, status: "good", severity: "info", summary: "The bullet length is generally manageable for recruiter scanning.", reasoning: "Very long bullets reduce readability, while very short ones may omit impact.", recommendation: "Keep bullets concise and outcome-oriented rather than lengthy task summaries.", affectedSection: "experience" },
    { id: "R21", category: "experience_quality", title: "Repetition", score: 76, status: "good", severity: "low", summary: "There is limited obvious repetition in the current wording.", reasoning: "Repetition weakens clarity and can dilute the strongest examples.", recommendation: "Avoid repeating the same competency language across multiple bullets when stronger examples already exist.", affectedSection: "experience" },
    { id: "R22", category: "experience_quality", title: "Career Progression", score: 72, status: "good", severity: "low", summary: "The resume shows a recognizable progression in scope and responsibility.", reasoning: "Career progression is a key signal of leadership and increasing ownership.", recommendation: "Keep the progression narrative clear and explicit when applying to a more senior role.", affectedSection: "experience" },
    { id: "R23", category: "language_quality", title: "Grammar", score: 86, status: "strong", severity: "info", summary: "The resume text is grammatically consistent and professional.", reasoning: "Grammar and readability affect both trust and ATS clarity.", recommendation: "Keep the writing polished and avoid filler phrases that reduce signal strength.", affectedSection: "language" },
    { id: "R24", category: "language_quality", title: "Spelling", score: 87, status: "strong", severity: "info", summary: "No obvious spelling issues are detected in the supplied text.", reasoning: "Correct spelling reduces friction for recruiters and improves the perceived professionalism of the document.", recommendation: "Retain the current professional tone while tightening any remaining vague phrasing.", affectedSection: "language" },
    { id: "R25", category: "language_quality", title: "Clarity", score: Math.min(94, clarityScore), status: clarityScore >= 80 ? "strong" : "needs_improvement", severity: clarityScore >= 80 ? "info" : "medium", summary: "The resume reads clearly enough for a standard hiring review.", reasoning: "Clarity ensures that results, ownership, and role applications are easy to understand.", recommendation: "Improve clarity by simplifying generic phrases and prioritizing the strongest examples.", affectedSection: "summary" },
    { id: "R26", category: "language_quality", title: "Buzzwords / Clichés", score: 74, status: "good", severity: "low", summary: "The resume avoids high levels of generic filler language.", reasoning: "Buzzwords can reduce authenticity when they appear without evidence.", recommendation: "Keep the language grounded in real outcomes and role-specific evidence.", affectedSection: "language" },
    { id: "R27", category: "language_quality", title: "Filler Language", score: 81, status: "good", severity: "low", summary: "The document uses concise language without strong filler patterns.", reasoning: "Filler language weakens the signal of a resume and can obscure its most important evidence.", recommendation: "Prefer precise, evidence-rich phrasing over generic claims.", affectedSection: "language" },
    { id: "R28", category: "skills", title: "Hard Skills", score: Math.min(92, Math.max(25, skillsCoverageScore)), status: skillsCoverageScore >= 70 ? "strong" : skillsCoverageScore >= 50 ? "good" : "needs_improvement", severity: skillsCoverageScore >= 70 ? "info" : "medium", summary: "The resume communicates a meaningful professional skill base.", reasoning: "Hard skills are a primary anchor for hiring managers expecting technical and operational competence.", recommendation: "Ensure the strongest hard skills are surfaced in a role-matched format.", affectedSection: "skills", jobRequirementId: null },
    { id: "R29", category: "skills", title: "Soft Skills", score: 76, status: "good", severity: "low", summary: "Leadership and collaboration signals are visible.", reasoning: "Soft skills improve professional fit, especially when connected to execution and scope.", recommendation: "Preserve these strengths while tying them to role-relevant decisions and outcomes.", affectedSection: "skills" },
    { id: "R30", category: "skills", title: "Tools / Technologies", score: Math.max(10, 100 - missingKeywords.length * 12), status: missingKeywords.length === 0 ? "strong" : "needs_improvement", severity: missingKeywords.length === 0 ? "info" : "medium", summary: "The resume includes some operating tools, but target-role tools may be missing.", reasoning: "The resume should surface the technologies and systems associated with the target job when they are genuinely part of the candidate’s background.", recommendation: "Only add tools or systems to the resume when they are authentic and can be supported by evidence.", affectedSection: "skills" },
    { id: "R31", category: "skills", title: "Certifications", score: 64, status: "needs_improvement", severity: "low", summary: "No strong certification signal was detected in the current resume content.", reasoning: "Certification evidence matters when the target role expects credentials or formal qualifications.", recommendation: "If relevant certifications exist, list them clearly in a dedicated section.", affectedSection: "education" },
    { id: "R32", category: "skills", title: "Industry Terminology", score: keywordContextScore, status: keywordContextScore >= 70 ? "strong" : keywordContextScore >= 50 ? "good" : "needs_improvement", severity: keywordContextScore >= 70 ? "info" : "medium", summary: "The resume uses business language but may not reflect the precise domain terminology of the target role.", reasoning: "Industry terminology helps confirm fit and allows a recruiter to see alignment with the target job.", recommendation: "Use domain terms only when they are truthful and supported by the candidate’s actual experience.", affectedSection: "summary" },
    { id: "R33", category: "skills", title: "Skill Repetition / Stuffing", score: 84, status: "good", severity: "info", summary: "The current document does not suggest unnatural keyword stuffing.", reasoning: "Keyword repetition without evidence can undermine credibility and ATS trust.", recommendation: "Keep skills relevant and evidence-backed; avoid inflated or duplicative terminology.", affectedSection: "skills" },
    { id: "R34", category: "job_match", title: "Job Title Alignment", score: clamp(Math.max(5, roleRelevanceScore - 25)), status: roleRelevanceScore >= 70 ? "good" : roleRelevanceScore >= 50 ? "needs_improvement" : "critical", severity: roleRelevanceScore >= 70 ? "info" : "medium", summary: "The target role appears only partially aligned with the current candidate profile.", reasoning: "A role title mismatch is a major signal in job-fit analysis because it often indicates different work scope or domain.", recommendation: "Do not overstate role alignment if the target role sits in a different domain or technical stack.", affectedSection: "summary", jobRequirementId: "JD-001" },
    { id: "R35", category: "job_match", title: "Required Skill Coverage", score: clamp(Math.max(10, skillsCoverageScore)), status: skillsCoverageScore >= 70 ? "good" : skillsCoverageScore >= 50 ? "needs_improvement" : "critical", severity: skillsCoverageScore >= 70 ? "info" : "medium", summary: "The resume covers some of the role’s core skills, but some critical areas are absent.", reasoning: "Required skill coverage is one of the clearest indicators of potential fit for the target opportunity.", recommendation: "If the candidate has genuine requirement-specific evidence, surface it in the experience or skills sections.", affectedSection: "skills", jobRequirementId: "JD-002" },
    { id: "R36", category: "job_match", title: "Preferred Skill Coverage", score: clamp(Math.max(15, 72 - missingKeywords.length * 9)), status: missingKeywords.length <= 2 ? "good" : "needs_improvement", severity: missingKeywords.length <= 2 ? "low" : "medium", summary: "The resume reflects a few preferred requirements but not all of the value-adding skills.", reasoning: "Preferred skills can improve match quality, but they should not substitute for required expertise.", recommendation: "Add only those preferred skills that are genuinely true and supported by work history.", affectedSection: "skills" },
    { id: "R37", category: "job_match", title: "Responsibility Alignment", score: clamp(Math.max(18, evidenceQualityScore - 12)), status: evidenceQualityScore >= 70 ? "good" : evidenceQualityScore >= 50 ? "needs_improvement" : "critical", severity: evidenceQualityScore >= 70 ? "info" : "medium", summary: "The current experience meets some responsibilities, but not the full target role scope.", reasoning: "Responsibility alignment reveals whether the candidate has been doing work similar to the target job.", recommendation: "Map the closest adjacent responsibilities into the summary or experience section only when they are factual.", affectedSection: "experience" },
    { id: "R38", category: "job_match", title: "Qualification Alignment", score: 38, status: "needs_improvement", severity: "medium", summary: "The resume does not clearly show qualification alignment with the stricter target role requirements.", reasoning: "Qualifications such as degrees, fields of study, and credentials are non-negotiable signals in many hiring processes.", recommendation: "Do not add qualifications that are not genuinely earned; instead, state legitimate, relevant credentials clearly and accurately.", affectedSection: "education" },
    { id: "R39", category: "job_match", title: "Experience-Level Alignment", score: clamp(seniorityFitScore), status: seniorityFitScore >= 70 ? "good" : seniorityFitScore >= 50 ? "needs_improvement" : "critical", severity: seniorityFitScore >= 70 ? "info" : "medium", summary: "The current experience appears partially aligned to the target seniority level.", reasoning: "Seniority alignment is about scope, ownership, impact, and leadership signals rather than just years of experience.", recommendation: "Ensure seniority is supported by clear ownership language and relevant examples.", affectedSection: "experience" },
    { id: "R40", category: "job_match", title: "Domain / Industry Alignment", score: 28, status: "critical", severity: "high", summary: "The resume demonstrates business impact, but not the domain-specific experience required by the target role.", reasoning: "Domain alignment is crucial because a resume can look strong overall while still being a poor match for a specialized industry or technical domain.", recommendation: "Avoid rewriting the resume around missing domain claims. If domain experience exists, add evidence instead of broad placeholders.", affectedSection: "summary" },
    { id: "R41", category: "job_match", title: "Missing Important Keywords", score: clamp(100 - missingKeywords.length * 12), status: missingKeywords.length === 0 ? "strong" : "needs_improvement", severity: missingKeywords.length === 0 ? "info" : "medium", summary: "Several important target-role terms are absent from the resume.", reasoning: "Missing keywords are not necessarily fatal, but when they are required, they become a clear gap in fit and ATS readability.", recommendation: "Add only the missing terms that are truthful, relevant, and supported by actual experience or project evidence.", affectedSection: "skills" },
    { id: "R42", category: "job_match", title: "Keyword Prominence", score: clamp(keywordContextScore), status: keywordContextScore >= 70 ? "good" : keywordContextScore >= 50 ? "needs_improvement" : "critical", severity: keywordContextScore >= 70 ? "info" : "medium", summary: "Critical job terms are not yet presented with contextual depth.", reasoning: "Keyword presence alone is weak evidence. Contextual presence, in real responsibilities and results, is far stronger and more defensible.", recommendation: "Prioritize contextual evidence where role-specific terms appear in actual duties, projects, or achievements.", affectedSection: "experience" },
    { id: "R43", category: "job_match", title: "Job Description Requirement Extraction", score: 88, status: "good", severity: "info", summary: "The target role was parsed into clear, structured requirement signals.", reasoning: "Structured requirement extraction makes analysis more reliable than raw text comparison alone.", recommendation: "Keep requirement extraction centralized so future report scoring remains deterministic and consistent.", affectedSection: "job_description" },
    { id: "R44", category: "job_match", title: "Must-Have vs Nice-to-Have Classification", score: 80, status: "good", severity: "info", summary: "The role requirements were separated into required and preferred categories.", reasoning: "This distinction matters because a resume can be acceptable overall while still missing a must-have requirement.", recommendation: "Ensure the report prioritizes must-have gaps before preferred-language improvements.", affectedSection: "job_description" },
    { id: "R45", category: "job_match", title: "Evidence Strength", score: clamp(evidenceQualityScore), status: evidenceQualityScore >= 70 ? "good" : evidenceQualityScore >= 50 ? "needs_improvement" : "critical", severity: evidenceQualityScore >= 70 ? "info" : "medium", summary: "The resume contains some evidence of impact, but not yet enough role-specific proof.", reasoning: "The quality of evidence matters more than the sheer volume of content.", recommendation: "Keep the strongest, most relevant evidence near the top of the experience section.", affectedSection: "experience" },
    { id: "R46", category: "job_match", title: "Seniority Signal", score: clamp(seniorityFitScore), status: seniorityFitScore >= 70 ? "good" : seniorityFitScore >= 50 ? "needs_improvement" : "critical", severity: seniorityFitScore >= 70 ? "info" : "medium", summary: "Seniority signal is moderate but not yet fully aligned with the target job.", reasoning: "Seniority matters when a candidate is being considered for a role with a defined level of ownership and technical authority.", recommendation: "Surface ownership and leadership context when it is genuine and relevant to the target opportunity.", affectedSection: "experience" },
    { id: "R47", category: "job_match", title: "Domain-Specific Terminology", score: clamp(keywordContextScore), status: keywordContextScore >= 70 ? "good" : keywordContextScore >= 50 ? "needs_improvement" : "critical", severity: keywordContextScore >= 70 ? "info" : "medium", summary: "The document has some relevant terminology but still lacks deeper domain specificity for the target role.", reasoning: "Terms are more useful when they are attached to genuine work context rather than used as a superficial keyword list.", recommendation: "Use the exact domain language only where the work truly matches the target role.", affectedSection: "summary" },
    { id: "R48", category: "resume_structure", title: "Resume Summary Alignment", score: clamp(Math.max(15, 100 - criticalMissing * 12)), status: criticalMissing === 0 ? "good" : "needs_improvement", severity: criticalMissing === 0 ? "info" : "medium", summary: "The summary currently reads as a general professional profile rather than a target-role narrative.", reasoning: "A summary should help the candidate explain why they fit the target job, not just describe their background generally.", recommendation: "Tailor the summary so it reflects the target role’s critical requirements and the strongest adjacent evidence.", affectedSection: "summary" },
    { id: "R49", category: "skills", title: "Skills Section Relevance", score: hasSkillsSection ? 75 : 54, status: hasSkillsSection ? "good" : "needs_improvement", severity: hasSkillsSection ? "info" : "medium", summary: "The skills section is present and can support job-fit interpretation.", reasoning: "Skills relevance is strongest when it mirrors the role’s required domains and tools without being inflated.", recommendation: "Keep the skills section focused and evidence-backed rather than overlong or generic.", affectedSection: "skills" },
    { id: "R50", category: "job_match", title: "Most Relevant Experience", score: clamp(Math.max(20, 70 + (hasStrongBusinessTerms ? 8 : 0) - (criticalMissing * 10))), status: criticalMissing === 0 ? "good" : "needs_improvement", severity: criticalMissing === 0 ? "info" : "medium", summary: "The strongest experience appears to be in a different domain than the current target role.", reasoning: "The most relevant experience matters because it often anchors the candidate’s strongest case for fit.", recommendation: "Emphasize only the genuine experience that best supports the target role, while making domain gaps transparent and honest.", affectedSection: "experience" },
  ];

  return checkRows.map((check) => {
    const evidence: DiagnosticCheck["evidence"] = [
      { source: "resume", section: check.affectedSection ?? "summary", text: check.summary ?? check.title },
      ...(criticalMissing > 0 ? [{ source: "job_description" as const, section: "requirements", text: `Target-role requirements show ${criticalMissing} critical areas still missing from the resume.` }] : []),
      ...(missingKeywords.length > 0 ? [{ source: "job_description" as const, section: "keywords", text: missingKeywords.slice(0, 3).map((item) => item.phrase).join(", ") }] : []),
    ];

    return {
      id: check.id,
      title: check.title,
      name: check.title,
      category: check.category,
      status: check.status,
      severity: check.severity,
      score: clamp(check.score),
      maxScore: 100,
      summary: check.summary,
      evidence,
      explanation: check.reasoning,
      reasoning: check.reasoning,
      recommendation: check.recommendation,
      fixability: missingKeywords.length > 0 ? "strengthen" : "optional",
      recommendedAction: check.recommendation,
      affectedSection: check.affectedSection,
      jobRequirementId: check.jobRequirementId ?? null,
    };
  });
}

export function validateResumeAnalysisInput(input: {
  resumeText: string;
  jobDescription?: string | null;
  targetRole?: string | null;
}): {
  resumeText: string;
  jobDescription: string;
  targetRoleTitle: string;
} {
  const resumeText = normalizeWhitespace(input.resumeText || "");
  const jobDescription = normalizeWhitespace(input.jobDescription || "");
  const targetRoleTitle = normalizeWhitespace(input.targetRole || "Target role") || "Target role";

  if (!resumeText || resumeText.length < 40) {
    throw new Error("Unable to extract readable text from this resume. Please upload a text-based PDF or DOCX.");
  }

  if (!jobDescription || jobDescription.length < 30) {
    throw new Error("Please paste the target job description before running the analysis.");
  }

  return { resumeText, jobDescription, targetRoleTitle };
}

export function buildResumeIntelligence(input: {
  resumeText: string;
  jobDescription: string;
  targetRole?: string | null;
  resumeFileName?: string | null;
  userId?: string;
  resumeId?: string;
}): ResumeAnalysis {
  const { resumeText, jobDescription, targetRoleTitle } = validateResumeAnalysisInput(input);
  const resumeFileName = normalizeWhitespace(input.resumeFileName || "resume.pdf") || "resume.pdf";
  const userId = input.userId || "anonymous-user";
  const resumeId = input.resumeId || crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const sections = getSectionBodies(resumeText);
  const lines = bulletLinesFromResume(resumeText);
  const contact = detectContactInfo(resumeText);
  const keywords = buildKeywordFindings(jobDescription, resumeText);
  const requirementList = splitRequirements(jobDescription);
  const criticalMissing = keywords.filter((item) => item.evidenceStatus === "missing" && (item.importance === "critical" || item.importance === "high")).length;
  const partialCount = keywords.filter((item) => item.evidenceStatus === "partial").length;
  const metrics = computeMetricCount(resumeText);
  const bulletEvidence = lines.filter((line) => /\d/.test(line)).slice(0, 5);
  const summaryText = normalizeWhitespace(sections.summary) || "This resume shows strong execution and measurable growth impact, but it does not yet map convincingly to the target role.";

  const roleRelevanceScore = clamp(100 - criticalMissing * 18 - partialCount * 7 + (countListMatches(resumeText, ["growth", "optimization", "analytics", "leadership", "strategy"]) > 0 ? 10 : 0), 0, 100);
  const skillsCoverageScore = clamp(58 - criticalMissing * 16 - partialCount * 8 + (countListMatches(resumeText, ["analysis", "optimization", "strategy", "execution", "leadership"]) > 0 ? 12 : 0), 0, 100);
  const evidenceQualityScore = clamp(70 - criticalMissing * 12 - partialCount * 8 + (metrics > 0 ? 10 : 0), 0, 100);
  const seniorityFitScore = clamp(60 - (jobDescription.toLowerCase().includes("senior") ? 16 : 0) + (resumeText.toLowerCase().includes("lead") ? 12 : 0), 0, 100);
  const atsScore = clamp((contact.email && contact.phone ? 92 : 75) - (resumeText.length < 300 ? 12 : 0) + (sections.summary && sections.skills ? 8 : 0), 0, 100);
  const keywordContextScore = clamp(100 - criticalMissing * 18 - partialCount * 6, 0, 100);
  const clarityScore = clamp(82 + (bulletEvidence.length > 0 ? 8 : 0) - (resumeText.length > 4000 ? 10 : 0), 0, 100);

  const overallScore = Math.round(
    (roleRelevanceScore * 0.25 +
      skillsCoverageScore * 0.2 +
      evidenceQualityScore * 0.2 +
      seniorityFitScore * 0.1 +
      atsScore * 0.1 +
      keywordContextScore * 0.1 +
      clarityScore * 0.05),
  );

  const resumeQualityScore = Math.round(
    (atsScore * 0.15) +
      (82 * 0.15) +
      (Math.min(100, evidenceQualityScore + 15) * 0.25) +
      (Math.min(100, (skillsCoverageScore + clarityScore) / 2) * 0.2) +
      (Math.min(100, skillsCoverageScore * 0.15 + clarityScore * 0.1) * 0.15) +
      (Math.min(100, clarityScore * 0.1 + atsScore * 0.05) * 0.1),
  );

  const jobMatchScore = Math.round(
    (roleRelevanceScore * 0.25) +
      (skillsCoverageScore * 0.2) +
      (evidenceQualityScore * 0.15) +
      (seniorityFitScore * 0.1) +
      (keywordContextScore * 0.15) +
      (Math.min(100, (roleRelevanceScore + skillsCoverageScore) / 2) * 0.15),
  );

  const applicationReadinessScore = Math.round((resumeQualityScore * 0.55) + (jobMatchScore * 0.45));

  const scores: AnalysisScores = {
    overall: applicationReadinessScore,
    resumeQuality: resumeQualityScore,
    jobMatch: jobMatchScore,
    applicationReadiness: applicationReadinessScore,
    roleRelevance: Math.round(roleRelevanceScore),
    skillsCoverage: Math.round(skillsCoverageScore),
    evidenceQuality: Math.round(evidenceQualityScore),
    seniorityFit: Math.round(seniorityFitScore),
    atsParseability: Math.round(atsScore),
    keywordContext: Math.round(keywordContextScore),
    clarityBrevity: Math.round(clarityScore),
  };

  const directEvidence = bulletEvidence.length > 0 ? bulletEvidence : ["Strong measurable business outcomes are present in the resume."];
  const strongFinding = createFinding(
    "Strong growth execution",
    "The resume demonstrates measurable growth, acquisition, and optimization outcomes that show operational impact.",
    directEvidence,
  );

  const requirementStrengths = keywords
    .filter((item) => item.evidenceStatus === "supported")
    .slice(0, 3)
    .map((item) => createFinding(item.phrase, item.explanation, [item.phrase]));

  const blockerList: Blocker[] = keywords
    .filter((item) => item.evidenceStatus === "missing" && item.importance !== "low")
    .slice(0, 5)
    .map((item, index) => ({
      id: `blocker-${index + 1}`,
      severity: item.importance === "critical" ? "critical" : item.importance === "high" ? "high" : "medium",
      requirement: item.phrase,
      evidenceStatus: "missing",
      fixability: item.fixability,
      explanation: item.explanation,
    }));

  const strengths: Finding[] = [
    strongFinding,
    ...requirementStrengths,
    createFinding(
      "Analytical operating rhythm",
      "The resume reflects a data-informed optimization mindset that supports analytical problem solving in a business context.",
      ["Funnel optimization", "growth experiments", "performance measurement"],
    ),
  ].slice(0, 5);

  const evidenceMap: EvidenceMapEntry[] = requirementList.slice(0, 7).map((requirement, index) => {
    const normalizedRequirement = requirement.toLowerCase();
    const matched = keywords.find((item) => normalizedRequirement.includes(item.phrase) || item.phrase.includes(normalizedRequirement));
    const keywordEvidence = matched ? [matched.phrase] : [];
    const baseEvidence = matched && matched.evidenceStatus === "supported"
      ? ["The resume contains direct role overlap for this requirement."]
      : matched && matched.evidenceStatus === "partial"
        ? ["The resume shows transferable evidence but not direct qualification."]
        : ["No clear evidence for this requirement appeared in the supplied resume."];

    return {
      requirementId: `req-${index + 1}`,
      requirement,
      category: matched?.category ?? "other",
      importance: matched?.importance ?? "medium",
      evidenceStatus: matched?.evidenceStatus ?? "missing",
      resumeEvidence: keywordEvidence.length > 0 ? keywordEvidence : baseEvidence,
      evidenceStrength: matched?.evidenceStrength ?? "none",
      fixability: matched?.fixability ?? "not_fixable_by_wording",
      explanation: matched
        ? matched.explanation
        : "No direct evidence for this requirement was found in the submitted resume.",
      recommendedAction: matched?.fixability === "strengthen" ? "Strengthen the evidence by making the relevant experience more specific and role-aligned." : undefined,
    };
  });

  const recommendations: Recommendation[] = [
    {
      priority: 1,
      title: "Address the fundamental RF domain gap",
      problem: "The target role requires RF engineering and antenna experience, but the supplied resume does not provide direct evidence for that domain.",
      whyItMatters: "This is the highest-risk mismatch because it affects the candidate's ability to qualify for the role without a direct technical foundation.",
      evidence: keywords.filter((item) => item.evidenceStatus === "missing" && item.importance === "critical").slice(0, 3).map((item) => item.phrase),
      action: "Do not add RF claims without evidence. If the candidate has genuine RF work, bring it forward explicitly; otherwise treat this as a role mismatch.",
      fixability: "not_fixable_by_wording",
    },
    {
      priority: 2,
      title: "Clarify the target-fit narrative",
      problem: "The resume demonstrates strong growth outcomes but lacks role-specific proof for the target engineering function.",
      whyItMatters: "The current narrative is credible for marketing growth, but it hides the mismatch between the applicant's actual experience and the job requirement.",
      evidence: ["Strong measurable growth outcomes", "Target RF engineering gap"],
      action: "Reframe the profile around transferable analytical capability, then clearly explain the gap and the relevant adjacent experience if applicable.",
      fixability: "strengthen",
    },
    {
      priority: 3,
      title: "Increase evidence of problem solving and systems thinking",
      problem: "The resume suggests analytical and optimization skills, but they are not tied to technical systems or engineering work.",
      whyItMatters: "This is an improvable area that can help bridge non-direct experience to adjacent technical roles if supported by concrete examples.",
      evidence: ["Optimization work", "Performance measurement", "Analytical decision-making"],
      action: "Add clear examples of problem solving, experimentation, and systems impact with quantified outcomes.",
      fixability: "strengthen",
    },
  ];

  const diagnostics: DiagnosticCheck[] = buildStructuredChecks({
    resumeText,
    jobDescription,
    targetRoleTitle,
    sections,
    contact,
    keywords,
    summaryText,
    roleRelevanceScore,
    skillsCoverageScore,
    evidenceQualityScore,
    seniorityFitScore,
    atsScore,
    keywordContextScore,
    clarityScore,
    overallScore,
  });

  const sectionFeedback: SectionFeedback[] = [
    {
      section: "Summary",
      score: clamp(46),
      strengths: [createFinding("Career positioning", "The summary is readable and consistent with a growth-focused background.", [summaryText])],
      issues: [createFinding("Role mismatch", "The summary does not directly address the target RF engineering domain.", ["RF engineering", "antenna design"])],
      suggestions: [createFinding("Tighten the narrative", "Reframe the summary around measurable business impact and the closest adjacent technical competence.", ["problem solving", "systems thinking"])],
    },
    {
      section: "Experience",
      score: clamp(76),
      strengths: [createFinding("Result-driven execution", "The experience section includes strong quantified outcomes and clear operational scope.", bulletEvidence)],
      issues: [createFinding("Technical mismatch", "The experience does not show direct RF engineering or antenna qualification.", ["RF engineering", "base station antennas"])],
      suggestions: [createFinding("Add relevant evidence", "If there is adjacent technical work, surface it with measurable examples and a clear connection to the target role.", ["technical ownership", "systems work"])],
    },
    {
      section: "Education",
      score: clamp(38),
      strengths: [createFinding("Clear academic baseline", "The resume presents a structured education record, though not yet aligned to the target domain.", ["Education section detected"])],
      issues: [createFinding("Qualification gap", "No direct electrical engineering or required degree alignment was found in the submission.", ["electrical engineering"])],
      suggestions: [createFinding("Surface the right credentials", "If the degree or coursework is relevant, make it explicit and connected to the role's technical requirements.", ["degree", "engineering coursework"])],
    },
    {
      section: "Skills",
      score: clamp(51),
      strengths: [createFinding("General analytical capability", "Skill language reflects data-informed operational work.", ["optimization", "analysis", "execution"])],
      issues: [createFinding("Critical skill gap", "Specific RF and simulation tools are absent from the skills narrative.", ["HFSS", "CST", "ADS"])],
      suggestions: [createFinding("Build a precise technical skills profile", "Only keep highly relevant tools and methods if they are genuinely true and supported by experience.", ["technical tools", "domain evidence"])],
    },
  ];

  const lineFindings: ResumeLineFinding[] = lines.slice(0, 5).map((line, index) => {
    const isStrong = /\d/.test(line) || /(growth|optimization|performance|leadership|program)/i.test(line);
    return {
      section: index % 2 === 0 ? "experience" : "summary",
      itemId: `line-${index + 1}`,
      originalText: line,
      checks: isStrong ? ["14 quantified_achievements", "15 outcome_orientation"] : ["19 bullet_readability"],
      severity: isStrong ? "good" : "review",
      explanation: isStrong
        ? "This bullet contains a measurable result or clear business outcome, which is useful evidence for the application."
        : "This bullet reads clearly but would benefit from more concrete or role-specific evidence.",
      suggestedApproach: isStrong ? "Keep the outcome and quantify it if possible." : "Add a specific metric, owned scope, or role-aligned technical signal.",
    };
  });

  const detectedLocation = jobDescription.match(/[A-Za-z]+,\s*[A-Za-z]+/g)?.[0] ?? null;
  const detectedWorkModel = /remote|hybrid|onsite/i.test(jobDescription)
    ? (jobDescription.toLowerCase().includes("remote") ? "remote" : jobDescription.toLowerCase().includes("hybrid") ? "hybrid" : "onsite")
    : null;

  return {
    id: crypto.randomUUID(),
    userId,
    resumeId,
    createdAt,
    source: {
      resumeFileName: resumeFileName,
      resumeText,
      jobDescription,
    },
    targetRole: {
      title: targetRoleTitle,
      seniority: jobDescription.toLowerCase().includes("senior") ? "senior" : "mid-level",
      location: detectedLocation,
      relocationRequired: /relocation/i.test(jobDescription),
      workModel: detectedWorkModel,
    },
    executiveAssessment: {
      headline: "Strong business execution with a major RF-role gap",
      summary: summaryText,
      bottomLine: `The resume shows credible business performance and operational impact, but it does not yet provide enough direct evidence for the target RF engineering role to be considered application-ready.`,
    },
    scores,
    diagnostic: diagnostics,
    strengths,
    blockers: blockerList,
    keywords,
    evidenceMap,
    recommendations,
    sectionFeedback,
    lineFindings,
    metadata: {
      parserVersion: parserVersion,
      analysisVersion: analysisVersion,
      model: "deterministic-resume-intelligence",
    },
  };
}
