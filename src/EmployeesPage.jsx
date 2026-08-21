import React, { useEffect, useState } from 'react';
import {
  Building2, CheckCircle2, KeyRound, Pencil, Search, ShieldCheck,
  SlidersHorizontal, Trash2, UserPlus, Users, X
} from 'lucide-react';

const ROLE_LABELS = { MANAGER: 'Gerente', SUPERVISOR: 'Supervisor', SELLER: 'Vendedor' };
const MODULES = [
  ['DASHBOARD', 'Visão geral'], ['GOALS', 'Metas'], ['TEAMS', 'Mesas'],
  ['INDICATORS', 'Indicadores'], ['ACTIONS', 'Ações'], ['IMPORTS', 'Importações'],
  ['REPORTS', 'Relatórios'], ['AUTHORIZATIONS', 'Autorizações'],
  ['MESSAGES', 'Mensagens'], ['ALERTS', 'Alertas'], ['PERFORMANCE', 'Desempenho']
];
const ROLE_MODULES = {
  MANAGER: ['DASHBOARD', 'GOALS', 'TEAMS', 'INDICATORS', 'ACTIONS', 'IMPORTS', 'REPORTS', 'AUTHORIZATIONS', 'MESSAGES'],
  SUPERVISOR: ['DASHBOARD', 'TEAMS', 'INDICATORS', 'GOALS', 'ACTIONS', 'ALERTS', 'REPORTS', 'MESSAGES', 'AUTHORIZATIONS'],
  SELLER: ['DASHBOARD', 'GOALS', 'INDICATORS', 'ACTIONS', 'PERFORMANCE', 'TEAMS', 'REPORTS', 'MESSAGES']
};

