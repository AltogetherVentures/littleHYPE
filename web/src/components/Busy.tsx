import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useT } from "../lib/strings";

/**
 * A thin bar under the header whenever the app is talking to the server, so a slow
 * round trip never looks like nothing happening. It waits 150ms before showing so a
 * fast answer causes no flicker, and names itself for screen readers.
 */
export function BusyBar() {
  const t = useT();
  const busy = useIsFetching() + useIsMutating() > 0;
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!busy) {
      setShown(false);
      return;
    }
    const id = setTimeout(() => setShown(true), 150);
    return () => clearTimeout(id);
  }, [busy]);
  return (
    <div className="busy-bar" data-shown={shown} role="status" aria-live="polite" aria-label={shown ? t("common.loading") : undefined}>
      <span />
    </div>
  );
}

/** A themed spinner with the loading line beside it, in place of bare text. */
export function Loading({ className = "status" }: { className?: string }) {
  const t = useT();
  return (
    <p className={`${className} loading`} role="status">
      <span className="spinner" aria-hidden="true" />
      {t("common.loading")}
    </p>
  );
}
