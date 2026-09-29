import { useClerk } from "@clerk/clerk-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useDownloadExport } from "../lib/account";
import { useApi } from "../lib/api";
import { HABITS_KEY, TODAY_KEY } from "../lib/habits";
import { ME_KEY, type Me } from "../lib/me";
import { PROMPT_KEY } from "../lib/prompt";
import { useT } from "../lib/strings";

function timezoneChoices(current: string): string[] {
  const supported = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf?.("timeZone") ?? [];
  const all = new Set([...supported, "UTC", current]);
  return [...all].sort();
}

/** Account, timezone, reminder, data export and deletion. Plain wording throughout (TH-13). */
export function SettingsPage({ me }: { me: Me }) {
  const t = useT();
  const api = useApi();
  const client = useQueryClient();
  const { signOut } = useClerk();
  const download = useDownloadExport();
  const zones = useMemo(() => timezoneChoices(me.timezone), [me.timezone]);

  const [timezone, setTimezone] = useState(me.timezone);
  const [reminderOn, setReminderOn] = useState(me.reminderTime !== null);
  const [time, setTime] = useState(me.reminderTime ?? "20:00");
  const [downloadError, setDownloadError] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [deleted, setDeleted] = useState<{ signInRemoved: boolean } | null>(null);

  const refresh = () => {
    void client.invalidateQueries({ queryKey: ME_KEY });
    // a new timezone can change what "today" is
    void client.invalidateQueries({ queryKey: TODAY_KEY });
    void client.invalidateQueries({ queryKey: HABITS_KEY });
    void client.invalidateQueries({ queryKey: PROMPT_KEY });
  };
  const saveTimezone = useMutation({ mutationFn: () => api("/api/me/timezone", { method: "PUT", body: { timezone } }), onSuccess: refresh });
  const saveReminder = useMutation({ mutationFn: () => api("/api/me/reminder", { method: "PUT", body: { time: reminderOn ? time : null } }), onSuccess: refresh });
  const remove = useMutation({
    mutationFn: () => api<{ deleted: true; signInRemoved: boolean }>("/api/account?confirm=true", { method: "DELETE" }),
    onSuccess: (result) => setDeleted({ signInRemoved: result.signInRemoved }),
  });

  const word = t("delete.account.word");

  if (deleted) {
    return (
      <div className="settings-page">
        <section className="panel" role="alert">
          <p>{t("delete.account.done")}</p>
          {!deleted.signInRemoved && <p>{t("delete.account.signin")}</p>}
          <button className="button" onClick={() => void signOut({ redirectUrl: "/" })}>
            {t("delete.account.close")}
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <header className="page-head">
        <div>
          <h1>{t("nav.settings")}</h1>
          <p className="page-intro">{t("settings.intro")}</p>
        </div>
      </header>

      <section className="panel" aria-labelledby="set-theme">
        <h2 id="set-theme" className="panel-title">
          {t("settings.theme.heading")}
        </h2>
        <p>{t("settings.theme.body", { theme: t("theme.name") })}</p>
      </section>

      <section className="panel" aria-labelledby="set-tz">
        <h2 id="set-tz" className="panel-title">
          {t("settings.timezone.heading")}
        </h2>
        <p>{t("settings.timezone.body")}</p>
        <label className="field">
          <span>{t("settings.timezone.label")}</span>
          <select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
            {zones.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
        </label>
        <div className="actions">
          <button className="button" disabled={saveTimezone.isPending || timezone === me.timezone} onClick={() => saveTimezone.mutate()}>
            {t("settings.save")}
          </button>
          {saveTimezone.isSuccess && timezone === me.timezone && <span role="status">{t("settings.saved")}</span>}
          {saveTimezone.isError && <span role="alert">{t("settings.error")}</span>}
        </div>
      </section>

      <section className="panel" aria-labelledby="set-rem">
        <h2 id="set-rem" className="panel-title">
          {t("settings.reminder.heading")}
        </h2>
        <p>{t("settings.reminder.body")}</p>
        <div className="segmented" role="group" aria-labelledby="set-rem">
          <button type="button" className="segment" aria-pressed={reminderOn} onClick={() => setReminderOn(true)}>
            {t("settings.reminder.on")}
          </button>
          <button type="button" className="segment" aria-pressed={!reminderOn} onClick={() => setReminderOn(false)}>
            {t("settings.reminder.off")}
          </button>
        </div>
        {reminderOn && (
          <label className="inline-field">
            <span>{t("settings.reminder.time")}</span>
            <input type="time" value={time} required onChange={(e) => setTime(e.target.value)} />
          </label>
        )}
        <div className="actions">
          <button className="button" disabled={saveReminder.isPending || (reminderOn && !time)} onClick={() => saveReminder.mutate()}>
            {t("settings.save")}
          </button>
          {saveReminder.isSuccess && <span role="status">{t("settings.saved")}</span>}
          {saveReminder.isError && <span role="alert">{t("settings.error")}</span>}
        </div>
      </section>

      <section className="panel" aria-labelledby="set-data">
        <h2 id="set-data" className="panel-title">
          {t("export.heading")}
        </h2>
        <p>{t("export.body")}</p>
        <div className="actions">
          {(["json", "md"] as const).map((format) => (
            <button
              key={format}
              className="button"
              onClick={() => {
                setDownloadError(false);
                download(format).catch(() => setDownloadError(true));
              }}
            >
              {t(format === "json" ? "export.json" : "export.journal")}
            </button>
          ))}
        </div>
        {downloadError && <p role="alert">{t("export.error")}</p>}
      </section>

      <section className="panel" aria-labelledby="set-legal">
        <p className="actions">
          <Link to="/privacy">{t("settings.links.privacy")}</Link>
          <Link to="/terms">{t("settings.links.terms")}</Link>
          <button className="link-button" onClick={() => void signOut({ redirectUrl: "/" })}>
            {t("settings.signout")}
          </button>
        </p>
      </section>

      <section className="danger-zone" aria-labelledby="set-delete">
        {!confirming ? (
          <button className="link-button danger" onClick={() => setConfirming(true)}>
            {t("delete.account.action")}
          </button>
        ) : (
          <div className="confirm" role="alertdialog" aria-labelledby="set-delete">
            <h2 id="set-delete">{t("delete.account.heading")}</h2>
            <p>{t("delete.account.body")}</p>
            <label className="field">
              <span>{t("delete.account.label")}</span>
              <input value={typed} autoComplete="off" onChange={(e) => setTyped(e.target.value)} />
            </label>
            <div className="actions">
              <button className="button danger-button" disabled={typed.trim() !== word || remove.isPending} onClick={() => remove.mutate()}>
                {t("delete.account.confirm")}
              </button>
              <button
                className="link-button"
                onClick={() => {
                  setConfirming(false);
                  setTyped("");
                }}
              >
                {t("delete.account.cancel")}
              </button>
            </div>
            {remove.isError && <p role="alert">{t("delete.account.error")}</p>}
          </div>
        )}
      </section>
    </div>
  );
}
