import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { recomputeUserDashboardSummary } from "@/lib/auth/user-summary";
import { verifyAuthToken } from "@/lib/auth/verify-id-token";

export async function POST(request: Request) {
  try {
    console.log("[API /api/resumes] request received");

    // ---------------------------------------------------------
    // Authentication
    // ---------------------------------------------------------
    const decoded = await verifyAuthToken(request);

    console.log(
      "[API /api/resumes] authenticated uid:",
      decoded.uid,
    );

    const uid = decoded.uid;

    // ---------------------------------------------------------
    // Parse request body
    // ---------------------------------------------------------
    const body = await request.json().catch(() => null);

    console.log(
      "[API /api/resumes] payload keys:",
      body && typeof body === "object"
        ? Object.keys(body)
        : [],
    );

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        {
          error: "Invalid request body.",
        },
        {
          status: 400,
        },
      );
    }

    // ---------------------------------------------------------
    // Basic validation
    // ---------------------------------------------------------
    const fileName =
      typeof body.fileName === "string"
        ? body.fileName.trim()
        : "";

    const storagePath =
      typeof body.storagePath === "string"
        ? body.storagePath.trim()
        : "";

    const fileType =
      typeof body.fileType === "string"
        ? body.fileType.trim()
        : "";

    const fileSize =
      typeof body.fileSize === "number"
        ? body.fileSize
        : null;

    const downloadURL =
      typeof body.downloadURL === "string"
        ? body.downloadURL.trim()
        : null;

    const jobTitle =
      typeof body.jobTitle === "string"
        ? body.jobTitle.trim()
        : null;

    const jobDescription =
      typeof body.jobDescription === "string"
        ? body.jobDescription.trim()
        : null;

    if (
      !fileName ||
      !storagePath ||
      !fileType ||
      fileSize === null
    ) {
      return NextResponse.json(
        {
          error: "Missing required fields.",
        },
        {
          status: 400,
        },
      );
    }

    // ---------------------------------------------------------
    // Validate file type
    // ---------------------------------------------------------
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedTypes.includes(fileType)) {
      return NextResponse.json(
        {
          error:
            "Invalid file type. Only PDF and DOCX files are supported.",
        },
        {
          status: 400,
        },
      );
    }

    // ---------------------------------------------------------
    // Validate file size
    // ---------------------------------------------------------
    const maxSize = 5 * 1024 * 1024;

    if (
      !Number.isFinite(fileSize) ||
      fileSize <= 0
    ) {
      return NextResponse.json(
        {
          error: "Invalid file size.",
        },
        {
          status: 400,
        },
      );
    }

    if (fileSize > maxSize) {
      return NextResponse.json(
        {
          error: "File too large. Maximum file size is 5 MB.",
        },
        {
          status: 400,
        },
      );
    }

    // ---------------------------------------------------------
    // Basic filename validation
    // ---------------------------------------------------------
    if (fileName.length > 255) {
      return NextResponse.json(
        {
          error: "File name is too long.",
        },
        {
          status: 400,
        },
      );
    }

    // ---------------------------------------------------------
    // Ensure the uploaded file belongs to this user
    // ---------------------------------------------------------
    //
    // Expected storage path:
    //
    // users/{uid}/resumes/...
    //
    // This prevents a client from submitting an arbitrary
    // Firebase Storage path belonging to another user.
    //
    const expectedStoragePrefix = `users/${uid}/resumes/`;

    if (!storagePath.startsWith(expectedStoragePrefix)) {
      return NextResponse.json(
        {
          error: "Invalid storage path.",
        },
        {
          status: 403,
        },
      );
    }

    // ---------------------------------------------------------
    // Create Firestore resume document
    // ---------------------------------------------------------
    const db = adminDb();

    const now = new Date();

    const docRef = db
      .collection("users")
      .doc(uid)
      .collection("resumes")
      .doc();

    const data = {
      userId: uid,

      fileName,
      fileType,
      fileSize,

      storagePath,

      downloadURL: downloadURL || null,

      jobTitle: jobTitle || null,
      jobDescription: jobDescription || null,

      status: "pending",

      createdAt: now,
      updatedAt: now,
    };

    console.log(
      "[API /api/resumes] creating resume document:",
      docRef.id,
    );

    await docRef.set(data);

    // ---------------------------------------------------------
    // Update dashboard summary
    // ---------------------------------------------------------
    try {
      await recomputeUserDashboardSummary(uid);
    } catch (summaryError) {
      /**
       * The resume has already been created successfully.
       *
       * Do not turn a successful resume creation into a 500
       * merely because the dashboard summary failed.
       */
      console.error(
        "[API /api/resumes] dashboard summary update failed:",
        summaryError,
      );
    }

    console.log(
      "[API /api/resumes] created resume:",
      docRef.id,
    );

    // ---------------------------------------------------------
    // Response
    // ---------------------------------------------------------
    return NextResponse.json(
      {
        ok: true,
        id: docRef.id,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "[API /api/resumes] error:",
      error,
    );

    if (
      error instanceof Error &&
      "status" in error
    ) {
      const appError = error as Error & {
        status?: number;
        code?: string;
        message?: string;
      };

      return NextResponse.json(
        {
          error:
            appError.message ||
            "Authentication failed.",
          code:
            appError.code ||
            "AUTH_FAILED",
        },
        {
          status: appError.status || 500,
        },
      );
    }

    return NextResponse.json(
      {
        error: "Failed to create resume.",
      },
      {
        status: 500,
      },
    );
  }
}