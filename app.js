
'use strict';
const APP_VERSION='10.0.0';
const KEY_DATA='cables_pro_v9_data';
const KEY_REPORTS='cables_pro_v9_alarm_reports';
const app=document.getElementById('app');
let route='home', current=null, step=0, search='', autosave=null;

const emptyData={customers:[],jobs:[]};
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
 return `<div class="app"><header><div class="brand"><img src="logo.png"><div><b>Cables Pro</b><small>Professional Intruder Alarm Edition</small></div></div><div class="version">V10</div></header><main>${body}</main>
 <nav class="bottom">${[['home','⌂','Home'],['jobs','📅','Diary'],['customers','👥','Customers'],['reports','📄','Reports'],['more','•••','More']].map(x=>`<button class="nav ${route===x[0]?'active':''}" data-route="${x[0]}"><span>${x[1]}</span>${x[2]}</button>`).join('')}</nav></div>`;
}
function home(){
 const drafts=reports.filter(r=>r.status==='Draft').length,complete=reports.filter(r=>r.status==='Complete').length,todays=data.jobs.filter(j=>j.date===today()).length;
 return `<section class="hero"><div class="eyebrow">Cables Electrical Installations Limited</div><h1>Ready for site.</h1><p class="muted">Complete, sign and issue intruder alarm service reports from one place.</p><div class="two"><button class="btn primary" data-new-report>＋ Start Alarm Service</button><button class="btn" data-route="reports">Open Reports</button></div></section>
 <div class="stats"><div class="card stat"><strong>${todays}</strong><span>Today's jobs</span></div><div class="card stat"><strong>${drafts}</strong><span>Draft reports</span></div><div class="card stat"><strong>${complete}</strong><span>Completed reports</span></div><div class="card stat"><strong>${data.customers.length}</strong><span>Customers</span></div></div>
 <div class="section"><h2>Live engineer module</h2></div><div class="grid"><button class="module live" data-new-report><div class="ico">🛡️</div><b>Intruder Alarm Service Report</b><span>Full service form, device testing, photographs, signatures, PDF and email.</span></button>
 <button class="module" data-route="reports"><div class="ico">📄</div><b>Saved Alarm Reports</b><span>Resume drafts or reopen completed reports.</span></button>
 <button class="module" data-new-job><div class="ico">📅</div><b>Book a Job</b><span>Add an appointment to the diary.</span></button>
 <button class="module" data-new-customer><div class="ico">👥</div><b>Add Customer</b><span>Save customer details for quick report completion.</span></button></div>`;
}
function diary(){
 const rows=[...data.jobs].sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
 return `<div class="section"><h2>Diary</h2><button class="btn primary" data-new-job>＋ Book Job</button></div>${rows.map(j=>`<div class="card"><div class="row"><div class="avatar">${esc(j.time)}</div><div class="grow"><b>${esc(j.customer)}</b><div class="muted">${esc(j.date)} · ${esc(j.title)}</div></div><span class="badge ${j.status==='Complete'?'good':''}">${esc(j.status)}</span></div><div class="grid no-print" style="margin-top:11px"><button class="btn" data-edit-job="${j.id}">Open</button><button class="btn primary" data-job-report="${j.id}">Start Alarm Report</button><button class="btn danger" data-delete-job="${j.id}">Delete Job</button></div></div>`).join('')||'<div class="card empty">No diary appointments.</div>'}`;
}
function customers(){
 return `<div class="section"><h2>Customers</h2><button class="btn primary" data-new-customer>＋ Add Customer</button></div>${data.customers.map(c=>`<div class="card"><div class="row"><div class="avatar">${esc(c.name[0]||'?')}</div><div class="grow"><b>${esc(c.name)}</b><div class="muted">${esc(c.address)}</div></div></div><div class="two" style="margin-top:11px"><button class="btn" data-edit-customer="${c.id}">Edit</button><button class="btn primary" data-report-customer="${c.id}">Start Service</button></div></div>`).join('')||'<div class="card empty">No customers saved yet.</div>'}`;
}
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
 const x=c||{id:uid('C'),name:'',address:'',contact:'',phone:'',email:''};current=x;
 return `<div class="section"><h2>Customer</h2></div><form class="card" id="customerForm">${field('Customer / company','name',x.name)}${area('Address','address',x.address,3)}${field('Contact name','contact',x.contact)}<div class="two">${field('Telephone','phone',x.phone,'tel')}${field('Email','email',x.email,'email')}</div><button class="btn primary full">Save Customer</button></form>`;
}
function jobForm(j){
 const x=j||{id:uid('J'),customer:'',title:'Alarm annual service',date:today(),time:'09:00',status:'Booked',notes:''};current=x;
 return `<div class="section"><h2>Diary Appointment</h2></div><form class="card" id="jobForm">${field('Customer','customer',x.customer)}${field('Job description','title',x.title)}<div class="two">${field('Date','date',x.date,'date')}${field('Time','time',x.time,'time')}</div><label class="field">Status<select data-field="status">${['Booked','Travelling','On site','Complete'].map(s=>`<option ${s===x.status?'selected':''}>${s}</option>`).join('')}</select></label>${area('Notes','notes',x.notes,4)}<div class="grid no-print"><button class="btn primary" type="submit">Save Appointment</button><button class="btn" type="button" data-start-report-from-open-job>Start Alarm Report</button><button class="btn danger" type="button" data-delete-open-job>Delete Job</button></div></form>`;
}
function more(){
 return `<div class="section"><h2>More</h2></div><div class="grid"><button class="module" data-backup><div class="ico">💾</div><b>Full Backup</b><span>Download customers, diary and all alarm reports.</span></button><button class="module" data-clear-drafts><div class="ico">🧹</div><b>Remove Empty Drafts</b><span>Delete unused reports without customer details.</span></button><button class="module"><div class="ico">ℹ️</div><b>Cables Pro V9</b><span>Intruder Alarm Professional Edition.</span></button></div>`;
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
 document.querySelectorAll('[data-device]').forEach(el=>{const i=+el.dataset.device;if(current.devices[i])current.devices[i][el.dataset.dkey]=el.value});
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
 stopAuto();let body=route==='home'?home():route==='jobs'?diary():route==='customers'?customers():route==='reports'?reportList():route==='alarm-form'?reportForm():route==='preview'?preview():route==='customer-form'?customerForm(current):route==='job-form'?jobForm(current):more();
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
 document.querySelectorAll('[data-new-customer]').forEach(b=>b.onclick=()=>{current=null;route='customer-form';render()});
 document.querySelectorAll('[data-edit-customer]').forEach(b=>b.onclick=()=>{current=data.customers.find(c=>c.id===b.dataset.editCustomer);route='customer-form';render()});
 document.querySelectorAll('[data-report-customer]').forEach(b=>b.onclick=()=>{const c=data.customers.find(x=>x.id===b.dataset.reportCustomer);current=blankReport();Object.assign(current,{customerId:c.id,customer:c.name,address:c.address,contact:c.contact,phone:c.phone,email:c.email});route='alarm-form';step=0;render()});
 document.querySelectorAll('[data-new-job]').forEach(b=>b.onclick=()=>{current=null;route='job-form';render()});
 document.querySelectorAll('[data-edit-job]').forEach(b=>b.onclick=()=>{current=data.jobs.find(j=>j.id===b.dataset.editJob);route='job-form';render()});
 document.querySelectorAll('[data-delete-job]').forEach(b=>b.onclick=()=>deleteJobById(b.dataset.deleteJob));
 document.querySelectorAll('[data-job-report]').forEach(b=>b.onclick=()=>startReportFromJob(data.jobs.find(j=>j.id===b.dataset.jobReport)));
 document.querySelectorAll('[data-delete-open-job]').forEach(b=>b.onclick=()=>{if(current?.id)deleteJobById(current.id)});
 document.querySelectorAll('[data-start-report-from-open-job]').forEach(b=>b.onclick=()=>{
   document.querySelectorAll('[data-field]').forEach(el=>current[el.dataset.field]=el.value);
   const i=data.jobs.findIndex(j=>j.id===current.id);
   if(i>=0)data.jobs[i]=current;else data.jobs.push(current);
   save(KEY_DATA,data);
   startReportFromJob(current);
 });

 const cf=document.getElementById('customerForm');if(cf)cf.onsubmit=e=>{e.preventDefault();document.querySelectorAll('[data-field]').forEach(el=>current[el.dataset.field]=el.value);const i=data.customers.findIndex(c=>c.id===current.id);if(i>=0)data.customers[i]=current;else data.customers.push(current);save(KEY_DATA,data);toast('Customer saved');route='customers';render()};
 const jf=document.getElementById('jobForm');if(jf)jf.onsubmit=e=>{e.preventDefault();document.querySelectorAll('[data-field]').forEach(el=>current[el.dataset.field]=el.value);const i=data.jobs.findIndex(j=>j.id===current.id);if(i>=0)data.jobs[i]=current;else data.jobs.push(current);save(KEY_DATA,data);toast('Appointment saved');route='jobs';render()};
 document.querySelectorAll('[data-backup]').forEach(b=>b.onclick=()=>{const blob=new Blob([JSON.stringify({version:APP_VERSION,exported:new Date().toISOString(),data,reports},null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`cables-pro-v9-backup-${today()}.json`;a.click();URL.revokeObjectURL(a.href)});
 document.querySelectorAll('[data-clear-drafts]').forEach(b=>b.onclick=()=>{reports=reports.filter(r=>!(r.status==='Draft'&&!r.customer.trim()));save(KEY_REPORTS,reports);toast('Empty drafts removed')});
}
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
render();
