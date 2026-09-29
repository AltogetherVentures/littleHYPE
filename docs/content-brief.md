# Theme content brief

The contract for the words a theme supplies. A new theme needs a folder `themes/<slug>/` containing the files below, written in that theme's voice. `themes/default/` holds the plain, neutral versions that every theme falls back to for any missing key. Language is British English. No emojis. No borrowed names, characters, catchphrases, creatures or places from any existing book, film, show or game (TH-15). Never mention money, refunds, privacy or deletion (that copy is always plain default wording, TH-13). Never include or imply any journal content.

## Theme voices (from the PRD "Theme briefs")

**Space Log.** You are the captain of your own mission. Wonder, focus and quiet progress through the dark; every day logged moves the ship further. Voice: calm mission-control confidence; short, clipped, a little formal ("Log recorded. Orbit stable."). Encouraging, never cheesy. Avoid: lasers, battles, aliens as threats. Exploration, not conflict.

**NoteBook.** Sitting down with your favourite notebook and a good pen. Calm, personal, unhurried; a small daily ritual just for you. Voice: warm, gentle, a little personal, like a friend's note in the margin ("Nice one. That's three days in a row."). Never pushy. Avoid: heavy gamification, pressure language. Missed days are gentle, never shaming.

**SpellBook.** A student at an ancient magical academy, growing more powerful with every day of practice. Curiosity, mastery, a touch of mischief. Voice: wise and playful, like a favourite professor ("Your ritual holds strong, apprentice. Seven days of practice."). Rich vocabulary, still easy to read. Avoid: anything from specific wizarding franchises (schools, houses, owls, spell names, sports); keep magic generic and original.

**Day Zero.** The world ended and you are still here. Grit, tension, dark humour; every habit kept is another day survived. Voice: dry, deadpan survivor humour ("Day 47. Still breathing. Supplies secured."). Tough love, never cruel. Avoid: gore, graphic violence, real-world disaster references. Tension comes from atmosphere and humour.

**Default.** Plain, friendly, neutral. No theme voice at all.

## Vocabulary (use it, do not invent alternatives)

| Concept | Space Log | NoteBook | SpellBook | Day Zero |
|---|---|---|---|---|
| Journal entry | Log entry | Page | Scroll | Survival log |
| Prompt | Transmission | Prompt | Riddle | Radio question |
| Habit | Mission objective | Habit | Ritual | Survival task |
| Check-in | Complete | Tick | Cast | Secured |
| Streak | Orbit streak | Streak | Enchantment | Days survived |
| Missed day | Signal lost | Missed page | Fizzled | Close call |
| Skipped day | Scheduled rest | Rest day | Study break | Holed up |
| Achievement | Mission patch | Sticker | Spell learned | Survival badge |
| Reminder email | Incoming transmission | A gentle note | A summons | Radio check-in |
| Streak-break card | Mission failure report | Crumpled page | Spell backfired | Cause of death |

## Files

### `prompts.json`: 60 journal prompts
An object mapping each prompt key to one wording. Each is a single question or instruction, at most 110 characters, answerable in a few sentences, in the theme voice. Every one of the 60 keys is required. The key names the topic; the intent below says what it is asking.

Reflection: `reflect.off_course` what did not go to plan today; `reflect.proud_of` something you are proud of; `reflect.learned` something you learned; `reflect.surprised` something that surprised you; `reflect.hardest_moment` the hardest moment and how you handled it; `reflect.energy` what gave or drained your energy; `reflect.would_redo` something you would do differently; `reflect.avoided` something you put off or avoided; `reflect.turning_point` a moment the day changed direction; `reflect.habit_win` a habit you kept and how it felt; `reflect.time_well_spent` where your time was well spent; `reflect.stuck_on` what you are stuck on; `reflect.someone_helped` someone you helped or who helped you; `reflect.change_mind` something you changed your mind about; `reflect.old_self` what you would tell yourself a year ago.

Gratitude: `gratitude.small_win` one small win; `gratitude.person` a person you are glad is in your life; `gratitude.comfort` a small comfort you enjoyed; `gratitude.unexpected` something unexpectedly good; `gratitude.body` something your body did well; `gratitude.place` a place that made you feel good; `gratitude.skill` a skill you are glad to have; `gratitude.taste` something good you ate or drank; `gratitude.kindness` a kindness you noticed; `gratitude.challenge` a challenge that is teaching you something; `gratitude.morning` something good about this morning; `gratitude.tech` a tool or bit of technology that helped; `gratitude.nature` something from nature you noticed; `gratitude.memory` a happy memory that surfaced; `gratitude.tomorrow` something you are looking forward to.

Goals: `goals.tomorrow` tomorrow's main aim; `goals.this_week` what would make this week a good one; `goals.one_thing` the one thing that matters most next; `goals.first_step` the first small step on something big; `goals.obstacle` an obstacle and how to get round it; `goals.habit_next` a habit you want to build next; `goals.stop_doing` something you want to stop doing; `goals.month_ahead` where you want to be in a month; `goals.stretch` something that stretches you a little; `goals.who_help` who could help you with a goal; `goals.finish` something you will finish; `goals.learn` something you want to learn; `goals.rest_plan` how you will rest and recharge soon; `goals.big_picture` the bigger picture behind today's effort; `goals.tiny_win` a tiny win you can secure tomorrow.

