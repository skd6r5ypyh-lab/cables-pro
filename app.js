
'use strict';

const VERSION='7.0.0';
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
  error:'',
  customerQuery:'',
  lastAutoSave:'',
  autoSaveTimer:null,
  currentQuote:null,
  diaryDate:new Date().toISOString().slice(0,10),
  stockQuery:'',
  currentDiary:null,
  currentStock:null,
  currentRecord:null,
  currentAsset:null,
  assetQuery:''
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
function quotes(){return storage.read('cp5_quotes',[])}
function diary(){return storage.read('cp5_diary',[])}
function stock(){return storage.read('cp5_stock',defaultStock())}
function engineers(){return storage.read('cp5_engineers',[{id:'eng-lee',name:'Lee Naylor',role:'Administrator / Engineer',initials:'LN'}])}
function currentEngineer(){return storage.read('cp5_current_engineer','eng-lee')}
function saveQuotes(v){storage.write('cp5_quotes',v)}
function saveDiary(v){storage.write('cp5_diary',v)}
function saveStock(v){storage.write('cp5_stock',v)}
function saveEngineers(v){storage.write('cp5_engineers',v)}
function setCurrentEngineer(v){storage.write('cp5_current_engineer',v)}
function defaultStock(){return [
{id:'stk-1',name:'12V 7Ah Alarm Battery',sku:'BAT-7AH',qty:4,min:2,cost:18.5,sell:36},
{id:'stk-2',name:'Wireless PIR Detector',sku:'PIR-W',qty:3,min:2,cost:31,sell:69},
{id:'stk-3',name:'External Sounder Battery',sku:'BELL-BAT',qty:2,min:1,cost:11.5,sell:28},
{id:'stk-4',name:'Cat6 Data Module',sku:'CAT6-MOD',qty:10,min:4,cost:3.4,sell:12}
]}
function activeJobId(){return storage.read('cp4_active_job','')}
function technicalRecords(){return storage.read('cp6_records',[])}
function assets(){return storage.read('cp6_assets',[])}
function saveTechnicalRecords(v){storage.write('cp6_records',v)}
function saveAssets(v){storage.write('cp6_assets',v)}
function invoices(){return storage.read('cp7_invoices',[])}
function contracts(){return storage.read('cp7_contracts',[])}
function saveInvoices(v){storage.write('cp7_invoices',v)}
function saveContracts(v){storage.write('cp7_contracts',v)}

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


const moduleDefinitions={
  electrical:{title:'Electrical Inspection',icon:'⚡',types:['EICR Inspection Record','Minor Works Record','Installation Record','Fault Finding'],checks:['Supply and earthing arrangement recorded','Main protective bonding inspected','Consumer unit condition inspected','RCD/RCBO protection checked','SPD provision recorded','Accessible accessories inspected','Polarity checks completed','Test results reviewed','Labelling and notices checked','Installation left safe']},
  cctv:{title:'CCTV Service',icon:'📹',types:['Annual Maintenance','Fault Visit','Installation','Commissioning'],checks:['Recorder operational','Date and time correct','Hard drive status checked','Camera images checked','Night images checked','Playback tested','Remote access tested','Network connection checked','Power supplies checked','System left operational']},
  fire:{title:'Fire Alarm Inspection',icon:'🔥',types:['Routine Inspection','Six-Month Service','Annual Service','Fault Visit'],checks:['Control panel normal','Mains supply healthy','Standby batteries checked','Manual call points sampled','Automatic detectors sampled','Sounders tested','Visual alarm devices tested','Fault indicators checked','Logbook updated','Responsible person informed']},
  emergency:{title:'Emergency Lighting Test',icon:'🚪',types:['Monthly Functional Test','Annual Duration Test','Fault Visit','Installation'],checks:['Indicator lamps checked','Fittings visually inspected','Functional test completed','Duration test completed where applicable','Charge indicators restored','Failed fittings identified','Escape routes adequately covered','Test key facilities checked','Logbook updated','System restored to normal']},
  pat:{title:'PAT Testing',icon:'🔌',types:['Portable Appliance Test','Visual Inspection','Retest Visit'],checks:['Plug condition inspected','Flexible cable inspected','Appliance casing inspected','Fuse rating checked','Earth continuity completed where applicable','Insulation test completed where applicable','Polarity checked where applicable','Functional test completed','Label applied','Failed appliance isolated or reported']},
  network:{title:'Network & Wi-Fi',icon:'📶',types:['Installation','Fault Visit','Wi-Fi Survey','Maintenance'],checks:['Router/controller online','Internet service tested','Switches operational','PoE budget checked','Access points online','SSID tested','Coverage checked','Ethernet links tested','Cabinet/patching labelled','Customer handover completed']},
  ev:{title:'EV Charger Record',icon:'🚗',types:['Installation','Commissioning','Maintenance','Fault Visit'],checks:['Supply characteristics recorded','Dedicated circuit confirmed','Protective device recorded','RCD protection recorded','Open-PEN protection recorded where applicable','Cable route inspected','Earth fault loop result recorded','Insulation resistance recorded','Functional charging test completed','Customer handover completed']}
};

function nextTechnicalNumber(key){
  const year=new Date().getFullYear();
  const prefix={electrical:'EL',cctv:'CC',fire:'FA',emergency:'EM',pat:'PAT',network:'NW',ev:'EV'}[key]||'TR';
  const nums=technicalRecords().map(r=>String(r.number||'')).filter(n=>n.startsWith(prefix+'-'+year+'-')).map(n=>Number(n.split('-').pop())).filter(Number.isFinite);
  return `${prefix}-${year}-${String((nums.length?Math.max(...nums):0)+1).padStart(4,'0')}`;
}
function blankTechnicalRecord(moduleKey){
  const d=moduleDefinitions[moduleKey];
  const eng=engineers().find(e=>e.id===currentEngineer());
  return {id:'REC-'+Date.now(),module:moduleKey,number:nextTechnicalNumber(moduleKey),created:new Date().toISOString(),updated:new Date().toISOString(),status:'Draft',
    customer:'',contact:'',address:'',phone:'',email:'',date:new Date().toISOString().slice(0,10),recordType:d.types[0],engineer:eng?eng.name:'Lee Naylor',
    systemMake:'',systemModel:'',location:'',reference:'',assetCode:'',checks:[],readings:'',defects:'',recommendations:'',parts:'',result:'Satisfactory',signature:'',signedBy:'',photos:[]};
}
function startTechnicalRecord(moduleKey){
  state.currentRecord=blankTechnicalRecord(moduleKey);
  navigate('technical');
}

function nextReportNumber(){
  const year=new Date().getFullYear();
  const existing=jobs()
    .map(j=>String(j.reportNumber||''))
    .filter(n=>n.startsWith('CP-'+year+'-'))
    .map(n=>Number(n.split('-').pop()))
    .filter(Number.isFinite);
  const next=(existing.length?Math.max(...existing):0)+1;
  return `CP-${year}-${String(next).padStart(4,'0')}`;
}

