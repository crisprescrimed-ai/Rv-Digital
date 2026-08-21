const bcrypt = require('bcryptjs');
const { query, pool } = require('./index.cjs');
const indicators = [
  ['Cadastros Novo','CADASTRO_NOVO','QUANTITY','HIGHER_IS_BETTER','un'], ['Cadastro com ADQ','CADASTRO_ADQ','QUANTITY','HIGHER_IS_BETTER','un'],
  ['Inadimplência','INADIMPLENCIA','PERCENTAGE','LOWER_IS_BETTER','%'], ['Volume de Chips','VOLUME_CHIPS','QUANTITY','HIGHER_IS_BETTER','un'],
  ['Cadastro de Evolua','CADASTRO_EVOLUA','QUANTITY','HIGHER_IS_BETTER','un'], ['Consignado','CONSIGNADO','QUANTITY','HIGHER_IS_BETTER','un'],
  ['Centurião','CENTURIAO','QUANTITY','HIGHER_IS_BETTER','un'], ['Inoperância','INOPERANCIA','PERCENTAGE','LOWER_IS_BETTER','%'],
  ['Churn','CHURN','PERCENTAGE','LOWER_IS_BETTER','%'], ['Capilaridade','CAPILARIDADE','PERCENTAGE','HIGHER_IS_BETTER','%']
];
(async () => { try {
  if (process.env.NODE_ENV === 'production' && !process.env.SEED_PASSWORD) throw new Error('SEED_PASSWORD é obrigatória para executar o seed em produção.');
  const hash = await bcrypt.hash(process.env.SEED_PASSWORD || 'RVdigital@2026', 12);
  for (const [name,code,type,direction,unit] of indicators) await query('INSERT INTO indicators(name,code,type,direction,unit) VALUES($1,$2,$3,$4,$5) ON CONFLICT(code) DO NOTHING',[name,code,type,direction,unit]);
  for (let index=1;index<=4;index++) await query('INSERT INTO teams(name) VALUES($1) ON CONFLICT(name) DO NOTHING',[`Mesa ${String(index).padStart(2,'0')}`]);
  const admin = await query("INSERT INTO users(name,email,password_hash,role) VALUES('Administrador RV','admin@rvdigital.com',$1,'SUPER_ADMIN') ON CONFLICT(email) DO UPDATE SET password_hash=EXCLUDED.password_hash RETURNING id",[hash]);
  const manager = await query("INSERT INTO users(name,email,password_hash,role) VALUES('Cristiano Rocha','gerente@rvdigital.com',$1,'MANAGER') ON CONFLICT(email) DO UPDATE SET password_hash=EXCLUDED.password_hash RETURNING id",[hash]);
  for (let index=1;index<=4;index++) {
    const team = await query('SELECT id FROM teams WHERE name=$1',[`Mesa ${String(index).padStart(2,'0')}`]);
    const supervisor = await query("INSERT INTO users(name,email,password_hash,role,team_id) VALUES($1,$2,$3,'SUPERVISOR',$4) ON CONFLICT(email) DO UPDATE SET team_id=EXCLUDED.team_id RETURNING id",[`Supervisor Mesa ${index}`,`supervisor${index}@rvdigital.com`,hash,team.rows[0].id]);
    await query('UPDATE teams SET supervisor_id=$1 WHERE id=$2',[supervisor.rows[0].id,team.rows[0].id]);
    for (let seller=1;seller<=10;seller++) await query("INSERT INTO users(name,email,password_hash,role,team_id) VALUES($1,$2,$3,'SELLER',$4) ON CONFLICT(email) DO NOTHING",[`Vendedor ${index}.${seller}`,`vendedor${index}.${seller}@rvdigital.com`,hash,team.rows[0].id]);
  }
  const now = new Date(); const month=now.getMonth()+1; const year=now.getFullYear(); const name = new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric'}).format(now).replace(/^./, c=>c.toUpperCase());
  await query("INSERT INTO periods(name,month,year,start_date,end_date,status) VALUES($1,$2,$3,$4,$5,'OPEN') ON CONFLICT(name) DO NOTHING",[name,month,year,`${year}-${String(month).padStart(2,'0')}-01`,`${year}-${String(month).padStart(2,'0')}-${new Date(year,month,0).getDate()}`]);
  await query("INSERT INTO settings(key,value) VALUES('goal_lock_day','10'),('status_thresholds','{\"excellent\":100,\"good\":80,\"warning\":60}') ON CONFLICT(key) DO NOTHING");
  console.log('Dados iniciais criados. Conta administrativa: admin@rvdigital.com');
} finally { await pool.end(); } })().catch(error => { console.error(error); process.exit(1); });
