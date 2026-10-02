type FirestoreTimestampLike = { _seconds: number; _nanoseconds?: number };

type ResumeRecord = Record<string, unknown> & { id?: string; fileName?: string | null; jobTitle?: string | null; extractedText?: string | null; createdAt?: FirestoreTimestampLike | Date | string | null; };
type AnalysisRecord = Record<string, unknown> & { id?: string; jobTitle?: string | null; summary?: string | null; strengths?: string[] | null; criticalIssues?: string[] | null; detectedProblems?: string[] | null; recommendations?: string[] | null; warnings?: string[] | null; missingKeywords?: string[] | null; suggestedKeywords?: string[] | null; matchedKeywords?: string[] | null; sectionFeedback?: Record<string, { score?: number | string | null; strengths?: string[] | null; issues?: string[] | null; suggestions?: string[] | null } | null> | null; createdAt?: FirestoreTimestampLike | Date | string | null; };

export type DownloadAnalysisBundle = {
  resume: ResumeRecord;
  analysis: AnalysisRecord;
  title: string;
  targetRole: string;
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

function getArrayValue(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

export async function loadOwnedAnalysisForUser(uid: string, analysisId: string) {
  const { adminDb } = await import("@/lib/firebase/admin");
  const db = adminDb();
  const resumeSnapshot = await db.collection("users").doc(uid).collection("resumes").get();

  for (const resumeDoc of resumeSnapshot.docs) {
    const resumeData = resumeDoc.data() as ResumeRecord;
    const [analysisSnapshot, legacySnapshot] = await Promise.all([
      resumeDoc.ref.collection("analyses").orderBy("createdAt", "desc").get(),
      resumeDoc.ref.collection("analysis").orderBy("createdAt", "desc").get(),
    ]);

    const combined = [...analysisSnapshot.docs, ...legacySnapshot.docs]
      .map((doc) => ({ id: doc.id, ...(doc.data() as AnalysisRecord) }))
      .sort((a, b) => {
        const aTime = toDate((a as Record<string, unknown>).createdAt ?? null)?.getTime() ?? 0;
        const bTime = toDate((b as Record<string, unknown>).createdAt ?? null)?.getTime() ?? 0;
        return bTime - aTime;
      });

    const match = combined.find((doc) => doc.id === analysisId);
    if (match) {
      const resume = { id: resumeDoc.id, ...resumeData } as ResumeRecord;
      const analysis = match as AnalysisRecord;
      const targetRole = typeof analysis.jobTitle === "string" && analysis.jobTitle.trim()
        ? analysis.jobTitle.trim()
        : typeof resume.jobTitle === "string" && resume.jobTitle.trim()
          ? resume.jobTitle.trim()
          : "Target role";

      const title = typeof analysis.jobTitle === "string" && analysis.jobTitle.trim()
        ? analysis.jobTitle.trim()
        : typeof resume.jobTitle === "string" && resume.jobTitle.trim()
          ? resume.jobTitle.trim()
          : "Resume intelligence report";

      return {
        resume,
        analysis,
        title,
        targetRole,
        strengths: getArrayValue(analysis.strengths ?? null),
        criticalIssues: getArrayValue(analysis.criticalIssues ?? analysis.detectedProblems ?? null),
        recommendations: getArrayValue(analysis.recommendations ?? null),
        missingKeywords: getArrayValue(analysis.missingKeywords ?? null),
        suggestedKeywords: getArrayValue(analysis.suggestedKeywords ?? analysis.matchedKeywords ?? null),
        summary: typeof analysis.summary === "string" && analysis.summary.trim() ? analysis.summary.trim() : "No summary feedback available.",
      } satisfies DownloadAnalysisBundle & {
        strengths: string[];
        criticalIssues: string[];
        recommendations: string[];
        missingKeywords: string[];
        suggestedKeywords: string[];
        summary: string;
      };
    }
  }

  return null;
}
