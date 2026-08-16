/* Public Read-Only + Secure Admin Control layer.
   Public mode uses the existing synthetic demo engine as a non-editable preview.
   Admin mode requires Supabase authentication and RLS-authorized admin scope. */
(() => {
  const SUPABASE_URL = 'https://beubdcsqxvlukhficvjq.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_LcEiB0JMNG_y9IJRRRWcfg_S-0m0xR5';
  const SESSION_KEY = 'arg_live_supabase_session';
  const params = new URLSearchParams(location.search);
  const isLive = params.get('mode') === 'live';
  const isAdminRoute = isLive && params.get('admin') === '1';
  const PUBLIC_ALLOWED_VIEWS = new Set(['dashboard','compliance','dms','datahub']);
  const TABLES = {
    obligations: { label:'Compliance Obligations', key:'id' },
    documents: { label:'Documents / DMS', key:'id', composite:'version' },
    evidence: { label:'Evidence & Records', key:'id' },
    capa: { label:'CAPA', key:'id' },
    permits: { label:'Permits / Licences', key:'id' },
    audits: { label:'Audits', key:'id' },
    esg_monthly_metrics: { label:'ESG Monthly Metrics', key:'id' },
    requirements: { label:'Requirements', key:'id' }
  };

  const css = document.createElement('style');
  css.textContent = `
    .access-badge{display:inline-flex;align-items:center;gap:6px;padding:6px 9px;border-radius:999px;font-size:9px;font-weight:800;margin-top:8px;background:rgba(255,255,255,.10);color:#fff}
    .public-readonly .nav button[data-view="evidence"],.public-readonly .nav button[data-view="capa"],.public-readonly .nav button[data-view="agent"],.public-readonly .nav button[data-view="mcp"],.public-readonly .nav button[data-view="audit"]{display:none!important}
    .public-readonly #dashboard .card.click,.public-readonly tr.data{cursor:default}
    .public-readonly .modalback{display:none!important}
    .public-readonly .logout-btn{background:#fff;color:#123761;border:0}
    .admin-control-section .admin-grid{display:grid;grid-template-columns:320px 1fr;gap:12px}
    .admin-panel{background:#fff;border:1px solid var(--line);border-radius:14px;padding:14px;box-shadow:var(--shadow)}
    .admin-panel h3{margin:0 0 10px;font-size:13px}.admin-panel label{display:block;font-size:9px;font-weight:800;color:#667085;text-transform:uppercase;letter-spacing:.04em;margin:10px 0 5px}
    .admin-panel input,.admin-panel select,.admin-panel textarea{width:100%;border:1px solid var(--line);border-radius:9px;padding:9px 10px;background:#fff;color:var(--ink);font-size:10px}
    .admin-panel textarea{min-height:245px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;line-height:1.45;resize:vertical}
    .admin-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}.admin-actions button{border:1px solid var(--line);border-radius:8px;padding:8px 10px;background:#fff;font-size:10px;cursor:pointer}.admin-actions .primary{background:var(--nav);color:#fff;border-color:var(--nav)}.admin-actions .danger{color:#9f241b;background:#fff5f4;border-color:#ffd2ce}
    .admin-message{margin-top:10px;padding:8px 9px;border-radius:8px;background:#f4f8ff;border:1px solid #d9e7ff;color:#355c8e;font-size:10px;display:none;white-space:pre-wrap}
    .admin-row-actions{display:flex;gap:4px}.admin-row-actions button{border:1px solid var(--line);background:#fff;border-radius:6px;padding:4px 6px;font-size:9px;cursor:pointer}
    .admin-status{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:10px 12px;border-radius:10px;background:#edf8f2;border:1px solid #cfeadb;color:#176540;font-size:10px;margin-bottom:11px}
    @media(max-width:900px){.admin-control-section .admin-grid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(css);

  function getSession(){ try{return JSON.parse(sessionStorage.getItem(SESSION_KEY)||'null')}catch(_){return null} }
  function publicUrl(){ return `${location.pathname}${location.hash||''}`; }
  function adminUrl(){ return `${location.pathname}?mode=live&admin=1`; }
  function headers(session, extra={}){
    const h = new Headers(extra);
    h.set('apikey', SUPABASE_PUBLISHABLE_KEY);
    if(session?.access_token) h.set('Authorization', `Bearer ${session.access_token}`);
    return h;
  }
  async function sb(path, options={}){
    const session=getSession();
    return fetch(`${SUPABASE_URL}${path}`, {...options, headers:headers(session,options.headers||{})});
  }
  function escHtml(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
  function setText(id,text){const el=document.getElementById(id);if(el)el.textContent=text}

  function makePublicReadOnly(){
    if(isLive) return;
    document.body.classList.remove('auth-locked');
    document.body.classList.add('public-readonly');
    const gate=document.getElementById('loginGate'); if(gate) gate.style.display='none';
    setText('modeLabel','PUBLIC READ-ONLY');
    setText('engineStatus','Public Synthetic Preview');
    setText('signedInUser','Public Visitor');
    const foot=document.querySelector('.sidefoot');
    if(foot && !document.getElementById('publicAccessBadge')){
      const badge=document.createElement('div');badge.id='publicAccessBadge';badge.className='access-badge';badge.textContent='● Public View · Read Only';foot.insertBefore(badge,foot.querySelector('.login-user'));
    }
    const logout=document.querySelector('.logout-btn');
    if(logout){logout.textContent='Admin Login';logout.onclick=()=>{location.href=adminUrl()}}
    const banner=document.querySelector('.banner');
    if(banner) banner.innerHTML='<b>Public Read-Only Preview:</b> All records currently shown in this public preview are synthetic demonstration data. Live enterprise records remain protected by Supabase Auth, RLS and publication controls.';
    const ai=document.querySelector('.askbar'); if(ai) ai.style.display='none';
    const hint=document.querySelector('.hint'); if(hint) hint.style.display='none';
    const result=document.getElementById('globalResult'); if(result) result.style.display='none';
    document.querySelectorAll('.nav button').forEach(btn=>{
      if(!PUBLIC_ALLOWED_VIEWS.has(btn.dataset.view||'')) btn.style.display='none';
    });
    // Public preview must not simulate controlled status changes.
    ['requestApproval','approveChange','applyApprovedChange','openApproval','confirmApproval'].forEach(name=>{
      if(typeof window[name]==='function') window[name]=()=>alert('Public view is read-only. Please use Admin Login for controlled changes.');
    });
  }

  async function getAdminContext(){
    const session=getSession(); if(!session?.access_token) return null;
    const [profileRes,scopeRes,userRes]=await Promise.all([
      sb('/rest/v1/user_profiles?select=work_email,display_name,role,active&limit=1'),
      sb('/rest/v1/user_org_scope?select=org_unit_id,access_level&order=org_unit_id.asc'),
      sb('/auth/v1/user')
    ]);
    if(!profileRes.ok || !scopeRes.ok || !userRes.ok) return null;
    const profile=(await profileRes.json())[0]||null;
    const scopes=await scopeRes.json();
    const user=await userRes.json();
    const admin=Boolean(profile?.active!==false && (['platform_admin','admin'].includes(profile?.role)||scopes.some(s=>s.access_level==='admin')));
    return {profile,scopes,user,admin};
  }

  function createAdminSection(ctx){
    if(document.getElementById('adminControl')) return;
    const nav=document.querySelector('.nav');
    const btn=document.createElement('button');
    btn.dataset.view='adminControl';
    btn.innerHTML='<span class="ico">⚙</span>Admin Control';
    btn.addEventListener('click',()=>{
      document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
      document.querySelectorAll('.nav button').forEach(b=>b.classList.remove('active'));
      document.getElementById('adminControl')?.classList.add('active');btn.classList.add('active');refreshAdminRows();
    });
    nav.appendChild(btn);

    const section=document.createElement('section');section.id='adminControl';section.className='view admin-control-section';
    section.innerHTML=`
      <div class="pagehead"><div><h2>Admin Data Control</h2><p>Authenticated Supabase administration. All writes remain subject to RLS and SBU scope.</p></div><div class="actions"><button class="btn" id="returnPublic">Open Public View</button></div></div>
      <div class="admin-status"><b>Secure Admin Session</b><span>${escHtml(ctx.profile?.work_email||ctx.user?.email||'Authenticated admin')} · ${escHtml(ctx.profile?.role||'scoped admin')}</span></div>
      <div class="admin-grid">
        <div class="admin-panel">
          <h3>Create / Update / Archive Record</h3>
          <label>Module</label><select id="adminTable">${Object.entries(TABLES).map(([k,v])=>`<option value="${k}">${escHtml(v.label)}</option>`).join('')}</select>
          <label>Record ID</label><input id="adminRecordId" placeholder="Example: OBL-ACCL-001" />
          <div id="adminVersionWrap" style="display:none"><label>Document Version</label><input id="adminRecordVersion" placeholder="Example: 1" /></div>
          <label>JSON Data</label><textarea id="adminPayload" spellcheck="false" placeholder='{"id":"...","sbu_id":"ACCL",...}'></textarea>
          <div class="admin-actions"><button class="primary" id="adminCreate">Create</button><button id="adminUpdate">Update</button><button class="danger" id="adminArchive">Archive / Unpublish</button><button id="adminClear">Clear</button></div>
          <div id="adminMessage" class="admin-message"></div>
          <p class="small" style="margin-top:10px">Hard delete is intentionally disabled. Archive keeps records recoverable and auditable.</p>
        </div>
        <div class="admin-panel">
          <div class="title"><h3>Live Records</h3><button class="btn" id="adminRefresh">Refresh</button></div>
          <div class="tablewrap"><table><thead><tr><th>ID</th><th>SBU / Scope</th><th>Status</th><th>Visibility</th><th>Publication</th><th>Actions</th></tr></thead><tbody id="adminRows"></tbody></table></div>
        </div>
      </div>`;
    document.querySelector('.main').appendChild(section);
    document.getElementById('returnPublic').onclick=()=>location.href=publicUrl();
    document.getElementById('adminTable').onchange=()=>{document.getElementById('adminVersionWrap').style.display=document.getElementById('adminTable').value==='documents'?'block':'none';refreshAdminRows()};
    document.getElementById('adminRefresh').onclick=refreshAdminRows;
    document.getElementById('adminClear').onclick=clearAdminForm;
    document.getElementById('adminCreate').onclick=()=>saveAdminRecord('create');
    document.getElementById('adminUpdate').onclick=()=>saveAdminRecord('update');
    document.getElementById('adminArchive').onclick=archiveAdminRecord;
  }

  function message(text,error=false){const el=document.getElementById('adminMessage');if(!el)return;el.style.display='block';el.style.background=error?'#fff2f0':'#f4f8ff';el.style.borderColor=error?'#ffd2ce':'#d9e7ff';el.style.color=error?'#9f241b':'#355c8e';el.textContent=text}
  function clearAdminForm(){['adminRecordId','adminRecordVersion','adminPayload'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=''});const m=document.getElementById('adminMessage');if(m)m.style.display='none'}
  function selectedTable(){return document.getElementById('adminTable')?.value||'obligations'}
  function recordFilter(table,id,version){let q=`id=eq.${encodeURIComponent(id)}`;if(table==='documents'&&version)q+=`&version=eq.${encodeURIComponent(version)}`;return q}

  async function refreshAdminRows(){
    const tbody=document.getElementById('adminRows');if(!tbody)return;tbody.innerHTML='<tr><td colspan="6">Loading authorized live records…</td></tr>';
    const table=selectedTable();
    const select=table==='documents'?'id,version,sbu_id,status,visibility,publication_status,is_archived':table==='requirements'?'id,status,visibility,publication_status,is_archived':table==='esg_monthly_metrics'?'id,sbu_id,period,visibility,publication_status,is_archived':`id,sbu_id,status,visibility,publication_status,is_archived`;
    const r=await sb(`/rest/v1/${table}?select=${encodeURIComponent(select)}&is_archived=eq.false&limit=50`);
    if(!r.ok){tbody.innerHTML=`<tr><td colspan="6">Unable to read records (${r.status}).</td></tr>`;return}
    const rows=await r.json();
    if(!rows.length){tbody.innerHTML='<tr><td colspan="6">No live records in this module yet.</td></tr>';return}
    tbody.innerHTML=rows.map(row=>{
      const id=row.id||'';const version=row.version||'';const scope=row.sbu_id||'Enterprise';const status=row.status||row.period||'—';
      return `<tr><td>${escHtml(id)}${version?` v${escHtml(version)}`:''}</td><td>${escHtml(scope)}</td><td>${escHtml(status)}</td><td>${escHtml(row.visibility||'Internal')}</td><td>${escHtml(row.publication_status||'Draft')}</td><td><div class="admin-row-actions"><button data-edit="${escHtml(id)}" data-version="${escHtml(version)}">Edit</button><button data-archive="${escHtml(id)}" data-version="${escHtml(version)}">Archive</button></div></td></tr>`
    }).join('');
    tbody.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>loadAdminRecord(b.dataset.edit,b.dataset.version));
    tbody.querySelectorAll('[data-archive]').forEach(b=>{b.onclick=async()=>{document.getElementById('adminRecordId').value=b.dataset.archive;document.getElementById('adminRecordVersion').value=b.dataset.version||'';await archiveAdminRecord()}});
  }

  async function loadAdminRecord(id,version=''){
    const table=selectedTable();const filter=recordFilter(table,id,version);
    const r=await sb(`/rest/v1/${table}?select=*&${filter}&limit=1`);if(!r.ok)return message(`Unable to load record (${r.status}).`,true);
    const row=(await r.json())[0];if(!row)return message('Record not found.',true);
    document.getElementById('adminRecordId').value=id;document.getElementById('adminRecordVersion').value=version||row.version||'';document.getElementById('adminPayload').value=JSON.stringify(row,null,2);message('Record loaded. Edit JSON and click Update.');
  }

  async function saveAdminRecord(mode){
    const table=selectedTable();let payload;try{payload=JSON.parse(document.getElementById('adminPayload').value||'{}')}catch(e){return message('Invalid JSON payload.',true)}
    const id=document.getElementById('adminRecordId').value.trim()||payload.id||'';const version=document.getElementById('adminRecordVersion').value.trim()||payload.version||'';
    if(mode==='create'){
      const r=await sb(`/rest/v1/${table}`,{method:'POST',headers:{'Content-Type':'application/json','Prefer':'return=representation'},body:JSON.stringify(payload)});
      if(!r.ok)return message(`Create failed (${r.status}): ${await r.text()}`,true);message('Record created successfully.');
    } else {
      if(!id)return message('Record ID is required for update.',true);
      const r=await sb(`/rest/v1/${table}?${recordFilter(table,id,version)}`,{method:'PATCH',headers:{'Content-Type':'application/json','Prefer':'return=representation'},body:JSON.stringify(payload)});
      if(!r.ok)return message(`Update failed (${r.status}): ${await r.text()}`,true);message('Record updated successfully.');
    }
    await writeAudit(mode==='create'?'ADMIN_CREATE':'ADMIN_UPDATE',table,id,payload.sbu_id||null);refreshAdminRows();
  }

  async function archiveAdminRecord(){
    const table=selectedTable();const id=document.getElementById('adminRecordId').value.trim();const version=document.getElementById('adminRecordVersion').value.trim();if(!id)return message('Select or enter a Record ID first.',true);
    if(!confirm(`Archive ${table} record ${id}? This will unpublish it and keep it for audit/recovery.`))return;
    const body={is_archived:true,publication_status:'Archived'};
    const r=await sb(`/rest/v1/${table}?${recordFilter(table,id,version)}`,{method:'PATCH',headers:{'Content-Type':'application/json','Prefer':'return=representation'},body:JSON.stringify(body)});
    if(!r.ok)return message(`Archive failed (${r.status}): ${await r.text()}`,true);
    await writeAudit('ADMIN_ARCHIVE',table,id,null);message('Record archived and unpublished.');clearAdminForm();refreshAdminRows();
  }

  async function writeAudit(action,objectType,objectId,sbuId){
    const session=getSession();const userId=session?.user?.id||null;if(!userId)return;
    try{await sb('/rest/v1/audit_log',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({actor_user_id:userId,action,object_type:objectType,object_id:objectId||null,sbu_id:sbuId||null,details:{source:'Admin Control UI'}})})}catch(_){}
  }

  async function activateAdmin(){
    if(!isAdminRoute)return;
    const session=getSession();
    if(!session?.access_token){setText('modeLabel','ADMIN LOGIN REQUIRED');return}
    const ctx=await getAdminContext();
    if(!ctx?.admin){alert('This account does not have Admin access.');location.href=publicUrl();return}
    document.body.classList.remove('public-readonly');
    setText('modeLabel','SECURE ADMIN MODE');
    setText('engineStatus','Supabase Admin Control Online');
    createAdminSection(ctx);
    const logout=document.querySelector('.logout-btn');if(logout)logout.textContent='Admin Sign Out';
  }

  function boot(){
    makePublicReadOnly();
    if(isAdminRoute){let tries=0;const timer=setInterval(async()=>{tries++;const s=getSession();if(s?.access_token){clearInterval(timer);await activateAdmin()}else if(tries>25){clearInterval(timer)}},250);}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
