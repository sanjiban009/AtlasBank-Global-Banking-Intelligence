'use strict';

const data = window.ATLAS_DATA;
const unique = (rows, key) => [...new Set(rows.map(row => row[key]))];
const months = unique(data, 'month');
const lastMonth = months.at(-1);
const fixedRates = Object.fromEntries(data.filter(row => row.month === lastMonth).map(row => [row.currency,row.fx]));
const colors = ['#69e6cf','#86abff','#ffc08c'];
const labels = ['Executive Overview','Profitability & FX','Credit & Collections','Deposits & Liquidity','Stress Testing'];
const captions = [
  'Review earnings, balance-sheet growth and credit quality across six markets.',
  'Compare earnings with plan and isolate the effect of FX translation.',
  'Identify delinquency and non-performing exposures by market and product.',
  'Review deposit concentration and projected 30-day funding coverage.',
  'Estimate the effect of deposit runoff, funding costs and additional credit losses.'
];
const defaults = {month:lastMonth,region:'',country:'',entity:'',product:'',basis:'reported',scenario:'adverse',allLabels:false};
let state = {...defaults};
let page = 0;
const nav = document.querySelector('nav');
const filters = document.querySelector('#filters');
const content = document.querySelector('#content');
const number = new Intl.NumberFormat('en-US',{maximumFractionDigits:1,minimumFractionDigits:1});
const usd = value => '$'+number.format(value)+'M';
const pct = value => number.format(value*100)+'%';
const ratio = (a,b) => b ? a/b : 0;
const amount = (rows,key,basis=state.basis) => rows.reduce((total,row) =>
  total + row[key]*(basis === 'constant' ? fixedRates[row.currency] : row.fx),0);
const pbt = (rows,basis) => ['nii','fees','cost','ecl'].reduce((total,key,i) =>
  total + amount(rows,key,basis)*(i < 2 ? 1 : -1),0);
