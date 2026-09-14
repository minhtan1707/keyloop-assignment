import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
} from 'typeorm';
import { v4 as createUuid } from 'uuid';

/**
 * Dealership that owns technicians, bays, and appointments.
 */
@Entity({ name: 'dealerships' })
export class Dealership {
  @PrimaryColumn('uuid')
  id: string = createUuid();

  @Column({ unique: true })
  code!: string;

  @Column()
  name!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
