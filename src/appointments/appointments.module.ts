import { Module } from '@nestjs/common';
import { AvailabilityModule } from '../availability/availability.module';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { IdempotencyService } from './idempotency.service';

/**
 * Appointments module for transactional booking lifecycle.
 */
@Module({
  imports: [AvailabilityModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService, IdempotencyService],
})
export class AppointmentsModule {}
