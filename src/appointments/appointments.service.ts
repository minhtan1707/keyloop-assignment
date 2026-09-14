import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, LessThan, MoreThan } from 'typeorm';
import { AvailabilityService } from '../availability/availability.service';
import { OccupiedInterval } from '../availability/availability.types';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { Appointment } from './entities/appointment.entity';
import { Customer } from '../catalog/entities/customer.entity';
import { Vehicle } from '../catalog/entities/vehicle.entity';
import { Dealership } from '../catalog/entities/dealership.entity';
import { ServiceType } from '../catalog/entities/service-type.entity';
import { Technician } from '../resources/entities/technician.entity';
import { TechnicianSkill } from '../resources/entities/technician-skill.entity';
import { ServiceBay } from '../resources/entities/service-bay.entity';
import { ResourceCalendar } from '../schedule/entities/resource-calendar.entity';
import { CalendarKind } from '../common/enums/calendar-kind.enum';
import { ResourceType } from '../common/enums/resource-type.enum';
import { AppointmentStatus } from '../common/enums/appointment-status.enum';
import { AppointmentResponse } from '../common/types/api-responses';
import { mapAppointmentResponse } from '../common/utils/response-mapper.util';
import {
  addMinutes,
  buildResourceLockKey,
} from '../common/utils/date-interval.util';

type BookingContext = {
  readonly customer: Customer;
  readonly vehicle: Vehicle;
  readonly dealership: Dealership;
  readonly serviceType: ServiceType;
  readonly desiredStartAt: Date;
  readonly endsAt: Date;
  readonly qualifiedTechnicianIds: string[];
  readonly serviceBayIds: string[];
};

/**
 * Orchestrates transactional appointment lifecycle operations.
 */
