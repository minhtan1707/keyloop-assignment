import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
} from 'typeorm';
import { v4 as createUuid } from 'uuid';

/**
 * Catalog entry defining a service offering and its duration.
 */
@Entity({ name: 'service_types' })
export class ServiceType {
  @PrimaryColumn('uuid')
  id: string = createUuid();

  @Column({ unique: true })
  code!: string;

  @Column()
  name!: string;

  @Column({ name: 'duration_minutes', type: 'int' })
  durationMinutes!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
