import { readFile } from 'node:fs/promises';
import { Agent } from 'node:https';
import type { AppConfig } from '../config';

export class PaycaddyProdAdapter {
  constructor(private readonly config: AppConfig) {}

  async verifyRuc(ruc: string): Promise<{ verified: boolean; reason?: string }> {
    const response = await this.request('/kyc/verify', {
      method: 'POST',
      body: JSON.stringify({ ruc })
    });

    return (await response.json()) as { verified: boolean; reason?: string };
  }

  async createPayout(input: {
    sellerId: string;
    amountCents: bigint;
    currency: 'PAB' | 'USD';
    idempotencyKey: string;
  }): Promise<{ externalId: string; status: 'processing' | 'paid' }> {
    const response = await this.request('/payouts', {
      method: 'POST',
      headers: { 'Idempotency-Key': input.idempotencyKey },
      body: JSON.stringify({
        seller_id: input.sellerId,
        amount_cents: input.amountCents.toString(),
        currency: input.currency
      })
    });

    return (await response.json()) as { externalId: string; status: 'processing' | 'paid' };
  }

  private async request(path: string, init: RequestInit): Promise<Response> {
    const [cert, key, ca] = await Promise.all([
      readFile(this.config.PAYCADDY_CERT_PATH, 'utf8'),
      readFile(this.config.PAYCADDY_KEY_PATH, 'utf8'),
      readFile(this.config.PAYCADDY_CA_PATH, 'utf8')
    ]);

    const agent = new Agent({ cert, key, ca, rejectUnauthorized: true });

    const response = await (fetch as unknown as (url: string, init: RequestInit & { agent?: Agent }) => Promise<Response>)(
      `${this.config.PAYCADDY_BASE_URL}${path}`,
      {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...init.headers
        },
        agent
      }
    );

    if (!response.ok) {
      throw new Error(`PayCaddy request failed with status ${response.status}`);
    }

    return response;
  }
}
