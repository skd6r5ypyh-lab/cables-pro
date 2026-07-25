
'use strict';

const VERSION='4.0.0';
const $=id=>document.getElementById(id);

const storage={
  read(key,fallback){
    try{
      const raw=localStorage.getItem(key);
      return raw===null?fallback:JSON.parse(raw);
    }catch(error){
      console.warn('Storage recovery',key,error);
      localStorage.removeItem(key);
      return fallback;
    }
  },
  write(key,value){
    try{
      localStorage.setItem(key,JSON.stringify(value));
      return true;
    }catch(error){
      showError('Unable to save locally. Safari storage may be full.');
      return false;
    }
  },
  remove(key){localStorage.removeItem(key)}
};

const state={
  route:'home',
  history:['home'],
  step:0,
  currentJob:null,
  result:'Pass',
  currentDeviceIndex:0,
  signatureData:'',
  photos:[],
  error:''
};

const stepNames=['Customer','System','Power','Devices','Summary','Photos','Signature'];

function toast(message){
  const el=$('toast');
  el.textContent=message;
  el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'),1700);
}
function showError(message){state.error=message;render()}
function clearError(){state.error=''}

function jobs(){return storage.read('cp4_jobs',[])}
function customers(){return storage.read('cp4_customers',[])}
function activeJobId(){return storage.read('cp4_active_job','')}

function saveJobs(list){storage.write('cp4_jobs',list)}
function saveCustomers(list){storage.write('cp4_customers',list)}
function setActiveJob(id){storage.write('cp4_active_job',id||'')}

function navigate(route,push=true){
  clearError();
  state.route=route;
  if(push && state.history[state.history.length-1]!==route) state.history.push(route);
  render();
  window.scrollTo(0,0);
}
function back(){
  if(state.history.length>1) state.history.pop();
  state.route=state.history[state.history.length-1]||'home';
  render();
  window.scrollTo(0,0);
}

function blankJob(){
  const due=new Date(); due.setFullYear(due.getFullYear()+1);
  return {
    id:'JOB-'+Date.now(),
    created:new Date().toISOString(),
    updated:new Date().toISOString(),
    status:'Draft',
    customerName:'',contactName:'',address:'',phone:'',email:'',
    jobType:'Annual Service',serviceDate:new Date().toISOString().slice(0,10),
    manufacturer:'Risco',panelModel:'',panelLocation:'',systemType:'Wireless',
    zoneCount:8,communicator:'',batteryInstalled:'',nextService:due.toISOString().slice(0,10),
    mainsV:'',batteryV:'',chargerV:'',standbyCurrent:'',
    checks:[],devices:[],notes:'',faults:'',recommendations:'',
    overall:'Satisfactory',photos:[],signature:'',signedBy:'',engineer:'Lee Naylor'
  };
}

function startNewJob(){
  state.currentJob=blankJob();
  state.step=0;
  state.photos=[];
  state.signatureData='';
  state.currentDeviceIndex=0;
  state.result='Pass';
  setActiveJob(state.currentJob.id);
  navigate('job');
}

function saveCurrentJob(status='Draft'){
  if(!state.currentJob) return false;
  syncVisibleFields();
  state.currentJob.status=status;
  state.currentJob.updated=new Date().toISOString();
  state.currentJob.photos=[...state.photos];
  state.currentJob.signature=state.signatureData;

  const list=jobs();
  const i=list.findIndex(j=>j.id===state.currentJob.id);
  if(i>=0) list[i]=state.currentJob; else list.unshift(state.currentJob);
  saveJobs(list);

  if(state.currentJob.customerName){
    const cs=customers();
    const key=(state.currentJob.customerName+'|'+state.currentJob.address).toLowerCase();
    const customer={
      key,
      name:state.currentJob.customerName,
      contact:state.currentJob.contactName,
      address:state.currentJob.address,
      phone:state.currentJob.phone,
      email:state.currentJob.email,
      manufacturer:state.currentJob.manufacturer,
      panel:state.currentJob.panelModel,
      nextService:state.currentJob.nextService
    };
    const ci=cs.findIndex(c=>c.key===key);
    if(ci>=0) cs[ci]=customer; else cs.unshift(customer);
    saveCustomers(cs);
  }

  if(status==='Complete') setActiveJob('');
  else setActiveJob(state.currentJob.id);
  toast(status==='Complete'?'Job completed':'Draft saved');
  return true;
}

