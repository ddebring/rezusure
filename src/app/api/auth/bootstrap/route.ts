import { NextResponse } from "next/server";

import { AppError } from "@/domain/common/result";
import { SESSION_COOKIE_NAME } from "@/lib/auth/types";
import {
  bootstrapUserProfile,
} from "@/lib/auth/user-bootstrap";
import {
  verifyFirebaseIdToken,
  verifyIdToken,
} from "@/lib/auth/verify-id-token";
import { adminAuth } from "@/lib/firebase/admin";

const SESSION_MAX_AGE =
  60 * 60 * 24 * 5;

function errorResponse(error: unknown) {
  console.error(
    "[Auth Bootstrap] Error:",
    error
  );

  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
      },
      {
        status: error.status,
      }
    );
  }

  return NextResponse.json(
    {
      error:
        error instanceof Error
          ? error.message
          : "Unable to start your session.",
      code: "SESSION_BOOTSTRAP_FAILED",
    },
    {
      status: 500,
    }
  );
}

function getTokenFromRequest(
  request: Request
): string | null {
  const authorization =
    request.headers.get("authorization");

  if (
    authorization?.startsWith("Bearer ")
  ) {
    const token = authorization
      .slice("Bearer ".length)
      .trim();

    return token || null;
  }

  return null;
}

export async function GET(
  request: Request
) {
  try {
    const token =
      getTokenFromRequest(request);

    if (!token) {
      return NextResponse.json(
        {
          error:
            "Authentication required.",
          code: "AUTH_REQUIRED",
        },
        {
          status: 401,
        }
      );
    }

    const decoded =
      await verifyFirebaseIdToken(token);

    return NextResponse.json({
      ok: true,

      user: {
        uid: decoded.uid,
        email:
          decoded.email ?? null,
        displayName:
          decoded.name ?? null,
        photoURL:
          decoded.picture ?? null,
        provider:
          decoded.firebase
            ?.sign_in_provider ??
          "password",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(
  request: Request
) {
  try {
    const token =
      getTokenFromRequest(request);

    if (!token) {
      return NextResponse.json(
        {
          error:
            "Authentication required.",
          code: "AUTH_REQUIRED",
        },
        {
          status: 401,
        }
      );
    }

    const decoded =
      await verifyIdToken(token);

    const provider =
      decoded.firebase
        ?.sign_in_provider ??
      "password";

    await bootstrapUserProfile({
      uid: decoded.uid,
      email:
        decoded.email ?? null,
      displayName:
        decoded.name ?? null,
      photoURL:
        decoded.picture ?? null,
      provider,
    });

    const sessionCookie = await adminAuth().createSessionCookie(token, {
      expiresIn: SESSION_MAX_AGE * 1000,
    });

    const response =
      NextResponse.json({
        ok: true,

        user: {
          uid: decoded.uid,
          email:
            decoded.email ?? null,
          displayName:
            decoded.name ?? null,
          photoURL:
            decoded.picture ?? null,
          provider,
        },
      });

    response.cookies.set(
      SESSION_COOKIE_NAME,
      sessionCookie,
      {
        httpOnly: true,
        sameSite: "lax",
        secure:
          process.env.NODE_ENV ===
          "production",
        path: "/",
        maxAge: SESSION_MAX_AGE,
      }
    );

    return response;
  } catch (error) {
    return errorResponse(error);
  }
}