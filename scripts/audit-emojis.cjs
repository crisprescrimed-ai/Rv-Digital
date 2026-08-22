const fs = require('node:fs');
const { execFileSync } = require('node:child_process');

const isEmoji = codePoint => (
  (codePoint >= 0x1F1E6 && codePoint <= 0x1F1FF)
  || (codePoint >= 0x1F300 && codePoint <= 0x1FAFF)
  || (codePoint >= 0x2600 && codePoint <= 0x27BF)
  || codePoint === 0xFE0F
  || codePoint === 0x200D
);

const containsEmoji = value => [...String(value)].some(character => isEmoji(character.codePointAt(0)));
const findings = [];

function listFiles(path) {
  if (!fs.existsSync(path)) return [];
  if (!fs.statSync(path).isDirectory()) return [path];
  return fs.readdirSync(path, { withFileTypes: true }).flatMap(entry => {
    const child = `${path}/${entry.name}`;
    return entry.isDirectory() ? listFiles(child) : [child];
  });
}

function auditFiles() {
  let files;
  try {
    files = execFileSync('git', ['ls-files', '-z'], { stdio: ['ignore', 'pipe', 'ignore'] }).toString('utf8').split('\0').filter(Boolean);
  } catch {
    files = ['package.json', 'index.html', 'README.md', 'server.cjs', 'db', 'src', 'scripts'].flatMap(listFiles);
  }
  for (const file of files) {
    const content = fs.readFileSync(file);
    if (content.includes(0)) continue;
    content.toString('utf8').split(/\r?\n/).forEach((line, index) => {
      if (containsEmoji(line)) findings.push(`${file}:${index + 1}`);
    });
  }
}

function quoteIdentifier(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

async function auditDatabase() {
  if (!process.env.DATABASE_URL) return;
  const { Client } = require('pg');
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const columns = (await client.query(`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND data_type IN ('text', 'character varying', 'json', 'jsonb')
      ORDER BY table_name, column_name
    `)).rows;
    for (const column of columns) {
      const tableName = quoteIdentifier(column.table_name);
      const columnName = quoteIdentifier(column.column_name);
      const rows = (await client.query(`SELECT ${columnName}::text value FROM ${tableName} WHERE ${columnName} IS NOT NULL`)).rows;
      if (rows.some(row => containsEmoji(row.value))) findings.push(`database:${column.table_name}.${column.column_name}`);
    }
  } finally {
    await client.end();
  }
}

async function auditPublishedAssets() {
  const appUrl = process.env.AUDIT_APP_URL?.replace(/\/$/, '');
  if (!appUrl) return;
  const html = await (await fetch(appUrl)).text();
  const assets = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map(match => match[1]);
  for (const asset of assets) {
    const content = await (await fetch(new URL(asset, appUrl))).text();
    if (containsEmoji(content)) findings.push(`asset:${asset}`);
  }
}

(async () => {
  auditFiles();
  await auditDatabase();
  await auditPublishedAssets();
  if (findings.length) {
    console.error(`Emojis encontrados em:\n${findings.map(item => `- ${item}`).join('\n')}`);
    process.exit(1);
  }
  console.log('Auditoria concluída: nenhum emoji encontrado.');
})().catch(error => {
  console.error(`Falha na auditoria: ${error.message}`);
  process.exit(1);
});