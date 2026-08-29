// Test setup - provide required environment variables
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
