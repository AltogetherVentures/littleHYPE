import { Route, Routes } from "react-router-dom";
import { AuthPage } from "./routes/AuthPage";
import { Landing } from "./routes/Landing";
import { NotFound } from "./routes/NotFound";
import { Onboarding } from "./routes/Onboarding";
import { Paywall } from "./routes/Paywall";
import { ThemeRoute } from "./routes/ThemeRoute";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/sign-in/*" element={<AuthPage mode="sign-in" />} />
      <Route path="/sign-up/*" element={<AuthPage mode="sign-up" />} />
      <Route path="/paywall" element={<Paywall />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/:theme/*" element={<ThemeRoute />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
