import { useT, type StringKey } from "../lib/strings";

const MOUTHS: Record<number, string> = {
  1: "M8 17c1-2 2.5-3 4-3s3 1 4 3",
  2: "M8.5 16.5c1-1 2.2-1.5 3.5-1.5s2.5.5 3.5 1.5",
  3: "M8.5 15.5h7",
  4: "M8.5 14.5c1 1.2 2.2 1.8 3.5 1.8s2.5-.6 3.5-1.8",
  5: "M7.5 13.5c1 2.4 2.7 3.5 4.5 3.5s3.5-1.1 4.5-3.5z",
};

export function MoodFace({ mood }: { mood: number }) {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" />
      <path d="M9 9.5v.5M15 9.5v.5" strokeWidth="2.2" />
      <path d={MOUTHS[mood]} />
    </svg>
  );
}

/** Five moods, one tap, and one more tap to clear (JN-7). A radio group, so it works by keyboard. */
export function MoodPicker({ value, onChange }: { value: number | null; onChange: (mood: number | null) => void }) {
  const t = useT();
  return (
    <fieldset className="mood-picker">
      <legend>{t("journal.mood.label")}</legend>
      <div className="mood-options">
        {[1, 2, 3, 4, 5].map((m) => (
          <label key={m} className="mood-option" data-mood={m} data-selected={value === m}>
            <input type="radio" name="mood" checked={value === m} onChange={() => onChange(m)} onClick={() => value === m && onChange(null)} />
            <MoodFace mood={m} />
            <span>{t(`journal.mood.${m}` as StringKey)}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