function blankJob(){
  const due=new Date(); due.setFullYear(due.getFullYear()+1);
  return {
    id:'JOB-'+Date.now(),
    reportNumber:nextReportNumber(),
    created:new Date().toISOString(),
    updated:new Date().toISOString(),
    status:'Draft',
    arrivalTime:'',
    departureTime:'',
    timeOnSite:'',
    partsUsed:'',
    labourHours:'',labourRate:45,materialsCost:'',quotedValue:'',paymentStatus:'Not invoiced',
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

function silentAutoSave(){
  if(!state.currentJob || state.route!=='job') return;
  try{
    syncVisibleFields();
    state.currentJob.status='Draft';
    state.currentJob.updated=new Date().toISOString();
    state.currentJob.photos=[...state.photos];
    state.currentJob.signature=state.signatureData;
    const list=jobs();
    const i=list.findIndex(j=>j.id===state.currentJob.id);
    if(i>=0) list[i]=state.currentJob; else list.unshift(state.currentJob);
    saveJobs(list);
    setActiveJob(state.currentJob.id);
    state.lastAutoSave=new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
    const indicator=document.getElementById('autosaveIndicator');
    if(indicator) indicator.textContent='Saved '+state.lastAutoSave;
  }catch(error){
    console.warn('Autosave failed',error);
  }
}

function startAutoSave(){
  stopAutoSave();
  state.autoSaveTimer=setInterval(silentAutoSave,5000);
}
function stopAutoSave(){
  if(state.autoSaveTimer){
    clearInterval(state.autoSaveTimer);
    state.autoSaveTimer=null;
  }
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
  stopAutoSave();
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
  if(state.currentJob.arrivalTime && state.currentJob.departureTime){
    const [ah,am]=state.currentJob.arrivalTime.split(':').map(Number);
    const [dh,dm]=state.currentJob.departureTime.split(':').map(Number);
    let mins=(dh*60+dm)-(ah*60+am);
    if(mins<0) mins+=24*60;
    state.currentJob.timeOnSite=`${Math.floor(mins/60)}h ${mins%60}m`;
  }
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
    ${navButton('diary','📅','Diary')}
    ${navButton('more','•••','More')}
  </nav>
  </div>`;
}
function navButton(route,icon,label){
  return `<button class="${state.route===route?'active':''}" data-route="${route}"><span>${icon}</span>${label}</button>`;
}

function renderHome(){
  const js=jobs(), cs=customers(), qs=quotes(), st=stock();
  const active=js.find(j=>j.id===activeJobId())||js.find(j=>j.status==='Draft');
  const today=new Date().toISOString().slice(0,10), month=today.slice(0,7);
  const todayDiary=diary().filter(e=>e.date===today).sort((a,b)=>(a.time||'').localeCompare(b.time||''));
  const turnover=js.filter(j=>j.status==='Complete'&&(j.serviceDate||'').startsWith(month)).reduce((n,j)=>n+Number(j.quotedValue||0),0);
  const outstanding=js.filter(j=>j.paymentStatus==='Invoice outstanding').reduce((n,j)=>n+Number(j.quotedValue||0),0);
  const lowStock=st.filter(x=>Number(x.qty)<=Number(x.min));
  const sent=qs.filter(q=>q.status==='Sent');
  const body=`<div class="hero"><div class="eyebrow">Cables Electrical Installations Limited</div><h2>Welcome back, Lee.</h2><p class="muted">Jobs, diary, quotations, customers and stock in one professional workspace.</p><div class="two"><button class="btn primary full" data-action="new-job">＋ Start Job</button><button class="btn full" data-action="new-quote">＋ New Quote</button></div></div>
  <div class="stats"><div class="card stat"><strong>${todayDiary.length}</strong><span>Today</span></div><div class="card stat"><strong>£${turnover.toFixed(0)}</strong><span>Month Value</span></div><div class="card stat"><strong>£${outstanding.toFixed(0)}</strong><span>Outstanding</span></div><div class="card stat"><strong>${lowStock.length}</strong><span>Low Stock</span></div></div>
  <div class="section-head"><h3>Continue current job</h3></div><div class="card">${active?jobSummary(active,true):'<p class="muted">No active job. Start a new job when ready.</p>'}</div>
  <div class="section-head"><h3>Today's diary</h3><button class="btn small" data-route="diary">Open Diary</button></div><div class="card">${todayDiary.map(e=>diaryRow(e)).join('')||'<p class="muted">Nothing booked today.</p>'}</div>
  <div class="section-head"><h3>Business attention</h3></div><div class="grid"><button class="module" data-route="quotes"><div class="ico">£</div><b>${sent.length} Quotes Awaiting Decision</b><span>Review sent quotations and convert accepted work into jobs.</span></button><button class="module" data-route="stock"><div class="ico">📦</div><b>${lowStock.length} Low Stock Items</b><span>Check van and workshop stock.</span></button></div>`;
  return renderShell(body);
}

function renderNew(){
  const modules=[
    ['🛡️','Intruder Alarm','Annual service, fault visit, takeover or commissioning','alarm'],
    ['⚡','Electrical','Inspection, minor works, installation and fault finding','electrical'],
    ['📹','CCTV','Installation, commissioning and maintenance','cctv'],
    ['🔥','Fire Alarm','Routine inspection, servicing and fault visits','fire'],
    ['🚪','Emergency Lighting','Monthly functional and annual duration tests','emergency'],
    ['🔌','PAT Testing','Portable appliance inspection and test records','pat'],
    ['📶','Network & Wi-Fi','Starlink, access points, switches and cabling','network'],
    ['🚗','EV Charger','Installation, commissioning and maintenance','ev'],
    ['£','Quotation','Professional customer quotation','quote']
  ];
  return renderShell(`<div class="hero"><div class="eyebrow">Engineer Edition</div><h2>What are you working on?</h2><p class="muted">Select a live service module to begin an offline record.</p></div><div class="grid">${modules.map(m=>`<button class="module" data-module="${m[3]}"><div class="ico">${m[0]}</div><b>${m[1]}</b><span>${m[2]}</span><small class="live-label">LIVE</small></button>`).join('')}</div>`,'Start New Job',true);
}

function renderJob(){
  if(!state.currentJob){return renderShell(`<div class="error">No job is open.</div><button class="btn primary" data-action="new-job">Start New Job</button>`,'Alarm Service',true)}
  const pct=(state.step/(stepNames.length-1))*100;
  const body=`<div class="steps">${stepNames.map((n,i)=>`<span class="step-chip ${i===state.step?'active':''}">${i+1}. ${n}</span>`).join('')}</div>
  <div class="card"><div class="row"><div class="grow"><div class="muted">Job progress</div></div><small id="autosaveIndicator" class="muted">${state.lastAutoSave?'Saved '+state.lastAutoSave:'Autosave active'}</small></div><div class="progress"><i style="width:${pct}%"></i></div></div>
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
    ${field('Arrival time','arrivalTime',j.arrivalTime,'','time')}
    ${field('Departure time','departureTime',j.departureTime,'','time')}
    ${field('Report number','reportNumber',j.reportNumber)}
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
    ${textarea('Parts and materials used','partsUsed',j.partsUsed)}
    <div class="two">${field('Labour hours','labourHours',j.labourHours,'','number')}${field('Labour rate (£)','labourRate',j.labourRate,'','number')}${field('Materials cost (£)','materialsCost',j.materialsCost,'','number')}${field('Job value (£)','quotedValue',j.quotedValue,'','number')}</div>
    ${field('Time on site','timeOnSite',j.timeOnSite||'')}
    ${selectField('Payment status','paymentStatus',['Not invoiced','Invoice sent','Invoice outstanding','Paid'],j.paymentStatus)}
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
  const query=state.customerQuery.trim().toLowerCase();
  const cs=customers().filter(c=>(c.name+' '+c.address+' '+(c.phone||'')).toLowerCase().includes(query));
  return renderShell(`<h2 class="screen-title">Customers</h2>
  <div class="card">
    <label class="field">Search customers<input id="customerSearch" value="${escapeAttr(state.customerQuery)}" placeholder="Name, address or telephone"></label>
    <button class="btn primary full" data-action="new-job">＋ Add Customer / Start Job</button>
  </div>
  ${cs.map(c=>`<div class="card"><div class="row"><div class="avatar">${escapeHtml((c.name||'?')[0])}</div><div class="grow"><b>${escapeHtml(c.name)}</b><small class="muted">${escapeHtml(c.address)}</small></div></div><p class="muted">${escapeHtml(c.manufacturer||'')} ${escapeHtml(c.panel||'')}</p><button class="btn full" data-customer="${escapeHtml(c.key)}">Start Alarm Service</button></div>`).join('')||'<div class="card muted">No customers found.</div>'}`,'Customers',true);
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
  ${kv('Report number',j.reportNumber)}${kv('Site address',j.address)}${kv('Service date',j.serviceDate)}${kv('Visit type',j.jobType)}${kv('Engineer',j.engineer)}${kv('Time on site',j.timeOnSite)}
  <h3>System details</h3>${kv('Manufacturer',j.manufacturer)}${kv('Panel',j.panelModel)}${kv('System type',j.systemType)}${kv('Zones',j.zoneCount)}
  <h3>Power tests</h3>${kv('Mains voltage',j.mainsV)}${kv('Battery voltage',j.batteryV)}${kv('Charger output',j.chargerV)}${kv('Standby current',j.standbyCurrent)}
  <h3>Device schedule</h3><table><tr><th>Zone</th><th>Location</th><th>Device</th><th>Result</th><th>Notes</th></tr>${rows}</table>
  <h3>Summary</h3>${kv('Overall result',j.overall)}${kv('Faults found',j.faults||'None recorded')}${kv('Recommendations',j.recommendations||'None recorded')}${kv('Parts used',j.partsUsed||'None recorded')}${kv('Job value',j.quotedValue?`£${Number(j.quotedValue).toFixed(2)}`:'—')}${kv('Payment status',j.paymentStatus)}${kv('Next service due',j.nextService)}
  ${j.signature?`<h3>Customer signature</h3><img src="${j.signature}" style="max-width:330px;border:1px solid #bbb">`:''}
  <p style="margin-top:25px;font-size:11px">Cables Electrical Installations Limited · Established 1993 · NICEIC Domestic Installer<br>01623 512500 · cables.electrical@gmail.com · www.cables-electrical.co.uk</p></div></div>
  <div class="row no-print"><button class="btn" data-route="job">Edit</button><button class="btn" data-action="print">Print / Save PDF</button><button class="btn primary grow" data-action="complete-job">Complete Job</button></div>`;
  return renderShell(body,'Report Preview',true);
}
function renderMore(){return renderShell(`<h2 class="screen-title">Business Tools</h2><div class="grid">
<button class="module" data-route="quotes"><div class="ico">£</div><b>Quotations</b><span>Create, email and convert quotes.</span></button>
<button class="module" data-route="reports"><div class="ico">📄</div><b>Reports</b><span>Completed reports.</span></button>
<button class="module" data-route="stock"><div class="ico">📦</div><b>Stock</b><span>Van stock and low-stock alerts.</span></button>
<button class="module" data-route="engineers"><div class="ico">👷</div><b>Engineers</b><span>Local engineer profiles.</span></button>
<button class="module" data-route="settings"><div class="ico">⚙</div><b>Settings</b><span>Company details.</span></button>
<button class="module" data-action="export"><div class="ico">⬇</div><b>Export Backup</b><span>Download all local data.</span></button></div><div class="card"><button class="btn danger full" data-action="clear-draft">Clear Active Draft</button><br><br><p class="muted">Cables Pro V7.0.0 · Local-first business suite</p></div>`,'Business Tools',true)}

function diaryRow(e){return `<div class="row"><div class="avatar">📅</div><div class="grow"><b>${escapeHtml(e.time||'All day')} · ${escapeHtml(e.title)}</b><small class="muted">${escapeHtml(e.customer||'')} ${e.address?'· '+escapeHtml(e.address):''}</small></div><button class="btn small" data-diary-open="${e.id}">Open</button></div>`}
function renderDiary(){const items=diary().filter(e=>e.date===state.diaryDate).sort((a,b)=>(a.time||'').localeCompare(b.time||''));return renderShell(`<h2 class="screen-title">Diary</h2><div class="card"><label class="field">Date<input id="diaryDate" type="date" value="${state.diaryDate}"></label><button class="btn primary full" data-action="add-diary">＋ Add Appointment</button></div><div class="card">${items.map(diaryRow).join('')||'<p class="muted">No appointments on this date.</p>'}</div>`,'Diary',true)}
function renderDiaryEdit(){const e=state.currentDiary||{id:'D-'+Date.now(),date:state.diaryDate,time:'09:00',duration:'60',title:'Service Visit',customer:'',address:'',notes:'',status:'Booked'};state.currentDiary=e;return renderShell(`<h2 class="screen-title">Appointment</h2><div class="card">${plainField('Title','diaryTitle',e.title)}${plainField('Date','diaryEditDate',e.date)}${plainField('Time','diaryTime',e.time)}${plainField('Duration minutes','diaryDuration',e.duration)}${plainField('Customer','diaryCustomer',e.customer)}${plainTextarea('Address','diaryAddress',e.address)}${plainTextarea('Notes','diaryNotes',e.notes)}<label class="field">Status<select id="diaryStatus">${['Booked','Confirmed','Completed','Cancelled'].map(x=>`<option ${x===e.status?'selected':''}>${x}</option>`).join('')}</select></label><div class="row"><button class="btn danger" data-action="delete-diary">Delete</button><button class="btn primary grow" data-action="save-diary">Save Appointment</button></div></div>`,'Appointment',true)}
function blankQuote(){return{id:'Q-'+Date.now(),number:nextQuoteNumber(),date:new Date().toISOString().slice(0,10),status:'Draft',customer:'',address:'',email:'',description:'',items:[{description:'Labour and materials',qty:1,unit:0}],notes:'All work will be completed in accordance with the applicable requirements.',vatRate:0}}
function nextQuoteNumber(){const y=new Date().getFullYear(),a=quotes().map(q=>String(q.number||'')).filter(n=>n.startsWith('CQ-'+y+'-')).map(n=>Number(n.split('-').pop())).filter(Number.isFinite);return`CQ-${y}-${String((a.length?Math.max(...a):0)+1).padStart(4,'0')}`}
function quoteTotal(q){const net=(q.items||[]).reduce((n,i)=>n+Number(i.qty||0)*Number(i.unit||0),0),vat=net*Number(q.vatRate||0)/100;return{net,vat,total:net+vat}}
function renderQuotes(){return renderShell(`<h2 class="screen-title">Quotations</h2><div class="card"><button class="btn primary full" data-action="new-quote">＋ New Quotation</button></div>${quotes().map(q=>{const t=quoteTotal(q);return`<div class="card"><div class="row"><div class="avatar">£</div><div class="grow"><b>${escapeHtml(q.customer||'Unnamed quotation')}</b><small class="muted">${escapeHtml(q.number)} · £${t.total.toFixed(2)}</small></div><span class="badge ${q.status==='Accepted'?'good':q.status==='Declined'?'bad':'warn'}">${escapeHtml(q.status)}</span></div><button class="btn full" data-quote="${q.id}">Open Quote</button></div>`}).join('')||'<div class="card muted">No quotations saved.</div>'}`,'Quotations',true)}
function renderQuote(){const q=state.currentQuote||blankQuote();state.currentQuote=q;const t=quoteTotal(q);return renderShell(`<h2 class="screen-title">Quotation</h2><div class="card">${plainField('Quote number','quoteNumber',q.number)}${plainField('Date','quoteDate',q.date)}${plainField('Customer','quoteCustomer',q.customer)}${plainTextarea('Site address','quoteAddress',q.address)}${plainField('Customer email','quoteEmail',q.email)}${plainTextarea('Description of work','quoteDescription',q.description)}<h3>Items</h3>${q.items.map((i,n)=>`<div class="card quote-item">${plainField('Description',`qi-desc-${n}`,i.description)}${plainField('Quantity',`qi-qty-${n}`,i.qty)}${plainField('Unit price (£)',`qi-unit-${n}`,i.unit)}<button class="btn small danger" data-remove-quote-item="${n}">Remove</button></div>`).join('')}<button class="btn full" data-action="add-quote-item">＋ Add Item</button><br><br>${plainField('VAT rate %','quoteVat',q.vatRate)}${plainTextarea('Terms / notes','quoteNotes',q.notes)}<label class="field">Status<select id="quoteStatus">${['Draft','Sent','Accepted','Declined','Expired'].map(x=>`<option ${x===q.status?'selected':''}>${x}</option>`).join('')}</select></label><div class="card">${kv('Net',`£${t.net.toFixed(2)}`)}${kv('VAT',`£${t.vat.toFixed(2)}`)}${kv('Total',`£${t.total.toFixed(2)}`)}</div><div class="row"><button class="btn" data-action="email-quote">Email</button><button class="btn" data-action="quote-to-job">Convert to Job</button><button class="btn primary grow" data-action="save-quote">Save Quote</button></div></div>`,'Quotation',true)}
function renderStock(){const q=state.stockQuery.toLowerCase(),list=stock().filter(x=>(x.name+' '+x.sku).toLowerCase().includes(q));return renderShell(`<h2 class="screen-title">Stock Control</h2><div class="card"><label class="field">Search stock<input id="stockSearch" value="${escapeAttr(state.stockQuery)}"></label><button class="btn primary full" data-action="add-stock">＋ Add Stock Item</button></div>${list.map(x=>`<div class="card"><div class="row"><div class="avatar">📦</div><div class="grow"><b>${escapeHtml(x.name)}</b><small class="muted">${escapeHtml(x.sku)} · Cost £${Number(x.cost).toFixed(2)} · Sell £${Number(x.sell).toFixed(2)}</small></div><span class="badge ${Number(x.qty)<=Number(x.min)?'bad':'good'}">${x.qty} in stock</span></div><div class="row"><button class="btn small" data-stock-adjust="${x.id}" data-delta="-1">−1</button><button class="btn small" data-stock-adjust="${x.id}" data-delta="1">+1</button><button class="btn small grow" data-stock-edit="${x.id}">Edit</button></div></div>`).join('')}`,'Stock Control',true)}
function renderStockEdit(){const x=state.currentStock||{id:'STK-'+Date.now(),name:'',sku:'',qty:0,min:1,cost:0,sell:0};state.currentStock=x;return renderShell(`<h2 class="screen-title">Stock Item</h2><div class="card">${plainField('Item name','stockName',x.name)}${plainField('SKU / code','stockSku',x.sku)}${plainField('Quantity','stockQty',x.qty)}${plainField('Minimum level','stockMin',x.min)}${plainField('Cost price (£)','stockCost',x.cost)}${plainField('Selling price (£)','stockSell',x.sell)}<button class="btn primary full" data-action="save-stock">Save Stock Item</button></div>`,'Stock Item',true)}
function renderEngineers(){const a=currentEngineer();return renderShell(`<h2 class="screen-title">Engineers</h2><div class="card"><button class="btn primary full" data-action="add-engineer">＋ Add Engineer</button></div>${engineers().map(e=>`<div class="card"><div class="row"><div class="avatar">${escapeHtml(e.initials)}</div><div class="grow"><b>${escapeHtml(e.name)}</b><small class="muted">${escapeHtml(e.role)}</small></div><span class="badge ${e.id===a?'good':'warn'}">${e.id===a?'Active':'Available'}</span></div><button class="btn full" data-engineer="${e.id}">Use This Profile</button></div>`).join('')}`,'Engineers',true)}


function recordField(label,key,value,type='text'){return `<label class="field">${label}<input data-record-field="${key}" type="${type}" value="${escapeAttr(value||'')}"></label>`}
function recordArea(label,key,value){return `<label class="field">${label}<textarea data-record-field="${key}" rows="4">${escapeHtml(value||'')}</textarea></label>`}
function syncTechnicalRecord(){
  if(!state.currentRecord)return;
  document.querySelectorAll('[data-record-field]').forEach(el=>state.currentRecord[el.dataset.recordField]=el.value);
  state.currentRecord.checks=[...document.querySelectorAll('[data-record-check]:checked')].map(x=>x.value);
  state.currentRecord.updated=new Date().toISOString();
}
function saveTechnicalRecord(status='Draft'){
  syncTechnicalRecord(); if(!state.currentRecord)return;
  state.currentRecord.status=status;
  const list=technicalRecords(),i=list.findIndex(x=>x.id===state.currentRecord.id);
  if(i>=0)list[i]=state.currentRecord;else list.unshift(state.currentRecord);
  saveTechnicalRecords(list);toast(status==='Complete'?'Record completed':'Record saved');
  if(status==='Complete')navigate('technical-preview');else render();
}
function renderTechnical(){
  const r=state.currentRecord;if(!r)return renderShell('<div class="card">No technical record is open.</div>','Technical Record',true);
  const d=moduleDefinitions[r.module];
  return renderShell(`<div class="hero compact"><div class="eyebrow">${d.icon} ${d.title}</div><h2>${escapeHtml(r.number)}</h2><p class="muted">Offline record · automatic local saving when you press Save Draft</p></div>
  <div class="card"><h3>Customer and visit</h3><div class="two">
    ${recordField('Customer / company','customer',r.customer)}
    ${recordField('Contact','contact',r.contact)}
    ${recordArea('Site address','address',r.address)}
    ${recordField('Telephone','phone',r.phone,'tel')}
    ${recordField('Email','email',r.email,'email')}
    ${recordField('Inspection date','date',r.date,'date')}
    <label class="field">Record type<select data-record-field="recordType">${d.types.map(x=>`<option ${x===r.recordType?'selected':''}>${x}</option>`).join('')}</select></label>
    ${recordField('Engineer','engineer',r.engineer)}
  </div></div>
  <div class="card"><h3>System / installation</h3><div class="two">
    ${recordField('Manufacturer / make','systemMake',r.systemMake)}
    ${recordField('Model / type','systemModel',r.systemModel)}
    ${recordField('Equipment location','location',r.location)}
    ${recordField('Customer reference','reference',r.reference)}
    ${recordField('Asset / QR code','assetCode',r.assetCode)}
  </div><button class="btn full" data-action="voice-note">🎙 Dictate into defects</button></div>
  <div class="card"><h3>Inspection checklist</h3>${d.checks.map(c=>`<label class="row checklist-row"><input type="checkbox" data-record-check value="${escapeAttr(c)}" ${(r.checks||[]).includes(c)?'checked':''}><div class="grow"><b>${escapeHtml(c)}</b></div></label>`).join('')}</div>
  <div class="card"><h3>Results and observations</h3>
    ${recordArea('Measurements / test results','readings',r.readings)}
    ${recordArea('Defects / observations','defects',r.defects)}
    ${recordArea('Recommendations','recommendations',r.recommendations)}
    ${recordArea('Parts and materials used','parts',r.parts)}
    <label class="field">Overall result<select data-record-field="result">${['Satisfactory','Satisfactory with recommendations','Further action required','Unsatisfactory'].map(x=>`<option ${x===r.result?'selected':''}>${x}</option>`).join('')}</select></label>
    ${recordField('Customer / responsible person','signedBy',r.signedBy)}
  </div>
  <div class="row"><button class="btn" data-action="save-technical">Save Draft</button><button class="btn primary grow" data-action="complete-technical">Complete & Preview</button></div>`,'Technical Record',true);
}
function renderTechnicalRecords(){
  const list=technicalRecords();
  return renderShell(`<h2 class="screen-title">Technical Records</h2><div class="card"><button class="btn primary full" data-route="new">＋ New Technical Record</button></div>${list.map(r=>{const d=moduleDefinitions[r.module]||{icon:'🗂',title:'Technical'};return `<div class="card"><div class="row"><div class="avatar">${d.icon}</div><div class="grow"><b>${escapeHtml(r.customer||'Unnamed customer')}</b><small class="muted">${escapeHtml(r.number)} · ${escapeHtml(d.title)} · ${escapeHtml(r.date)}</small></div><span class="badge ${r.status==='Complete'?'good':'warn'}">${escapeHtml(r.status)}</span></div><button class="btn full" data-open-record="${r.id}">Open Record</button></div>`}).join('')||'<div class="card muted">No technical records yet.</div>'}`,'Technical Records',true);
}
function renderTechnicalPreview(){
  const r=state.currentRecord;if(!r)return renderTechnicalRecords();
  const d=moduleDefinitions[r.module],settings=storage.read('cp4_settings',{company:'Cables Electrical Installations Limited',phone:'01623 512500',email:'cables.electrical@gmail.com',web:'www.cables-electrical.co.uk'});
  return renderShell(`<article class="report card"><div class="report-head"><img src="logo.png"><div><h2>${escapeHtml(settings.company)}</h2><p>${escapeHtml(settings.phone)} · ${escapeHtml(settings.email)}<br>${escapeHtml(settings.web)}</p></div></div><hr>
  <h1>${d.icon} ${escapeHtml(d.title)}</h1><h3>${escapeHtml(r.number)}</h3>
  ${kv('Customer',r.customer)}${kv('Site address',r.address)}${kv('Inspection date',r.date)}${kv('Record type',r.recordType)}${kv('Engineer',r.engineer)}
  <h3>System / installation</h3>${kv('Make',r.systemMake)}${kv('Model',r.systemModel)}${kv('Location',r.location)}${kv('Asset code',r.assetCode)}
  <h3>Inspection checklist</h3><ul>${(r.checks||[]).map(x=>`<li>✓ ${escapeHtml(x)}</li>`).join('')||'<li>No checks recorded</li>'}</ul>
  <h3>Measurements / test results</h3><p>${nl2br(r.readings||'None recorded')}</p>
  <h3>Defects / observations</h3><p>${nl2br(r.defects||'None recorded')}</p>
  <h3>Recommendations</h3><p>${nl2br(r.recommendations||'None recorded')}</p>
  <h3>Overall result</h3><div class="result-banner ${r.result==='Satisfactory'?'ok':'attention'}">${escapeHtml(r.result)}</div>
  <p><b>Responsible person:</b> ${escapeHtml(r.signedBy||'Not recorded')}</p>
  <p class="disclaimer">This is an engineer’s field record. Where a prescribed statutory or scheme-provider certificate is required, complete and issue that certificate using the appropriate approved certification process.</p>
  </article><div class="row no-print"><button class="btn" data-action="edit-technical">Edit</button><button class="btn primary grow" data-action="print">Print / Save PDF</button></div>`,'Record Preview',true);
}
function blankAsset(){const due=new Date();due.setFullYear(due.getFullYear()+1);return{id:'AS-'+Date.now(),code:'ASSET-'+String(Date.now()).slice(-6),category:'Intruder Alarm',customer:'',address:'',location:'',make:'',model:'',serial:'',installed:'',lastService:new Date().toISOString().slice(0,10),nextService:due.toISOString().slice(0,10),status:'Operational',notes:''}}
function renderAssets(){
 const q=state.assetQuery.toLowerCase(),list=assets().filter(a=>(a.code+' '+a.customer+' '+a.make+' '+a.model+' '+a.serial).toLowerCase().includes(q));
 return renderShell(`<h2 class="screen-title">Asset Register</h2><div class="card"><label class="field">Search assets<input id="assetSearch" value="${escapeAttr(state.assetQuery)}" placeholder="Code, customer, make or serial"></label><button class="btn primary full" data-action="new-asset">＋ Add Asset</button></div>${list.map(a=>`<div class="card"><div class="row"><div class="avatar">🏷</div><div class="grow"><b>${escapeHtml(a.customer||a.code)}</b><small class="muted">${escapeHtml(a.code)} · ${escapeHtml(a.category)} · ${escapeHtml(a.make)} ${escapeHtml(a.model)}</small></div><span class="badge ${a.status==='Operational'?'good':'warn'}">${escapeHtml(a.status)}</span></div><button class="btn full" data-open-asset="${a.id}">Open Asset</button></div>`).join('')||'<div class="card muted">No assets found.</div>'}`,'Asset Register',true);
}
function renderAssetEdit(){
 const a=state.currentAsset||blankAsset();state.currentAsset=a;
 return renderShell(`<h2 class="screen-title">Asset</h2><div class="card">
 ${plainField('Asset / QR code','assetCodeEdit',a.code)}${plainField('Customer','assetCustomer',a.customer)}${plainTextarea('Site address','assetAddress',a.address)}${plainField('Equipment location','assetLocation',a.location)}
 <label class="field">Category<select id="assetCategory">${['Intruder Alarm','CCTV','Fire Alarm','Emergency Lighting','Electrical','EV Charger','Network & Wi-Fi','Portable Appliance'].map(x=>`<option ${x===a.category?'selected':''}>${x}</option>`).join('')}</select></label>
 ${plainField('Make','assetMake',a.make)}${plainField('Model','assetModel',a.model)}${plainField('Serial number','assetSerial',a.serial)}${plainField('Installed date','assetInstalled',a.installed)}
 ${plainField('Last service','assetLastService',a.lastService)}${plainField('Next service','assetNextService',a.nextService)}
 <label class="field">Status<select id="assetStatus">${['Operational','Attention required','Out of service','Removed'].map(x=>`<option ${x===a.status?'selected':''}>${x}</option>`).join('')}</select></label>
 ${plainTextarea('Notes','assetNotes',a.notes)}<button class="btn primary full" data-action="save-asset">Save Asset</button></div>`,'Asset',true);
}
function saveAsset(){
 const a=state.currentAsset;Object.assign(a,{code:$('assetCodeEdit').value,customer:$('assetCustomer').value,address:$('assetAddress').value,location:$('assetLocation').value,category:$('assetCategory').value,make:$('assetMake').value,model:$('assetModel').value,serial:$('assetSerial').value,installed:$('assetInstalled').value,lastService:$('assetLastService').value,nextService:$('assetNextService').value,status:$('assetStatus').value,notes:$('assetNotes').value});
 const list=assets(),i=list.findIndex(x=>x.id===a.id);if(i>=0)list[i]=a;else list.unshift(a);saveAssets(list);toast('Asset saved');navigate('assets');
}
function voiceNote(){
 const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!SpeechRecognition){toast('Voice dictation is not supported in this browser');return}
 syncTechnicalRecord();const rec=new SpeechRecognition();rec.lang='en-GB';rec.interimResults=false;toast('Listening…');
 rec.onresult=e=>{state.currentRecord.defects=((state.currentRecord.defects||'')+' '+e.results[0][0].transcript).trim();render()};
 rec.onerror=()=>toast('Voice dictation stopped');rec.start();
}


function cp7Invoices(){return invoices()}
function cp7Contracts(){return contracts()}
function cp7Next(prefix,list){const y=new Date().getFullYear(),n=list.map(x=>String(x.number||'')).filter(x=>x.startsWith(prefix+'-'+y+'-')).map(x=>Number(x.split('-').pop())).filter(Number.isFinite);return `${prefix}-${y}-${String((n.length?Math.max(...n):0)+1).padStart(4,'0')}`}
function cp7Money(v){return `£${Number(v||0).toFixed(2)}`}
function renderOffice(){const inv=cp7Invoices(),con=cp7Contracts(),today=new Date().toISOString().slice(0,10),over=inv.filter(x=>x.status!=='Paid'&&x.due&&x.due<today),due=con.filter(x=>x.status==='Active'&&x.nextVisit&&x.nextVisit<=today);return renderShell(`<div class="hero"><div class="eyebrow">V7 Office & Workflow Edition</div><h2>Business control centre</h2><p class="muted">Search every customer record and manage recurring work and payments.</p><label class="field">Global search<input id="cp7Search" placeholder="Customer, address, report, asset, quote or invoice"></label><div id="cp7Results"></div></div><div class="stats"><div class="card stat"><strong>${over.length}</strong><span>Overdue invoices</span></div><div class="card stat"><strong>${due.length}</strong><span>Contracts due</span></div><div class="card stat"><strong>${inv.length}</strong><span>Invoices</span></div><div class="card stat"><strong>${con.length}</strong><span>Contracts</span></div></div><div class="grid"><button class="module" data-route="cp7-invoices"><div class="ico">🧾</div><b>Invoices</b><span>Create invoices and track payment.</span></button><button class="module" data-route="cp7-contracts"><div class="ico">🔁</div><b>Service Contracts</b><span>Recurring services and next visits.</span></button><button class="module" data-route="customers"><div class="ico">👥</div><b>Customer Timelines</b><span>Open a customer and review all linked activity.</span></button></div>`,'V7 Office',true)}
function cp7Search(q){q=(q||'').toLowerCase().trim();if(!q)return '';let r=[];customers().filter(x=>(x.name+' '+x.address).toLowerCase().includes(q)).slice(0,4).forEach(x=>r.push(`<div class="search-result"><b>Customer</b><span>${escapeHtml(x.name)} · ${escapeHtml(x.address)}</span></div>`));jobs().filter(x=>(x.customerName+' '+x.address+' '+x.reportNumber).toLowerCase().includes(q)).slice(0,4).forEach(x=>r.push(`<div class="search-result"><b>Job</b><span>${escapeHtml(x.customerName)} · ${escapeHtml(x.reportNumber||'')}</span></div>`));technicalRecords().filter(x=>(x.customer+' '+x.address+' '+x.number).toLowerCase().includes(q)).slice(0,4).forEach(x=>r.push(`<div class="search-result"><b>Technical</b><span>${escapeHtml(x.customer)} · ${escapeHtml(x.number)}</span></div>`));assets().filter(x=>(x.customer+' '+x.code+' '+x.serial).toLowerCase().includes(q)).slice(0,4).forEach(x=>r.push(`<div class="search-result"><b>Asset</b><span>${escapeHtml(x.customer)} · ${escapeHtml(x.code)}</span></div>`));return `<div class="search-results">${r.join('')||'<p class="muted">No matching records.</p>'}</div>`}
function renderCp7Invoices(){return renderShell(`<h2 class="screen-title">Invoices</h2><div class="card"><button class="btn primary full" data-action="cp7-new-invoice">＋ New Invoice</button></div>${cp7Invoices().map(x=>`<div class="card"><div class="row"><div class="avatar">🧾</div><div class="grow"><b>${escapeHtml(x.customer||'Unnamed')}</b><small class="muted">${escapeHtml(x.number)} · ${cp7Money(x.amount)} · due ${escapeHtml(x.due||'')}</small></div><span class="badge ${x.status==='Paid'?'good':'warn'}">${escapeHtml(x.status)}</span></div><button class="btn full" data-cp7-invoice="${x.id}">Open</button></div>`).join('')||'<div class="card muted">No invoices saved.</div>'}`,'Invoices',true)}
function renderCp7Invoice(){const x=state.cp7Invoice||{id:'INV-'+Date.now(),number:cp7Next('INV',cp7Invoices()),date:new Date().toISOString().slice(0,10),due:new Date(Date.now()+30*86400000).toISOString().slice(0,10),customer:'',address:'',email:'',description:'',amount:0,status:'Draft',notes:'Payment due within 30 days.'};state.cp7Invoice=x;return renderShell(`<h2 class="screen-title">Invoice</h2><div class="card">${plainField('Invoice number','cp7InvNumber',x.number)}${plainField('Date','cp7InvDate',x.date)}${plainField('Due date','cp7InvDue',x.due)}${plainField('Customer','cp7InvCustomer',x.customer)}${plainTextarea('Address','cp7InvAddress',x.address)}${plainField('Email','cp7InvEmail',x.email)}${plainTextarea('Description','cp7InvDescription',x.description)}${plainField('Amount (£)','cp7InvAmount',x.amount)}<label class="field">Status<select id="cp7InvStatus">${['Draft','Sent','Outstanding','Overdue','Paid','Cancelled'].map(v=>`<option ${v===x.status?'selected':''}>${v}</option>`).join('')}</select></label>${plainTextarea('Notes','cp7InvNotes',x.notes)}<button class="btn primary full" data-action="cp7-save-invoice">Save Invoice</button></div>`,'Invoice',true)}
function cp7SaveInvoice(){const x=state.cp7Invoice;Object.assign(x,{number:$('cp7InvNumber').value,date:$('cp7InvDate').value,due:$('cp7InvDue').value,customer:$('cp7InvCustomer').value,address:$('cp7InvAddress').value,email:$('cp7InvEmail').value,description:$('cp7InvDescription').value,amount:Number($('cp7InvAmount').value||0),status:$('cp7InvStatus').value,notes:$('cp7InvNotes').value});const a=cp7Invoices(),i=a.findIndex(v=>v.id===x.id);if(i>=0)a[i]=x;else a.unshift(x);saveInvoices(a);toast('Invoice saved');navigate('cp7-invoices')}
function renderCp7Contracts(){return renderShell(`<h2 class="screen-title">Service Contracts</h2><div class="card"><button class="btn primary full" data-action="cp7-new-contract">＋ New Contract</button></div>${cp7Contracts().map(x=>`<div class="card"><div class="row"><div class="avatar">🔁</div><div class="grow"><b>${escapeHtml(x.customer||'Unnamed')}</b><small class="muted">${escapeHtml(x.number)} · ${escapeHtml(x.system)} · next ${escapeHtml(x.nextVisit||'')}</small></div><span class="badge ${x.status==='Active'?'good':'warn'}">${escapeHtml(x.status)}</span></div><button class="btn full" data-cp7-contract="${x.id}">Open</button></div>`).join('')||'<div class="card muted">No contracts saved.</div>'}`,'Service Contracts',true)}
function renderCp7Contract(){const x=state.cp7Contract||{id:'SC-'+Date.now(),number:cp7Next('SC',cp7Contracts()),customer:'',address:'',system:'Intruder Alarm',frequency:'Annual',nextVisit:new Date(Date.now()+365*86400000).toISOString().slice(0,10),annualValue:0,status:'Active',notes:''};state.cp7Contract=x;return renderShell(`<h2 class="screen-title">Service Contract</h2><div class="card">${plainField('Contract number','cp7ConNumber',x.number)}${plainField('Customer','cp7ConCustomer',x.customer)}${plainTextarea('Address','cp7ConAddress',x.address)}${plainField('System / service','cp7ConSystem',x.system)}<label class="field">Frequency<select id="cp7ConFrequency">${['Monthly','Quarterly','Six-monthly','Annual'].map(v=>`<option ${v===x.frequency?'selected':''}>${v}</option>`).join('')}</select></label>${plainField('Next visit','cp7ConNext',x.nextVisit)}${plainField('Annual value (£)','cp7ConValue',x.annualValue)}<label class="field">Status<select id="cp7ConStatus">${['Active','Paused','Cancelled','Expired'].map(v=>`<option ${v===x.status?'selected':''}>${v}</option>`).join('')}</select></label>${plainTextarea('Notes','cp7ConNotes',x.notes)}<button class="btn primary full" data-action="cp7-save-contract">Save Contract</button></div>`,'Service Contract',true)}
function cp7SaveContract(){const x=state.cp7Contract;Object.assign(x,{number:$('cp7ConNumber').value,customer:$('cp7ConCustomer').value,address:$('cp7ConAddress').value,system:$('cp7ConSystem').value,frequency:$('cp7ConFrequency').value,nextVisit:$('cp7ConNext').value,annualValue:Number($('cp7ConValue').value||0),status:$('cp7ConStatus').value,notes:$('cp7ConNotes').value});const a=cp7Contracts(),i=a.findIndex(v=>v.id===x.id);if(i>=0)a[i]=x;else a.unshift(x);saveContracts(a);toast('Contract saved');navigate('cp7-contracts')}

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
  else if(state.route==='diary') html=renderDiary();
  else if(state.route==='diary-edit') html=renderDiaryEdit();
  else if(state.route==='quotes') html=renderQuotes();
  else if(state.route==='quote') html=renderQuote();
  else if(state.route==='stock') html=renderStock();
  else if(state.route==='stock-edit') html=renderStockEdit();
  else if(state.route==='engineers') html=renderEngineers();
  else if(state.route==='technical') html=renderTechnical();
  else if(state.route==='technical-records') html=renderTechnicalRecords();
  else if(state.route==='technical-preview') html=renderTechnicalPreview();
  else if(state.route==='assets') html=renderAssets();
  else if(state.route==='office') html=renderOffice();
  else if(state.route==='cp7-invoices') html=renderCp7Invoices();
  else if(state.route==='cp7-invoice') html=renderCp7Invoice();
  else if(state.route==='cp7-contracts') html=renderCp7Contracts();
  else if(state.route==='cp7-contract') html=renderCp7Contract();
  else if(state.route==='asset-edit') html=renderAssetEdit();
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
    else if(a==='new-quote'){state.currentQuote=blankQuote();navigate('quote');}
    else if(a==='save-quote') saveQuote();
    else if(a==='add-quote-item'){syncQuote();state.currentQuote.items.push({description:'',qty:1,unit:0});render();}
    else if(a==='email-quote') emailQuote();
    else if(a==='quote-to-job') quoteToJob();
    else if(a==='add-diary'){state.currentDiary=null;navigate('diary-edit');}
    else if(a==='save-diary') saveDiaryEntry();
    else if(a==='delete-diary') deleteDiaryEntry();
    else if(a==='add-stock'){state.currentStock=null;navigate('stock-edit');}
    else if(a==='save-stock') saveStockItem();
    else if(a==='add-engineer') addEngineer();
    else if(a==='save-technical') saveTechnicalRecord('Draft');
    else if(a==='complete-technical') saveTechnicalRecord('Complete');
    else if(a==='edit-technical') navigate('technical');
    else if(a==='voice-note') voiceNote();
    else if(a==='new-asset'){state.currentAsset=null;navigate('asset-edit');}
    else if(a==='save-asset') saveAsset();
    else if(a==='cp7-new-invoice'){state.cp7Invoice=null;navigate('cp7-invoice');}
    else if(a==='cp7-save-invoice') cp7SaveInvoice();
    else if(a==='cp7-new-contract'){state.cp7Contract=null;navigate('cp7-contract');}
    else if(a==='cp7-save-contract') cp7SaveContract();
  }));
  document.querySelectorAll('[data-module]').forEach(el=>el.addEventListener('click',()=>{
    const m=el.dataset.module;
    if(m==='alarm')startNewJob();
    else if(m==='quote'){state.currentQuote=blankQuote();navigate('quote');}
    else startTechnicalRecord(m);
  }));
  document.querySelectorAll('[data-resume]').forEach(el=>el.addEventListener('click',()=>resumeJob(el.dataset.resume)));
  document.querySelectorAll('[data-report]').forEach(el=>el.addEventListener('click',()=>{resumeJob(el.dataset.report);state.route='report';render()}));
  document.querySelectorAll('[data-result]').forEach(el=>el.addEventListener('click',()=>selectResult(el.dataset.result)));
  document.querySelectorAll('[data-remove-photo]').forEach(el=>el.addEventListener('click',()=>removePhoto(Number(el.dataset.removePhoto))));
  document.querySelectorAll('[data-customer]').forEach(el=>el.addEventListener('click',()=>{
    const c=customers().find(x=>x.key===el.dataset.customer); startNewJob();
    if(c){Object.assign(state.currentJob,{customerName:c.name,contactName:c.contact,address:c.address,phone:c.phone,email:c.email,manufacturer:c.manufacturer,panelModel:c.panel,nextService:c.nextService});render()}
  }));
  const photo=$('photoInput'); if(photo) photo.addEventListener('change',e=>handlePhotos(e.target.files));
  const dd=$('diaryDate');if(dd)dd.addEventListener('change',e=>{state.diaryDate=e.target.value;render()});
  document.querySelectorAll('[data-diary-open]').forEach(el=>el.addEventListener('click',()=>{state.currentDiary=diary().find(x=>x.id===el.dataset.diaryOpen);navigate('diary-edit')}));
  document.querySelectorAll('[data-quote]').forEach(el=>el.addEventListener('click',()=>{state.currentQuote=quotes().find(x=>x.id===el.dataset.quote);navigate('quote')}));
  document.querySelectorAll('[data-remove-quote-item]').forEach(el=>el.addEventListener('click',()=>{syncQuote();state.currentQuote.items.splice(Number(el.dataset.removeQuoteItem),1);render()}));
  document.querySelectorAll('[data-stock-adjust]').forEach(el=>el.addEventListener('click',()=>{const a=stock(),x=a.find(v=>v.id===el.dataset.stockAdjust);if(x){x.qty=Math.max(0,Number(x.qty)+Number(el.dataset.delta));saveStock(a);render()}}));
  document.querySelectorAll('[data-stock-edit]').forEach(el=>el.addEventListener('click',()=>{state.currentStock=stock().find(x=>x.id===el.dataset.stockEdit);navigate('stock-edit')}));
  document.querySelectorAll('[data-engineer]').forEach(el=>el.addEventListener('click',()=>{setCurrentEngineer(el.dataset.engineer);toast('Active engineer changed');render()}));
  document.querySelectorAll('[data-open-record]').forEach(el=>el.addEventListener('click',()=>{state.currentRecord=technicalRecords().find(r=>r.id===el.dataset.openRecord);navigate(state.currentRecord.status==='Complete'?'technical-preview':'technical')}));
  document.querySelectorAll('[data-open-asset]').forEach(el=>el.addEventListener('click',()=>{state.currentAsset=assets().find(a=>a.id===el.dataset.openAsset);navigate('asset-edit')}));
  const assetSearch=$('assetSearch');if(assetSearch)assetSearch.addEventListener('input',e=>{state.assetQuery=e.target.value;render();const n=$('assetSearch');if(n){n.focus();n.setSelectionRange(n.value.length,n.value.length)}});
  const cp7s=$('cp7Search');if(cp7s)cp7s.addEventListener('input',e=>{$('cp7Results').innerHTML=cp7Search(e.target.value)});
  document.querySelectorAll('[data-cp7-invoice]').forEach(el=>el.addEventListener('click',()=>{state.cp7Invoice=cp7Invoices().find(x=>x.id===el.dataset.cp7Invoice);navigate('cp7-invoice')}));
  document.querySelectorAll('[data-cp7-contract]').forEach(el=>el.addEventListener('click',()=>{state.cp7Contract=cp7Contracts().find(x=>x.id===el.dataset.cp7Contract);navigate('cp7-contract')}));
  const stockSearch=$('stockSearch');if(stockSearch)stockSearch.addEventListener('input',e=>{state.stockQuery=e.target.value;render();const n=$('stockSearch');if(n){n.focus();n.setSelectionRange(n.value.length,n.value.length)}});
  const customerSearch=$('customerSearch');
  if(customerSearch){
    customerSearch.addEventListener('input',e=>{
      state.customerQuery=e.target.value;
      render();
      const next=$('customerSearch');
      if(next){next.focus();next.setSelectionRange(next.value.length,next.value.length);}
    });
  }
  if(state.route==='job') startAutoSave(); else stopAutoSave();
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


function saveDiaryEntry(){const e=state.currentDiary;Object.assign(e,{title:$('diaryTitle').value,date:$('diaryEditDate').value,time:$('diaryTime').value,duration:$('diaryDuration').value,customer:$('diaryCustomer').value,address:$('diaryAddress').value,notes:$('diaryNotes').value,status:$('diaryStatus').value});const a=diary(),i=a.findIndex(x=>x.id===e.id);i>=0?a[i]=e:a.push(e);saveDiary(a);state.diaryDate=e.date;toast('Appointment saved');navigate('diary')}
function deleteDiaryEntry(){if(!state.currentDiary)return;saveDiary(diary().filter(x=>x.id!==state.currentDiary.id));toast('Appointment deleted');navigate('diary')}
function syncQuote(){const q=state.currentQuote;q.number=$('quoteNumber').value;q.date=$('quoteDate').value;q.customer=$('quoteCustomer').value;q.address=$('quoteAddress').value;q.email=$('quoteEmail').value;q.description=$('quoteDescription').value;q.vatRate=Number($('quoteVat').value||0);q.notes=$('quoteNotes').value;q.status=$('quoteStatus').value;q.items=q.items.map((i,n)=>({description:$(`qi-desc-${n}`)?.value||'',qty:Number($(`qi-qty-${n}`)?.value||0),unit:Number($(`qi-unit-${n}`)?.value||0)}))}
function saveQuote(){syncQuote();const a=quotes(),i=a.findIndex(x=>x.id===state.currentQuote.id);i>=0?a[i]=state.currentQuote:a.unshift(state.currentQuote);saveQuotes(a);toast('Quotation saved');render()}
function emailQuote(){syncQuote();const q=state.currentQuote,t=quoteTotal(q),sub=encodeURIComponent(`Quotation ${q.number} – Cables Electrical Installations Limited`),body=encodeURIComponent(`Dear ${q.customer||'Customer'},\n\nPlease find our quotation ${q.number}.\n\n${q.description}\n\nTotal: £${t.total.toFixed(2)}\n\nKind regards,\nCables Electrical Installations Limited\n01623 512500`);location.href=`mailto:${encodeURIComponent(q.email||'')}?subject=${sub}&body=${body}`}
function quoteToJob(){syncQuote();saveQuote();const q=state.currentQuote;state.currentJob=blankJob();Object.assign(state.currentJob,{customerName:q.customer,address:q.address,email:q.email,notes:q.description,quotedValue:quoteTotal(q).total,jobType:'Installation'});setActiveJob(state.currentJob.id);state.step=0;navigate('job')}
function saveStockItem(){const x=state.currentStock;Object.assign(x,{name:$('stockName').value,sku:$('stockSku').value,qty:Number($('stockQty').value||0),min:Number($('stockMin').value||0),cost:Number($('stockCost').value||0),sell:Number($('stockSell').value||0)});const a=stock(),i=a.findIndex(v=>v.id===x.id);i>=0?a[i]=x:a.unshift(x);saveStock(a);toast('Stock item saved');navigate('stock')}
function addEngineer(){const name=prompt('Engineer name');if(!name)return;const role=prompt('Role','Engineer')||'Engineer',initials=name.split(/\s+/).map(x=>x[0]).join('').slice(0,3).toUpperCase(),a=engineers();a.push({id:'ENG-'+Date.now(),name,role,initials});saveEngineers(a);render()}

function saveSettings(){
  storage.write('cp4_settings',{company:$('setCompany').value,phone:$('setPhone').value,email:$('setEmail').value,web:$('setWeb').value});
  toast('Settings saved');
}
function exportBackup(){
  const data={version:VERSION,exported:new Date().toISOString(),jobs:jobs(),customers:customers(),quotes:quotes(),diary:diary(),stock:stock(),engineers:engineers(),technicalRecords:technicalRecords(),assets:assets(),invoices:invoices(),contracts:contracts(),settings:storage.read('cp4_settings',{})};
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='Cables-Pro-V4-Backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();URL.revokeObjectURL(a.href);
}

function field(label,key,value,extra='',type='text',placeholder=''){return `<label class="field ${extra}">${label}<input data-field="${key}" type="${type}" value="${escapeAttr(value)}" placeholder="${escapeAttr(placeholder)}"></label>`}
function textarea(label,key,value,extra=''){return `<label class="field ${extra}">${label}<textarea data-field="${key}">${escapeHtml(value)}</textarea></label>`}
function selectField(label,key,options,value){return `<label class="field">${label}<select data-field="${key}">${options.map(o=>`<option ${o===value?'selected':''}>${escapeHtml(o)}</option>`).join('')}</select></label>`}
function plainField(label,id,value){return `<label class="field">${label}<input id="${id}" value="${escapeAttr(value)}"></label>`}
function plainTextarea(label,id,value){return `<label class="field">${label}<textarea id="${id}">${escapeHtml(value)}</textarea></label>`}
function kv(k,v){return `<div class="kv"><b>${escapeHtml(k)}</b><span>${escapeHtml(v||'—')}</span></div>`}
function jobRow(j){return `<div class="row"><div class="avatar">🛡</div><div class="grow"><b>${escapeHtml(j.customerName||'Unnamed job')}</b><small class="muted">${escapeHtml(j.reportNumber||'No report number')} · ${escapeHtml(j.jobType||'Alarm Service')} · ${new Date(j.updated||j.created).toLocaleDateString('en-GB')}</small></div><span class="badge ${j.status==='Complete'?'good':'warn'}">${escapeHtml(j.status)}</span></div>`}
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
