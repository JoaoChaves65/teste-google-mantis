/**
 * Migration: create-refresh-tokens-table
 * Creates the refresh_tokens table for JWT refresh token management with rotation support.
 */

exports.up = pgm => {
  pgm.createTable('refresh_tokens', {
    id: {
      type: 'uuid',
      primaryKey: true,
      notNull: true,
      default: pgm.func('gen_random_uuid()'),
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE',
    },
    token_hash: {
      type: 'varchar(255)',
      notNull: true,
    },
    expires_at: {
      type: 'timestamptz',
      notNull: true,
    },
    revoked_at: {
      type: 'timestamptz',
      notNull: false,
    },
    replaced_by_token_id: {
      type: 'uuid',
      notNull: false,
      references: 'refresh_tokens',
      onDelete: 'SET NULL',
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });

  pgm.createIndex('refresh_tokens', 'user_id');
  pgm.createIndex('refresh_tokens', 'expires_at');
};

exports.down = pgm => {
  pgm.dropTable('refresh_tokens');
};
