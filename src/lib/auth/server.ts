import { AppError } from "@/domain/common/result";
import { adminAuth } from "@/lib/firebase/admin";

export async function verifyBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    throw new AppError("Authentication required.", "AUTH_REQUIRED", 401);
  }

  const token = authorization.slice("Bearer ".length).trim();
  if (!token) throw new AppError("Authentication required.", "AUTH_REQUIRED", 401);

  try {
    return await adminAuth().verifyIdToken(token, true);
  } catch {
    throw new AppError("Invalid authentication token.", "AUTH_INVALID", 401);
  }
}
