const { Pool } = require('pg');
const logger = require('./logger');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    ssl: process.env.NODE_ENV === 'production' && process.env.DATABASE_URL?.includes('amazonaws')
        ? { rejectUnauthorized: false }
        : false,
});

pool.on('connect', () => logger.debug('PostgreSQL pool connection established'));
pool.on('error', (err) => logger.error('PostgreSQL pool error:', err.message));

/**
 * Execute a parameterized query
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 */
const query = async (text, params) => {
    const start = Date.now();
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug(`DB query executed in ${duration}ms: ${text.substring(0, 80)}`);
    return res;
};

/**
 * Get a client from the pool (for transactions)
 */
const getClient = () => pool.connect();

module.exports = { query, getClient, pool };
