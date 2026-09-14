import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Dealership } from './entities/dealership.entity';
import { ServiceType } from './entities/service-type.entity';
import { Customer } from './entities/customer.entity';
import { Vehicle } from './entities/vehicle.entity';
import { Technician } from '../resources/entities/technician.entity';
import { ServiceBay } from '../resources/entities/service-bay.entity';

/**
 * Read APIs for catalog entities used by the booking flow.
 */
@Injectable()
export class CatalogService {
  public constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Lists all dealerships.
   */
  public async listDealerships(): Promise<
    Array<{ id: string; code: string; name: string }>
  > {
    const dealerships: Dealership[] = await this.dataSource.manager.find(
      Dealership,
      { order: { name: 'ASC' } },
    );
    return dealerships.map((dealership: Dealership) => ({
      id: dealership.id,
      code: dealership.code,
      name: dealership.name,
    }));
  }

  /**
   * Lists service types with durations.
   */
  public async listServiceTypes(): Promise<
    Array<{
      id: string;
      code: string;
      name: string;
      duration_minutes: number;
    }>
  > {
    const serviceTypes: ServiceType[] = await this.dataSource.manager.find(
      ServiceType,
      { order: { name: 'ASC' } },
    );
    return serviceTypes.map((serviceType: ServiceType) => ({
      id: serviceType.id,
      code: serviceType.code,
      name: serviceType.name,
      duration_minutes: serviceType.durationMinutes,
    }));
  }

  /**
   * Lists seeded customers, vehicles, technicians, and bays for demos.
   */
  public async listDemoCatalog(): Promise<{
    customers: Array<{ id: string; full_name: string; email: string }>;
    vehicles: Array<{
      id: string;
      customer_id: string;
      vin: string;
      make: string;
      model: string;
      model_year: number;
    }>;
    technicians: Array<{
      id: string;
      dealership_id: string;
      full_name: string;
      is_active: boolean;
    }>;
    service_bays: Array<{
      id: string;
      dealership_id: string;
      name: string;
      is_active: boolean;
    }>;
  }> {
    const customers: Customer[] = await this.dataSource.manager.find(Customer);
    const vehicles: Vehicle[] = await this.dataSource.manager.find(Vehicle, {
      relations: { customer: true },
    });
    const technicians: Technician[] = await this.dataSource.manager.find(
      Technician,
      { relations: { dealership: true } },
    );
    const serviceBays: ServiceBay[] = await this.dataSource.manager.find(
      ServiceBay,
      { relations: { dealership: true } },
    );
    return {
      customers: customers.map((customer: Customer) => ({
        id: customer.id,
        full_name: customer.fullName,
        email: customer.email,
      })),
      vehicles: vehicles.map((vehicle: Vehicle) => ({
        id: vehicle.id,
        customer_id: vehicle.customer.id,
        vin: vehicle.vin,
        make: vehicle.make,
        model: vehicle.model,
        model_year: vehicle.modelYear,
      })),
      technicians: technicians.map((technician: Technician) => ({
        id: technician.id,
        dealership_id: technician.dealership.id,
        full_name: technician.fullName,
        is_active: technician.isActive,
      })),
      service_bays: serviceBays.map((bay: ServiceBay) => ({
        id: bay.id,
        dealership_id: bay.dealership.id,
        name: bay.name,
        is_active: bay.isActive,
      })),
    };
  }
}
