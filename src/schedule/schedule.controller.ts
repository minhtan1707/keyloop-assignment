import {
  Body,
  Controller,
  Get,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ScheduleService } from './schedule.service';
import { CreateBusyDto } from './dto/create-busy.dto';
import { ResourceType } from '../common/enums/resource-type.enum';

/**
 * Resource calendar busy-block endpoints.
 */
@ApiTags('resource-calendar')
@ApiBearerAuth()
@Controller('resource-calendar')
export class ScheduleController {
  public constructor(private readonly scheduleService: ScheduleService) {}

  /**
   * Marks a technician or bay as busy.
   */
  @Post('busy')
  @ApiOperation({ summary: 'Create busy occupancy' })
  public createBusy(@Body() body: CreateBusyDto) {
    return this.scheduleService.createBusy(body);
  }

  /**
   * Lists calendar occupancy rows.
   */
  @Get()
  @ApiOperation({ summary: 'List resource calendar occupancy' })
  public listCalendar(
    @Query('dealership_id') dealershipId?: string,
    @Query('resource_type') resourceType?: ResourceType,
    @Query('resource_id') resourceId?: string,
  ) {
    return this.scheduleService.listCalendar({
      dealershipId,
      resourceType,
      resourceId,
    });
  }
}
