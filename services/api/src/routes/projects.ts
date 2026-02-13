import { randomBytes } from 'node:crypto';
import argon2 from 'argon2';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { CursorSchema, ErrorSchema, PaginatedEnvelope } from './_shared';

const ProjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  environment: z.enum(['test', 'live']),
  created_at: z.string().datetime()
});

export default async function registerProjectRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post(
    '/v1/projects',
    {
      schema: {
        body: z.object({
          name: z.string().min(3),
          environment: z.enum(['test', 'live']).default('test')
        }),
        response: {
          201: z.object({
            project: ProjectSchema,
            api_key: z.string()
          }),
          400: ErrorSchema
        }
      }
    },
    async (request, reply) => {
      const body = request.body as { name: string; environment: 'test' | 'live' };
      const apiKey = createApiKey(body.environment);
      const apiKeyHash = await argon2.hash(apiKey, { type: argon2.argon2id });
      const project = await fastify.storage.createProject({ name: body.name, environment: body.environment, apiKeyHash });

      return reply.code(201).send({
        project: {
          id: project.id,
          name: project.name,
          environment: project.environment,
          created_at: project.createdAt.toISOString()
        },
        api_key: apiKey
      });
    }
  );

  fastify.get(
    '/v1/projects',
    {
      schema: {
        querystring: CursorSchema,
        response: {
          200: PaginatedEnvelope(ProjectSchema)
        }
      }
    },
    async (request) => {
      const query = request.query as z.infer<typeof CursorSchema>;
      const result = await fastify.storage.listProjects(query.limit, query.after_id);
      return {
        data: result.data.map((project) => ({
          id: project.id,
          name: project.name,
          environment: project.environment,
          created_at: project.createdAt.toISOString()
        })),
        has_more: result.hasMore,
        next_cursor: result.nextCursor
      };
    }
  );
}

const createApiKey = (environment: 'test' | 'live'): string => {
  const token = randomBytes(24).toString('base64url');
  return `sk_${environment}_${token}`;
};
