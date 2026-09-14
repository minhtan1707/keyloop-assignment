/**
 * Internal result of an availability search.
 */
export type AvailabilitySlot = {
  readonly technicianId: string;
  readonly serviceBayId: string;
  readonly startsAt: Date;
  readonly endsAt: Date;
};

/**
 * Input used by the availability domain service.
 */
export type FindAvailabilityInput = {
  readonly dealershipId: string;
  readonly serviceTypeId: string;
  readonly desiredStartAt: Date;
  readonly durationMinutes: number;
  readonly qualifiedTechnicianIds: readonly string[];
  readonly serviceBayIds: readonly string[];
  readonly occupiedIntervals: readonly OccupiedInterval[];
};

/**
 * Occupied interval loaded from resource_calendar.
 */
export type OccupiedInterval = {
  readonly resourceType: string;
  readonly resourceId: string;
  readonly startsAt: Date;
  readonly endsAt: Date;
};
