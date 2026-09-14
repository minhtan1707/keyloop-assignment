import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

/**
 * Request body to move an appointment to a new start time.
 */
export class RescheduleAppointmentDto {
  @ApiProperty({
    name: 'desired_start_at',
    example: '2026-09-18T10:00:00.000Z',
  })
  @IsDateString()
  desired_start_at!: string;
}
