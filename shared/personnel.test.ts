import { describe, expect, it } from "vitest";
import { calculateAge, calculateServiceMonths, derivePersonnelStatus, getPersonnelAgeGroup, isSenior70, matchesPersonnelAgeGroup } from "./personnel";

describe("personnel business rules", () => {
  const now = new Date("2026-08-13T00:00:00.000Z");

  it("calculates age consistently around birthdays and identifies the 70+ group", () => {
    expect(calculateAge(new Date("1956-08-13T00:00:00.000Z"), now)).toBe(70);
    expect(calculateAge(new Date("1956-08-14T00:00:00.000Z"), now)).toBe(69);
    expect(isSenior70(new Date("1956-08-13T00:00:00.000Z"), now)).toBe(true);
    expect(isSenior70(new Date("1956-08-14T00:00:00.000Z"), now)).toBe(false);
  });

  it("calculates completed service months and automatically derives participation status", () => {
    expect(calculateServiceMonths(new Date("2024-01-15T00:00:00.000Z"), new Date("2025-03-14T00:00:00.000Z"))).toBe(13);
    expect(calculateServiceMonths(new Date("2024-01-15T00:00:00.000Z"), new Date("2025-03-15T00:00:00.000Z"))).toBe(14);
    expect(derivePersonnelStatus(null)).toBe("active");
    expect(derivePersonnelStatus(new Date("2026-01-01T00:00:00.000Z"))).toBe("inactive");
  });

  it("classifies and matches personnel age groups for advanced filtering", () => {
    const birthday70 = new Date("1956-08-13T00:00:00.000Z");
    const birthday69 = new Date("1956-08-14T00:00:00.000Z");
    expect(getPersonnelAgeGroup(birthday70, now)).toBe("from_70");
    expect(getPersonnelAgeGroup(birthday69, now)).toBe("under_70");
    expect(getPersonnelAgeGroup(null, now)).toBe("unknown");
    expect(matchesPersonnelAgeGroup(birthday70, "from_70", now)).toBe(true);
    expect(matchesPersonnelAgeGroup(birthday70, "under_70", now)).toBe(false);
    expect(matchesPersonnelAgeGroup(null, "unknown", now)).toBe(true);
  });
});