function resumeJob(id){
  const record=jobs().find(j=>j.id===id);
  if(!record){
    setActiveJob('');
    showError('The saved job could not be found. Start a new job instead.');
    return;
  }
  state.currentJob=JSON.parse(JSON.stringify(record));
  state.photos=Array.isArray(record.photos)?[...record.photos]:[];
  state.signatureData=record.signature||'';
  state.currentDeviceIndex=0;
  state.result='Pass';
  state.step=0;
  setActiveJob(record.id);
  navigate('job');
}

function resumeActive(){
  const id=activeJobId();
  const record=jobs().find(j=>j.id===id)||jobs().find(j=>j.status==='Draft');
  if(record) resumeJob(record.id); else startNewJob();
}

function clearActiveDraft(){
  const id=activeJobId();
  if(id){
    saveJobs(jobs().filter(j=>j.id!==id));
  }
  setActiveJob('');
  state.currentJob=null;
  toast('Active draft cleared');
  navigate('home');
}

function completeCurrent(){
  if(saveCurrentJob('Complete')){
    state.currentJob=null;
    setTimeout(()=>navigate('home'),500);
  }
}

function syncVisibleFields(){
  if(!state.currentJob) return;
  document.querySelectorAll('[data-field]').forEach(el=>{
    const key=el.dataset.field;
    if(el.type==='checkbox'){
      const set=new Set(state.currentJob.checks||[]);
      el.checked?set.add(el.value):set.delete(el.value);
      state.currentJob.checks=[...set];
    }else{
      state.currentJob[key]=el.type==='number'?Number(el.value||0):el.value;
    }
  });
}

function nextStep(){
  syncVisibleFields();
  if(state.step<stepNames.length-1){
    state.step++;
    render();
    window.scrollTo(0,0);
  }else{
    navigate('report');
  }
}
function previousStep(){
  syncVisibleFields();
  if(state.step>0){state.step--;render();window.scrollTo(0,0)}
  else navigate('new');
}

function addOrUpdateDevice(){
  const type=$('deviceType')?.value||'PIR';
  const location=$('deviceLocation')?.value||'Unassigned';
  const notes=$('deviceNotes')?.value||'';
  const device={zone:state.currentDeviceIndex+1,type,location,result:state.result,notes};
  const list=state.currentJob.devices||[];
  list[state.currentDeviceIndex]=device;
  state.currentJob.devices=list;
  toast('Device saved');
}
function nextDevice(){
  addOrUpdateDevice();
  state.currentDeviceIndex++;
  render();
}
function selectResult(result){state.result=result;render()}

function handlePhotos(files){
  [...files].forEach(file=>{
    const reader=new FileReader();
    reader.onload=()=>{state.photos.push(reader.result);render()};
    reader.readAsDataURL(file);
  });
}
function removePhoto(index){state.photos.splice(index,1);render()}

function renderShell(content,title='Field Service Suite',showBack=false){
  return `<div class="shell">
  <header><div class="topbar">
    ${showBack?`<button class="circle" data-action="back">‹</button>`:''}
    <img class="logo" src="logo.png" alt="Cables Pro">
    <div class="title"><h1><b>CABLES</b> PRO</h1><small>${escapeHtml(title)}</small></div>
    <div class="spacer"></div>
    <button class="circle" data-route="settings">⚙</button>
  </div></header>
  <main>
    ${state.error?`<div class="error">${escapeHtml(state.error)}</div>`:''}
    ${content}
  </main>
  <button class="fab no-print" data-route="new">＋</button>
  <nav class="bottomnav no-print">
    ${navButton('home','⌂','Home')}
    ${navButton('jobs','💼','Jobs')}
    ${navButton('customers','👥','Customers')}
    ${navButton('reports','📄','Reports')}
    ${navButton('more','•••','More')}
  </nav>
  </div>`;
}
function navButton(route,icon,label){
  return `<button class="${state.route===route?'active':''}" data-route="${route}"><span>${icon}</span>${label}</button>`;
}

