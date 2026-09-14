import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';

/**
 * Liveness and replica identity endpoints for load balancers and demos.
 */
@ApiTags('health')
@Controller()
export class HealthController {
  private readonly replicaId: string =
    process.env.REPLICA_ID ?? process.env.HOSTNAME ?? 'local';

  /**
   * Returns process liveness.
   */
  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Liveness probe' })
  public getHealth(): {
    readonly status: string;
    readonly replica_id: string;
  } {
    return {
      status: 'ok',
      replica_id: this.replicaId,
    };
  }

  /**
   * Returns which backend replica handled the request.
   */
  @Public()
  @Get('whoami')
  @ApiOperation({ summary: 'Show serving replica id' })
  public getWhoAmI(): { readonly replica_id: string } {
    return { replica_id: this.replicaId };
  }
}
