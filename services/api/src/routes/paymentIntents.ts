import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { apiKeyAuth } from '../auth';
import { YappyAdapter } from '../adapters/yappy';
import { CursorSchema, ErrorSchema, PaginatedEnvelope, requireIdempotencyKey } from './_shared';

const PaymentIntentSchema = z.object({
  id: z.string().uuid(),
  seller_id: z.string().uuid(),
  amount_cents: z.string(),
  currency: z.enum(['PAB', 'USD']),
  status: z.enum(['requires_payment_method', 'processing', 'succeeded', 'failed', 'canceled']),
  provider: z.literal('yappy'),
  external_id: z.string().nullable(),
  qr_code: z.string().optional(),
  created_at: z.string().datetime()
});

export default async function registerPaymentIntentRoutes(fastify: FastifyInstance): Promise<void> {
  const yappy = new YappyAdapter(fastify.config);

  fastify.post(
    '/v1/payment-intents',
    {
      preHandler: apiKeyAuth,
      schema: {
        body: z.object({
          seller_id: z.string().uuid(),
          amount_cents: z.string().regex(/^\d+$/),
          currency: z.enum(['PAB', 'USD']),
          metadata: z.record(z.string()).optional()
        }),
        response: {
          201: z.object({ payment_intent: PaymentIntentSchema }),
          409: ErrorSchema
        }
      }
    },
    async (request, reply) => {
      const body = request.body as {
        seller_id: string;
        amount_cents: string;
        currency: 'PAB' | 'USD';
        metadata?: Record<string, string>;
      };

      const idempotencyKey = requireIdempotencyKey(request.headers['idempotency-key']);
      const existing = await fastify.storage.getPaymentIntentByIdempotencyKey(request.auth!.projectId, idempotencyKey);
      if (existing) {
        return reply.code(409).send({
          error: {
            code: 'idempotency_conflict',
            message: 'Idempotency-Key already used for this project.'
          }
        });
      }

      const paymentIntent = await fastify.storage.createPaymentIntent({
        projectId: request.auth!.projectId,
        sellerId: body.seller_id,
        amountCents: BigInt(body.amount_cents),
        currency: body.currency,
        idempotencyKey,
        metadata: body.metadata
      });

      const yappyResponse = await yappy.createPayment({
        amountCents: paymentIntent.amountCents,
        currency: paymentIntent.currency,
        sellerId: paymentIntent.sellerId,
        paymentIntentId: paymentIntent.id,
        idempotencyKey: randomUUID()
      });

      const updated = await fastify.storage.updatePaymentIntentStatus(paymentIntent.id, 'processing', yappyResponse.externalId);

      return reply.code(201).send({
        payment_intent: {
          id: paymentIntent.id,
          seller_id: paymentIntent.sellerId,
          amount_cents: paymentIntent.amountCents.toString(),
          currency: paymentIntent.currency,
          status: updated?.status ?? paymentIntent.status,
          provider: 'yappy',
          external_id: yappyResponse.externalId,
          qr_code: yappyResponse.qrCode,
          created_at: paymentIntent.createdAt.toISOString()
        }
      });
    }
  );

  fastify.get(
    '/v1/payment-intents/:id',
    {
      preHandler: apiKeyAuth,
      schema: {
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: z.object({ payment_intent: PaymentIntentSchema }),
          404: ErrorSchema
        }
      }
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const intent = await fastify.storage.getPaymentIntentById(id);
      if (!intent || intent.projectId !== request.auth!.projectId) {
        return reply.code(404).send({ error: { code: 'not_found', message: 'Payment intent not found.' } });
      }

      return {
        payment_intent: {
          id: intent.id,
          seller_id: intent.sellerId,
          amount_cents: intent.amountCents.toString(),
          currency: intent.currency,
          status: intent.status,
          provider: intent.provider,
          external_id: intent.externalId,
          created_at: intent.createdAt.toISOString()
        }
      };
    }
  );

  fastify.get(
    '/v1/payment-intents',
    {
      preHandler: apiKeyAuth,
      schema: {
        querystring: CursorSchema,
        response: {
          200: PaginatedEnvelope(PaymentIntentSchema)
        }
      }
    },
    async (request) => {
      const query = request.query as z.infer<typeof CursorSchema>;
      const result = await fastify.storage.listPaymentIntents(request.auth!.projectId, query.limit, query.after_id);
      return {
        data: result.data.map((intent) => ({
          id: intent.id,
          seller_id: intent.sellerId,
          amount_cents: intent.amountCents.toString(),
          currency: intent.currency,
          status: intent.status,
          provider: intent.provider,
          external_id: intent.externalId,
          created_at: intent.createdAt.toISOString()
        })),
        has_more: result.hasMore,
        next_cursor: result.nextCursor
      };
    }
  );
}