function renderHome(){
  const js=jobs(), cs=customers(), active=js.find(j=>j.id===activeJobId())||js.find(j=>j.status==='Draft');
  const body=`<div class="hero"><div class="eyebrow">Cables Electrical Installations Limited</div><h2>Good evening, Lee.</h2><p class="muted">Reliable jobs, customers and reports in one professional workspace.</p><button class="btn primary full" data-action="new-job">＋ Start New Job</button></div>
  <div class="stats">
    <div class="card stat"><strong>${js.length}</strong><span>Jobs</span></div>
    <div class="card stat"><strong>${cs.length}</strong><span>Customers</span></div>
    <div class="card stat"><strong>${js.filter(j=>j.status==='Complete').length}</strong><span>Reports</span></div>
    <div class="card stat"><strong>${js.filter(j=>j.status==='Draft').length}</strong><span>Drafts</span></div>
  </div>
  <div class="section-head"><h3>Continue current job</h3></div>
  <div class="card">${active?jobSummary(active,true):`<p class="muted">No active job. Start a new job when ready.</p>`}</div>
  <div class="section-head"><h3>Recent activity</h3></div>
  <div class="card">${js.slice(0,4).map(j=>jobRow(j)).join('')||'<p class="muted">No recent activity.</p>'}</div>`;
  return renderShell(body);
}

function renderNew(){
  const modules=[
    ['🛡️','Intruder Alarm','Annual service, fault visit, takeover or commissioning','alarm'],
    ['⚡','Electrical','EICR, Minor Works and certification','soon'],
    ['📹','CCTV','Installation and maintenance','soon'],
    ['🔥','Fire Alarm','Inspection and servicing','soon'],
    ['🚪','Emergency Lighting','Functional and duration tests','soon'],
    ['📶','Network & Wi-Fi','Starlink, access points and cabling','soon'],
    ['🚗','EV Charger','Installation and commissioning','soon'],
    ['£','Quotation','Professional customer quotation','soon']
  ];
  return renderShell(`<div class="hero"><div class="eyebrow">New job</div><h2>What are you working on?</h2><p class="muted">Select a service module to begin.</p></div><div class="grid">${modules.map(m=>`<button class="module" data-module="${m[3]}"><div class="ico">${m[0]}</div><b>${m[1]}</b><span>${m[2]}</span></button>`).join('')}</div>`,'Start New Job',true);
}

function renderJob(){
  if(!state.currentJob){return renderShell(`<div class="error">No job is open.</div><button class="btn primary" data-action="new-job">Start New Job</button>`,'Alarm Service',true)}
  const pct=(state.step/(stepNames.length-1))*100;
  const body=`<div class="steps">${stepNames.map((n,i)=>`<span class="step-chip ${i===state.step?'active':''}">${i+1}. ${n}</span>`).join('')}</div>
  <div class="card"><div class="muted">Job progress</div><div class="progress"><i style="width:${pct}%"></i></div></div>
  ${renderJobStep()}
  <div class="row no-print">
    <button class="btn" data-action="previous-step">Back</button>
    <button class="btn" data-action="save-draft">Save Draft</button>
    <button class="btn primary grow" data-action="next-step">${state.step===stepNames.length-1?'Preview Report':'Continue'}</button>
  </div>`;
  return renderShell(body,'Alarm Service',true);
}

