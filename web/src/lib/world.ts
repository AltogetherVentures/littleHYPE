/**
 * The world a visitor was reading about when they clicked "start". Kept in the browser only,
 * so the theme picker after payment can pre-select it (they can still pick another).
 */
const KEY = "lh_world";

export function rememberWorld(slug: string) {
  try {
    localStorage.setItem(KEY, slug);
  } catch {
    // Private mode or storage off: the picker simply starts unselected.
  }
}

export function rememberedWorld(valid: readonly string[]): string | null {
  try {
    const v = localStorage.getItem(KEY);
    return v && valid.includes(v) ? v : null;
  } catch {
    return null;
  }
}
