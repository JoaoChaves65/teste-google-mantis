import { z } from 'zod';

const envSchema = z.object({
  VITE_API_BASE_URL: z.string().url().default('http://localhost:3001'),
  VITE_APP_TITLE: z.string().default('BarberLab'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type Env = z.infer<typeof envSchema>;

const result = envSchema.safeParse(import.meta.env);

if (!result.success) {
  console.error('Invalid environment variables:', result.error.flatten().fieldErrors);
  throw new Error('Invalid environment configuration');
}

export const env = result.data;
