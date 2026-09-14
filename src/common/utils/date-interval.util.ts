/**
 * Returns true when two half-open intervals [startA, endA) and [startB, endB) overlap.
 */
export function hasIntervalOverlap(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date,
): boolean {
  return startA < endB && startB < endA;
}

/**
 * Adds minutes to a date and returns a new Date instance.
 */
export function addMinutes(startAt: Date, durationMinutes: number): Date {
  return new Date(startAt.getTime() + durationMinutes * 60_000);
}

/**
 * Builds a deterministic advisory lock key for a resource.
 */
export function buildResourceLockKey(
  resourceType: string,
  resourceId: string,
): string {
  return `${resourceType}:${resourceId}`;
}
