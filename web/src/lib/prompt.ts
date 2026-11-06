import type { PromptKey } from "@shared/prompt-keys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "./api";

export interface DailyPrompt {
  date: string;
  promptKey: PromptKey;
  skipsLeft: number;
  answeredBy: string | null;
}

export const PROMPT_KEY = ["prompt"] as const;

export function usePrompt() {
  const api = useApi();
  return useQuery({ queryKey: PROMPT_KEY, queryFn: () => api<DailyPrompt>("/api/prompt"), staleTime: 60_000 });
}

export function useSkipPrompt() {
  const api = useApi();
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => api<DailyPrompt>("/api/prompt/skip", { method: "POST" }),
    onSuccess: (prompt) => client.setQueryData(PROMPT_KEY, prompt),
    onError: () => void client.invalidateQueries({ queryKey: PROMPT_KEY }),
  });
}
