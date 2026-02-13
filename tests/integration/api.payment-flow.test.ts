import { readFile } from 'node:fs/promises';
import path from 'node:path';
import request from 'supertest';
import { Client } from 'pg';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { buildServer } from '../../services/api/src/server';

const migrationPaths = [
  path.resolve(__dirname, '../../infra/migrations/0001_init.sql'),
  path.resolve(__dirname, '../../infra/migrations/0002_views.sql'),
  path.resolve(__dirname, '../../infra/migrations/0003_indices.sql')
];

describe('integration/payment flow', () => {
  let container: Awaited<ReturnType<PostgreSqlContainer['start']>>;
  let app: Awaited<ReturnType<typeof buildServer>>;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16').start();
    const dbUrl = container.getConnectionUri();

    const client = new Client({ connectionString: dbUrl });
    await client.connect();
    for (const migrationPath of migrationPaths) {
      const sql = await readFile(migrationPath, 'utf8');
      await client.query(sql);
    }
    await client.end();

    process.env.STORAGE_BACKEND = 'postgres';
    process.env.DATABASE_URL = dbUrl;
    process.env.API_ENV = 'test';
    process.env.YAPPY_BASE_URL = 'http://127.0.0.1:4010';
    process.env.PAYCADDY_BASE_URL = 'http://127.0.0.1:4020';

    app = await buildServer();
  }, 120000);

  afterAll(async () => {
    await app?.close();
    await container?.stop();
  });

  it('creates a project and seller over HTTP routes', async () => {
    const projectRes = await request(app.server).post('/v1/projects').send({
      name: 'Integration project',
      environment: 'test'
    });

    expect(projectRes.status).toBe(201);
    expect(projectRes.body.api_key).toMatch(/^sk_test_/);

    const sellerRes = await request(app.server)
      .post('/v1/sellers')
      .set('authorization', `Bearer ${projectRes.body.api_key}`)
      .send({
        name: 'Seller Integration',
        email: 'seller.integration@example.com',
        ruc: '1558897799',
        preferred_currency: 'PAB'
      });

    expect(sellerRes.status).toBe(201);
    expect(sellerRes.body.seller).toMatchObject({
      name: 'Seller Integration',
      preferred_currency: 'PAB'
    });
  });
});
