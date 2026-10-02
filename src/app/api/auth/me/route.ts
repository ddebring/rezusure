import { NextResponse } from "next/server";

import { adminDb } from "@/lib/firebase/admin";
import { verifyBearerToken } from "@/lib/auth/server";

export async function GET(
  request: Request,
) {
  try {
    const decoded =
      await verifyBearerToken(request);

    const uid = decoded.uid;

    const db = adminDb();

    const userRef = db
      .collection("users")
      .doc(uid);

    const snapshot =
      await userRef.get();

    if (!snapshot.exists) {
      return NextResponse.json({
        ok: true,
        user: {
          uid,
          email:
            decoded.email ?? null,
          displayName:
            decoded.name ?? null,
          photoURL:
            decoded.picture ?? null,
        },
      });
    }

    const data = snapshot.data() ?? {};

    return NextResponse.json({
      ok: true,
      user: {
        uid,

        email:
          data.email ??
          decoded.email ??
          null,

        displayName:
          data.displayName ??
          decoded.name ??
          null,

        photoURL:
          data.photoURL ??
          decoded.picture ??
          null,

        ...data,
      },
    });
  } catch (error) {
    console.error(
      "[API /api/auth/me] error:",
      error,
    );

    if (
      error instanceof Error &&
      "status" in error
    ) {
      const appError =
        error as Error & {
          status?: number;
          code?: string;
        };

      return NextResponse.json(
        {
          error:
            appError.message ??
            "Authentication failed.",

          code:
            appError.code ??
            "AUTH_FAILED",
        },
        {
          status:
            appError.status ??
            401,
        },
      );
    }

    return NextResponse.json(
      {
        error:
          "Unable to load authenticated user.",
      },
      { status: 401 },
    );
  }
}