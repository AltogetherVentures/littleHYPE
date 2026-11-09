import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useT, type StringKey } from "../lib/strings";

type Mode = "sign-in" | "sign-up" | "forgot" | "reset";

/** The auth error codes we word ourselves; anything else gets the generic line. */
const KNOWN: Record<string, StringKey> = {
  invalid_credentials: "auth.error.invalid",
  email_not_confirmed: "auth.error.unconfirmed",
  user_already_exists: "auth.error.exists",
  email_exists: "auth.error.exists",
  weak_password: "auth.error.weak",
  over_email_send_rate_limit: "auth.error.rateLimit",
  over_request_rate_limit: "auth.error.rateLimit",
  same_password: "auth.error.samePassword",
};

/**
 * Sign in, sign up, forgotten password and the page the reset link lands on. Plain forms
 * on the neutral theme, in neutral voice (auth.* strings are never themed, TH-13). Email
 * must be confirmed before a session exists, which Supabase enforces when "Confirm email"
 * is on (docs/setup.md Part 3), so paying always follows a verified address.
 */
export function AuthPage({ mode }: { mode: Mode }) {
  const t = useT();
  const { client, isLoaded, isSignedIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<StringKey | null>(null);

  // A recovery link signs the person in and lands here; anything else signed in belongs in the app.
  useEffect(() => {
    if (mode === "reset" && isLoaded && !isSignedIn) {
      const timer = window.setTimeout(() => setError(t("auth.error.linkExpired")), 1500);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [mode, isLoaded, isSignedIn, t]);
  if (isLoaded && isSignedIn && mode !== "reset") return <Navigate to="/paywall" replace />;

  const fail = (code: string | undefined, message: string) => {
    const key = code ? KNOWN[code] : undefined;
    setError(key ? t(key) : message || t("common.error"));
  };
  const redirectTo = (path: string) => `${window.location.origin}${path}`;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "sign-in") {
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) fail(error.code, error.message);
        else navigate("/paywall", { replace: true });
      } else if (mode === "sign-up") {
        const { data, error } = await client.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo("/sign-in") } });
        if (error) fail(error.code, error.message);
        else if (data.session) navigate("/paywall", { replace: true });
        else setNotice("auth.notice.confirm");
      } else if (mode === "forgot") {
        const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: redirectTo("/reset-password") });
        if (error) fail(error.code, error.message);
        else setNotice("auth.notice.resetSent");
      } else {
        const { error } = await client.auth.updateUser({ password });
        if (error) fail(error.code, error.message);
        else navigate("/paywall", { replace: true });
      }
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    setError(null);
    const { error } = await client.auth.signInWithOAuth({ provider: "google", options: { redirectTo: redirectTo("/sign-in") } });
    if (error) {
      fail(error.code, error.message);
      setBusy(false);
    }
  };

  const title: StringKey = mode === "sign-in" ? "auth.signIn" : mode === "sign-up" ? "auth.signUp" : mode === "forgot" ? "auth.forgot.title" : "auth.reset.title";
  const action: StringKey = mode === "sign-in" ? "auth.signIn" : mode === "sign-up" ? "auth.signUp.action" : mode === "forgot" ? "auth.forgot.action" : "auth.reset.action";
  const showPassword = mode !== "forgot";
  const showEmail = mode !== "reset";

  return (
    <main className="page-narrow auth">
      <div className="gate-card auth-card">
        <p className="auth-mark">{t("app.name")}</p>
        <h1>{t(title)}</h1>
        {mode === "sign-up" && <p className="auth-intro">{t("auth.signUp.intro")}</p>}
        {mode === "forgot" && <p className="auth-intro">{t("auth.forgot.intro")}</p>}

        {notice ? (
          <p className="auth-notice" role="status">
            {t(notice)}
          </p>
        ) : (
          <form className="form auth-form" onSubmit={(e) => void submit(e)}>
            {showEmail && (
              <label className="field">
                <span>{t("auth.email")}</span>
                <input type="email" name="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>
            )}
            {showPassword && (
              <label className="field">
                <span>{mode === "reset" ? t("auth.newPassword") : t("auth.password")}</span>
                <input type="password" name="password" autoComplete={mode === "sign-in" ? "current-password" : "new-password"} required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
              </label>
            )}
            {error && (
              <p className="auth-error" role="alert">
                {error}
              </p>
            )}
            <button type="submit" className="button" disabled={busy}>
              {t(action)}
            </button>
            {(mode === "sign-in" || mode === "sign-up") && (
              <>
                <p className="auth-or">{t("auth.or")}</p>
                <button type="button" className="button button-google" disabled={busy} onClick={() => void google()}>
                  <GoogleMark /> {t("auth.google")}
                </button>
              </>
            )}
          </form>
        )}

        <p className="auth-links">
          {mode === "sign-in" && (
            <>
              <Link to="/forgot-password">{t("auth.forgot.link")}</Link>
              <Link to="/sign-up">{t("auth.toSignUp")}</Link>
            </>
          )}
          {mode === "sign-up" && <Link to="/sign-in">{t("auth.toSignIn")}</Link>}
          {(mode === "forgot" || mode === "reset") && <Link to="/sign-in">{t("auth.toSignIn")}</Link>}
        </p>
        {mode === "sign-up" && (
          <p className="auth-legal">
            {t("auth.legal")} <Link to="/terms">{t("settings.links.terms")}</Link> · <Link to="/privacy">{t("settings.links.privacy")}</Link>
          </p>
        )}
      </div>
    </main>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.6 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.8 6C12.3 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17z" />
      <path fill="#FBBC05" d="M10.4 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.8-6A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l7.8-6z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.7-4.1-13.6-9.9l-7.8 6C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}
