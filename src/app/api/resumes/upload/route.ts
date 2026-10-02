import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { buildResumeIntelligence } from "@/lib/analysis/resume-intelligence";
import { adminStorage, adminDb } from "@/lib/firebase/admin";
import { recomputeUserDashboardSummary } from "@/lib/auth/user-summary";
import {
  getBearerToken,
  verifyFirebaseIdToken,
  verifyFirebaseSessionCookie,
} from "@/lib/auth/verify-id-token";
import { getSessionTokenFromCookie } from "@/lib/auth/server";
import { finalizeAnalysisCredit, reserveAnalysisCredit, restoreAnalysisCredit } from "@/lib/billing/usage";
import { assertNoUndefined, removeUndefined } from "@/lib/firebase/firestore-safe";
import { extractResumeTextFromFile, inferResumeDocumentKind } from "@/lib/resumes/extract";

export const runtime = "nodejs";

const inFlightAnalyses = new Map<string, Promise<void>>();

const createLogger = (requestId: string) => ({
  log: (stage: string, message: string, extra?: Record<string, unknown>) => {
    const details = extra ? ` ${JSON.stringify(extra)}` : "";
    console.log(`[resume-analysis] requestId=${requestId} stage=${stage} ${message}${details}`);
  },
  error: (stage: string, message: string, error: unknown) => {
    const stack = error instanceof Error ? error.stack : undefined;
    console.error(`[resume-analysis] FAILED requestId=${requestId} stage=${stage} message=${message} error=${error instanceof Error ? error.message : String(error)}${stack ? ` stack=${stack}` : ""}`);
  },
});