@Injectable()
export class AppointmentsService {
  public constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly availabilityService: AvailabilityService,
  ) {}

  /**
   * Confirms a booking inside a single DB transaction.
   */
  public async createAppointment(
    input: CreateAppointmentDto,
  ): Promise<AppointmentResponse> {
    return this.dataSource.transaction(async (manager: EntityManager) => {
      const context: BookingContext = await this.loadBookingContext(
        manager,
        input,
      );
      await this.acquireResourceLocks(
        manager,
        context.qualifiedTechnicianIds,
        context.serviceBayIds,
      );
      const occupiedIntervals: OccupiedInterval[] =
        await this.loadOccupiedIntervals(
          manager,
          context.dealership.id,
          context.desiredStartAt,
          context.endsAt,
        );
      const slot = this.availabilityService.findAvailableSlot({
        dealershipId: context.dealership.id,
        serviceTypeId: context.serviceType.id,
        desiredStartAt: context.desiredStartAt,
        durationMinutes: context.serviceType.durationMinutes,
        qualifiedTechnicianIds: context.qualifiedTechnicianIds,
        serviceBayIds: context.serviceBayIds,
        occupiedIntervals,
      });
      if (!slot) {
        throw new ConflictException(
          'No free technician and service bay for the requested window',
        );
      }
      return this.persistConfirmedAppointment(
        manager,
        context,
        slot.technicianId,
        slot.serviceBayId,
        slot.startsAt,
        slot.endsAt,
      );
    });
  }

  /**
   * Cancels an appointment and frees its calendar occupancy.
   */
  public async cancelAppointment(id: string): Promise<AppointmentResponse> {
    return this.dataSource.transaction(async (manager: EntityManager) => {
      const appointment: Appointment = await this.loadAppointmentOrFail(
        manager,
        id,
      );
      if (appointment.status === AppointmentStatus.Cancelled) {
        return mapAppointmentResponse(appointment);
      }
      await this.acquireResourceLocks(
        manager,
        [appointment.technician.id],
        [appointment.serviceBay.id],
      );
      await manager.delete(ResourceCalendar, {
        appointment: { id: appointment.id },
      });
      appointment.status = AppointmentStatus.Cancelled;
      await manager.save(appointment);
      return mapAppointmentResponse(appointment);
    });
  }

  /**
   * Moves a confirmed appointment to a new start time in one transaction.
   */
  public async rescheduleAppointment(
    id: string,
    input: RescheduleAppointmentDto,
  ): Promise<AppointmentResponse> {
    return this.dataSource.transaction(async (manager: EntityManager) => {
      const appointment: Appointment = await this.loadAppointmentOrFail(
        manager,
        id,
      );
      if (appointment.status !== AppointmentStatus.Confirmed) {
        throw new ConflictException(
          'Only confirmed appointments can be rescheduled',
        );
      }
      const desiredStartAt: Date = new Date(input.desired_start_at);
      if (Number.isNaN(desiredStartAt.getTime())) {
        throw new BadRequestException(
          'desired_start_at must be a valid ISO date',
        );
      }
      const endsAt: Date = addMinutes(
        desiredStartAt,
        appointment.serviceType.durationMinutes,
      );
      const skills: TechnicianSkill[] = await manager.find(TechnicianSkill, {
        where: { serviceType: { id: appointment.serviceType.id } },
        relations: { technician: { dealership: true } },
      });
      const qualifiedTechnicianIds: string[] = skills
        .filter(
          (skill: TechnicianSkill) =>
            skill.technician.isActive &&
            skill.technician.dealership.id === appointment.dealership.id,
        )
        .map((skill: TechnicianSkill) => skill.technician.id);
      const serviceBays: ServiceBay[] = await manager.find(ServiceBay, {
        where: {
          dealership: { id: appointment.dealership.id },
          isActive: true,
        },
      });
      const serviceBayIds: string[] = serviceBays.map(
        (bay: ServiceBay) => bay.id,
      );
      await this.acquireResourceLocks(
        manager,
        qualifiedTechnicianIds,
        serviceBayIds,
      );
      await manager.delete(ResourceCalendar, {
        appointment: { id: appointment.id },
      });
      const occupiedIntervals: OccupiedInterval[] =
        await this.loadOccupiedIntervals(
          manager,
          appointment.dealership.id,
          desiredStartAt,
          endsAt,
          appointment.id,
        );
      const slot = this.availabilityService.findAvailableSlot({
        dealershipId: appointment.dealership.id,
        serviceTypeId: appointment.serviceType.id,
        desiredStartAt,
        durationMinutes: appointment.serviceType.durationMinutes,
        qualifiedTechnicianIds,
        serviceBayIds,
        occupiedIntervals,
      });
      if (!slot) {
        throw new ConflictException(
          'No free technician and service bay for the requested reschedule window',
        );
      }
      const technician: Technician = await manager.findOneByOrFail(Technician, {
        id: slot.technicianId,
      });
      const serviceBay: ServiceBay = await manager.findOneByOrFail(ServiceBay, {
        id: slot.serviceBayId,
      });
      appointment.technician = technician;
      appointment.serviceBay = serviceBay;
      appointment.startsAt = slot.startsAt;
      appointment.endsAt = slot.endsAt;
      await manager.save(appointment);
      await manager.save(
        manager.create(ResourceCalendar, {
          dealership: appointment.dealership,
          resourceType: ResourceType.Technician,
          resourceId: technician.id,
          kind: CalendarKind.Appointment,
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          appointment,
          reason: null,
        }),
      );
      await manager.save(
        manager.create(ResourceCalendar, {
          dealership: appointment.dealership,
          resourceType: ResourceType.ServiceBay,
          resourceId: serviceBay.id,
          kind: CalendarKind.Appointment,
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          appointment,
          reason: null,
        }),
      );
      return mapAppointmentResponse(appointment);
    });
  }

  /**
   * Returns an appointment by id.
   */
  public async getAppointmentById(id: string): Promise<AppointmentResponse> {
    const appointment: Appointment = await this.loadAppointmentOrFail(
      this.dataSource.manager,
      id,
    );
    return mapAppointmentResponse(appointment);
  }

  /**
   * Lists appointments optionally filtered by dealership.
   */
  public async listAppointments(
    dealershipId?: string,
  ): Promise<AppointmentResponse[]> {
    const appointments: Appointment[] = await this.dataSource.manager.find(
      Appointment,
      {
        where: dealershipId ? { dealership: { id: dealershipId } } : {},
        relations: { customer: true, vehicle: true, dealership: true, serviceType: true, technician: true, serviceBay: true },
        order: { startsAt: 'ASC' },
      },
    );
    return appointments.map(mapAppointmentResponse);
  }

  private async persistConfirmedAppointment(
    manager: EntityManager,
    context: BookingContext,
    technicianId: string,
    serviceBayId: string,
    startsAt: Date,
    endsAt: Date,
  ): Promise<AppointmentResponse> {
    const technician: Technician = await manager.findOneByOrFail(Technician, {
      id: technicianId,
    });
    const serviceBay: ServiceBay = await manager.findOneByOrFail(ServiceBay, {
      id: serviceBayId,
    });
    const appointment: Appointment = manager.create(Appointment, {
      customer: context.customer,
      vehicle: context.vehicle,
      dealership: context.dealership,
      serviceType: context.serviceType,
      technician,
      serviceBay,
      startsAt,
      endsAt,
      status: AppointmentStatus.Confirmed,
    });
    await manager.save(appointment);
    await manager.save(
      manager.create(ResourceCalendar, {
        dealership: context.dealership,
        resourceType: ResourceType.Technician,
        resourceId: technician.id,
        kind: CalendarKind.Appointment,
        startsAt,
        endsAt,
        appointment,
        reason: null,
      }),
    );
    await manager.save(
      manager.create(ResourceCalendar, {
        dealership: context.dealership,
        resourceType: ResourceType.ServiceBay,
        resourceId: serviceBay.id,
        kind: CalendarKind.Appointment,
        startsAt,
        endsAt,
        appointment,
        reason: null,
      }),
    );
    return mapAppointmentResponse(appointment);
  }

  private async loadAppointmentOrFail(
    manager: EntityManager,
    id: string,
  ): Promise<Appointment> {
    const appointment: Appointment | null = await manager.findOne(Appointment, {
      where: { id },
      relations: { customer: true, vehicle: true, dealership: true, serviceType: true, technician: true, serviceBay: true },
    });
    if (!appointment) {
      throw new NotFoundException(`Appointment ${id} was not found`);
    }
    return appointment;
  }

  private async loadBookingContext(
    manager: EntityManager,
    input: CreateAppointmentDto,
  ): Promise<BookingContext> {
    const desiredStartAt: Date = new Date(input.desired_start_at);
    if (Number.isNaN(desiredStartAt.getTime())) {
      throw new BadRequestException('desired_start_at must be a valid ISO date');
    }
    const customer: Customer | null = await manager.findOneBy(Customer, {
      id: input.customer_id,
    });
    if (!customer) {
      throw new NotFoundException('Customer was not found');
    }
    const vehicle: Vehicle | null = await manager.findOne(Vehicle, {
      where: { id: input.vehicle_id },
      relations: { customer: true },
    });
    if (!vehicle) {
      throw new NotFoundException('Vehicle was not found');
    }
    if (vehicle.customer.id !== customer.id) {
      throw new BadRequestException('Vehicle does not belong to customer');
    }
    const dealership: Dealership | null = await manager.findOneBy(Dealership, {
      id: input.dealership_id,
    });
    if (!dealership) {
      throw new NotFoundException('Dealership was not found');
    }
    const serviceType: ServiceType | null = await manager.findOneBy(
      ServiceType,
      { id: input.service_type_id },
    );
    if (!serviceType) {
      throw new NotFoundException('Service type was not found');
    }
    const skills: TechnicianSkill[] = await manager.find(TechnicianSkill, {
      where: { serviceType: { id: serviceType.id } },
      relations: { technician: { dealership: true } },
    });
    const qualifiedTechnicianIds: string[] = skills
      .filter(
        (skill: TechnicianSkill) =>
          skill.technician.isActive &&
          skill.technician.dealership.id === dealership.id,
      )
      .map((skill: TechnicianSkill) => skill.technician.id);
    if (qualifiedTechnicianIds.length === 0) {
      throw new ConflictException(
        'No qualified technician exists for this service at the dealership',
      );
    }
    const serviceBays: ServiceBay[] = await manager.find(ServiceBay, {
      where: { dealership: { id: dealership.id }, isActive: true },
    });
    const serviceBayIds: string[] = serviceBays.map(
      (bay: ServiceBay) => bay.id,
    );
    if (serviceBayIds.length === 0) {
      throw new ConflictException(
        'No active service bay exists at the dealership',
      );
    }
    return {
      customer,
      vehicle,
      dealership,
      serviceType,
      desiredStartAt,
      endsAt: addMinutes(desiredStartAt, serviceType.durationMinutes),
      qualifiedTechnicianIds,
      serviceBayIds,
    };
  }

  private async acquireResourceLocks(
    manager: EntityManager,
    technicianIds: readonly string[],
    serviceBayIds: readonly string[],
  ): Promise<void> {
    const lockKeys: string[] = [
      ...technicianIds.map((id: string) =>
        buildResourceLockKey(ResourceType.Technician, id),
      ),
      ...serviceBayIds.map((id: string) =>
        buildResourceLockKey(ResourceType.ServiceBay, id),
      ),
    ].sort();
    for (const lockKey of lockKeys) {
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        lockKey,
      ]);
    }
  }

  private async loadOccupiedIntervals(
    manager: EntityManager,
    dealershipId: string,
    startsAt: Date,
    endsAt: Date,
    excludeAppointmentId?: string,
  ): Promise<OccupiedInterval[]> {
    const entries: ResourceCalendar[] = await manager.find(ResourceCalendar, {
      where: {
        dealership: { id: dealershipId },
        startsAt: LessThan(endsAt),
        endsAt: MoreThan(startsAt),
      },
      relations: { appointment: true },
    });
    return entries
      .filter(
        (entry: ResourceCalendar) =>
          !excludeAppointmentId ||
          entry.appointment?.id !== excludeAppointmentId,
      )
      .map((entry: ResourceCalendar) => ({
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        startsAt: entry.startsAt,
        endsAt: entry.endsAt,
      }));
  }
}
