import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { v4 as createUuid } from 'uuid';
import { CalendarKind } from '../../common/enums/calendar-kind.enum';
import { ResourceType } from '../../common/enums/resource-type.enum';
import { Dealership } from '../../catalog/entities/dealership.entity';
import { Appointment } from '../../appointments/entities/appointment.entity';

/**
 * Unified occupancy timeline for technicians and service bays.
 */
@Entity({ name: 'resource_calendar' })
@Index(['resourceType', 'resourceId', 'startsAt', 'endsAt'])
export class ResourceCalendar {
  @PrimaryColumn('uuid')
  id: string = createUuid();

  @ManyToOne(() => Dealership, { nullable: false })
  @JoinColumn({ name: 'dealership_id' })
  dealership!: Dealership;

  @Column({
    name: 'resource_type',
    type: 'enum',
    enum: ResourceType,
  })
  resourceType!: ResourceType;

  @Column({ name: 'resource_id', type: 'uuid' })
  resourceId!: string;

  @Column({ type: 'enum', enum: CalendarKind })
  kind!: CalendarKind;

  @Column({ name: 'starts_at', type: 'timestamptz' })
  startsAt!: Date;

  @Column({ name: 'ends_at', type: 'timestamptz' })
  endsAt!: Date;

  @ManyToOne(() => Appointment, { nullable: true })
  @JoinColumn({ name: 'appointment_id' })
  appointment!: Appointment | null;

  @Column({ type: 'varchar', nullable: true })
  reason!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
