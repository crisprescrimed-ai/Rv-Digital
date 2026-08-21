import React, { useEffect, useState } from 'react';
import {
  ArrowLeft, ArrowUpRight, BarChart3, CalendarDays, ChevronDown,
  Gauge, Search, Target, TrendingUp, UserRound, Users
} from 'lucide-react';
import './team-performance.css';

const pct = value => `${Number(value || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
const tone = value => Number(value) >= 100 ? 'good' : Number(value) >= 80 ? 'attention' : 'critical';
const formatValue = (value, item) => {
  const number = Number(value || 0);
  if (item?.type === 'CURRENCY') return number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  return `${number.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}${item?.unit && item.unit !== 'un' ? ` ${item.unit}` : ''}`;
};

export default function TeamPerformance({ api, team, user, onBack }) {
  const [data, setData] = useState(null);
  const [periods, setPeriods] = useState([]);
  const [periodId, setPeriodId] = useState('');
  const sellerView = user.role === 'SELLER';
  const [tab, setTab] = useState(sellerView ? 'SELLERS' : 'SUPERVISION');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadPerformance = selectedPeriod => {
    setLoading(true);
    const suffix = selectedPeriod ? `?periodId=${encodeURIComponent(selectedPeriod)}` : '';
    return api(`/teams/${team.id}/performance${suffix}`).then(response => {
      setData(response);
      setPeriodId(response.period?.id || selectedPeriod || '');
      setError('');
    }).catch(reason => setError(reason.message)).finally(() => setLoading(false));
  };

  useEffect(() => {
    Promise.all([api('/periods'), api(`/teams/${team.id}/performance`)]).then(([periodResponse, performance]) => {
      setPeriods(periodResponse.items || []);
      setData(performance);
      setPeriodId(performance.period?.id || '');
      setError('');
    }).catch(reason => setError(reason.message)).finally(() => setLoading(false));
  }, [team.id]);

  const changePeriod = event => {
    const value = event.target.value;
    setPeriodId(value);
    loadPerformance(value);
  };

  const filteredSellers = (data?.sellers || []).filter(item => item.name.toLocaleLowerCase('pt-BR').includes(search.trim().toLocaleLowerCase('pt-BR')));
  const summary = data?.summary || {};

  return <section className="team-performance">
    <div className="team-performance-toolbar">
      <button className="team-back" onClick={onBack}><ArrowLeft size={17}/>Mesas</button>
      <label className="team-period"><CalendarDays size={17}/><span>Período</span><select value={periodId} onChange={changePeriod}>{periods.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><ChevronDown size={15}/></label>
    </div>

    <header className="team-performance-hero">
      <div><span>INTELIGÊNCIA DA MESA</span><h2>{data?.team?.name || team.name}</h2><p>Desempenho consolidado da supervisão e evolução individual dos vendedores.</p></div>
      <div className="team-leader"><div>{(data?.team?.supervisor_name || 'RV').split(' ').slice(0, 2).map(part => part[0]).join('').toUpperCase()}</div><span><small>SUPERVISÃO RESPONSÁVEL</small><b>{data?.team?.supervisor_name || 'Não definida'}</b><em>{data?.team?.supervisor_email || 'Aguardando vínculo'}</em></span></div>
    </header>

    {error && <div className="api-error">{error}<button onClick={() => loadPerformance(periodId)}>Tentar novamente</button></div>}
    {loading && !data ? <div className="team-loading">Calculando desempenho da mesa...</div> : <>
      <section className="team-performance-kpis">
        <article><Users size={19}/><span>Vendedores acompanhados</span><b>{summary.sellerCount || 0}</b><small>{summary.indicatorCount || 0} indicadores vinculados</small></article>
        <article className="blue"><Gauge size={19}/><span>Atingimento médio</span><b>{pct(summary.achievement)}</b><small>média dos indicadores da mesa</small></article>
        <article className="teal"><TrendingUp size={19}/><span>Estimativa de fechamento</span><b>{pct(summary.projectedAchievement)}</b><small>mantendo a média diária atual</small></article>
        <article className="orange"><CalendarDays size={19}/><span>Ritmo do período</span><b>{summary.remainingDays || 0} dias</b><small>{summary.elapsedDays || 0} dias úteis realizados</small></article>
        <article className="red"><Target size={19}/><span>Pontos críticos</span><b>{summary.criticalCount || 0}</b><small>vínculos abaixo de 60%</small></article>
      </section>

      <div className="team-performance-tabs">
        {!sellerView && <button className={tab === 'SUPERVISION' ? 'active' : ''} onClick={() => setTab('SUPERVISION')}><BarChart3 size={17}/>Visão da supervisão</button>}
        <button className={tab === 'SELLERS' ? 'active' : ''} onClick={() => setTab('SELLERS')}><Users size={17}/>{sellerView ? 'Meu desempenho' : 'Desempenho por vendedor'}</button>
      </div>

      {tab === 'SUPERVISION' ? <SupervisionView data={data}/> : <SellersView sellers={filteredSellers} search={search} onSearch={setSearch}/>}
    </>}
  </section>;
}

function SupervisionView({ data }) {
  return <div className="supervision-view">
    <section className="team-trend-panel">
      <div className="team-section-title"><div><span>EVOLUÇÃO CONSOLIDADA</span><h3>Ritmo da mesa no período</h3><p>Média acumulada do atingimento dos indicadores vinculados.</p></div><b className={tone(data.summary?.achievement)}>{pct(data.summary?.achievement)}</b></div>
      <TrendChart points={data.trend || []}/>
    </section>
    <section className="team-indicator-section">
      <div className="team-section-title"><div><span>LEITURA POR INDICADOR</span><h3>Performance da supervisão</h3><p>Meta, realizado, média diária e estimativa para o fechamento.</p></div><em>{data.indicators?.length || 0} indicadores</em></div>
      <div className="team-indicator-grid">{(data.indicators || []).map(item => <IndicatorCard key={item.id} item={item}/>)}</div>
      {!data.indicators?.length && <div className="team-empty">Nenhum indicador vinculado às metas desta mesa no período.</div>}
    </section>
  </div>;
}

function IndicatorCard({ item }) {
  return <article className={`team-indicator-card ${tone(item.achievement)}`}>
    <header><div className="team-indicator-icon"><Gauge size={19}/></div><span>{item.code}</span><b>{pct(item.achievement)}</b></header>
    <h4>{item.name}</h4><p>{item.direction === 'LOWER_IS_BETTER' ? 'Menor resultado é melhor' : 'Maior resultado é melhor'} · {item.sellerCount} vendedor(es)</p>
    <div className="indicator-progress"><i style={{ width: `${Math.min(100, Number(item.achievement || 0))}%` }}/></div>
    <dl><div><dt>Meta</dt><dd>{formatValue(item.target, item)}</dd></div><div><dt>Realizado</dt><dd>{formatValue(item.achieved, item)}</dd></div><div><dt>{item.direction === 'LOWER_IS_BETTER' ? 'Desvio' : 'Falta'}</dt><dd>{formatValue(item.gap, item)}</dd></div><div><dt>Média / dia</dt><dd>{formatValue(item.dailyAverage, item)}</dd></div></dl>
    <footer><span><small>ESTIMATIVA</small><b>{formatValue(item.projected, item)}</b></span><span><small>FECHAMENTO</small><b className={tone(item.projectedAchievement)}>{pct(item.projectedAchievement)}</b></span><ArrowUpRight size={18}/></footer>
  </article>;
}

function SellersView({ sellers, search, onSearch }) {
  return <section className="seller-performance-section">
    <div className="team-section-title seller-title"><div><span>PERFORMANCE INDIVIDUAL</span><h3>Vendedores da mesa</h3><p>Indicadores vinculados, ritmo diário e projeção de cada profissional.</p></div><label><Search size={16}/><input value={search} onChange={event => onSearch(event.target.value)} placeholder="Buscar vendedor"/></label></div>
    <div className="seller-performance-list">{sellers.map((seller, index) => <article className="seller-performance-card" key={seller.id}>
      <header><strong>{String(index + 1).padStart(2, '0')}</strong><div className="seller-performance-avatar">{seller.name.split(' ').slice(0, 2).map(part => part[0]).join('').toUpperCase()}</div><div><h4>{seller.name}</h4><p>{seller.indicators.length} indicadores · {seller.criticalIndicators} crítico(s)</p></div><span><small>ATINGIMENTO</small><b className={tone(seller.achievement)}>{pct(seller.achievement)}</b></span><span><small>ESTIMATIVA</small><b>{pct(seller.projectedAchievement)}</b></span></header>
      <div className="seller-indicator-head"><span>Indicador</span><span>Meta</span><span>Realizado</span><span>Média/dia</span><span>Estimativa</span><span>Atingimento</span></div>
      <div className="seller-indicator-rows">{seller.indicators.map(item => <div key={item.indicator_id}><span><Gauge size={15}/><b>{item.indicator_name}</b><small>{item.code}</small></span><span data-label="Meta">{formatValue(item.target, item)}</span><span data-label="Realizado">{formatValue(item.achieved, item)}</span><span data-label="Média/dia">{formatValue(item.dailyAverage, item)}</span><span data-label="Estimativa">{formatValue(item.projected, item)}</span><span data-label="Atingimento"><b className={tone(item.achievement)}>{pct(item.achievement)}</b></span></div>)}</div>
    </article>)}{!sellers.length && <div className="team-empty"><UserRound size={24}/>Nenhum vendedor encontrado nesta mesa.</div>}</div>
  </section>;
}

function TrendChart({ points }) {
  if (!points.length) return <div className="team-chart-empty"><BarChart3 size={25}/><b>Evolução aguardando resultados</b><span>Os lançamentos diários formarão a curva de desempenho.</span></div>;
  const values = points.map(point => Math.min(150, Number(point.achievement || 0)));
  const path = values.map((value, index) => `${index ? 'L' : 'M'} ${(index / Math.max(1, values.length - 1)) * 100} ${105 - value / 1.5}`).join(' ');
  return <div className="team-chart"><div className="team-chart-y"><span>150%</span><span>100%</span><span>50%</span><span>0%</span></div><div><svg viewBox="0 0 100 110" preserveAspectRatio="none"><defs><linearGradient id="team-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#2786e8" stopOpacity=".25"/><stop offset="1" stopColor="#2786e8" stopOpacity="0"/></linearGradient></defs><path d={`${path} L 100 110 L 0 110 Z`} fill="url(#team-area)"/><path d="M 0 38.3 L 100 38.3" fill="none" stroke="#a7b1c2" strokeWidth="1" strokeDasharray="3 2"/><path d={path} fill="none" stroke="#2786e8" strokeWidth="2"/></svg><div className="team-chart-x">{points.slice(-7).map(point => <span key={point.date}>{new Date(`${point.date}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>)}</div></div></div>;
}
