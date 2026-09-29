import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { THEME_SLUGS } from "@themes/registry";
import { MeGate } from "../components/MeGate";
import { ApiError, useApi } from "../lib/api";
import { translate, useT, type StringKey } from "../lib/strings";
import { useDocumentTheme } from "../lib/useDocumentTheme";
import { NotFound } from "./NotFound";

interface Summary {
  userId: string;
  theme: string | null;
  timezone: string;
  createdAt: string;
  onboarded: boolean;
  purchase: { status: string; amount: number; currency: string; paidAt: string; paymentIntent: string | null; refundEligible: boolean } | null;
}
interface Found {
  id: string;
  email: string | null;
  name: string | null;
  summary: Summary | null;
}
interface Detail {
  summary: Summary;
  history: { from: string | null; to: string; by: string; at: string }[];
  email: string | null;
  name: string | null;
}

const money = (amount: number, currency: string) => new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(amount / 100);
const when = (iso: string) => new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(iso)) + " UTC";

/** Internal tools (admin only, neutral wording): find an account, change its theme, refund and delete. No content is ever shown (PV-3). */
export function AdminPage() {
  useDocumentTheme(null);
  return <MeGate>{(me) => (me.isAdmin ? <Admin /> : <NotFound />)}</MeGate>;
}

function Admin() {
  const t = useT();
  const api = useApi();
  const [typed, setTyped] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const search = useQuery({ queryKey: ["admin-search", query], queryFn: () => api<{ users: Found[] }>(`/api/admin/users?q=${encodeURIComponent(query)}`), enabled: query.length >= 2 });
  const actions = useQuery({ queryKey: ["admin-actions"], queryFn: () => api<{ actions: { id: string; admin: string; action: string; target: string; at: string; detail: Record<string, unknown> }[] }>("/api/admin/actions") });

  return (
    <main className="page-wide admin">
      <h1>{t("admin.title")}</h1>
      <p className="page-intro">{t("admin.intro")}</p>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          setSelected(null);
          setQuery(typed.trim());
        }}
      >
        <label className="field">
          <span>{t("admin.search.label")}</span>
          <input value={typed} onChange={(e) => setTyped(e.target.value)} minLength={2} maxLength={100} />
        </label>
        <div className="actions">
          <button className="button" type="submit" disabled={typed.trim().length < 2}>
            {t("admin.search.button")}
          </button>
        </div>
      </form>

      {search.isError && <p role="alert">{t("admin.search.error")}</p>}
      {search.data && search.data.users.length === 0 && <p>{t("admin.search.none")}</p>}
      <ul className="admin-results">
        {search.data?.users.map((u) => (
          <li key={u.id}>
            <button className="link-button" onClick={() => setSelected(u.id)} aria-pressed={selected === u.id}>
              {u.email ?? u.id}
              {u.name ? ` (${u.name})` : ""}
            </button>
            {!u.summary && <span className="note"> {t("admin.noProfile")}</span>}
          </li>
        ))}
      </ul>

      {selected && <UserPanel key={selected} id={selected} />}

      <section className="panel" aria-labelledby="admin-actions">
        <h2 id="admin-actions" className="panel-title">
          {t("admin.actions.heading")}
        </h2>
        {actions.data?.actions.length === 0 && <p>{t("admin.actions.empty")}</p>}
        <ul className="admin-log">
          {actions.data?.actions.map((a) => (
            <li key={a.id}>
              {when(a.at)}: {a.action} on {a.target} by {a.admin}
            </li>
          ))}
        </ul>
      </section>
      <p>
        <Link to="/">{t("legal.back")}</Link>
      </p>
    </main>
  );
}

