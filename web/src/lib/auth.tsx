import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/**
 * Sign-in, on Supabase Auth. One client for the whole app; the session lives in the browser
 * (supabase-js keeps it in localStorage and refreshes it) and is mirrored into a cookie so
 * the Worker can theme a page navigation before first paint (src/routes/pages.ts). The
 * Worker never trusts the cookie's presence, only the signed token inside it.
 */
export const SESSION_COOKIE = "lh_session";

export interface AuthState {
  /** False until the stored session (if any) has been read. */
  isLoaded: boolean;
  isSignedIn: boolean;
  /** The current access token, refreshed if needed, or null when signed out. */
  getToken: () => Promise<string | null>;
  signOut: () => Promise<void>;
  client: SupabaseClient;
}

const AuthContext = createContext<AuthState | null>(null);

export function createAuthClient(url: string, anonKey: string): SupabaseClient {
  return createClient(url, anonKey, { auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
}

function mirrorCookie(session: Session | null) {
  try {
    if (session?.access_token) {
      const maxAge = Math.max(0, (session.expires_at ?? 0) - Math.floor(Date.now() / 1000));
      document.cookie = `${SESSION_COOKIE}=${encodeURIComponent(session.access_token)}; path=/; max-age=${maxAge}; samesite=lax${location.protocol === "https:" ? "; secure" : ""}`;
    } else {
      document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; samesite=lax`;
    }
  } catch {
    // Cookies off: page navigations fall back to the SPA correcting the theme itself.
  }
}

export function AuthProvider({ client, children }: { client: SupabaseClient; children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    void client.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      mirrorCookie(data.session);
    });
    const { data: sub } = client.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      mirrorCookie(next);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [client]);

  const getToken = useCallback(async () => {
    const { data } = await client.auth.getSession();
    return data.session?.access_token ?? null;
  }, [client]);

  const signOut = useCallback(async () => {
    await client.auth.signOut();
    mirrorCookie(null);
    window.location.assign("/");
  }, [client]);

  const value = useMemo<AuthState>(() => ({ isLoaded: session !== undefined, isSignedIn: !!session, getToken, signOut, client }), [session, getToken, signOut, client]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
}
