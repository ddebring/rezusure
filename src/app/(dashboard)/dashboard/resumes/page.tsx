import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SESSION_COOKIE_NAME } from "@/lib/auth/types";
import { verifyFirebaseSessionCookie } from "@/lib/auth/verify-id-token";
import { adminDb } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Resumes", robots: { index: false, follow: false } };

type FirestoreTimestampLike = { _seconds: number; _nanoseconds?: number };

type ResumeRecord = {
  id?: string;
  fileName?: string;
  status?: string;
  latestAnalysisId?: string | null;
  createdAt?: FirestoreTimestampLike | Date | string | null;
  updatedAt?: FirestoreTimestampLike | Date | string | null;
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
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

export default async function ResumesPage() {
  let resumes: ResumeRecord[] = [];

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
      redirect(`/login?redirect=${encodeURIComponent("/dashboard/resumes")}`);
    }

    let uid: string;
    try {
      uid = (await verifyFirebaseSessionCookie(token)).uid;
    } catch {
      redirect(`/login?redirect=${encodeURIComponent("/dashboard/resumes")}`);
    }
    const db = adminDb();
    const snapshot = await db.collection("users").doc(uid).collection("resumes").orderBy("updatedAt", "desc").get();
    resumes = snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as ResumeRecord) }));
  } catch (error) {
    console.error("[resumes-page] failed to load user resumes", error);
  }

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-semibold">Resumes</h2>
          <p className="mt-1 text-sm text-slate-500">Saved resume files and their latest analysis status.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/resumes/new"><Plus className="h-4 w-4" /> New resume</Link>
        </Button>
      </div>

      {resumes.length > 0 ? (
        <Card className="mt-6">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-5 py-3 font-medium">Resume</th>
                    <th className="px-5 py-3 font-medium">Updated</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {resumes.map((resume) => (
                    <tr key={resume.id} className="border-t border-slate-200">
                      <td className="px-5 py-4">
                        <Link href={`/dashboard/resumes/${resume.id}`} className="font-medium text-slate-900 hover:text-slate-600">
                          {resume.fileName ?? "Untitled resume"}
                        </Link>
                      </td>
                      <td className="px-5 py-4 text-slate-600">{formatDate(resume.updatedAt ?? resume.createdAt ?? null)}</td>
                      <td className="px-5 py-4 text-slate-600">{resume.status ?? "Uploaded"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="mt-6">
          <CardContent className="grid min-h-80 place-items-center py-16 text-center">
            <div>
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-slate-100"><FileText className="h-5 w-5 text-slate-500" /></div>
              <h3 className="mt-4 font-semibold">No resumes yet</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">Your resume library will be populated after you upload and analyze a document.</p>
              <Button className="mt-5" variant="outline" asChild><Link href="/dashboard/resumes/new">Upload a resume</Link></Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