Wellbeing: `wellbeing.mood_word` one word for how you feel; `wellbeing.body_check` how your body feels right now; `wellbeing.sleep` how you slept and what would help; `wellbeing.stress` what is weighing on you; `wellbeing.recharge` what recharges you; `wellbeing.boundaries` a boundary you kept or need; `wellbeing.breath` take a slow breath and note what you notice; `wellbeing.move` how you moved today; `wellbeing.screen_time` how screens made you feel today; `wellbeing.connection` who you connected with; `wellbeing.fuel` how you fuelled yourself; `wellbeing.worry_park` a worry to set down for tonight; `wellbeing.joy` a moment of joy; `wellbeing.kind_self` something kind you can say to yourself; `wellbeing.pause` when you paused today and what it gave you.

Examples of the three-way voice (for tone only; write your own for every key):
| key | Space Log | NoteBook | SpellBook | Day Zero |
|---|---|---|---|---|
| reflect.off_course | Captain's log: what went off course today? | What didn't go to plan today? | Which spell misfired today, and why? | What nearly got you today? |
| gratitude.small_win | Report one small victory from today's mission. | What's one small thing you want to remember? | What small bit of magic went right today? | What's one thing worth surviving for today? |
| goals.tomorrow | Set tomorrow's primary objective. | What would make tomorrow a good day? | Which spell will you practise tomorrow? | What's tomorrow's supply run? |

### `achievements.json`: 14 achievements
An object mapping each achievement key to `{ "name", "description", "unlock" }`. `name` is 1 to 4 words, in the theme's word for an achievement. `description` (at most 90 characters) says what earns it, plainly enough that the rule is clear. `unlock` (at most 90 characters) is the celebratory line shown at the unlock moment, in voice. The keys and what earns them:

`first_entry` save your first journal entry; `first_checkin` your first habit check-in; `streak_3` a 3-day streak on any habit; `streak_7` 7-day streak; `streak_14` 14-day streak; `streak_30` 30-day streak; `streak_60` 60-day streak; `streak_100` 100-day streak; `entries_7` write on 7 different days; `entries_30` write on 30 different days; `entries_100` write on 100 different days; `prompts_10` answer 10 prompts; `prompts_50` answer 50 prompts; `habits_3` hold a 7-day streak on three habits at once.

Achievements reward consistency, so never mention word counts or volume. Names should feel like a progression within a family (the streak ones grow more impressive).

### `titles.json`: 32 titles
An object keyed `"<category>.rank<n>"` for the eight categories `hydration`, `exercise`, `sleep`, `reading`, `mindfulness`, `screentime`, `diet`, `other` and ranks 1 to 4. Rank 1 is a beginner (streak 1 to 6 days), rank 2 is established (7 to 29), rank 3 is a master (30 to 99), rank 4 is legendary (100 or more). Each is a short, funny, shareable title of 2 to 6 words. The text may contain `{streak}`, replaced by the streak length in days (for example `Cardio Survivor, Day {streak}`), but should not need it. Titles refer to the category topic only, never to a person's habit name. Examples for tone: SpellBook hydration rank 3 "Archmage of Hydration"; Day Zero exercise "Cardio Survivor, Day {streak}".

### `break-cards.json`: the streak-break card
An object `{ "name": string, "variants": string[4], "restart": string }`. `name` is the card's title in the theme's word (see the vocabulary table). `variants` are four alternative jokes that turn a broken streak of 7 or more days into a laugh rather than a reason to quit. Each may use `{category}` (the habit's category label such as "Hydration"), `{length}` (days the streak lasted) and must read well when both are filled in. Kind underneath, funny on top; never mean. `restart` is one short line inviting the user to begin again. Examples for tone: Space Log "Contact lost with the {category} mission after {length} days. Last known position: somewhere near the couch."; Day Zero "Here lies the {category} streak. Survived {length} days. Taken by the horde on a rainy Tuesday."

### `suggestions.json`: onboarding habit suggestions
An object mapping each of the eight categories to `{ "name", "description" }`: a first habit the user can pick in one tap, named and described in the theme's voice. `name` at most 32 characters (use the theme's word for a habit only if it reads naturally), `description` at most 80 characters. Sensible, small, easy first habits (for `other`, something generic like a daily check-in).

### `email.json`: the daily reminder email
An object with `subject` (at most 60 characters), `preheader` (at most 90), `heading` (at most 40), `body` (1 to 2 short sentences), `cta` (button text, at most 24), `footer` (one short line saying why they got it), `unsubscribe` (link text). Voice: the theme's "reminder email" concept from the vocabulary table. Never mention journal content, streak numbers or names; it is sent to people who have not yet checked in and written today.

## Rules for every file
- Valid JSON, UTF-8, two-space indent, every required key present, no extra keys, no comments.
- Do not reuse the same wording across themes: each theme should be recognisably itself.
- Keep within the stated length limits.
- `themes/default/` versions are plain and neutral, with no theme flavour, using ordinary words (entry, habit, streak, achievement, prompt).
