import { describe, expect, it } from "vitest";
import { dayLabel, monthGrid, monthLabel, shiftMonth } from "./calendar";

describe("calendar model", () => {
  it("shifts months across year boundaries", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-09", 0)).toBe("2026-09");
    expect(shiftMonth("2026-03", -15)).toBe("2024-12");
  });

  it("lays a month out Monday first, padded with blanks", () => {
    // September 2026 starts on a Tuesday and has 30 days.
    const weeks = monthGrid("2026-09", [], "2026-09-15");
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    expect(weeks[0]![0]).toBeNull();
    expect(weeks[0]![1]!.date).toBe("2026-09-01");
    expect(weeks.flat().filter(Boolean)).toHaveLength(30);
    expect(weeks).toHaveLength(5);
    expect(weeks.at(-1)!.at(-1)).toBeNull();
  });

  it("handles a month that starts on Monday and a February in a leap year", () => {
    expect(monthGrid("2026-06", [], "2026-06-01")[0]![0]!.date).toBe("2026-06-01");
    expect(monthGrid("2028-02", [], "2028-02-01").flat().filter(Boolean)).toHaveLength(29);
    // 1 February 2026 is a Sunday: six blanks, then 28 days, so five rows
    expect(monthGrid("2026-02", [], "2026-02-01")).toHaveLength(5);
  });

  it("marks today, the future and days with entries", () => {
    const grid = monthGrid("2026-09", [{ date: "2026-09-10", count: 2, mood: 4 }], "2026-09-15").flat().filter(Boolean);
    const at = (d: string) => grid.find((c) => c!.date === d)!;
    expect(at("2026-09-10")).toMatchObject({ count: 2, mood: 4, isFuture: false, isToday: false });
    expect(at("2026-09-15")).toMatchObject({ isToday: true, isFuture: false, count: 0 });
    expect(at("2026-09-16").isFuture).toBe(true);
  });

  it("labels months and days", () => {
    expect(monthLabel("2026-09")).toBe("September 2026");
    expect(dayLabel("2026-09-30")).toBe("Wednesday, 30 September 2026");
  });
});
