const fs = require('node:fs');
const path = require('node:path');
const { pool } = require('./index.cjs');

(async () => { try { await pool.query(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')); console.log('Migração PostgreSQL concluída.'); } finally { await pool.end(); } })().catch(error => { console.error(error); process.exit(1); });
