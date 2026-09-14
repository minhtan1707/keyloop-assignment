import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
} from 'typeorm';
import { v4 as createUuid } from 'uuid';

/**
 * Customer who owns vehicles and books service appointments.
 */
@Entity({ name: 'customers' })
export class Customer {
  @PrimaryColumn('uuid')
  id: string = createUuid();

  @Column({ name: 'full_name' })
  fullName!: string;

  @Column({ unique: true })
  email!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
