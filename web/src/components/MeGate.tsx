import { useAuth } from "@clerk/clerk-react";
import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useMe, type Me } from "../lib/me";
import { useT } from "../lib/strings";

/** Requires a signed-in user with a loaded account, then renders children with it. */
export function MeGate({ children }: { children: (me: Me) => ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { data: me, isPending, isError, refetch } = useMe();
  const t = useT();

  if (!isLoaded) return <p className="status">{t("common.loading")}</p>;
  if (!isSignedIn) return <Navigate to="/sign-in" replace />;
  if (isPending) return <p className="status">{t("common.loading")}</p>;
  if (isError || !me) {
    return (
      <div className="status" role="alert">
        <p>{t("common.error")}</p>
        <button className="button" onClick={() => void refetch()}>
          {t("common.retry")}
        </button>
      </div>
    );
  }
  return <>{children(me)}</>;
}
