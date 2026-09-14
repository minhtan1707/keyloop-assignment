import { Module } from '@nestjs/common';
import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';
import { AvailabilityQueryService } from './availability-query.service';

/**
 * Availability module exposing dry-run checks and pure domain logic.
 */
@Module({
  controllers: [AvailabilityController],
  providers: [AvailabilityService, AvailabilityQueryService],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}
