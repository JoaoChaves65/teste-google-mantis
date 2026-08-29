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
    const res = await pool.query('SELECT id, email, role FROM users ORDER BY email');
    console.log(
      'Users:',
      res.rows.map(r => ({ email: r.email, role: r.role, id: r.id.substring(0, 8) }))
    );

    const tables = ['users', 'customers', 'barbers', 'appointments', 'services', 'transactions'];
    for (const table of tables) {
      const res = await pool.query('SELECT COUNT(*) FROM ' + table);
      console.log(table + ':', res.rows[0].count, 'rows');
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