function renderJobStep(){
  const j=state.currentJob;
  if(state.step===0) return `<div class="card"><h3>Customer and site</h3><div class="two">
    ${field('Customer / company','customerName',j.customerName)}
    ${field('Contact name','contactName',j.contactName)}
    ${textarea('Site address','address',j.address,'wide')}
    ${field('Telephone','phone',j.phone)}
    ${field('Email','email',j.email,'','email')}
    ${selectField('Visit type','jobType',['Annual Service','Maintenance Visit','Fault Visit','Installation','Commissioning','Takeover'],j.jobType)}
    ${field('Service date','serviceDate',j.serviceDate,'','date')}
  </div></div>`;

  if(state.step===1) return `<div class="card"><h3>System details</h3><div class="two">
    ${selectField('Manufacturer','manufacturer',['Risco','Texecom','Pyronix','Orisec','Honeywell','Scantronic','Other'],j.manufacturer)}
    ${field('Panel model','panelModel',j.panelModel)}
    ${field('Panel location','panelLocation',j.panelLocation)}
    ${selectField('System type','systemType',['Wireless','Wired','Hybrid'],j.systemType)}
    ${field('Number of zones','zoneCount',j.zoneCount,'','number')}
    ${field('Communicator','communicator',j.communicator)}
    ${field('Battery fitted','batteryInstalled',j.batteryInstalled,'','month')}
    ${field('Next service due','nextService',j.nextService,'','date')}
  </div></div>`;

  if(state.step===2){
    const checks=['Control panel inspected','Event log reviewed','Detectors tested','Internal sounders tested','External bell tested','Communicator tested','Tamper circuits tested','System left fully operational'];
    return `<div class="card"><h3>Power supply tests</h3><div class="two">
      ${field('Mains voltage','mainsV',j.mainsV,'','text','236 V')}
      ${field('Battery voltage','batteryV',j.batteryV,'','text','13.52 V')}
      ${field('Charger output','chargerV',j.chargerV,'','text','13.60 V')}
      ${field('Standby current','standbyCurrent',j.standbyCurrent,'','text','85 mA')}
    </div></div><div class="card"><h3>Service checklist</h3>${checks.map(c=>`<label class="row"><input type="checkbox" data-field="checks" value="${escapeHtml(c)}" ${(j.checks||[]).includes(c)?'checked':''}><div class="grow"><b>${escapeHtml(c)}</b></div></label>`).join('')}</div>`;
  }

  if(state.step===3){
    const d=(j.devices||[])[state.currentDeviceIndex]||{type:'PIR',location:state.currentDeviceIndex===0?'Kitchen':'',notes:'',result:'Pass'};
    state.result=d.result||state.result;
    return `<div class="card device-hero"><div class="muted">Device ${state.currentDeviceIndex+1}</div><div class="device-icon">📡</div><h2>${escapeHtml((d.location||'Unassigned')+' '+(d.type||'Device'))}</h2><div class="muted">Zone ${state.currentDeviceIndex+1}</div><br>
      <div class="test-options">
        <button class="${state.result==='Pass'?'pass':''}" data-result="Pass">✓ Pass</button>
        <button class="${state.result==='Fail'?'fail':''}" data-result="Fail">✕ Fail</button>
        <button class="${state.result==='N/A'?'na':''}" data-result="N/A">N/A</button>
      </div><br>
      ${plainField('Device type','deviceType',d.type)}
      ${plainField('Location','deviceLocation',d.location)}
      ${plainTextarea('Notes','deviceNotes',d.notes)}
      <div class="row"><button class="btn" data-action="save-device">Save Device</button><button class="btn primary grow" data-action="next-device">Save & Next</button></div>
    </div><div class="card"><h3>Tested devices</h3>${(j.devices||[]).map((x,i)=>`<div class="row"><div class="avatar">${i+1}</div><div class="grow"><b>${escapeHtml(x.location)} ${escapeHtml(x.type)}</b><small class="muted">Zone ${x.zone}</small></div><span class="badge ${x.result==='Pass'?'good':x.result==='Fail'?'bad':'warn'}">${x.result}</span></div>`).join('')||'<p class="muted">No devices recorded yet.</p>'}</div>`;
  }

  if(state.step===4) return `<div class="card"><h3>Engineer summary</h3>
    ${textarea('Engineer notes','notes',j.notes)}
    ${textarea('Faults found','faults',j.faults)}
    ${textarea('Recommendations','recommendations',j.recommendations)}
    ${selectField('Overall result','overall',['Satisfactory','Satisfactory with recommendations','Further action required'],j.overall)}
  </div>`;

  if(state.step===5) return `<div class="card"><h3>Site photographs</h3><p class="muted">Take photographs or select existing images.</p><input id="photoInput" type="file" accept="image/*" capture="environment" multiple><br><br><div class="photos">${state.photos.map((p,i)=>`<div><img src="${p}" alt="Site photograph"><button class="btn small full" data-remove-photo="${i}">Remove</button></div>`).join('')}</div></div>`;

  return `<div class="card"><h3>Customer signature</h3><p class="muted">Sign in the white box.</p><canvas id="signatureCanvas" class="signature"></canvas><br><button class="btn" data-action="clear-signature">Clear Signature</button><br><br>${field('Customer name','signedBy',j.signedBy)}${field('Engineer','engineer',j.engineer)}</div>`;
}

