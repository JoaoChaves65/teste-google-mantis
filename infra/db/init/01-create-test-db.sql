-- Create the test database used by integration tests.
-- Runs automatically on first container start (docker-entrypoint-initdb.d).
SELECT 'CREATE DATABASE barberlab_test OWNER barberlab'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'barberlab_test')\gexec