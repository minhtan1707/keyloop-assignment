import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Dealership } from './catalog/entities/dealership.entity';
import { Customer } from './catalog/entities/customer.entity';
import { Vehicle } from './catalog/entities/vehicle.entity';
import { ServiceType } from './catalog/entities/service-type.entity';
import { Technician } from './resources/entities/technician.entity';
import { TechnicianSkill } from './resources/entities/technician-skill.entity';
import { ServiceBay } from './resources/entities/service-bay.entity';
import { Appointment } from './appointments/entities/appointment.entity';
import { IdempotencyRecord } from './appointments/entities/idempotency-record.entity';
import { ResourceCalendar } from './schedule/entities/resource-calendar.entity';
import { User } from './auth/entities/user.entity';
import { CatalogModule } from './catalog/catalog.module';
import { AvailabilityModule } from './availability/availability.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { ScheduleModule } from './schedule/schedule.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { SeedService } from './database/seed.service';

/**
 * Root application module for the Unified Service Scheduler.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres' as const,
        host: configService.get<string>('DATABASE_HOST', 'localhost'),
        port: Number(configService.get<string>('DATABASE_PORT', '5432')),
        username: configService.get<string>('DATABASE_USER', 'scheduler'),
        password: configService.get<string>('DATABASE_PASSWORD', 'scheduler'),
        database: configService.get<string>(
          'DATABASE_NAME',
          'service_scheduler',
        ),
        entities: [
          Dealership,
          Customer,
          Vehicle,
          ServiceType,
          Technician,
          TechnicianSkill,
          ServiceBay,
          Appointment,
          ResourceCalendar,
          User,
          IdempotencyRecord,
        ],
        synchronize: configService.get<string>('DATABASE_SYNC', 'true') === 'true',
        logging: configService.get<string>('NODE_ENV') === 'development',
      }),
    }),
    AuthModule,
    HealthModule,
    CatalogModule,
    AvailabilityModule,
    AppointmentsModule,
    ScheduleModule,
  ],
  providers: [
    SeedService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
