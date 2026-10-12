/**
 * Journal prompts are defined once, by stable key and category (PR-1). Each theme
 * supplies its own wording per key in themes/<slug>/prompts.json (PR-2); entries
 * store only the key (PR-6), so wording can change without touching user data.
 * See docs/content-brief.md for what each key is asking.
 */
export const PROMPT_CATEGORIES = ["reflection", "gratitude", "goals", "wellbeing"] as const;
export type PromptCategory = (typeof PROMPT_CATEGORIES)[number];

export const PROMPT_KEYS = [
  // reflection
  "reflect.off_course", "reflect.proud_of", "reflect.learned", "reflect.surprised", "reflect.hardest_moment",
  "reflect.energy", "reflect.would_redo", "reflect.avoided", "reflect.turning_point", "reflect.habit_win",
  "reflect.time_well_spent", "reflect.stuck_on", "reflect.someone_helped", "reflect.change_mind", "reflect.old_self",
  // gratitude
  "gratitude.small_win", "gratitude.person", "gratitude.comfort", "gratitude.unexpected", "gratitude.body",
  "gratitude.place", "gratitude.skill", "gratitude.taste", "gratitude.kindness", "gratitude.challenge",
  "gratitude.morning", "gratitude.tech", "gratitude.nature", "gratitude.memory", "gratitude.tomorrow",
  // goals
  "goals.tomorrow", "goals.this_week", "goals.one_thing", "goals.first_step", "goals.obstacle",
  "goals.habit_next", "goals.stop_doing", "goals.month_ahead", "goals.stretch", "goals.who_help",
  "goals.finish", "goals.learn", "goals.rest_plan", "goals.big_picture", "goals.tiny_win",
  // wellbeing
  "wellbeing.mood_word", "wellbeing.body_check", "wellbeing.sleep", "wellbeing.stress", "wellbeing.recharge",
  "wellbeing.boundaries", "wellbeing.breath", "wellbeing.move", "wellbeing.screen_time", "wellbeing.connection",
  "wellbeing.fuel", "wellbeing.worry_park", "wellbeing.joy", "wellbeing.kind_self", "wellbeing.pause",
] as const;

export type PromptKey = (typeof PROMPT_KEYS)[number];

export function promptCategory(key: PromptKey): PromptCategory {
  const prefix = key.split(".")[0];
  switch (prefix) {
    case "reflect":
      return "reflection";
    case "gratitude":
      return "gratitude";
    case "goals":
      return "goals";
    default:
      return "wellbeing";
  }
}

export function isPromptKey(value: unknown): value is PromptKey {
  return typeof value === "string" && (PROMPT_KEYS as readonly string[]).includes(value);
}