const userSafeError = (code: string) => {
  switch (code) {
    case "AI_QUOTA_EXCEEDED":
      return { status: 429, message: "Resume analysis is temporarily unavailable because the Gemini quota has been exhausted. Please try again later." };
    case "AI_RATE_LIMITED":
      return { status: 429, message: "Resume analysis is temporarily rate-limited. Please wait a moment and try again." };
    case "AI_PROVIDER_BUSY":
      return { status: 503, message: "Gemini is temporarily busy. Please try your resume again in a moment." };
    case "AI_AUTH_ERROR":
      return { status: 401, message: "Resume analysis is unavailable because the provider authentication is invalid." };
    case "AI_BAD_REQUEST":
      return { status: 400, message: "Resume analysis request was invalid." };
    case "AI_TIMEOUT":
      return { status: 504, message: "Resume analysis timed out. Please try again." };
    default:
      return { status: 500, message: "Analysis failed." };
  }
};

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const logger = createLogger(requestId);

  try {
    logger.log("request_started", "resume upload request started");

    // parse multipart form-data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const jobTitle = (formData.get("jobTitle") as string) || null;
    const jobDescription = (formData.get("jobDescription") as string) || null;

    const token = getBearerToken(request) || getSessionTokenFromCookie(request as Request);

    if (!token) {
      logger.log("auth_validation", "auth missing");
      return NextResponse.json({ success: false, error: "Authentication required.", code: "AUTH_REQUIRED", requestId, stage: "auth_validation" }, { status: 401 });
    }

    logger.log("auth_validation", "verifying token");
    const decoded = getBearerToken(request)
      ? await verifyFirebaseIdToken(token)
      : await verifyFirebaseSessionCookie(token);
    const uid = decoded.uid;
    logger.log("auth_validation", "authenticated user", { uid });

    // continue
    if (!file || typeof file === "string") {
      logger.log("file_validation", "missing file");
      return NextResponse.json({ success: false, error: "Please attach a PDF or DOCX file.", code: "NO_FILE", requestId, stage: "file_validation" }, { status: 400 });
    }

    const inferredKind = inferResumeDocumentKind(file.name, file.type);
    const allowed = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/octet-stream",
    ];

    const size = file.size;
    const maxSize = 5 * 1024 * 1024;

    logger.log("file_validation", "validating file metadata", { fileName: file.name, fileType: file.type, inferredKind, fileSize: size });

    if (size > maxSize) {
      logger.log("file_validation", "file rejected due to size", { fileSize: size, maxSize });
      return NextResponse.json({ success: false, error: "File too large (max 5 MB).", code: "FILE_TOO_LARGE", requestId, stage: "file_validation" }, { status: 400 });
    }

    if (!inferredKind && !allowed.includes(file.type)) {
      logger.log("file_validation", "unsupported file type", { fileType: file.type, fileName: file.name });
      return NextResponse.json({ success: false, error: "Please upload a PDF or DOCX resume.", code: "INVALID_FILE_TYPE", requestId, stage: "file_validation" }, { status: 400 });
    }

    if (!jobDescription || !jobDescription.trim() || jobDescription.trim().length < 30) {
      logger.log("job_description_validation", "missing or too short job description", { length: jobDescription?.trim().length ?? 0 });
      return NextResponse.json({ success: false, error: "Please paste the target job description before running the analysis.", code: "JOB_DESCRIPTION_REQUIRED", requestId, stage: "job_description_validation" }, { status: 400 });
    }

    const storage = adminStorage();
    let bucket = storage.bucket();

    // Ensure the configured bucket exists; try a project-based fallback for local dev.
    try {
      const [exists] = await bucket.exists();
      if (!exists) {
        const env = (await import("@/lib/env/server")).getServerEnv();
        const fallbackName = `${env.FIREBASE_PROJECT_ID}.appspot.com`;
        const fallbackBucket = storage.bucket(fallbackName);
        const [fallbackExists] = await fallbackBucket.exists();
        if (fallbackExists) {
          console.log("[resume-upload] using fallback storage bucket:", fallbackName);
          bucket = fallbackBucket;
        } else {
          console.error("[resume-upload] storage bucket not found:", bucket.name, "and fallback", fallbackName);
          return NextResponse.json({ ok: false, error: "Server storage bucket not found. Check FIREBASE_STORAGE_BUCKET.", code: "STORAGE_BUCKET_NOT_FOUND" }, { status: 500 });
        }
      }
    } catch (err) {
      console.error("[resume-upload] bucket.exists check failed:", err);
      return NextResponse.json({ ok: false, error: "Server storage check failed.", code: "STORAGE_CHECK_FAILED" }, { status: 500 });
    }

    const destPath = `users/${uid}/resumes/${Date.now()}_${file.name}`;

    console.log("[resume-upload] writing to storage", destPath);
    const writeStream = bucket.file(destPath).createWriteStream({ resumable: false, metadata: { contentType: file.type } });

    const arrayBuffer = await file.arrayBuffer();
    writeStream.end(Buffer.from(arrayBuffer));

    await new Promise<void>((resolve, reject) => {
      writeStream.on("finish", () => resolve());
      writeStream.on("error", (err) => reject(err));
    });

    console.log("[resume-upload] storage write complete");

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${encodeURIComponent(destPath)}`;

    // Persist resume record
    const db = adminDb();
    const now = new Date();
    const docRef = db.collection("users").doc(uid).collection("resumes").doc();

    const data = {
      userId: uid,
      fileName: file.name,
      fileType: file.type,
      fileSize: size,
      storagePath: destPath,
      downloadURL: publicUrl,
      jobTitle,
      jobDescription,
      status: "uploaded",
      createdAt: now,
      updatedAt: now,
    };

    await docRef.set(data);
    await recomputeUserDashboardSummary(uid);

    console.log("[resume-upload] stored resume doc", docRef.id);

    const analysisKey = crypto.createHash("sha256").update(`${uid}:${file.name}:${file.size}:${file.lastModified ?? 0}:${jobTitle ?? ""}:${jobDescription ?? ""}`).digest("hex");
    if (inFlightAnalyses.has(analysisKey)) {
      console.warn("[resume-upload] duplicate analysis suppressed for resume key=%s", analysisKey);
      return NextResponse.json({ ok: false, error: "This resume analysis is already in progress.", code: "AI_ANALYSIS_IN_PROGRESS" }, { status: 409 });
    }

    try {
      await reserveAnalysisCredit(uid, analysisKey);
    } catch (error) {
      if (error instanceof Error && "code" in error && (error as { code?: string }).code === "ANALYSIS_CREDITS_EXHAUSTED") {
        await docRef.update({ status: "failed", updatedAt: new Date() }).catch(() => null);
        return NextResponse.json(
          {
            ok: false,
            error: "You have used all available analyses.",
            code: "ANALYSIS_CREDITS_EXHAUSTED",
          },
          { status: 402 },
        );
      }

      console.error("[resume-upload] credit reservation failed:", error);
      await docRef.update({ status: "failed", updatedAt: new Date() }).catch(() => null);
      return NextResponse.json({ ok: false, error: "Unable to reserve an analysis credit.", code: "ANALYSIS_CREDIT_RESERVATION_FAILED" }, { status: 500 });
    }

    const runAnalysis = async () => {
      try {
        console.log("[resume-upload] starting extraction for", destPath);
        const fileDownload = await bucket.file(destPath).download();
        const buffer = fileDownload[0];
        const resumeFile = {
          name: file.name,
          type: file.type || (inferredKind === "pdf"
            ? "application/pdf"
            : "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
          arrayBuffer: async () => {
            const view = new Uint8Array(buffer);
            return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength);
          },
        };

        const { text: resumeText, kind: resolvedKind } = await extractResumeTextFromFile(resumeFile);

        console.log("[resume-upload] extracted text length", resumeText.length);
        logger.log("resume_extraction", "resume text extracted", { fileType: file.type || resolvedKind, rawLength: resumeText.length, resolvedKind });

        if (!resumeText || resumeText.length < 20) {
          logger.log("resume_extraction", "extraction produced too little text", { length: resumeText.length });
          await restoreAnalysisCredit(uid, analysisKey).catch(() => null);
          await docRef.update({ status: "failed", updatedAt: new Date() }).catch(() => null);
          return NextResponse.json({ success: false, error: "Unable to extract readable text from this resume. Please upload a text-based PDF or DOCX.", code: "RESUME_EXTRACTION_FAILED", requestId, stage: "resume_extraction" }, { status: 422 });
        }

        logger.log("ai_analysis", "starting resume intelligence analysis", { resumeTextLength: resumeText.length, jobDescriptionLength: jobDescription.trim().length });
        const canonical = buildResumeIntelligence({
          resumeText,
          jobDescription: jobDescription ?? "",
          targetRole: jobTitle ?? undefined,
          resumeFileName: file.name,
          userId: uid,
          resumeId: docRef.id,
        });

        const scores = {
          overallScore: canonical.scores.overall,
          atsScore: canonical.scores.atsParseability,
          contentScore: canonical.scores.skillsCoverage,
          structureScore: canonical.scores.atsParseability,
          impactScore: canonical.scores.evidenceQuality,
          clarityScore: canonical.scores.clarityBrevity,
          roleRelevance: canonical.scores.roleRelevance,
          skillsCoverage: canonical.scores.skillsCoverage,
          evidenceQuality: canonical.scores.evidenceQuality,
          seniorityFit: canonical.scores.seniorityFit,
          keywordContext: canonical.scores.keywordContext,
          clarityBrevity: canonical.scores.clarityBrevity,
        };

        const analysisRef = docRef.collection("analyses").doc();
        const safeResumeAnalysis = removeUndefined(canonical);
        assertNoUndefined(safeResumeAnalysis, "resumeAnalysis");

        const analysisPayload = {
          id: analysisRef.id,
          status: "completed",
          userId: uid,
          resumeId: docRef.id,
          createdAt: new Date(),
          updatedAt: new Date(),
          jobDescription: jobDescription ?? "",
          jobTitle: jobTitle ?? "",
          overallScore: canonical.scores.overall,
          summary: canonical.executiveAssessment.summary,
          strengths: canonical.strengths.map((item) => item.title),
          criticalIssues: canonical.blockers.map((item) => `${item.requirement} (${item.fixability})`),
          recommendations: canonical.recommendations.map((item) => item.title),
          warnings: canonical.blockers.map((item) => item.requirement),
          missingKeywords: canonical.keywords.filter((item) => item.evidenceStatus === "missing").map((item) => item.phrase),
          suggestedKeywords: canonical.keywords.filter((item) => item.evidenceStatus === "supported" || item.evidenceStatus === "partial").map((item) => item.phrase),
          matchedKeywords: canonical.keywords.filter((item) => item.evidenceStatus === "supported").map((item) => item.phrase),
          sectionFeedback: Object.fromEntries(
            canonical.sectionFeedback.map((section) => [
              section.section.toLowerCase(),
              {
                score: section.score,
                strengths: section.strengths.map((item) => item.title),
                issues: section.issues.map((item) => item.title),
                suggestions: section.suggestions.map((item) => item.title),
              },
            ]),
          ),
          scores,
          resumeAnalysis: safeResumeAnalysis,
          model: {
            provider: "gemini",
            model: "deterministic-resume-intelligence",
            schemaVersion: "resume-intelligence-v1",
            analyzedAt: new Date().toISOString(),
          },
        };

        const safeAnalysisPayload = removeUndefined(analysisPayload);
        assertNoUndefined(safeAnalysisPayload, "analysisPayload");

        logger.log("firestore_write", "writing analysis document", { analysisId: analysisRef.id });
        await analysisRef.set(safeAnalysisPayload);
        logger.log("firestore_write", "analysis document saved", { analysisId: analysisRef.id });
        await docRef.update({
          status: "completed",
          updatedAt: new Date(),
          latestAnalysisId: analysisRef.id,
          extractedText: resumeText.substring(0, 10000),
          lastJobDescription: jobDescription ?? "",
          lastJobTitle: jobTitle ?? "",
        });

        const updatedUsage = await finalizeAnalysisCredit(uid, analysisKey);
        await recomputeUserDashboardSummary(uid);

        console.log("[resume-upload] analysis complete", analysisRef.id, updatedUsage);

        logger.log("analysis_completed", "resume intelligence pipeline completed", { analysisId: analysisRef.id, resumeId: docRef.id });
        return NextResponse.json({ success: true, id: docRef.id, analysisId: analysisRef.id, downloadURL: publicUrl, usage: updatedUsage, requestId });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);

        if (
          errorMessage.includes("Unable to extract readable text") ||
          errorMessage.includes("Please upload a PDF or DOCX resume")
        ) {
          logger.log("resume_extraction", "extraction failed before analysis could begin", { message: errorMessage });
          await restoreAnalysisCredit(uid, analysisKey).catch(() => null);
          await docRef.update({ status: "failed", updatedAt: new Date() }).catch(() => null);
          await recomputeUserDashboardSummary(uid).catch(() => null);

          return NextResponse.json(
            {
              success: false,
              error: errorMessage,
              code: "RESUME_EXTRACTION_FAILED",
              stage: "resume_extraction",
              requestId,
            },
            { status: 422 },
          );
        }

        if (/undefined|Firestore document|Cannot use "undefined" as a Firestore value|ignoreUndefinedProperties/i.test(errorMessage)) {
          logger.error("persistence", "resume analysis persistence failed due to undefined values", err);
          await restoreAnalysisCredit(uid, analysisKey).catch(() => null);
          await docRef.update({ status: "failed", updatedAt: new Date() }).catch(() => null);
          await recomputeUserDashboardSummary(uid).catch(() => null);

          return NextResponse.json(
            {
              success: false,
              error: "Your resume was analyzed, but we couldn't save the analysis. Please try again.",
              code: "RESUME_ANALYSIS_PERSISTENCE_FAILED",
              stage: "persistence",
              requestId,
            },
            { status: 500 },
          );
        }

        logger.error("analysis_pipeline", "resume upload analysis failed", err);
        await restoreAnalysisCredit(uid, analysisKey).catch(() => null);
        await docRef.update({ status: "failed", updatedAt: new Date() }).catch(() => null);
        await recomputeUserDashboardSummary(uid).catch(() => null);

        const errorValue = err as { code?: string; message?: string; stage?: string };
        const code = errorValue?.code ?? "ANALYSIS_FAILED";
        const userSafe = userSafeError(code);

        return NextResponse.json({ success: false, error: errorValue?.message || userSafe.message, code, stage: errorValue?.stage || "analysis_pipeline", requestId }, { status: userSafe.status });
      }
    };

    const analysisPromise = runAnalysis();
    inFlightAnalyses.set(analysisKey, analysisPromise.then(() => undefined).catch(() => undefined));

    try {
      return await analysisPromise;
    } finally {
      inFlightAnalyses.delete(analysisKey);
    }
  } catch (error) {
    logger.error("unhandled_exception", "resume upload route failed", error);

    if (error instanceof Error && "status" in error) {
      const appError = error as Error & { status?: number; code?: string; message?: string };
      return NextResponse.json(
        {
          success: false,
          error: appError.message ?? "Authentication failed.",
          code: appError.code ?? "AUTH_FAILED",
          stage: "unhandled_exception",
          requestId,
        },
        { status: appError.status ?? 500 }
      );
    }

    return NextResponse.json({ success: false, error: "Upload failed.", code: "UPLOAD_FAILED", stage: "unhandled_exception", requestId }, { status: 500 });
  }
}
