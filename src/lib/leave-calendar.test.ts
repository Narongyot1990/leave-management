import { describe, expect, it } from "vitest";
import {
  buildDateKey,
  leaveSpansDateKey,
  leaveStartsInMonth,
  otInMonth,
  otMatchesDateKey,
  padDatePart,
  toDateKey,
} from "@/lib/leave-calendar";

describe("leave-calendar helpers", () => {
  it("builds stable date keys", () => {
    expect(padDatePart(4)).toBe("04");
    expect(buildDateKey(2026, 3, 2)).toBe("2026-04-02");
  });

  it("normalizes ISO strings and Date objects into date keys", () => {
    expect(toDateKey("2026-04-15T00:00:00.000Z")).toBe("2026-04-15");
    expect(toDateKey(new Date(2026, 3, 15))).toBe("2026-04-15");
  });

  it("matches leave ranges inclusively by date key", () => {
    expect(leaveSpansDateKey("2026-04-02T00:00:00.000Z", "2026-04-03T00:00:00.000Z", "2026-04-02")).toBe(true);
    expect(leaveSpansDateKey("2026-04-02T00:00:00.000Z", "2026-04-03T00:00:00.000Z", "2026-04-03")).toBe(true);
    expect(leaveSpansDateKey("2026-04-02T00:00:00.000Z", "2026-04-03T00:00:00.000Z", "2026-04-04")).toBe(false);
  });

  it("filters month exports by leave start month", () => {
    expect(leaveStartsInMonth("2026-04-15T00:00:00.000Z", 2026, 3)).toBe(true);
    expect(leaveStartsInMonth("2026-03-31T00:00:00.000Z", 2026, 3)).toBe(false);
  });

  it("matches a single OT date by date key", () => {
    expect(otMatchesDateKey("2026-04-02T00:00:00.000Z", "2026-04-02")).toBe(true);
    expect(otMatchesDateKey("2026-04-02T00:00:00.000Z", "2026-04-03")).toBe(false);
  });

  it("filters OT records by month", () => {
    expect(otInMonth("2026-04-15T00:00:00.000Z", 2026, 3)).toBe(true);
    expect(otInMonth("2026-03-31T00:00:00.000Z", 2026, 3)).toBe(false);
  });
});
