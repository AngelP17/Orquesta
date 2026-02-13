import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { apiKeyAuth } from '../auth';

export default async function registerMetricsRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get(
    '/v1/metrics/platform',
    {
      preHandler: apiKeyAuth,
      schema: {
        response: {
          200: z.object({
            sellers_total: z.number().int(),
            sellers_by_risk_tier: z.record(z.number().int()),
            balances_cents: z.object({ PAB: z.string(), USD: z.string() })
          })
        }
      }
    },
    async (request) => {
      const sellers = await fastify.storage.listSellers(request.auth!.projectId, 1000);
      const riskBuckets: Record<string, number> = { GREEN: 0, YELLOW: 0, RED: 0, BLACK: 0 };
      let balancePab = 0n;
      let balanceUsd = 0n;

      for (const seller of sellers.data) {
        riskBuckets[seller.riskTier] += 1;
        balancePab += await fastify.storage.getSellerBalance(request.auth!.projectId, seller.id, 'PAB');
        balanceUsd += await fastify.storage.getSellerBalance(request.auth!.projectId, seller.id, 'USD');
      }

      return {
        sellers_total: sellers.data.length,
        sellers_by_risk_tier: riskBuckets,
        balances_cents: {
          PAB: balancePab.toString(),
          USD: balanceUsd.toString()
        }
      };
    }
  );

  fastify.get(
    '/v1/metrics/sellers/:id',
    {
      preHandler: apiKeyAuth,
      schema: {
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: z.object({ seller_id: z.string().uuid(), balance_cents: z.object({ PAB: z.string(), USD: z.string() }) }),
          404: z.object({ error: z.object({ code: z.string(), message: z.string() }) })
        }
      }
    },
    async (request, reply) => {
      const params = request.params as { id: string };
      const seller = await fastify.storage.getSellerById(params.id);
      if (!seller || seller.projectId !== request.auth!.projectId) {
        return reply.code(404).send({ error: { code: 'not_found', message: 'Seller not found.' } });
      }

      const pab = await fastify.storage.getSellerBalance(request.auth!.projectId, params.id, 'PAB');
      const usd = await fastify.storage.getSellerBalance(request.auth!.projectId, params.id, 'USD');
      return { seller_id: params.id, balance_cents: { PAB: pab.toString(), USD: usd.toString() } };
    }
  );
}
