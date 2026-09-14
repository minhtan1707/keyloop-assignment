import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { v4 as createUuid } from 'uuid';
import { Customer } from './customer.entity';

/**
 * Vehicle belonging to a customer.
 */
@Entity({ name: 'vehicles' })
export class Vehicle {
  @PrimaryColumn('uuid')
  id: string = createUuid();

  @ManyToOne(() => Customer, { eager: false, nullable: false })
  @JoinColumn({ name: 'customer_id' })
  customer!: Customer;

  @Column({ unique: true })
  vin!: string;

  @Column()
  make!: string;

  @Column()
  model!: string;

  @Column({ name: 'model_year', type: 'int' })
  modelYear!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
