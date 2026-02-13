import 'fastify';
import type { AppConfig } from '../config';
import type { Storage } from '../storage/types';

declare module 'fastify' {
  interface FastifyRequest {
    correlationId: string;
    auth?: {
      projectId: string;
      environment: 'test' | 'live';
      apiKeyPrefix: string;
    };
  }

  interface FastifyInstance {
    config: AppConfig;
    storage: Storage;
  }
}
