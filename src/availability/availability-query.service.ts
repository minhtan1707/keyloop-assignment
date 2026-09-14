import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, LessThan, MoreThan } from 'typeorm';
import { AvailabilityService } from './availability.service';
import { OccupiedInterval } from './availability.types';
import { CheckAvailabilityDto } from './dto/check-availability.dto';
import { Dealership } from '../catalog/entities/dealership.entity';
import { ServiceType } from '../catalog/entities/service-type.entity';
import { TechnicianSkill } from '../resources/entities/technician-skill.entity';
import { ServiceBay } from '../resources/entities/service-bay.entity';
import { ResourceCalendar } from '../schedule/entities/resource-calendar.entity';
import { AvailabilityCheckResponse } from '../common/types/api-responses';
import { mapAvailabilityCheckResponse } from '../common/utils/response-mapper.util';
import { addMinutes } from '../common/utils/date-interval.util';

/**
 * Application service that loads persistence state for availability checks.
 */
@Injectable()
export class AvailabilityQueryService {
  public constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly availabilityService: AvailabilityService,
  ) {}

  /**
   * Dry-run availability check without creating calendar rows.
   */
  public async checkAvailability(
    input: CheckAvailabilityDto,
  ): Promise<AvailabilityCheckResponse> {
    const desiredStartAt: Date = new Date(input.desired_start_at);
    if (Number.isNaN(desiredStartAt.getTime())) {
      throw new BadRequestException('desired_start_at must be a valid ISO date');
    }
    const dealership: Dealership | null =
      await this.dataSource.manager.findOneBy(Dealership, {
        id: input.dealership_id,
      });
    if (!dealership) {
      throw new NotFoundException('Dealership was not found');
    }
    const serviceType: ServiceType | null =
      await this.dataSource.manager.findOneBy(ServiceType, {
        id: input.service_type_id,
      });
    if (!serviceType) {
      throw new NotFoundException('Service type was not found');
    }
    const endsAt: Date = addMinutes(
      desiredStartAt,
      serviceType.durationMinutes,
    );
    const skills: TechnicianSkill[] = await this.dataSource.manager.find(
      TechnicianSkill,
      {
        where: { serviceType: { id: serviceType.id } },
        relations: { technician: { dealership: true } },
      },
    );
    const qualifiedTechnicianIds: string[] = skills
      .filter(
        (skill: TechnicianSkill) =>
          skill.technician.isActive &&
          skill.technician.dealership.id === dealership.id,
      )
      .map((skill: TechnicianSkill) => skill.technician.id);
    const serviceBays: ServiceBay[] = await this.dataSource.manager.find(
      ServiceBay,
      {
        where: { dealership: { id: dealership.id }, isActive: true },
      },
    );
    const occupiedIntervals: OccupiedInterval[] =
      await this.loadOccupiedIntervals(dealership.id, desiredStartAt, endsAt);
    const slot = this.availabilityService.findAvailableSlot({
      dealershipId: dealership.id,
      serviceTypeId: serviceType.id,
      desiredStartAt,
      durationMinutes: serviceType.durationMinutes,
      qualifiedTechnicianIds,
      serviceBayIds: serviceBays.map((bay: ServiceBay) => bay.id),
      occupiedIntervals,
    });
    return mapAvailabilityCheckResponse(slot);
  }

  private async loadOccupiedIntervals(
    dealershipId: string,
    startsAt: Date,
    endsAt: Date,
  ): Promise<OccupiedInterval[]> {
    const entries: ResourceCalendar[] = await this.dataSource.manager.find(
      ResourceCalendar,
      {
        where: {
          dealership: { id: dealershipId },
          startsAt: LessThan(endsAt),
          endsAt: MoreThan(startsAt),
        },
      },
    );
    return entries.map((entry: ResourceCalendar) => ({
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      startsAt: entry.startsAt,
      endsAt: entry.endsAt,
    }));
  }
}
