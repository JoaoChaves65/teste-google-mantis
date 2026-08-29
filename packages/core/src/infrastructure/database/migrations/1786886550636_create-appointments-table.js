/**
 * Migration: create-appointments-table
 * Creates the appointments table with FKs to customers, barbers, and services.
 */

exports.up = pgm => {
  pgm.createTable('appointments', {
    id: {
      type: 'uuid',
      primaryKey: true,
      notNull: true,
      default: pgm.func('gen_random_uuid()'),
    },
    customer_id: {
      type: 'uuid',
      notNull: true,
      references: 'customers',
      onDelete: 'RESTRICT',
    },
    barber_id: {
      type: 'uuid',
      notNull: true,
      references: 'barbers',
      onDelete: 'RESTRICT',
    },
    service_id: {
      type: 'uuid',
      notNull: true,
      references: 'services',
      onDelete: 'RESTRICT',
    },
    date_time: {
      type: 'timestamptz',
      notNull: true,
    },
    status: {
      type: 'varchar(20)',
      notNull: true,
      default: 'PENDING',
      check: "status IN ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED')",
    },
    notes: {
      type: 'text',
      notNull: false,
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });

  pgm.createIndex('appointments', ['barber_id', 'date_time']);
  pgm.createIndex('appointments', ['customer_id', 'date_time']);
  pgm.createIndex('appointments', 'status');
};

exports.down = pgm => {
  pgm.dropTable('appointments');
};
