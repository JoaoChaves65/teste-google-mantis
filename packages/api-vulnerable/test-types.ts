import { z } from 'zod';
const schema = z.object({
  hireDate: z.string().datetime(),
  active: z.boolean().optional(),
});
const result = schema.safeParse({ hireDate: '2024-01-01T00:00:00.000Z', active: true });
console.log(result);
