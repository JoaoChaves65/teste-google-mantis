/**
 * Migration: create-services-table
 * Creates the services table with price and duration constraints.
 */

exports.up = pgm => {
  pgm.createTable('services', {
    id: {
      type: 'uuid',
      primaryKey: true,
      notNull: true,
      default: pgm.func('gen_random_uuid()'),
    },
    name: {
      type: 'varchar(255)',
      notNull: true,
      unique: true,
    },
    description: {
      type: 'text',
      notNull: false,
    },
    price: {
      type: 'numeric(10,2)',
      notNull: true,
      check: 'price > 0',
    },
    duration_minutes: {
      type: 'integer',
      notNull: true,
      check: 'duration_minutes > 0',
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
};

exports.down = pgm => {
  pgm.dropTable('services');
};
