import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { ResourceType } from '../../common/enums/resource-type.enum';

/**
 * Request body to mark a technician or bay as busy.
 */
export class CreateBusyDto {
  @ApiProperty({ name: 'dealership_id' })
  @IsUUID()
  dealership_id!: string;

  @ApiProperty({
    name: 'resource_type',
    enum: ResourceType,
  })
  @IsEnum(ResourceType)
  resource_type!: ResourceType;

  @ApiProperty({ name: 'resource_id' })
  @IsUUID()
  resource_id!: string;

  @ApiProperty({ name: 'starts_at' })
  @IsDateString()
  starts_at!: string;

  @ApiProperty({ name: 'ends_at' })
  @IsDateString()
  ends_at!: string;

  @ApiProperty({ example: 'pto' })
  @IsString()
  @MinLength(2)
  reason!: string;
}
