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
    console.log('Testing truncate...');
    await pool.query(`
      TRUNCATE TABLE 
        transactions,
        appointments,
        services,
        barbers,
        customers,
        users,
        refresh_tokens
      RESTART IDENTITY CASCADE;
    `);
    console.log('Truncate successful');

    const res = await pool.query('SELECT COUNT(*) FROM users');
    console.log('Users after truncate:', res.rows[0].count);

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
