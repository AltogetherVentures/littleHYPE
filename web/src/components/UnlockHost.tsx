import { useEffect } from "react";
import { achievementCopy } from "../lib/content";
import { useMarkSeen, useUnseenAchievements } from "../lib/achievements";
import { unlockFor } from "../lib/overrides";
import { useT, type StringKey } from "../lib/strings";
import { AchievementEmblem } from "./AchievementEmblem";

/**
 * Shows the unlock moment for anything earned and not yet celebrated, one at a time, in the
 * theme's own staging (TH-11). "Seen" is stored on the server, so an achievement is
 * celebrated once, on whichever device the person is using when it lands.
 */
export function UnlockHost({ theme }: { theme: string }) {
  const t = useT();
  const { data } = useUnseenAchievements();
  const markSeen = useMarkSeen();
  const queue = data?.unseen ?? [];
  const current = queue[0];
  const Unlock = unlockFor(theme);

  const dismiss = () => {
    if (current && !markSeen.isPending) markSeen.mutate(current.key);
  };

  useEffect(() => {
    if (!current) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && dismiss();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.key, markSeen.isPending]);

  if (!current) return null;
  const copy = achievementCopy(theme, current.key);
  return (
    <Unlock
      key={current.key}
      name={copy.name}
      description={copy.description}
      unlock={copy.unlock}
      emblem={<AchievementEmblem family={current.family} size={56} />}
      remaining={queue.length - 1}
      onDismiss={dismiss}
      t={(key, vars) => t(key as StringKey, vars)}
    />
  );
}
