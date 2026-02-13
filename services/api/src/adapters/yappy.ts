import { createHmac } from 'node:crypto';
import type { AppConfig } from '../config';

export interface CreateYappyPaymentRequest {
  amountCents: bigint;
  currency: 'PAB' | 'USD';
  sellerId: string;
  paymentIntentId: string;
  idempotencyKey: string;
}

export interface YappyPaymentResponse {
  externalId: string;
  status: 'processing' | 'succeeded' | 'failed';
  qrCode: string;
}

interface OAuthToken {
  token: string;
  expiresAtEpochMs: number;
}

interface CircuitBreakerState {
  failureCount: number;
  openedAtEpochMs: number | null;
}

export class YappyAdapter {
  private token: OAuthToken | null = null;
  private breaker: CircuitBreakerState = { failureCount: 0, openedAtEpochMs: null };

  constructor(private readonly config: AppConfig) {}

  async createPayment(input: CreateYappyPaymentRequest): Promise<YappyPaymentResponse> {
    this.assertCircuitOpen();
    const accessToken = await this.getAccessToken();

    try {
      const response = await fetch(`${this.config.YAPPY_BASE_URL}/v2/payments`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': input.idempotencyKey
        },
        body: JSON.stringify({
          amount_cents: input.amountCents.toString(),
          currency: input.currency,
          seller_id: input.sellerId,
          payment_intent_id: input.paymentIntentId
        })
      });

      if (!response.ok) {
        this.onFailure();
        throw new Error(`Yappy create payment failed with status ${response.status}`);
      }

      this.onSuccess();
      const payload = (await response.json()) as {
        id: string;
        status: 'processing' | 'succeeded' | 'failed';
        qr_code: string;
      };

      return {
        externalId: payload.id,
        status: payload.status,
        qrCode: payload.qr_code
      };
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  async getPaymentStatus(externalId: string): Promise<'processing' | 'succeeded' | 'failed'> {
    this.assertCircuitOpen();
    const token = await this.getAccessToken();
    const response = await fetch(`${this.config.YAPPY_BASE_URL}/v2/payments/${externalId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      this.onFailure();
      throw new Error(`Yappy get status failed with status ${response.status}`);
    }

    this.onSuccess();
    const payload = (await response.json()) as { status: 'processing' | 'succeeded' | 'failed' };
    return payload.status;
  }

  verifyWebhookSignature(payload: string, signature: string, timestamp: string): boolean {
    const expected = createHmac('sha256', this.config.YAPPY_WEBHOOK_SECRET)
      .update(`${timestamp}.${payload}`)
      .digest('hex');
    return signature === expected;
  }

  private async getAccessToken(): Promise<string> {
    if (this.token && this.token.expiresAtEpochMs > Date.now() + 5000) {
      return this.token.token;
    }

    const response = await fetch(`${this.config.YAPPY_BASE_URL}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: this.config.YAPPY_CLIENT_ID,
        client_secret: this.config.YAPPY_CLIENT_SECRET
      })
    });

    if (!response.ok) {
      this.onFailure();
      throw new Error(`Yappy OAuth failed with status ${response.status}`);
    }

    const payload = (await response.json()) as { access_token: string; expires_in: number };
    this.token = {
      token: payload.access_token,
      expiresAtEpochMs: Date.now() + payload.expires_in * 1000
    };

    return payload.access_token;
  }

  private assertCircuitOpen(): void {
    if (!this.breaker.openedAtEpochMs) return;
    const elapsed = Date.now() - this.breaker.openedAtEpochMs;
    if (elapsed < 30_000) {
      throw new Error('Yappy circuit breaker open. Retry later.');
    }

    this.breaker.openedAtEpochMs = null;
    this.breaker.failureCount = 0;
  }

  private onFailure(): void {
    this.breaker.failureCount += 1;
    if (this.breaker.failureCount >= 5) {
      this.breaker.openedAtEpochMs = Date.now();
    }
  }

  private onSuccess(): void {
    this.breaker.failureCount = 0;
    this.breaker.openedAtEpochMs = null;
  }
}
