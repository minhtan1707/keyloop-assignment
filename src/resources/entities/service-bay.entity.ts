import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { v4 as createUuid } from 'uuid';
import { Dealership } from '../../catalog/entities/dealership.entity';

/**
 * Physical service bay at a dealership.
 */
@Entity({ name: 'service_bays' })
export class ServiceBay {
  @PrimaryColumn('uuid')
  id: string = createUuid();

  @ManyToOne(() => Dealership, { nullable: false })
  @JoinColumn({ name: 'dealership_id' })
  dealership!: Dealership;

  @Column()
  name!: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean = true;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