function UserPanel({ id }: { id: string }) {
  const t = useT();
  const api = useApi();
  const client = useQueryClient();
  const detail = useQuery({ queryKey: ["admin-user", id], queryFn: () => api<Detail>(`/api/admin/users/${encodeURIComponent(id)}`) });
  const [theme, setTheme] = useState<string>(THEME_SLUGS[0]);
  const [confirm, setConfirm] = useState("");
  const [force, setForce] = useState(false);
  const [outcome, setOutcome] = useState<string | null>(null);

  const changeTheme = useMutation({
    mutationFn: () => api(`/api/admin/users/${encodeURIComponent(id)}/theme`, { method: "POST", body: { theme } }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["admin-user", id] });
      void client.invalidateQueries({ queryKey: ["admin-actions"] });
    },
  });
  const remove = useMutation({
    mutationFn: () => api<{ deleted: true; refunded: boolean; signInRemoved: boolean }>(`/api/admin/users/${encodeURIComponent(id)}/refund-and-delete`, { method: "POST", body: { confirm, ...(force ? { force: true } : {}) } }),
    onSuccess: (r) => {
      setOutcome(t("admin.refund.done", { refunded: t(r.refunded ? "admin.refund.yes" : "admin.refund.no"), signIn: t(r.signInRemoved ? "admin.refund.yes" : "admin.refund.no") }));
      void client.invalidateQueries({ queryKey: ["admin-actions"] });
      void client.invalidateQueries({ queryKey: ["admin-search"] });
    },
  });

  if (detail.isPending) return <p className="status">{t("common.loading")}</p>;
  if (detail.isError || !detail.data) return <p role="alert">{t("admin.search.error")}</p>;
  const { summary, history } = detail.data;
  const purchase = summary.purchase;
  const errorKey = remove.error instanceof ApiError ? (`admin.refund.error.${remove.error.code}` as StringKey) : null;
  const errorText = remove.isError ? (errorKey && translate(null, errorKey) !== errorKey ? t(errorKey) : t("admin.refund.error.generic")) : null;

  if (outcome) return <p role="status">{outcome}</p>;

  return (
    <section className="panel admin-user" aria-label={summary.userId}>
      <dl className="admin-facts">
        <dt>{t("admin.user.id")}</dt>
        <dd>{summary.userId}</dd>
        <dt>Email</dt>
        <dd>{detail.data.email ?? "-"}</dd>
        <dt>{t("admin.user.theme")}</dt>
        <dd>{summary.theme ? translate(summary.theme, "theme.name") : t("admin.user.none")}</dd>
        <dt>{t("admin.user.timezone")}</dt>
        <dd>{summary.timezone}</dd>
        <dt>{t("admin.user.created")}</dt>
        <dd>{when(summary.createdAt)}</dd>
        <dt>{t("admin.user.purchase")}</dt>
        <dd>
          {purchase ? `${money(purchase.amount, purchase.currency)}, ${purchase.status}, ${when(purchase.paidAt)}, ${t(purchase.refundEligible ? "admin.user.refundable" : "admin.user.notRefundable")}` : t("admin.user.noPurchase")}
        </dd>
      </dl>

      <h2>{t("admin.theme.heading")}</h2>
      <div className="actions">
        <label className="field">
          <span className="sr-only">{t("admin.user.theme")}</span>
          <select value={theme} onChange={(e) => setTheme(e.target.value)}>
            {THEME_SLUGS.map((slug) => (
              <option key={slug} value={slug}>
                {translate(slug, "theme.name")}
              </option>
            ))}
          </select>
        </label>
        <button className="button" disabled={changeTheme.isPending || theme === summary.theme} onClick={() => changeTheme.mutate()}>
          {t("admin.theme.apply")}
        </button>
        {changeTheme.isSuccess && <span role="status">{t("admin.theme.done")}</span>}
      </div>
      <h3>{t("admin.theme.history")}</h3>
      {history.length === 0 ? (
        <p>{t("admin.theme.historyEmpty")}</p>
      ) : (
        <ul>
          {history.map((h) => (
            <li key={h.at + h.to}>
              {when(h.at)}: {h.from ? translate(h.from, "theme.name") : "-"} to {translate(h.to, "theme.name")} ({h.by})
            </li>
          ))}
        </ul>
      )}

      <div className="danger-zone confirm">
        <h2>{t("admin.refund.heading")}</h2>
        <p>{t(purchase?.status === "paid" ? "admin.refund.body" : "admin.refund.bodyNoPurchase")}</p>
        <label className="field">
          <span>{t("admin.refund.confirmLabel")}</span>
          <input value={confirm} autoComplete="off" onChange={(e) => setConfirm(e.target.value)} />
        </label>
        {purchase?.status === "paid" && !purchase.refundEligible && (
          <label className="check-row">
            <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} />
            <span>{t("admin.refund.force")}</span>
          </label>
        )}
        <div className="actions">
          <button className="button danger-button" disabled={confirm !== summary.userId || remove.isPending} onClick={() => remove.mutate()}>
            {t(purchase?.status === "paid" ? "admin.refund.action" : "admin.refund.actionNoPurchase")}
          </button>
        </div>
        {errorText && <p role="alert">{errorText}</p>}
      </div>
    </section>
  );
}
