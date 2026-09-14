import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, LessThan, MoreThan } from 'typeorm';
import { CreateBusyDto } from './dto/create-busy.dto';
import { ResourceCalendar } from './entities/resource-calendar.entity';
import { Dealership } from '../catalog/entities/dealership.entity';
import { Technician } from '../resources/entities/technician.entity';
import { ServiceBay } from '../resources/entities/service-bay.entity';
import { CalendarKind } from '../common/enums/calendar-kind.enum';
import { ResourceType } from '../common/enums/resource-type.enum';
import { ResourceCalendarResponse } from '../common/types/api-responses';
import { mapResourceCalendarResponse } from '../common/utils/response-mapper.util';
import { buildResourceLockKey } from '../common/utils/date-interval.util';

/**
 * Manages busy blocks and calendar listings on resource_calendar.
 */
@Injectable()
export class ScheduleService {
  public constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Creates a busy occupancy row for a technician or service bay.
   */
  public async createBusy(
    input: CreateBusyDto,
  ): Promise<ResourceCalendarResponse> {
    const startsAt: Date = new Date(input.starts_at);
    const endsAt: Date = new Date(input.ends_at);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      throw new BadRequestException(
        'starts_at and ends_at must be valid ISO dates',
      );
    }
    if (endsAt <= startsAt) {
      throw new BadRequestException('ends_at must be after starts_at');
    }
    return this.dataSource.transaction(async (manager: EntityManager) => {
      const dealership: Dealership | null = await manager.findOneBy(
        Dealership,
        { id: input.dealership_id },
      );
      if (!dealership) {
        throw new NotFoundException('Dealership was not found');
      }
      await this.assertResourceExists(manager, input, dealership.id);
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        buildResourceLockKey(input.resource_type, input.resource_id),
      ]);
      const overlap: ResourceCalendar | null = await manager.findOne(
        ResourceCalendar,
        {
          where: {
            resourceType: input.resource_type,
            resourceId: input.resource_id,
            startsAt: LessThan(endsAt),
            endsAt: MoreThan(startsAt),
          },
        },
      );
      if (overlap) {
        throw new ConflictException(
          'Resource already has occupancy overlapping the requested window',
        );
      }
      const entry: ResourceCalendar = manager.create(ResourceCalendar, {
        dealership,
        resourceType: input.resource_type,
        resourceId: input.resource_id,
        kind: CalendarKind.Busy,
        startsAt,
        endsAt,
        appointment: null,
        reason: input.reason,
      });
      await manager.save(entry);
      return mapResourceCalendarResponse(entry);
    });
  }

  /**
   * Lists calendar occupancy optionally filtered by resource.
   */
  public async listCalendar(filters: {
    readonly dealershipId?: string;
    readonly resourceType?: ResourceType;
    readonly resourceId?: string;
  }): Promise<ResourceCalendarResponse[]> {
    const where: Record<string, unknown> = {};
    if (filters.dealershipId) {
      where.dealership = { id: filters.dealershipId };
    }
    if (filters.resourceType) {
      where.resourceType = filters.resourceType;
    }
    if (filters.resourceId) {
      where.resourceId = filters.resourceId;
    }
    const entries: ResourceCalendar[] = await this.dataSource.manager.find(
      ResourceCalendar,
      {
        where,
        relations: { dealership: true, appointment: true },
        order: { startsAt: 'ASC' },
      },
    );
    return entries.map(mapResourceCalendarResponse);
  }

  private async assertResourceExists(
    manager: EntityManager,
    input: CreateBusyDto,
    dealershipId: string,
  ): Promise<void> {
    if (input.resource_type === ResourceType.Technician) {
      const technician: Technician | null = await manager.findOne(Technician, {
        where: {
          id: input.resource_id,
          dealership: { id: dealershipId },
        },
      });
      if (!technician) {
        throw new NotFoundException('Technician was not found at dealership');
      }
      return;
    }
    const serviceBay: ServiceBay | null = await manager.findOne(ServiceBay, {
      where: {
        id: input.resource_id,
        dealership: { id: dealershipId },
      },
    });
    if (!serviceBay) {
      throw new NotFoundException('Service bay was not found at dealership');
    }
  }
}
