import {
  addMinutes,
  hasIntervalOverlap,
} from './date-interval.util';

describe('date-interval.util', () => {
  it('detects overlapping intervals', () => {
    const actualOverlap: boolean = hasIntervalOverlap(
      new Date('2026-09-15T09:00:00.000Z'),
      new Date('2026-09-15T10:00:00.000Z'),
      new Date('2026-09-15T09:30:00.000Z'),
      new Date('2026-09-15T10:30:00.000Z'),
    );
    expect(actualOverlap).toBe(true);
  });

  it('allows back-to-back intervals', () => {
    const actualOverlap: boolean = hasIntervalOverlap(
      new Date('2026-09-15T09:00:00.000Z'),
      new Date('2026-09-15T10:00:00.000Z'),
      new Date('2026-09-15T10:00:00.000Z'),
      new Date('2026-09-15T11:00:00.000Z'),
    );
    expect(actualOverlap).toBe(false);
  });

  it('adds minutes to a date', () => {
    const actualEnd: Date = addMinutes(
      new Date('2026-09-15T09:00:00.000Z'),
      180,
    );
    expect(actualEnd.toISOString()).toBe('2026-09-15T12:00:00.000Z');
  });
});
