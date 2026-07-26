import type { AppData, Route, Customer, Job, BusinessRecord } from './types.js';
import {loadData, saveData, exportData} from './db.js';

const app=document.querySelector<HTMLDivElement>('#app')!;
let data:AppData=loadData();
let route:Route='dashboard';
let selectedKind:BusinessRecord['kind']='Report';
let editingId='';
let query='';

const modules=[
  ['⚡','Electrical','EICR, minor works, installations and fault finding'],
  ['🛡️','Intruder Alarm','Servicing, commissioning, takeovers and faults'],
  ['📹','CCTV','Installation, maintenance and commissioning'],
  ['🔥','Fire Alarm','Routine inspection and servicing records'],
  ['🚪','Emergency Lighting','Functional and duration testing'],
  ['🔌','PAT Testing','Portable appliance inspection records'],
  ['📶','Network & Wi-Fi','Starlink, switching, access points and cabling'],
  ['🚗','EV Chargers','Installation and maintenance records']
];

function esc(v:unknown):string{return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]!))}
function money(v:number|undefined):string{return new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(v||0)}
function customerName(id?:string):string{return data.customers.find(c=>c.id===id)?.name||'No customer'}
function uid(prefix:string):string{return `${prefix}-${Date.now()}`}
function today():string{return new Date().toISOString().slice(0,10)}
function toast(message:string){const n=document.createElement('div');n.className='toast';n.textContent=message;document.body.append(n);setTimeout(()=>n.remove(),1800)}

function shell(content:string):string{
  return `<div class="app"><header class="topbar"><div class="brand"><img src="logo.png" alt=""><div><b>Cables Pro</b><small>Professional Edition · V8</small></div></div><div class="sync-pill">● Offline ready</div></header><main>${content}</main>
  <nav class="bottomnav">${[
    ['dashboard','⌂','Home'],['jobs','🧰','Jobs'],['customers','👥','Customers'],['diary','📅','Diary'],['more','•••','More']
  ].map(x=>`<button class="navbtn ${route===x[0]?'active':''}" data-route="${x[0]}"><span>${x[1]}</span>${x[2]}</button>`).join('')}</nav></div>`;
}

function dashboard():string{
  const t=today();
  const todays=data.jobs.filter(j=>j.date===t);
  const outstanding=data.records.filter(r=>r.kind==='Invoice'&&r.status!=='Paid');
  const activeContracts=data.records.filter(r=>r.kind==='Contract'&&r.status==='Active');
  const revenue=data.jobs.filter(j=>j.status==='Complete').reduce((a,j)=>a+j.value,0);
  const results=query?globalResults(query):'';
  return `<section class="hero"><div class="eyebrow">Cables Electrical Installations Limited</div><h1>Good day, Lee.</h1><p class="muted">One professional workspace for field engineering and office control.</p>
  <label class="field search">Search everything<input id="globalSearch" value="${esc(query)}" placeholder="Customer, address, job, invoice, asset or report"></label>${results}
  <div class="two"><button class="btn primary" data-new-job>＋ New Job</button><button class="btn" data-new-record="Quote">＋ New Quote</button></div></section>
  <div class="stats"><div class="card stat"><strong>${todays.length}</strong><span>Today's jobs</span></div><div class="card stat"><strong>${money(revenue)}</strong><span>Completed value</span></div><div class="card stat"><strong>${outstanding.length}</strong><span>Outstanding invoices</span></div><div class="card stat"><strong>${activeContracts.length}</strong><span>Active contracts</span></div></div>
  <div class="section-title"><h2>Today's diary</h2><button class="btn" data-route="diary">Open diary</button></div>
  <div class="list">${todays.map(jobCard).join('')||'<div class="card empty">No jobs booked today.</div>'}</div>
  <div class="section-title"><h2>Engineer modules</h2></div><div class="grid">${modules.map(m=>`<button class="module" data-module="${esc(m[1])}"><div class="icon">${m[0]}</div><b>${m[1]}</b><span>${m[2]}</span></button>`).join('')}</div>`;
}

