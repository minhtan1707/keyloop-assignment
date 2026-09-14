import { Injectable } from '@nestjs/common';
import {
  AvailabilitySlot,
  FindAvailabilityInput,
  OccupiedInterval,
} from './availability.types';
import { ResourceType } from '../common/enums/resource-type.enum';
import {
  addMinutes,
  hasIntervalOverlap,
} from '../common/utils/date-interval.util';

/**
 * Pure domain service that selects a free bay and qualified technician.
 */
@Injectable()
export class AvailabilityService {
  /**
   * Finds the first free technician and bay for the requested window.
   * Assignment is deterministic: technicians then bays sorted by id ascending.
   */
  public findAvailableSlot(
    input: FindAvailabilityInput,
  ): AvailabilitySlot | null {
    const endsAt: Date = addMinutes(
      input.desiredStartAt,
      input.durationMinutes,
    );
    const technicianIds: string[] = [...input.qualifiedTechnicianIds].sort();
    const serviceBayIds: string[] = [...input.serviceBayIds].sort();
    for (const technicianId of technicianIds) {
      if (
        this.isResourceOccupied(
          input.occupiedIntervals,
          ResourceType.Technician,
          technicianId,
          input.desiredStartAt,
          endsAt,
        )
      ) {
        continue;
      }
      for (const serviceBayId of serviceBayIds) {
        if (
          this.isResourceOccupied(
            input.occupiedIntervals,
            ResourceType.ServiceBay,
            serviceBayId,
            input.desiredStartAt,
            endsAt,
          )
        ) {
          continue;
        }
        return {
          technicianId,
          serviceBayId,
          startsAt: input.desiredStartAt,
          endsAt,
        };
      }
    }
    return null;
  }

  private isResourceOccupied(
    occupiedIntervals: readonly OccupiedInterval[],
    resourceType: ResourceType,
    resourceId: string,
    startsAt: Date,
    endsAt: Date,
  ): boolean {
    return occupiedIntervals.some(
      (interval: OccupiedInterval) =>
        interval.resourceType === resourceType &&
        interval.resourceId === resourceId &&
        hasIntervalOverlap(
          startsAt,
          endsAt,
          interval.startsAt,
          interval.endsAt,
        ),
    );
  }
}
