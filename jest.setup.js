/**
 * Jest setup - must run before requiring server
 * Sets test environment variables
 */
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'test-session-secret-for-ci';
process.env.DATABASE_PATH = ':memory:';
