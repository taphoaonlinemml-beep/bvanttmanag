export type PersonnelStatus = "active" | "inactive";
export type PersonnelAgeGroup = "under_70" | "from_70" | "unknown";

export function derivePersonnelStatus(leftAt?: Date | null): PersonnelStatus {
  return leftAt ? "inactive" : "active";
}

export function calculateAge(dateOfBirth?: Date | null, now = new Date()): number | null {
  if (!dateOfBirth) return null;

  let age = now.getUTCFullYear() - dateOfBirth.getUTCFullYear();
  const monthDifference = now.getUTCMonth() - dateOfBirth.getUTCMonth();
  const dayDifference = now.getUTCDate() - dateOfBirth.getUTCDate();

  if (monthDifference < 0 || (monthDifference === 0 && dayDifference < 0)) age -= 1;
  return Math.max(age, 0);
}

export function calculateServiceMonths(joinedAt?: Date | null, endAt?: Date | null, now = new Date()): number | null {
  if (!joinedAt) return null;

  const effectiveEnd = endAt ?? now;
  if (effectiveEnd < joinedAt) return 0;

  let months = (effectiveEnd.getUTCFullYear() - joinedAt.getUTCFullYear()) * 12;
  months += effectiveEnd.getUTCMonth() - joinedAt.getUTCMonth();
  if (effectiveEnd.getUTCDate() < joinedAt.getUTCDate()) months -= 1;

  return Math.max(months, 0);
}

export function isSenior70(dateOfBirth?: Date | null, now = new Date()): boolean | null {
  const age = calculateAge(dateOfBirth, now);
  return age === null ? null : age >= 70;
}

export function getPersonnelAgeGroup(dateOfBirth?: Date | null, now = new Date()): PersonnelAgeGroup {
  const age = calculateAge(dateOfBirth, now);
  if (age === null) return "unknown";
  return age >= 70 ? "from_70" : "under_70";
}

export function matchesPersonnelAgeGroup(dateOfBirth: Date | null | undefined, ageGroup?: PersonnelAgeGroup, now = new Date()) {
  return !ageGroup || getPersonnelAgeGroup(dateOfBirth, now) === ageGroup;
}
