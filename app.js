
'use strict';
const APP_VERSION='13.1.0';
const KEY_DATA='cables_pro_v9_data';
const KEY_REPORTS='cables_pro_v9_alarm_reports';
const app=document.getElementById('app');
let route='home', current=null, step=0, search='', autosave=null;

const emptyData={customers:[],jobs:[],quotes:[],invoices:[],stock:[],suppliers:[],jobMaterials:[],electricalCertificates:[],customerNotes:[],equipment:[],batteryRecords:[],customerPhotos:[]};
function load(key,fallback){try{const x=localStorage.getItem(key);return x?JSON.parse(x):structuredClone(fallback)}catch{return structuredClone(fallback)}}
function save(key,value){localStorage.setItem(key,JSON.stringify(value))}
let data=load(KEY_DATA,emptyData);
let reports=load(KEY_REPORTS,[]);
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function today(){return new Date().toISOString().slice(0,10)}
function uid(prefix){return prefix+'-'+Date.now()+'-'+Math.random().toString(36).slice(2,7)}
function toast(t){const n=document.createElement('div');n.className='toast';n.textContent=t;document.body.appendChild(n);setTimeout(()=>n.remove(),1600)}
function customerName(id){return data.customers.find(c=>c.id===id)?.name||''}
function nextNumber(){const y=new Date().getFullYear(), nums=reports.map(r=>r.number).filter(n=>n?.startsWith('AL-'+y+'-')).map(n=>+n.split('-').pop()).filter(Number.isFinite);return `AL-${y}-${String((nums.length?Math.max(...nums):0)+1).padStart(4,'0')}`}

