// Database setup - runs in each worker thread before tests
// Set test environment variables FIRST before importing any modules
process.env.JWT_ACCESS_SECRET = 'test-access-secret-key-min-32-chars-long';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-min-32-chars-long';
process.env.DB_PASSWORD = 'changeme';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'barberlab_test';
process.env.DB_USER = 'barberlab';
process.env.DB_PASSWORD = 'changeme';
process.env.TEST_DB_HOST = 'localhost';
process.env.TEST_DB_PORT = '5432';
process.env.TEST_DB_NAME = 'barberlab_test';
process.env.TEST_DB_USER = 'barberlab';
process.env.TEST_DB_PASSWORD = 'changeme';
process.env.CORS_ORIGIN = 'http://localhost:5173';
process.env.NODE_ENV = 'test';

// Database setup - runs in each worker thread
import { setupTestDatabase } from '@barberlab/core';
import { createPasswordHasher } from '@barberlab/core/shared';
import { getTestPool, runMigrations } from '@barberlab/core/infrastructure';
import { randomUUID } from 'node:crypto';

// Use global to persist across module re-evaluations
const SETUP_DONE_KEY = '__barberlab_db_setup_done__';

async function setupDatabase() {
  const pool = getTestPool();
  try {
    const existing = await pool.query('SELECT COUNT(*) as cnt FROM users');
    if (parseInt(existing.rows[0].cnt) > 0) {
      console.log('[DB Setup] Users already exist, skipping setup');
      return;
    }
  } catch (e) {
    // Table might not exist yet, continue with setup
    console.log('[DB Setup] Users table not found, running full setup');
  }

  try {
    await runMigrations('up');
    const pool = getTestPool();

    // Clean existing test data to avoid FK violations
    await pool.query(
      'TRUNCATE TABLE ' +
        'transactions, ' +
        'appointments, ' +
        'services, ' +
        'barbers, ' +
        'customers, ' +
        'users, ' +
        'refresh_tokens ' +
        'RESTART IDENTITY CASCADE;'
    );

    // Debug after TRUNCATE
    const afterTruncate = await pool.query('SELECT COUNT(*) as cnt FROM users');
    console.log('[DB Setup] Users after TRUNCATE:', afterTruncate.rows[0].cnt);

    // Add missing unique constraints for ON CONFLICT to work
    const alterCustomers =
      'ALTER TABLE customers ADD CONSTRAINT customers_email_key UNIQUE (email)';
    const alterServices = 'ALTER TABLE services ADD CONSTRAINT services_email_key UNIQUE (email)';
    await pool.query(alterCustomers).catch(() => {});
    await pool.query(alterServices).catch(() => {});

    // Pre-computed argon2id hash for 'validpassword123'
    // Generated with: memoryCost=65536, timeCost=3, parallelism=1
    const passwordHash =
      '$argon2id$v=19$m=65536,t=3,p=1$kBLe4MlmFk6Tp5wBkanDZA$pgUZFU3AL9rAvXLLhit0saZ0Tn7CBs/Dp5J0y4RsB+g';
    const now = new Date();

    // Look up existing user IDs by email, or insert new users and return their IDs
    const getOrCreateUserId = async (email: string, name: string, role: string) => {
      const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rows[0]) return existing.rows[0].id;

      const newId = randomUUID();
      await pool.query(
        `INSERT INTO users (id, name, email, password_hash, role, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [newId, name, email, passwordHash, role, 'ACTIVE', new Date(), new Date()]
      );

      // Verify insert
      const verify = await pool.query('SELECT id FROM users WHERE id = $1', [newId]);
      console.log(
        '[DB Setup] getOrCreateUserId verify for',
        email,
        ':',
        verify.rows.length > 0 ? 'OK' : 'MISSING'
      );
      return newId;
    };

    const adminUserId = await getOrCreateUserId('admin@barberlab.local', 'Admin User', 'ADMIN');
    console.log('[DB Setup] Admin user created:', adminUserId);

    // Debug after admin getOrCreateUserId
    const afterAdmin = await pool.query('SELECT COUNT(*) as cnt FROM users');
    console.log('[DB Setup] Users after admin getOrCreateUserId:', afterAdmin.rows[0].cnt);
    await pool.query(
      `INSERT INTO users (id, name, email, password_hash, role, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (email) DO NOTHING`,
      [
        adminUserId,
        'Admin User',
        'admin@barberlab.local',
        passwordHash,
        'ADMIN',
        'ACTIVE',
        new Date(),
        new Date(),
      ]
    );

    const barber1UserId = await getOrCreateUserId(
      'joao.barbeiro@barberlab.local',
      'João Barbeiro',
      'BARBER'
    );
    console.log('[DB Setup] Barber1 user created:', barber1UserId);
    const barber2UserId = await getOrCreateUserId(
      'maria.barbeira@barberlab.local',
      'Maria Barbeira',
      'BARBER',
      randomUUID()
    );
    console.log('[DB Setup] Barber2 user created:', barber2UserId);
    await pool.query(
      `INSERT INTO users (id, name, email, password_hash, role, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (email) DO NOTHING`,
      [
        barber1UserId,
        'João Barbeiro',
        'joao.barbeiro@barberlab.local',
        passwordHash,
        'BARBER',
        'ACTIVE',
        new Date(),
        new Date(),
      ]
    );
    await pool.query(
      `INSERT INTO users (id, name, email, password_hash, role, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (email) DO NOTHING`,
      [
        barber2UserId,
        'Maria Barbeira',
        'maria.barbeira@barberlab.local',
        passwordHash,
        'BARBER',
        'ACTIVE',
        new Date(),
        new Date(),
      ]
    );

    const customer1UserId = await getOrCreateUserId(
      'carlos.cliente@barberlab.local',
      'Carlos Cliente',
      'CUSTOMER'
    );
    console.log('[DB Setup] Customer1 user created:', customer1UserId);
    const customer2UserId = await getOrCreateUserId(
      'ana.cliente@barberlab.local',
      'Ana Cliente',
      'CUSTOMER',
      randomUUID()
    );
    console.log('[DB Setup] Customer2 user created:', customer2UserId);
    const customer3UserId = await getOrCreateUserId(
      'pedro.cliente@barberlab.local',
      'Pedro Cliente',
      'CUSTOMER',
      randomUUID()
    );
    console.log('[DB Setup] Customer3 user created:', customer3UserId);
    const testUserId = await getOrCreateUserId(
      'test@barberlab.local',
      'Test User',
      'CUSTOMER',
      randomUUID()
    );

    await pool.query(
      `INSERT INTO users (id, name, email, password_hash, role, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (email) DO NOTHING`,
      [
        customer1UserId,
        'Carlos Cliente',
        'carlos.cliente@barberlab.local',
        passwordHash,
        'CUSTOMER',
        'ACTIVE',
        new Date(),
        new Date(),
      ]
    );
    await pool.query(
      `INSERT INTO users (id, name, email, password_hash, role, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (email) DO NOTHING`,
      [
        customer2UserId,
        'Ana Cliente',
        'ana.cliente@barberlab.local',
        passwordHash,
        'CUSTOMER',
        'ACTIVE',
        new Date(),
        new Date(),
      ]
    );
    await pool.query(
      `INSERT INTO users (id, name, email, password_hash, role, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (email) DO NOTHING`,
      [
        customer3UserId,
        'Pedro Cliente',
        'pedro.cliente@barberlab.local',
        passwordHash,
        'CUSTOMER',
        'ACTIVE',
        new Date(),
        new Date(),
      ]
    );
    // Backward compatibility for auth tests
    await pool.query(
      `INSERT INTO users (id, name, email, password_hash, role, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (email) DO NOTHING`,
      [
        testUserId,
        'Test User',
        'test@barberlab.local',
        passwordHash,
        'CUSTOMER',
        'ACTIVE',
        new Date(),
        new Date(),
      ]
    );

    // Create CUSTOMERS
    await pool.query(
      `INSERT INTO customers (id, user_id, name, phone, email, birth_date, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (email) DO NOTHING`,
      [
        randomUUID(),
        customer1UserId,
        'Carlos Cliente',
        '(11) 99999-1111',
        'carlos.cliente@barberlab.local',
        '1990-05-15',
        'Cliente regular',
        new Date(),
        new Date(),
      ]
    );
    await pool.query(
      `INSERT INTO customers (id, user_id, name, phone, email, birth_date, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (email) DO NOTHING`,
      [
        randomUUID(),
        customer2UserId,
        'Ana Cliente',
        '(11) 99999-2222',
        'ana.cliente@barberlab.local',
        '1985-08-22',
        'Cliente VIP',
        new Date(),
        new Date(),
      ]
    );
    await pool.query(
      `INSERT INTO customers (id, user_id, name, phone, email, birth_date, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (email) DO NOTHING`,
      [
        randomUUID(),
        customer3UserId,
        'Pedro Cliente',
        '(11) 99999-3333',
        'pedro.cliente@barberlab.local',
        '1992-12-10',
        'Novo cliente',
        new Date(),
        new Date(),
      ]
    );
    await pool.query(
      `INSERT INTO customers (id, user_id, name, phone, email, birth_date, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (email) DO NOTHING`,
      [
        randomUUID(),
        null,
        'Lucas Sem Conta',
        '(11) 99999-4444',
        'lucas.semconta@email.com',
        '1988-03-20',
        'Walk-in',
        new Date(),
        new Date(),
      ]
    );

    // Create BARBERS
    await pool.query(
      `INSERT INTO barbers (id, user_id, name, phone, specialty, hire_date, active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (user_id) DO NOTHING`,
      [
        randomUUID(),
        barber1UserId,
        'João Barbeiro',
        '(11) 98888-1111',
        'Corte clássico e barba',
        '2022-01-15',
        true,
        new Date(),
        new Date(),
      ]
    );
    await pool.query(
      `INSERT INTO barbers (id, user_id, name, phone, specialty, hire_date, active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (user_id) DO NOTHING`,
      [
        randomUUID(),
        barber2UserId,
        'Maria Barbeira',
        '(11) 98888-2222',
        'Corte feminino e coloração',
        '2023-03-01',
        true,
        new Date(),
        new Date(),
      ]
    );

    // Create SERVICES
    const serviceIds = [];
    for (let i = 0; i < 5; i++) {
      const id = randomUUID();
      serviceIds.push(id);
    }
    await pool.query(
      `INSERT INTO services (id, name, description, price, duration_minutes, active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (name) DO NOTHING`,
      [
        serviceIds[0],
        'Corte Masculino Clássico',
        'Corte tesoura e máquina, finalização com pomada',
        45.0,
        30,
        true,
        new Date(),
        new Date(),
      ]
    );
    await pool.query(
      `INSERT INTO services (id, name, description, price, duration_minutes, active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (name) DO NOTHING`,
      [
        serviceIds[1],
        'Barba Completa',
        'Aparar, modelar e hidratar barba',
        35.0,
        20,
        true,
        new Date(),
        new Date(),
      ]
    );
    await pool.query(
      `INSERT INTO services (id, name, description, price, duration_minutes, active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (name) DO NOTHING`,
      [
        serviceIds[2],
        'Corte + Barba',
        'Combo corte clássico + barba completa',
        70.0,
        45,
        true,
        new Date(),
        new Date(),
      ]
    );
    await pool.query(
      `INSERT INTO services (id, name, description, price, duration_minutes, active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (name) DO NOTHING`,
      [
        serviceIds[3],
        'Corte Feminino',
        'Corte tesoura, modelagem e finalização',
        80.0,
        60,
        true,
        new Date(),
        new Date(),
      ]
    );
    await pool.query(
      `INSERT INTO services (id, name, description, price, duration_minutes, active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (name) DO NOTHING`,
      [
        serviceIds[4],
        'Coloração',
        'Coloração completa ou retoque de raiz',
        120.0,
        90,
        true,
        new Date(),
        new Date(),
      ]
    );

    // Create APPOINTMENTS
    const nowDate = new Date();
    const tomorrow = new Date(nowDate.getTime() + 24 * 60 * 60 * 1000);
    const lastWeek = new Date(nowDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get customer IDs for appointments
    const custRes = await pool.query(
      `SELECT id, user_id FROM customers WHERE user_id IS NOT NULL ORDER BY id`
    );
    const [cust1, cust2, cust3] = custRes.rows;

    const barbRes = await pool.query(`SELECT id, user_id FROM barbers ORDER BY id`);
    const [barb1, barb2] = barbRes.rows;

    const apptRes = await pool.query(`SELECT id FROM services ORDER BY id`);
    const [svc1, svc2, svc3] = apptRes.rows;

    await pool.query(
      `INSERT INTO appointments (id, customer_id, barber_id, service_id, date_time, status, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        randomUUID(),
        cust1.id,
        barb1.id,
        svc1.id,
        tomorrow.toISOString(),
        'PENDING',
        'Teste pendente',
        new Date(),
        new Date(),
      ]
    );
    await pool.query(
      `INSERT INTO appointments (id, customer_id, barber_id, service_id, date_time, status, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        randomUUID(),
        cust2.id,
        barb2.id,
        svc2.id,
        new Date(tomorrow.getTime() + 2 * 60 * 60 * 1000).toISOString(),
        'CONFIRMED',
        'Teste confirmado',
        new Date(),
        new Date(),
      ]
    );
    await pool.query(
      `INSERT INTO appointments (id, customer_id, barber_id, service_id, date_time, status, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        randomUUID(),
        cust3.id,
        barb1.id,
        svc3.id,
        new Date(tomorrow.getTime() + 4 * 60 * 60 * 1000).toISOString(),
        'PENDING',
        'Teste pendente 2',
        new Date(),
        new Date(),
      ]
    );
    await pool.query(
      `INSERT INTO appointments (id, customer_id, barber_id, service_id, date_time, status, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        randomUUID(),
        cust1.id,
        barb1.id,
        svc2.id,
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        'COMPLETED',
        'Concluído semana passada',
        new Date(),
        new Date(),
      ]
    );

    // Create TRANSACTIONS
    const barbRes2 = await pool.query(`SELECT id FROM barbers WHERE user_id = $1`, [barber1UserId]);
    const barb1Id = barbRes2.rows[0].id;

    await pool.query(
      `INSERT INTO transactions (id, type, category, amount, description, date, appointment_id, barber_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        randomUUID(),
        'INCOME',
        'Corte',
        45.0,
        'Corte teste',
        new Date().toISOString().split('T')[0],
        null,
        barb1Id,
        new Date(),
        new Date(),
      ]
    );
    await pool.query(
      `INSERT INTO transactions (id, type, category, amount, description, date, appointment_id, barber_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        randomUUID(),
        'EXPENSE',
        'Produtos',
        150.0,
        'Compra produtos',
        new Date().toISOString().split('T')[0],
        null,
        barb1Id,
        new Date(),
        new Date(),
      ]
    );

    // Debug: verify all users exist
    const debugCount = await pool.query('SELECT COUNT(*) as cnt FROM users');
    console.log(
      '[DB Setup] Users count after creation:',
      debugCount.rows[0].cnt,
      'raw:',
      debugCount.rows
    );
    const debugUsers1 = await pool.query('SELECT * FROM users');
    console.log(
      '[DB Setup] Users SELECT *:',
      debugUsers1.rows.map(r => r.email),
      'raw count:',
      debugUsers1.rows.length
    );
    const debugUsers = await pool.query('SELECT email, role, status FROM users');
    console.log('[DB Setup] Users after creation:', debugUsers.rows);

    // Store userId globally for tests
    global.testUserId = testUserId;
    global.adminUserId = adminUserId;
    global.barber1UserId = barber1UserId;
    global.barber2UserId = barber2UserId;
    global.customer1UserId = customer1UserId;
    global.customer2UserId = customer2UserId;
    global.customer3UserId = customer3UserId;

    // Force commit
    await pool.query('COMMIT');
    console.log('[DB Setup] Committed');

    // Check transaction status
    const txStatus = await pool.query('SELECT txid_current()');
    console.log('[DB Setup] TXID:', txStatus.rows);

    // Try a fresh query on the same pool
    const poolResult = await pool.query('SELECT COUNT(*) as cnt FROM users');
    console.log('[DB Setup] Pool count after commit:', poolResult.rows);
  } catch (error) {
    console.error('[DB Setup] Failed to setup database:', error);
    throw error;
  }
}

export default setupDatabase;

// Execute the setup immediately when this module is loaded
setupDatabase();
