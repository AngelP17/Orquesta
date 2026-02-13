import { MatchersV3, PactV3 } from '@pact-foundation/pact';

describe('contract/api <-> yappy-mock', () => {
  const provider = new PactV3({
    consumer: 'orquesta-api',
    provider: 'yappy-mock'
  });

  it('matches payment creation contract', async () => {
    provider
      .given('Yappy accepts payment requests')
      .uponReceiving('a payment creation request')
      .withRequest({
        method: 'POST',
        path: '/v2/payments',
        headers: {
          'Content-Type': 'application/json',
          Authorization: MatchersV3.regex(/^Bearer\s.+$/, 'Bearer token')
        },
        body: {
          amount_cents: MatchersV3.regex(/^\d+$/, '142500'),
          currency: MatchersV3.regex(/^(PAB|USD)$/, 'PAB'),
          seller_id: MatchersV3.string('s_001'),
          payment_intent_id: MatchersV3.string('pi_1001')
        }
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          id: MatchersV3.string('yap_ext_123'),
          status: MatchersV3.regex(/^(processing|succeeded|failed)$/, 'processing'),
          qr_code: MatchersV3.string('EMVQR:payload')
        }
      });

    await provider.executeTest(async (mockServer) => {
      const response = await fetch(`${mockServer.url}/v2/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token'
        },
        body: JSON.stringify({
          amount_cents: '142500',
          currency: 'PAB',
          seller_id: 's_001',
          payment_intent_id: 'pi_1001'
        })
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('qr_code');
    });
  });
});
