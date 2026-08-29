const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'barberlab_test',
  user: 'barberlab',
  password: 'changeme',
});

async function test() {
  try {
    const tables = ['users', 'customers', 'barbers', 'services', 'appointments', 'transactions'];
    for (const table of tables) {
      const res = await pool.query(
        "SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = $1::regclass AND contype = 'u'",
        [table]
      );
      console.log(table + ' unique constraints:', JSON.stringify(res.rows, null, 2));
    }
    pool.end();
  } catch (e) {
    console.error('Error:', e.message);
    console.error(e.stack);
    pool.end();
  }
}

test().catch(e => {
  console.error('Error:', e.message);
  console.error(e.stack);
});
