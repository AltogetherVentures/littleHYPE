import { useAuth } from "@clerk/clerk-react";
import { useCallback } from "react";

/** Downloads one of the export files with the session token attached, then hands it to the browser as a file. */
export function useDownloadExport() {
  const { getToken } = useAuth();
  return useCallback(
    async (format: "json" | "md") => {
      const token = await getToken();
      const response = await fetch(`/api/export?format=${format}`, { headers: token ? { authorization: `Bearer ${token}` } : {} });
      if (!response.ok) throw new Error(`export_failed_${response.status}`);
      const filename = /filename="([^"]+)"/.exec(response.headers.get("content-disposition") ?? "")?.[1] ?? `littlehype-export.${format}`;
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    },
    [getToken],
  );
}
