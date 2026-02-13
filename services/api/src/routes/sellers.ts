import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { apiKeyAuth } from '../auth';
import { CursorSchema, ErrorSchema, PaginatedEnvelope } from './_shared';

const SellerSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  ruc: z.string(),
  risk_tier: z.enum(['GREEN', 'YELLOW', 'RED', 'BLACK']),
  preferred_currency: z.enum(['PAB', 'USD']),
  created_at: z.string().datetime()
});

export default async function registerSellerRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post(
    '/v1/sellers',
    {
      preHandler: apiKeyAuth,
      schema: {
        body: z.object({
          name: z.string().min(2),
          email: z.string().email(),
          ruc: z.string().min(8),
          preferred_currency: z.enum(['PAB', 'USD']).default('PAB')
        }),
        response: {
          201: z.object({ seller: SellerSchema }),
          401: ErrorSchema
        }
      }
    },
    async (request, reply) => {
      const body = request.body as {
        name: string;
        email: string;
        ruc: string;
        preferred_currency: 'PAB' | 'USD';
      };

      const seller = await fastify.storage.createSeller({
        projectId: request.auth!.projectId,
        name: body.name,
        email: body.email,
        ruc: body.ruc,
        preferredCurrency: body.preferred_currency
      });

      return reply.code(201).send({
        seller: {
          id: seller.id,
          project_id: seller.projectId,
          name: seller.name,
          email: seller.email,
          ruc: seller.ruc,
          risk_tier: seller.riskTier,
          preferred_currency: seller.preferredCurrency,
          created_at: seller.createdAt.toISOString()
        }
      });
    }
  );

  fastify.get(
    '/v1/sellers',
    {
      preHandler: apiKeyAuth,
      schema: {
        querystring: CursorSchema,
        response: {
          200: PaginatedEnvelope(SellerSchema)
        }
      }
    },
    async (request) => {
      const query = request.query as z.infer<typeof CursorSchema>;
      const result = await fastify.storage.listSellers(request.auth!.projectId, query.limit, query.after_id);
      return {
        data: result.data.map((seller) => ({
          id: seller.id,
          project_id: seller.projectId,
          name: seller.name,
          email: seller.email,
          ruc: seller.ruc,
          risk_tier: seller.riskTier,
          preferred_currency: seller.preferredCurrency,
          created_at: seller.createdAt.toISOString()
        })),
        has_more: result.hasMore,
        next_cursor: result.nextCursor
      };
    }
  );

  fastify.patch(
    '/v1/sellers/:id',
    {
      preHandler: apiKeyAuth,
      schema: {
        params: z.object({ id: z.string().uuid() }),
        body: z.object({ risk_tier: z.enum(['GREEN', 'YELLOW', 'RED', 'BLACK']) }),
        response: {
          200: z.object({ seller: SellerSchema }),
          404: ErrorSchema
        }
      }
    },
    async (request, reply) => {
      const params = request.params as { id: string };
      const body = request.body as { risk_tier: 'GREEN' | 'YELLOW' | 'RED' | 'BLACK' };
      const seller = await fastify.storage.updateSellerRiskTier(params.id, body.risk_tier);

      if (!seller || seller.projectId !== request.auth!.projectId) {
        return reply.code(404).send({ error: { code: 'seller_not_found', message: 'Seller not found.' } });
      }

      return {
        seller: {
          id: seller.id,
          project_id: seller.projectId,
          name: seller.name,
          email: seller.email,
          ruc: seller.ruc,
          risk_tier: seller.riskTier,
          preferred_currency: seller.preferredCurrency,
          created_at: seller.createdAt.toISOString()
        }
      };
    }
  );

  fastify.get(
    '/v1/sellers/:id/balance',
    {
      preHandler: apiKeyAuth,
      schema: {
        params: z.object({ id: z.string().uuid() }),
        querystring: z.object({ currency: z.enum(['PAB', 'USD']).default('PAB') }),
        response: {
          200: z.object({ seller_id: z.string().uuid(), currency: z.enum(['PAB', 'USD']), balance_cents: z.string() }),
          404: ErrorSchema
        }
      }
    },
    async (request, reply) => {
      const params = request.params as { id: string };
      const query = request.query as { currency: 'PAB' | 'USD' };

      const seller = await fastify.storage.getSellerById(params.id);
      if (!seller || seller.projectId !== request.auth!.projectId) {
        return reply.code(404).send({ error: { code: 'seller_not_found', message: 'Seller not found.' } });
      }

      const balance = await fastify.storage.getSellerBalance(request.auth!.projectId, params.id, query.currency);
      return { seller_id: params.id, currency: query.currency, balance_cents: balance.toString() };
    }
  );
}
