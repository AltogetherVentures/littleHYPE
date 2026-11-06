import { useAuth } from "@clerk/clerk-react";
import type { HabitCategory } from "@shared/categories";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef } from "react";
import { useApi } from "./api";

export interface TitleView {
  category: HabitCategory;
  key: string;
  rank: 1 | 2 | 3 | 4;
  streakDays: number;
  habitId: string;
}
export interface BreakCardView {
  id: string;
  category: HabitCategory;
  lengthDays: number;
  brokenOn: string;
}
export interface ReferralView {
  code: string;
  link: string;
  pending: number;
  confirmed: number;
  creditsEarned: number;
  creditsRedeemed: number;
  nextCreditIn: number;
}

export const TITLE_KEY = ["title"] as const;
export const BREAK_CARD_KEY = ["break-card"] as const;
export const REFERRALS_KEY = ["referrals"] as const;

export function useTitle() {
  const api = useApi();
  return useQuery({ queryKey: TITLE_KEY, queryFn: () => api<{ title: TitleView | null }>("/api/title"), staleTime: 30_000 });
}

export function useBreakCard() {
  const api = useApi();
  return useQuery({ queryKey: BREAK_CARD_KEY, queryFn: () => api<{ card: BreakCardView | null }>("/api/break-card"), staleTime: 60_000 });
}

export function useDismissBreakCard() {
  const api = useApi();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/api/break-card/${id}/dismiss`, { method: "POST" }),
    onSuccess: () => client.setQueryData(BREAK_CARD_KEY, { card: null }),
  });
}

export function useReferrals() {
  const api = useApi();
  return useQuery({ queryKey: REFERRALS_KEY, queryFn: () => api<ReferralView>("/api/referrals") });
}

export function useRecordShare() {
  const api = useApi();
  return useCallback((cardType: "title" | "break") => api("/api/share-events", { method: "POST", body: { cardType } }).catch(() => undefined), [api]);
}

export interface CardParams {
  type: "title" | "break";
  format: "story" | "square";
  showName: boolean;
  cardId?: string;
}

/** Fetches a share card's SVG (with the session token) and turns it into a PNG the browser can share. */
export function useShareCardImage() {
  const { getToken } = useAuth();
  // A stable function whatever the auth hook hands back, so callers can list it as an effect dependency.
  const tokenRef = useRef(getToken);
  tokenRef.current = getToken;
  return useCallback(
    async (params: CardParams): Promise<{ svg: string; png: Blob }> => {
      const query = new URLSearchParams({ type: params.type, format: params.format });
      if (params.showName) query.set("showName", "1");
      if (params.cardId) query.set("card", params.cardId);
      const token = await tokenRef.current();
      const response = await fetch(`/api/share/card?${query}`, { headers: token ? { authorization: `Bearer ${token}` } : {} });
      if (!response.ok) throw new Error(`card_${response.status}`);
      const svg = await response.text();
      return { svg, png: await svgToPng(svg, params.format === "story" ? [1080, 1920] : [1080, 1080]) };
    },
    [],
  );
}

/** Draws an SVG (fonts embedded in it) onto a canvas at its natural size and encodes a PNG. */
export async function svgToPng(svg: string, [width, height]: [number, number]): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const image = new Image();
    image.width = width;
    image.height = height;
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("card_render_failed"));
      image.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d")!.drawImage(image, 0, 0, width, height);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("card_encode_failed"))), "image/png"));
  } finally {
    URL.revokeObjectURL(url);
  }
}
