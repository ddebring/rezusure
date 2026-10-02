import { adminDb } from "@/lib/firebase/admin";

export type UserDashboardSummary = {
  uid: string;
  resumeCount: number;
  analysisCount: number;
  latestResumeId: string | null;
  latestResumeName: string | null;
  latestScore: number | null;
  latestAnalysisId: string | null;
  latestAnalysisStatus: string | null;
  latestAction: string | null;
  updatedAt: Date | null;
};

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function getCreatedAtMs(value: unknown): number {
  if (value instanceof Date) return value.getTime();

  if (value && typeof value === "object" && "_seconds" in value) {
    const timestamp = value as { _seconds?: number; _nanoseconds?: number };
    return ((timestamp._seconds ?? 0) * 1000) + ((timestamp._nanoseconds ?? 0) / 1_000_000);
  }

  if (typeof value === "string") {
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  return 0;
}

function pickLatestAnalysisDoc<T extends { data: () => Record<string, unknown>; id: string }>(docs: T[]) {
  return [...docs].sort((a, b) => {
    const aTime = getCreatedAtMs(a.data().createdAt);
    const bTime = getCreatedAtMs(b.data().createdAt);
    return bTime - aTime;
  })[0] ?? null;
}

export async function recomputeUserDashboardSummary(
  uid: string,
): Promise<UserDashboardSummary> {
  const db = adminDb();
  const userRef = db.collection("users").doc(uid);
  const resumesRef = userRef.collection("resumes");
  const resumeSnapshot = await resumesRef.orderBy("updatedAt", "desc").get();

  const newestResumeDoc = resumeSnapshot.docs[0] ?? null;
  const newestResume = newestResumeDoc?.data() as Record<string, unknown> | undefined;
  const newestResumeId = newestResumeDoc?.id ?? null;
  const newestResumeName = typeof newestResume?.fileName === "string"
    ? newestResume.fileName
    : null;

  let analysisCount = 0;
  let latestAnalysisId: string | null = typeof newestResume?.latestAnalysisId === "string"
    ? newestResume.latestAnalysisId
    : null;
  let latestScore: number | null = null;
  let latestAnalysisStatus: string | null = typeof newestResume?.status === "string"
    ? newestResume.status
    : null;
  let latestAction: string | null = newestResumeId
    ? `Uploaded ${newestResumeName ?? "resume"}`
    : "Upload a resume to create your first analysis";

  const analysisCandidates: Array<{ id: string; data: Record<string, unknown> }> = [];

  for (const resumeDoc of resumeSnapshot.docs) {
    const [analysisDocs, legacyAnalysisDocs] = await Promise.all([
      resumeDoc.ref.collection("analyses").orderBy("createdAt", "desc").limit(10).get(),
      resumeDoc.ref.collection("analysis").orderBy("createdAt", "desc").limit(10).get(),
    ]);

    analysisCount += analysisDocs.size + legacyAnalysisDocs.size;

    const latestDoc = pickLatestAnalysisDoc([
      ...analysisDocs.docs,
      ...legacyAnalysisDocs.docs,
    ]);

    if (latestDoc) {
      analysisCandidates.push({
        id: latestDoc.id,
        data: latestDoc.data() as Record<string, unknown>,
      });
    }
  }

  if (analysisCandidates.length > 0) {
    const latestAnalysis = [...analysisCandidates].sort((a, b) => {
      const aTime = getCreatedAtMs(a.data.createdAt);
      const bTime = getCreatedAtMs(b.data.createdAt);
      return bTime - aTime;
    })[0] ?? null;

    if (latestAnalysis) {
      const data = latestAnalysis.data;
      const nestedScores = data.scores as Record<string, unknown> | undefined;
      const overallScore = readNumber(data.overallScore) ?? readNumber(nestedScores?.overallScore);

      latestAnalysisId = latestAnalysis.id;
      latestScore = overallScore;
      latestAnalysisStatus = typeof data.status === "string"
        ? data.status
        : overallScore !== null
          ? "completed"
          : "pending";
      latestAction = `Analyzed for ${typeof data.jobTitle === "string" && data.jobTitle.trim() ? data.jobTitle : newestResumeName ?? "target role"}`;
    }
  }

  const summary: UserDashboardSummary = {
    uid,
    resumeCount: resumeSnapshot.size,
    analysisCount,
    latestResumeId: newestResumeId,
    latestResumeName: newestResumeName,
    latestScore,
    latestAnalysisId,
    latestAnalysisStatus,
    latestAction,
    updatedAt: new Date(),
  };

  await userRef.set(summary, { merge: true });

  return summary;
}

export async function getUserDashboardSummary(
  uid: string,
): Promise<UserDashboardSummary | null> {
  const db = adminDb();
  const userRef = db.collection("users").doc(uid);
  const snapshot = await userRef.get();
  const data = snapshot.data() ?? {};

  const hasSummary =
    typeof data.resumeCount === "number" ||
    typeof data.analysisCount === "number" ||
    typeof data.latestResumeId === "string" ||
    typeof data.latestAnalysisId === "string" ||
    typeof data.latestAction === "string";

  if (hasSummary) {
    return {
      uid,
      resumeCount: readNumber(data.resumeCount) ?? 0,
      analysisCount: readNumber(data.analysisCount) ?? 0,
      latestResumeId: typeof data.latestResumeId === "string" ? data.latestResumeId : null,
      latestResumeName: typeof data.latestResumeName === "string" ? data.latestResumeName : null,
      latestScore: readNumber(data.latestScore),
      latestAnalysisId: typeof data.latestAnalysisId === "string" ? data.latestAnalysisId : null,
      latestAnalysisStatus: typeof data.latestAnalysisStatus === "string" ? data.latestAnalysisStatus : null,
      latestAction: typeof data.latestAction === "string" ? data.latestAction : null,
      updatedAt: data.updatedAt instanceof Date ? data.updatedAt : null,
    };
  }

  return recomputeUserDashboardSummary(uid);
}
