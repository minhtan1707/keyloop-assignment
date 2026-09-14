import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { v4 as createUuid } from 'uuid';
import { AppointmentStatus } from '../../common/enums/appointment-status.enum';
import { Customer } from '../../catalog/entities/customer.entity';
import { Dealership } from '../../catalog/entities/dealership.entity';
import { ServiceType } from '../../catalog/entities/service-type.entity';
import { Vehicle } from '../../catalog/entities/vehicle.entity';
import { ServiceBay } from '../../resources/entities/service-bay.entity';
import { Technician } from '../../resources/entities/technician.entity';

/**
 * Confirmed workshop appointment linking customer, vehicle, tech, and bay.
 */
@Entity({ name: 'appointments' })
export class Appointment {
  @PrimaryColumn('uuid')
  id: string = createUuid();

  @ManyToOne(() => Customer, { nullable: false })
  @JoinColumn({ name: 'customer_id' })
  customer!: Customer;

  @ManyToOne(() => Vehicle, { nullable: false })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle!: Vehicle;

  @ManyToOne(() => Dealership, { nullable: false })
  @JoinColumn({ name: 'dealership_id' })
  dealership!: Dealership;

  @ManyToOne(() => ServiceType, { nullable: false })
  @JoinColumn({ name: 'service_type_id' })
  serviceType!: ServiceType;

  @ManyToOne(() => Technician, { nullable: false })
  @JoinColumn({ name: 'technician_id' })
  technician!: Technician;

  @ManyToOne(() => ServiceBay, { nullable: false })
  @JoinColumn({ name: 'service_bay_id' })
  serviceBay!: ServiceBay;

  @Column({ name: 'starts_at', type: 'timestamptz' })
  startsAt!: Date;

  @Column({ name: 'ends_at', type: 'timestamptz' })
  endsAt!: Date;

  @Column({
    type: 'enum',
    enum: AppointmentStatus,
    default: AppointmentStatus.Confirmed,
  })
  status: AppointmentStatus = AppointmentStatus.Confirmed;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
