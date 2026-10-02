import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowRight, FileText, Gauge, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SESSION_COOKIE_NAME } from "@/lib/auth/types";
import { getUserDashboardSummary } from "@/lib/auth/user-summary";
import { verifyFirebaseSessionCookie } from "@/lib/auth/verify-id-token";
import { adminDb } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard", robots: { index: false, follow: false } };

type FirestoreTimestampLike = {
  _seconds: number;
  _nanoseconds?: number;
};

type ResumeRecord = {
  id?: string;
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
  latestAnalysisId?: string | null;
};

type DashboardOverviewData = {
  summary: Awaited<ReturnType<typeof getUserDashboardSummary>>;
  latestResume: ResumeRecord | null;
  score: number | null;
  latestAction: string;
  analysisCount: number;
  totalResumeCount: number;
};

function toDate(value: unknown): Date | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

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
  if (!date) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

async function requireDashboardUid(): Promise<string> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    redirect(`/login?redirect=${encodeURIComponent("/dashboard")}`);
  }

  try {
    const decoded = await verifyFirebaseSessionCookie(token);
    return decoded.uid;
  } catch {
    redirect(`/login?redirect=${encodeURIComponent("/dashboard")}`);
  }
}

async function getDashboardOverviewData(uid: string): Promise<DashboardOverviewData> {
  const db = adminDb();
  const userResumesRef = db.collection("users").doc(uid).collection("resumes");
  const summary = await getUserDashboardSummary(uid);

  let latestResume: ResumeRecord | null = null;

  if (summary?.latestResumeId) {
    const latestResumeSnapshot = await userResumesRef.doc(summary.latestResumeId).get();
    if (latestResumeSnapshot.exists) {
      latestResume = { id: latestResumeSnapshot.id, ...(latestResumeSnapshot.data() as ResumeRecord) };
    }
  }

  if (!latestResume) {
    const newestResumeSnapshot = await userResumesRef.orderBy("updatedAt", "desc").limit(1).get();
    if (!newestResumeSnapshot.empty) {
      latestResume = { id: newestResumeSnapshot.docs[0].id, ...(newestResumeSnapshot.docs[0].data() as ResumeRecord) };
    }
  }

  const score = summary?.latestScore ?? null;
  const latestAction = summary?.latestAction ?? (latestResume ? `Uploaded ${latestResume.fileName || "resume"}` : "Upload a resume to create your first analysis");

  return {
    summary,
    latestResume,
    score,
    latestAction,
    analysisCount: summary?.analysisCount ?? 0,
    totalResumeCount: summary?.resumeCount ?? 0,
  };
}

function OverviewCardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-56 lg:col-span-2" />
        <Skeleton className="h-56" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
      </div>
    </div>
  );
}

function RecentResumesSkeleton() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="space-y-3 p-5">
        {[0, 1, 2, 3].map((item) => (
          <Skeleton key={item} className="h-12 w-full" />
        ))}
      </div>
    </section>
  );
}

function LatestResumeCard({ latestResume }: { latestResume: ResumeRecord | null }) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Your workspace</p>
            <CardTitle className="mt-2 text-2xl">{latestResume ? "Latest resume" : "Start with your latest resume."}</CardTitle>
          </div>
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-slate-100">
            <Sparkles className="h-5 w-5" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="max-w-2xl text-sm leading-6 text-slate-600">
          {latestResume
            ? `${latestResume.fileName ?? "Resume"} was last updated on ${formatDate(latestResume.updatedAt ?? latestResume.createdAt ?? null)}.`
            : "Your saved analyses, scores, and recommendations will appear here once a resume is added."}
        </p>
        <Button className="mt-5" asChild>
          <Link href="/dashboard/resumes/new">
            Analyze a resume <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function UsageCard({ analysisCount }: { analysisCount: number }) {
  return (
    <Card>
      <CardHeader><CardTitle>Usage</CardTitle></CardHeader>
      <CardContent>
        <div className="flex items-end justify-between">
          <span className="text-3xl font-semibold">{analysisCount}</span>
          <span className="text-sm text-slate-500">analyses stored</span>
        </div>
        <div className="mt-4 h-2 rounded-full bg-slate-100">
          <div className="h-2 rounded-full bg-slate-900" style={{ width: `${Math.min((analysisCount / Math.max(analysisCount || 1, 1)) * 100, 100)}%` }} />
        </div>
        <p className="mt-3 text-sm text-slate-500">Derived from persisted analysis records for your authenticated account.</p>
      </CardContent>
    </Card>
  );
}

function ResumeScoreCard({ score }: { score: number | null }) {
  return (
    <Card>
      <CardHeader><Gauge className="h-5 w-5" /><CardTitle className="mt-3">Resume score</CardTitle></CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold text-slate-900">{score !== null ? `${score}/100` : "No analysis yet"}</p>
      </CardContent>
    </Card>
  );
}