function globalResults(q:string):string{
  const v=q.toLowerCase().trim(); if(!v)return '';
  const rows:string[]=[];
  data.customers.filter(c=>(c.name+' '+c.address).toLowerCase().includes(v)).slice(0,3).forEach(c=>rows.push(`<div class="search-result" data-edit-customer="${c.id}"><b>Customer</b> · ${esc(c.name)} — ${esc(c.address)}</div>`));
  data.jobs.filter(j=>(j.title+' '+j.module+' '+customerName(j.customerId)).toLowerCase().includes(v)).slice(0,3).forEach(j=>rows.push(`<div class="search-result" data-edit-job="${j.id}"><b>Job</b> · ${esc(customerName(j.customerId))} — ${esc(j.title)}</div>`));
  data.records.filter(r=>(r.reference+' '+r.title+' '+customerName(r.customerId)).toLowerCase().includes(v)).slice(0,4).forEach(r=>rows.push(`<div class="search-result" data-edit-record="${r.id}"><b>${r.kind}</b> · ${esc(r.reference)} — ${esc(r.title)}</div>`));
  return `<div class="search-results">${rows.join('')||'<div class="search-result muted">No matches found.</div>'}</div>`;
}

function jobCard(j:Job):string{
  return `<div class="card"><div class="row"><div class="avatar">${esc(j.time||'—')}</div><div class="grow"><b>${esc(customerName(j.customerId))}</b><div class="muted">${esc(j.title)} · ${esc(j.module)}</div></div><span class="badge ${j.status==='Complete'?'good':''}">${esc(j.status)}</span></div><div class="two" style="margin-top:14px"><button class="btn" data-edit-job="${j.id}">Open</button><button class="btn primary" data-advance-job="${j.id}">Advance stage</button></div></div>`;
}

