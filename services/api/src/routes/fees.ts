import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { apiKeyAuth } from '../auth';
import { sweepPendingFees } from '../domain/feeSweep';

export default async function registerFeeRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post(
    '/v1/fee-sweeps',
    {
      preHandler: apiKeyAuth,
      schema: {
        body: z.object({ seller_id: z.string().uuid().optional() }).optional(),
        response: {
          200: z.object({ swept_count: z.number().int(), swept_amount_cents: z.string() })
        }
      }
    },
    async (request) => {
      const body = (request.body as { seller_id?: string } | undefined) ?? {};
      const result = await sweepPendingFees(fastify.storage, request.auth!.projectId, body.seller_id);
      return { swept_count: result.sweptCount, swept_amount_cents: result.sweptAmountCents.toString() };
    }
  );

  fastify.get(
    '/v1/fee-obligations',
    {
      preHandler: apiKeyAuth,
      schema: {
        querystring: z.object({ seller_id: z.string().uuid().optional() }),
        response: {
          200: z.object({
            data: z.array(
              z.object({
                id: z.string().uuid(),
                seller_id: z.string().uuid(),
                amount_cents: z.string(),
                itbms_cents: z.string(),
                currency: z.enum(['PAB', 'USD']),
                status: z.enum(['pending', 'swept', 'waived']),
                created_at: z.string().datetime()
              })
            )
          })
        }
      }
    },
    async (request) => {
      const query = request.query as { seller_id?: string };
      const obligations = await fastify.storage.listPendingFeeObligations(request.auth!.projectId, query.seller_id);
      return {
        data: obligations.map((obligation) => ({
          id: obligation.id,
          seller_id: obligation.sellerId,
          amount_cents: obligation.amountCents.toString(),
          itbms_cents: obligation.itbmsCents.toString(),
          currency: obligation.currency,
          status: obligation.status,
          created_at: obligation.createdAt.toISOString()
        }))
      };
    }
  );
}
