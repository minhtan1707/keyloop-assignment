import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { SeedIds } from './seed-ids';
import { Dealership } from '../catalog/entities/dealership.entity';
import { Customer } from '../catalog/entities/customer.entity';
import { Vehicle } from '../catalog/entities/vehicle.entity';
import { ServiceType } from '../catalog/entities/service-type.entity';
import { Technician } from '../resources/entities/technician.entity';
import { TechnicianSkill } from '../resources/entities/technician-skill.entity';
import { ServiceBay } from '../resources/entities/service-bay.entity';
import { ResourceCalendar } from '../schedule/entities/resource-calendar.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { IdempotencyRecord } from '../appointments/entities/idempotency-record.entity';
import { User } from '../auth/entities/user.entity';
import { CalendarKind } from '../common/enums/calendar-kind.enum';
import { ResourceType } from '../common/enums/resource-type.enum';
import { UserRole } from '../common/enums/user-role.enum';

/**
 * Seeds deterministic demo data used by README curl examples.
 */
@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger: Logger = new Logger(SeedService.name);
  private readonly demoPassword: string = 'Password123!';

  public constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Seeds catalog/resources once and ensures demo users exist.
   */
  public async onModuleInit(): Promise<void> {
    const shouldSeed: boolean =
      this.configService.get<string>('SEED_ON_BOOT', 'true') === 'true';
    if (!shouldSeed) {
      return;
    }
    await this.executeSeed();
    await this.ensureUsers();
  }

  /**
   * Idempotent seed of catalog, resources, and busy blocks.
   */
  public async executeSeed(): Promise<void> {
    const expected: Dealership | null = await this.dataSource.manager.findOneBy(
      Dealership,
      { id: SeedIds.dealershipId },
    );
    if (expected) {
      this.logger.log('Seed data already present; skipping catalog seed');
      return;
    }
    const staleCount: number = await this.dataSource.manager.count(Dealership);
    if (staleCount > 0) {
      this.logger.warn('Replacing stale demo seed with canonical UUID set');
      await this.clearDemoData();
    }
    await this.insertDemoData();
    this.logger.log('Seed data created successfully');
  }

  /**
   * Ensures demo advisor/manager accounts exist for JWT login demos.
   */
  public async ensureUsers(): Promise<void> {
    const passwordHash: string = await bcrypt.hash(this.demoPassword, 10);
    await this.upsertUser({
      id: SeedIds.advisorUserId,
      email: 'advisor@keyloop.local',
      fullName: 'Ada Advisor',
      role: UserRole.Advisor,
      passwordHash,
    });
    await this.upsertUser({
      id: SeedIds.managerUserId,
      email: 'manager@keyloop.local',
      fullName: 'Morgan Manager',
      role: UserRole.Manager,
      passwordHash,
    });
    this.logger.log('Demo users ready (advisor@keyloop.local / Password123!)');
  }

  private async upsertUser(input: {
    readonly id: string;
    readonly email: string;
    readonly fullName: string;
    readonly role: UserRole;
    readonly passwordHash: string;
  }): Promise<void> {
    const existing: User | null = await this.dataSource.manager.findOneBy(
      User,
      { email: input.email },
    );
    if (existing) {
      return;
    }
    const user: User = this.dataSource.manager.create(User, {
      id: input.id,
      email: input.email,
      fullName: input.fullName,
      role: input.role,
      passwordHash: input.passwordHash,
    });
    await this.dataSource.manager.save(user);
  }

  private async clearDemoData(): Promise<void> {
    await this.dataSource.manager.clear(IdempotencyRecord);
    await this.dataSource.manager.clear(ResourceCalendar);
    await this.dataSource.manager.clear(Appointment);
    await this.dataSource.manager.clear(TechnicianSkill);
    await this.dataSource.manager.clear(Technician);
    await this.dataSource.manager.clear(ServiceBay);
    await this.dataSource.manager.clear(Vehicle);
    await this.dataSource.manager.clear(Customer);
    await this.dataSource.manager.clear(ServiceType);
    await this.dataSource.manager.clear(Dealership);
    await this.dataSource.manager.clear(User);
  }

  private async insertDemoData(): Promise<void> {
    const manager = this.dataSource.manager;
    const dealership: Dealership = manager.create(Dealership, {
      id: SeedIds.dealershipId,
      code: 'HN-01',
      name: 'Keyloop Hanoi Service Centre',
    });
    const customer: Customer = manager.create(Customer, {
      id: SeedIds.customerId,
      fullName: 'Alex Nguyen',
      email: 'alex.nguyen@example.com',
    });
    const vehicle: Vehicle = manager.create(Vehicle, {
      id: SeedIds.vehicleId,
      customer,
      vin: 'WVWZZZ1JZXW000001',
      make: 'Volkswagen',
      model: 'Golf',
      modelYear: 2022,
    });
    const oilChange: ServiceType = manager.create(ServiceType, {
      id: SeedIds.oilChangeServiceTypeId,
      code: 'OIL_CHANGE',
      name: 'Oil Change',
      durationMinutes: 60,
    });
    const fullService: ServiceType = manager.create(ServiceType, {
      id: SeedIds.fullServiceTypeId,
      code: 'FULL_SERVICE',
      name: 'Full Service',
      durationMinutes: 180,
    });
    const techOil: Technician = manager.create(Technician, {
      id: SeedIds.technicianOilId,
      dealership,
      fullName: 'Taylor Oil',
      isActive: true,
    });
    const techFull: Technician = manager.create(Technician, {
      id: SeedIds.technicianFullId,
      dealership,
      fullName: 'Jordan Full',
      isActive: true,
    });
    const techBoth: Technician = manager.create(Technician, {
      id: SeedIds.technicianBothId,
      dealership,
      fullName: 'Riley Both',
      isActive: true,
    });
    const bayOne: ServiceBay = manager.create(ServiceBay, {
      id: SeedIds.serviceBayOneId,
      dealership,
      name: 'Bay 1',
      isActive: true,
    });
    const bayTwo: ServiceBay = manager.create(ServiceBay, {
      id: SeedIds.serviceBayTwoId,
      dealership,
      name: 'Bay 2',
      isActive: true,
    });
    await manager.save([
      dealership,
      customer,
      vehicle,
      oilChange,
      fullService,
      techOil,
      techFull,
      techBoth,
      bayOne,
      bayTwo,
    ]);
    await manager.save([
      manager.create(TechnicianSkill, {
        technician: techOil,
        serviceType: oilChange,
      }),
      manager.create(TechnicianSkill, {
        technician: techFull,
        serviceType: fullService,
      }),
      manager.create(TechnicianSkill, {
        technician: techBoth,
        serviceType: oilChange,
      }),
      manager.create(TechnicianSkill, {
        technician: techBoth,
        serviceType: fullService,
      }),
      manager.create(ResourceCalendar, {
        dealership,
        resourceType: ResourceType.Technician,
        resourceId: SeedIds.technicianOilId,
        kind: CalendarKind.Busy,
        startsAt: new Date('2026-09-15T00:00:00.000Z'),
        endsAt: new Date('2026-09-16T00:00:00.000Z'),
        appointment: null,
        reason: 'pto',
      }),
      manager.create(ResourceCalendar, {
        dealership,
        resourceType: ResourceType.ServiceBay,
        resourceId: SeedIds.serviceBayOneId,
        kind: CalendarKind.Busy,
        startsAt: new Date('2026-09-15T08:00:00.000Z'),
        endsAt: new Date('2026-09-15T12:00:00.000Z'),
        appointment: null,
        reason: 'bay_maintenance',
      }),
    ]);
  }
}
