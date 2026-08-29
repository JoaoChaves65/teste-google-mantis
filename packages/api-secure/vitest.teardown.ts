import { resetTestDatabase } from '@barberlab/core/infrastructure';

await resetTestDatabase();
console.log('[Teardown] Database reset');
