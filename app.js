/* Cables Pro V8.1 Easy Deploy Edition
   Single-file application bundle for simple GitHub web uploads.
*/
const KEY = 'cables_pro_v8_data';
const seed = {
    customers: [
        { id: 'C-1001', name: 'Manor House', address: 'Nottinghamshire', phone: '', email: '', created: new Date().toISOString() },
        { id: 'C-1002', name: 'Mrs Smith', address: 'Sutton-in-Ashfield', phone: '', email: '', created: new Date().toISOString() }
    ],
    jobs: [
        { id: 'J-1001', customerId: 'C-1001', title: 'Electrical inspection', module: 'Electrical', date: new Date().toISOString().slice(0, 10), time: '08:30', status: 'Booked', value: 250, notes: '' },
        { id: 'J-1002', customerId: 'C-1002', title: 'Alarm annual service', module: 'Intruder Alarm', date: new Date().toISOString().slice(0, 10), time: '13:30', status: 'Booked', value: 95, notes: '' }
    ],
    records: [
        { id: 'R-1', kind: 'Invoice', reference: 'INV-2026-0001', customerId: 'C-1002', title: 'Alarm service', status: 'Outstanding', date: new Date().toISOString().slice(0, 10), amount: 95, details: 'Payment due within 30 days.' },
        { id: 'R-2', kind: 'Contract', reference: 'SC-2026-0001', customerId: 'C-1001', title: 'Annual alarm maintenance', status: 'Active', date: new Date().toISOString().slice(0, 10), amount: 180, details: 'Next visit due annually.' },
        { id: 'R-3', kind: 'Asset', reference: 'ASSET-000101', customerId: 'C-1001', title: 'Risco alarm panel', status: 'Operational', date: new Date().toISOString().slice(0, 10), details: 'Main entrance cupboard.' }
    ]
};
function loadData() {
    try {
        const raw = localStorage.getItem(KEY);
        if (raw)
            return JSON.parse(raw);
    }
    catch { }
    saveData(seed);
    return structuredClone(seed);
}
function saveData(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
}
function exportData(data) {
    const blob = new Blob([JSON.stringify({ version: '8.2.0', exported: new Date().toISOString(), data }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cables-pro-v8-2-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
}


const app = document.querySelector('#app');
let data = loadData();
let route = 'dashboard';
let selectedKind = 'Report';
let editingId = '';
let query = '';
let currentAlarmReport = null;
let alarmAutosaveTimer = null;
const modules = [
    ['⚡', 'Electrical', 'EICR, minor works, installations and fault finding'],
    ['🛡️', 'Intruder Alarm', 'Servicing, commissioning, takeovers and faults'],
    ['📹', 'CCTV', 'Installation, maintenance and commissioning'],
    ['🔥', 'Fire Alarm', 'Routine inspection and servicing records'],
    ['🚪', 'Emergency Lighting', 'Functional and duration testing'],
    ['🔌', 'PAT Testing', 'Portable appliance inspection records'],
    ['📶', 'Network & Wi-Fi', 'Starlink, switching, access points and cabling'],
    ['🚗', 'EV Chargers', 'Installation and maintenance records']
];
function esc(v) { return String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }
function money(v) { return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(v || 0); }
function customerName(id) { return data.customers.find(c => c.id === id)?.name || 'No customer'; }
function uid(prefix) { return `${prefix}-${Date.now()}`; }
function today() { return new Date().toISOString().slice(0, 10); }
function toast(message) { const n = document.createElement('div'); n.className = 'toast'; n.textContent = message; document.body.append(n); setTimeout(() => n.remove(), 1800); }
function shell(content) {
    return `<div class="app"><header class="topbar"><div class="brand"><img src="logo.png" alt=""><div><b>Cables Pro</b><small>Professional Edition · V8.2</small></div></div><div class="sync-pill">● Offline ready</div></header><main>${content}</main>
  <nav class="bottomnav">${[
        ['dashboard', '⌂', 'Home'], ['jobs', '🧰', 'Jobs'], ['customers', '👥', 'Customers'], ['diary', '📅', 'Diary'], ['more', '•••', 'More']
    ].map(x => `<button class="navbtn ${route === x[0] ? 'active' : ''}" data-route="${x[0]}"><span>${x[1]}</span>${x[2]}</button>`).join('')}</nav></div>`;
}

function alarmReports(){try{return JSON.parse(localStorage.getItem('cables_pro_v8_alarm_reports')||'[]')}catch{return []}}
function saveAlarmReports(v){localStorage.setItem('cables_pro_v8_alarm_reports',JSON.stringify(v))}
function nextAlarmNumber(){const y=new Date().getFullYear(),n=alarmReports().map(r=>String(r.reportNumber||'')).filter(x=>x.startsWith(`AL-${y}-`)).map(x=>Number(x.split('-').pop())).filter(Number.isFinite);return `AL-${y}-${String((n.length?Math.max(...n):0)+1).padStart(4,'0')}`}
function blankAlarmReport(){return{id:'ALR-'+Date.now(),reportNumber:nextAlarmNumber(),status:'Draft',created:new Date().toISOString(),updated:new Date().toISOString(),customerId:data.customers[0]?.id||'',customerName:'',siteAddress:'',contactName:'',telephone:'',email:'',serviceDate:today(),arrivalTime:'09:00',departureTime:'10:00',engineer:'Lee Naylor',visitType:'Annual Service',panelMake:'',panelModel:'',panelLocation:'',systemGrade:'Grade 2',signalling:'None',zones:'',keypads:'',sirens:'',wirelessDevices:'',mainsHealthy:true,panelBatteryVoltage:'',panelBatteryAge:'',auxVoltage:'',sirenBatteryVoltage:'',testPanel:true,testKeypads:true,testDetectors:true,testContacts:true,testPanic:true,testExternalSiren:true,testInternalSiren:true,testSignalling:true,testMainsFail:true,testBatteryFail:true,testTamper:true,testWalkTest:true,faults:'',partsUsed:'',recommendations:'',engineerNotes:'',overallResult:'Satisfactory',customerNameSigned:'',signatureData:'',photos:[]}}
function af(label,key,value,type='text'){return `<label class="field">${label}<input data-alarm-field="${key}" type="${type}" value="${esc(value||'')}"></label>`}
function aa(label,key,value,rows=4){return `<label class="field">${label}<textarea data-alarm-field="${key}" rows="${rows}">${esc(value||'')}</textarea></label>`}
function ac(label,key,value){return `<label class="check-row"><input data-alarm-field="${key}" type="checkbox" ${value?'checked':''}><span>${label}</span></label>`}
function syncAlarmForm(){if(!currentAlarmReport)return;document.querySelectorAll('[data-alarm-field]').forEach(el=>currentAlarmReport[el.dataset.alarmField]=el.type==='checkbox'?el.checked:el.value)}
function saveAlarmDraft(done=false){syncAlarmForm();if(!currentAlarmReport)return;currentAlarmReport.updated=new Date().toISOString();currentAlarmReport.status=done?'Complete':'Draft';const a=alarmReports(),i=a.findIndex(x=>x.id===currentAlarmReport.id);if(i>=0)a[i]=currentAlarmReport;else a.unshift(currentAlarmReport);saveAlarmReports(a);toast(done?'Alarm report completed':'Alarm draft saved')}
function startAlarmAutosave(){stopAlarmAutosave();alarmAutosaveTimer=setInterval(()=>{if(route==='alarm-form')saveAlarmDraft(false)},15000)}
function stopAlarmAutosave(){if(alarmAutosaveTimer){clearInterval(alarmAutosaveTimer);alarmAutosaveTimer=null}}
function renderAlarmList(){const a=alarmReports();return `<div class="section-title"><h2>Intruder Alarm Reports</h2><button class="btn primary" data-new-alarm>＋ New Service</button></div><div class="list">${a.map(r=>`<div class="card"><div class="row"><div class="avatar">🛡️</div><div class="grow"><b>${esc(r.customerName||customerName(r.customerId))}</b><div class="muted">${esc(r.reportNumber)} · ${esc(r.serviceDate)} · ${esc(r.visitType)}</div></div><span class="badge ${r.status==='Complete'?'good':''}">${esc(r.status)}</span></div><button class="btn full" style="margin-top:12px" data-open-alarm="${r.id}">Open report</button></div>`).join('')||'<div class="card empty">No alarm service reports yet.</div>'}</div>`}
function renderAlarmForm(){const r=currentAlarmReport||blankAlarmReport();currentAlarmReport=r;const c=data.customers.find(x=>x.id===r.customerId);if(c&&!r.customerName){r.customerName=c.name;r.siteAddress=c.address;r.telephone=c.phone;r.email=c.email}return `<div class="section-title"><h2>Intruder Alarm Service</h2><span class="badge">${esc(r.reportNumber)}</span></div><div class="card autosave-note">Draft autosaves every 15 seconds on this device.</div>
<div class="card"><h3>Customer and visit</h3><label class="field">Existing customer<select data-alarm-field="customerId" id="alarmCustomer">${data.customers.map(c=>`<option value="${c.id}" ${c.id===r.customerId?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label><div class="two">${af('Customer / company','customerName',r.customerName)}${af('Contact name','contactName',r.contactName)}</div>${aa('Site address','siteAddress',r.siteAddress,3)}<div class="two">${af('Telephone','telephone',r.telephone,'tel')}${af('Email','email',r.email,'email')}</div><div class="two">${af('Service date','serviceDate',r.serviceDate,'date')}${af('Engineer','engineer',r.engineer)}</div><div class="two">${af('Arrival time','arrivalTime',r.arrivalTime,'time')}${af('Departure time','departureTime',r.departureTime,'time')}</div><label class="field">Visit type<select data-alarm-field="visitType">${['Annual Service','Routine Maintenance','Fault Visit','Takeover','Commissioning'].map(x=>`<option ${x===r.visitType?'selected':''}>${x}</option>`).join('')}</select></label></div>
<div class="card"><h3>System details</h3><div class="two">${af('Panel make','panelMake',r.panelMake)}${af('Panel model','panelModel',r.panelModel)}</div><div class="two">${af('Panel location','panelLocation',r.panelLocation)}<label class="field">System grade<select data-alarm-field="systemGrade">${['Grade 1','Grade 2','Grade 3','Not confirmed'].map(x=>`<option ${x===r.systemGrade?'selected':''}>${x}</option>`).join('')}</select></label></div><label class="field">Signalling<select data-alarm-field="signalling">${['None','Digital communicator','GSM','App / cloud','ARC monitored','Other'].map(x=>`<option ${x===r.signalling?'selected':''}>${x}</option>`).join('')}</select></label><div class="two">${af('Zones','zones',r.zones,'number')}${af('Keypads','keypads',r.keypads,'number')}</div><div class="two">${af('External sirens','sirens',r.sirens,'number')}${af('Wireless devices','wirelessDevices',r.wirelessDevices,'number')}</div></div>
<div class="card"><h3>Power and battery readings</h3>${ac('Mains supply healthy','mainsHealthy',r.mainsHealthy)}<div class="two">${af('Panel battery voltage (V)','panelBatteryVoltage',r.panelBatteryVoltage,'number')}${af('Panel battery age','panelBatteryAge',r.panelBatteryAge)}</div><div class="two">${af('Auxiliary voltage (V)','auxVoltage',r.auxVoltage,'number')}${af('Siren battery voltage (V)','sirenBatteryVoltage',r.sirenBatteryVoltage,'number')}</div></div>
<div class="card"><h3>Functional tests</h3><div class="check-grid">${ac('Control panel','testPanel',r.testPanel)}${ac('Keypads','testKeypads',r.testKeypads)}${ac('Movement detectors','testDetectors',r.testDetectors)}${ac('Door/window contacts','testContacts',r.testContacts)}${ac('Panic buttons','testPanic',r.testPanic)}${ac('External siren','testExternalSiren',r.testExternalSiren)}${ac('Internal sounders','testInternalSiren',r.testInternalSiren)}${ac('Signalling / app','testSignalling',r.testSignalling)}${ac('Mains failure','testMainsFail',r.testMainsFail)}${ac('Battery failure','testBatteryFail',r.testBatteryFail)}${ac('Tamper circuits','testTamper',r.testTamper)}${ac('Walk test completed','testWalkTest',r.testWalkTest)}</div></div>
<div class="card"><h3>Findings</h3>${aa('Faults and defects','faults',r.faults,5)}${aa('Parts used / replaced','partsUsed',r.partsUsed,4)}${aa('Recommendations','recommendations',r.recommendations,5)}${aa('Engineer notes','engineerNotes',r.engineerNotes,4)}<label class="field">Overall result<select data-alarm-field="overallResult">${['Satisfactory','Satisfactory with recommendations','Further action required','System left out of service'].map(x=>`<option ${x===r.overallResult?'selected':''}>${x}</option>`).join('')}</select></label></div>
<div class="card"><h3>Photos</h3><input id="alarmPhotos" type="file" accept="image/*" capture="environment" multiple><div class="photo-grid">${r.photos.map((p,i)=>`<div class="photo-item"><img src="${p}"><button class="btn danger" data-remove-photo="${i}">Remove</button></div>`).join('')||'<div class="muted">No photos added.</div>'}</div></div>
<div class="card"><h3>Customer sign-off</h3>${af('Customer / responsible person','customerNameSigned',r.customerNameSigned)}<canvas id="signatureCanvas" width="900" height="260"></canvas><button class="btn" data-clear-signature>Clear signature</button></div><div class="two no-print"><button class="btn" data-save-alarm>Save Draft</button><button class="btn primary" data-complete-alarm>Complete & Preview</button></div>`}
function drawSignatureCanvas(){const c=document.getElementById('signatureCanvas');if(!c)return;const x=c.getContext('2d');x.lineWidth=2;x.lineCap='round';x.strokeStyle='#fff';let d=false,l;const pt=e=>{const r=c.getBoundingClientRect(),t=e.touches?e.touches[0]:e;return{x:(t.clientX-r.left)*(c.width/r.width),y:(t.clientY-r.top)*(c.height/r.height)}};const st=e=>{d=true;l=pt(e);e.preventDefault()},mv=e=>{if(!d)return;const p=pt(e);x.beginPath();x.moveTo(l.x,l.y);x.lineTo(p.x,p.y);x.stroke();l=p;e.preventDefault()},en=()=>{if(d){d=false;currentAlarmReport.signatureData=c.toDataURL('image/png')}};c.onmousedown=st;c.onmousemove=mv;window.onmouseup=en;c.ontouchstart=st;c.ontouchmove=mv;c.ontouchend=en;if(currentAlarmReport.signatureData){const i=new Image();i.onload=()=>x.drawImage(i,0,0,c.width,c.height);i.src=currentAlarmReport.signatureData}}
function handleAlarmPhotos(files){[...files].slice(0,6).forEach(f=>{if(!f.type.startsWith('image/'))return;const r=new FileReader();r.onload=()=>{currentAlarmReport.photos.push(String(r.result));render()};r.readAsDataURL(f)})}
function rv(l,v){return `<div class="report-row"><b>${l}</b><span>${esc(v||'—')}</span></div>`}
function renderAlarmPreview(){const r=currentAlarmReport;if(!r)return renderAlarmList();const t=[['Control panel',r.testPanel],['Keypads',r.testKeypads],['Detectors',r.testDetectors],['Contacts',r.testContacts],['Panic buttons',r.testPanic],['External siren',r.testExternalSiren],['Internal sounders',r.testInternalSiren],['Signalling',r.testSignalling],['Mains failure',r.testMainsFail],['Battery failure',r.testBatteryFail],['Tamper circuits',r.testTamper],['Walk test',r.testWalkTest]];return `<article class="card report"><div class="report-head"><img src="logo.png"><div><h2>Cables Electrical Installations Limited</h2><p>01623 512500 · cables.electrical@gmail.com<br>www.cables-electrical.co.uk · NICEIC Domestic Installer</p></div></div><hr><h1>Intruder Alarm Service Report</h1><h3>${esc(r.reportNumber)}</h3>${rv('Customer',r.customerName)}${rv('Site address',r.siteAddress)}${rv('Service date',r.serviceDate)}${rv('Visit type',r.visitType)}${rv('Engineer',r.engineer)}${rv('Time on site',`${r.arrivalTime}–${r.departureTime}`)}<h3>System details</h3>${rv('Panel',`${r.panelMake} ${r.panelModel}`)}${rv('Location',r.panelLocation)}${rv('Grade',r.systemGrade)}${rv('Signalling',r.signalling)}<h3>Readings</h3>${rv('Mains healthy',r.mainsHealthy?'Yes':'No')}${rv('Panel battery',r.panelBatteryVoltage?`${r.panelBatteryVoltage} V`:'—')}${rv('Battery age',r.panelBatteryAge)}${rv('Auxiliary voltage',r.auxVoltage?`${r.auxVoltage} V`:'—')}${rv('Siren battery',r.sirenBatteryVoltage?`${r.sirenBatteryVoltage} V`:'—')}<h3>Functional tests</h3><div class="report-checks">${t.map(x=>`<div>${x[1]?'✓':'✕'} ${esc(x[0])}</div>`).join('')}</div><h3>Faults and defects</h3><p>${esc(r.faults||'None recorded').replace(/\n/g,'<br>')}</p><h3>Parts used</h3><p>${esc(r.partsUsed||'None recorded').replace(/\n/g,'<br>')}</p><h3>Recommendations</h3><p>${esc(r.recommendations||'None recorded').replace(/\n/g,'<br>')}</p><h3>Overall result</h3><div class="result-box">${esc(r.overallResult)}</div>${r.photos.length?`<h3>Site photographs</h3><div class="report-photos">${r.photos.map(p=>`<img src="${p}">`).join('')}</div>`:''}<h3>Customer sign-off</h3><p>${esc(r.customerNameSigned||'Not recorded')}</p>${r.signatureData?`<img class="signature-image" src="${r.signatureData}">`:''}<p class="disclaimer">This report records the maintenance visit and condition found at the time of inspection. Any defects requiring further work should be addressed separately.</p></article><div class="two no-print"><button class="btn" data-edit-alarm>Edit report</button><button class="btn primary" data-print-alarm>Print / Save PDF</button></div>`}

function dashboard() {
    const t = today();
    const todays = data.jobs.filter(j => j.date === t);
    const outstanding = data.records.filter(r => r.kind === 'Invoice' && r.status !== 'Paid');
    const activeContracts = data.records.filter(r => r.kind === 'Contract' && r.status === 'Active');
    const revenue = data.jobs.filter(j => j.status === 'Complete').reduce((a, j) => a + j.value, 0);
    const results = query ? globalResults(query) : '';
    return `<section class="hero"><div class="eyebrow">Cables Electrical Installations Limited</div><h1>Good day, Lee.</h1><p class="muted">One professional workspace for field engineering and office control.</p>
  <label class="field search">Search everything<input id="globalSearch" value="${esc(query)}" placeholder="Customer, address, job, invoice, asset or report"></label>${results}
  <div class="two"><button class="btn primary" data-new-job>＋ New Job</button><button class="btn" data-new-record="Quote">＋ New Quote</button></div></section>
  <div class="stats"><div class="card stat"><strong>${todays.length}</strong><span>Today's jobs</span></div><div class="card stat"><strong>${money(revenue)}</strong><span>Completed value</span></div><div class="card stat"><strong>${outstanding.length}</strong><span>Outstanding invoices</span></div><div class="card stat"><strong>${activeContracts.length}</strong><span>Active contracts</span></div></div>
  <div class="section-title"><h2>Today's diary</h2><button class="btn" data-route="diary">Open diary</button></div>
  <div class="list">${todays.map(jobCard).join('') || '<div class="card empty">No jobs booked today.</div>'}</div>
  <div class="section-title"><h2>Engineer modules</h2></div><div class="grid">${modules.map(m => `<button class="module" data-module="${esc(m[1])}"><div class="icon">${m[0]}</div><b>${m[1]}</b><span>${m[2]}</span></button>`).join('')}</div>`;
}
function globalResults(q) {
    const v = q.toLowerCase().trim();
    if (!v)
        return '';
    const rows = [];
    data.customers.filter(c => (c.name + ' ' + c.address).toLowerCase().includes(v)).slice(0, 3).forEach(c => rows.push(`<div class="search-result" data-edit-customer="${c.id}"><b>Customer</b> · ${esc(c.name)} — ${esc(c.address)}</div>`));
    data.jobs.filter(j => (j.title + ' ' + j.module + ' ' + customerName(j.customerId)).toLowerCase().includes(v)).slice(0, 3).forEach(j => rows.push(`<div class="search-result" data-edit-job="${j.id}"><b>Job</b> · ${esc(customerName(j.customerId))} — ${esc(j.title)}</div>`));
    data.records.filter(r => (r.reference + ' ' + r.title + ' ' + customerName(r.customerId)).toLowerCase().includes(v)).slice(0, 4).forEach(r => rows.push(`<div class="search-result" data-edit-record="${r.id}"><b>${r.kind}</b> · ${esc(r.reference)} — ${esc(r.title)}</div>`));
    return `<div class="search-results">${rows.join('') || '<div class="search-result muted">No matches found.</div>'}</div>`;
}
function jobCard(j) {
    return `<div class="card"><div class="row"><div class="avatar">${esc(j.time || '—')}</div><div class="grow"><b>${esc(customerName(j.customerId))}</b><div class="muted">${esc(j.title)} · ${esc(j.module)}</div></div><span class="badge ${j.status === 'Complete' ? 'good' : ''}">${esc(j.status)}</span></div><div class="two" style="margin-top:14px"><button class="btn" data-edit-job="${j.id}">Open</button><button class="btn primary" data-advance-job="${j.id}">Advance stage</button></div></div>`;
}
function jobsView() {
    return `<div class="section-title"><h2>Jobs</h2><button class="btn primary" data-new-job>＋ New Job</button></div><div class="list">${data.jobs.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).map(jobCard).join('') || '<div class="card empty">No jobs saved.</div>'}</div>`;
}
function customersView() {
    return `<div class="section-title"><h2>Customers</h2><button class="btn primary" data-new-customer>＋ Add Customer</button></div><div class="list">${data.customers.map(c => `<div class="card"><div class="row"><div class="avatar">${esc(c.name[0] || '?')}</div><div class="grow"><b>${esc(c.name)}</b><div class="muted">${esc(c.address)}</div></div></div><button class="btn full" style="margin-top:12px" data-edit-customer="${c.id}">Open customer</button></div>`).join('')}</div>`;
}
function diaryView() {
    const grouped = [...data.jobs].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    return `<div class="section-title"><h2>Diary</h2><button class="btn primary" data-new-job>＋ Book Job</button></div><div class="list">${grouped.map(j => `<div class="card"><div class="eyebrow">${esc(j.date)}</div>${jobCard(j)}</div>`).join('') || '<div class="card empty">Diary is clear.</div>'}</div>`;
}
function moreView() {
    const items = [
        ['Quote', '£', 'Quotations'], ['Invoice', '🧾', 'Invoices'], ['Contract', '🔁', 'Service Contracts'],
        ['Report', '📄', 'Technical Reports'], ['Asset', '🏷', 'Asset Register'], ['Stock', '📦', 'Stock Control']
    ];
    return `<div class="section-title"><h2>Business tools</h2></div><div class="grid"><button class="module" data-alarm-list><div class="icon">🛡️</div><b>Intruder Alarm Reports</b><span>${alarmReports().length} service reports</span></button>${items.map(i => `<button class="module" data-list-kind="${i[0]}"><div class="icon">${i[1]}</div><b>${i[2]}</b><span>${data.records.filter(r => r.kind === i[0]).length} records</span></button>`).join('')}
  <button class="module" data-backup><div class="icon">💾</div><b>Full Backup</b><span>Export all local V8 data as JSON.</span></button></div>`;
}
function listView() {
    const rows = data.records.filter(r => r.kind === selectedKind);
    return `<div class="section-title"><h2>${esc(selectedKind)}s</h2><button class="btn primary" data-new-record="${selectedKind}">＋ New ${esc(selectedKind)}</button></div><div class="list">${rows.map(r => `<div class="card"><div class="row"><div class="avatar">${esc(r.kind[0])}</div><div class="grow"><b>${esc(r.title)}</b><div class="muted">${esc(r.reference)} · ${esc(customerName(r.customerId))}${r.amount ? ` · ${money(r.amount)}` : ''}</div></div><span class="badge ${r.status === 'Paid' || r.status === 'Active' || r.status === 'Operational' ? 'good' : ''}">${esc(r.status)}</span></div><button class="btn full" style="margin-top:12px" data-edit-record="${r.id}">Open</button></div>`).join('') || '<div class="card empty">No records in this module.</div>'}</div>`;
}
function customerForm(c) {
    const x = c || { id: uid('C'), name: '', address: '', phone: '', email: '', created: new Date().toISOString() };
    editingId = x.id;
    return `<div class="section-title"><h2>Customer</h2></div><form class="card" id="customerForm">
  <label class="field">Customer / company<input name="name" required value="${esc(x.name)}"></label>
  <label class="field">Address<textarea name="address" rows="3">${esc(x.address)}</textarea></label>
  <div class="two"><label class="field">Telephone<input name="phone" value="${esc(x.phone)}"></label><label class="field">Email<input type="email" name="email" value="${esc(x.email)}"></label></div>
  <button class="btn primary full">Save Customer</button></form>`;
}
function jobForm(j) {
    const x = j || { id: uid('J'), customerId: data.customers[0]?.id || '', title: '', module: 'Electrical', date: today(), time: '09:00', status: 'Booked', value: 0, notes: '' };
    editingId = x.id;
    return `<div class="section-title"><h2>Job</h2></div><form class="card" id="jobForm">
  <label class="field">Customer<select name="customerId">${data.customers.map(c => `<option value="${c.id}" ${c.id === x.customerId ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
  <label class="field">Job title<input name="title" required value="${esc(x.title)}"></label>
  <label class="field">Module<select name="module">${modules.map(m => `<option ${m[1] === x.module ? 'selected' : ''}>${m[1]}</option>`).join('')}</select></label>
  <div class="two"><label class="field">Date<input type="date" name="date" value="${x.date}"></label><label class="field">Time<input type="time" name="time" value="${x.time}"></label></div>
  <div class="two"><label class="field">Status<select name="status">${['Booked', 'Travelling', 'On site', 'In progress', 'Complete'].map(v => `<option ${v === x.status ? 'selected' : ''}>${v}</option>`).join('')}</select></label><label class="field">Job value (£)<input type="number" step=".01" name="value" value="${x.value}"></label></div>
  <label class="field">Notes<textarea name="notes" rows="5">${esc(x.notes)}</textarea></label><button class="btn primary full">Save Job</button></form>`;
}
function recordForm(r) {
    const x = r || { id: uid('R'), kind: selectedKind, reference: `${selectedKind.slice(0, 3).toUpperCase()}-${new Date().getFullYear()}-${String(data.records.filter(z => z.kind === selectedKind).length + 1).padStart(4, '0')}`, customerId: data.customers[0]?.id, title: '', status: 'Draft', date: today(), amount: 0, details: '' };
    editingId = x.id;
    selectedKind = x.kind;
    return `<div class="section-title"><h2>${esc(x.kind)}</h2></div><form class="card" id="recordForm">
  <label class="field">Reference<input name="reference" value="${esc(x.reference)}"></label><label class="field">Customer<select name="customerId"><option value="">No customer</option>${data.customers.map(c => `<option value="${c.id}" ${c.id === x.customerId ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
  <label class="field">Title<input name="title" required value="${esc(x.title)}"></label><div class="two"><label class="field">Date<input type="date" name="date" value="${x.date}"></label><label class="field">Amount (£)<input type="number" step=".01" name="amount" value="${x.amount || 0}"></label></div>
  <label class="field">Status<input name="status" value="${esc(x.status)}"></label><label class="field">Details<textarea name="details" rows="7">${esc(x.details)}</textarea></label>
  <button class="btn primary full">Save ${esc(x.kind)}</button></form>`;
}
function render() {
    let content = '';
    if (route === 'dashboard')
        content = dashboard();
    if (route === 'jobs')
        content = jobsView();
    if (route === 'customers')
        content = customersView();
    if (route === 'diary')
        content = diaryView();
    if (route === 'more')
        content = moreView();
    if (route === 'alarm-list') content = renderAlarmList();
    if (route === 'alarm-form') content = renderAlarmForm();
    if (route === 'alarm-preview') content = renderAlarmPreview();
    if (route === 'list')
        content = listView();
    if (route === 'record') {
        const c = data.customers.find(x => x.id === editingId), j = data.jobs.find(x => x.id === editingId), r = data.records.find(x => x.id === editingId);
        content = c ? customerForm(c) : j ? jobForm(j) : recordForm(r);
    }
    app.innerHTML = shell(content);
    bind();
    if(route==='alarm-form'){startAlarmAutosave();setTimeout(drawSignatureCanvas,0)}else stopAlarmAutosave();
}
function bind() {
    document.querySelectorAll('[data-route]').forEach(b => b.onclick = () => { route = b.dataset.route; editingId = ''; render(); });
    document.querySelectorAll('[data-new-customer]').forEach(b => b.onclick = () => { editingId = uid('C'); route = 'record'; app.innerHTML = shell(customerForm()); bind(); });
    document.querySelectorAll('[data-new-job]').forEach(b => b.onclick = () => { editingId = uid('J'); route = 'record'; app.innerHTML = shell(jobForm()); bind(); });
    document.querySelectorAll('[data-module]').forEach(b => b.onclick = () => { if(b.dataset.module==='Intruder Alarm'){currentAlarmReport=blankAlarmReport();route='alarm-form';render();return;} editingId = uid('J'); route = 'record'; const j = { id: editingId, customerId: data.customers[0]?.id || '', title: `${b.dataset.module} visit`, module: b.dataset.module || 'Electrical', date: today(), time: '09:00', status: 'Booked', value: 0, notes: '' }; app.innerHTML = shell(jobForm(j)); bind(); });
    document.querySelectorAll('[data-edit-customer]').forEach(b => b.onclick = () => { editingId = b.dataset.editCustomer; route = 'record'; render(); });
    document.querySelectorAll('[data-edit-job]').forEach(b => b.onclick = () => { editingId = b.dataset.editJob; route = 'record'; render(); });
    document.querySelectorAll('[data-list-kind]').forEach(b => b.onclick = () => { selectedKind = b.dataset.listKind; route = 'list'; render(); });
    document.querySelectorAll('[data-new-record]').forEach(b => b.onclick = () => { selectedKind = b.dataset.newRecord; editingId = uid('R'); route = 'record'; app.innerHTML = shell(recordForm()); bind(); });
    document.querySelectorAll('[data-edit-record]').forEach(b => b.onclick = () => { editingId = b.dataset.editRecord; route = 'record'; render(); });
    document.querySelectorAll('[data-advance-job]').forEach(b => b.onclick = () => { const j = data.jobs.find(x => x.id === b.dataset.advanceJob); if (!j)
        return; const stages = ['Booked', 'Travelling', 'On site', 'In progress', 'Complete']; j.status = stages[Math.min(stages.indexOf(j.status) + 1, stages.length - 1)]; saveData(data); toast(`Job moved to ${j.status}`); render(); });
    document.querySelectorAll('[data-backup]').forEach(b => b.onclick = () => exportData(data));
    const search = document.querySelector('#globalSearch');
    if (search)
        search.oninput = () => { query = search.value; render(); const n = document.querySelector('#globalSearch'); n?.focus(); n?.setSelectionRange(n.value.length, n.value.length); };
    
    document.querySelectorAll('[data-alarm-list]').forEach(b=>b.onclick=()=>{route='alarm-list';render()});
    document.querySelectorAll('[data-new-alarm]').forEach(b=>b.onclick=()=>{currentAlarmReport=blankAlarmReport();route='alarm-form';render()});
    document.querySelectorAll('[data-open-alarm]').forEach(b=>b.onclick=()=>{currentAlarmReport=alarmReports().find(r=>r.id===b.dataset.openAlarm);route=currentAlarmReport?.status==='Complete'?'alarm-preview':'alarm-form';render()});
    document.querySelectorAll('[data-save-alarm]').forEach(b=>b.onclick=()=>saveAlarmDraft(false));
    document.querySelectorAll('[data-complete-alarm]').forEach(b=>b.onclick=()=>{saveAlarmDraft(true);route='alarm-preview';render()});
    document.querySelectorAll('[data-edit-alarm]').forEach(b=>b.onclick=()=>{route='alarm-form';render()});
    document.querySelectorAll('[data-print-alarm]').forEach(b=>b.onclick=()=>window.print());
    document.querySelectorAll('[data-clear-signature]').forEach(b=>b.onclick=()=>{currentAlarmReport.signatureData='';render()});
    document.querySelectorAll('[data-remove-photo]').forEach(b=>b.onclick=()=>{currentAlarmReport.photos.splice(Number(b.dataset.removePhoto),1);render()});
    const ap=document.querySelector('#alarmPhotos');if(ap)ap.onchange=e=>handleAlarmPhotos(e.target.files||[]);
    const ac=document.querySelector('#alarmCustomer');if(ac)ac.onchange=()=>{const c=data.customers.find(x=>x.id===ac.value);if(c){Object.assign(currentAlarmReport,{customerId:c.id,customerName:c.name,siteAddress:c.address,telephone:c.phone,email:c.email});render()}};

    const cf = document.querySelector('#customerForm');
    if (cf)
        cf.onsubmit = e => { e.preventDefault(); const f = new FormData(cf); const existing = data.customers.find(x => x.id === editingId); const item = { id: editingId, name: String(f.get('name')), address: String(f.get('address')), phone: String(f.get('phone')), email: String(f.get('email')), created: existing?.created || new Date().toISOString() }; if (existing)
            Object.assign(existing, item);
        else
            data.customers.push(item); saveData(data); toast('Customer saved'); route = 'customers'; render(); };
    const jf = document.querySelector('#jobForm');
    if (jf)
        jf.onsubmit = e => { e.preventDefault(); const f = new FormData(jf); const existing = data.jobs.find(x => x.id === editingId); const item = { id: editingId, customerId: String(f.get('customerId')), title: String(f.get('title')), module: String(f.get('module')), date: String(f.get('date')), time: String(f.get('time')), status: String(f.get('status')), value: Number(f.get('value') || 0), notes: String(f.get('notes')) }; if (existing)
            Object.assign(existing, item);
        else
            data.jobs.push(item); saveData(data); toast('Job saved'); route = 'jobs'; render(); };
    const rf = document.querySelector('#recordForm');
    if (rf)
        rf.onsubmit = e => { e.preventDefault(); const f = new FormData(rf); const existing = data.records.find(x => x.id === editingId); const item = { id: editingId, kind: selectedKind, reference: String(f.get('reference')), customerId: String(f.get('customerId')) || undefined, title: String(f.get('title')), status: String(f.get('status')), date: String(f.get('date')), amount: Number(f.get('amount') || 0), details: String(f.get('details')) }; if (existing)
            Object.assign(existing, item);
        else
            data.records.push(item); saveData(data); toast(`${selectedKind} saved`); route = 'list'; render(); };
}
if ('serviceWorker' in navigator)
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => { }));
render();
