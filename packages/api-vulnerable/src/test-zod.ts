import { z } from 'zod';
const schema = z.object({
  hireDate: z.iso.datetime(),
  active: z.boolean().optional(),
});
console.log(schema.safeParse({ hireDate: '2024-01-01', active: true }));
