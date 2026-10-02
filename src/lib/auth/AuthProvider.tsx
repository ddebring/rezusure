"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase/client";
import {
  bootstrapSession,
  getAuthErrorMessage,
  loginWithEmailClient,
  loginWithGoogleClient,
  logoutClient,
  signupWithEmailClient,
  toAppUser,
} from "@/lib/auth/auth-client";
import type { AppUser, AuthContextValue, AuthStatus } from "@/lib/auth/types";

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AppUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>(() => (firebaseAuth ? "loading" : "unauthenticated"));

  const syncAuthState = useCallback(async () => {
    if (!firebaseAuth) {
      setUser(null);
      setStatus("unauthenticated");
      return;
    }

    const currentUser = firebaseAuth.currentUser;
    if (!currentUser) {
      setUser(null);
      setStatus("unauthenticated");
      return;
    }

    setUser(toAppUser(currentUser));
    setStatus("loading");

    try {
      await bootstrapSession(currentUser);
      setUser(toAppUser(currentUser));
      setStatus("authenticated");
    } catch (error) {
      console.error("[AUTH] Session bootstrap failed during auth state sync:", error);
      setUser(null);
      setStatus("unauthenticated");
    }
  }, []);

  useEffect(() => {
    if (!firebaseAuth) {
      return;
    }

    const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setStatus("unauthenticated");
        return;
      }

      const nextUser = toAppUser(firebaseUser);
      setUser(nextUser);
      setStatus("loading");

      try {
        await bootstrapSession(firebaseUser);
        setUser(nextUser);
        setStatus("authenticated");
      } catch (error) {
        console.error("[AUTH] Session bootstrap failed during auth state sync:", error);
        setUser(null);
        setStatus("unauthenticated");
      }
    });

    return () => unsubscribe();
  }, []);

  const loginWithEmail = useCallback(async (email: string, password: string) => {
    try {
      const authenticatedUser = await loginWithEmailClient(email, password);
      setUser(authenticatedUser);
      setStatus("authenticated");
      return authenticatedUser;
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  }, []);

  const signupWithEmail = useCallback(async (email: string, password: string) => {
    try {
      const authenticatedUser = await signupWithEmailClient(email, password);
      setUser(authenticatedUser);
      setStatus("authenticated");
      return authenticatedUser;
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  }, []);

  const loginWithGoogle = useCallback(async () => {
    try {
      const authenticatedUser = await loginWithGoogleClient();
      setUser(authenticatedUser);
      setStatus("authenticated");
      return authenticatedUser;
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  }, []);

  const logout = useCallback(async () => {
    // Indicate we're performing a logout operation.
    setStatus("loading");

    try {
      await logoutClient();
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      // Ensure local state is cleared even if server/client logout had issues.
      setUser(null);
      setStatus("unauthenticated");

      try {
        router.replace("/login");
        router.refresh();
      } catch {
        // ignore navigation errors in SSR contexts
      }
    }
  }, [router]);

  const refreshSession = useCallback(async () => {
    await syncAuthState();
  }, [syncAuthState]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      isLoading: status === "loading",
      isAuthenticated: status === "authenticated",
      loginWithEmail,
      signupWithEmail,
      loginWithGoogle,
      logout,
      refreshSession,
      currentUser: user,
    }),
    [loginWithEmail, loginWithGoogle, logout, refreshSession, signupWithEmail, status, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}
