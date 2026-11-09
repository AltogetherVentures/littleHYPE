import type { AchievementKey } from "@shared/achievement-defs";
import type { AchievementFamily, Progress } from "@shared/achievements";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "./api";

export interface AchievementView {
  key: AchievementKey;
  family: AchievementFamily;
  unlockedAt: string | null;
  seen: boolean;
  progress: Progress;
}

export interface UnseenAchievement {
  key: AchievementKey;
  family: AchievementFamily;
  unlockedAt: string;
}

export const ACHIEVEMENTS_KEY = ["achievements"] as const;
export const UNSEEN_KEY = ["achievements-unseen"] as const;

export function useAchievements() {
  const api = useApi();
  return useQuery({ queryKey: ACHIEVEMENTS_KEY, queryFn: () => api<{ achievements: AchievementView[] }>("/api/achievements") });
}

/** Unlocked but not yet celebrated. Asking also lets the server notice anything newly earned. */
export function useUnseenAchievements() {
  const api = useApi();
  return useQuery({ queryKey: UNSEEN_KEY, queryFn: () => api<{ unseen: UnseenAchievement[] }>("/api/achievements/unseen"), staleTime: 30_000 });
}

export function useMarkSeen() {
  const api = useApi();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (key: string) => api("/api/achievements/seen", { method: "POST", body: { keys: [key] } }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: UNSEEN_KEY });
      void client.invalidateQueries({ queryKey: ACHIEVEMENTS_KEY });
    },
  });
}

/** After a check-in or a saved entry: look again for anything newly unlocked. */
export function invalidateAchievements(client: ReturnType<typeof useQueryClient>) {
  void client.invalidateQueries({ queryKey: UNSEEN_KEY });
  void client.invalidateQueries({ queryKey: ACHIEVEMENTS_KEY });
}
