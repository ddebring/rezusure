import Link from "next/link";
import { cookies } from "next/headers";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SESSION_COOKIE_NAME } from "@/lib/auth/types";
import { verifyFirebaseSessionCookie } from "@/lib/auth/verify-id-token";
import { adminDb } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Resume", robots: { index: false, follow: false } };

type FirestoreTimestampLike = {
  _seconds: number;
  _nanoseconds?: number;
};

type ResumeRecord = {
  userId?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  storagePath?: string;
  downloadURL?: string;
  jobTitle?: string | null;
  jobDescription?: string | null;
  status?: string;
  createdAt?: FirestoreTimestampLike | Date | string | null;
  updatedAt?: FirestoreTimestampLike | Date | string | null;
  extractedText?: string | null;
  latestAnalysisId?: string | null;
};

type AnalysisRecord = {
  id?: string;
  userId?: string;
  resumeId?: string;
  jobTitle?: string | null;
  jobDescription?: string | null;
  overallScore?: number;
  atsScore?: number;
  contentScore?: number;
  structureScore?: number;
  impactScore?: number;
  clarityScore?: number;
  scores?: Record<string, number>;
  summary?: string;
  strengths?: string[];
  detectedProblems?: string[];
  recommendations?: string[];
  matchedKeywords?: string[];
  missingKeywords?: string[];
  sectionFeedback?: Record<string, {
    score?: number;
    strengths?: string[];
    issues?: string[];
    suggestions?: string[];
  }>;
  createdAt?: FirestoreTimestampLike | Date | string | null;
  model?: {
    provider?: string;
    model?: string;
    schemaVersion?: string;
    analyzedAt?: string;
  };
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
    const timestamp = value as FirestoreTimestampLike;
    return new Date(timestamp._seconds * 1000 + ((timestamp._nanoseconds ?? 0) / 1_000_000));
  }
  return null;
}

