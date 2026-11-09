import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useT } from "../lib/strings";

/**
 * Where the link at the bottom of a reminder email lands (RM-3). Opening it does the
 * unsubscribing: one click, no sign-in. It is a POST from this page (not a GET on the link),
 * so a mail scanner that just fetches the URL changes nothing.
 */
export function Unsubscribe() {
  const t = useT();
  const [params] = useSearchParams();
  const [state, setState] = useState<"working" | "done" | "error">("working");

  useEffect(() => {
    const u = params.get("u");
    const token = params.get("t");
    if (!u || !token) {
      setState("error");
      return;
    }
    let live = true;
    fetch(`/api/unsubscribe?u=${encodeURIComponent(u)}&t=${encodeURIComponent(token)}`, { method: "POST" })
      .then((res) => live && setState(res.ok ? "done" : "error"))
      .catch(() => live && setState("error"));
    return () => {
      live = false;
    };
  }, [params]);

  return (
    <main className="page-narrow">
      <h1>{t("app.name")}</h1>
      {state === "working" && <p role="status">{t("privacy.unsubscribe.working")}</p>}
      {state === "done" && (
        <>
          <p role="status">{t("privacy.unsubscribe.done")}</p>
          <p>{t("privacy.unsubscribe.hint")}</p>
        </>
      )}
      {state === "error" && <p role="alert">{t("privacy.unsubscribe.error")}</p>}
      <p>
        <Link to="/">{t("privacy.unsubscribe.home")}</Link>
      </p>
    </main>
  );
}
