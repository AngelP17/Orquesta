import { randomUUID } from 'node:crypto';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class PaycaddyMockAdapter {
  constructor(private readonly failureRate = 0.05) {}

  async verifyRuc(ruc: string): Promise<{ verified: boolean; reason?: string }> {
    await sleep(randomDelay());
    if (!/^\d{8,15}$/.test(ruc)) {
      return { verified: false, reason: 'invalid_format' };
    }
    return { verified: true };
  }

  async createPayout(input: {
    sellerId: string;
    amountCents: bigint;
    currency: 'PAB' | 'USD';
    idempotencyKey: string;
  }): Promise<{ externalId: string; status: 'processing' | 'paid' }> {
    await sleep(randomDelay());

    if (Math.random() < this.failureRate) {
      throw new Error('Simulated PayCaddy outage');
    }

    return {
      externalId: `pc_mock_${randomUUID()}`,
      status: input.amountCents % 2n === 0n ? 'paid' : 'processing'
    };
  }
}

const randomDelay = (): number => 2000 + Math.floor(Math.random() * 3000);
