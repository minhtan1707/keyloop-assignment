import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
} from 'typeorm';
import { v4 as createUuid } from 'uuid';

/**
 * Stores Idempotency-Key outcomes for safe client retries.
 */
@Entity({ name: 'idempotency_records' })
export class IdempotencyRecord {
  @PrimaryColumn('uuid')
  id: string = createUuid();

  @Column({ name: 'idempotency_key', unique: true })
  idempotencyKey!: string;

  @Column({ name: 'request_hash' })
  requestHash!: string;

  @Column({ name: 'response_status', type: 'int' })
  responseStatus!: number;

  @Column({ name: 'response_body', type: 'jsonb' })
  responseBody!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
