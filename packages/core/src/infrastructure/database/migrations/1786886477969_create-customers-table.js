/**
 * Migration: create-customers-table
 * Creates the customers table with optional FK to users.
 */

exports.up = pgm => {
  pgm.createTable('customers', {
    id: {
      type: 'uuid',
      primaryKey: true,
      notNull: true,
      default: pgm.func('gen_random_uuid()'),
    },
    user_id: {
      type: 'uuid',
      notNull: false,
      unique: true,
      references: 'users',
      onDelete: 'SET NULL',
    },
    name: {
      type: 'varchar(255)',
      notNull: true,
    },
    phone: {
      type: 'varchar(50)',
      notNull: true,
    },
    email: {
      type: 'varchar(255)',
      notNull: false,
    },
    birth_date: {
      type: 'date',
      notNull: false,
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

  pgm.createIndex('customers', 'phone');
  pgm.createIndex('customers', 'user_id');
};

exports.down = pgm => {
  pgm.dropTable('customers');
};
