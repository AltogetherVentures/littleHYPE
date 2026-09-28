import { useState } from "react";
import { THEME_SLUGS } from "@themes/registry";
import { translate, useT } from "../lib/strings";

interface Props {
  busy: boolean;
  error: string | null;
  onChoose: (slug: string) => void;
}

/**
 * Onboarding theme picker. Each option previews its own theme by carrying its
 * own data-theme attribute and reading its own string table (ON-2). The note
 * about the purchase is billing copy, so it is always the default wording.
 */
export function ThemePicker({ busy, error, onChoose }: Props) {
  const t = useT();
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <section className="picker">
      <h1>{t("picker.heading")}</h1>
      <p>{t("picker.intro")}</p>
      <div className="picker-grid" role="radiogroup" aria-label={t("picker.heading")}>
        {THEME_SLUGS.map((slug) => {
          const name = translate(slug, "theme.name");
          return (
            <label key={slug} className="theme-card" data-theme={slug} data-selected={selected === slug}>
              <input
                type="radio"
                name="theme"
                value={slug}
                checked={selected === slug}
                onChange={() => setSelected(slug)}
              />
              <span className="theme-card-name">{name}</span>
              <span className="theme-card-tagline">{translate(slug, "theme.tagline")}</span>
              <span className="theme-card-preview">&ldquo;{translate(slug, "theme.preview")}&rdquo;</span>
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
      <button
        className="button"
        disabled={!selected || busy}
        onClick={() => selected && onChoose(selected)}
      >
        {busy ? t("picker.choosing") : t("picker.choose", { name: selected ? translate(selected, "theme.name") : "..." })}
      </button>
    </section>
  );
}
