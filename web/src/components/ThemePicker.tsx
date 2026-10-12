import { useState } from "react";
import { THEME_SLUGS } from "@themes/registry";
import { artFor } from "../lib/art";
import { translate, useT } from "../lib/strings";

interface Props {
  busy: boolean;
  error: string | null;
  onChoose: (slug: string) => void;
}

/**
 * Onboarding theme picker. Each option previews its own world by carrying its
 * own data-theme attribute, its own artwork and its own string table (ON-2).
 * The note about the purchase is billing copy, so it is always default wording.
 */
export function ThemePicker({ busy, error, onChoose }: Props) {
  const t = useT();
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <section className="picker">
      <h1>{t("picker.heading")}</h1>
      <p className="picker-intro">{t("picker.intro")}</p>
      <div className="picker-grid" role="radiogroup" aria-label={t("picker.heading")}>
        {THEME_SLUGS.map((slug) => {
          const art = artFor(slug, "hero");
          return (
            <label key={slug} className="theme-card" data-theme={slug} data-selected={selected === slug}>
              <input
                type="radio"
                name="theme"
                value={slug}
                checked={selected === slug}
                onChange={() => setSelected(slug)}
              />
              {art && <img className="theme-card-art" src={art} alt="" />}
              <span className="theme-card-body">
                <span className="theme-card-name">{translate(slug, "theme.name")}</span>
                <span className="theme-card-tagline">{translate(slug, "theme.tagline")}</span>
                <span className="theme-card-preview">&ldquo;{translate(slug, "theme.preview")}&rdquo;</span>
              </span>
              <span className="theme-card-check" aria-hidden="true">
                &#10003;
              </span>
            </label>
          );
        })}
      </div>
      <p className="note">{t("billing.pickerNote")}</p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <button className="button button-hint" disabled={!selected || busy} onClick={() => selected && onChoose(selected)}>
        {busy ? t("picker.choosing") : selected ? t("picker.choose", { name: translate(selected, "theme.name") }) : t("picker.pick")}
      </button>
    </section>
  );
}
