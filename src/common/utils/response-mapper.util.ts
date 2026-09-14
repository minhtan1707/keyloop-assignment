import { Appointment } from '../../appointments/entities/appointment.entity';
import { ResourceCalendar } from '../../schedule/entities/resource-calendar.entity';
import {
  AppointmentResponse,
  AvailabilityCheckResponse,
  ResourceCalendarResponse,
} from '../types/api-responses';
import { AvailabilitySlot } from '../../availability/availability.types';

/**
 * Maps an appointment entity to the public snake_case response.
 */
export function mapAppointmentResponse(
  appointment: Appointment,
): AppointmentResponse {
  return {
    id: appointment.id,
    status: appointment.status,
    customer_id: appointment.customer.id,
    vehicle_id: appointment.vehicle.id,
    dealership_id: appointment.dealership.id,
    service_type_id: appointment.serviceType.id,
    technician_id: appointment.technician.id,
    service_bay_id: appointment.serviceBay.id,
    starts_at: appointment.startsAt.toISOString(),
    ends_at: appointment.endsAt.toISOString(),
  };
}

/**
 * Maps an availability slot (or null) to the public response.
 */
export function mapAvailabilityCheckResponse(
  slot: AvailabilitySlot | null,
): AvailabilityCheckResponse {
  if (!slot) {
    return {
      is_available: false,
      technician_id: null,
      service_bay_id: null,
      starts_at: null,
      ends_at: null,
      message: 'No free technician and service bay for the requested window',
    };
  }
  return {
    is_available: true,
    technician_id: slot.technicianId,
    service_bay_id: slot.serviceBayId,
    starts_at: slot.startsAt.toISOString(),
    ends_at: slot.endsAt.toISOString(),
    message: 'Slot is available',
  };
}

/**
 * Maps a calendar row to the public snake_case response.
 */
export function mapResourceCalendarResponse(
  entry: ResourceCalendar,
): ResourceCalendarResponse {
  return {
    id: entry.id,
    dealership_id: entry.dealership.id,
    resource_type: entry.resourceType,
    resource_id: entry.resourceId,
    kind: entry.kind,
    starts_at: entry.startsAt.toISOString(),
    ends_at: entry.endsAt.toISOString(),
    appointment_id: entry.appointment?.id ?? null,
    reason: entry.reason ?? null,
  };
}
