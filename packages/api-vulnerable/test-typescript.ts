import { z } from 'zod';
const schema = z.object({
  hireDate: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/),
  active: z.boolean().optional(),
});
console.log(schema.safeParse({ hireDate: '2024-01-01T00:00:00.000Z', active: true }));
