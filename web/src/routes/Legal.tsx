import { Link } from "react-router-dom";
import { useT, type StringKey } from "../lib/strings";

const SECTIONS = {
  privacy: ["what", "journal", "who", "transfer", "rights", "cookies"],
  terms: ["what", "refund", "use", "content", "changes"],
} as const;

/**
 * Privacy policy and terms (GD-3, PY-5). Plain neutral wording, and a banner saying it is a
 * draft: the text describes what the app actually does, but it needs a lawyer before launch.
 */
export function Legal({ kind }: { kind: keyof typeof SECTIONS }) {
  const t = useT();
  return (
    <main className="page-narrow legal">
      <p className="legal-draft" role="note">
        {t("legal.draft")}
      </p>
      <h1>{t(`legal.${kind}.title` as StringKey)}</h1>
      {SECTIONS[kind].map((s) => (
        <section key={s}>
          <h2>{t(`legal.${kind}.${s}.heading` as StringKey)}</h2>
          <p>{t(`legal.${kind}.${s}.body` as StringKey)}</p>
        </section>
      ))}
      <p>
        <Link to="/">{t("legal.back")}</Link>
      </p>
    </main>
  );
}