const rate = (rows,numerator,denominator) => ratio(amount(rows,numerator),amount(rows,denominator));
const labelMonth = month => new Intl.DateTimeFormat('en',{month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(month+'-01T00:00:00Z'));
const compare = (value,base) => base ? (value >= base ? '+' : '')+pct(value/base-1) : '—';
const pick = (rows,key,value) => value ? rows.filter(row => row[key] === value) : rows;
const select = (key,label,values) => `<label>${label}<select id="${key}">${values.map(([value,name]) =>
  `<option value="${value}" ${state[key] === value ? 'selected' : ''}>${name}</option>`).join('')}</select></label>`;
const options = (rows,key,all) => [['',all],...unique(rows,key).map(value => [value,value])];
function filterControls() {
  const regional = pick(data,'region',state.region);
  const national = pick(regional,'country',state.country);
  filters.innerHTML = [
    select('month','Reporting month',months.slice().reverse().map(month => [month,labelMonth(month)])),
    select('region','Region',options(data,'region','All regions')),
    select('country','Country',options(regional,'country','All countries')),
    select('entity','Legal entity',options(national,'entity','All entities')),
    select('product','Product',options(data,'product','All products')),
    select('basis','Currency basis',[['reported','Reported USD'],['constant','Constant FX USD']]),
    '<button type="button" id="reset">Reset</button>'
  ].join('');
}
const kpi = (label,value,note) => `<div class="card kpi"><span>${label}</span><strong>${value}</strong><small>${note}</small></div>`;
const card = (title,detail,body) => `<section class="card"><h2>${title}</h2><p>${detail}</p>${body}</section>`;
const insight = (summary,action) => `<section class="insight"><div class="label">PORTFOLIO INSIGHT</div><h2>What changed and why?</h2><p>${summary} <b>Next action</b> · ${action}</p></section>`;
function table(headers,rows) {
  return `<div class="table-wrap"><table><thead><tr>${headers.map(label=>`<th scope="col">${label}</th>`).join('')}</tr></thead><tbody>
  ${rows.map(row=>`<tr>${row.map(value=>`<td>${value}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function bars(entries,format=usd) {
  const max = Math.max(...entries.map(([,value])=>Math.abs(value)),.001);
  return `<div class="bars">${entries.map(([name,value])=>`<div><div class="bar-title"><span>${name}</span><b>${format(value)}</b></div>
    <div class="track"><div class="fill" style="width:${100*Math.abs(value)/max}%"></div></div></div>`).join('')}</div>`;
}
function chart(periods,series,format=usd) {
  const values = series.flatMap(item=>item.values);
  const max = Math.max(...values,0.001)*1.12;
  const min = Math.min(0,...values)*1.08;
  const width = state.allLabels ? Math.max(626, 182 + 84*(periods.length-1)) : 626;
  const end = width-52;
  const x = i => periods.length === 1 ? width/2 : 98+(end-98)*i/(periods.length-1);
  const labelStep = Math.max(1,Math.ceil((periods.length-1)/4));
  const showLabel = i => state.allLabels || i===periods.length-1 ||
    (i%labelStep===0 && periods.length-1-i>=labelStep);
  const labelY = (v,i,s) => {
    const other = series[1-s]?.values[i];
    const lower = other != null && (v<other || (v===other && s===1));
    return y(v)+(lower ? 14 : -8);
  };
  const y = value => 157-124*(value-min)/(max-min);
  const grid = Array.from({length:5},(_,i)=>{
    const value = min+(max-min)*i/4;
    return `<path d="M86 ${y(value)} H${end}" stroke="#2b3a4d"/><text x="76" y="${y(value)+4}" text-anchor="end">${format(value)}</text>`;
  }).join('');
  const lines = series.map(({name,values},s)=>`<polyline points="${values.map((v,i)=>`${x(i)},${y(v)}`).join(' ')}"
    fill="none" stroke="${colors[s]}" stroke-width="3.5" stroke-linejoin="round"/>${values.map((v,i)=>`
    <circle cx="${x(i)}" cy="${y(v)}" r="3" fill="${colors[s]}"><title>${labelMonth(periods[i])} · ${name} · ${format(v)}</title></circle>
    ${showLabel(i) ? `<text class="point-label" x="${x(i)}" y="${labelY(v,i,s)}" fill="${colors[s]}" text-anchor="middle">${format(v)}</text>` : ''}`).join('')}`).join('');
  return `<div class="chart-scroll" tabindex="0" aria-label="Monthly trend chart"><svg class="chart" style="min-width:${state.allLabels ? width : 520}px" viewBox="0 0 ${width} 202" role="img" aria-label="${series.map(s=>s.name).join(' and ')} monthly trend">
  ${grid}${lines}${periods.map((period,i)=>showLabel(i) ? 
    `<text x="${x(i)}" y="195" text-anchor="middle">${labelMonth(period).replace(' 20',' ’')}</text>` : '').join('')}</svg></div>
    <button type="button" id="toggle-labels" aria-pressed="${state.allLabels}">${state.allLabels?'Show fewer labels':'Show all monthly labels'}</button>
    <div class="legend">${series.map(({name},i)=>`<span><i style="background:${colors[i]}"></i>${name}</span>`).join('')}</div>`;
}

const scenarios = {
  base: {runoff:0,funding:0,loss:0},
  adverse: {runoff:.08,funding:.015,loss:.008},
  severe: {runoff:.16,funding:.03,loss:.018}
};
function render() {
  document.querySelector('h1').textContent = labels[page];
  document.querySelector('#subtitle').textContent = captions[page];
  nav.innerHTML = labels.map((name,i)=>`<button type="button" data-page="${i}" aria-current="${i===page}"><b>${['◫','↗','◇','≋','△'][i]}</b>${name}</button>`).join('');
  const scoped = ['region','country','entity','product'].reduce((rows,key)=>pick(rows,key,state[key]),data);
  const active = pick(scoped,'month',state.month);
  const index = months.indexOf(state.month);
  const periods = months.slice(Math.max(0,index-11),index+1);
  const prior = index >= 12 ? pick(scoped,'month',months[index-12]) : [];
  const prev = index ? pick(scoped,'month',months[index-1]) : [];
  const trend = (name,measure) => ({name,values:periods.map(month=>measure(pick(scoped,'month',month)))});
  const byCountry = unique(active,'country').map(name=>[name,pick(active,'country',name)]);
  const byProduct = unique(active,'product').map(name=>[name,pick(active,'product',name)]);
  const m = key => amount(active,key);
  const npl = rows => rate(rows,'npl','loans');
  const dpd = rows => ratio(amount(rows,'dpd30')+amount(rows,'dpd60')+amount(rows,'npl'),amount(rows,'loans'));
  const period = labelMonth(state.month);
  const basis = state.basis === 'constant' ? 'Constant FX USD' : 'Reported USD';
  const countryButton = name => `<button class="drill" data-drill="${name}">${name}</button>`;
  let kpis, left, right, note, detail, controls = '';
  if (page === 0) {
    const largest = [...byCountry].sort((a,b)=>amount(b[1],'loans')-amount(a[1],'loans'))[0];
    kpis = [kpi('Net interest income',usd(m('nii')),compare(m('nii'),amount(prior,'nii'))+' year over year'),
      kpi('Profit before tax',usd(pbt(active)),compare(pbt(active),pbt(prior))+' year over year'),
      kpi('Gross loans',usd(m('loans')),'Month-end'),kpi('Non-performing loans',pct(npl(active)),usd(m('npl'))+' exposure')];
    left = card('Monthly earnings','Trailing 12 months · '+basis,chart(periods,[trend('Net interest income',rows=>amount(rows,'nii')),trend('Profit before tax',pbt)]));
    right = card('Loan exposure by market','Month-end gross balances',bars(byCountry.map(([name,rows])=>[name,amount(rows,'loans')])));
    note = insight(`${largest[0]} holds ${pct(ratio(amount(largest[1],'loans'),m('loans')))} of selected loan exposure. ${prior.length ? 'Profit before tax is '+compare(pbt(active),pbt(prior))+' year over year.' : 'A prior-year comparison is unavailable for this month.'}`, 'Review market-level profitability and NPL ratios before changing lending priorities.');
    detail = card('Market performance','Select a country to drill into its legal entity.',table(['Country','Legal entity','Loans','Deposits','PBT','NPL ratio'],
      byCountry.map(([name,rows])=>[countryButton(name),rows[0].entity,usd(amount(rows,'loans')),usd(amount(rows,'deposits')),usd(pbt(rows)),pct(npl(rows))])));
  } else if (page === 1) {
    const budget = m('budget');
    const loansAvg = prev.length ? (m('loans')+amount(prev,'loans'))/2 : m('loans');
    const reported = pbt(active,'reported');
    const constant = pbt(active,'constant');
    kpis = [kpi('Profit before tax',usd(pbt(active)),compare(pbt(active),budget)+' vs budget'),
      kpi('Budget PBT',usd(budget),period),kpi('Annualized NIM proxy',pct(ratio(m('nii')*12,loansAvg)),'Average gross loans as denominator'),
      kpi('Cost-to-income',pct(ratio(m('cost'),m('nii')+m('fees'))),'Operating expenses / operating income')];
    left = card('Actual vs budget PBT',basis,chart(periods,[trend('Actual PBT',pbt),trend('Budget PBT',rows=>amount(rows,'budget'))]));
    right = card('PBT translation comparison','Same local earnings translated at two FX rates',bars([['Reported USD',reported],['Constant FX USD',constant]]));
    note = insight(`Reported PBT is ${usd(Math.abs(reported-constant))} ${reported>=constant?'above':'below'} the constant FX figure. PBT is ${compare(pbt(active),budget)} versus budget in the selected basis.`,'Use the constant FX view to review local earnings and compare with budget.');
    detail = card('Market profit bridge',basis,table(['Country','Interest income, net','Fees','Operating cost','Credit loss','PBT','Budget variance'],
      byCountry.map(([name,rows])=>[countryButton(name),...['nii','fees','cost','ecl'].map(key=>usd(amount(rows,key))),usd(pbt(rows)),usd(pbt(rows)-amount(rows,'budget'))])));
  } else if (page === 2) {
    const overdue = m('dpd30')+m('dpd60')+m('npl');
    const largest = [...byProduct].sort((a,b)=>amount(b[1],'npl')-amount(a[1],'npl'))[0];
    kpis = [kpi('Gross loans',usd(m('loans')),'Month-end'),kpi('30+ days past due',pct(dpd(active)),usd(overdue)+' balance'),
      kpi('NPL ratio',pct(npl(active)),usd(m('npl'))+' balance'),kpi('Credit loss expense',usd(m('ecl')),period)];
    left = card('Delinquency trend','Share of gross loans',chart(periods,[trend('30+ DPD',dpd),trend('NPL',npl)],pct));
    right = card('Delinquency buckets','Mutually exclusive overdue balances',bars([['30–59 days',m('dpd30')],['60–89 days',m('dpd60')],['90+ days / NPL',m('npl')]]));
    note = insight(`${largest[0]} accounts for ${pct(ratio(amount(largest[1],'npl'),m('npl')))} of selected NPL balances. ${prev.length ? 'The 30+ DPD rate was '+pct(dpd(prev))+' last month and is now '+pct(dpd(active))+'.' : 'This is the first reporting month.'}`,'Review the largest overdue exposures and prioritize collections by delinquency bucket.');
    detail = card('Collections by product','Overdue exposures in '+basis,table(['Product','30–59 DPD','60–89 DPD','90+ / NPL','30+ DPD rate'],
      byProduct.map(([name,rows])=>[name,...['dpd30','dpd60','npl'].map(key=>usd(amount(rows,key))),pct(dpd(rows))])));
  } else if (page === 3) {
    const gap = rows => amount(rows,'liquid')+amount(rows,'inflows')-amount(rows,'matured');
    const concentration = rows => rate(rows,'top20','deposits');
    const highest = [...byCountry].sort((a,b)=>concentration(b[1])-concentration(a[1]))[0];
    kpis = [kpi('Customer deposits',usd(m('deposits')),'Month-end'),kpi('Loan-to-deposit',pct(rate(active,'loans','deposits')),'Gross loans / customer deposits'),
      kpi('Large-depositor proxy',pct(concentration(active)),'Modeled large depositor balances'),kpi('30-day funding surplus',usd(gap(active)),'Liquidity + inflows − maturities')];
    left = card('Loans and deposits',basis,chart(periods,[trend('Customer deposits',rows=>amount(rows,'deposits')),trend('Gross loans',rows=>amount(rows,'loans'))]));
    right = card('Deposit concentration','Large-depositor proxy by country',bars(byCountry.map(([name,rows])=>[name,concentration(rows)]),pct));
    note = insight(`${highest[0]} has the highest modeled large-depositor share in the selection at ${pct(concentration(highest[1]))}.`,'Review renewal exposure and 30-day maturities by currency.');
    detail = card('30-day funding by currency','Amounts translated to '+basis,table(['Currency','Liquid assets','Expected inflows','Deposit maturities','Funding surplus'],
      unique(active,'currency').map(ccy=>{const rows=pick(active,'currency',ccy);return [ccy,...['liquid','inflows','matured'].map(key=>usd(amount(rows,key))),usd(gap(rows))];})));
  } else {
    const s = scenarios[state.scenario];
    const runoff = rows => amount(rows,'deposits')*s.runoff;
    const fundingCost = rows => runoff(rows)*s.funding/12;
    const extraLoss = rows => amount(rows,'loans')*s.loss;
    const stressed = rows => pbt(rows)-fundingCost(rows)-extraLoss(rows);
    const gap = rows => amount(rows,'liquid')+amount(rows,'inflows')-amount(rows,'matured')-runoff(rows);
    controls = `<div class="scenario">${select('scenario','Stress scenario',[['base','Base'],['adverse','Adverse'],['severe','Severe']])}</div>`;
    kpis = [kpi('Stressed monthly PBT',usd(stressed(active)),'Base PBT '+usd(pbt(active))),
      kpi('30-day liquidity position',usd(gap(active)),gap(active)>=0?'Funding surplus':'Funding shortfall'),
      kpi('Incremental deposit runoff',usd(runoff(active)),pct(s.runoff)+' of deposits'),kpi('Additional credit loss',usd(extraLoss(active)),pct(s.loss)+' of loans')];
    left = card('Base vs stressed PBT','Scenario applied independently to each historical month',chart(periods,[trend('Base PBT',pbt),trend('Stressed PBT',stressed)]));
    right = card('Scenario assumptions','Incremental shocks applied to the selected portfolio',bars([['Deposit runoff',s.runoff],['Replacement funding rate (annual)',s.funding],['One-time credit loss',s.loss]],pct));
    note = insight(`Under the selected scenario, monthly PBT falls by ${usd(fundingCost(active)+extraLoss(active))}. ${byCountry.filter(([,rows])=>gap(rows)<0).length} selected market(s) show a 30-day liquidity shortfall.`,'Review each market’s funding position and confirm how incremental losses affect profitability.');
    detail = card('Scenario impact by market',basis,table(['Country','Runoff','Funding cost','Extra credit loss','Stressed PBT','Liquidity position'],
      byCountry.map(([name,rows])=>[countryButton(name),... [runoff,fundingCost,extraLoss,stressed,gap].map(fn=>usd(fn(rows)))])));
  }
  content.innerHTML = controls+`<div class="kpis">${kpis.join('')}</div><div class="grid">${left}${right}</div>${note}${detail}`;
}

nav.addEventListener('click',event=>{
  const button=event.target.closest('[data-page]');
  if (!button) return;
  page=Number(button.dataset.page);
  render();
  nav.querySelector('[aria-current=true]').focus({preventScroll:true});
});
filters.addEventListener('change',event=>{
  const key=event.target.id;
  state[key]=event.target.value;
  if (key==='region') {state.country='';state.entity='';}
  if (key==='country') state.entity='';
  if (key==='region' || key==='country') {filterControls();document.getElementById(key).focus();}
  render();
});
filters.addEventListener('click',event=>{
  if(event.target.id!=='reset') return;
  state={...defaults};
  filterControls();
  document.getElementById('reset').focus();
  render();
});
content.addEventListener('change',event=>{
  if(event.target.id==='scenario') {state.scenario=event.target.value;render();document.getElementById('scenario').focus();}
});
content.addEventListener('click',event=>{
  if(event.target.id==='toggle-labels') {
    state.allLabels=!state.allLabels;
    render();
    document.getElementById('toggle-labels').focus({preventScroll:true});
    return;
  }
  const drill=event.target.closest('[data-drill]');
  if(!drill) return;
  state.country=drill.dataset.drill;
  state.entity=data.find(row=>row.country===state.country).entity;
  filterControls();
  document.getElementById('entity').focus({preventScroll:true});
  render();
});
filterControls();
render();
