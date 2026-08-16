/* Live Mode adapter. Demo Mode remains the default and fallback.
   Open the Vercel deployment with ?mode=live to use Supabase Auth + server-side OpenAI. */
(() => {
  const params = new URLSearchParams(location.search);
  const requested = params.get('mode') === 'live';
  if (!requested) return;

  const SUPABASE_URL = 'https://beubdcsqxvlukhficvjq.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_LcEiB0JMNG_y9IJRRRWcfg_S-0m0xR5';
  const SESSION_KEY = 'arg_live_supabase_session';
  let liveReady = false;
  let session = null;
  const demoGlobalAsk = window.runGlobalAsk;
  const demoSendPrompt = window.sendPrompt;

  const setModeText = (engine, mode) => {
    const e = document.getElementById('engineStatus');
    const m = document.getElementById('modeLabel');
    if (e && engine) e.textContent = engine;
    if (m && mode) m.textContent = mode;
  };

  function saveSession(value) {
    session = value || null;
    if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else sessionStorage.removeItem(SESSION_KEY);
  }

  function loadSession() {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); }
    catch (_) { return null; }
  }

  async function supabaseFetch(path, options = {}) {
    const headers = new Headers(options.headers || {});
    headers.set('apikey', SUPABASE_PUBLISHABLE_KEY);
    if (session?.access_token) headers.set('Authorization', `Bearer ${session.access_token}`);
    return fetch(`${SUPABASE_URL}${path}`, { ...options, headers });
  }

  async function passwordLogin(email, password) {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data?.msg || data?.error_description || data?.error || 'Sign-in failed');
    saveSession(data);
    return data;
  }

  async function refreshSession() {
    if (!session?.refresh_token) return false;
    const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: session.refresh_token })
    });
    const data = await r.json();
    if (!r.ok) { saveSession(null); return false; }
    saveSession(data);
    return true;
  }

  async function getCurrentUser() {
    if (!session?.access_token) return null;
    let r = await supabaseFetch('/auth/v1/user');
    if (r.status === 401 && await refreshSession()) r = await supabaseFetch('/auth/v1/user');
    if (!r.ok) return null;
    return r.json();
  }

  async function getIdentityContext() {
    if (!session?.access_token) return null;
    const [profileRes, scopeRes] = await Promise.all([
      supabaseFetch('/rest/v1/user_profiles?select=work_email,display_name,role,active&limit=1'),
      supabaseFetch('/rest/v1/user_org_scope?select=org_unit_id,access_level&order=org_unit_id.asc')
    ]);
    return {
      profile: profileRes.ok ? (await profileRes.json())[0] || null : null,
      scopes: scopeRes.ok ? await scopeRes.json() : []
    };
  }

  async function activateLiveIdentity() {
    const user = await getCurrentUser();
    if (!user) return false;
    const ctx = await getIdentityContext();
    if (ctx?.profile && ctx.profile.active === false) throw new Error('This account is inactive.');
    if (typeof unlockDemo === 'function') unlockDemo(user.email || ctx?.profile?.work_email || 'Authenticated user');
    const signedIn = document.getElementById('signedInUser');
    if (signedIn) {
      const role = ctx?.profile?.role ? ` · ${ctx.profile.role}` : '';
      signedIn.textContent = `${user.email || ctx?.profile?.work_email || 'Authenticated user'}${role}`;
    }
    setModeText('Supabase Authenticated Session', 'LIVE AUTH MODE');
    return true;
  }

  async function health() {
    try {
      const r = await fetch('./api/health', { cache: 'no-store' });
      const data = await r.json();
      liveReady = Boolean(r.ok && data.ok && data.openaiConfigured && data.supabaseConfigured && session?.access_token);
      if (liveReady) {
        setModeText('OpenAI + Supabase Live Agent Online', 'LIVE AI MODE');
        if (typeof logAudit === 'function') logAudit('LIVE_MODE_READY','Authenticated server-side OpenAI + Supabase are configured.','No');
      }
      return liveReady;
    } catch (_) {
      liveReady = false;
      return false;
    }
  }

  async function askLive(message) {
    if (!session?.access_token) throw new Error('Live authentication required');
    const sbu = document.getElementById('scopeSbu')?.value || 'ALL';
    const domain = document.getElementById('scopeDomain')?.value || 'ALL';
    const r = await fetch('./api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ message, scope: { sbu, domain } })
    });
    const data = await r.json();
    if (r.status === 401 && await refreshSession()) return askLive(message);
    if (!r.ok) throw new Error(data.detail || data.error || 'Live AI request failed');
    return data;
  }

  const form = document.getElementById('loginForm');
  if (form) form.addEventListener('submit', async (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    const email = document.getElementById('loginEmail')?.value.trim().toLowerCase() || '';
    const password = document.getElementById('loginPassword')?.value || '';
    const error = document.getElementById('loginError');
    const submit = form.querySelector('.login-submit');
    if (error) { error.style.display = 'none'; error.textContent = 'Unable to sign in. Check your credentials and account access.'; }
    if (submit) { submit.disabled = true; submit.textContent = 'Signing in securely…'; }
    try {
      await passwordLogin(email, password);
      await activateLiveIdentity();
      await health();
      if (typeof logAudit === 'function') logAudit('LIVE_USER_LOGIN','Supabase authenticated login completed.','No');
    } catch (e) {
      saveSession(null);
      if (error) { error.textContent = String(e.message || e); error.style.display = 'block'; }
      const p = document.getElementById('loginPassword');
      if (p) { p.value = ''; p.focus(); }
    } finally {
      if (submit) { submit.disabled = false; submit.textContent = 'Sign in to Compliance Management'; }
    }
  }, true);

  window.logoutDemo = async function () {
    try {
      if (session?.access_token) await supabaseFetch('/auth/v1/logout', { method: 'POST' });
    } catch (_) {}
    if (typeof logAudit === 'function') logAudit('LIVE_USER_LOGOUT','Supabase user signed out.','No');
    saveSession(null);
    sessionStorage.removeItem('arg_auth');
    sessionStorage.removeItem('arg_auth_email');
    location.href = location.pathname;
  };

  window.runGlobalAsk = async function () {
    if (!liveReady && !(await health())) return demoGlobalAsk();
    const input = document.getElementById('globalAsk');
    const box = document.getElementById('globalResult');
    const q = input?.value.trim();
    if (!q) return;
    box.style.display = 'block';
    box.innerHTML = '<h3>ARG Live AI</h3><div class="meta">Reading only records authorized by your Supabase RLS scope…</div>';
    try {
      const data = await askLive(q);
      box.innerHTML = `<h3>ARG Live AI</h3><div class="meta">${esc(data.model || 'OpenAI')} · ${esc(data.responseId || '')}</div><div class="small" style="white-space:pre-wrap;line-height:1.6">${esc(data.output)}</div>`;
      if (typeof logAudit === 'function') logAudit('LIVE_AI_QUERY',q,'No');
    } catch (e) {
      liveReady = false;
      box.innerHTML = `<h3>Live AI unavailable</h3><div class="meta">${esc(String(e.message || e))}. Falling back to the built-in synthetic engine.</div>`;
      if (typeof logAudit === 'function') logAudit('LIVE_AI_FALLBACK',String(e.message || e),'No');
      setTimeout(() => demoGlobalAsk(), 250);
    }
  };

  window.sendPrompt = async function () {
    if (!liveReady && !(await health())) return demoSendPrompt();
    const input = document.getElementById('prompt');
    const q = input?.value.trim();
    if (!q) return;
    if (typeof addChat === 'function') addChat('user', q);
    input.value = '';
    try {
      const data = await askLive(q);
      if (typeof addChat === 'function') addChat('ai', data.output);
      if (typeof setTrace === 'function') setTrace([
        ['Master Agent','Authenticated request routed through server-side API'],
        ['Supabase RLS','Organization records filtered by signed-in user scope'],
        ['OpenAI Responses API',`Response ${data.responseId || 'completed'}`],
        ['Authority Control','Official status, CAPA closure, approvals and submissions remain human-controlled']
      ]);
      if (typeof logAudit === 'function') logAudit('LIVE_AI_WORKSPACE_QUERY',q,'No');
    } catch (e) {
      liveReady = false;
      if (typeof addChat === 'function') addChat('ai','Live AI is unavailable, so this request is being handled by the synthetic demo engine.');
      input.value = q;
      demoSendPrompt();
    }
  };

  (async () => {
    session = loadSession();
    if (session && await activateLiveIdentity()) await health();
    else {
      saveSession(null);
      setModeText('Supabase Sign-in Required', 'LIVE AUTH MODE');
    }
  })();
})();

