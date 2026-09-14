/**
 * Snake_case appointment payload returned by the API.
 */
export type AppointmentResponse = {
  readonly id: string;
  readonly status: string;
  readonly customer_id: string;
  readonly vehicle_id: string;
  readonly dealership_id: string;
  readonly service_type_id: string;
  readonly technician_id: string;
  readonly service_bay_id: string;
  readonly starts_at: string;
  readonly ends_at: string;
};

/**
 * Snake_case availability check payload.
 */
export type AvailabilityCheckResponse = {
  readonly is_available: boolean;
  readonly technician_id: string | null;
  readonly service_bay_id: string | null;
  readonly starts_at: string | null;
  readonly ends_at: string | null;
  readonly message: string;
};

/**
 * Snake_case calendar occupancy payload.
 */
export type ResourceCalendarResponse = {
  readonly id: string;
  readonly dealership_id: string;
  readonly resource_type: string;
  readonly resource_id: string;
  readonly kind: string;
  readonly starts_at: string;
  readonly ends_at: string;
  readonly appointment_id: string | null;
  readonly reason: string | null;
};
