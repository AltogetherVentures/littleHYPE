import { useAuth } from "@clerk/clerk-react";
import { Navigate, useLocation, useParams } from "react-router-dom";
import { isThemeSlug } from "@themes/registry";
import { MeGate } from "../components/MeGate";
import { NotFound } from "./NotFound";
import { Showcase } from "./Showcase";
import { ThemedApp } from "./ThemedApp";

/** /:theme/* - the showcase for signed-out visitors, the app for signed-in users. */
export function ThemeRoute() {
  const { theme } = useParams();
  const { pathname } = useLocation();
  const { isLoaded, isSignedIn } = useAuth();

  if (!isThemeSlug(theme)) return <NotFound />;
  if (!isLoaded) return null;
  if (!isSignedIn) {
    const isShowcase = pathname.replace(/\/+$/, "") === `/${theme}`;
    return isShowcase ? <Showcase slug={theme} /> : <Navigate to="/sign-in" replace />;
  }
  return <MeGate>{(me) => <ThemedApp me={me} />}</MeGate>;
}
