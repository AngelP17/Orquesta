import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { YappyAdapter } from '../adapters/yappy';
import { postPaymentConfirmed } from '../domain/postPaymentConfirmed';

const seenWebhooks = new Set<string>();

const getRiskTier = (amountCents: bigint): 'GREEN' | 'YELLOW' | 'RED' | 'BLACK' => {
  if (amountCents >= 5_000_000n) return 'BLACK';
  if (amountCents >= 1_000_000n) return 'RED';
  if (amountCents >= 300_000n) return 'YELLOW';
  return 'GREEN';
};

export default async function registerWebhookRoutes(fastify: FastifyInstance): Promise<void> {
  const yappy = new YappyAdapter(fastify.config);

  fastify.post(
    '/webhooks/yappy',
    {
      schema: {
        headers: z.object({
          'x-yappy-signature': z.string(),
          'x-yappy-timestamp': z.string()
        }),
        body: z.object({
          type: z.string(),
          data: z.object({
            payment_intent_id: z.string().uuid(),
            status: z.enum(['processing', 'succeeded', 'failed'])
          })
        })
      }
    },
    async (request, reply) => {
      const bodyRaw = JSON.stringify(request.body);
      const headers = request.headers as { 'x-yappy-signature': string; 'x-yappy-timestamp': string };

      const valid = yappy.verifyWebhookSignature(bodyRaw, headers['x-yappy-signature'], headers['x-yappy-timestamp']);
      if (!valid) {
        return reply.code(401).send({ error: { code: 'invalid_signature', message: 'Webhook signature invalid.' } });
      }

      const replayKey = `${headers['x-yappy-timestamp']}:${headers['x-yappy-signature']}`;
      if (seenWebhooks.has(replayKey)) {
        return reply.code(200).send({ received: true, duplicate: true });
      }
      seenWebhooks.add(replayKey);

      const payload = request.body as { type: string; data: { payment_intent_id: string; status: 'processing' | 'succeeded' | 'failed' } };
      const paymentIntent = await fastify.storage.getPaymentIntentById(payload.data.payment_intent_id);

      if (!paymentIntent) {
        return reply.code(404).send({ error: { code: 'payment_intent_not_found', message: 'Payment intent not found.' } });
      }

      if (payload.data.status === 'failed') {
        await fastify.storage.updatePaymentIntentStatus(paymentIntent.id, 'failed');
        return { received: true };
      }

      const riskTier = getRiskTier(paymentIntent.amountCents);
      if (riskTier === 'BLACK') {
        await fastify.storage.updatePaymentIntentStatus(paymentIntent.id, 'failed');
        return reply.code(200).send({ received: true, blocked: true });
      }

      const feeCents = (paymentIntent.amountCents * 29n) / 1000n;
      await postPaymentConfirmed(fastify.storage, {
        paymentIntent,
        platformFeeCents: feeCents,
        idempotencyKey: randomUUID()
      });

      return { received: true };
    }
  );

  fastify.post(
    '/webhooks/paycaddy',
    {
      schema: {
        body: z.object({
          type: z.literal('payout.updated'),
          data: z.object({
            payout_id: z.string().uuid().optional(),
            status: z.enum(['processing', 'paid', 'failed'])
          })
        })
      }
    },
    async () => {
      return { received: true };
    }
  );
}
