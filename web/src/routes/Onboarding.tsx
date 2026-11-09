import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { MeGate } from "../components/MeGate";
import { ThemePicker } from "../components/ThemePicker";
import { ApiError, useApi } from "../lib/api";
import { ME_KEY, homePathFor } from "../lib/me";
import { useT } from "../lib/strings";

export function Onboarding() {
  const api = useApi();
  const t = useT();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const choose = useMutation({
    mutationFn: async (theme: string) => {
      // ON-3: capture the timezone automatically. A confirm/change control comes later.
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      await api("/api/me/timezone", { method: "PUT", body: { timezone } });
      return api<{ theme: string }>("/api/onboarding/theme", { method: "POST", body: { theme } });
    },
    onSuccess: async ({ theme }) => {
      await queryClient.invalidateQueries({ queryKey: ME_KEY });
      navigate(homePathFor({ theme, paid: true }), { replace: true });
    },
    onError: (err) => setError(err instanceof ApiError && err.status === 402 ? t("paywall.heading") : t("common.error")),
  });

  return (
    <MeGate>
      {(me) => {
        if (me.theme || !me.paid) return <Navigate to={homePathFor(me)} replace />;
        return (
          <main className="page-wide">
            <ThemePicker busy={choose.isPending} error={error} onChoose={(slug) => choose.mutate(slug)} />
          </main>
        );
      }}
    </MeGate>
  );
}