// Application display branding. Runs in both Demo and Live Mode without changing functionality.
(() => {
  const APP_NAME = 'Compliance Management System Control Tower';
  const applyBranding = () => {
    document.title = `${APP_NAME} — Interactive Live Demo`;
    const loginTitle = document.getElementById('loginTitle');
    const sidebarTitle = document.querySelector('.brand h2');
    const mainTitle = document.querySelector('.top h1');
    const submit = document.querySelector('.login-submit');
    const dmsNav = document.querySelector('.nav button[data-view="dms"]');
    const dmsTitle = document.querySelector('#dms .pagehead h2');
    if (loginTitle) loginTitle.textContent = APP_NAME;
    if (sidebarTitle) sidebarTitle.textContent = APP_NAME;
    if (mainTitle) mainTitle.textContent = APP_NAME;
    if (submit && submit.textContent.trim() === 'Sign in to Compliance Management') {
      submit.textContent = `Sign in to ${APP_NAME}`;
    }
    if (dmsNav) dmsNav.innerHTML = '<span class="ico">▤</span>Document Control / DMS';
    if (dmsTitle) dmsTitle.textContent = 'Document Control / DMS';
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyBranding, { once: true });
  else applyBranding();
})();

// Load the access-control layer after the existing demo/live adapters.
(() => {
  const script = document.createElement('script');
  script.src = './assets/access-control.js';
  script.defer = true;
  document.head.appendChild(script);
})();
