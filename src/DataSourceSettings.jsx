import React, { useEffect, useState } from 'react';
import {
  CheckCircle2, Database, Eye, EyeOff, KeyRound, Link2,
  Pencil, Server, ShieldCheck, Trash2, X
} from 'lucide-react';
import './data-source-settings.css';

const TYPE_LABELS = { SERVER: 'Servidor de dados', CUBE: 'Cubo de dados' };

export default function DataSourceSettings({ api }) {
  const [item, setItem] = useState(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => api('/data-source')
    .then(data => { setItem(data.item); setError(''); })
    .catch(reason => setError(reason.message));

  useEffect(() => { load(); }, []);

  const remove = async () => {
    if (!confirm('Remover permanentemente esta fonte de dados e suas credenciais?')) return;
    setBusy(true);
    try { await api('/data-source', { method: 'DELETE' }); setItem(null); setError(''); }
    catch (reason) { setError(reason.message); }
    finally { setBusy(false); }
  };

  return <section className="data-source-section">
    <header className="data-source-heading">
      <div className="data-source-title"><span><Database size={20}/></span><div><p>INTEGRAÇÃO PROTEGIDA</p><h2>Fonte de dados</h2><small>Credenciais centralizadas para servidor ou cubo corporativo.</small></div></div>
      <div className={`connection-state ${item?.enabled ? 'enabled' : ''}`}><i/>{item ? (item.enabled ? 'Ativa' : 'Pausada') : 'Não configurada'}</div>
    </header>

    {error && <div className="api-error">{error}<button onClick={load}>Tentar novamente</button></div>}

    {item ? <div className="data-source-summary">
      <div className="source-kind">{item.type === 'CUBE' ? <Database size={22}/> : <Server size={22}/>}<span><small>ORIGEM</small><b>{TYPE_LABELS[item.type]}</b></span></div>
      <dl>
        <div><dt>Endereço</dt><dd>{item.address}</dd></div>
        <div><dt>Banco / catálogo</dt><dd>{item.database || 'Não informado'}</dd></div>
        <div><dt>Login</dt><dd>{item.username}</dd></div>
        <div><dt>Senha</dt><dd className="protected-value"><ShieldCheck size={14}/>Protegida</dd></div>
      </dl>
      <div className="data-source-actions"><button onClick={() => setEditing(true)}><Pencil size={16}/>Editar conexão</button><button className="source-delete" disabled={busy} onClick={remove}><Trash2 size={16}/>Remover</button></div>
    </div> : <div className="data-source-empty"><Link2 size={25}/><div><b>Nenhuma fonte configurada</b><span>Cadastre o ponto de acesso aos dados corporativos.</span></div><button className="primary-button" onClick={() => setEditing(true)}><Server size={17}/>Configurar fonte</button></div>}

    {editing && <DataSourceDialog api={api} item={item} close={() => setEditing(false)} saved={data => { setItem(data); setEditing(false); setError(''); }}/>}
  </section>;
}

function DataSourceDialog({ api, item, close, saved }) {
  const [type, setType] = useState(item?.type || 'SERVER');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async event => {
    event.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      const data = await api('/data-source', {
        method: 'PATCH',
        body: JSON.stringify({
          type,
          address: form.get('address'),
          database: form.get('database'),
          username: form.get('username'),
          password: form.get('password') || undefined,
          enabled: form.get('enabled') === 'on'
        })
      });
      saved(data.item);
    } catch (reason) { setError(reason.message); }
    finally { setBusy(false); }
  };

  return <div className="modal-backdrop" onMouseDown={close}><form className="data-source-dialog" onSubmit={submit} onMouseDown={event => event.stopPropagation()}>
    <header><div><p>FONTE DE DADOS</p><h2>{item ? 'Editar conexão' : 'Nova conexão'}</h2><span>Informe o endpoint e as credenciais fornecidas pela área de dados.</span></div><button type="button" onClick={close} title="Fechar"><X size={20}/></button></header>
    <div className="source-form">
      <fieldset className="source-type"><legend>Tipo de origem</legend><div><button type="button" className={type === 'SERVER' ? 'active' : ''} onClick={() => setType('SERVER')}><Server size={17}/>Servidor</button><button type="button" className={type === 'CUBE' ? 'active' : ''} onClick={() => setType('CUBE')}><Database size={17}/>Cubo</button></div></fieldset>
      <label className="source-wide">Endereço do servidor<input name="address" defaultValue={item?.address || ''} placeholder="https://dados.empresa.com ou servidor:porta" maxLength="500" required/></label>
      <label>Banco, catálogo ou cubo<input name="database" defaultValue={item?.database || ''} placeholder="Ex.: Comercial" maxLength="160"/></label>
      <label>Login<input name="username" defaultValue={item?.username || ''} autoComplete="username" maxLength="160" required/></label>
      <label className="source-wide">Senha {item?.hasPassword && <small>deixe vazio para manter a atual</small>}<div className="password-field"><KeyRound size={16}/><input name="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required={!item?.hasPassword}/><button type="button" onClick={() => setShowPassword(value => !value)} title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div></label>
      <label className="source-toggle source-wide"><input name="enabled" type="checkbox" defaultChecked={item?.enabled !== false}/><span/><div><b>Fonte ativa</b><small>Disponibiliza esta configuração para integrações autorizadas.</small></div></label>
      {error && <p className="form-error source-wide">{error}</p>}
    </div>
    <footer><button type="button" className="filter-button" onClick={close}>Cancelar</button><button className="primary-button" disabled={busy}><CheckCircle2 size={17}/>{busy ? 'Salvando...' : 'Salvar conexão'}</button></footer>
  </form></div>;
}
