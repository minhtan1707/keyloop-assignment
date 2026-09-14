import {
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import { DataSource } from 'typeorm';
import { IdempotencyRecord } from './entities/idempotency-record.entity';

/**
 * Persists and replays Idempotency-Key results for POST /appointments.
 */
@Injectable()
export class IdempotencyService {
  public constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Builds a stable hash of the request payload.
   */
  public buildRequestHash(payload: unknown): string {
    return createHash('sha256')
      .update(JSON.stringify(payload))
      .digest('hex');
  }

  /**
   * Returns a prior response when the same key+body is retried.
   */
  public async findReusableResponse(input: {
    readonly idempotencyKey: string;
    readonly requestHash: string;
  }): Promise<{
    readonly statusCode: number;
    readonly body: Record<string, unknown>;
  } | null> {
    const existing: IdempotencyRecord | null =
      await this.dataSource.manager.findOneBy(IdempotencyRecord, {
        idempotencyKey: input.idempotencyKey,
      });
    if (!existing) {
      return null;
    }
    if (existing.requestHash !== input.requestHash) {
      throw new ConflictException(
        'Idempotency-Key was reused with a different request body',
      );
    }
    return {
      statusCode: existing.responseStatus,
      body: existing.responseBody,
    };
  }

  /**
   * Stores the successful response for future retries of the same key.
   */
  public async saveResponse(input: {
    readonly idempotencyKey: string;
    readonly requestHash: string;
    readonly statusCode: number;
    readonly body: Record<string, unknown>;
  }): Promise<void> {
    const record: IdempotencyRecord = this.dataSource.manager.create(
      IdempotencyRecord,
      {
        idempotencyKey: input.idempotencyKey,
        requestHash: input.requestHash,
        responseStatus: input.statusCode,
        responseBody: input.body,
      },
    );
    await this.dataSource.manager.save(record);
  }
}
