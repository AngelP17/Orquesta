import { randomUUID } from 'node:crypto';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import Fastify from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { loadConfig } from './config';
import registerFeeRoutes from './routes/fees';
import registerMetricsRoutes from './routes/metrics';
import registerPaymentIntentRoutes from './routes/paymentIntents';
import registerProjectRoutes from './routes/projects';
import registerSellerRoutes from './routes/sellers';
import registerTaxReportRoutes from './routes/taxReports';
import registerWebhookRoutes from './routes/webhooks';
import { createMemoryStorage } from './storage/memory';
import { createPostgresStorage } from './storage/postgres';

export const buildServer = async () => {
  const config = loadConfig();
  const fastify = Fastify({ logger: true });

  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);

  await fastify.register(cors, { origin: true });
  await fastify.register(helmet);
  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute'
  });
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: 'Orquesta API',
        version: '1.0.0'
      }
    }
  });
  await fastify.register(swaggerUi, {
    routePrefix: '/docs'
  });

  const storage =
    config.STORAGE_BACKEND === 'postgres'
      ? createPostgresStorage({ connectionString: config.DATABASE_URL, maxConnections: 10 })
      : createMemoryStorage();

  fastify.decorate('config', config);
  fastify.decorate('storage', storage);

  fastify.addHook('onRequest', async (request) => {
    const correlationId = (request.headers['x-correlation-id'] as string | undefined) ?? randomUUID();
    request.correlationId = correlationId;
    request.log = request.log.child({ correlation_id: correlationId, project_id: request.auth?.projectId });
  });

  fastify.setErrorHandler((error, _request, reply) => {
    const message = error instanceof Error ? error.message : 'Unknown error';
    reply.status(500).send({
      error: {
        code: 'internal_server_error',
        message
      }
    });
  });

  fastify.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  await registerProjectRoutes(fastify);
  await registerSellerRoutes(fastify);
  await registerPaymentIntentRoutes(fastify);
  await registerFeeRoutes(fastify);
  await registerMetricsRoutes(fastify);
  await registerTaxReportRoutes(fastify);
  await registerWebhookRoutes(fastify);

  return fastify;
};

const start = async () => {
  const app = await buildServer();
  await app.listen({ port: app.config.PORT, host: '0.0.0.0' });
};

if (require.main === module) {
  start().catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  });
}
