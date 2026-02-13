import { createHmac, randomUUID } from 'node:crypto';
import Fastify from 'fastify';

const app = Fastify({ logger: true });

const payments = new Map<
  string,
  {
    id: string;
    status: 'processing' | 'succeeded' | 'failed';
    amountCents: string;
    currency: 'PAB' | 'USD';
  }
>();

app.post('/oauth/token', async () => ({
  access_token: `yappy_token_${randomUUID()}`,
  token_type: 'Bearer',
  expires_in: 1800
}));

app.post('/v2/payments', async (request) => {
  const body = request.body as {
    amount_cents: string;
    currency: 'PAB' | 'USD';
  };

  await sleep(randomDelay());

  const payment = {
    id: `yap_${randomUUID()}`,
    status: Math.random() < 0.95 ? 'processing' : 'failed',
    amountCents: body.amount_cents,
    currency: body.currency
  } as const;

  payments.set(payment.id, payment);

  return {
    id: payment.id,
    status: payment.status,
    qr_code: `EMVQR:${payment.id}`
  };
});

app.get('/v2/payments/:id', async (request, reply) => {
  const params = request.params as { id: string };
  const payment = payments.get(params.id);
  if (!payment) {
    return reply.code(404).send({ error: 'not_found' });
  }

  if (payment.status === 'processing') {
    payment.status = Math.random() < 0.85 ? 'succeeded' : 'failed';
    payments.set(payment.id, payment);
  }

  return { id: payment.id, status: payment.status };
});

app.post('/webhooks/simulate', async (request, reply) => {
  const body = request.body as { callback_url: string; payment_id: string; secret: string };
  const payment = payments.get(body.payment_id);
  if (!payment) {
    return reply.code(404).send({ error: 'unknown_payment' });
  }

  const payload = JSON.stringify({
    type: 'payment.succeeded',
    data: {
      external_id: payment.id,
      status: 'succeeded'
    }
  });

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = createHmac('sha256', body.secret).update(`${timestamp}.${payload}`).digest('hex');

  await fetch(body.callback_url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-yappy-signature': signature,
      'x-yappy-timestamp': timestamp
    },
    body: payload
  });

  return { dispatched: true };
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const randomDelay = () => 2000 + Math.floor(Math.random() * 3000);

const start = async () => {
  await app.listen({ host: '0.0.0.0', port: 4010 });
};

start().catch((error) => {
  app.log.error(error);
  process.exit(1);
});
