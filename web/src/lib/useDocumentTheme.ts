import { useEffect } from "react";

/**
 * Mirrors the theme onto <html data-theme>. The Worker already sets it before
 * first paint; this keeps client-side navigation (and the rare case where the
 * Worker could not resolve the session) in step with the profile.
 */
export function useDocumentTheme(theme: string | null) {
  useEffect(() => {
    const root = document.documentElement;
    if (theme) root.dataset.theme = theme;
    else delete root.dataset.theme;
    return () => {
      delete root.dataset.theme;
    };
  }, [theme]);
}
