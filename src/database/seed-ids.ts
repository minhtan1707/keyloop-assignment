/**
 * Stable UUIDs used by seed data and README curl examples.
 * Values are RFC UUID v4-shaped so class-validator @IsUUID() accepts them.
 */
export const SeedIds = {
  dealershipId: '11111111-1111-4111-8111-111111111111',
  customerId: '22222222-2222-4222-8222-222222222222',
  vehicleId: '33333333-3333-4333-8333-333333333333',
  oilChangeServiceTypeId: '44444444-4444-4444-8444-444444444401',
  fullServiceTypeId: '44444444-4444-4444-8444-444444444402',
  technicianOilId: '55555555-5555-4555-8555-555555555501',
  technicianFullId: '55555555-5555-4555-8555-555555555502',
  technicianBothId: '55555555-5555-4555-8555-555555555503',
  serviceBayOneId: '66666666-6666-4666-8666-666666666601',
  serviceBayTwoId: '66666666-6666-4666-8666-666666666602',
  advisorUserId: '77777777-7777-4777-8777-777777777701',
  managerUserId: '77777777-7777-4777-8777-777777777702',
} as const;
