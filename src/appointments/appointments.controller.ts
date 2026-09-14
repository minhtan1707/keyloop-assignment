import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AppointmentsService } from './appointments.service';
import { IdempotencyService } from './idempotency.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { AppointmentResponse } from '../common/types/api-responses';

/**
 * Appointment confirmation, cancel, reschedule, and lookup endpoints.
 */
@ApiTags('appointments')
@ApiBearerAuth()
@Controller('appointments')
export class AppointmentsController {
  public constructor(
    private readonly appointmentsService: AppointmentsService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  /**
   * Confirms a booking transactionally.
   * Optional Idempotency-Key makes safe retries return the same appointment.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create confirmed appointment' })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description: 'Client retry key; same key+body returns the original result',
  })
  public async createAppointment(
    @Body() body: CreateAppointmentDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<AppointmentResponse | Record<string, unknown>> {
    if (idempotencyKey) {
      const requestHash: string =
        this.idempotencyService.buildRequestHash(body);
      const reusable = await this.idempotencyService.findReusableResponse({
        idempotencyKey,
        requestHash,
      });
      if (reusable) {
        return reusable.body;
      }
      const created: AppointmentResponse =
        await this.appointmentsService.createAppointment(body);
      await this.idempotencyService.saveResponse({
        idempotencyKey,
        requestHash,
        statusCode: HttpStatus.CREATED,
        body: created as unknown as Record<string, unknown>,
      });
      return created;
    }
    return this.appointmentsService.createAppointment(body);
  }

  /**
   * Lists appointments, optionally by dealership.
   */
  @Get()
  @ApiOperation({ summary: 'List appointments' })
  public listAppointments(@Query('dealership_id') dealershipId?: string) {
    return this.appointmentsService.listAppointments(dealershipId);
  }

  /**
   * Fetches one appointment by id.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get appointment by id' })
  public getAppointment(@Param('id', ParseUUIDPipe) id: string) {
    return this.appointmentsService.getAppointmentById(id);
  }

  /**
   * Cancels an appointment and releases bay/tech calendar rows.
   */
  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel appointment' })
  public cancelAppointment(@Param('id', ParseUUIDPipe) id: string) {
    return this.appointmentsService.cancelAppointment(id);
  }

  /**
   * Reschedules a confirmed appointment to a new start time.
   */
  @Post(':id/reschedule')
  @ApiOperation({ summary: 'Reschedule appointment' })
  public rescheduleAppointment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RescheduleAppointmentDto,
  ) {
    return this.appointmentsService.rescheduleAppointment(id, body);
  }
}
