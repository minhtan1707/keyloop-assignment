import { AvailabilityService } from './availability.service';
import { ResourceType } from '../common/enums/resource-type.enum';

describe('AvailabilityService', () => {
  const availabilityService: AvailabilityService = new AvailabilityService();
  const desiredStartAt: Date = new Date('2026-09-15T09:00:00.000Z');

  it('returns a slot when technician and bay are free', () => {
    const actualSlot = availabilityService.findAvailableSlot({
      dealershipId: 'd1',
      serviceTypeId: 's1',
      desiredStartAt,
      durationMinutes: 60,
      qualifiedTechnicianIds: ['t2', 't1'],
      serviceBayIds: ['b2', 'b1'],
      occupiedIntervals: [],
    });
    expect(actualSlot).toEqual({
      technicianId: 't1',
      serviceBayId: 'b1',
      startsAt: desiredStartAt,
      endsAt: new Date('2026-09-15T10:00:00.000Z'),
    });
  });

  it('skips technicians blocked by busy calendar rows', () => {
    const actualSlot = availabilityService.findAvailableSlot({
      dealershipId: 'd1',
      serviceTypeId: 's1',
      desiredStartAt,
      durationMinutes: 60,
      qualifiedTechnicianIds: ['t1', 't2'],
      serviceBayIds: ['b1'],
      occupiedIntervals: [
        {
          resourceType: ResourceType.Technician,
          resourceId: 't1',
          startsAt: new Date('2026-09-15T00:00:00.000Z'),
          endsAt: new Date('2026-09-16T00:00:00.000Z'),
        },
      ],
    });
    expect(actualSlot?.technicianId).toBe('t2');
    expect(actualSlot?.serviceBayId).toBe('b1');
  });

  it('skips bays blocked by appointment calendar rows', () => {
    const actualSlot = availabilityService.findAvailableSlot({
      dealershipId: 'd1',
      serviceTypeId: 's1',
      desiredStartAt,
      durationMinutes: 60,
      qualifiedTechnicianIds: ['t1'],
      serviceBayIds: ['b1', 'b2'],
      occupiedIntervals: [
        {
          resourceType: ResourceType.ServiceBay,
          resourceId: 'b1',
          startsAt: new Date('2026-09-15T08:00:00.000Z'),
          endsAt: new Date('2026-09-15T12:00:00.000Z'),
        },
      ],
    });
    expect(actualSlot?.serviceBayId).toBe('b2');
  });

  it('returns null when every candidate is occupied', () => {
    const actualSlot = availabilityService.findAvailableSlot({
      dealershipId: 'd1',
      serviceTypeId: 's1',
      desiredStartAt,
      durationMinutes: 60,
      qualifiedTechnicianIds: ['t1'],
      serviceBayIds: ['b1'],
      occupiedIntervals: [
        {
          resourceType: ResourceType.Technician,
          resourceId: 't1',
          startsAt: new Date('2026-09-15T09:30:00.000Z'),
          endsAt: new Date('2026-09-15T10:30:00.000Z'),
        },
      ],
    });
    expect(actualSlot).toBeNull();
  });

  it('treats touching intervals as non-overlapping', () => {
    const actualSlot = availabilityService.findAvailableSlot({
      dealershipId: 'd1',
      serviceTypeId: 's1',
      desiredStartAt,
      durationMinutes: 60,
      qualifiedTechnicianIds: ['t1'],
      serviceBayIds: ['b1'],
      occupiedIntervals: [
        {
          resourceType: ResourceType.Technician,
          resourceId: 't1',
          startsAt: new Date('2026-09-15T08:00:00.000Z'),
          endsAt: new Date('2026-09-15T09:00:00.000Z'),
        },
      ],
    });
    expect(actualSlot).not.toBeNull();
  });
});
