import { MatchersV3, PactV3 } from '@pact-foundation/pact';

describe('contract/api <-> paycaddy-mock', () => {
  const provider = new PactV3({
    consumer: 'orquesta-api',
    provider: 'paycaddy-mock'
  });

  it('matches payout creation contract', async () => {
    provider
      .given('PayCaddy receives payout requests')
      .uponReceiving('a payout creation request')
      .withRequest({
        method: 'POST',
        path: '/payouts',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': MatchersV3.regex(/^[a-z0-9-]+$/i, 'test-idempotency-key')
        },
        body: {
          seller_id: MatchersV3.string('s_001'),
          amount_cents: MatchersV3.regex(/^\d+$/, '1200000'),
          currency: MatchersV3.regex(/^(PAB|USD)$/, 'PAB')
        }
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          externalId: MatchersV3.string('pc_123'),
          status: MatchersV3.regex(/^(processing|paid)$/, 'processing')
        }
      });

    await provider.executeTest(async (mockServer) => {
      const response = await fetch(`${mockServer.url}/payouts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': 'test-idempotency-key'
        },
        body: JSON.stringify({
          seller_id: 's_001',
          amount_cents: '1200000',
          currency: 'PAB'
        })
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toHaveProperty('externalId');
      expect(body).toHaveProperty('status');
    });
  });
});
