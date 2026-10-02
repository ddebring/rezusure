import Link from "next/link";
import { cookies } from "next/headers";
import { AlertTriangle, ArrowLeft, CheckCircle2, Download, RefreshCcw, ShieldAlert } from "lucide-react";
import { redirect } from "next/navigation";
import { ResumeCheck } from "@/components/resumes/ResumeCheck";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SESSION_COOKIE_NAME } from "@/lib/auth/types";
import { verifyFirebaseSessionCookie } from "@/lib/auth/verify-id-token";
import { adminDb } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Resume analysis", robots: { index: false, follow: false } };

type FirestoreTimestampLike = { _seconds: number; _nanoseconds?: number };

type ResumeRecord = {
  id?: string;
  userId?: string;
  fileName?: string;
  jobTitle?: string | null;
  status?: string;
  latestAnalysisId?: string | null;
  downloadURL?: string | null;
  createdAt?: FirestoreTimestampLike | Date | string | null;
  updatedAt?: FirestoreTimestampLike | Date | string | null;
};

type AnalysisRecord = {
  id?: string;
  userId?: string;
  resumeId?: string;
  jobTitle?: string | null;
  status?: string;
  overallScore?: number | string | null;
  atsScore?: number | string | null;
  contentScore?: number | string | null;
  structureScore?: number | string | null;
  impactScore?: number | string | null;
  clarityScore?: number | string | null;
  summary?: string | null;
  strengths?: string[] | null;
  detectedProblems?: string[] | null;
  recommendations?: string[] | null;
  warnings?: string[] | null;
  criticalIssues?: string[] | null;
  matchedKeywords?: string[] | null;
  missingKeywords?: string[] | null;
  suggestedKeywords?: string[] | null;
  jobRequirements?: string[] | null;
  sectionRecommendations?: string[] | null;
  sectionFeedback?: Record<string, {
    score?: number | string | null;
    strengths?: string[] | null;
    issues?: string[] | null;
    suggestions?: string[] | null;
  } | null> | null;
  scores?: Record<string, number | string | null> | null;
  createdAt?: FirestoreTimestampLike | Date | string | null;
  [key: string]: unknown;
};

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === "object" && "_seconds" in value) {
    const ts = value as FirestoreTimestampLike;
    return new Date(ts._seconds * 1000 + ((ts._nanoseconds ?? 0) / 1_000_000));
  }
  return null;
}

