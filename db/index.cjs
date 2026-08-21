const { Pool } = require('pg');

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL é obrigatória. Adicione um PostgreSQL e configure a variável no Railway.');
const databaseUrl = new URL(process.env.DATABASE_URL);
const isLocal = ['localhost', '127.0.0.1', '::1'].includes(databaseUrl.hostname);
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: isLocal ? false : { rejectUnauthorized: false } });
module.exports = { query: (text, params) => pool.query(text, params), pool };
