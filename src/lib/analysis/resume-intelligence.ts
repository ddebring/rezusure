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

const parserVersion = "resume-intelligence-v2";
const analysisVersion = "resume-intelligence-engine-v2";

const clamp = (value: number, min = 0, max = 100): number =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/**
 * Normalize extracted resume text without flattening its structure.
 * Line breaks are important for detecting section headings and reviewing bullets.
 */
function normalizeResumeText(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .trim();
}

function normalizeToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9+#.\s-]/g, " ").replace(/\s+/g, " ").trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countTermOccurrences(text: string, term: string): number {
  const needle = normalizeToken(term);
  if (!needle) return 0;
  const words = needle.split(/\s+/).filter(Boolean).map(escapeRegExp);
  const pattern = words.join("\\s+");
  const regex = new RegExp(`(?:^|[^a-z0-9+#])${pattern}(?=$|[^a-z0-9+#])`, "gi");
  return [...text.matchAll(regex)].length;
}

function countListMatches(text: string, list: string[]): number {
  return list.reduce((total, term) => total + (countTermOccurrences(text, term) > 0 ? 1 : 0), 0);
}

type SectionKey = "summary" | "experience" | "education" | "skills" | "projects" | "certifications" | "other";

function getSectionBodies(resumeText: string): Record<SectionKey, string> {
  const sections: Record<SectionKey, string[]> = {
    summary: [], experience: [], education: [], skills: [], projects: [], certifications: [], other: [],
  };
  const headingRules: Array<[SectionKey, RegExp]> = [
    ["summary", /^(professional\s+)?(summary|profile|overview|objective|about(?: me)?)\s*:?\s*$/i],
    ["experience", /^(work\s+)?experience|^employment history|^professional experience|^career history\s*:?\s*$/i],
    ["education", /^(education|academic background|qualifications)\s*:?\s*$/i],
    ["skills", /^(technical\s+)?(skills|core competencies|competencies|expertise)\s*:?\s*$/i],
    ["projects", /^(selected\s+)?(projects|portfolio)\s*:?\s*$/i],
    ["certifications", /^(certifications|licenses|credentials)\s*:?\s*$/i],
  ];
  let current: SectionKey = "other";
  for (const rawLine of resumeText.replace(/\r/g, "").split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const heading = headingRules.find(([, rule]) => rule.test(line));
    if (heading) {
      current = heading[0];
      continue;
    }
    sections[current].push(line);
  }
  return Object.fromEntries(
    Object.entries(sections).map(([key, lines]) => [key, lines.join(" ")]),
  ) as Record<SectionKey, string>;
}

function splitRequirements(jobDescription: string): string[] {
  const segments = jobDescription
    .split(/\n+|[;•]+|(?<=[.!?])\s+/)
    .map(normalizeWhitespace)
    .filter((part) => part.length >= 12 && part.length <= 300)
    .filter((part) => /\b(require|responsibilit|experience|skill|degree|education|must|preferred|knowledge|ability|lead|design|develop|support|work|collaborat|proficien|qualification|manage|build|create|analy[sz]|operate|deliver|familiar)\w*\b/i.test(part));
  const unique = [...new Set(segments)];
  return (unique.length ? unique : [normalizeWhitespace(jobDescription)]).slice(0, 18);
}

function detectContactInfo(resumeText: string) {
  const email = resumeText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? null;
  const phone = [...resumeText.matchAll(/(?:\+\d{1,3}[\s.-]?)?(?:\(?\d{2,5}\)?[\s.-]?)?\d[\d\s().-]{5,}\d/g)]
    .map((match) => match[0].trim())
    .find((value) => value.replace(/\D/g, "").length >= 7 && value.replace(/\D/g, "").length <= 15) ?? null;
  const linkedin = resumeText.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[^\s,)]+/i)?.[0] ?? null;
  return { email, phone, linkedin };
}

function linesFromResume(resumeText: string): string[] {
  return resumeText.split(/\r?\n/)
    .map((line) => line.trim().replace(/^[•●▪◦\-–—*]+\s*/, ""))
    .filter((line) => line.length >= 20 && line.length <= 260);
}

function computeMetricCount(text: string): number {
  return [...text.matchAll(/(?:\b\d[\d,.]*\s?%|\b\d[\d,.]*\s?(?:k|m|b|million|billion|users|customers|clients|employees|projects|years|hours|days|revenue|sales)\b|\$\s?\d[\d,.]*|₹\s?\d[\d,.]*)/gi)].length;
}

function createFinding(title: string, detail: string, evidence: string[]): Finding {
  return { title, detail, evidence: evidence.filter(Boolean).slice(0, 4) };
}

type RequirementSeed = {
  phrase: string;
  category: KeywordCategory;
  required: RequirementPriority;
  importance: RequirementImportance;
};

const commonSeeds: RequirementSeed[] = [
  { phrase: "communication", category: "soft_skill", required: "general", importance: "medium" },
  { phrase: "leadership", category: "soft_skill", required: "preferred", importance: "medium" },
  { phrase: "problem solving", category: "soft_skill", required: "general", importance: "medium" },
  { phrase: "stakeholder management", category: "soft_skill", required: "general", importance: "medium" },
  { phrase: "cross functional collaboration", category: "soft_skill", required: "general", importance: "medium" },
  { phrase: "project management", category: "hard_skill", required: "preferred", importance: "medium" },
  { phrase: "data analysis", category: "hard_skill", required: "preferred", importance: "medium" },
  { phrase: "analytics", category: "hard_skill", required: "preferred", importance: "medium" },
  { phrase: "strategy", category: "hard_skill", required: "preferred", importance: "medium" },
  { phrase: "customer service", category: "hard_skill", required: "preferred", importance: "medium" },
  { phrase: "sales", category: "hard_skill", required: "preferred", importance: "medium" },
  { phrase: "marketing", category: "hard_skill", required: "preferred", importance: "medium" },
  { phrase: "python", category: "tool", required: "preferred", importance: "medium" },
  { phrase: "javascript", category: "tool", required: "preferred", importance: "medium" },
  { phrase: "sql", category: "tool", required: "preferred", importance: "medium" },
  { phrase: "excel", category: "tool", required: "preferred", importance: "medium" },
  { phrase: "matlab", category: "tool", required: "preferred", importance: "medium" },
  { phrase: "ansys hfss", category: "tool", required: "must_have", importance: "critical" },
  { phrase: "cst microwave studio", category: "tool", required: "must_have", importance: "critical" },
  { phrase: "rf engineering", category: "hard_skill", required: "must_have", importance: "critical" },
  { phrase: "antenna design", category: "hard_skill", required: "must_have", importance: "critical" },
  { phrase: "electrical engineering", category: "qualification", required: "must_have", importance: "critical" },
  { phrase: "wireless", category: "industry", required: "general", importance: "medium" },
  { phrase: "relocation", category: "location", required: "must_have", importance: "high" },
];

