import { useAuth } from "@clerk/clerk-react";
import { useCallback } from "react";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
  }
}

export type ApiFn = <T>(path: string, init?: { method?: string; body?: unknown }) => Promise<T>;

/** fetch wrapper that attaches the Clerk session token and throws ApiError on non-2xx. */
export function useApi(): ApiFn {
  const { getToken } = useAuth();
  return useCallback<ApiFn>(
    async (path, init) => {
      const token = await getToken();
      const response = await fetch(path, {
        method: init?.method ?? "GET",
        headers: {
          ...(token ? { authorization: `Bearer ${token}` } : {}),
          ...(init?.body !== undefined ? { "content-type": "application/json" } : {}),
        },
        body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new ApiError(response.status, payload.error ?? "request_failed");
      return payload as never;
    },
    [getToken],
  );
}
