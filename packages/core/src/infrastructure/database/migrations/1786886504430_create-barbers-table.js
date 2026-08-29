/**
 * Migration: create-barbers-table
 * Creates the barbers table with optional FK to users.
 */

exports.up = pgm => {
  pgm.createTable('barbers', {
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
      notNull: false,
    },
    specialty: {
      type: 'varchar(255)',
      notNull: false,
    },
    hire_date: {
      type: 'date',
      notNull: true,
      default: pgm.func('now()'),
    },
    active: {
      type: 'boolean',
      notNull: true,
      default: true,
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

  pgm.createIndex('barbers', 'user_id');
};

exports.down = pgm => {
  pgm.dropTable('barbers');
};
