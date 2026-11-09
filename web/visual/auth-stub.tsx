/**
 * Stand-in for src/lib/auth in the design gallery only (aliased by vite.visual.config.ts).
 * The gallery renders the real screens without a Supabase project; add ?signedout=1 to see
 * the signed-out variants.
 */
import type { ReactNode } from "react";

const signedIn = !new URLSearchParams(window.location.search).has("signedout");

const client = {
  auth: {
    signInWithPassword: async () => ({ error: null }),
    signUp: async () => ({ data: { session: null }, error: null }),
    resetPasswordForEmail: async () => ({ error: null }),
    updateUser: async () => ({ error: null }),
    signInWithOAuth: async () => ({ error: null }),
  },
};

export const SESSION_COOKIE = "lh_session";
export const useAuth = () => ({ isLoaded: true, isSignedIn: signedIn, getToken: async () => null, signOut: async () => {}, client });
export const AuthProvider = ({ children }: { children: ReactNode }) => <>{children}</>;
export const createAuthClient = () => client;