function renderJobs(){
  const js=jobs();
  return renderShell(`<h2 class="screen-title">Jobs</h2>${js.map(j=>`<div class="card">${jobSummary(j,false)}<button class="btn full" data-resume="${j.id}">Open Job</button></div>`).join('')||'<div class="card muted">No saved jobs.</div>'}`,'Jobs',true);
}
function renderCustomers(){
  const cs=customers();
  return renderShell(`<h2 class="screen-title">Customers</h2><div class="card"><button class="btn primary full" data-action="new-job">＋ Add Customer / Start Job</button></div>${cs.map(c=>`<div class="card"><div class="row"><div class="avatar">${escapeHtml((c.name||'?')[0])}</div><div class="grow"><b>${escapeHtml(c.name)}</b><small class="muted">${escapeHtml(c.address)}</small></div></div><p class="muted">${escapeHtml(c.manufacturer||'')} ${escapeHtml(c.panel||'')}</p><button class="btn full" data-customer="${escapeHtml(c.key)}">Start Alarm Service</button></div>`).join('')||'<div class="card muted">No customers saved.</div>'}`,'Customers',true);
}
function renderReports(){
  const list=jobs().filter(j=>j.status==='Complete');
  return renderShell(`<h2 class="screen-title">Reports</h2>${list.map(j=>`<div class="card">${jobSummary(j,false)}<button class="btn full" data-report="${j.id}">View Report</button></div>`).join('')||'<div class="card muted">No completed reports.</div>'}`,'Reports',true);
}
function renderReport(){
  const j=state.currentJob;
  if(!j) return renderShell('<div class="error">No report is open.</div>','Report',true);
  const rows=(j.devices||[]).map(d=>`<tr><td>${d.zone}</td><td>${escapeHtml(d.location)}</td><td>${escapeHtml(d.type)}</td><td>${escapeHtml(d.result)}</td><td>${escapeHtml(d.notes||'')}</td></tr>`).join('')||'<tr><td colspan="5">No device tests recorded</td></tr>';
  const body=`<div class="report"><div class="report-head"><h2>Intruder Alarm Service & Maintenance Report</h2><div>Cables Electrical Installations Limited</div></div><div class="report-body"><h3>${escapeHtml(j.customerName||'Customer')}</h3>
  ${kv('Site address',j.address)}${kv('Service date',j.serviceDate)}${kv('Visit type',j.jobType)}${kv('Engineer',j.engineer)}
  <h3>System details</h3>${kv('Manufacturer',j.manufacturer)}${kv('Panel',j.panelModel)}${kv('System type',j.systemType)}${kv('Zones',j.zoneCount)}
  <h3>Power tests</h3>${kv('Mains voltage',j.mainsV)}${kv('Battery voltage',j.batteryV)}${kv('Charger output',j.chargerV)}${kv('Standby current',j.standbyCurrent)}
  <h3>Device schedule</h3><table><tr><th>Zone</th><th>Location</th><th>Device</th><th>Result</th><th>Notes</th></tr>${rows}</table>
  <h3>Summary</h3>${kv('Overall result',j.overall)}${kv('Faults found',j.faults||'None recorded')}${kv('Recommendations',j.recommendations||'None recorded')}${kv('Next service due',j.nextService)}
  ${j.signature?`<h3>Customer signature</h3><img src="${j.signature}" style="max-width:330px;border:1px solid #bbb">`:''}
  <p style="margin-top:25px;font-size:11px">Cables Electrical Installations Limited · Established 1993 · NICEIC Domestic Installer<br>01623 512500 · cables.electrical@gmail.com · www.cables-electrical.co.uk</p></div></div>
  <div class="row no-print"><button class="btn" data-route="job">Edit</button><button class="btn" data-action="print">Print / Save PDF</button><button class="btn primary grow" data-action="complete-job">Complete Job</button></div>`;
  return renderShell(body,'Report Preview',true);
}
function renderMore(){
  return renderShell(`<h2 class="screen-title">More</h2><div class="card"><button class="btn full" data-route="settings">Company Settings</button><br><br><button class="btn full" data-action="export">Export Backup</button><br><br><button class="btn danger full" data-action="clear-draft">Clear Active Draft</button><br><br><p class="muted">Cables Pro V4.0.0</p></div>`,'More',true);
}
function renderSettings(){
  const s=storage.read('cp4_settings',{company:'Cables Electrical Installations Limited',phone:'01623 512500',email:'cables.electrical@gmail.com',web:'www.cables-electrical.co.uk'});
  return renderShell(`<h2 class="screen-title">Settings</h2><div class="card">${plainField('Company','setCompany',s.company)}${plainField('Telephone','setPhone',s.phone)}${plainField('Email','setEmail',s.email)}${plainField('Website','setWeb',s.web)}<button class="btn primary full" data-action="save-settings">Save Company Details</button></div>`,'Settings',true);
}

