import { useEffect, useRef, useState } from "react";
import { useRecordShare, useReferrals, useShareCardImage, type CardParams } from "../lib/sharing";
import { useT } from "../lib/strings";

/**
 * Share a card (SH-7 to SH-9): pick story or square, choose whether the habit's name shows
 * (off by default, SH-10), then use the phone's share sheet, or download the image, or copy
 * the link. Nothing is ever posted for the person, and only a count is recorded.
 */
export function ShareDialog({ type, cardId, onClose }: { type: "title" | "break"; cardId?: string; onClose: () => void }) {
  const t = useT();
  const render = useShareCardImage();
  const record = useRecordShare();
  const referrals = useReferrals();
  const [format, setFormat] = useState<CardParams["format"]>("story");
  const [showName, setShowName] = useState(false);
  const [state, setState] = useState<{ status: "loading" } | { status: "error" } | { status: "ready"; png: Blob; url: string }>({ status: "loading" });
  const [notice, setNotice] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let live = true;
    let objectUrl: string | null = null;
    setState({ status: "loading" });
    render({ type, format, showName, ...(cardId ? { cardId } : {}) })
      .then(({ png }) => {
        if (!live) return;
        objectUrl = URL.createObjectURL(png);
        setState({ status: "ready", png, url: objectUrl });
      })
      .catch(() => live && setState({ status: "error" }));
    return () => {
      live = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [render, type, format, showName, cardId]);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const file = state.status === "ready" ? new File([state.png], "littlehype.png", { type: "image/png" }) : null;
  const canShare = file !== null && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] });
  const link = referrals.data?.link ?? "";

  const share = async () => {
    if (!file) return;
    try {
      await navigator.share({ files: [file], text: link, url: link });
      void record(type);
    } catch {
      // the person closed the share sheet: not an error, and nothing was shared
    }
  };
  const download = () => {
    if (state.status !== "ready") return;
    const a = document.createElement("a");
    a.href = state.url;
    a.download = `littlehype-${type}-${format}.png`;
    document.body.append(a);
    a.click();
    a.remove();
    void record(type);
    setNotice(t("share.downloaded"));
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      void record(type);
      setNotice(t("share.copied"));
    } catch {
      setNotice(link);
    }
  };

  return (
    <div className="unlock-scrim share-scrim">
      <div className="unlock-card share-card" role="dialog" aria-modal="true" aria-labelledby="share-title">
        <h2 id="share-title">{t("share.heading")}</h2>
        <div className="segmented" role="group" aria-label={t("share.format")}>
          <button type="button" className="segment" aria-pressed={format === "story"} onClick={() => setFormat("story")}>
            {t("share.story")}
          </button>
          <button type="button" className="segment" aria-pressed={format === "square"} onClick={() => setFormat("square")}>
            {t("share.square")}
          </button>
        </div>
        <div className="share-preview" data-format={format}>
          {state.status === "loading" && <p role="status">{t("common.loading")}</p>}
          {state.status === "error" && <p role="alert">{t("share.error")}</p>}
          {state.status === "ready" && <img src={state.url} alt={t("share.previewAlt")} />}
        </div>
        <label className="check-row">
          <input type="checkbox" checked={showName} onChange={(e) => setShowName(e.target.checked)} />
          <span>{t("share.showName")}</span>
        </label>
        <p className="share-note">{t("share.privacy")}</p>
        <div className="actions">
          {canShare && (
            <button type="button" className="button" onClick={() => void share()}>
              {t("share.share")}
            </button>
          )}
          <button type="button" className={canShare ? "link-button" : "button"} disabled={state.status !== "ready"} onClick={download}>
            {t("share.download")}
          </button>
          <button type="button" className="link-button" disabled={!link} onClick={() => void copy()}>
            {t("share.copyLink")}
          </button>
        </div>
        {notice && <p role="status">{notice}</p>}
        <button ref={closeRef} type="button" className="link-button" onClick={onClose}>
          {t("share.close")}
        </button>
      </div>
    </div>
  );
}
