import { useMutation } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { MeGate } from "../components/MeGate";
import { ApiError, useApi } from "../lib/api";
import { homePathFor } from "../lib/me";
import { useT } from "../lib/strings";

/** Neutral littleHYPE branding: money is never in theme voice (TH-13). */
export function Paywall() {
  const t = useT();
  const api = useApi();
  const checkout = useMutation({
    mutationFn: () => api<{ url: string }>("/api/checkout", { method: "POST" }),
    onSuccess: ({ url }) => window.location.assign(url),
  });
  const unavailable = checkout.error instanceof ApiError && checkout.error.status === 503;

  return (
    <MeGate>
      {(me) =>
        me.paid ? (
          <Navigate to={homePathFor(me)} replace />
        ) : (
          <main className="page-narrow">
            <div className="gate-card">
              <h1>{t("paywall.heading")}</h1>
              <p>{t("paywall.body")}</p>
              <p className="actions">
                <button className="button" disabled={checkout.isPending || checkout.isSuccess} onClick={() => checkout.mutate()}>
                  {checkout.isPending || checkout.isSuccess ? t("paywall.busy") : t("paywall.buy")}
                </button>
              </p>
              <p className="note">{t("paywall.secure")}</p>
              {checkout.isError && <p role="alert">{unavailable ? t("paywall.unavailable") : t("paywall.error")}</p>}
            </div>
          </main>
        )
      }
    </MeGate>
  );
}