function inferCategory(phrase: string): KeywordCategory {
  if (/\b(software|tool|platform|sql|python|excel|javascript|typescript|aws|azure|gcp|salesforce|hubspot|figma|matlab|hfss|cst)\b/i.test(phrase)) return "tool";
  if (/\b(degree|bachelor|master|phd|certification|licensed|qualification|engineering)\b/i.test(phrase)) return "qualification";
  if (/\b(communication|leadership|collaboration|problem solving|stakeholder|teamwork|interpersonal)\b/i.test(phrase)) return "soft_skill";
  if (/\b(remote|hybrid|onsite|relocation|location|travel)\b/i.test(phrase)) return "location";
  if (/\b(industry|sector|healthcare|finance|retail|manufacturing|wireless)\b/i.test(phrase)) return "industry";
  return "hard_skill";
}

function createRequirementKeywordList(jobDescription: string): RequirementSeed[] {
  const found = new Map<string, RequirementSeed>();
  const normalizedDescription = normalizeWhitespace(jobDescription);

  // Keep known role-neutral requirements only when they actually appear in the job description.
  for (const seed of commonSeeds) {
    if (countTermOccurrences(normalizedDescription, seed.phrase) > 0) {
      found.set(normalizeToken(seed.phrase), seed);
    }
  }

  // Extract candidate terms from individual sentences. Do not treat every ordinary
  // word or phrase in the job description as a keyword.
  const stopPhrases = new Set([
    "the", "and", "with", "from", "that", "this", "you", "our", "your", "will",
    "for", "are", "have", "has", "who", "what", "work", "role", "team", "years",
    "year", "ability", "experience", "required", "preferred", "responsibilities",
    "requirements", "skills", "including", "such", "using", "their", "they", "all",
    "any", "can", "not", "more", "than", "into", "across", "about", "ensure",
    "support", "strong", "good", "responsible", "looking", "candidate", "position",
    "opportunity", "please", "must", "minimum", "qualification", "qualifications",
    "job", "description", "applicant", "successful", "ideal",
  ]);

  const sentences = jobDescription
    .split(/\n+|[;•]+|(?<=[.!?])\s+/)
    .map(normalizeWhitespace)
    .filter(Boolean);

  const addCandidate = (rawPhrase: string, sentence: string) => {
    const phrase = normalizeWhitespace(rawPhrase).replace(/^[.,:;()]+|[.,:;()]+$/g, "");
    const normalized = normalizeToken(phrase);
    const words = normalized.split(" ").filter(Boolean);
    if (!normalized || words.length > 4 || normalized.length < 3 || normalized.length > 45) return;
    if (words.some((word) => stopPhrases.has(word)) || stopPhrases.has(normalized)) return;
    if (/^\d+$/.test(normalized)) return;

    // Single words are retained only when they look like a named technology,
    // acronym, or tool; generic sentence-initial capitalization is not enough.
    const looksLikeToolOrAcronym =
      /[+#.]/.test(phrase) ||
      /\b(?:Salesforce|HubSpot|Workday|ServiceNow|Tableau|Power BI|Microsoft 365|Google Analytics|API|CRM|ERP|AWS|Azure|GCP|SQL|HTML|CSS|AI|ML|UX|UI|SEO|SEM|SaaS|B2B|B2C|PMP|CPA|CFA|RN|CNA|CNC|CAD|CAM|GIS|ETL|CI\/CD)\b/i.test(phrase) ||
      /^[A-Z0-9]{2,}(?:[+#.-][A-Z0-9]+)*$/.test(phrase);
    if (words.length === 1 && !looksLikeToolOrAcronym && !/[A-Z]/.test(phrase.slice(1))) return;

    const key = normalized;
    if (found.has(key)) return;

    // Priority is based on the sentence containing the candidate, not on unrelated
    // uses of "required" elsewhere in the complete job description.
    const requirementContext = sentence.toLowerCase();
    const isMustHave = /\b(must|required|mandatory|minimum|essential|need to|must have)\b/.test(requirementContext);
    const isCritical = /\b(must|required|mandatory|minimum|essential|critical)\b/.test(requirementContext);

    found.set(key, {
      phrase,
      category: inferCategory(phrase),
      required: isMustHave ? "must_have" : "preferred",
      importance: isCritical ? "high" : "medium",
    });
  };

  for (const sentence of sentences) {
    // Preserve multi-word proper names and named technologies.
    for (const match of sentence.matchAll(/\b[A-Z][A-Za-z0-9+#.-]*(?:\s+[A-Z][A-Za-z0-9+#.-]*){0,3}\b/g)) {
      addCandidate(match[0], sentence);
    }

    // Pick out explicit technology/tool tokens without promoting every common word.
    for (const match of sentence.matchAll(/\b[A-Za-z][A-Za-z0-9]*(?:[+#][+#]?)\b|\b[A-Z]{2,}(?:\/[A-Z]{2,})?\b/g)) {
      addCandidate(match[0], sentence);
    }
  }

  // Stable insertion order: explicit known requirements first, then extracted terms.
  return [...found.values()].slice(0, 35);
}

function buildKeywordFindings(jobDescription: string, resumeText: string): KeywordFinding[] {
  const phrases = createRequirementKeywordList(jobDescription);
  if (!phrases.length) {
    return [{
      phrase: "job-relevant evidence",
      normalizedPhrase: "job relevant evidence",
      category: "other",
      required: "general",
      frequencyInJD: 1,
      frequencyInResume: 0,
      evidenceStatus: "missing",
      evidenceStrength: "none",
      importance: "medium",
      fixability: "strengthen",
      contextQuality: 0,
      explanation: "No reliable role-specific terms could be extracted automatically. Review the job requirements manually.",
    }];
  }
  return phrases.map((entry) => {
    const resumeCount = countTermOccurrences(resumeText, entry.phrase);
    const freqInJD = countTermOccurrences(jobDescription, entry.phrase);
    const missing = resumeCount === 0;
    const partial = !missing && resumeCount < Math.min(Math.max(freqInJD, 1), 3);
    const evidenceStatus: EvidenceStatus = missing ? "missing" : partial ? "partial" : "supported";
    const evidenceStrength: EvidenceStrength = missing ? "none" : partial ? (entry.category === "soft_skill" ? "transferable" : "weak") : "direct";
    const fixability: KeywordFinding["fixability"] = missing
      ? entry.category === "tool" || entry.category === "qualification" || entry.importance === "critical" ? "not_fixable_by_wording" : "strengthen"
      : partial ? "strengthen" : "optional";
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
      contextQuality: missing ? 0 : clamp(partial ? 45 + resumeCount * 10 : 75 + Math.min(25, resumeCount * 5)),
      explanation: missing
        ? `The job description mentions "${entry.phrase}", but that phrase was not found in the supplied resume. This is a keyword gap, not proof that the candidate lacks the underlying skill.`
        : partial
          ? `The resume mentions "${entry.phrase}", but the text match alone does not establish depth, recency, or achievement-level evidence. Review the surrounding context.`
          : `The resume contains "${entry.phrase}". Confirm that it is supported by concrete experience or project evidence.`,
    } as KeywordFinding;
  });
}


type RoleMismatchAssessment = {
  mismatch: boolean;
  resumeRole: string | null;
  targetRole: string | null;
  reasons: string[];
};

function assessRoleMismatch(resumeText: string, jobDescription: string, targetRoleTitle: string): RoleMismatchAssessment {
  const resumeHeader = resumeText.split(/\n/).slice(0, 12).join(" ");
  const resumeRoleMatch = resumeHeader.match(/\b(?:senior|junior|lead|principal|staff)?\s*(?:software|salesforce|civil|mechanical|electrical|data|frontend|backend|full[- ]stack|network|systems|maintenance|marketing|sales|finance|hr|human resources|product|project)\s+(?:developer|engineer|analyst|administrator|consultant|manager|architect|specialist|designer|scientist|coordinator)\b/i);
  const resumeRole = resumeRoleMatch?.[0]?.trim() ?? null;

  const explicitRole = jobDescription.match(/\bRole\s*:\s*([^.;\n]{3,90})/i)?.[1]?.trim();
  const titleCandidate = explicitRole || (/\bassistant manager\s+civil maintenance\b/i.test(jobDescription)
    ? "Assistant Manager Civil Maintenance"
    : /\bcivil engineer(?:ing)?\b/i.test(jobDescription)
      ? "Civil Engineering role"
      : /\bsalesforce\b/i.test(jobDescription)
        ? "Salesforce role"
        : null);
  const targetRole = targetRoleTitle && targetRoleTitle !== "Target role" ? targetRoleTitle : titleCandidate;

  const resumeSoftware = /\b(salesforce|software|web|frontend|backend|full[- ]stack|apex|lightning web components|crm developer|software developer|computer science)\b/i.test(resumeHeader);
  const resumeCivil = /\b(civil engineer|civil maintenance|waterproofing|civil masonry|plumbing maintenance)\b/i.test(resumeHeader);
  const jobCivil = /\b(civil maintenance|civil engineering|civil engineer|civil masonry|waterproofing|plumbing|building maintenance|construction & site engineering)\b/i.test(jobDescription);
  const jobSoftware = /\b(salesforce developer|software developer|software engineer|apex|lightning web components|crm developer)\b/i.test(jobDescription);

  const reasons: string[] = [];
  if (resumeSoftware && jobCivil && !jobSoftware) {
    reasons.push(`Your resume indicates a software/Salesforce profile${resumeRole ? ` (${resumeRole})` : ""}, while the target role is in civil maintenance/engineering${targetRole ? ` (${targetRole})` : ""}.`);
  }

  const requiresCivilQualification = /\b(?:diploma|b\.?\s?e\.?|bachelor(?:'s)?|b\.?\s?tech)\b[^.\n]{0,100}\bcivil engineering\b|\bcivil engineering\b[^.\n]{0,100}\b(?:mandatory|required|qualification|diploma|b\.?\s?e\.?|b\.?\s?tech)\b/i.test(jobDescription);
  const resumeHasCivilQualification = /\b(?:diploma|b\.?\s?e\.?|bachelor(?:'s)?|b\.?\s?tech)\b[^.\n]{0,100}\bcivil engineering\b|\bcivil engineering\b[^.\n]{0,100}\b(?:diploma|b\.?\s?e\.?|b\.?\s?tech)\b/i.test(resumeText);
  if (jobCivil && requiresCivilQualification && !resumeHasCivilQualification && /\b(computer science|information technology|software engineering)\b/i.test(resumeText)) {
    reasons.push("The job requires a civil-engineering qualification, but the resume lists a different academic discipline and does not demonstrate the required civil qualification.");
  }

  return { mismatch: reasons.length > 0, resumeRole, targetRole, reasons };
}

function statusForScore(score: number): DiagnosticCheck["status"] {
  if (score >= 85) return "strong";
  if (score >= 70) return "good";
  return "needs_improvement";
}

function buildStructuredChecks(input: {
  resumeText: string;
  sections: Record<SectionKey, string>;
  contact: { email: string | null; phone: string | null; linkedin: string | null };
  keywords: KeywordFinding[];
  scores: AnalysisScores;
  metrics: number;
  lineCount: number;
}): DiagnosticCheck[] {
  const { resumeText, sections, contact, keywords, scores, metrics, lineCount } = input;
  const has = (section: SectionKey) => Boolean(sections[section].trim());
  const missing = keywords.filter((item) => item.evidenceStatus === "missing");
  const criticalMissing = missing.filter((item) => item.importance === "critical" || item.importance === "high");
  const metricScore = metrics > 0 ? 88 : 58;
  const contactScore = contact.email && contact.phone ? 95 : contact.email || contact.phone ? 75 : 45;
  const rows: Array<{ id: string; category: string; title: string; score: number; summary: string; reasoning: string; recommendation: string; affectedSection: string }> = [
    { id: "R01", category: "ats_parsing", title: "Contact Information", score: contactScore, summary: contact.email && contact.phone ? "Email and phone patterns were detected." : "Some contact information may be missing from the extracted text.", reasoning: "Contact fields were checked with simple text patterns; name and location are not reliably validated.", recommendation: "Confirm that your name, professional email, phone number, and location are easy to find.", affectedSection: "header" },
    { id: "R02", category: "resume_structure", title: "Standard Section Headings", score: [has("summary"), has("experience"), has("skills")].filter(Boolean).length * 25 + 25, summary: "The engine checked for common summary, experience, and skills headings.", reasoning: "Heading detection is heuristic and can miss unusual heading labels or layouts.", recommendation: "Use clear, conventional section headings where appropriate.", affectedSection: "structure" },
    { id: "R03", category: "ats_parsing", title: "Experience Section Detection", score: has("experience") ? 88 : 48, summary: has("experience") ? "A recognizable experience section was detected." : "A recognizable experience heading was not detected.", reasoning: "This checks heading-based text extraction, not the completeness of employment history.", recommendation: "Use a clear Experience or Work Experience heading and list roles consistently.", affectedSection: "experience" },
    { id: "R04", category: "ats_parsing", title: "Date Signals", score: /\b(?:19|20)\d{2}\b|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i.test(resumeText) ? 85 : 55, summary: "Date-like patterns were checked in the extracted text.", reasoning: "Pattern detection does not verify that every role has a valid start and end date.", recommendation: "Place consistent dates beside each role, education entry, and certification where relevant.", affectedSection: "experience" },
    { id: "R05", category: "resume_structure", title: "Resume Length", score: resumeText.length < 500 ? 55 : resumeText.length > 9000 ? 65 : 82, summary: `The extracted resume contains approximately ${resumeText.split(/\s+/).filter(Boolean).length} words.`, reasoning: "Length is estimated from extracted text; page layout and candidate seniority are not available to this check.", recommendation: "Keep the resume focused on evidence relevant to the target role.", affectedSection: "resume" },
    { id: "R06", category: "experience_quality", title: "Quantified Achievements", score: metricScore, summary: metrics ? `${metrics} metric-like expression(s) were detected.` : "No clear metric-like expressions were detected.", reasoning: "Numbers can indicate measurable outcomes, but the engine does not verify their truth or business significance.", recommendation: "Where accurate, show scale and outcomes with percentages, revenue, time, volume, quality, or cost metrics.", affectedSection: "experience" },
    { id: "R07", category: "experience_quality", title: "Bullet / Line Readability", score: lineCount >= 3 ? 78 : 60, summary: `${lineCount} resume lines were suitable for a basic line-level review.`, reasoning: "This is a text heuristic; it does not assess visual formatting in the original document.", recommendation: "Use concise, one-idea-per-bullet statements where that improves readability.", affectedSection: "experience" },
    { id: "R08", category: "skills", title: "Target Requirement Coverage", score: scores.skillsCoverage, summary: `${keywords.filter((item) => item.evidenceStatus === "supported").length} extracted job terms were found in the resume.`, reasoning: "Keyword overlap is a proxy for textual alignment, not a determination of candidate competence.", recommendation: "Prioritize missing must-have requirements, and add them only when backed by genuine experience.", affectedSection: "skills" },
    { id: "R09", category: "job_match", title: "Missing Important Keywords", score: clamp(100 - criticalMissing.length * 14 - Math.max(0, missing.length - criticalMissing.length) * 5), summary: `${missing.length} extracted job terms were not found in the resume, including ${criticalMissing.length} high-priority term(s).`, reasoning: "Absence of a phrase in the resume does not prove absence of the skill; it identifies a gap to verify.", recommendation: "Review each gap and add truthful evidence where applicable. Do not keyword-stuff or claim unearned skills.", affectedSection: "skills" },
    { id: "R10", category: "job_match", title: "Role Relevance", score: scores.roleRelevance, summary: "Role relevance is estimated from extracted job terms and their textual overlap with the resume.", reasoning: "This deterministic estimate does not replace semantic evaluation of responsibilities, seniority, or transferable experience.", recommendation: "Prioritize the most relevant, evidence-backed experience near the top of the resume.", affectedSection: "experience" },
    { id: "R11", category: "job_match", title: "Evidence Quality", score: scores.evidenceQuality, summary: "The score reflects detected metrics and textual evidence coverage.", reasoning: "The engine cannot verify claims or infer whether a metric is credible from text alone.", recommendation: "Tie skills and responsibilities to specific actions, scope, and verifiable outcomes.", affectedSection: "experience" },
    { id: "R12", category: "resume_structure", title: "Summary Presence", score: has("summary") ? 85 : 55, summary: has("summary") ? "A summary/profile section was detected." : "A summary/profile heading was not detected.", reasoning: "The section check is based on recognized headings and may miss alternative formats.", recommendation: "Consider a concise, target-relevant summary if it helps clarify your fit.", affectedSection: "summary" },
    { id: "R13", category: "resume_structure", title: "Skills Section Presence", score: has("skills") ? 85 : 55, summary: has("skills") ? "A skills/competencies section was detected." : "A skills/competencies heading was not detected.", reasoning: "Presence does not establish that listed skills are relevant or evidenced.", recommendation: "Organize relevant skills clearly and keep them consistent with your experience.", affectedSection: "skills" },
    { id: "R14", category: "resume_structure", title: "Education Section Presence", score: has("education") ? 85 : 60, summary: has("education") ? "An education section was detected." : "An education heading was not detected.", reasoning: "The engine detects section text but does not validate degrees or institution details.", recommendation: "Include accurate education and required credentials when relevant to the role.", affectedSection: "education" },
    { id: "R15", category: "job_match", title: "Seniority Signals", score: scores.seniorityFit, summary: "Seniority alignment is estimated from limited title and wording signals.", reasoning: "A reliable seniority assessment needs role dates, scope, decision authority, and job-level context.", recommendation: "Show ownership, complexity, leadership, and impact only where supported by actual work.", affectedSection: "experience" },
    { id: "R16", category: "ats_parsing", title: "Extracted Text Volume", score: resumeText.length >= 500 ? 88 : 60, summary: "The extracted text length was checked as a basic readability signal.", reasoning: "Text volume alone cannot establish whether the original PDF/DOCX is ATS-compatible.", recommendation: "Review the extracted text for missing columns, broken ordering, or omitted content.", affectedSection: "resume" },
    { id: "R17", category: "job_match", title: "Requirement Prioritization", score: criticalMissing.length === 0 ? 82 : 58, summary: "The engine assigned heuristic priority levels to extracted terms.", reasoning: "Priority labels are inferred from wording and should be checked against the employer's actual must-have criteria.", recommendation: "Verify which requirements are mandatory versus preferred before deciding whether a gap is disqualifying.", affectedSection: "job_description" },
    { id: "R18", category: "language_quality", title: "Language Quality", score: 65, summary: "Automated grammar and spelling verification was not performed by this deterministic engine.", reasoning: "This score is deliberately conservative because no grammar/spell-check model is used here.", recommendation: "Proofread the resume or run a dedicated grammar and spelling check.", affectedSection: "language" },
    { id: "R19", category: "experience_quality", title: "Impact Orientation", score: metricScore, summary: metrics ? "Some quantified impact signals were detected." : "Impact statements may benefit from clearer outcomes or scale.", reasoning: "The engine detects metric-like patterns, not whether bullets truly describe achievements rather than duties.", recommendation: "Where accurate, describe the action, context, and resulting outcome.", affectedSection: "experience" },
    { id: "R20", category: "job_match", title: "Domain / Industry Alignment", score: scores.roleRelevance, summary: "Domain alignment is estimated from extracted job terms, not a fixed industry template.", reasoning: "Exact keyword matching can miss synonyms, adjacent experience, and equivalent terminology.", recommendation: "Use accurate domain terminology when it describes real experience; explain transferable skills with examples.", affectedSection: "experience" },
  ];

  const additionalChecks: Array<[string, string, string, string]> = [
    ["R21", "Action Language", "experience_quality", "Review whether bullets state actions and ownership clearly."],
    ["R22", "Responsibility vs Outcome", "experience_quality", "Check whether key responsibilities are connected to outcomes where evidence exists."],
    ["R23", "Bullet Length", "language_quality", "Review long or dense bullets for clarity and scanability."],
    ["R24", "Repeated Wording", "language_quality", "Review repeated phrases and duplicated claims."],
    ["R25", "Buzzword Reliance", "language_quality", "Replace unsupported claims with concrete examples where possible."],
    ["R26", "Formatting Consistency", "resume_structure", "Manually verify consistent dates, titles, punctuation, and bullet formatting."],
    ["R27", "Chronology", "resume_structure", "Manually verify reverse-chronological ordering and date consistency."],
    ["R28", "Section Ordering", "resume_structure", "Review whether the most relevant sections appear early enough for the target role."],
    ["R29", "Certification Evidence", "skills", "Only list certifications that were actually earned and are relevant."],
    ["R30", "Tools / Technologies", "skills", "Verify tools and technologies against actual hands-on experience."],
    ["R31", "Education Relevance", "job_match", "Compare stated education with the job's actual qualification requirements."],
    ["R32", "Industry Terminology", "job_match", "Use role-specific terminology only when it accurately describes the candidate's work."],
    ["R33", "Keyword Context", "job_match", "Confirm matched terms appear in meaningful context rather than as a list."],
    ["R34", "Job Title Alignment", "job_match", "Compare actual role scope and experience with the target title."],
    ["R35", "Required Skill Coverage", "job_match", "Review must-have skills individually and validate supporting evidence."],
    ["R36", "Preferred Skill Coverage", "job_match", "Prioritize preferred skills only after mandatory requirements are reviewed."],
    ["R37", "Responsibility Alignment", "job_match", "Compare the candidate's documented responsibilities with the role description."],
    ["R38", "Qualification Alignment", "job_match", "Verify required degrees, licenses, and credentials against the resume."],
    ["R39", "Experience-Level Alignment", "job_match", "Compare scope, ownership, and experience level; titles alone are insufficient."],
    ["R40", "Domain / Industry Alignment", "job_match", "Assess domain fit using relevant experience and transferable evidence, not a fixed industry assumption."],
    ["R41", "Missing Important Keywords", "job_match", "Review missing terms and distinguish missing wording from missing capability."],
    ["R42", "Keyword Prominence", "job_match", "Place the strongest relevant evidence where a recruiter can find it quickly."],
    ["R43", "Requirement Extraction", "job_match", "Review the extracted requirements against the original job description."],
    ["R44", "Must-Have Classification", "job_match", "Validate which requirements are mandatory and which are preferred."],
    ["R45", "Evidence Strength", "job_match", "Prioritize specific examples over unsupported skill claims."],
    ["R46", "Seniority Signal", "job_match", "Support seniority claims with scope, decisions, leadership, and outcomes."],
    ["R47", "Domain Terminology", "job_match", "Confirm domain terms match genuine work or project experience."],
    ["R48", "Summary Alignment", "job_match", "Align the summary with the target role using truthful evidence."],
    ["R49", "Skills Section Relevance", "skills", "Keep the skills section focused on capabilities relevant to the target role."],
    ["R50", "Most Relevant Experience", "job_match", "Bring the strongest relevant experience forward without overstating fit."],
  ];
  for (const [id, title, category, recommendation] of additionalChecks) {
    const score = id === "R30" ? scores.skillsCoverage : id === "R40" ? scores.roleRelevance : id === "R41" ? clamp(100 - missing.length * 8) : 70;
    rows.push({
      id, title, category, score,
      summary: "This is a review prompt; the deterministic engine does not fully verify this criterion.",
      reasoning: "This criterion requires contextual or visual judgment beyond simple text-pattern checks. Treat the score as a heuristic signal, not a verified finding.",
      recommendation,
      affectedSection: category === "skills" ? "skills" : category === "job_match" ? "experience" : "resume",
    });
  }

  return rows.map((row) => {
    const relatedMissing = missing.slice(0, 3).map((item) => item.phrase);
    const evidence: DiagnosticCheck["evidence"] = [
      { source: "resume", section: row.affectedSection, text: row.summary },
      ...(relatedMissing.length ? [{ source: "job_description" as const, section: "requirements", text: `Terms not found in resume: ${relatedMissing.join(", ")}` }] : []),
    ];
    const score = clamp(row.score);
    return {
      id: row.id, title: row.title, name: row.title, category: row.category,
      status: statusForScore(score), severity: score < 55 ? "high" : score < 70 ? "medium" : "info",
      score, maxScore: 100, summary: row.summary, evidence,
      explanation: row.reasoning, reasoning: row.reasoning, recommendation: row.recommendation,
      fixability: criticalMissing.length ? "strengthen" : "optional",
      recommendedAction: row.recommendation, affectedSection: row.affectedSection,
      jobRequirementId: null,
    } as DiagnosticCheck;
  });
}

export function validateResumeAnalysisInput(input: {
  resumeText: string;
  jobDescription?: string | null;
  targetRole?: string | null;
}): { resumeText: string; jobDescription: string; targetRoleTitle: string } {
  // Preserve resume line boundaries so section headings and bullets remain detectable.
  const resumeText = normalizeResumeText(input.resumeText || "");
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
  const lines = linesFromResume(input.resumeText);
  const contact = detectContactInfo(resumeText);
  const keywords = buildKeywordFindings(jobDescription, resumeText);
  const requirements = splitRequirements(jobDescription);
  const missing = keywords.filter((item) => item.evidenceStatus === "missing");
  const criticalMissing = missing.filter((item) => item.importance === "critical" || item.importance === "high");
  const metrics = computeMetricCount(resumeText);
  const termCoverage = keywords.length ? keywords.filter((item) => item.evidenceStatus === "supported").length / keywords.length : 0;
  const metricScore = metrics > 0 ? Math.min(95, 70 + metrics * 3) : 48;
  const atsScore = clamp((contact.email ? 30 : 10) + (contact.phone ? 25 : 10) + (sections.summary ? 10 : 0) + (sections.experience ? 15 : 0) + (sections.skills ? 10 : 0) + (resumeText.length > 500 ? 10 : 0));
  const roleRelevanceScore = clamp(35 + termCoverage * 65 - Math.min(25, criticalMissing.length * 5));
  const skillsCoverageScore = clamp(30 + termCoverage * 70);
  const evidenceQualityScore = clamp(45 + Math.min(metrics * 4, 25) + (sections.experience ? 10 : 0) + (lines.length >= 4 ? 10 : 0));
  const seniorityFitScore = clamp(55 + (/\b(senior|lead|principal|director|head of|manager)\b/i.test(resumeText) ? 15 : 0) - (/\b(senior|lead|principal|director|head of)\b/i.test(jobDescription) && !/\b(senior|lead|principal|director|head of|manager)\b/i.test(resumeText) ? 15 : 0));
  const keywordContextScore = clamp(25 + termCoverage * 75);
  const clarityScore = clamp(70 + (lines.length >= 4 ? 10 : 0) - (resumeText.length > 8000 ? 10 : 0));
  const resumeQualityScore = Math.round(atsScore * 0.3 + evidenceQualityScore * 0.3 + clarityScore * 0.2 + (sections.summary && sections.experience && sections.skills ? 20 : 10));
  const jobMatchScore = Math.round(roleRelevanceScore * 0.35 + skillsCoverageScore * 0.3 + evidenceQualityScore * 0.15 + seniorityFitScore * 0.1 + keywordContextScore * 0.1);
  const applicationReadinessScore = Math.round(resumeQualityScore * 0.45 + jobMatchScore * 0.55);
  const scores: AnalysisScores = {
    overall: applicationReadinessScore,
    resumeQuality: clamp(resumeQualityScore),
    jobMatch: clamp(jobMatchScore),
    applicationReadiness: applicationReadinessScore,
    roleRelevance: Math.round(roleRelevanceScore),
    skillsCoverage: Math.round(skillsCoverageScore),
    evidenceQuality: Math.round(evidenceQualityScore),
    seniorityFit: Math.round(seniorityFitScore),
    atsParseability: Math.round(atsScore),
    keywordContext: Math.round(keywordContextScore),
    clarityBrevity: Math.round(clarityScore),
  };

  const roleMismatch = assessRoleMismatch(resumeText, jobDescription, targetRoleTitle);
  if (roleMismatch.mismatch) {
    // Do not let general resume quality hide a fundamental mismatch with the target role.
    scores.roleRelevance = Math.min(scores.roleRelevance, 10);
    scores.jobMatch = Math.min(scores.jobMatch, 10);
    scores.overall = Math.min(scores.overall, 25);
    scores.applicationReadiness = Math.min(scores.applicationReadiness, 25);
  }

  const supported = keywords.filter((item) => item.evidenceStatus === "supported");
  const directEvidence = lines.filter((line) => /\d/.test(line)).slice(0, 4);
  const strengths: Finding[] = [];
  if (directEvidence.length) strengths.push(createFinding("Quantified evidence", "The resume includes numeric or metric-like details that may help demonstrate scope or outcomes.", directEvidence));
  if (sections.experience) strengths.push(createFinding("Experience section detected", "A recognizable experience section was detected in the extracted resume text.", [sections.experience.slice(0, 180)]));
  if (supported.length) strengths.push(createFinding("Job-term overlap", "Some terms from the target job description also appear in the resume. Review context to confirm they reflect genuine experience.", supported.slice(0, 4).map((item) => item.phrase)));
  if (sections.education) strengths.push(createFinding("Education section detected", "Education-related content was found in the extracted text.", [sections.education.slice(0, 180)]));
  if (!strengths.length) strengths.push(createFinding("Resume text extracted", "Readable resume text was available for comparison, but the heuristic checks found limited strong signals.", [resumeText.slice(0, 180)]));

  const blockers: Blocker[] = criticalMissing.slice(0, 8).map((item, index) => ({
    id: `blocker-${index + 1}`,
    severity: item.importance === "critical" ? "critical" : "high",
    requirement: item.phrase,
    evidenceStatus: "missing",
    fixability: item.fixability,
    explanation: item.explanation,
  })) as Blocker[];

  if (roleMismatch.mismatch) {
    roleMismatch.reasons.forEach((reason, index) => {
      blockers.push({
        id: `role-mismatch-${index + 1}`,
        severity: "critical",
        requirement: index === 0 ? "Major occupation mismatch" : "Mandatory qualification mismatch",
        evidenceStatus: "missing",
        fixability: "not_fixable_by_wording",
        explanation: reason,
      } as Blocker);
    });
  }

  const evidenceMap: EvidenceMapEntry[] = requirements.slice(0, 12).map((requirement, index) => {
    const normalized = normalizeToken(requirement);
    const matched = keywords.find((item) => countTermOccurrences(requirement, item.phrase) > 0 || countTermOccurrences(item.phrase, normalized) > 0);
    const status = matched?.evidenceStatus ?? "missing";
    return {
      requirementId: `req-${index + 1}`,
      requirement,
      category: matched?.category ?? "other",
      importance: matched?.importance ?? "medium",
      evidenceStatus: status,
      resumeEvidence: matched && matched.evidenceStatus !== "missing" ? [matched.phrase] : [],
      evidenceStrength: matched?.evidenceStrength ?? "none",
      fixability: matched?.fixability ?? "strengthen",
      explanation: matched?.explanation ?? "No extracted keyword could be confidently matched to this requirement. Manual review is needed.",
      recommendedAction: status === "missing" ? "Check whether you have relevant experience; if so, add a truthful, specific example." : "Make the related experience and outcome clear in the relevant resume section.",
    } as EvidenceMapEntry;
  });

  const recommendations: Recommendation[] = [];
  if (criticalMissing.length) recommendations.push({
    priority: 1,
    title: "Review high-priority requirement gaps",
    problem: `${criticalMissing.length} high-priority job-description term(s) were not found in the resume text.`,
    whyItMatters: "Missing terms may reduce visible alignment, but they do not prove the candidate lacks the underlying experience.",
    evidence: criticalMissing.slice(0, 5).map((item) => item.phrase),
    action: "Verify each gap against actual experience. Add truthful evidence where it exists; do not claim skills, tools, or qualifications you do not have.",
    fixability: "strengthen",
  } as Recommendation);
  if (!sections.experience || metrics === 0) recommendations.push({
    priority: recommendations.length + 1,
    title: "Make experience evidence more specific",
    problem: !sections.experience ? "A standard experience heading was not detected." : "No clear metric-like outcomes were detected.",
    whyItMatters: "Specific examples help recruiters assess scope, ownership, and results.",
    evidence: !sections.experience ? [] : ["No metric-like expressions detected by the heuristic scan"],
    action: !sections.experience ? "Use a clear experience heading and organize roles with employer, title, dates, and concise bullets." : "Where accurate, add scale, outcome, time saved, revenue, volume, quality, or cost impact to relevant bullets.",
    fixability: "strengthen",
  } as Recommendation);
  if (!sections.skills) recommendations.push({
    priority: recommendations.length + 1,
    title: "Clarify relevant skills",
    problem: "A standard skills heading was not detected.",
    whyItMatters: "A focused skills section makes relevant capabilities easier to scan and compare with the job description.",
    evidence: [],
    action: "Add a concise skills section containing only skills you can substantiate with work, project, or education evidence.",
    fixability: "strengthen",
  } as Recommendation);
  if (!recommendations.length) recommendations.push({
    priority: 1,
    title: "Validate keyword matches in context",
    problem: "The resume contains several terms that overlap with the job description, but exact phrase matching cannot verify depth.",
    whyItMatters: "Evidence in accomplishments and responsibilities is more meaningful than keyword presence alone.",
    evidence: supported.slice(0, 5).map((item) => item.phrase),
    action: "Review the strongest matching bullets and make ownership, context, and outcomes explicit without adding unsupported claims.",
    fixability: "strengthen",
  } as Recommendation);

  if (roleMismatch.mismatch) {
    recommendations.unshift({
      priority: 0,
      title: "Confirm role eligibility before applying",
      problem: "The target role appears to require a different occupational background or mandatory qualification.",
      whyItMatters: roleMismatch.reasons.join(" "),
      evidence: roleMismatch.reasons,
      action: "Verify the target role and mandatory requirements. Do not attempt to solve a fundamental qualification or occupation mismatch by adding keywords.",
      fixability: "not_fixable_by_wording",
    } as Recommendation);
  }

  const diagnostics = buildStructuredChecks({ resumeText, sections, contact, keywords, scores, metrics, lineCount: lines.length });
  if (roleMismatch.mismatch) {
    diagnostics.unshift({
      id: "ROLE-MISMATCH",
      title: "Major occupation mismatch",
      name: "Major occupation mismatch",
      category: "job_match",
      status: "needs_improvement",
      severity: "high",
      score: 0,
      maxScore: 100,
      summary: "The resume's occupational profile does not align with the target role.",
      evidence: [
        { source: "resume", section: "profile", text: roleMismatch.resumeRole ?? "Resume profile indicates a different occupation." },
        { source: "job_description", section: "target_role", text: roleMismatch.targetRole ?? "Target role appears to be in a different occupational family." },
      ],
      explanation: roleMismatch.reasons.join(" "),
      reasoning: roleMismatch.reasons.join(" "),
      recommendation: "Before tailoring this resume, confirm that this is the intended job. Consider roles aligned with your existing occupation and qualifications.",
      recommendedAction: "Confirm the target role or choose a role aligned with your experience.",
      affectedSection: "target_role",
      fixability: "not_fixable_by_wording",
      jobRequirementId: null,
    } as DiagnosticCheck);
  }
  const sectionFeedback: SectionFeedback[] = ([
    ["Summary", "summary"],
    ["Experience", "experience"],
    ["Education", "education"],
    ["Skills", "skills"],
  ] as Array<[string, SectionKey]>).map(([label, key]) => {
    const present = Boolean(sections[key].trim());
    const score = present ? key === "experience" && metrics > 0 ? 86 : 76 : 48;
    return {
      section: label,
      score,
      strengths: present ? [createFinding(`${label} detected`, `Content was found under a recognizable ${label.toLowerCase()} heading.`, [sections[key].slice(0, 180)])] : [],
      issues: present ? [] : [createFinding(`${label} not detected`, `A standard ${label.toLowerCase()} heading was not detected in the extracted text.`, [])],
      suggestions: [createFinding(`Review ${label.toLowerCase()} relevance`, "Check that this section is accurate, concise, and relevant to the target role.", requirements.slice(0, 2))],
    } as SectionFeedback;
  });

  const lineFindings: ResumeLineFinding[] = lines.slice(0, 8).map((line, index) => {
    const hasMetric = /\d|%|\$|₹/.test(line);
    return {
      section: sections.experience && sections.experience.includes(line) ? "experience" : sections.skills && sections.skills.includes(line) ? "skills" : sections.education && sections.education.includes(line) ? "education" : "other",
      itemId: `line-${index + 1}`,
      originalText: line,
      checks: hasMetric ? ["quantified_evidence"] : ["specificity_review"],
      severity: hasMetric ? "good" : "review",
      explanation: hasMetric ? "This line contains a numeric signal. Confirm it accurately represents the result and context." : "This line has no obvious numeric signal; that is not inherently a problem, but a concrete example may improve it.",
      suggestedApproach: hasMetric ? "Retain the metric if it is accurate and clarify the action and result where needed." : "Where useful and truthful, add scope, ownership, or outcome detail.",
    } as ResumeLineFinding;
  });

  const locationMatch = jobDescription.match(/\b(?:in|based in|located in)\s+([A-Z][A-Za-z .'-]+,\s*[A-Z][A-Za-z .'-]+)\b/);
  const workModel = /\bremote\b/i.test(jobDescription) ? "remote" : /\bhybrid\b/i.test(jobDescription) ? "hybrid" : /\b(on[- ]site|onsite)\b/i.test(jobDescription) ? "onsite" : null;
  const roleText = targetRoleTitle === "Target role"
    ? (roleMismatch.targetRole ?? targetRoleTitle)
    : targetRoleTitle;
  const summaryText = sections.summary || "No dedicated summary section was detected. The assessment below is based on the extracted resume text and target job description.";
  const executiveHeadline = roleMismatch.mismatch
    ? "Major role mismatch detected — review eligibility before applying"
    : criticalMissing.length
      ? `Review ${criticalMissing.length} high-priority requirement gap${criticalMissing.length === 1 ? "" : "s"}`
      : `Resume and job-description comparison completed`;

  return {
    id: crypto.randomUUID(),
    userId,
    resumeId,
    createdAt,
    source: { resumeFileName, resumeText, jobDescription },
    targetRole: {
      title: roleText,
      seniority: /\b(principal|director|head of|senior|lead)\b/i.test(jobDescription) ? "senior" : "mid-level",
      location: locationMatch?.[1]?.trim() ?? null,
      relocationRequired: /\brelocation required|must relocate|relocation assistance\b/i.test(jobDescription),
      workModel,
    },
    executiveAssessment: {
      headline: executiveHeadline,
      summary: summaryText,
      bottomLine: roleMismatch.mismatch
        ? `Potentially unsuitable for this role based on the supplied documents. ${roleMismatch.reasons.join(" ")} This is an evidence-based warning, not a final employer eligibility decision.`
        : `This is a heuristic comparison of the supplied resume and job description. ${missing.length} extracted job term(s) were not found in the resume text. Treat these as items to verify, not proof that the candidate lacks those capabilities.`,
    },
    scores,
    diagnostic: diagnostics,
    strengths: strengths.slice(0, 5),
    blockers,
    keywords,
    evidenceMap,
    recommendations,
    sectionFeedback,
    lineFindings,
    metadata: { parserVersion, analysisVersion, model: "deterministic-resume-intelligence" },
  } as ResumeAnalysis;
}
