import { z } from 'zod';

const ConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3002),
  DATABASE_URL: z.string().default('postgres://postgres:postgres@localhost:5432/orquesta'),
  API_ENV: z.enum(['test', 'live']).default('test'),
  STORAGE_BACKEND: z.enum(['memory', 'postgres']).default('memory'),
  YAPPY_BASE_URL: z.string().url().default('http://localhost:4010'),
  YAPPY_WEBHOOK_SECRET: z.string().min(8).default('yappy_test_secret'),
  YAPPY_CLIENT_ID: z.string().default('orquesta_yappy_client'),
  YAPPY_CLIENT_SECRET: z.string().default('orquesta_yappy_secret'),
  PAYCADDY_BASE_URL: z.string().url().default('http://localhost:4020'),
  PAYCADDY_CERT_PATH: z.string().default('./certs/paycaddy.crt'),
  PAYCADDY_KEY_PATH: z.string().default('./certs/paycaddy.key'),
  PAYCADDY_CA_PATH: z.string().default('./certs/paycaddy.ca'),
  ANALYTICS_API_URL: z.string().url().optional(),
  ANALYTICS_API_KEY: z.string().optional()
});

export type AppConfig = z.infer<typeof ConfigSchema> & {
  isProduction: boolean;
};

export const loadConfig = (): AppConfig => {
  const config = ConfigSchema.parse(process.env);
  return {
    ...config,
    isProduction: config.NODE_ENV === 'production'
  };
};