function jobsView():string{
  return `<div class="section-title"><h2>Jobs</h2><button class="btn primary" data-new-job>＋ New Job</button></div><div class="list">${data.jobs.sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)).map(jobCard).join('')||'<div class="card empty">No jobs saved.</div>'}</div>`;
}
function customersView():string{
  return `<div class="section-title"><h2>Customers</h2><button class="btn primary" data-new-customer>＋ Add Customer</button></div><div class="list">${data.customers.map(c=>`<div class="card"><div class="row"><div class="avatar">${esc(c.name[0]||'?')}</div><div class="grow"><b>${esc(c.name)}</b><div class="muted">${esc(c.address)}</div></div></div><button class="btn full" style="margin-top:12px" data-edit-customer="${c.id}">Open customer</button></div>`).join('')}</div>`;
}
function diaryView():string{
  const grouped=[...data.jobs].sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
  return `<div class="section-title"><h2>Diary</h2><button class="btn primary" data-new-job>＋ Book Job</button></div><div class="list">${grouped.map(j=>`<div class="card"><div class="eyebrow">${esc(j.date)}</div>${jobCard(j)}</div>`).join('')||'<div class="card empty">Diary is clear.</div>'}</div>`;
}
function moreView():string{
  const items:[BusinessRecord['kind'],string,string][]=[
    ['Quote','£','Quotations'],['Invoice','🧾','Invoices'],['Contract','🔁','Service Contracts'],
    ['Report','📄','Technical Reports'],['Asset','🏷','Asset Register'],['Stock','📦','Stock Control']
  ];
  return `<div class="section-title"><h2>Business tools</h2></div><div class="grid">${items.map(i=>`<button class="module" data-list-kind="${i[0]}"><div class="icon">${i[1]}</div><b>${i[2]}</b><span>${data.records.filter(r=>r.kind===i[0]).length} records</span></button>`).join('')}
  <button class="module" data-backup><div class="icon">💾</div><b>Full Backup</b><span>Export all local V8 data as JSON.</span></button></div>`;
}
function listView():string{
  const rows=data.records.filter(r=>r.kind===selectedKind);
  return `<div class="section-title"><h2>${esc(selectedKind)}s</h2><button class="btn primary" data-new-record="${selectedKind}">＋ New ${esc(selectedKind)}</button></div><div class="list">${rows.map(r=>`<div class="card"><div class="row"><div class="avatar">${esc(r.kind[0])}</div><div class="grow"><b>${esc(r.title)}</b><div class="muted">${esc(r.reference)} · ${esc(customerName(r.customerId))}${r.amount?` · ${money(r.amount)}`:''}</div></div><span class="badge ${r.status==='Paid'||r.status==='Active'||r.status==='Operational'?'good':''}">${esc(r.status)}</span></div><button class="btn full" style="margin-top:12px" data-edit-record="${r.id}">Open</button></div>`).join('')||'<div class="card empty">No records in this module.</div>'}</div>`;
}
function customerForm(c?:Customer):string{
  const x=c||{id:uid('C'),name:'',address:'',phone:'',email:'',created:new Date().toISOString()};
  editingId=x.id;
  return `<div class="section-title"><h2>Customer</h2></div><form class="card" id="customerForm">
  <label class="field">Customer / company<input name="name" required value="${esc(x.name)}"></label>
  <label class="field">Address<textarea name="address" rows="3">${esc(x.address)}</textarea></label>
  <div class="two"><label class="field">Telephone<input name="phone" value="${esc(x.phone)}"></label><label class="field">Email<input type="email" name="email" value="${esc(x.email)}"></label></div>
  <button class="btn primary full">Save Customer</button></form>`;
}
function jobForm(j?:Job):string{
  const x=j||{id:uid('J'),customerId:data.customers[0]?.id||'',title:'',module:'Electrical',date:today(),time:'09:00',status:'Booked',value:0,notes:''};
  editingId=x.id;
  return `<div class="section-title"><h2>Job</h2></div><form class="card" id="jobForm">
  <label class="field">Customer<select name="customerId">${data.customers.map(c=>`<option value="${c.id}" ${c.id===x.customerId?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label>
  <label class="field">Job title<input name="title" required value="${esc(x.title)}"></label>
  <label class="field">Module<select name="module">${modules.map(m=>`<option ${m[1]===x.module?'selected':''}>${m[1]}</option>`).join('')}</select></label>
  <div class="two"><label class="field">Date<input type="date" name="date" value="${x.date}"></label><label class="field">Time<input type="time" name="time" value="${x.time}"></label></div>
  <div class="two"><label class="field">Status<select name="status">${['Booked','Travelling','On site','In progress','Complete'].map(v=>`<option ${v===x.status?'selected':''}>${v}</option>`).join('')}</select></label><label class="field">Job value (£)<input type="number" step=".01" name="value" value="${x.value}"></label></div>
  <label class="field">Notes<textarea name="notes" rows="5">${esc(x.notes)}</textarea></label><button class="btn primary full">Save Job</button></form>`;
}
function recordForm(r?:BusinessRecord):string{
  const x=r||{id:uid('R'),kind:selectedKind,reference:`${selectedKind.slice(0,3).toUpperCase()}-${new Date().getFullYear()}-${String(data.records.filter(z=>z.kind===selectedKind).length+1).padStart(4,'0')}`,customerId:data.customers[0]?.id,title:'',status:'Draft',date:today(),amount:0,details:''};
  editingId=x.id; selectedKind=x.kind;
  return `<div class="section-title"><h2>${esc(x.kind)}</h2></div><form class="card" id="recordForm">
  <label class="field">Reference<input name="reference" value="${esc(x.reference)}"></label><label class="field">Customer<select name="customerId"><option value="">No customer</option>${data.customers.map(c=>`<option value="${c.id}" ${c.id===x.customerId?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label>
  <label class="field">Title<input name="title" required value="${esc(x.title)}"></label><div class="two"><label class="field">Date<input type="date" name="date" value="${x.date}"></label><label class="field">Amount (£)<input type="number" step=".01" name="amount" value="${x.amount||0}"></label></div>
  <label class="field">Status<input name="status" value="${esc(x.status)}"></label><label class="field">Details<textarea name="details" rows="7">${esc(x.details)}</textarea></label>
  <button class="btn primary full">Save ${esc(x.kind)}</button></form>`;
}
function render(){
  let content='';
  if(route==='dashboard')content=dashboard();
  if(route==='jobs')content=jobsView();
  if(route==='customers')content=customersView();
  if(route==='diary')content=diaryView();
  if(route==='more')content=moreView();
  if(route==='list')content=listView();
  if(route==='record'){
    const c=data.customers.find(x=>x.id===editingId),j=data.jobs.find(x=>x.id===editingId),r=data.records.find(x=>x.id===editingId);
    content=c?customerForm(c):j?jobForm(j):recordForm(r);
  }
  app.innerHTML=shell(content);
  bind();
}
function bind(){
  document.querySelectorAll<HTMLElement>('[data-route]').forEach(b=>b.onclick=()=>{route=b.dataset.route as Route;editingId='';render()});
  document.querySelectorAll<HTMLElement>('[data-new-customer]').forEach(b=>b.onclick=()=>{editingId=uid('C');route='record';app.innerHTML=shell(customerForm());bind()});
  document.querySelectorAll<HTMLElement>('[data-new-job]').forEach(b=>b.onclick=()=>{editingId=uid('J');route='record';app.innerHTML=shell(jobForm());bind()});
  document.querySelectorAll<HTMLElement>('[data-module]').forEach(b=>b.onclick=()=>{editingId=uid('J');route='record';const j:Job={id:editingId,customerId:data.customers[0]?.id||'',title:`${b.dataset.module} visit`,module:b.dataset.module||'Electrical',date:today(),time:'09:00',status:'Booked',value:0,notes:''};app.innerHTML=shell(jobForm(j));bind()});
  document.querySelectorAll<HTMLElement>('[data-edit-customer]').forEach(b=>b.onclick=()=>{editingId=b.dataset.editCustomer!;route='record';render()});
  document.querySelectorAll<HTMLElement>('[data-edit-job]').forEach(b=>b.onclick=()=>{editingId=b.dataset.editJob!;route='record';render()});
  document.querySelectorAll<HTMLElement>('[data-list-kind]').forEach(b=>b.onclick=()=>{selectedKind=b.dataset.listKind as BusinessRecord['kind'];route='list';render()});
  document.querySelectorAll<HTMLElement>('[data-new-record]').forEach(b=>b.onclick=()=>{selectedKind=b.dataset.newRecord as BusinessRecord['kind'];editingId=uid('R');route='record';app.innerHTML=shell(recordForm());bind()});
  document.querySelectorAll<HTMLElement>('[data-edit-record]').forEach(b=>b.onclick=()=>{editingId=b.dataset.editRecord!;route='record';render()});
  document.querySelectorAll<HTMLElement>('[data-advance-job]').forEach(b=>b.onclick=()=>{const j=data.jobs.find(x=>x.id===b.dataset.advanceJob);if(!j)return;const stages:Job['status'][]=['Booked','Travelling','On site','In progress','Complete'];j.status=stages[Math.min(stages.indexOf(j.status)+1,stages.length-1)];saveData(data);toast(`Job moved to ${j.status}`);render()});
  document.querySelectorAll<HTMLElement>('[data-backup]').forEach(b=>b.onclick=()=>exportData(data));
  const search=document.querySelector<HTMLInputElement>('#globalSearch');
  if(search)search.oninput=()=>{query=search.value;render();const n=document.querySelector<HTMLInputElement>('#globalSearch');n?.focus();n?.setSelectionRange(n.value.length,n.value.length)};
  const cf=document.querySelector<HTMLFormElement>('#customerForm');if(cf)cf.onsubmit=e=>{e.preventDefault();const f=new FormData(cf);const existing=data.customers.find(x=>x.id===editingId);const item:Customer={id:editingId,name:String(f.get('name')),address:String(f.get('address')),phone:String(f.get('phone')),email:String(f.get('email')),created:existing?.created||new Date().toISOString()};if(existing)Object.assign(existing,item);else data.customers.push(item);saveData(data);toast('Customer saved');route='customers';render()};
  const jf=document.querySelector<HTMLFormElement>('#jobForm');if(jf)jf.onsubmit=e=>{e.preventDefault();const f=new FormData(jf);const existing=data.jobs.find(x=>x.id===editingId);const item:Job={id:editingId,customerId:String(f.get('customerId')),title:String(f.get('title')),module:String(f.get('module')),date:String(f.get('date')),time:String(f.get('time')),status:String(f.get('status')) as Job['status'],value:Number(f.get('value')||0),notes:String(f.get('notes'))};if(existing)Object.assign(existing,item);else data.jobs.push(item);saveData(data);toast('Job saved');route='jobs';render()};
  const rf=document.querySelector<HTMLFormElement>('#recordForm');if(rf)rf.onsubmit=e=>{e.preventDefault();const f=new FormData(rf);const existing=data.records.find(x=>x.id===editingId);const item:BusinessRecord={id:editingId,kind:selectedKind,reference:String(f.get('reference')),customerId:String(f.get('customerId'))||undefined,title:String(f.get('title')),status:String(f.get('status')),date:String(f.get('date')),amount:Number(f.get('amount')||0),details:String(f.get('details'))};if(existing)Object.assign(existing,item);else data.records.push(item);saveData(data);toast(`${selectedKind} saved`);route='list';render()};
}
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
render();
