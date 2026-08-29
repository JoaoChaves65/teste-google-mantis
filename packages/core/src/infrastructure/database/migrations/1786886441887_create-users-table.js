/**
 * Migration: create-users-table
 * Creates the users table with UUID primary key, email uniqueness, and constraints.
 */

exports.up = pgm => {
  pgm.createTable('users', {
    id: {
      type: 'uuid',
      primaryKey: true,
      notNull: true,
      default: pgm.func('gen_random_uuid()'),
    },
    name: {
      type: 'varchar(255)',
      notNull: true,
    },
    email: {
      type: 'varchar(255)',
      notNull: true,
      unique: true,
    },
    password_hash: {
      type: 'varchar(255)',
      notNull: true,
    },
    role: {
      type: 'varchar(20)',
      notNull: true,
      check: "role IN ('CUSTOMER', 'BARBER', 'ADMIN')",
    },
    status: {
      type: 'varchar(20)',
      notNull: true,
      default: 'ACTIVE',
      check: "status IN ('ACTIVE', 'INACTIVE')",
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

  pgm.createIndex('users', 'email', { unique: true });
};

exports.down = pgm => {
  pgm.dropTable('users');
};
