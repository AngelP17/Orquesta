import argon2 from 'argon2';
import type { FastifyReply, FastifyRequest } from 'fastify';

const API_KEY_PATTERN = /^sk_(test|live)_[A-Za-z0-9]{24,}$/;

const extractBearer = (authorization?: string): string | null => {
  if (!authorization) return null;
  const [scheme, token] = authorization.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
};

const parseKeyEnvironment = (apiKey: string): 'test' | 'live' | null => {
  const match = API_KEY_PATTERN.exec(apiKey);
  if (!match) return null;
  return match[1] as 'test' | 'live';
};

export const apiKeyAuth = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const apiKey = extractBearer(request.headers.authorization);
  if (!apiKey) {
    await reply.code(401).send({ error: { code: 'missing_api_key', message: 'Bearer API key is required.' } });
    return;
  }

  const keyEnvironment = parseKeyEnvironment(apiKey);
  if (!keyEnvironment) {
    await reply.code(401).send({ error: { code: 'invalid_api_key_format', message: 'Invalid API key format.' } });
    return;
  }

  if (keyEnvironment !== request.server.config.API_ENV) {
    await reply.code(403).send({
      error: {
        code: 'api_key_environment_mismatch',
        message: `Key environment ${keyEnvironment} cannot access ${request.server.config.API_ENV}.`
      }
    });
    return;
  }

  // Argon2 hashes include random salts, so lookup must verify against all candidate hashes.
  const projects = await request.server.storage.listProjects(100);
  let matchedProjectId: string | null = null;
  for (const project of projects.data) {
    if (project.environment !== keyEnvironment) continue;
    // eslint-disable-next-line no-await-in-loop
    if (await argon2.verify(project.apiKeyHash, apiKey)) {
      matchedProjectId = project.id;
      break;
    }
  }

  if (!matchedProjectId) {
    await reply.code(401).send({ error: { code: 'invalid_api_key', message: 'API key verification failed.' } });
    return;
  }

  request.auth = {
    projectId: matchedProjectId,
    environment: keyEnvironment,
    apiKeyPrefix: apiKey.slice(0, 12)
  };
};
