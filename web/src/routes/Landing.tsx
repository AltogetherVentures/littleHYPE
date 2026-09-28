import { useAuth } from "@clerk/clerk-react";
import { Link, Navigate } from "react-router-dom";
import { MeGate } from "../components/MeGate";
import { homePathFor } from "../lib/me";
import { useT } from "../lib/strings";

export function Landing() {
  const { isLoaded, isSignedIn } = useAuth();
  const t = useT();

  if (isLoaded && isSignedIn) {
    return <MeGate>{(me) => <Navigate to={homePathFor(me)} replace />}</MeGate>;
  }
  return (
    <main className="page-narrow">
      <h1>{t("landing.heading")}</h1>
      <p>{t("landing.body")}</p>
      <p className="actions">
        <Link className="button" to="/sign-up">
          {t("auth.signUp")}
        </Link>
        <Link className="link-button" to="/sign-in">
          {t("auth.signIn")}
        </Link>
      </p>
    </main>
  );
}
