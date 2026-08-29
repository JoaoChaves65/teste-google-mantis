import { z } from 'zod/v4';
const schema = z.object({
  hireDate: z.iso.datetime(),
  active: z.boolean().optional(),
});
console.log(schema.safeParse({ hireDate: '2024-01-01T00:00:00.000Z', active: true }));
