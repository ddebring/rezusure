export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export const SESSION_COOKIE_NAME = "rezusure_session";

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  provider: string;
}

export interface AuthContextValue {
  user: AppUser | null;
  status: AuthStatus;
  isLoading: boolean;
  isAuthenticated: boolean;
  loginWithEmail: (email: string, password: string) => Promise<AppUser>;
  signupWithEmail: (email: string, password: string) => Promise<AppUser>;
  loginWithGoogle: () => Promise<AppUser>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  currentUser: AppUser | null;
}