function isoNow(){return new Date().toISOString()}
function minutesBetween(a,b){if(!a||!b)return 0;const n=Math.round((new Date(b)-new Date(a))/60000);return Number.isFinite(n)&&n>0?n:0}
function formatDuration(mins){mins=Number(mins||0);const h=Math.floor(mins/60),m=mins%60;if(h&&m)return `${h} hr ${m} min`;if(h)return `${h} hr`;return `${m} min`}
function formatDateTime(v){if(!v)return '—';try{return new Date(v).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'})}catch{return v}}
function addOneYear(v){const d=new Date(v||today());if(Number.isNaN(d.getTime()))return '';d.setFullYear(d.getFullYear()+1);return d.toISOString().slice(0,10)}
function startTravelNow(){if(!current)return;current.travelStartedTimestamp=isoNow();persist('Draft');toast('Travel timer started');render()}
function finishTravelNow(){if(!current||!current.travelStartedTimestamp)return;current.travelMinutes=minutesBetween(current.travelStartedTimestamp,isoNow());persist('Draft');toast('Travel time recorded');render()}
function setArrivalNow(){if(!current)return;current.arrivalTimestamp=isoNow();const d=new Date(current.arrivalTimestamp);current.date=d.toISOString().slice(0,10);current.arrival=d.toTimeString().slice(0,5);persist('Draft');toast('Arrival time recorded');render()}
function setDepartureNow(){if(!current)return;current.departureTimestamp=isoNow();const d=new Date(current.departureTimestamp);current.departure=d.toTimeString().slice(0,5);current.labourMinutes=minutesBetween(current.arrivalTimestamp,current.departureTimestamp);persist('Draft');toast('Departure time recorded');render()}

function blankReport(){
 return {id:uid('ALR'),number:nextNumber(),status:'Draft',created:new Date().toISOString(),updated:new Date().toISOString(),
 customerId:'',customer:'',address:'',contact:'',phone:'',email:'',date:today(),arrival:'09:00',departure:'10:00',engineer:'Lee Naylor',visit:'Annual Service',
 panelMake:'',panelModel:'',panelSerial:'',panelLocation:'',grade:'Grade 2',signalling:'None',zones:'',keypads:'',sirens:'',expanders:'',
 mains:true,panelBattery:'',batteryAge:'',auxVoltage:'',sirenBattery:'',psuNotes:'',
 checks:{panel:true,keypads:true,detectors:true,contacts:true,panic:true,externalSiren:true,internalSiren:true,signalling:true,mainsFail:true,batteryFail:true,tamper:true,walkTest:true,userCode:true,eventLog:true},
 devices:[],faults:'',parts:'',recommendations:'',notes:'',result:'Satisfactory',
 photos:[],customerSignedBy:'',customerSignature:'',engineerSignature:'',emailSent:false,linkedJobId:'',arrivalTimestamp:'',departureTimestamp:'',travelStartedTimestamp:'',travelMinutes:0,labourMinutes:0,nextServiceDate:addOneYear(today()),customerSignedAt:'',engineerSignedAt:'',reportIssuedAt:''};
}
function shell(body){
 return `<div class="app"><header><div class="brand"><img src="logo.png"><div><b>Cables Pro</b><small>Professional Intruder Alarm Edition</small></div></div><div class="version">V13.1</div></header><main>${body}</main>
 <nav class="bottom">${[['home','⌂','Home'],['jobs','📅','Diary'],['customers','👥','Customers'],['reports','📄','Reports'],['more','£','Business']].map(x=>`<button class="nav ${route===x[0]?'active':''}" data-route="${x[0]}"><span>${x[1]}</span>${x[2]}</button>`).join('')}</nav></div>`;
}

function normaliseData(){data.customers=data.customers||[];data.jobs=data.jobs||[];data.quotes=data.quotes||[];data.customerNotes=data.customerNotes||[];data.equipment=data.equipment||[];data.batteryRecords=data.batteryRecords||[];data.customerPhotos=data.customerPhotos||[]}


function electricalCertificates(){return data.electricalCertificates||[]}
function nextCertificateNumber(type){
 const prefix={EICR:'EICR',MWC:'MW',EIC:'EIC',EV:'EV'}[type]||'CERT';
 const y=new Date().getFullYear();
 const nums=electricalCertificates()
   .map(x=>String(x.number||''))
   .filter(n=>n.startsWith(`${prefix}-${y}-`))
   .map(n=>Number(n.split('-').pop()))
   .filter(Number.isFinite);
 return `${prefix}-${y}-${String((nums.length?Math.max(...nums):0)+1).padStart(4,'0')}`;
}
function blankElectricalCertificate(type='EICR'){
 return {
  id:uid('EC'),type,number:nextCertificateNumber(type),status:'Draft',
  customerId:'',customer:'',address:'',date:today(),engineer:'Lee Naylor',
  installationType:'Domestic',occupier:'',supplyType:'TN-C-S',phases:'Single phase',
  earthingConductor:'',bondingConductor:'',mainSwitch:'',r1r2:'',ze:'',pfc:'',zs:'',ir:'',rcdTime:'',
  boardDetails:'',workDescription:'',extentLimitations:'',recommendationDate:'',
  observations:[],circuits:[],
  evDetails:{chargerMake:'',chargerModel:'',serial:'',rating:'32',rcdType:'Type A',penProtection:'Integral',earthArrangement:'',testResult:''},
  result:'Satisfactory',
  declaration:'I certify that the electrical installation work has been inspected and tested in accordance with BS 7671.',
  customerSignature:'',engineerSignature:'',customerSignedAt:'',engineerSignedAt:'',issuedAt:''
 };
}
function certTitle(type){
 return {
  EICR:'Electrical Installation Condition Report',
  MWC:'Minor Electrical Installation Works Certificate',
  EIC:'Electrical Installation Certificate',
  EV:'EV Charge Point Installation Record'
 }[type]||'Electrical Certificate';
}
function codeClass(code){
 return code==='C1'||code==='C2'||code==='FI'?'bad':code==='C3'?'':'good';
}
function certificateCustomerName(c){return c.customer||customerName(c.customerId)}

function invoices(){return data.invoices||[]}
function stockItems(){return data.stock||[]}
function suppliers(){return data.suppliers||[]}
function jobMaterials(jobId){return (data.jobMaterials||[]).filter(m=>m.jobId===jobId)}
function nextDocNumber(prefix,list){
 const y=new Date().getFullYear();
 const nums=list.map(x=>String(x.number||x.reference||'')).filter(n=>n.startsWith(`${prefix}-${y}-`)).map(n=>Number(n.split('-').pop())).filter(Number.isFinite);
 return `${prefix}-${y}-${String((nums.length?Math.max(...nums):0)+1).padStart(4,'0')}`;
}
function stockValue(){return stockItems().reduce((s,x)=>s+Number(x.quantity||0)*Number(x.costPrice||0),0)}
function outstandingInvoices(){return invoices().filter(i=>i.status!=='Paid'&&i.status!=='Cancelled').reduce((s,i)=>s+Number(i.total||0),0)}
function paidInvoices(){return invoices().filter(i=>i.status==='Paid').reduce((s,i)=>s+Number(i.total||0),0)}
function quoteValue(){return data.quotes.reduce((s,q)=>s+Number(q.amount||0),0)}
function invoiceTotal(lines,labour,vatRate){
 const subtotal=(lines||[]).reduce((s,l)=>s+Number(l.qty||0)*Number(l.unitPrice||0),0)+Number(labour||0);
 const vat=subtotal*(Number(vatRate||0)/100);
 return {subtotal,vat,total:subtotal+vat};
}
function stockById(id){return stockItems().find(x=>x.id===id)}
function supplierById(id){return suppliers().find(x=>x.id===id)}


const JOB_TYPES=[
 'Intruder Alarm Service',
 'Intruder Alarm Installation',
 'CCTV',
 'Security Alarm',
 'Electrical Work',
 'EICR',
 'Minor Works',
 'Electrical Installation Certificate',
 'EV Charger',
 'Network / Wi-Fi',
 'TV Aerial',
 'General Call-out'
];
function jobActionLabel(job){
 const t=job?.jobType||'';
 if(t==='EICR')return 'Start EICR';
 if(t==='Minor Works')return 'Start Minor Works';
 if(t==='Electrical Installation Certificate')return 'Start EIC';
 if(t==='EV Charger')return 'Start EV Record';
 if(t==='Intruder Alarm Service'||t==='Intruder Alarm Installation'||t==='Security Alarm')return 'Start Alarm Report';
 return 'Start Job Sheet';
}
function jobTypeToCertificate(jobType){
 return {
  'EICR':'EICR',
  'Minor Works':'MWC',
  'Electrical Installation Certificate':'EIC',
  'EV Charger':'EV'
 }[jobType]||'';
}
function blankGeneralJobSheet(job){
 const c=data.customers.find(x=>x.name.trim().toLowerCase()===String(job.customer||'').trim().toLowerCase());
 return {
  id:uid('JS'),number:`JOB-${new Date().getFullYear()}-${String(reports.length+1).padStart(4,'0')}`,
  linkedJobId:job.id,customerId:c?.id||'',customer:job.customer||'',address:c?.address||'',
  contact:c?.contact||'',phone:c?.phone||'',email:c?.email||'',date:job.date||today(),
  arrival:job.time||'09:00',departure:'',engineer:'Lee Naylor',visit:job.jobType||'General Call-out',
  notes:job.notes||'',result:'Complete',status:'Draft',devices:[],photos:[],
  customerSignedBy:'',customerSignature:'',engineerSignature:'',emailSent:false,
  linkedJobType:job.jobType||'',arrivalTimestamp:'',departureTimestamp:'',travelStartedTimestamp:'',
  travelMinutes:0,labourMinutes:0,nextServiceDate:'',customerSignedAt:'',engineerSignedAt:'',reportIssuedAt:''
 };
}
function startWorkflowFromJob(job){
 if(!job)return;
 const certType=jobTypeToCertificate(job.jobType);
 if(certType){
   const c=data.customers.find(x=>x.name.trim().toLowerCase()===String(job.customer||'').trim().toLowerCase());
   current=blankElectricalCertificate(certType);
   current.linkedJobId=job.id;
   current.customerId=c?.id||'';
   current.customer=job.customer||'';
   current.address=c?.address||'';
   current.date=job.date||today();
   current.workDescription=job.title||job.notes||'';
   route='electrical-form';
   render();
   return;
 }
 if(['Intruder Alarm Service','Intruder Alarm Installation','Security Alarm'].includes(job.jobType)){
   startReportFromJob(job);
   return;
 }
 current=blankGeneralJobSheet(job);
 route='alarm-form';
 step=0;
 render();
}

function customerById(id){return data.customers.find(c=>c.id===id)}
function customerReports(id){const c=customerById(id);if(!c)return [];return reports.filter(r=>r.customerId===id||(!r.customerId&&String(r.customer||'').trim().toLowerCase()===String(c.name||'').trim().toLowerCase()))}
function customerJobs(id){const c=customerById(id);if(!c)return [];return data.jobs.filter(j=>j.customerId===id||(!j.customerId&&String(j.customer||'').trim().toLowerCase()===String(c.name||'').trim().toLowerCase()))}
function customerQuotes(id){return data.quotes.filter(q=>q.customerId===id)}
function customerNotes(id){return data.customerNotes.filter(n=>n.customerId===id).sort((a,b)=>String(b.created).localeCompare(String(a.created)))}
function customerEquipment(id){return data.equipment.filter(e=>e.customerId===id)}
function customerBatteryRecords(id){return data.batteryRecords.filter(b=>b.customerId===id).sort((a,b)=>String(b.date).localeCompare(String(a.date)))}
function customerPhotos(id){return data.customerPhotos.filter(p=>p.customerId===id).sort((a,b)=>String(b.created).localeCompare(String(a.created)))}
function money(v){return new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(Number(v||0))}
function customerInitials(name){return String(name||'?').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase()||'?'}
function customerHistory(id){const rows=[];customerJobs(id).forEach(j=>rows.push({date:j.date||'',type:'Job',title:j.title||'Diary appointment',status:j.status||''}));customerReports(id).forEach(r=>rows.push({date:r.date||'',type:'Alarm report',title:r.number||'Alarm service report',status:r.status||''}));customerQuotes(id).forEach(q=>rows.push({date:q.date||'',type:'Quotation',title:q.reference||q.title||'Quotation',status:q.status||''}));customerBatteryRecords(id).forEach(b=>rows.push({date:b.date||'',type:'Battery',title:`${b.item||'Battery'} replaced`,status:b.voltage?`${b.voltage} V`:''}));customerNotes(id).forEach(n=>rows.push({date:String(n.created||'').slice(0,10),type:'Note',title:n.text||'',status:n.engineer||''}));return rows.sort((a,b)=>String(b.date).localeCompare(String(a.date)))}
function newQuote(customerId){const c=customerById(customerId);return{id:uid('Q'),customerId,date:today(),reference:`Q-${new Date().getFullYear()}-${String(data.quotes.length+1).padStart(4,'0')}`,title:'',description:'',amount:0,status:'Draft',customer:c?.name||''}}

function home(){
 const drafts=reports.filter(r=>r.status==='Draft').length,complete=reports.filter(r=>r.status==='Complete').length,todays=data.jobs.filter(j=>j.date===today()).length;
 return `<section class="hero"><div class="eyebrow">Cables Electrical Installations Limited</div><h1>Ready for site.</h1><p class="muted">Complete, sign and issue intruder alarm service reports from one place.</p><div class="two"><button class="btn primary" data-new-report>＋ Start Alarm Service</button><button class="btn" data-route="reports">Open Reports</button></div></section>
 <div class="stats"><div class="card stat"><strong>${todays}</strong><span>Today's jobs</span></div><div class="card stat"><strong>${money(outstandingInvoices())}</strong><span>Outstanding invoices</span></div><div class="card stat"><strong>${money(stockValue())}</strong><span>Stock value</span></div><div class="card stat"><strong>${data.customers.length}</strong><span>Customers</span></div></div>
 <div class="section"><h2>Live engineer module</h2></div><div class="grid"><button class="module live" data-new-report><div class="ico">🛡️</div><b>Intruder Alarm Service Report</b><span>Full service form, device testing, photographs, signatures, PDF and email.</span></button>
 <button class="module" data-route="reports"><div class="ico">📄</div><b>Saved Alarm Reports</b><span>Resume drafts or reopen completed reports.</span></button>
 <button class="module" data-new-job><div class="ico">📅</div><b>Book a Job</b><span>Add an appointment to the diary.</span></button>
 <button class="module" data-new-customer><div class="ico">👥</div><b>Add Customer</b><span>Save customer details for quick report completion.</span></button><button class="module" data-route="more"><div class="ico">£</div><b>Business Management</b><span>Quotes, invoices, stock, suppliers and profitability.</span></button><button class="module" data-route="electrical"><div class="ico">⚡</div><b>Electrical Certification</b><span>EICRs, Minor Works, EICs and EV charger records.</span></button></div>`;
}
function diary(){
 const rows=[...data.jobs].sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
 return `<div class="section"><h2>Diary</h2><button class="btn primary" data-new-job>＋ Book Job</button></div>${rows.map(j=>`<div class="card"><div class="row"><div class="avatar">${esc(j.time)}</div><div class="grow"><b>${esc(j.customer)}</b><div class="muted">${esc(j.date)} · ${esc(j.title)}</div><div class="muted">${esc(j.jobType||'General Call-out')}</div></div><span class="badge ${j.status==='Complete'?'good':''}">${esc(j.status)}</span></div><div class="grid no-print" style="margin-top:11px"><button class="btn" data-edit-job="${j.id}">Open</button><button class="btn primary" data-job-workflow="${j.id}">${esc(jobActionLabel(j))}</button><button class="btn danger" data-delete-job="${j.id}">Delete Job</button></div></div>`).join('')||'<div class="card empty">No diary appointments.</div>'}`;
}
function customers(){
 return `<div class="section"><h2>Customers</h2><button class="btn primary" data-new-customer>＋ Add Customer</button></div><div class="card"><label class="field">Search customers<input id="customerSearch" placeholder="Name, address, telephone or email"></label></div><div id="customerList">${data.customers.map(c=>`<div class="card customer-card" data-customer-text="${esc((c.name+' '+c.address+' '+c.phone+' '+c.email).toLowerCase())}"><div class="row"><div class="avatar">${esc(customerInitials(c.name))}</div><div class="grow"><b>${esc(c.name)}</b><div class="muted">${esc(c.address)}</div><div class="muted">${esc(c.phone||'')} ${c.email?'· '+esc(c.email):''}</div></div><span class="badge good">${customerReports(c.id).length} reports</span></div><div class="grid no-print" style="margin-top:11px"><button class="btn primary" data-open-customer="${c.id}">Open Customer</button><button class="btn" data-report-customer="${c.id}">Start Service</button><button class="btn" data-edit-customer="${c.id}">Edit</button></div></div>`).join('')||'<div class="card empty">No customers saved yet.</div>'}</div>`;
}

function customerProfile(){const c=current,reps=customerReports(c.id),jobs=customerJobs(c.id),quotes=customerQuotes(c.id),notes=customerNotes(c.id),equipment=customerEquipment(c.id),batteries=customerBatteryRecords(c.id),photos=customerPhotos(c.id),history=customerHistory(c.id);return `<div class="section"><div><div class="eyebrow">Customer Database</div><h2 style="margin:4px 0">${esc(c.name)}</h2></div><button class="btn" data-edit-customer="${c.id}">Edit Details</button></div><div class="card customer-hero"><div class="row"><div class="profile-avatar">${esc(customerInitials(c.name))}</div><div class="grow"><h2 style="margin:0">${esc(c.name)}</h2><p class="muted">${esc(c.address||'No address recorded')}</p><p>${esc(c.phone||'')} ${c.email?'· '+esc(c.email):''}</p></div></div><div class="stats customer-stats"><div class="stat"><strong>${reps.length}</strong><span>Reports</span></div><div class="stat"><strong>${jobs.length}</strong><span>Jobs</span></div><div class="stat"><strong>${equipment.length}</strong><span>Assets</span></div><div class="stat"><strong>${money(quotes.reduce((s,q)=>s+Number(q.amount||0),0))}</strong><span>Quoted</span></div></div><div class="grid no-print"><button class="btn primary" data-report-customer="${c.id}">Start Alarm Service</button><button class="btn" data-add-equipment="${c.id}">Add Equipment</button><button class="btn" data-add-battery="${c.id}">Record Battery</button><button class="btn" data-add-note="${c.id}">Add Note</button><button class="btn" data-add-quote="${c.id}">New Quote</button><button class="btn" data-add-customer-photo="${c.id}">Add Site Photo</button></div></div><div class="section"><h2>Installed equipment</h2></div>${equipment.map(e=>`<div class="card"><div class="row"><div class="avatar">🔧</div><div class="grow"><b>${esc(e.type||'Equipment')}</b><div class="muted">${esc(e.make||'')} ${esc(e.model||'')} · ${esc(e.location||'')}</div><div class="muted">Serial: ${esc(e.serial||'—')} · Installed: ${esc(e.installedDate||'—')}</div></div><button class="btn danger" data-delete-equipment="${e.id}">Delete</button></div></div>`).join('')||'<div class="card empty">No installed equipment recorded.</div>'}<div class="section"><h2>Battery history</h2></div>${batteries.map(b=>`<div class="card"><div class="row"><div class="avatar">🔋</div><div class="grow"><b>${esc(b.item||'Battery')}</b><div class="muted">${esc(b.date)} · ${esc(b.make||'')} ${esc(b.model||'')}</div><div class="muted">${b.voltage?esc(b.voltage)+' V · ':''}${esc(b.notes||'')}</div></div><button class="btn danger" data-delete-battery="${b.id}">Delete</button></div></div>`).join('')||'<div class="card empty">No battery replacements recorded.</div>'}<div class="section"><h2>Previous reports</h2></div>${reps.map(r=>`<div class="card"><div class="row"><div class="avatar">📄</div><div class="grow"><b>${esc(r.number)}</b><div class="muted">${esc(r.date)} · ${esc(r.result||r.status)}</div></div><button class="btn" data-open-report="${r.id}">Open</button></div></div>`).join('')||'<div class="card empty">No reports recorded.</div>'}<div class="section"><h2>Quotations</h2></div>${quotes.map(q=>`<div class="card"><div class="row"><div class="avatar">£</div><div class="grow"><b>${esc(q.reference)} · ${esc(q.title||'Quotation')}</b><div class="muted">${esc(q.date)} · ${money(q.amount)} · ${esc(q.status)}</div></div><button class="btn" data-open-quote="${q.id}">Open</button></div></div>`).join('')||'<div class="card empty">No quotations recorded.</div>'}<div class="section"><h2>Engineer notes</h2></div>${notes.map(n=>`<div class="card"><div class="row"><div class="avatar">📝</div><div class="grow"><b>${esc(n.engineer||'Engineer')}</b><div class="muted">${esc(formatDateTime(n.created))}</div><p>${esc(n.text).replace(/\n/g,'<br>')}</p></div><button class="btn danger" data-delete-note="${n.id}">Delete</button></div></div>`).join('')||'<div class="card empty">No engineer notes.</div>'}<div class="section"><h2>Site photographs</h2></div><div class="card"><div class="photo-grid">${photos.map(p=>`<div class="photo"><img src="${p.data}"><p class="muted">${esc(p.caption||'')}<br>${esc(String(p.created||'').slice(0,10))}</p><button class="btn danger" data-delete-customer-photo="${p.id}">Delete</button></div>`).join('')||'<p class="muted">No site photographs.</p>'}</div></div><div class="section"><h2>Complete customer history</h2></div><div class="card">${history.map(h=>`<div class="timeline-row"><div class="timeline-dot"></div><div><b>${esc(h.type)} · ${esc(h.title)}</b><div class="muted">${esc(h.date)} ${h.status?'· '+esc(h.status):''}</div></div></div>`).join('')||'<div class="empty">No history yet.</div>'}</div>`}
function equipmentForm(){const x=current;return `<div class="section"><h2>Installed Equipment</h2></div><form class="card" id="equipmentForm">${field('Equipment type','type',x.type)}<div class="two">${field('Make','make',x.make)}${field('Model','model',x.model)}</div><div class="two">${field('Serial number','serial',x.serial)}${field('Location','location',x.location)}</div>${field('Installed date','installedDate',x.installedDate,'date')}${area('Notes','notes',x.notes,4)}<button class="btn primary full">Save Equipment</button></form>`}
function batteryForm(){const x=current;return `<div class="section"><h2>Battery Record</h2></div><form class="card" id="batteryForm">${field('Battery / item','item',x.item)}<div class="two">${field('Make','make',x.make)}${field('Model / size','model',x.model)}</div><div class="two">${field('Replacement date','date',x.date,'date')}${field('Voltage after replacement','voltage',x.voltage,'number')}</div>${area('Notes','notes',x.notes,4)}<button class="btn primary full">Save Battery Record</button></form>`}
function noteForm(){const x=current;return `<div class="section"><h2>Engineer Note</h2></div><form class="card" id="noteForm">${field('Engineer','engineer',x.engineer)}${area('Note','text',x.text,8)}<button class="btn primary full">Save Note</button></form>`}
function quoteForm(){const x=current;return `<div class="section"><h2>Quotation</h2></div><form class="card" id="quoteForm"><div class="two">${field('Reference','reference',x.reference)}${field('Date','date',x.date,'date')}</div>${field('Title','title',x.title)}${area('Description','description',x.description,7)}<div class="two">${field('Amount (£)','amount',x.amount,'number')}<label class="field">Status<select data-field="status">${['Draft','Sent','Accepted','Declined','Complete'].map(s=>`<option ${s===x.status?'selected':''}>${s}</option>`).join('')}</select></label></div><button class="btn primary full">Save Quotation</button></form>`}
function customerPhotoForm(){const x=current;return `<div class="section"><h2>Site Photograph</h2></div><form class="card" id="customerPhotoForm"><label class="field">Choose or take photograph<input id="customerPhotoInput" type="file" accept="image/*" capture="environment"></label>${field('Caption','caption',x.caption)}<div id="customerPhotoPreview">${x.data?`<img src="${x.data}" style="width:100%;max-height:380px;object-fit:contain;border-radius:14px">`:''}</div><button class="btn primary full" style="margin-top:12px">Save Photograph</button></form>`}

function reportList(){
 const q=search.toLowerCase().trim(),list=reports.filter(r=>(r.customer+' '+r.address+' '+r.number+' '+r.panelMake+' '+r.panelModel).toLowerCase().includes(q));
 return `<div class="section"><h2>Alarm Reports</h2><button class="btn primary" data-new-report>＋ New Report</button></div><div class="card"><label class="field">Search reports<input id="reportSearch" value="${esc(search)}" placeholder="Customer, address, report number or panel"></label></div>
 ${list.map(r=>`<div class="card"><div class="row"><div class="avatar">🛡️</div><div class="grow"><b>${esc(r.customer||'Unnamed customer')}</b><div class="muted">${esc(r.number)} · ${esc(r.date)} · ${esc(r.panelMake)} ${esc(r.panelModel)}</div></div><span class="badge ${r.status==='Complete'?'good':''}">${esc(r.status)}</span></div><div class="two" style="margin-top:11px"><button class="btn" data-open-report="${r.id}">${r.status==='Complete'?'View':'Resume'}</button><button class="btn danger" data-delete-report="${r.id}">Delete</button></div></div>`).join('')||'<div class="card empty">No matching reports.</div>'}`;
}
function field(label,key,value,type='text'){return `<label class="field">${label}<input data-field="${key}" type="${type}" value="${esc(value)}"></label>`}
function area(label,key,value,rows=4){return `<label class="field">${label}<textarea data-field="${key}" rows="${rows}">${esc(value)}</textarea></label>`}
function check(label,key,val){return `<label class="check"><input type="checkbox" data-check="${key}" ${val?'checked':''}><span>${label}</span></label>`}
function reportForm(){
 const r=current;
 const names=['Customer & visit','System details','Testing','Devices','Findings','Photos & signatures'];
 const panes=[
 `<div class="card"><h3>Customer and visit</h3><label class="field">Select saved customer<select id="savedCustomer"><option value="">Choose customer</option>${data.customers.map(c=>`<option value="${c.id}" ${c.id===r.customerId?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label>
 <div class="two">${field('Customer / company','customer',r.customer)}${field('Contact name','contact',r.contact)}</div>${area('Site address','address',r.address,3)}
 <div class="two">${field('Telephone','phone',r.phone,'tel')}${field('Email','email',r.email,'email')}</div>
 <div class="two">${field('Service date','date',r.date,'date')}${field('Engineer','engineer',r.engineer)}</div>
 <div class="two">${field('Arrival time','arrival',r.arrival,'time')}${field('Departure time','departure',r.departure,'time')}</div>
 <label class="field">Visit type<select data-field="visit">${['Annual Service','Routine Maintenance','Fault Visit','Takeover','Commissioning'].map(x=>`<option ${x===r.visit?'selected':''}>${x}</option>`).join('')}</select></label></div>`,
 `<div class="card"><h3>System details</h3><div class="two">${field('Panel make','panelMake',r.panelMake)}${field('Panel model','panelModel',r.panelModel)}</div><div class="two">${field('Panel serial number','panelSerial',r.panelSerial)}${field('Panel location','panelLocation',r.panelLocation)}</div>
 <div class="two"><label class="field">System grade<select data-field="grade">${['Grade 1','Grade 2','Grade 3','Not confirmed'].map(x=>`<option ${x===r.grade?'selected':''}>${x}</option>`).join('')}</select></label><label class="field">Signalling<select data-field="signalling">${['None','App / cloud','GSM','Digital communicator','ARC monitored','Other'].map(x=>`<option ${x===r.signalling?'selected':''}>${x}</option>`).join('')}</select></label></div>
 <div class="two">${field('Number of zones','zones',r.zones,'number')}${field('Keypads','keypads',r.keypads,'number')}</div><div class="two">${field('External sirens','sirens',r.sirens,'number')}${field('Expanders / PSUs','expanders',r.expanders,'number')}</div>
 <h3>Power and battery readings</h3>${check('Mains supply healthy','mains',r.mains)}<div class="two">${field('Panel battery voltage (V)','panelBattery',r.panelBattery,'number')}${field('Battery age / date','batteryAge',r.batteryAge)}</div><div class="two">${field('Auxiliary voltage (V)','auxVoltage',r.auxVoltage,'number')}${field('Siren battery voltage (V)','sirenBattery',r.sirenBattery,'number')}</div>${area('Power supply notes','psuNotes',r.psuNotes,3)}</div>`,
 `<div class="card"><h3>Functional test checklist</h3><div class="checkgrid">${check('Control panel','panel',r.checks.panel)}${check('Keypads','keypads',r.checks.keypads)}${check('Movement detectors','detectors',r.checks.detectors)}${check('Door/window contacts','contacts',r.checks.contacts)}${check('Panic buttons','panic',r.checks.panic)}${check('External siren','externalSiren',r.checks.externalSiren)}${check('Internal sounders','internalSiren',r.checks.internalSiren)}${check('Signalling / app','signalling',r.checks.signalling)}${check('Mains failure','mainsFail',r.checks.mainsFail)}${check('Battery failure','batteryFail',r.checks.batteryFail)}${check('Tamper circuits','tamper',r.checks.tamper)}${check('Walk test completed','walkTest',r.checks.walkTest)}${check('User code operation','userCode',r.checks.userCode)}${check('Event log checked','eventLog',r.checks.eventLog)}</div></div>`,
 `<div class="card"><div class="section" style="margin-top:0"><h3>Device-by-device testing</h3><button class="btn" data-add-device>＋ Add Device</button></div>
 ${r.devices.map((d,i)=>`<div class="device-row"><label class="field">Location<input data-device="${i}" data-dkey="location" value="${esc(d.location)}"></label><label class="field">Type<select data-device="${i}" data-dkey="type">${['PIR','Door Contact','Shock Sensor','Panic Button','Smoke Detector','Keypad','Siren','Other'].map(x=>`<option ${x===d.type?'selected':''}>${x}</option>`).join('')}</select></label><label class="field">Result<select data-device="${i}" data-dkey="result">${['Pass','Fail','Not tested'].map(x=>`<option ${x===d.result?'selected':''}>${x}</option>`).join('')}</select></label><label class="field">Battery / reading<input data-device="${i}" data-dkey="reading" value="${esc(d.reading)}"></label><button class="btn danger" data-remove-device="${i}">Remove</button></div>`).join('')||'<p class="muted">No individual devices added. Use Add Device where a detailed schedule is required.</p>'}</div>`,
 `<div class="card"><h3>Findings and completion</h3>${area('Faults and defects','faults',r.faults,5)}${area('Parts used / replaced','parts',r.parts,4)}${area('Recommendations','recommendations',r.recommendations,5)}${area('Engineer notes','notes',r.notes,4)}
 <label class="field">Overall result<select data-field="result">${['Satisfactory','Satisfactory with recommendations','Further action required','System left out of service'].map(x=>`<option ${x===r.result?'selected':''}>${x}</option>`).join('')}</select></label><div class="two">${field('Next service due','nextServiceDate',r.nextServiceDate,'date')}${field('Labour time (minutes)','labourMinutes',r.labourMinutes,'number')}</div></div>`,
 `<div class="card"><h3>Site photographs</h3><input id="photoInput" type="file" accept="image/*" capture="environment" multiple><div class="photo-grid">${r.photos.map((p,i)=>`<div class="photo"><img src="${p}"><button class="btn danger" data-remove-photo="${i}">Remove</button></div>`).join('')||'<p class="muted">No photographs added.</p>'}</div></div>
 <div class="card"><h3>Customer signature</h3>${field('Customer / responsible person','customerSignedBy',r.customerSignedBy)}<canvas class="signature" id="customerCanvas" width="900" height="260"></canvas><p class="muted">Signed: ${formatDateTime(r.customerSignedAt)}</p><button class="btn" data-clear-signature="customer">Clear customer signature</button></div>
 <div class="card"><h3>Engineer signature</h3><canvas class="signature" id="engineerCanvas" width="900" height="260"></canvas><p class="muted">Signed: ${formatDateTime(r.engineerSignedAt)}</p><button class="btn" data-clear-signature="engineer">Clear engineer signature</button></div>`
 ];
 return `<div class="section"><div><div class="eyebrow">Intruder Alarm Service</div><h2 style="margin:4px 0">${esc(r.number)}</h2></div><span class="badge">${esc(r.status)}</span></div><div class="notice">Draft is saved automatically every 15 seconds. Use the Previous and Next buttons to move through the report.</div><div class="card no-print"><h3>Engineer site controls</h3><div class="grid"><button class="btn" data-start-travel>🚐 Start Travel</button><button class="btn" data-finish-travel ${r.travelStartedTimestamp?'':'disabled'}>✓ Finish Travel</button><button class="btn primary" data-arrive>📍 Arrive on Site</button><button class="btn primary" data-leave>🏁 Leave Site</button></div><div class="two" style="margin-top:12px"><div class="stat-mini"><b>Travel time</b><span>${formatDuration(r.travelMinutes)}</span></div><div class="stat-mini"><b>Labour time</b><span>${formatDuration(r.labourMinutes||minutesBetween(r.arrivalTimestamp,r.departureTimestamp))}</span></div></div></div>
 <div class="progress">${names.map((n,i)=>`<button class="${i===step?'active':''}" data-step="${i}">${i+1}. ${n}</button>`).join('')}</div>${panes[step]}
 <div class="two no-print"><button class="btn" data-prev ${step===0?'disabled':''}>← Previous</button>${step<panes.length-1?'<button class="btn primary" data-next>Next →</button>':'<button class="btn primary" data-complete>Complete & Preview</button>'}</div><button class="btn full no-print" style="margin-top:10px" data-save-draft>Save Draft</button>`;
}
function line(l,v){return `<div class="report-line"><b>${l}</b><span>${esc(v||'—')}</span></div>`}
function preview(){
 const r=current, tests=Object.entries(r.checks);
 return `<article class="card report"><div class="report-head"><img src="logo.png"><div><h2>Cables Electrical Installations Limited</h2><p>01623 512500 · cables.electrical@gmail.com<br>www.cables-electrical.co.uk · NICEIC Domestic Installer</p></div></div><hr><h1>Intruder Alarm Service Report</h1><h3>${esc(r.number)}</h3>
 ${line('Customer',r.customer)}${line('Site address',r.address)}${line('Contact',r.contact)}${line('Service date',r.date)}${line('Visit type',r.visit)}${line('Engineer',r.engineer)}${line('Time on site',r.arrival+'–'+r.departure)}${line('Labour duration',formatDuration(r.labourMinutes))}${line('Travel duration',formatDuration(r.travelMinutes))}
 <h3>System details</h3>${line('Panel',`${r.panelMake} ${r.panelModel}`)}${line('Panel serial',r.panelSerial)}${line('Panel location',r.panelLocation)}${line('System grade',r.grade)}${line('Signalling',r.signalling)}
 <h3>Power and battery readings</h3>${line('Mains healthy',r.mains?'Yes':'No')}${line('Panel battery',r.panelBattery?`${r.panelBattery} V`:'')}${line('Battery age / date',r.batteryAge)}${line('Auxiliary voltage',r.auxVoltage?`${r.auxVoltage} V`:'')}${line('Siren battery',r.sirenBattery?`${r.sirenBattery} V`:'')}
 <h3>Functional tests</h3><div class="report-checks">${tests.map(([k,v])=>`<div>${v?'✓':'✕'} ${esc(({panel:'Control panel',keypads:'Keypads',detectors:'Movement detectors',contacts:'Contacts',panic:'Panic buttons',externalSiren:'External siren',internalSiren:'Internal sounders',signalling:'Signalling / app',mainsFail:'Mains failure',batteryFail:'Battery failure',tamper:'Tamper circuits',walkTest:'Walk test',userCode:'User code',eventLog:'Event log'}[k]||k))}</div>`).join('')}</div>
 ${r.devices.length?`<h3>Device test schedule</h3><table><thead><tr><th>Location</th><th>Type</th><th>Result</th><th>Reading</th></tr></thead><tbody>${r.devices.map(d=>`<tr><td>${esc(d.location)}</td><td>${esc(d.type)}</td><td>${esc(d.result)}</td><td>${esc(d.reading)}</td></tr>`).join('')}</tbody></table>`:''}
 <h3>Faults and defects</h3><p>${esc(r.faults||'None recorded').replace(/\n/g,'<br>')}</p><h3>Parts used / replaced</h3><p>${esc(r.parts||'None recorded').replace(/\n/g,'<br>')}</p><h3>Recommendations</h3><p>${esc(r.recommendations||'None recorded').replace(/\n/g,'<br>')}</p>
 <h3>Overall result</h3><div class="result">${esc(r.result)}</div>${line('Next service due',r.nextServiceDate)}${line('Report issued',formatDateTime(r.reportIssuedAt))}${r.photos.length?`<h3>Photographs</h3><div class="photo-grid">${r.photos.map(p=>`<div class="photo"><img src="${p}"></div>`).join('')}</div>`:''}
 <h3>Customer sign-off</h3><p>${esc(r.customerSignedBy||'Not recorded')} · ${esc(formatDateTime(r.customerSignedAt))}</p>${r.customerSignature?`<img class="signature-preview" src="${r.customerSignature}">`:''}<h3>Engineer sign-off</h3><p>${esc(r.engineer)} · ${esc(formatDateTime(r.engineerSignedAt))}</p>${r.engineerSignature?`<img class="signature-preview" src="${r.engineerSignature}">`:'<p>Not signed</p>'}
 <p class="muted" style="font-size:12px;margin-top:26px">This report records the condition and operation of the intruder alarm system at the time of the visit. Any quoted remedial work is separate from this service record.</p></article>
 <div class="grid no-print" style="margin-top:12px"><button class="btn" data-edit-current>Edit Report</button><button class="btn primary" data-print>Print / Save PDF</button><button class="btn" data-email>Email Customer</button><button class="btn" data-route="reports">Back to Reports</button></div>`;
}
function customerForm(c){
 const x=c||{id:uid('C'),name:'',address:'',contact:'',phone:'',email:'',systemSummary:'',accountReference:'',siteNotes:''};current=x;
 return `<div class="section"><h2>Customer</h2></div><form class="card" id="customerForm">${field('Customer / company','name',x.name)}${area('Address','address',x.address,3)}${field('Contact name','contact',x.contact)}<div class="two">${field('Telephone','phone',x.phone,'tel')}${field('Email','email',x.email,'email')}</div><div class="two">${field('Alarm panel / summary','systemSummary',x.systemSummary||'')}${field('Account / key reference','accountReference',x.accountReference||'')}</div>${area('Access, parking or site notes','siteNotes',x.siteNotes||'',4)}<button class="btn primary full">Save Customer</button></form>`;
}
function jobForm(j){
 const x=j||{id:uid('J'),customer:'',title:'Alarm annual service',date:today(),time:'09:00',status:'Booked',notes:''};current=x;
 return `<div class="section"><h2>Diary Appointment</h2></div><form class="card" id="jobForm">${field('Customer','customer',x.customer)}${field('Job description','title',x.title)}<label class="field">Job type<select data-field="jobType">${JOB_TYPES.map(s=>`<option ${s===(x.jobType||'General Call-out')?'selected':''}>${s}</option>`).join('')}</select></label><div class="two">${field('Date','date',x.date,'date')}${field('Time','time',x.time,'time')}</div><label class="field">Status<select data-field="status">${['Booked','Travelling','On site','Complete'].map(s=>`<option ${s===x.status?'selected':''}>${s}</option>`).join('')}</select></label>${area('Notes','notes',x.notes,4)}<div class="grid no-print"><button class="btn primary" type="submit">Save Appointment</button><button class="btn" type="button" data-start-workflow-from-open-job>${esc(jobActionLabel(x))}</button><button class="btn danger" type="button" data-delete-open-job>Delete Job</button></div></form>`;
}

function quotesView(){
 return `<div class="section"><h2>Quotations</h2><button class="btn primary" data-new-business-quote>＋ New Quote</button></div>${data.quotes.slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))).map(q=>`<div class="card"><div class="row"><div class="avatar">£</div><div class="grow"><b>${esc(q.reference||'Quotation')} · ${esc(q.title||'')}</b><div class="muted">${esc(q.customer||customerName(q.customerId))} · ${esc(q.date)} · ${money(q.amount)}</div></div><span class="badge ${q.status==='Accepted'?'good':q.status==='Declined'?'bad':''}">${esc(q.status||'Draft')}</span></div><div class="two" style="margin-top:11px"><button class="btn" data-open-quote="${q.id}">Open</button><button class="btn danger" data-delete-quote="${q.id}">Delete</button></div></div>`).join('')||'<div class="card empty">No quotations recorded.</div>'}`;
}
function invoicesView(){
 return `<div class="section"><h2>Invoices</h2><button class="btn primary" data-new-invoice>＋ New Invoice</button></div>${invoices().slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))).map(i=>`<div class="card"><div class="row"><div class="avatar">🧾</div><div class="grow"><b>${esc(i.number)} · ${esc(i.customer||customerName(i.customerId))}</b><div class="muted">${esc(i.date)} · Due ${esc(i.dueDate||'—')} · ${money(i.total)}</div></div><span class="badge ${i.status==='Paid'?'good':i.status==='Overdue'?'bad':''}">${esc(i.status)}</span></div><div class="grid" style="margin-top:11px"><button class="btn" data-open-invoice="${i.id}">Open</button><button class="btn primary" data-print-invoice="${i.id}">Print</button><button class="btn danger" data-delete-invoice="${i.id}">Delete</button></div></div>`).join('')||'<div class="card empty">No invoices recorded.</div>'}`;
}
function stockView(){
 const list=stockItems().slice().sort((a,b)=>String(a.name).localeCompare(String(b.name)));
 return `<div class="section"><h2>Stock & Van Stock</h2><button class="btn primary" data-new-stock>＋ Add Item</button></div><div class="card"><label class="field">Search stock<input id="stockSearch" placeholder="Item, SKU, supplier or location"></label></div>${list.map(s=>`<div class="card stock-card" data-stock-text="${esc((s.name+' '+s.sku+' '+s.location+' '+(supplierById(s.supplierId)?.name||'')).toLowerCase())}"><div class="row"><div class="avatar">📦</div><div class="grow"><b>${esc(s.name)}</b><div class="muted">SKU ${esc(s.sku||'—')} · ${esc(s.location||'Stores')}</div><div class="muted">Cost ${money(s.costPrice)} · Sell ${money(s.sellPrice)} · ${esc(supplierById(s.supplierId)?.name||'No supplier')}</div></div><span class="badge ${Number(s.quantity)<=Number(s.reorderLevel)?'bad':'good'}">${esc(s.quantity)} in stock</span></div><div class="grid" style="margin-top:11px"><button class="btn" data-edit-stock="${s.id}">Edit</button><button class="btn" data-adjust-stock="${s.id}" data-delta="1">+1</button><button class="btn" data-adjust-stock="${s.id}" data-delta="-1">−1</button><button class="btn danger" data-delete-stock="${s.id}">Delete</button></div></div>`).join('')||'<div class="card empty">No stock items recorded.</div>'}`;
}
function suppliersView(){
 return `<div class="section"><h2>Suppliers</h2><button class="btn primary" data-new-supplier>＋ Add Supplier</button></div>${suppliers().map(s=>`<div class="card"><div class="row"><div class="avatar">🏭</div><div class="grow"><b>${esc(s.name)}</b><div class="muted">${esc(s.contact||'')} · ${esc(s.phone||'')} · ${esc(s.email||'')}</div><div class="muted">${esc(s.accountNumber?'Account '+s.accountNumber:'')} ${s.discount?'· '+esc(s.discount):''}</div></div><button class="btn" data-edit-supplier="${s.id}">Open</button></div></div>`).join('')||'<div class="card empty">No suppliers recorded.</div>'}`;
}
function profitView(){
 const revenue=invoices().filter(i=>i.status==='Paid').reduce((s,i)=>s+Number(i.total||0),0);
 const materialCost=(data.jobMaterials||[]).reduce((s,m)=>s+Number(m.qty||0)*Number(m.costPrice||0),0);
 const gross=revenue-materialCost,margin=revenue?gross/revenue*100:0;
 return `<div class="section"><h2>Profit Dashboard</h2></div><div class="stats"><div class="card stat"><strong>${money(revenue)}</strong><span>Paid revenue</span></div><div class="card stat"><strong>${money(materialCost)}</strong><span>Material cost</span></div><div class="card stat"><strong>${money(gross)}</strong><span>Estimated gross profit</span></div><div class="card stat"><strong>${margin.toFixed(1)}%</strong><span>Gross margin</span></div></div><div class="card"><h3>Job profitability</h3>${data.jobs.map(j=>{const mats=jobMaterials(j.id).reduce((s,m)=>s+Number(m.qty||0)*Number(m.costPrice||0),0),linked=invoices().filter(i=>i.linkedJobId===j.id).reduce((s,i)=>s+Number(i.total||0),0);return `<div class="report-line"><b>${esc(j.customer)} · ${esc(j.title)}</b><span>Revenue ${money(linked)} · Materials ${money(mats)} · Gross ${money(linked-mats)}</span></div>`}).join('')||'<div class="empty">No jobs available.</div>'}</div>`;
}
function stockForm(){
 const x=current;return `<div class="section"><h2>Stock Item</h2></div><form class="card" id="stockForm">${field('Item name','name',x.name)}<div class="two">${field('SKU / part number','sku',x.sku)}${field('Location','location',x.location)}</div><div class="two">${field('Quantity','quantity',x.quantity,'number')}${field('Reorder level','reorderLevel',x.reorderLevel,'number')}</div><div class="two">${field('Cost price (£)','costPrice',x.costPrice,'number')}${field('Selling price (£)','sellPrice',x.sellPrice,'number')}</div><label class="field">Supplier<select data-field="supplierId"><option value="">No supplier</option>${suppliers().map(s=>`<option value="${s.id}" ${s.id===x.supplierId?'selected':''}>${esc(s.name)}</option>`).join('')}</select></label>${area('Notes','notes',x.notes,4)}<button class="btn primary full">Save Stock Item</button></form>`;
}
function supplierForm(){
 const x=current;return `<div class="section"><h2>Supplier</h2></div><form class="card" id="supplierForm">${field('Supplier name','name',x.name)}${field('Contact name','contact',x.contact)}<div class="two">${field('Telephone','phone',x.phone,'tel')}${field('Email','email',x.email,'email')}</div><div class="two">${field('Account number','accountNumber',x.accountNumber)}${field('Discount / pricing note','discount',x.discount)}</div>${area('Address','address',x.address,3)}${area('Notes','notes',x.notes,4)}<button class="btn primary full">Save Supplier</button></form>`;
}
function invoiceForm(){
 const x=current,totals=invoiceTotal(x.lines,x.labour,x.vatRate);
 return `<div class="section"><h2>Invoice</h2><span class="badge">${esc(x.number)}</span></div><form class="card" id="invoiceForm"><label class="field">Customer<select data-field="customerId"><option value="">Choose customer</option>${data.customers.map(c=>`<option value="${c.id}" ${c.id===x.customerId?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label><div class="two">${field('Invoice date','date',x.date,'date')}${field('Due date','dueDate',x.dueDate,'date')}</div>${field('Description','description',x.description)}<div class="section"><h3>Invoice lines</h3><button type="button" class="btn" data-add-invoice-line>＋ Add Line</button></div>${(x.lines||[]).map((l,i)=>`<div class="invoice-line"><label class="field">Description<input data-invoice-line="${i}" data-line-key="description" value="${esc(l.description)}"></label><label class="field">Qty<input type="number" data-invoice-line="${i}" data-line-key="qty" value="${esc(l.qty)}"></label><label class="field">Unit price (£)<input type="number" step="0.01" data-invoice-line="${i}" data-line-key="unitPrice" value="${esc(l.unitPrice)}"></label><button type="button" class="btn danger" data-remove-invoice-line="${i}">Remove</button></div>`).join('')}<div class="two">${field('Labour (£)','labour',x.labour,'number')}${field('VAT rate (%)','vatRate',x.vatRate,'number')}</div><label class="field">Status<select data-field="status">${['Draft','Sent','Paid','Overdue','Cancelled'].map(s=>`<option ${s===x.status?'selected':''}>${s}</option>`).join('')}</select></label><div class="invoice-total"><span>Subtotal ${money(totals.subtotal)}</span><span>VAT ${money(totals.vat)}</span><strong>Total ${money(totals.total)}</strong></div><button class="btn primary full">Save Invoice</button></form>`;
}
function invoicePreview(){
 const x=current,totals=invoiceTotal(x.lines,x.labour,x.vatRate),c=customerById(x.customerId);
 return `<article class="card report"><div class="report-head"><img src="logo.png"><div><h2>Cables Electrical Installations Limited</h2><p>01623 512500 · cables.electrical@gmail.com<br>www.cables-electrical.co.uk</p></div></div><hr><div class="row"><div class="grow"><h1>Invoice</h1><h3>${esc(x.number)}</h3></div><div><b>Date</b><br>${esc(x.date)}<br><b>Due</b><br>${esc(x.dueDate)}</div></div><h3>Bill to</h3><p>${esc(c?.name||x.customer||'')}<br>${esc(c?.address||'').replace(/\n/g,'<br>')}</p><table><thead><tr><th>Description</th><th>Qty</th><th>Unit</th><th>Total</th></tr></thead><tbody>${(x.lines||[]).map(l=>`<tr><td>${esc(l.description)}</td><td>${esc(l.qty)}</td><td>${money(l.unitPrice)}</td><td>${money(Number(l.qty||0)*Number(l.unitPrice||0))}</td></tr>`).join('')}${Number(x.labour||0)?`<tr><td>Labour</td><td>1</td><td>${money(x.labour)}</td><td>${money(x.labour)}</td></tr>`:''}</tbody></table><div class="invoice-summary">${line('Subtotal',money(totals.subtotal))}${line(`VAT (${x.vatRate||0}%)`,money(totals.vat))}${line('Total due',money(totals.total))}</div><p class="muted">Payment status: ${esc(x.status)}</p></article><div class="two no-print"><button class="btn" data-edit-invoice>Edit</button><button class="btn primary" data-print>Print / Save PDF</button></div>`;
}


function electricalHome(){
 const certs=electricalCertificates();
 const drafts=certs.filter(c=>c.status==='Draft').length;
 const unsat=certs.filter(c=>c.result==='Unsatisfactory').length;
 return `<div class="section"><h2>Electrical Certification</h2></div>
 <div class="stats">
  <div class="card stat"><strong>${certs.length}</strong><span>Total certificates</span></div>
  <div class="card stat"><strong>${drafts}</strong><span>Drafts</span></div>
  <div class="card stat"><strong>${unsat}</strong><span>Unsatisfactory</span></div>
  <div class="card stat"><strong>${data.customers.length}</strong><span>Customers</span></div>
 </div>
 <div class="grid">
  <button class="module" data-new-cert="EICR"><div class="ico">📋</div><b>New EICR</b><span>Condition report, observations, coding and circuit results.</span></button>
  <button class="module" data-new-cert="MWC"><div class="ico">🛠️</div><b>Minor Works</b><span>Additions or alterations to an existing circuit.</span></button>
  <button class="module" data-new-cert="EIC"><div class="ico">⚡</div><b>Installation Certificate</b><span>New installations and major alterations.</span></button>
  <button class="module" data-new-cert="EV"><div class="ico">🔌</div><b>EV Charger Record</b><span>Charge point details, protection and test results.</span></button>
  <button class="module" data-route="electrical-list"><div class="ico">🗂️</div><b>Certificate Register</b><span>Open, print and manage all electrical certificates.</span></button>
 </div>`;
}
function electricalList(){
 return `<div class="section"><h2>Electrical Certificates</h2><button class="btn primary" data-route="electrical">＋ New Certificate</button></div>
 ${electricalCertificates().slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))).map(c=>`
 <div class="card">
  <div class="row">
   <div class="avatar">⚡</div>
   <div class="grow"><b>${esc(c.number)} · ${esc(certTitle(c.type))}</b><div class="muted">${esc(certificateCustomerName(c))} · ${esc(c.date)} · ${esc(c.result)}</div></div>
   <span class="badge ${c.result==='Satisfactory'?'good':'bad'}">${esc(c.status)}</span>
  </div>
  <div class="grid" style="margin-top:11px">
   <button class="btn" data-open-cert="${c.id}">Open</button>
   <button class="btn primary" data-print-cert="${c.id}">Print</button>
   <button class="btn danger" data-delete-cert="${c.id}">Delete</button>
  </div>
 </div>`).join('')||'<div class="card empty">No electrical certificates recorded.</div>'}`;
}
function electricalForm(){
 const x=current;
 return `<div class="section"><div><div class="eyebrow">Electrical Certification</div><h2 style="margin:4px 0">${esc(certTitle(x.type))}</h2></div><span class="badge">${esc(x.number)}</span></div>
 <form class="card" id="electricalForm">
  <label class="field">Customer<select data-field="customerId"><option value="">Choose customer</option>${data.customers.map(c=>`<option value="${c.id}" ${c.id===x.customerId?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label>
  <div class="two">${field('Certificate date','date',x.date,'date')}${field('Engineer','engineer',x.engineer)}</div>
  ${area('Installation address','address',x.address,3)}
  <div class="two">${field('Occupier / client','occupier',x.occupier)}${field('Installation type','installationType',x.installationType)}</div>
  <div class="two">${field('Supply type','supplyType',x.supplyType)}${field('Phases','phases',x.phases)}</div>
  ${area(x.type==='EICR'?'Extent and limitations':'Description of work','workDescription',x.workDescription,4)}
  ${area('Consumer unit / protective device details','boardDetails',x.boardDetails,4)}
  <div class="section"><h3>Test results</h3></div>
  <div class="grid cert-tests">${field('Ze (Ω)','ze',x.ze,'number')}${field('PFC (kA)','pfc',x.pfc,'number')}${field('Zs (Ω)','zs',x.zs,'number')}${field('R1+R2 (Ω)','r1r2',x.r1r2,'number')}${field('IR (MΩ)','ir',x.ir,'number')}${field('RCD time (ms)','rcdTime',x.rcdTime,'number')}</div>
  ${x.type==='EV'?`<div class="section"><h3>EV charger details</h3></div>
  <div class="two">${field('Charger make','ev.chargerMake',x.evDetails.chargerMake)}${field('Charger model','ev.chargerModel',x.evDetails.chargerModel)}</div>
  <div class="two">${field('Serial number','ev.serial',x.evDetails.serial)}${field('Rating (A)','ev.rating',x.evDetails.rating,'number')}</div>
  <div class="two">${field('RCD type','ev.rcdType',x.evDetails.rcdType)}${field('PEN protection','ev.penProtection',x.evDetails.penProtection)}</div>
  ${field('Earthing arrangement','ev.earthArrangement',x.evDetails.earthArrangement)}
  ${area('EV test result / notes','ev.testResult',x.evDetails.testResult,3)}`:''}
  <div class="section"><h3>Circuit schedule</h3><button type="button" class="btn" data-add-circuit>＋ Add Circuit</button></div>
  ${(x.circuits||[]).map((c,i)=>`<div class="cert-row">
   <label class="field">Circuit<input data-circuit="${i}" data-ckey="name" value="${esc(c.name||'')}"></label>
   <label class="field">Device<input data-circuit="${i}" data-ckey="device" value="${esc(c.device||'')}"></label>
   <label class="field">Rating<input data-circuit="${i}" data-ckey="rating" value="${esc(c.rating||'')}"></label>
   <label class="field">Zs<input data-circuit="${i}" data-ckey="zs" value="${esc(c.zs||'')}"></label>
   <label class="field">IR<input data-circuit="${i}" data-ckey="ir" value="${esc(c.ir||'')}"></label>
   <button type="button" class="btn danger" data-remove-circuit="${i}">Remove</button>
  </div>`).join('')}
  <div class="section"><h3>Observations and coding</h3><button type="button" class="btn" data-add-observation>＋ Add Observation</button></div>
  ${(x.observations||[]).map((o,i)=>`<div class="observation-row">
   <label class="field">Code<select data-observation="${i}" data-okey="code">${['C1','C2','C3','FI','N/A'].map(code=>`<option ${code===o.code?'selected':''}>${code}</option>`).join('')}</select></label>
   <label class="field grow">Observation<input data-observation="${i}" data-okey="text" value="${esc(o.text||'')}"></label>
   <button type="button" class="btn danger" data-remove-observation="${i}">Remove</button>
  </div>`).join('')}
  <label class="field">Overall result<select data-field="result">${['Satisfactory','Unsatisfactory'].map(s=>`<option ${s===x.result?'selected':''}>${s}</option>`).join('')}</select></label>
  ${field('Recommended next inspection date','recommendationDate',x.recommendationDate,'date')}
  ${area('Declaration','declaration',x.declaration,4)}
  <button class="btn primary full">Save Certificate</button>
 </form>`;
}
function electricalPreview(){
 const x=current,c=customerById(x.customerId);
 return `<article class="card report electrical-report">
  <div class="report-head"><img src="logo.png"><div><h2>Cables Electrical Installations Limited</h2><p>NICEIC Domestic Installer<br>01623 512500 · cables.electrical@gmail.com<br>www.cables-electrical.co.uk</p></div></div>
  <hr>
  <div class="row"><div class="grow"><h1>${esc(certTitle(x.type))}</h1><h3>${esc(x.number)}</h3></div><div><b>Date</b><br>${esc(x.date)}<br><b>Status</b><br>${esc(x.status)}</div></div>
  <h3>Client and installation</h3>
  ${line('Customer',esc(c?.name||x.customer||''))}
  ${line('Address',esc(x.address||c?.address||''))}
  ${line('Engineer',esc(x.engineer))}
  ${line('Supply',esc(x.supplyType+' · '+x.phases))}
  <h3>Work / extent</h3><p>${esc(x.workDescription||'').replace(/\n/g,'<br>')}</p>
  <h3>Test results</h3>
  <table><thead><tr><th>Ze</th><th>PFC</th><th>Zs</th><th>R1+R2</th><th>IR</th><th>RCD</th></tr></thead><tbody><tr><td>${esc(x.ze)}</td><td>${esc(x.pfc)}</td><td>${esc(x.zs)}</td><td>${esc(x.r1r2)}</td><td>${esc(x.ir)}</td><td>${esc(x.rcdTime)}</td></tr></tbody></table>
  ${x.type==='EV'?`<h3>EV charger</h3>${line('Make / model',esc(x.evDetails.chargerMake+' '+x.evDetails.chargerModel))}${line('Serial',esc(x.evDetails.serial))}${line('Rating',esc(x.evDetails.rating+' A'))}${line('Protection',esc(x.evDetails.rcdType+' · '+x.evDetails.penProtection))}`:''}
  <h3>Circuit schedule</h3>
  <table><thead><tr><th>Circuit</th><th>Device</th><th>Rating</th><th>Zs</th><th>IR</th></tr></thead><tbody>${(x.circuits||[]).map(r=>`<tr><td>${esc(r.name)}</td><td>${esc(r.device)}</td><td>${esc(r.rating)}</td><td>${esc(r.zs)}</td><td>${esc(r.ir)}</td></tr>`).join('')||'<tr><td colspan="5">No circuit results recorded.</td></tr>'}</tbody></table>
  <h3>Observations</h3>
  ${(x.observations||[]).map(o=>`<div class="report-line"><b><span class="badge ${codeClass(o.code)}">${esc(o.code)}</span> ${esc(o.text)}</b></div>`).join('')||'<p>No observations recorded.</p>'}
  <h3>Overall assessment</h3><div class="result">${esc(x.result)}</div>
  ${line('Recommended next inspection',esc(x.recommendationDate||'Not specified'))}
  <h3>Declaration</h3><p>${esc(x.declaration)}</p>
  <p class="muted">Issued ${esc(formatDateTime(x.issuedAt))}</p>
 </article>
 <div class="grid no-print"><button class="btn" data-edit-cert>Edit</button><button class="btn primary" data-print>Print / Save PDF</button><button class="btn" data-route="electrical-list">Certificate Register</button></div>`;
}

function more(){
 return `<div class="section"><h2>Business Management</h2></div>
 <div class="stats"><div class="card stat"><strong>${money(quoteValue())}</strong><span>Total quoted</span></div><div class="card stat"><strong>${money(outstandingInvoices())}</strong><span>Outstanding</span></div><div class="card stat"><strong>${money(paidInvoices())}</strong><span>Paid invoices</span></div><div class="card stat"><strong>${money(stockValue())}</strong><span>Stock value</span></div></div>
 <div class="grid"><button class="module" data-route="quotes"><div class="ico">£</div><b>Quotations</b><span>Create, edit and track customer quotations.</span></button><button class="module" data-route="invoices"><div class="ico">🧾</div><b>Invoices</b><span>Issue invoices and track payment status.</span></button><button class="module" data-route="stock"><div class="ico">📦</div><b>Stock & Van Stock</b><span>Quantities, prices and low-stock alerts.</span></button><button class="module" data-route="suppliers"><div class="ico">🏭</div><b>Suppliers</b><span>Supplier contacts and pricing notes.</span></button><button class="module" data-route="profit"><div class="ico">📈</div><b>Profit Dashboard</b><span>Revenue, material costs and gross profit.</span></button><button class="module" data-backup><div class="ico">💾</div><b>Full Backup</b><span>Download all business and engineer records.</span></button></div>`;
}

function startReportFromJob(job){
 if(!job)return;
 const c=data.customers.find(x=>x.name.trim().toLowerCase()===String(job.customer||'').trim().toLowerCase());
 current=blankReport();
 current.linkedJobId=job.id;
 current.customer=job.customer||'';
 current.date=job.date||today();
 current.arrival=job.time||'09:00';
 current.notes=job.notes||'';
 if(c){
   current.customerId=c.id;
   current.address=c.address||'';
   current.contact=c.contact||'';
   current.phone=c.phone||'';
   current.email=c.email||'';
 }
 route='alarm-form';
 step=0;
 render();
}
function deleteJobById(id){
 const j=data.jobs.find(x=>x.id===id);
 if(!j)return;
 if(confirm(`Delete job for ${j.customer||'this customer'} on ${j.date||'the selected date'}?\n\nThis action cannot be undone.`)){
   data.jobs=data.jobs.filter(x=>x.id!==id);
   save(KEY_DATA,data);
   toast('Job deleted');
   route='jobs';
   current=null;
   render();
 }
}

function sync(){
 if(!current)return;
 document.querySelectorAll('[data-field]').forEach(el=>current[el.dataset.field]=el.value);
 document.querySelectorAll('[data-check]').forEach(el=>current.checks[el.dataset.check]=el.checked);
 document.querySelectorAll('[data-device]').forEach(el=>{const i=+el.dataset.device;if(current.devices&&current.devices[i])current.devices[i][el.dataset.dkey]=el.value});
 document.querySelectorAll('[data-invoice-line]').forEach(el=>{const i=+el.dataset.invoiceLine;if(current.lines&&current.lines[i])current.lines[i][el.dataset.lineKey]=el.value});
 document.querySelectorAll('[data-circuit]').forEach(el=>{const i=+el.dataset.circuit;if(current.circuits&&current.circuits[i])current.circuits[i][el.dataset.ckey]=el.value});
 document.querySelectorAll('[data-observation]').forEach(el=>{const i=+el.dataset.observation;if(current.observations&&current.observations[i])current.observations[i][el.dataset.okey]=el.value});
 document.querySelectorAll('[data-field^="ev."]').forEach(el=>{const k=el.dataset.field.split('.')[1];current.evDetails=current.evDetails||{};current.evDetails[k]=el.value});

}
function persist(status){
 sync();if(!current?.number)return;current.status=status||current.status;current.updated=new Date().toISOString();const i=reports.findIndex(r=>r.id===current.id);if(i>=0)reports[i]=current;else reports.unshift(current);save(KEY_REPORTS,reports);
}
function canvasSetup(id,key){
 const c=document.getElementById(id);if(!c)return;const ctx=c.getContext('2d');ctx.lineWidth=3;ctx.lineCap='round';ctx.strokeStyle='#fff';let on=false,last=null;
 const p=e=>{const r=c.getBoundingClientRect(),t=e.touches?e.touches[0]:e;return{x:(t.clientX-r.left)*c.width/r.width,y:(t.clientY-r.top)*c.height/r.height}};
 const start=e=>{on=true;last=p(e);e.preventDefault()},move=e=>{if(!on)return;const q=p(e);ctx.beginPath();ctx.moveTo(last.x,last.y);ctx.lineTo(q.x,q.y);ctx.stroke();last=q;e.preventDefault()},end=()=>{if(on){on=false;current[key]=c.toDataURL();if(key==='customerSignature')current.customerSignedAt=isoNow();if(key==='engineerSignature')current.engineerSignedAt=isoNow();persist('Draft')}};
 c.onmousedown=start;c.onmousemove=move;window.addEventListener('mouseup',end);c.ontouchstart=start;c.ontouchmove=move;c.ontouchend=end;
 if(current[key]){const img=new Image();img.onload=()=>ctx.drawImage(img,0,0,c.width,c.height);img.src=current[key]}
}
function photos(files){[...files].slice(0,8).forEach(f=>{if(!f.type.startsWith('image/'))return;const rd=new FileReader();rd.onload=()=>{current.photos.push(rd.result);render()};rd.readAsDataURL(f)})}
function render(){
 stopAuto();let body=route==='home'?home():route==='jobs'?diary():route==='customers'?customers():route==='customer-profile'?customerProfile():route==='reports'?reportList():route==='electrical'?electricalHome():route==='electrical-list'?electricalList():route==='electrical-form'?electricalForm():route==='electrical-preview'?electricalPreview():route==='quotes'?quotesView():route==='invoices'?invoicesView():route==='stock'?stockView():route==='suppliers'?suppliersView():route==='profit'?profitView():route==='invoice-form'?invoiceForm():route==='invoice-preview'?invoicePreview():route==='stock-form'?stockForm():route==='supplier-form'?supplierForm():route==='alarm-form'?reportForm():route==='preview'?preview():route==='customer-form'?customerForm(current):route==='job-form'?jobForm(current):route==='equipment-form'?equipmentForm():route==='battery-form'?batteryForm():route==='note-form'?noteForm():route==='quote-form'?quoteForm():route==='customer-photo-form'?customerPhotoForm():more();
 app.innerHTML=shell(body);bind();if(route==='alarm-form'){startAuto();if(step===5){setTimeout(()=>{canvasSetup('customerCanvas','customerSignature');canvasSetup('engineerCanvas','engineerSignature')},0)}}
}
function startAuto(){autosave=setInterval(()=>{persist('Draft')},15000)}function stopAuto(){if(autosave){clearInterval(autosave);autosave=null}}
function bind(){
 document.querySelectorAll('[data-route]').forEach(b=>b.onclick=()=>{route=b.dataset.route;step=0;render()});
 document.querySelectorAll('[data-new-report]').forEach(b=>b.onclick=()=>{current=blankReport();step=0;route='alarm-form';render()});
 document.querySelectorAll('[data-open-report]').forEach(b=>b.onclick=()=>{current=reports.find(r=>r.id===b.dataset.openReport);route=current.status==='Complete'?'preview':'alarm-form';step=0;render()});
 document.querySelectorAll('[data-delete-report]').forEach(b=>b.onclick=()=>{if(confirm('Delete this report?')){reports=reports.filter(r=>r.id!==b.dataset.deleteReport);save(KEY_REPORTS,reports);render()}});
 document.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>{sync();step=+b.dataset.step;render()});
 document.querySelectorAll('[data-next]').forEach(b=>b.onclick=()=>{sync();persist('Draft');step=Math.min(5,step+1);render()});
 document.querySelectorAll('[data-prev]').forEach(b=>b.onclick=()=>{sync();step=Math.max(0,step-1);render()});
 document.querySelectorAll('[data-save-draft]').forEach(b=>b.onclick=()=>{persist('Draft');toast('Draft saved')});
 document.querySelectorAll('[data-start-travel]').forEach(b=>b.onclick=startTravelNow);
 document.querySelectorAll('[data-finish-travel]').forEach(b=>b.onclick=finishTravelNow);
 document.querySelectorAll('[data-arrive]').forEach(b=>b.onclick=setArrivalNow);
 document.querySelectorAll('[data-leave]').forEach(b=>b.onclick=setDepartureNow);
 document.querySelectorAll('[data-complete]').forEach(b=>b.onclick=()=>{sync();if(!current.customer.trim()){toast('Enter the customer name first');return}if(current.arrivalTimestamp&&current.departureTimestamp)current.labourMinutes=minutesBetween(current.arrivalTimestamp,current.departureTimestamp);if(!current.nextServiceDate)current.nextServiceDate=addOneYear(current.date);current.reportIssuedAt=isoNow();persist('Complete');if(current.linkedJobId){const j=data.jobs.find(x=>x.id===current.linkedJobId);if(j){j.status='Complete';save(KEY_DATA,data)}}route='preview';render()});
 document.querySelectorAll('[data-edit-current]').forEach(b=>b.onclick=()=>{current.status='Draft';persist('Draft');step=0;route='alarm-form';render()});
 document.querySelectorAll('[data-print]').forEach(b=>b.onclick=()=>window.print());
 document.querySelectorAll('[data-email]').forEach(b=>b.onclick=()=>{const subject=`Intruder Alarm Service Report ${current.number}`;const body=`Dear ${current.contact||current.customer},\n\nYour intruder alarm service report ${current.number} has been completed.\n\nResult: ${current.result}\n\nPlease contact us if you would like to discuss any recommendations.\n\nKind regards,\nCables Electrical Installations Limited\n01623 512500`;location.href=`mailto:${encodeURIComponent(current.email||'')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`});
 document.querySelectorAll('[data-add-device]').forEach(b=>b.onclick=()=>{sync();current.devices.push({location:'',type:'PIR',result:'Pass',reading:''});render()});
 document.querySelectorAll('[data-remove-device]').forEach(b=>b.onclick=()=>{sync();current.devices.splice(+b.dataset.removeDevice,1);render()});
 document.querySelectorAll('[data-remove-photo]').forEach(b=>b.onclick=()=>{current.photos.splice(+b.dataset.removePhoto,1);render()});
 document.querySelectorAll('[data-clear-signature]').forEach(b=>b.onclick=()=>{const customer=b.dataset.clearSignature==='customer';current[customer?'customerSignature':'engineerSignature']='';current[customer?'customerSignedAt':'engineerSignedAt']='';render()});
 const photo=document.getElementById('photoInput');if(photo)photo.onchange=e=>photos(e.target.files||[]);
 const saved=document.getElementById('savedCustomer');if(saved)saved.onchange=()=>{const c=data.customers.find(x=>x.id===saved.value);if(c){current.customerId=c.id;current.customer=c.name;current.address=c.address;current.contact=c.contact;current.phone=c.phone;current.email=c.email;render()}};
 const rs=document.getElementById('reportSearch');if(rs)rs.oninput=()=>{search=rs.value;render();const n=document.getElementById('reportSearch');n.focus();n.setSelectionRange(n.value.length,n.value.length)};
 document.querySelectorAll('[data-open-customer]').forEach(b=>b.onclick=()=>{current=customerById(b.dataset.openCustomer);route='customer-profile';render()});
 document.querySelectorAll('[data-add-equipment]').forEach(b=>b.onclick=()=>{current={id:uid('EQ'),customerId:b.dataset.addEquipment,type:'Alarm panel',make:'',model:'',serial:'',location:'',installedDate:today(),notes:''};route='equipment-form';render()});
 document.querySelectorAll('[data-add-battery]').forEach(b=>b.onclick=()=>{current={id:uid('BAT'),customerId:b.dataset.addBattery,item:'Panel battery',make:'',model:'',date:today(),voltage:'',notes:''};route='battery-form';render()});
 document.querySelectorAll('[data-add-note]').forEach(b=>b.onclick=()=>{current={id:uid('NOTE'),customerId:b.dataset.addNote,engineer:'Lee Naylor',text:'',created:isoNow()};route='note-form';render()});
 document.querySelectorAll('[data-add-quote]').forEach(b=>b.onclick=()=>{current=newQuote(b.dataset.addQuote);route='quote-form';render()});
 document.querySelectorAll('[data-open-quote]').forEach(b=>b.onclick=()=>{current=data.quotes.find(q=>q.id===b.dataset.openQuote);route='quote-form';render()});
 document.querySelectorAll('[data-add-customer-photo]').forEach(b=>b.onclick=()=>{current={id:uid('CPH'),customerId:b.dataset.addCustomerPhoto,caption:'',data:'',created:isoNow()};route='customer-photo-form';render()});
 document.querySelectorAll('[data-delete-equipment]').forEach(b=>b.onclick=()=>{if(confirm('Delete this equipment record?')){data.equipment=data.equipment.filter(x=>x.id!==b.dataset.deleteEquipment);save(KEY_DATA,data);render()}});
 document.querySelectorAll('[data-delete-battery]').forEach(b=>b.onclick=()=>{if(confirm('Delete this battery record?')){data.batteryRecords=data.batteryRecords.filter(x=>x.id!==b.dataset.deleteBattery);save(KEY_DATA,data);render()}});
 document.querySelectorAll('[data-delete-note]').forEach(b=>b.onclick=()=>{if(confirm('Delete this note?')){data.customerNotes=data.customerNotes.filter(x=>x.id!==b.dataset.deleteNote);save(KEY_DATA,data);render()}});
 document.querySelectorAll('[data-delete-customer-photo]').forEach(b=>b.onclick=()=>{if(confirm('Delete this site photograph?')){data.customerPhotos=data.customerPhotos.filter(x=>x.id!==b.dataset.deleteCustomerPhoto);save(KEY_DATA,data);render()}});
 const customerSearch=document.getElementById('customerSearch');if(customerSearch)customerSearch.oninput=()=>{const q=customerSearch.value.toLowerCase();document.querySelectorAll('.customer-card').forEach(el=>el.style.display=el.dataset.customerText.includes(q)?'block':'none')};
 document.querySelectorAll('[data-new-customer]').forEach(b=>b.onclick=()=>{current=null;route='customer-form';render()});
 document.querySelectorAll('[data-edit-customer]').forEach(b=>b.onclick=()=>{current=data.customers.find(c=>c.id===b.dataset.editCustomer);route='customer-form';render()});
 document.querySelectorAll('[data-report-customer]').forEach(b=>b.onclick=()=>{const c=data.customers.find(x=>x.id===b.dataset.reportCustomer);current=blankReport();Object.assign(current,{customerId:c.id,customer:c.name,address:c.address,contact:c.contact,phone:c.phone,email:c.email});route='alarm-form';step=0;render()});
 document.querySelectorAll('[data-new-job]').forEach(b=>b.onclick=()=>{current=null;route='job-form';render()});
 document.querySelectorAll('[data-edit-job]').forEach(b=>b.onclick=()=>{current=data.jobs.find(j=>j.id===b.dataset.editJob);route='job-form';render()});
 document.querySelectorAll('[data-delete-job]').forEach(b=>b.onclick=()=>deleteJobById(b.dataset.deleteJob));
 document.querySelectorAll('[data-job-workflow]').forEach(b=>b.onclick=()=>startWorkflowFromJob(data.jobs.find(j=>j.id===b.dataset.jobWorkflow)));
 document.querySelectorAll('[data-delete-open-job]').forEach(b=>b.onclick=()=>{if(current?.id)deleteJobById(current.id)});
 document.querySelectorAll('[data-start-workflow-from-open-job]').forEach(b=>b.onclick=()=>{
   document.querySelectorAll('[data-field]').forEach(el=>current[el.dataset.field]=el.value);
   const i=data.jobs.findIndex(j=>j.id===current.id);
   if(i>=0)data.jobs[i]=current;else data.jobs.push(current);
   save(KEY_DATA,data);
   startWorkflowFromJob(current);
 });



 const elf=document.getElementById('electricalForm');if(elf)elf.onsubmit=e=>{e.preventDefault();sync();const c=customerById(current.customerId);current.customer=c?.name||current.customer||'';current.address=current.address||c?.address||'';current.status='Complete';current.issuedAt=isoNow();const i=data.electricalCertificates.findIndex(x=>x.id===current.id);if(i>=0)data.electricalCertificates[i]=current;else data.electricalCertificates.push(current);if(current.linkedJobId){const j=data.jobs.find(x=>x.id===current.linkedJobId);if(j)j.status='Complete'}save(KEY_DATA,data);toast('Electrical certificate saved');route='electrical-preview';render()};

 const sf=document.getElementById('stockForm');if(sf)sf.onsubmit=e=>{e.preventDefault();document.querySelectorAll('[data-field]').forEach(el=>current[el.dataset.field]=el.value);current.quantity=Number(current.quantity||0);current.reorderLevel=Number(current.reorderLevel||0);current.costPrice=Number(current.costPrice||0);current.sellPrice=Number(current.sellPrice||0);const i=data.stock.findIndex(x=>x.id===current.id);if(i>=0)data.stock[i]=current;else data.stock.push(current);save(KEY_DATA,data);toast('Stock item saved');route='stock';render()};
 const supf=document.getElementById('supplierForm');if(supf)supf.onsubmit=e=>{e.preventDefault();document.querySelectorAll('[data-field]').forEach(el=>current[el.dataset.field]=el.value);const i=data.suppliers.findIndex(x=>x.id===current.id);if(i>=0)data.suppliers[i]=current;else data.suppliers.push(current);save(KEY_DATA,data);toast('Supplier saved');route='suppliers';render()};
 const invf=document.getElementById('invoiceForm');if(invf)invf.onsubmit=e=>{e.preventDefault();sync();const c=customerById(current.customerId);current.customer=c?.name||current.customer||'';current.labour=Number(current.labour||0);current.vatRate=Number(current.vatRate||0);current.lines=(current.lines||[]).map(l=>({description:l.description,qty:Number(l.qty||0),unitPrice:Number(l.unitPrice||0)}));Object.assign(current,invoiceTotal(current.lines,current.labour,current.vatRate));const i=data.invoices.findIndex(x=>x.id===current.id);if(i>=0)data.invoices[i]=current;else data.invoices.push(current);save(KEY_DATA,data);toast('Invoice saved');route='invoice-preview';render()};

 const cf=document.getElementById('customerForm');if(cf)cf.onsubmit=e=>{e.preventDefault();document.querySelectorAll('[data-field]').forEach(el=>current[el.dataset.field]=el.value);const i=data.customers.findIndex(c=>c.id===current.id);if(i>=0)data.customers[i]=current;else data.customers.push(current);save(KEY_DATA,data);toast('Customer saved');route='customers';render()};
 const jf=document.getElementById('jobForm');if(jf)jf.onsubmit=e=>{e.preventDefault();document.querySelectorAll('[data-field]').forEach(el=>current[el.dataset.field]=el.value);const i=data.jobs.findIndex(j=>j.id===current.id);if(i>=0)data.jobs[i]=current;else data.jobs.push(current);save(KEY_DATA,data);toast('Appointment saved');route='jobs';render()};
 const ef=document.getElementById('equipmentForm');if(ef)ef.onsubmit=e=>{e.preventDefault();document.querySelectorAll('[data-field]').forEach(el=>current[el.dataset.field]=el.value);const i=data.equipment.findIndex(x=>x.id===current.id);if(i>=0)data.equipment[i]=current;else data.equipment.push(current);save(KEY_DATA,data);const cid=current.customerId;toast('Equipment saved');current=customerById(cid);route='customer-profile';render()};
 const bf=document.getElementById('batteryForm');if(bf)bf.onsubmit=e=>{e.preventDefault();document.querySelectorAll('[data-field]').forEach(el=>current[el.dataset.field]=el.value);const i=data.batteryRecords.findIndex(x=>x.id===current.id);if(i>=0)data.batteryRecords[i]=current;else data.batteryRecords.push(current);save(KEY_DATA,data);const cid=current.customerId;toast('Battery record saved');current=customerById(cid);route='customer-profile';render()};
 const nf=document.getElementById('noteForm');if(nf)nf.onsubmit=e=>{e.preventDefault();document.querySelectorAll('[data-field]').forEach(el=>current[el.dataset.field]=el.value);current.created=current.created||isoNow();data.customerNotes.push(current);save(KEY_DATA,data);const cid=current.customerId;toast('Note saved');current=customerById(cid);route='customer-profile';render()};
 const qf=document.getElementById('quoteForm');if(qf)qf.onsubmit=e=>{e.preventDefault();document.querySelectorAll('[data-field]').forEach(el=>current[el.dataset.field]=el.value);current.amount=Number(current.amount||0);const i=data.quotes.findIndex(x=>x.id===current.id);if(i>=0)data.quotes[i]=current;else data.quotes.push(current);save(KEY_DATA,data);const cid=current.customerId;toast('Quotation saved');current=customerById(cid);route='customer-profile';render()};
 const cpf=document.getElementById('customerPhotoForm');if(cpf){const inp=document.getElementById('customerPhotoInput');if(inp)inp.onchange=e=>{const f=e.target.files?.[0];if(!f)return;const rd=new FileReader();rd.onload=()=>{current.data=rd.result;render()};rd.readAsDataURL(f)};cpf.onsubmit=e=>{e.preventDefault();document.querySelectorAll('[data-field]').forEach(el=>current[el.dataset.field]=el.value);if(!current.data){toast('Choose a photograph first');return}data.customerPhotos.push(current);save(KEY_DATA,data);const cid=current.customerId;toast('Site photograph saved');current=customerById(cid);route='customer-profile';render()}};

 document.querySelectorAll('[data-new-business-quote]').forEach(b=>b.onclick=()=>{current=newQuote('');route='quote-form';render()});
 document.querySelectorAll('[data-delete-quote]').forEach(b=>b.onclick=()=>{if(confirm('Delete this quotation?')){data.quotes=data.quotes.filter(q=>q.id!==b.dataset.deleteQuote);save(KEY_DATA,data);render()}});
 document.querySelectorAll('[data-new-invoice]').forEach(b=>b.onclick=()=>{current={id:uid('INV'),number:nextDocNumber('INV',invoices()),customerId:'',customer:'',date:today(),dueDate:today(),description:'',lines:[{description:'',qty:1,unitPrice:0}],labour:0,vatRate:0,status:'Draft',subtotal:0,vat:0,total:0,linkedJobId:''};route='invoice-form';render()});
 document.querySelectorAll('[data-open-invoice]').forEach(b=>b.onclick=()=>{current=invoices().find(i=>i.id===b.dataset.openInvoice);route='invoice-preview';render()});
 document.querySelectorAll('[data-print-invoice]').forEach(b=>b.onclick=()=>{current=invoices().find(i=>i.id===b.dataset.printInvoice);route='invoice-preview';render();setTimeout(()=>window.print(),100)});
 document.querySelectorAll('[data-delete-invoice]').forEach(b=>b.onclick=()=>{if(confirm('Delete this invoice?')){data.invoices=data.invoices.filter(i=>i.id!==b.dataset.deleteInvoice);save(KEY_DATA,data);render()}});
 document.querySelectorAll('[data-edit-invoice]').forEach(b=>b.onclick=()=>{route='invoice-form';render()});
 document.querySelectorAll('[data-add-invoice-line]').forEach(b=>b.onclick=()=>{sync();current.lines=current.lines||[];current.lines.push({description:'',qty:1,unitPrice:0});render()});
 document.querySelectorAll('[data-remove-invoice-line]').forEach(b=>b.onclick=()=>{sync();current.lines.splice(Number(b.dataset.removeInvoiceLine),1);render()});
 document.querySelectorAll('[data-new-stock]').forEach(b=>b.onclick=()=>{current={id:uid('STK'),name:'',sku:'',location:'Van',quantity:0,reorderLevel:1,costPrice:0,sellPrice:0,supplierId:'',notes:''};route='stock-form';render()});
 document.querySelectorAll('[data-edit-stock]').forEach(b=>b.onclick=()=>{current=stockById(b.dataset.editStock);route='stock-form';render()});
 document.querySelectorAll('[data-adjust-stock]').forEach(b=>b.onclick=()=>{const s=stockById(b.dataset.adjustStock);if(s){s.quantity=Math.max(0,Number(s.quantity||0)+Number(b.dataset.delta||0));save(KEY_DATA,data);render()}});
 document.querySelectorAll('[data-delete-stock]').forEach(b=>b.onclick=()=>{if(confirm('Delete this stock item?')){data.stock=data.stock.filter(s=>s.id!==b.dataset.deleteStock);save(KEY_DATA,data);render()}});
 const ss=document.getElementById('stockSearch');if(ss)ss.oninput=()=>{const q=ss.value.toLowerCase();document.querySelectorAll('.stock-card').forEach(el=>el.style.display=el.dataset.stockText.includes(q)?'block':'none')};
 document.querySelectorAll('[data-new-supplier]').forEach(b=>b.onclick=()=>{current={id:uid('SUP'),name:'',contact:'',phone:'',email:'',accountNumber:'',discount:'',address:'',notes:''};route='supplier-form';render()});
 document.querySelectorAll('[data-edit-supplier]').forEach(b=>b.onclick=()=>{current=supplierById(b.dataset.editSupplier);route='supplier-form';render()});


 document.querySelectorAll('[data-new-cert]').forEach(b=>b.onclick=()=>{current=blankElectricalCertificate(b.dataset.newCert);route='electrical-form';render()});
 document.querySelectorAll('[data-open-cert]').forEach(b=>b.onclick=()=>{current=electricalCertificates().find(c=>c.id===b.dataset.openCert);route='electrical-preview';render()});
 document.querySelectorAll('[data-print-cert]').forEach(b=>b.onclick=()=>{current=electricalCertificates().find(c=>c.id===b.dataset.printCert);route='electrical-preview';render();setTimeout(()=>window.print(),100)});
 document.querySelectorAll('[data-delete-cert]').forEach(b=>b.onclick=()=>{if(confirm('Delete this electrical certificate?')){data.electricalCertificates=data.electricalCertificates.filter(c=>c.id!==b.dataset.deleteCert);save(KEY_DATA,data);render()}});
 document.querySelectorAll('[data-edit-cert]').forEach(b=>b.onclick=()=>{route='electrical-form';render()});
 document.querySelectorAll('[data-add-circuit]').forEach(b=>b.onclick=()=>{sync();current.circuits=current.circuits||[];current.circuits.push({name:'',device:'',rating:'',zs:'',ir:''});render()});
 document.querySelectorAll('[data-remove-circuit]').forEach(b=>b.onclick=()=>{sync();current.circuits.splice(Number(b.dataset.removeCircuit),1);render()});
 document.querySelectorAll('[data-add-observation]').forEach(b=>b.onclick=()=>{sync();current.observations=current.observations||[];current.observations.push({code:'C3',text:''});render()});
 document.querySelectorAll('[data-remove-observation]').forEach(b=>b.onclick=()=>{sync();current.observations.splice(Number(b.dataset.removeObservation),1);render()});

 document.querySelectorAll('[data-backup]').forEach(b=>b.onclick=()=>{const blob=new Blob([JSON.stringify({version:APP_VERSION,exported:new Date().toISOString(),data,reports},null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`cables-pro-v9-backup-${today()}.json`;a.click();URL.revokeObjectURL(a.href)});
 document.querySelectorAll('[data-clear-drafts]').forEach(b=>b.onclick=()=>{reports=reports.filter(r=>!(r.status==='Draft'&&!r.customer.trim()));save(KEY_REPORTS,reports);toast('Empty drafts removed')});
}
normaliseData();
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
render();
