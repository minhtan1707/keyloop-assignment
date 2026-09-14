import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Response } from 'express';

/**
 * Adds X-Replica-Id so load-balanced demos show which Nest instance served the request.
 */
@Injectable()
export class ReplicaHeaderInterceptor implements NestInterceptor {
  private readonly replicaId: string =
    process.env.REPLICA_ID ?? process.env.HOSTNAME ?? 'local';

  /**
   * Attaches the replica id response header.
   */
  public intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const response: Response = context.switchToHttp().getResponse<Response>();
    response.setHeader('X-Replica-Id', this.replicaId);
    return next.handle();
  }
}
