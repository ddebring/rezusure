import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { recomputeUserDashboardSummary } from "@/lib/auth/user-summary";
import { getSessionTokenFromCookie } from "@/lib/auth/server";
import { verifyFirebaseSessionCookie } from "@/lib/auth/verify-id-token";

export async function POST(request: Request) {
  try {
    console.log("[API /api/resumes] request received");
    const body = await request.json();
    console.log("[API /api/resumes] payload keys:", Object.keys(body || {}));

    const token = getSessionTokenFromCookie(request as Request) || request.headers.get("authorization")?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const decoded = await verifyFirebaseSessionCookie(token);
    console.log("[API /api/resumes] authenticated uid:", decoded.uid);

    const uid = decoded.uid;

    // Basic server-side validation
    if (!body || !body.fileName || !body.storagePath || !body.fileType || !body.fileSize) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedTypes.includes(body.fileType)) {
      return NextResponse.json({ error: "Invalid file type." }, { status: 400 });
    }

    const maxSize = 5 * 1024 * 1024;
    if (body.fileSize > maxSize) {
      return NextResponse.json({ error: "File too large." }, { status: 400 });
    }

    const db = adminDb();

    const now = new Date();

    const docRef = db.collection("users").doc(uid).collection("resumes").doc();

    const data = {
      userId: uid,
      fileName: body.fileName ?? null,
      fileType: body.fileType ?? null,
      fileSize: body.fileSize ?? null,
      storagePath: body.storagePath ?? null,
      downloadURL: body.downloadURL ?? null,
      jobTitle: body.jobTitle ?? null,
      jobDescription: body.jobDescription ?? null,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    };

    console.log("[API /api/resumes] creating resume doc for user", uid);
    await docRef.set(data);
    await recomputeUserDashboardSummary(uid);

    console.log("[API /api/resumes] created resume id", docRef.id);

    return NextResponse.json({ ok: true, id: docRef.id });
  } catch (error) {
    console.error("/api/resumes error:", error);

    if (error instanceof Error && "status" in error) {
      const appError = error as Error & { status?: number; code?: string; message?: string };
      return NextResponse.json({
        error: appError.message ?? "Authentication failed.",
        code: appError.code ?? "AUTH_FAILED",
      }, { status: appError.status ?? 500 });
    }

    return NextResponse.json({ error: "Failed to create resume." }, { status: 500 });
  }
}