function render(){
  let html='';
  if(state.route==='home') html=renderHome();
  else if(state.route==='new') html=renderNew();
  else if(state.route==='job') html=renderJob();
  else if(state.route==='jobs') html=renderJobs();
  else if(state.route==='customers') html=renderCustomers();
  else if(state.route==='reports') html=renderReports();
  else if(state.route==='report') html=renderReport();
  else if(state.route==='more') html=renderMore();
  else if(state.route==='settings') html=renderSettings();
  else html=renderHome();
  $('app').innerHTML=html;
  bindEvents();
  if(state.route==='job' && state.step===6) setupSignatureCanvas();
}

function bindEvents(){
  document.querySelectorAll('[data-route]').forEach(el=>el.addEventListener('click',()=>navigate(el.dataset.route)));
  document.querySelectorAll('[data-action]').forEach(el=>el.addEventListener('click',()=>{
    const a=el.dataset.action;
    if(a==='back') back();
    else if(a==='new-job') startNewJob();
    else if(a==='next-step') nextStep();
    else if(a==='previous-step') previousStep();
    else if(a==='save-draft') saveCurrentJob('Draft');
    else if(a==='save-device') addOrUpdateDevice();
    else if(a==='next-device') nextDevice();
    else if(a==='clear-signature'){state.signatureData='';render()}
    else if(a==='complete-job') completeCurrent();
    else if(a==='print') window.print();
    else if(a==='export') exportBackup();
    else if(a==='clear-draft') clearActiveDraft();
    else if(a==='save-settings') saveSettings();
  }));
  document.querySelectorAll('[data-module]').forEach(el=>el.addEventListener('click',()=>el.dataset.module==='alarm'?startNewJob():toast('This module is prepared for a future release')));
  document.querySelectorAll('[data-resume]').forEach(el=>el.addEventListener('click',()=>resumeJob(el.dataset.resume)));
  document.querySelectorAll('[data-report]').forEach(el=>el.addEventListener('click',()=>{resumeJob(el.dataset.report);state.route='report';render()}));
  document.querySelectorAll('[data-result]').forEach(el=>el.addEventListener('click',()=>selectResult(el.dataset.result)));
  document.querySelectorAll('[data-remove-photo]').forEach(el=>el.addEventListener('click',()=>removePhoto(Number(el.dataset.removePhoto))));
  document.querySelectorAll('[data-customer]').forEach(el=>el.addEventListener('click',()=>{
    const c=customers().find(x=>x.key===el.dataset.customer); startNewJob();
    if(c){Object.assign(state.currentJob,{customerName:c.name,contactName:c.contact,address:c.address,phone:c.phone,email:c.email,manufacturer:c.manufacturer,panelModel:c.panel,nextService:c.nextService});render()}
  }));
  const photo=$('photoInput'); if(photo) photo.addEventListener('change',e=>handlePhotos(e.target.files));
}

