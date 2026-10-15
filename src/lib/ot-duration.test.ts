import { describe, expect, it } from "vitest";
import { formatWorkDuration, getWorkDurationLabel, getWorkDurationMinutes, isValidTimeString } from "@/lib/ot-duration";

describe("ot-duration helpers", () => {
  it("validates HH:mm time strings", () => {
    expect(isValidTimeString("08:00")).toBe(true);
    expect(isValidTimeString("23:59")).toBe(true);
    expect(isValidTimeString("24:00")).toBe(false);
    expect(isValidTimeString("8:00")).toBe(false);
    expect(isValidTimeString("")).toBe(false);
  });

  it("computes same-day duration in minutes", () => {
    expect(getWorkDurationMinutes("08:00", "17:00")).toBe(9 * 60);
    expect(getWorkDurationMinutes("08:00", "17:30")).toBe(9 * 60 + 30);
  });

  it("rolls over past midnight when end is not after start", () => {
    expect(getWorkDurationMinutes("22:00", "06:00")).toBe(8 * 60);
    expect(getWorkDurationMinutes("20:00", "20:00")).toBe(24 * 60);
  });

  it("returns null for missing or invalid input", () => {
    expect(getWorkDurationMinutes(undefined, "06:00")).toBeNull();
    expect(getWorkDurationMinutes("22:00", undefined)).toBeNull();
    expect(getWorkDurationMinutes("22:70", "06:00")).toBeNull();
  });

  it("formats durations", () => {
    expect(formatWorkDuration(11 * 60)).toBe("11h");
    expect(formatWorkDuration(15 * 60 + 30)).toBe("15h 30 mins");
  });

  it("produces a label end-to-end", () => {
    expect(getWorkDurationLabel("08:00", "19:30")).toBe("11h 30 mins");
    expect(getWorkDurationLabel(undefined, undefined)).toBeNull();
  });
});
