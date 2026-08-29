/**
 * Migration: create-transactions-table
 * Creates the transactions table for financial records.
 */

exports.up = pgm => {
  pgm.createTable('transactions', {
    id: {
      type: 'uuid',
      primaryKey: true,
      notNull: true,
      default: pgm.func('gen_random_uuid()'),
    },
    type: {
      type: 'varchar(10)',
      notNull: true,
      check: "type IN ('INCOME', 'EXPENSE')",
    },
    category: {
      type: 'varchar(100)',
      notNull: true,
    },
    amount: {
      type: 'numeric(10,2)',
      notNull: true,
      check: 'amount > 0',
    },
    description: {
      type: 'text',
      notNull: false,
    },
    date: {
      type: 'date',
      notNull: true,
    },
    appointment_id: {
      type: 'uuid',
      notNull: false,
      references: 'appointments',
      onDelete: 'SET NULL',
    },
    barber_id: {
      type: 'uuid',
      notNull: false,
      references: 'barbers',
      onDelete: 'SET NULL',
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

  pgm.createIndex('transactions', 'date');
  pgm.createIndex('transactions', 'type');
  pgm.createIndex('transactions', 'appointment_id');
  pgm.createIndex('transactions', 'barber_id');
};

exports.down = pgm => {
  pgm.dropTable('transactions');
};