function setupSignatureCanvas(){
  const canvas=$('signatureCanvas'); if(!canvas) return;
  const ctx=canvas.getContext('2d');
  const ratio=window.devicePixelRatio||1;
  canvas.width=canvas.clientWidth*ratio; canvas.height=canvas.clientHeight*ratio;
  ctx.scale(ratio,ratio); ctx.lineWidth=2; ctx.lineCap='round'; ctx.strokeStyle='#111';
  if(state.signatureData){
    const img=new Image(); img.onload=()=>ctx.drawImage(img,0,0,canvas.clientWidth,canvas.clientHeight); img.src=state.signatureData;
  }
  let drawing=false;
  const point=e=>{const r=canvas.getBoundingClientRect(),p=e.touches?e.touches[0]:e;return[p.clientX-r.left,p.clientY-r.top]};
  const start=e=>{drawing=true;const p=point(e);ctx.beginPath();ctx.moveTo(...p);e.preventDefault()};
  const move=e=>{if(!drawing)return;ctx.lineTo(...point(e));ctx.stroke();e.preventDefault()};
  const end=()=>{if(drawing){drawing=false;state.signatureData=canvas.toDataURL()}};
  canvas.addEventListener('mousedown',start);canvas.addEventListener('mousemove',move);canvas.addEventListener('mouseup',end);canvas.addEventListener('mouseleave',end);
  canvas.addEventListener('touchstart',start,{passive:false});canvas.addEventListener('touchmove',move,{passive:false});canvas.addEventListener('touchend',end);
}

function saveSettings(){
  storage.write('cp4_settings',{company:$('setCompany').value,phone:$('setPhone').value,email:$('setEmail').value,web:$('setWeb').value});
  toast('Settings saved');
}
function exportBackup(){
  const data={version:VERSION,exported:new Date().toISOString(),jobs:jobs(),customers:customers(),settings:storage.read('cp4_settings',{})};
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='Cables-Pro-V4-Backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();URL.revokeObjectURL(a.href);
}

function field(label,key,value,extra='',type='text',placeholder=''){return `<label class="field ${extra}">${label}<input data-field="${key}" type="${type}" value="${escapeAttr(value)}" placeholder="${escapeAttr(placeholder)}"></label>`}
function textarea(label,key,value,extra=''){return `<label class="field ${extra}">${label}<textarea data-field="${key}">${escapeHtml(value)}</textarea></label>`}
function selectField(label,key,options,value){return `<label class="field">${label}<select data-field="${key}">${options.map(o=>`<option ${o===value?'selected':''}>${escapeHtml(o)}</option>`).join('')}</select></label>`}
function plainField(label,id,value){return `<label class="field">${label}<input id="${id}" value="${escapeAttr(value)}"></label>`}
function plainTextarea(label,id,value){return `<label class="field">${label}<textarea id="${id}">${escapeHtml(value)}</textarea></label>`}
function kv(k,v){return `<div class="kv"><b>${escapeHtml(k)}</b><span>${escapeHtml(v||'—')}</span></div>`}
function jobRow(j){return `<div class="row"><div class="avatar">🛡</div><div class="grow"><b>${escapeHtml(j.customerName||'Unnamed job')}</b><small class="muted">${escapeHtml(j.jobType||'Alarm Service')} · ${new Date(j.updated||j.created).toLocaleDateString('en-GB')}</small></div><span class="badge ${j.status==='Complete'?'good':'warn'}">${escapeHtml(j.status)}</span></div>`}
function jobSummary(j,withResume){return `${jobRow(j)}${withResume?`<button class="btn primary full" data-resume="${j.id}">Resume Job</button>`:''}`}
function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function escapeAttr(v){return escapeHtml(v).replace(/`/g,'&#96;')}

window.addEventListener('error',event=>{
  console.error(event.error||event.message);
  state.error='Cables Pro encountered an error. Use More > Clear Active Draft, then try again.';
  render();
});

document.addEventListener('DOMContentLoaded',()=>{
  render();
  if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(console.warn);
});