export default function EmployeesPage({ api, access, onAccessChange }) {
  const [items, setItems] = useState([]);
  const [teams, setTeams] = useState([]);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [accessDraft, setAccessDraft] = useState(access);

  const load = () => Promise.all([api('/users'), api('/teams')])
    .then(([users, teamData]) => {
      setItems((users.items || []).filter(item => item.role !== 'SUPER_ADMIN'));
      setTeams(teamData.items || []);
      setError('');
    })
    .catch(reason => setError(reason.message));

  useEffect(() => { load(); }, []);
  useEffect(() => { setAccessDraft(access); }, [access]);

  const submit = async event => {
    event.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(event.currentTarget);
    const role = form.get('role');
    const payload = {
      name: form.get('name'), email: form.get('email'),
      password: form.get('password') || undefined, role,
      teamId: role === 'MANAGER' ? null : (form.get('teamId') || null),
      status: form.get('status') || 'ACTIVE'
    };
    try {
      await api(editing.id ? `/users/${editing.id}` : '/users', {
        method: editing.id ? 'PATCH' : 'POST', body: JSON.stringify(payload)
      });
      setEditing(null);
      await load();
    } catch (reason) { setError(reason.message); }
    finally { setBusy(false); }
  };

  const remove = async item => {
    if (!confirm(`Excluir permanentemente ${item.name} e os dados vinculados? Esta ação não pode ser desfeita.`)) return;
    try { await api(`/users/${item.id}`, { method: 'DELETE' }); await load(); }
    catch (reason) { setError(reason.message); }
  };

  const toggleModule = (role, module) => setAccessDraft(current => {
    const selected = current?.[role] || [];
    return { ...current, [role]: selected.includes(module) ? selected.filter(item => item !== module) : [...selected, module] };
  });

  const saveAccess = async () => {
    setBusy(true);
    setError('');
    try {
      const data = await api('/module-access', { method: 'PATCH', body: JSON.stringify({ access: accessDraft }) });
      onAccessChange(data.access);
    } catch (reason) { setError(reason.message); }
    finally { setBusy(false); }
  };

  const counts = Object.fromEntries(['MANAGER', 'SUPERVISOR', 'SELLER'].map(role => [role, items.filter(item => item.role === role).length]));
  const normalized = search.trim().toLocaleLowerCase('pt-BR');
  const filtered = items.filter(item => (filter === 'ALL' || item.role === filter) && (!normalized || `${item.name} ${item.email} ${item.teamName || ''}`.toLocaleLowerCase('pt-BR').includes(normalized)));

  return <section className="employees-page">
    <header className="employees-hero">
      <div><span>GESTÃO DE PESSOAS</span><h2>Funcionários e acessos</h2><p>Centralize cadastros, vínculos operacionais e módulos disponíveis para cada função.</p></div>
      <button className="primary-button" onClick={() => setEditing({ role: 'SELLER' })}><UserPlus size={18}/>Novo funcionário</button>
    </header>

    {error && <div className="api-error">{error}<button onClick={load}>Tentar novamente</button></div>}

    <section className="employee-kpis" aria-label="Resumo da equipe">
      <article><Users size={20}/><span>Total da equipe<b>{items.length}</b></span></article>
      <article className="manager"><ShieldCheck size={20}/><span>Gerentes<b>{counts.MANAGER}</b></span></article>
      <article className="supervisor"><KeyRound size={20}/><span>Supervisores<b>{counts.SUPERVISOR}</b></span></article>
      <article className="seller"><UserPlus size={20}/><span>Vendedores<b>{counts.SELLER}</b></span></article>
    </section>

    <div className="employee-controls">
      <label><Search size={17}/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar por nome, e-mail ou mesa"/></label>
      <div><SlidersHorizontal size={17}/>{[['ALL', 'Todos'], ['MANAGER', 'Gerentes'], ['SUPERVISOR', 'Supervisores'], ['SELLER', 'Vendedores']].map(([value, label]) => <button key={value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{label}<span>{value === 'ALL' ? items.length : counts[value]}</span></button>)}</div>
    </div>

    <div className="employees-layout">
      <section className="employee-list">
        <div className="employee-section-title"><div><h3>Equipe cadastrada</h3><p>{filtered.length} profissional(is) neste filtro.</p></div></div>
        <div className="employee-grid">{filtered.map(item => <article className="employee-card" key={item.id}>
          <header><div className={`employee-avatar role-${item.role.toLowerCase()}`}>{item.name.slice(0, 2).toUpperCase()}</div><div><h4>{item.name}</h4><p>{item.email}</p></div><span className={`record-status ${item.status.toLowerCase()}`}>{item.status === 'ACTIVE' ? 'Ativo' : item.status === 'BLOCKED' ? 'Bloqueado' : 'Inativo'}</span></header>
          <div className="employee-meta"><span><ShieldCheck size={15}/>{ROLE_LABELS[item.role]}</span><span><Building2 size={15}/>{item.teamName || 'Sem mesa'}</span></div>
          <footer><button onClick={() => setEditing(item)}><Pencil size={16}/>Editar</button><button className="employee-delete" onClick={() => remove(item)}><Trash2 size={16}/>Excluir</button></footer>
        </article>)}{!filtered.length && <div className="employee-empty"><Users size={28}/><b>Nenhum funcionário encontrado</b><span>Ajuste os filtros ou cadastre um novo profissional.</span></div>}</div>
      </section>

      <aside className="access-panel">
        <div className="employee-section-title"><div><h3>Acesso aos módulos</h3><p>Defina a experiência disponível para cada função.</p></div><ShieldCheck size={20}/></div>
        {['MANAGER', 'SUPERVISOR', 'SELLER'].map(role => <section className="role-access" key={role}>
          <header><div><b>{ROLE_LABELS[role]}</b><span>{(accessDraft?.[role] || []).length} módulos habilitados</span></div></header>
          <div>{MODULES.filter(([module]) => ROLE_MODULES[role].includes(module)).map(([module, label]) => <label key={module}><input type="checkbox" checked={(accessDraft?.[role] || []).includes(module)} disabled={module === 'DASHBOARD'} onChange={() => toggleModule(role, module)}/><span><CheckCircle2 size={15}/>{label}</span></label>)}</div>
        </section>)}
        <button className="primary-button access-save" disabled={busy} onClick={saveAccess}><ShieldCheck size={17}/>{busy ? 'Salvando...' : 'Salvar acessos'}</button>
      </aside>
    </div>

    {editing && <EmployeeDialog item={editing} teams={teams} busy={busy} close={() => setEditing(null)} submit={submit}/>}
  </section>;
}

function EmployeeDialog({ item, teams, busy, close, submit }) {
  const [role, setRole] = useState(item.role || 'SELLER');
  return <div className="modal-backdrop" onMouseDown={close}><form className="employee-dialog" onSubmit={submit} onMouseDown={event => event.stopPropagation()}>
    <header><div><span>GESTÃO DE FUNCIONÁRIOS</span><h2>{item.id ? 'Editar funcionário' : 'Novo funcionário'}</h2><p>Configure identidade, função, vínculo e credenciais de acesso.</p></div><button type="button" onClick={close}><X size={20}/></button></header>
    <div className="employee-form">
      <label>Nome completo<input name="name" defaultValue={item.name || ''} required/></label>
      <label>E-mail<input name="email" type="email" defaultValue={item.email || ''} required={!item.id} disabled={!!item.id}/></label>
      <label>Função<select name="role" value={role} onChange={event => setRole(event.target.value)}><option value="SELLER">Vendedor</option><option value="SUPERVISOR">Supervisor</option><option value="MANAGER">Gerente</option></select></label>
      <label>Mesa comercial<select name="teamId" defaultValue={item.teamId || ''} disabled={role === 'MANAGER'} required={role === 'SELLER'}><option value="">{role === 'SELLER' ? 'Selecione uma mesa' : 'Sem vínculo'}</option>{teams.filter(team => team.status === 'ACTIVE').map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
      <label>Senha {item.id && <small>preencha apenas para alterar</small>}<input name="password" type="password" minLength="8" required={!item.id}/></label>
      <label>Situação<select name="status" defaultValue={item.status || 'ACTIVE'}><option value="ACTIVE">Ativo</option><option value="INACTIVE">Inativo</option><option value="BLOCKED">Bloqueado</option></select></label>
    </div>
    <footer><button type="button" className="filter-button" onClick={close}>Cancelar</button><button className="primary-button" disabled={busy}><CheckCircle2 size={17}/>{busy ? 'Salvando...' : 'Salvar funcionário'}</button></footer>
  </form></div>;
}
