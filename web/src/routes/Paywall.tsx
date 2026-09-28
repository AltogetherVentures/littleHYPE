import { Navigate } from "react-router-dom";
import { MeGate } from "../components/MeGate";
import { homePathFor } from "../lib/me";
import { useT } from "../lib/strings";

/** Neutral littleHYPE branding: money is never in theme voice (TH-13). */
export function Paywall() {
  const t = useT();
  return (
    <MeGate>
      {(me) =>
        me.paid ? (
          <Navigate to={homePathFor(me)} replace />
        ) : (
          <main className="page-narrow">
            <h1>{t("paywall.heading")}</h1>
            <p>{t("paywall.body")}</p>
          </main>
        )
      }
    </MeGate>
  );
}
