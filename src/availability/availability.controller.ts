import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AvailabilityQueryService } from './availability-query.service';
import { CheckAvailabilityDto } from './dto/check-availability.dto';

/**
 * Availability dry-run endpoints.
 */
@ApiTags('availability')
@ApiBearerAuth()
@Controller('availability')
export class AvailabilityController {
  public constructor(
    private readonly availabilityQueryService: AvailabilityQueryService,
  ) {}

  /**
   * Checks whether a slot can be booked without persisting.
   */
  @Post('check')
  @ApiOperation({ summary: 'Dry-run availability check' })
  public checkAvailability(@Body() body: CheckAvailabilityDto) {
    return this.availabilityQueryService.checkAvailability(body);
  }
}
