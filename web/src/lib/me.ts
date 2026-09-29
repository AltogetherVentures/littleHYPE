import { useQuery } from "@tanstack/react-query";
import { DEFAULT_APP_PAGE } from "@shared/theme-routing";
import { useApi } from "./api";

export interface Me {
  userId: string;
  theme: string | null;
  timezone: string;
  paid: boolean;
  onboarded: boolean;
  reminderTime: string | null;
  isAdmin: boolean;
  createdAt: string;
}

export const ME_KEY = ["me"] as const;

export function useMe() {
  const api = useApi();
  return useQuery({ queryKey: ME_KEY, queryFn: () => api<Me>("/api/me"), staleTime: 60_000 });
}

/** Where a signed-in user belongs: paywall, then theme picker, then their own Today. */
export function homePathFor(me: Pick<Me, "theme" | "paid">): string {
  if (me.theme) return `/${me.theme}/${DEFAULT_APP_PAGE}`;
  return me.paid ? "/onboarding" : "/paywall";
}
