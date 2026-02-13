import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { apiKeyAuth } from '../auth';

const monthSchema = z.string().regex(/^\d{4}-\d{2}$/);

const csvEscape = (value: string): string => {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
};

export default async function registerTaxReportRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get(
    '/v1/tax-reports/:period',
    {
      preHandler: apiKeyAuth,
      schema: {
        params: z.object({ period: monthSchema }),
        querystring: z.object({ format: z.enum(['csv', 'pdf']).default('csv'), language: z.enum(['es', 'en']).default('es') })
      }
    },
    async (request, reply) => {
      const { period } = request.params as { period: string };
      const { format, language } = request.query as { format: 'csv' | 'pdf'; language: 'es' | 'en' };
      const obligations = await fastify.storage.listPendingFeeObligations(request.auth!.projectId);

      const byPeriod = obligations.filter((entry) => entry.createdAt.toISOString().slice(0, 7) === period);
      const totalItbms = byPeriod.reduce((sum, item) => sum + item.itbmsCents, 0n);

      if (format === 'pdf') {
        const title = language === 'es' ? 'Reporte ITBMS (vista previa)' : 'ITBMS Report (preview)';
        return reply.type('application/pdf').send(Buffer.from(`${title}\nPeriodo: ${period}\nTotal ITBMS: ${totalItbms}\n`, 'utf8'));
      }

      const headers =
        language === 'es'
          ? ['periodo', 'seller_id', 'monto_base_centavos', 'itbms_centavos', 'moneda']
          : ['period', 'seller_id', 'base_amount_cents', 'itbms_cents', 'currency'];

      const rows = byPeriod.map((entry) =>
        [period, entry.sellerId, entry.amountCents.toString(), entry.itbmsCents.toString(), entry.currency].map(csvEscape).join(',')
      );

      const csv = [headers.join(','), ...rows].join('\n');
      return reply.type('text/csv').send(csv);
    }
  );

  fastify.post(
    '/v1/tax-reports/:period',
    {
      preHandler: apiKeyAuth,
      schema: {
        params: z.object({ period: monthSchema }),
        response: {
          200: z.object({ submitted: z.boolean(), period: monthSchema, filed_at: z.string().datetime() })
        }
      }
    },
    async (request) => {
      const { period } = request.params as { period: string };
      return { submitted: true, period, filed_at: new Date().toISOString() };
    }
  );
}
