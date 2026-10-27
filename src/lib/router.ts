/** Matches a pattern like "/api/admin/users/:id/theme" against a pathname. */
export function matchPath(pattern: string, pathname: string): Record<string, string> | null {
  const patternParts = pattern.split("/").filter(Boolean);
  const pathParts = pathname.split("/").filter(Boolean);
  if (patternParts.length !== pathParts.length) return null;

  const params: Record<string, string> = {};
  for (let i = 0; i < patternParts.length; i++) {
    const pattern = patternParts[i]!;
    const part = pathParts[i]!;
    if (pattern.startsWith(":")) {
      try {
        params[pattern.slice(1)] = decodeURIComponent(part);
      } catch {
        return null;
      }
    } else if (pattern !== part) {
      return null;
    }
  }
  return params;
}