function formatDate(value: unknown): string {
  const date = toDate(value);
  if (!date) return "Unknown date";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function getScoreValue(analysis: AnalysisRecord | null, key: string): number | null {
  if (!analysis) return null;
  const direct = (analysis as Record<string, unknown>)[key];
  if (direct !== undefined) {
    const directScore = readNumber(direct);
    if (directScore !== null) return directScore;
  }
  const nested = analysis.scores as Record<string, unknown> | undefined;
  const nestedValue = nested?.[key];
  const nestedScore = readNumber(nestedValue);
  return nestedScore ?? null;
}

function getArrayValue(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function getSectionEntries(analysis: AnalysisRecord | null): Array<[string, { score?: number | null; strengths: string[]; issues: string[]; suggestions: string[] }]> {
  if (!analysis || typeof analysis.sectionFeedback !== "object" || analysis.sectionFeedback === null) return [];
  return Object.entries(analysis.sectionFeedback as Record<string, { score?: number | string | null; strengths?: string[] | null; issues?: string[] | null; suggestions?: string[] | null; }>).map(([sectionName, section]) => {
    const safeScore = readNumber(section?.score ?? null);
    return [sectionName, {
      score: safeScore,
      strengths: getArrayValue(section?.strengths),
      issues: getArrayValue(section?.issues),
      suggestions: getArrayValue(section?.suggestions),
    }];
  });
}

function getInterpretation(score: number | null): string {
  if (score === null) return "Awaiting evaluation";
  if (score >= 90) return "Excellent match";
  if (score >= 80) return "Strong candidate";
  if (score >= 70) return "Good fit with a few gaps";
  if (score >= 60) return "Fair match";
  if (score >= 45) return "Needs targeted improvements";
  return "High-priority revision recommended";
}

const scoreLabels: Array<{ key: string; label: string; value: number | null }> = [
  { key: "atsScore", label: "ATS compatibility", value: null },
  { key: "contentScore", label: "Content quality", value: null },
  { key: "experienceScore", label: "Experience", value: null },
  { key: "achievementScore", label: "Achievements", value: null },
  { key: "skillsScore", label: "Skills", value: null },
  { key: "educationScore", label: "Education", value: null },
  { key: "formattingScore", label: "Formatting", value: null },
  { key: "clarityScore", label: "Clarity", value: null },
  { key: "impactScore", label: "Impact", value: null },
];

function getCategoryScores(analysis: AnalysisRecord | null): Array<{ label: string; value: number; tone: string }> {
  if (!analysis) return [];

  const fallbackSectionScores = {
    experienceScore: readNumber(analysis.sectionFeedback?.experience?.score ?? null),
    achievementScore: readNumber(analysis.sectionFeedback?.experience?.score ?? null),
    skillsScore: readNumber(analysis.sectionFeedback?.skills?.score ?? null),
    educationScore: readNumber(analysis.sectionFeedback?.education?.score ?? null),
    formattingScore: readNumber(analysis.structureScore ?? (analysis.scores?.structureScore ?? null)),
    clarityScore: getScoreValue(analysis, "clarityScore"),
    impactScore: getScoreValue(analysis, "impactScore"),
    atsScore: getScoreValue(analysis, "atsScore"),
    contentScore: getScoreValue(analysis, "contentScore"),
  };

  const rows = scoreLabels.map((row) => {
    const value = row.key === "atsScore" ? getScoreValue(analysis, row.key)
      : row.key === "contentScore" ? getScoreValue(analysis, row.key)
      : row.key === "experienceScore" ? fallbackSectionScores.experienceScore
      : row.key === "achievementScore" ? fallbackSectionScores.achievementScore
      : row.key === "skillsScore" ? fallbackSectionScores.skillsScore
      : row.key === "educationScore" ? fallbackSectionScores.educationScore
      : row.key === "formattingScore" ? fallbackSectionScores.formattingScore
      : row.key === "clarityScore" ? fallbackSectionScores.clarityScore
      : row.key === "impactScore" ? fallbackSectionScores.impactScore
      : null;

    return {
      label: row.label,
      value: value ?? 0,
      tone: value === null || value === 0 ? "text-slate-500" : value >= 80 ? "text-emerald-700" : value >= 60 ? "text-amber-700" : "text-rose-700",
    };
  }).filter((row) => row.value > 0);

  return rows.length > 0 ? rows : [];
}

function getWarnings(analysis: AnalysisRecord | null): string[] {
  if (!analysis) return [];
  const explicitWarnings = getArrayValue((analysis as Record<string, unknown>).warnings);
  if (explicitWarnings.length > 0) return explicitWarnings;

  const sectionIssues = getSectionEntries(analysis)
    .flatMap(([, section]) => section.issues)
    .map((item) => item.trim())
    .filter(Boolean);

  return sectionIssues.length > 0 ? sectionIssues : getArrayValue((analysis as Record<string, unknown>).criticalIssues ?? analysis.detectedProblems ?? []);
}

function getSectionRecommendations(analysis: AnalysisRecord | null): string[] {
  if (!analysis) return [];
  const explicitSectionRecs = getArrayValue((analysis as Record<string, unknown>).sectionRecommendations);
  if (explicitSectionRecs.length > 0) return explicitSectionRecs;

  return getSectionEntries(analysis)
    .flatMap(([sectionName, section]) => section.suggestions.map((suggestion) => `${sectionName}: ${suggestion}`));
}

function getTargetRole(analysis: AnalysisRecord | null, resume: ResumeRecord | null): string {
  const fromAnalysis = typeof analysis?.jobTitle === "string" && analysis.jobTitle.trim() ? analysis.jobTitle.trim() : null;
  if (fromAnalysis) return fromAnalysis;
  const fromResume = typeof resume?.jobTitle === "string" && resume.jobTitle.trim() ? resume.jobTitle.trim() : null;
  if (fromResume) return fromResume;
  return "Target role";
}

export default async function AnalysisDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let uid = "";
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
      redirect(`/login?redirect=${encodeURIComponent(`/dashboard/analysis/${id}`)}`);
    }

    uid = (await verifyFirebaseSessionCookie(token)).uid;
  } catch {
    redirect(`/login?redirect=${encodeURIComponent(`/dashboard/analysis/${id}`)}`);
  }

  let resume: ResumeRecord | null = null;
  let analysis: AnalysisRecord | null = null;
  let previousAnalyses: AnalysisRecord[] = [];
  let loadState: "loading" | "completed" | "failed" | "missing-analysis" | "missing-resume" = "loading";

  try {
    const db = adminDb();
    const userResumesRef = db.collection("users").doc(uid).collection("resumes");
    const resumeSnapshot = await userResumesRef.get();

    for (const resumeDoc of resumeSnapshot.docs) {
      const resumeData = resumeDoc.data() as ResumeRecord;
      const [analysisSnapshot, legacySnapshot] = await Promise.all([
        resumeDoc.ref.collection("analyses").orderBy("createdAt", "desc").get(),
        resumeDoc.ref.collection("analysis").orderBy("createdAt", "desc").get(),
      ]);

      const combined = [...analysisSnapshot.docs, ...legacySnapshot.docs]
        .sort((a, b) => {
          const aTime = toDate(a.data().createdAt ?? null)?.getTime() ?? 0;
          const bTime = toDate(b.data().createdAt ?? null)?.getTime() ?? 0;
          return bTime - aTime;
        })
        .map((doc) => ({ id: doc.id, ...(doc.data() as AnalysisRecord) }));

      previousAnalyses = combined;

      const matchingAnalysis = combined.find((doc) => doc.id === id);
      if (matchingAnalysis) {
        resume = { id: resumeDoc.id, ...(resumeData as ResumeRecord) };
        analysis = matchingAnalysis;
        loadState = matchingAnalysis.status === "failed" || matchingAnalysis.status === "error" ? "failed" : "completed";
        break;
      }
    }

    if (!resume) {
      loadState = "missing-resume";
    } else if (!analysis) {
      loadState = "missing-analysis";
    }
  } catch (error) {
    console.error("[analysis-page] failed to load analysis:", error);
    loadState = "failed";
  }

  const overallScore = getScoreValue(analysis, "overallScore");
  const strengths = getArrayValue(analysis?.strengths ?? null);
  const criticalIssues = getArrayValue(analysis?.criticalIssues ?? analysis?.detectedProblems ?? null);
  const warnings = getWarnings(analysis);
  const sectionRecommendations = getSectionRecommendations(analysis);
  const missingKeywords = getArrayValue(analysis?.missingKeywords ?? null);
  const suggestedKeywords = getArrayValue(analysis?.suggestedKeywords ?? analysis?.matchedKeywords ?? null);
  const summaryFeedback = typeof analysis?.summary === "string" && analysis.summary.trim() ? analysis.summary.trim() : "No summary feedback is available for this analysis.";
  const targetRole = getTargetRole(analysis, resume);
  const scoreCards = getCategoryScores(analysis);
  const analysisRedirectPath = resume ? `/dashboard/resumes/${resume.id}` : "/dashboard/resumes";
  const diagnosticChecks = Array.isArray(analysis?.diagnostic)
    ? (analysis.diagnostic as Array<Record<string, unknown>>).filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    : [];
  const passedCheckCount = diagnosticChecks.filter((check) => {
    const status = String(check.status ?? "").toLowerCase();
    return ["pass", "strong", "good"].includes(status);
  }).length;
  const warningCheckCount = diagnosticChecks.filter((check) => {
    const status = String(check.status ?? "").toLowerCase();
    return ["partial", "review", "needs_improvement"].includes(status);
  }).length;
  const issueCheckCount = diagnosticChecks.filter((check) => {
    const status = String(check.status ?? "").toLowerCase();
    return ["weak", "critical"].includes(status);
  }).length;

  const renderFallbackCard = (title: string, description: string, actionLabel: string, actionHref: string) => (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Analysis</p>
        <Badge variant="outline">{id}</Badge>
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-600"><ShieldAlert className="h-5 w-5" /></div>
            <CardTitle>{title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-6 text-slate-600">{description}</p>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href={actionHref}><ArrowLeft className="mr-2 h-4 w-4" />{actionLabel}</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  if (loadState === "missing-resume") {
    return renderFallbackCard("Missing resume", "This resume is no longer available in your workspace, so the analysis cannot be shown.", "Back to resumes", "/dashboard/resumes");
  }

  if (loadState === "missing-analysis") {
    return renderFallbackCard("Missing analysis", "The analysis for this resume is not available in your account yet, or it may have been removed.", "Back to resume", analysisRedirectPath);
  }

  if (loadState === "failed") {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Analysis</p>
          <Badge variant="outline">{id}</Badge>
        </div>
        <Card className="border-rose-200 bg-rose-50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-rose-100 text-rose-700"><AlertTriangle className="h-5 w-5" /></div>
              <CardTitle className="text-rose-900">Analysis failed</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-6 text-rose-800">This analysis could not be completed, and we are not showing any internal errors or provider details.</p>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href={analysisRedirectPath}><RefreshCcw className="mr-2 h-4 w-4" />Retry this resume</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/dashboard/resumes/new">Upload a new resume</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!analysis) {
    return renderFallbackCard("Loading analysis", "Your results are being prepared from the saved Firestore record. This should resolve shortly.", "Back to resume", analysisRedirectPath);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Analysis</p>
            <Badge variant="outline">{analysis.id ?? id}</Badge>
          </div>
          <h2 className="mt-2 text-3xl font-semibold text-slate-900">Career intelligence report</h2>
          <p className="mt-1 text-sm text-slate-500">{targetRole} • {resume?.fileName ?? "Resume"} • {formatDate(analysis.createdAt ?? resume?.createdAt ?? null)}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" asChild>
            <Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" />Dashboard</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/resumes">Resumes</Link>
          </Button>
          {resume?.downloadURL ? (
            <Button variant="secondary" asChild>
              <Link href={resume.downloadURL} target="_blank" rel="noreferrer"><Download className="mr-2 h-4 w-4" />Original resume</Link>
            </Button>
          ) : null}
        </div>
      </div>

      <section className="surface overflow-hidden p-6 md:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Executive summary</p>
            <h3 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-slate-900">{targetRole}</h3>
            <p className="mt-3 max-w-xl text-base leading-7 text-slate-600">{summaryFeedback}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">Web report</Badge>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#f5f1e8,#ffffff)] p-6 shadow-[0_18px_40px_rgba(23,20,18,0.06)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Overall score</p>
                <div className="mt-3 flex items-end gap-2">
                  <span className="text-5xl font-semibold tracking-[-0.06em] text-slate-900">{overallScore ?? "—"}</span>
                  <span className="pb-2 text-sm text-slate-500">/ 100</span>
                </div>
              </div>
              <div className="grid h-20 w-20 place-items-center rounded-full border-[8px] border-emerald-200 bg-white text-xl font-semibold text-emerald-700">
                {overallScore ?? 0}
              </div>
            </div>
            <p className="mt-4 text-sm font-medium text-slate-700">{getInterpretation(overallScore)}</p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-[linear-gradient(90deg,#a9eb3e,#d5ff6a)]" style={{ width: `${overallScore !== null ? Math.min(Math.max(overallScore, 0), 100) : 0}%` }} />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 text-emerald-700"><CheckCircle2 className="h-5 w-5" /></div>
              <CardTitle className="text-base">Strengths</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-slate-900">{strengths.length}</div>
            <p className="mt-2 text-sm text-slate-500">Resume highlights currently supporting your application.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-rose-100 text-rose-700"><AlertTriangle className="h-5 w-5" /></div>
              <CardTitle className="text-base">Critical issues</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-slate-900">{criticalIssues.length}</div>
            <p className="mt-2 text-sm text-slate-500">Priority blockers that could reduce screening success.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-sky-100 text-sky-700"><CheckCircle2 className="h-5 w-5" /></div>
              <CardTitle className="text-base">Keyword gaps</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-slate-900">{missingKeywords.length}</div>
            <p className="mt-2 text-sm text-slate-500">Target-role keywords still missing from the resume content.</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {scoreCards.map((scoreCard) => (
          <Card key={scoreCard.label}>
            <CardHeader>
              <CardTitle className="text-base font-medium">{scoreCard.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className={`text-2xl font-semibold ${scoreCard.tone}`}>{scoreCard.value}</span>
                <span className="text-xs text-slate-500">/ 100</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full rounded-full bg-slate-900" style={{ width: `${Math.min(Math.max(scoreCard.value, 0), 100)}%` }} />
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Executive summary</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm leading-7 text-slate-700">{summaryFeedback}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>30+ Resume checks</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {diagnosticChecks.length > 0 ? (
                <>
                  <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 pb-3">
                    <div className="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-white">{diagnosticChecks.length} checks</div>
                    <div className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">{passedCheckCount} passed</div>
                    <div className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">{warningCheckCount} warnings</div>
                    <div className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700">{issueCheckCount} issues</div>
                  </div>
                  <ul className="analysis-list">
                    {diagnosticChecks.map((check, index) => (
                      <ResumeCheck key={String(check.id ?? check.title ?? check.name ?? `diagnostic-check-${index}`)} check={check as Record<string, unknown>} />
                    ))}
                  </ul>
                </>
              ) : (
                <p className="text-sm text-slate-500">No structured resume checks are available for this analysis yet.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Strengths</CardTitle></CardHeader>
            <CardContent>
              {strengths.length > 0 ? (
                <ul className="analysis-list text-sm leading-6 text-slate-700">
                  {strengths.map((item) => <li key={item} className="analysis-item"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><span>{item}</span></li>)}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">No strengths were captured in this persisted analysis.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Critical issues</CardTitle></CardHeader>
            <CardContent>
              {criticalIssues.length > 0 ? (
                <ul className="analysis-list text-sm leading-6 text-rose-700">
                  {criticalIssues.map((item) => <li key={item} className="analysis-item"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" /><span>{item}</span></li>)}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">No critical issues were flagged in the persisted evaluation.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Recommended action plan</CardTitle></CardHeader>
            <CardContent>
              {sectionRecommendations.length > 0 ? (
                <ul className="analysis-list text-sm leading-6 text-slate-700">
                  {sectionRecommendations.map((item) => <li key={item} className="analysis-item"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><span>{item}</span></li>)}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">No section-level recommendations were captured.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Warnings</CardTitle></CardHeader>
            <CardContent>
              {warnings.length > 0 ? (
                <ul className="analysis-list text-sm leading-6 text-amber-700">
                  {warnings.map((item) => <li key={item} className="analysis-item"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" /><span>{item}</span></li>)}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">No warnings were captured in the persisted analysis record.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Missing keywords</CardTitle></CardHeader>
          <CardContent>
            {missingKeywords.length > 0 ? (
              <ul className="analysis-list text-sm leading-6 text-rose-700">{missingKeywords.map((item) => <li key={item} className="analysis-item"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" /><span>{item}</span></li>)}</ul>
            ) : (
              <p className="text-sm text-slate-500">No missing keywords were flagged in the persisted analysis.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Suggested keywords</CardTitle></CardHeader>
          <CardContent>
            {suggestedKeywords.length > 0 ? (
              <ul className="analysis-list text-sm leading-6 text-emerald-700">{suggestedKeywords.map((item) => <li key={item} className="analysis-item"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><span>{item}</span></li>)}</ul>
            ) : (
              <p className="text-sm text-slate-500">No suggested keywords were captured.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Section feedback</CardTitle></CardHeader>
        <CardContent>
          {getSectionEntries(analysis).length > 0 ? (
            <div className="space-y-4">
              {getSectionEntries(analysis).map(([sectionName, section]) => (
                <div key={sectionName} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-base font-semibold capitalize text-slate-900">{sectionName}</h3>
                    {section.score !== null && section.score !== undefined ? <span className="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-medium text-white">{section.score}/100</span> : null}
                  </div>

                  {section.strengths.length > 0 ? (
                    <div className="mt-3">
                      <p className="text-sm font-medium text-slate-700">Strengths</p>
                      <ul className="analysis-list mt-2 text-sm leading-6 text-slate-600">{section.strengths.map((item) => <li key={`${sectionName}-strength-${item}`} className="analysis-item"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><span>{item}</span></li>)}</ul>
                    </div>
                  ) : null}

                  {section.issues.length > 0 ? (
                    <div className="mt-3">
                      <p className="text-sm font-medium text-slate-700">Issues</p>
                      <ul className="analysis-list mt-2 text-sm leading-6 text-slate-600">{section.issues.map((item) => <li key={`${sectionName}-issue-${item}`} className="analysis-item"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" /><span>{item}</span></li>)}</ul>
                    </div>
                  ) : null}

                  {section.suggestions.length > 0 ? (
                    <div className="mt-3">
                      <p className="text-sm font-medium text-slate-700">Suggestions</p>
                      <ul className="analysis-list mt-2 text-sm leading-6 text-slate-600">{section.suggestions.map((item) => <li key={`${sectionName}-suggestion-${item}`} className="analysis-item"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><span>{item}</span></li>)}</ul>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No section feedback was found in the stored analysis.</p>
          )}
        </CardContent>
      </Card>

      {previousAnalyses.length > 1 ? (
        <Card>
          <CardHeader><CardTitle>Previous analyses</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {previousAnalyses.map((previousAnalysis) => (
                <li key={previousAnalysis.id ?? `analysis-${formatDate(previousAnalysis.createdAt)}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{getScoreValue(previousAnalysis, "overallScore") !== null ? `${getScoreValue(previousAnalysis, "overallScore")}/100` : "Pending"}</p>
                      {previousAnalysis.jobTitle ? <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{previousAnalysis.jobTitle}</p> : null}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>{formatDate(previousAnalysis.createdAt)}</span>
                      {previousAnalysis.id !== analysis.id ? (
                        <Button variant="outline" asChild size="sm">
                          <Link href={`/dashboard/analysis/${previousAnalysis.id}`}>Open</Link>
                        </Button>
                      ) : (
                        <Badge variant="success">Current</Badge>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
