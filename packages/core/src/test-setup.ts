// Test environment setup
// Sets required environment variables for auth tests

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-key-min-32-chars-long';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-min-32-chars-long';
process.env.JWT_ACCESS_EXPIRY = '15m';
process.env.JWT_REFRESH_EXPIRY = '7d';
process.env.CORS_ORIGIN = 'http://localhost:5173';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'barberlab_test';
process.env.DB_USER = 'barberlab';
process.env.DB_PASSWORD = 'changeme';
