import { randomUUID } from 'node:crypto';
import Fastify from 'fastify';

const app = Fastify({ logger: true });

const payouts = new Map<string, { id: string; status: 'processing' | 'paid' | 'failed' }>();

app.post('/kyc/verify', async (request) => {
  const body = request.body as { ruc: string };
  await sleep(randomDelay());

  if (!/^\d{8,15}$/.test(body.ruc)) {
    return { verified: false, reason: 'invalid_ruc' };
  }

  return { verified: true };
});

app.post('/payouts', async (request, reply) => {
  const body = request.body as { amount_cents: string };
  await sleep(randomDelay());

  if (Math.random() < 0.05) {
    return reply.code(503).send({ error: 'provider_temporarily_unavailable' });
  }

  const status: 'paid' | 'processing' = BigInt(body.amount_cents) % 2n === 0n ? 'paid' : 'processing';
  const payout = { id: `pc_${randomUUID()}`, status };
  payouts.set(payout.id, payout);

  return {
    externalId: payout.id,
    status: payout.status
  };
});

app.get('/payouts/:id', async (request, reply) => {
  const params = request.params as { id: string };
  const payout = payouts.get(params.id);
  if (!payout) {
    return reply.code(404).send({ error: 'not_found' });
  }

  if (payout.status === 'processing' && Math.random() < 0.7) {
    payout.status = 'paid';
    payouts.set(payout.id, payout);
  }

  return payout;
});

app.post('/webhooks/simulate', async (request, reply) => {
  const body = request.body as { callback_url: string; payout_id: string };
  const payout = payouts.get(body.payout_id);
  if (!payout) {
    return reply.code(404).send({ error: 'unknown_payout' });
  }

  await fetch(body.callback_url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'payout.updated',
      data: { external_id: payout.id, status: payout.status }
    })
  });

  return { dispatched: true };
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const randomDelay = () => 2000 + Math.floor(Math.random() * 3000);

const start = async () => {
  await app.listen({ host: '0.0.0.0', port: 4020 });
};

start().catch((error) => {
  app.log.error(error);
  process.exit(1);
});