function formatDate(value: unknown): string {
  const date = toDate(value);
  if (!date) return "Unknown date";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getStatusLabel(status?: string): string {
  const normalized = (status ?? "pending").toLowerCase();

  switch (normalized) {
    case "completed":
      return "Completed";
    case "uploaded":
      return "Uploaded";
    case "pending":
      return "Analysis pending";
    case "failed":
      return "Failed";
    default:
      return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }
}

function getAnalysisValue(analysis: AnalysisRecord | null, key: string): unknown {
  if (!analysis) return null;
  const direct = (analysis as Record<string, unknown>)[key];
  if (direct !== undefined) return direct;
  const nested = (analysis.scores as Record<string, unknown> | undefined)?.[key];
  return nested ?? null;
}

function getScoreValue(analysis: AnalysisRecord | null, key: string): number | null {
  const direct = getAnalysisValue(analysis, key);
  return typeof direct === "number" ? direct : null;
}

export default async function ResumeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let uid: string;
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
      redirect(`/login?redirect=${encodeURIComponent(`/dashboard/resumes/${id}`)}`);
    }

    const decoded = await verifyFirebaseSessionCookie(token);
    uid = decoded.uid;
  } catch {
    redirect(`/login?redirect=${encodeURIComponent(`/dashboard/resumes/${id}`)}`);
  }

  let resumeRecord: ResumeRecord | null = null;
  let analysisHistory: AnalysisRecord[] = [];
  let latestAnalysis: AnalysisRecord | null = null;

  try {
    const db = adminDb();
    const resumeRef = db.collection("users").doc(uid).collection("resumes").doc(id);
    const resumeSnapshot = await resumeRef.get();

    if (!resumeSnapshot.exists) notFound();

    const data = resumeSnapshot.data() as ResumeRecord | undefined;
    if (!data || data.userId !== uid) notFound();

    resumeRecord = data;

    const [analysisSnapshot, legacySnapshot] = await Promise.all([
      resumeRef.collection("analyses").orderBy("createdAt", "desc").get(),
      resumeRef.collection("analysis").orderBy("createdAt", "desc").get(),
    ]);

    const mergedHistory = [...analysisSnapshot.docs, ...legacySnapshot.docs]
      .sort((a, b) => {
        const aDate = toDate(a.data().createdAt ?? null)?.getTime() ?? 0;
        const bDate = toDate(b.data().createdAt ?? null)?.getTime() ?? 0;
        return bDate - aDate;
      })
      .map((doc) => ({ id: doc.id, ...(doc.data() as AnalysisRecord) }));

    analysisHistory = mergedHistory;
    latestAnalysis = mergedHistory.find((analysis) => analysis.id === resumeRecord?.latestAnalysisId) ?? mergedHistory[0] ?? null;
  } catch (error) {
    console.error("[resume-detail] failed to load resume", error);
    return <div className="space-y-6"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Resume</p><h2 className="mt-2 text-2xl font-semibold">Unable to load resume</h2></div><Card><CardHeader><CardTitle>We hit a problem</CardTitle></CardHeader><CardContent><p className="text-sm text-slate-500">The resume data could not be loaded right now. Please try again in a moment.</p></CardContent></Card></div>;
  }

  const fileName = resumeRecord?.fileName ?? "Untitled resume";
  const creationDate = formatDate(resumeRecord?.createdAt ?? null);
  const parsedText = typeof resumeRecord?.extractedText === "string" ? resumeRecord.extractedText.trim() : "";
  const status = resumeRecord?.status ?? "pending";
  const analysisStatus = latestAnalysis ? "Completed" : "Analysis pending";

  const overallScore = getScoreValue(latestAnalysis, "overallScore");
  const criticalIssues = Array.isArray(getAnalysisValue(latestAnalysis, "detectedProblems"))
    ? (getAnalysisValue(latestAnalysis, "detectedProblems") as string[])
    : (Array.isArray(getAnalysisValue(latestAnalysis, "criticalIssues")) ? getAnalysisValue(latestAnalysis, "criticalIssues") as string[] : []);
  const recommendations = Array.isArray(getAnalysisValue(latestAnalysis, "recommendations"))
    ? (getAnalysisValue(latestAnalysis, "recommendations") as string[])
    : [];
  const strengths = Array.isArray(getAnalysisValue(latestAnalysis, "strengths"))
    ? (getAnalysisValue(latestAnalysis, "strengths") as string[])
    : [];
  const sectionEntries = latestAnalysis && typeof latestAnalysis.sectionFeedback === "object"
    ? Object.entries(latestAnalysis.sectionFeedback as Record<string, { score?: number; suggestions?: string[]; issues?: string[]; strengths?: string[] }>)
    : [];

  return <div className="space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Resume</p>
        <h2 className="mt-2 text-2xl font-semibold">{fileName}</h2>
        <p className="mt-1 text-sm text-slate-500">{resumeRecord?.jobTitle ?? "Resume document"}</p>
      </div>
      <Button variant="outline" asChild>
        <Link href="/dashboard/resumes">Back to resumes</Link>
      </Button>
    </div>

    <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
      <Card>
        <CardHeader>
          <CardTitle>Resume details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Filename</p>
              <p className="mt-2 text-base font-medium text-slate-900">{fileName}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Created</p>
              <p className="mt-2 text-base font-medium text-slate-900">{creationDate}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Status</p>
              <p className="mt-2 text-base font-medium text-slate-900">{getStatusLabel(status)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Current analysis</p>
              <p className="mt-2 text-base font-medium text-slate-900">{analysisStatus}</p>
            </div>
          </div>

          {latestAnalysis ? (
            <>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-emerald-700">Resume score</p>
                    <p className="mt-2 text-3xl font-semibold text-emerald-900">{overallScore ?? "N/A"}</p>
                  </div>
                  <div className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-800">
                    {overallScore !== null ? `${overallScore}/100` : "Pending"}
                  </div>
                </div>
                {resumeRecord?.latestAnalysisId ? (
                  <div className="mt-4">
                    <Button asChild size="sm">
                      <Link href={`/dashboard/analysis/${resumeRecord.latestAnalysisId}`}>View analysis results</Link>
                    </Button>
                  </div>
                ) : null}
              </div>

              {latestAnalysis.scores ? (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-slate-900">Section scores</h3>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {Object.entries(latestAnalysis.scores).map(([label, value]) => (
                      <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="flex items-center justify-between gap-2 text-sm text-slate-500">
                          <span className="capitalize">{label}</span>
                          <span className="font-semibold text-slate-900">{value}</span>
                        </div>
                        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200">
                          <div className="h-full rounded-full bg-slate-900" style={{ width: `${Math.min(Math.max(Number(value), 0), 100)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {latestAnalysis.summary ? <div className="space-y-2"><h3 className="text-lg font-semibold text-slate-900">Summary</h3><p className="text-sm leading-6 text-slate-600">{latestAnalysis.summary}</p></div> : null}

              {strengths.length > 0 ? <div className="space-y-2"><h3 className="text-lg font-semibold text-slate-900">Strengths</h3><ul className="analysis-list text-sm leading-6 text-slate-600">{strengths.map((item) => <li key={item} className="analysis-item"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><span>{item}</span></li>)}</ul></div> : null}

              {criticalIssues.length > 0 ? <div className="space-y-2"><h3 className="text-lg font-semibold text-slate-900">Detected problems</h3><ul className="analysis-list text-sm leading-6 text-slate-600">{criticalIssues.map((item) => <li key={item} className="analysis-item"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" /><span>{item}</span></li>)}</ul></div> : null}

              {recommendations.length > 0 ? <div className="space-y-2"><h3 className="text-lg font-semibold text-slate-900">Recommendations</h3><ul className="analysis-list text-sm leading-6 text-slate-600">{recommendations.map((item) => <li key={item} className="analysis-item"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><span>{item}</span></li>)}</ul></div> : null}

              {sectionEntries.length > 0 ? <div className="space-y-4"><h3 className="text-lg font-semibold text-slate-900">Section feedback</h3>{sectionEntries.map(([sectionName, section]) => <div key={sectionName} className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-center justify-between gap-3"><h4 className="text-base font-semibold capitalize text-slate-900">{sectionName}</h4>{typeof section.score === "number" ? <span className="rounded-full bg-slate-900 px-2 py-1 text-xs font-medium text-white">{section.score}/100</span> : null}</div>{section.strengths && section.strengths.length > 0 ? <div className="mt-3"><p className="text-sm font-medium text-slate-700">Strengths</p><ul className="analysis-list mt-2 text-sm leading-6 text-slate-600">{section.strengths.map((item) => <li key={item} className="analysis-item"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><span>{item}</span></li>)}</ul></div> : null}{section.issues && section.issues.length > 0 ? <div className="mt-3"><p className="text-sm font-medium text-slate-700">Issues</p><ul className="analysis-list mt-2 text-sm leading-6 text-slate-600">{section.issues.map((item) => <li key={item} className="analysis-item"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" /><span>{item}</span></li>)}</ul></div> : null}{section.suggestions && section.suggestions.length > 0 ? <div className="mt-3"><p className="text-sm font-medium text-slate-700">Suggestions</p><ul className="analysis-list mt-2 text-sm leading-6 text-slate-600">{section.suggestions.map((item) => <li key={item} className="analysis-item"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><span>{item}</span></li>)}</ul></div> : null}</div>)}</div> : null}
            </>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-semibold">Analysis pending</p>
              <p className="mt-2 text-amber-800">This resume has been uploaded but has not yet produced a completed analysis.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Resume content</CardTitle>
          </CardHeader>
          <CardContent>
            {parsedText ? <pre className="max-h-[28rem] overflow-auto whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{parsedText}</pre> : <p className="text-sm text-slate-500">No parsed resume text is available yet.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Analysis history</CardTitle>
          </CardHeader>
          <CardContent>
            {analysisHistory.length > 0 ? <ul className="space-y-3">{analysisHistory.map((analysis) => <li key={analysis.id ?? `analysis-${formatDate(analysis.createdAt)}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="flex items-center justify-between gap-3"><span className="text-sm font-medium text-slate-900">{typeof getScoreValue(analysis, "overallScore") === "number" ? `${getScoreValue(analysis, "overallScore")}/100` : "Pending score"}</span><span className="text-xs text-slate-500">{formatDate(analysis.createdAt)}</span></div>{analysis.jobTitle ? <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500">{analysis.jobTitle}</p> : null}{analysis.summary ? <p className="mt-2 text-sm leading-6 text-slate-600">{analysis.summary}</p> : null}</li>)}</ul> : <p className="text-sm text-slate-500">No previous analyses are available for this resume yet.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  </div>;
}
