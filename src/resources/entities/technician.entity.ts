import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';
import { v4 as createUuid } from 'uuid';
import { Dealership } from '../../catalog/entities/dealership.entity';
import { TechnicianSkill } from './technician-skill.entity';

/**
 * Technician assigned to a dealership workshop.
 */
@Entity({ name: 'technicians' })
export class Technician {
  @PrimaryColumn('uuid')
  id: string = createUuid();

  @ManyToOne(() => Dealership, { nullable: false })
  @JoinColumn({ name: 'dealership_id' })
  dealership!: Dealership;

  @Column({ name: 'full_name' })
  fullName!: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean = true;

  @OneToMany(() => TechnicianSkill, (skill: TechnicianSkill) => skill.technician)
  skills!: TechnicianSkill[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
