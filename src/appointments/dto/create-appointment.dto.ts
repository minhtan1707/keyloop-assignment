import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsUUID } from 'class-validator';

/**
 * Request body to confirm a workshop appointment.
 */
export class CreateAppointmentDto {
  @ApiProperty({ name: 'customer_id' })
  @IsUUID()
  customer_id!: string;

  @ApiProperty({ name: 'vehicle_id' })
  @IsUUID()
  vehicle_id!: string;

  @ApiProperty({ name: 'dealership_id' })
  @IsUUID()
  dealership_id!: string;

  @ApiProperty({ name: 'service_type_id' })
  @IsUUID()
  service_type_id!: string;

  @ApiProperty({
    name: 'desired_start_at',
    example: '2026-09-15T09:00:00.000Z',
  })
  @IsDateString()
  desired_start_at!: string;
}
