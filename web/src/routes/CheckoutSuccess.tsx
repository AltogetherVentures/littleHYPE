import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { MeGate } from "../components/MeGate";
import { useApi } from "../lib/api";
import { homePathFor, type Me } from "../lib/me";
import { useT } from "../lib/strings";

const GIVE_UP_AFTER_MS = 90_000;

/**
 * Where Stripe sends the browser after paying. The purchase is recorded by the webhook, not
 * by this page, so it just waits (polling the account) until the server says paid, then moves
 * on. If confirmation is slow it says so calmly rather than failing.
 */
function Waiting() {
  const t = useT();
  const api = useApi();
  const [slow, setSlow] = useState(false);
  const me = useQuery({ queryKey: ["me-after-checkout"], queryFn: () => api<Me>("/api/me"), refetchInterval: (q) => (q.state.data?.paid ? false : 2000) });

  useEffect(() => {
    const id = setTimeout(() => setSlow(true), GIVE_UP_AFTER_MS);
    return () => clearTimeout(id);
  }, []);

  if (me.data?.paid) return <Navigate to={homePathFor(me.data)} replace />;
  return (
    <main className="page-narrow">
      <div className="gate-card">
        <h1>{t("billing.success.heading")}</h1>
        <p role="status">{slow ? t("billing.success.slow") : t("billing.success.waiting")}</p>
        {slow && (
          <p className="actions">
            <button className="button" onClick={() => void me.refetch()}>
              {t("billing.success.check")}
            </button>
          </p>
        )}
      </div>
    </main>
  );
}

export function CheckoutSuccess() {
  return <MeGate>{() => <Waiting />}</MeGate>;
}
