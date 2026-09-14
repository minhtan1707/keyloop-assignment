import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CatalogService } from './catalog.service';

/**
 * Catalog read endpoints for dealerships and service types.
 */
@ApiTags('catalog')
@ApiBearerAuth()
@Controller()
export class CatalogController {
  public constructor(private readonly catalogService: CatalogService) {}

  /**
   * Lists dealerships.
   */
  @Get('dealerships')
  @ApiOperation({ summary: 'List dealerships' })
  public listDealerships() {
    return this.catalogService.listDealerships();
  }

  /**
   * Lists service types.
   */
  @Get('service-types')
  @ApiOperation({ summary: 'List service types' })
  public listServiceTypes() {
    return this.catalogService.listServiceTypes();
  }

  /**
   * Lists demo customers, vehicles, technicians, and bays.
   */
  @Get('demo-catalog')
  @ApiOperation({ summary: 'List seeded demo catalog entities' })
  public listDemoCatalog() {
    return this.catalogService.listDemoCatalog();
  }

  /**
   * Smoke test endpoint for the catalog module.
   */
  @Get('admin/test')
  @ApiOperation({ summary: 'Catalog module smoke test' })
  public executeAdminTest(): { readonly status: string } {
    return { status: 'catalog_ok' };
  }
}