function SavedResumesCard({ totalResumeCount }: { totalResumeCount: number }) {
  return (
    <Card>
      <CardHeader><FileText className="h-5 w-5" /><CardTitle className="mt-3">Saved resumes</CardTitle></CardHeader>
      <CardContent><p className="text-3xl font-semibold">{totalResumeCount}</p></CardContent>
    </Card>
  );
}

function LatestActionCard({ latestAction }: { latestAction: string }) {
  return (
    <Card>
      <CardHeader><Sparkles className="h-5 w-5" /><CardTitle className="mt-3">Latest action</CardTitle></CardHeader>
      <CardContent><p className="text-sm text-slate-700">{latestAction}</p></CardContent>
    </Card>
  );
}

function renderOverviewCards({ latestResume, score, latestAction, analysisCount, totalResumeCount }: {
  latestResume: ResumeRecord | null;
  score: number | null;
  latestAction: string;
  analysisCount: number;
  totalResumeCount: number;
}) {
  return (
    <>
      <section className="grid gap-4 lg:grid-cols-3">
        <LatestResumeCard latestResume={latestResume} />
        <UsageCard analysisCount={analysisCount} />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <ResumeScoreCard score={score} />
        <SavedResumesCard totalResumeCount={totalResumeCount} />
        <LatestActionCard latestAction={latestAction} />
      </section>
    </>
  );
}

function renderOverviewCardsFallback() {
  return (
    <section className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-3">
        <CardHeader><CardTitle>Dashboard summary unavailable</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">We couldn’t load one of the dashboard summary sections right now.</p>
        </CardContent>
      </Card>
    </section>
  );
}

async function DashboardOverviewCards({ uid }: { uid: string }) {
  let data: Awaited<ReturnType<typeof getDashboardOverviewData>> | null = null;

  try {
    data = await getDashboardOverviewData(uid);
  } catch (error) {
    console.error("[dashboard] overview cards failed to load", error);
    return renderOverviewCardsFallback();
  }

  return renderOverviewCards({
    latestResume: data.latestResume,
    score: data.score,
    latestAction: data.latestAction,
    analysisCount: data.analysisCount,
    totalResumeCount: data.totalResumeCount,
  });
}

function renderRecentResumesTable(resumes: ResumeRecord[]) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <h3 className="text-lg font-semibold text-slate-900">Recent resumes</h3>
        <Button variant="outline" asChild>
          <Link href="/dashboard/resumes">View all</Link>
        </Button>
      </div>

      {resumes.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-5 py-3 font-medium">Resume</th>
                <th className="px-5 py-3 font-medium">Updated</th>
                <th className="px-5 py-3 font-medium">Latest score</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {resumes.map((resume) => (
                <tr key={resume.id} className="border-t border-slate-200">
                  <td className="px-5 py-4 text-slate-900">
                    <Link href={`/dashboard/resumes/${resume.id}`} className="font-medium hover:text-slate-600">
                      {resume.fileName ?? "Untitled resume"}
                    </Link>
                  </td>
                  <td className="px-5 py-4 text-slate-600">{formatDate(resume.updatedAt ?? resume.createdAt ?? null)}</td>
                  <td className="px-5 py-4 text-slate-900">
                    {resume.latestAnalysisId ? (
                      <Link href={`/dashboard/analysis/${resume.latestAnalysisId}`} className="font-medium text-slate-900 hover:text-slate-600">
                        See details
                      </Link>
                    ) : (
                      "Pending"
                    )}
                  </td>
                  <td className="px-5 py-4 text-slate-600">{resume.status ?? "Uploaded"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="px-5 py-10 text-center text-sm text-slate-500">No resumes have been saved for this account yet.</div>
      )}
    </section>
  );
}

function renderRecentResumesFallback() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <h3 className="text-lg font-semibold text-slate-900">Recent resumes</h3>
      </div>
      <div className="px-5 py-10 text-sm text-slate-600">We couldn’t load your recent resumes right now.</div>
    </section>
  );
}

async function RecentResumesTable({ uid }: { uid: string }) {
  let resumes: ResumeRecord[] = [];

  try {
    const db = adminDb();
    const userResumesRef = db.collection("users").doc(uid).collection("resumes");
    const snapshot = await userResumesRef.orderBy("updatedAt", "desc").limit(5).get();
    resumes = snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as ResumeRecord) }));
  } catch (error) {
    console.error("[dashboard] recent resumes failed to load", error);
    return renderRecentResumesFallback();
  }

  return renderRecentResumesTable(resumes);
}

export default async function DashboardPage() {
  const uid = await requireDashboardUid();

  return (
    <div className="space-y-6">
      <Suspense fallback={<OverviewCardSkeleton />}>
        <DashboardOverviewCards uid={uid} />
      </Suspense>

      <Suspense fallback={<RecentResumesSkeleton />}>
        <RecentResumesTable uid={uid} />
      </Suspense>
    </div>
  );
}
