import {
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Unique,
} from 'typeorm';
import { v4 as createUuid } from 'uuid';
import { ServiceType } from '../../catalog/entities/service-type.entity';
import { Technician } from './technician.entity';

/**
 * Qualification linking a technician to a service type.
 */
@Entity({ name: 'technician_skills' })
@Unique(['technician', 'serviceType'])
export class TechnicianSkill {
  @PrimaryColumn('uuid')
  id: string = createUuid();

  @ManyToOne(() => Technician, (technician: Technician) => technician.skills, {
    nullable: false,
  })
  @JoinColumn({ name: 'technician_id' })
  technician!: Technician;

  @ManyToOne(() => ServiceType, { nullable: false })
  @JoinColumn({ name: 'service_type_id' })
  serviceType!: ServiceType;
}
