import { createHash } from 'crypto';

describe('idempotency request hash', () => {
  it('is stable for the same payload', () => {
    const payload = {
      customer_id: '22222222-2222-4222-8222-222222222222',
      desired_start_at: '2026-09-16T09:00:00.000Z',
    };
    const firstHash: string = createHash('sha256')
      .update(JSON.stringify(payload))
      .digest('hex');
    const secondHash: string = createHash('sha256')
      .update(JSON.stringify(payload))
      .digest('hex');
    expect(firstHash).toBe(secondHash);
  });

  it('changes when the payload changes', () => {
    const firstHash: string = createHash('sha256')
      .update(JSON.stringify({ desired_start_at: '2026-09-16T09:00:00.000Z' }))
      .digest('hex');
    const secondHash: string = createHash('sha256')
      .update(JSON.stringify({ desired_start_at: '2026-09-16T10:00:00.000Z' }))
      .digest('hex');
    expect(firstHash).not.toBe(secondHash);
  });
});
