/* Live Mode adapter. The synthetic demo remains the default and fallback.
   Enable by opening the Vercel deployment with ?mode=live after configuring OPENAI_API_KEY. */
(() => {
  const params = new URLSearchParams(location.search);
  const requested = params.get('mode') === 'live';
  if (!requested) return;

  let liveReady = false;
  const demoGlobalAsk = window.runGlobalAsk;
  const demoSendPrompt = window.sendPrompt;

  async function health() {
    try {
      const r = await fetch('./api/health', { cache: 'no-store' });
      const data = await r.json();
      liveReady = Boolean(r.ok && data.ok && data.openaiConfigured);
      if (liveReady) {
        const engine = document.getElementById('engineStatus');
        const mode = document.getElementById('modeLabel');
        if (engine) engine.textContent = 'OpenAI Live Agent Online';
        if (mode) mode.textContent = 'LIVE AI MODE';
        if (typeof logAudit === 'function') logAudit('LIVE_MODE_READY','Server-side OpenAI API is configured.','No');
      }
      return liveReady;
    } catch (_) {
      liveReady = false;
      return false;
    }
  }

  function compactContext() {
    const sbu = document.getElementById('scopeSbu')?.value || 'ALL';
    const domain = document.getElementById('scopeDomain')?.value || 'ALL';
    const obligations = db.obligations.filter(o => (sbu === 'ALL' || o.sbu === sbu) && (domain === 'ALL' || o.domain === domain)).slice(0, 100);
    const documents = db.documents.filter(d => (sbu === 'ALL' || d.sbu === sbu) && (domain === 'ALL' || d.domain === domain)).slice(0, 80);
    const evidence = db.evidence.filter(e => sbu === 'ALL' || e.sbu === sbu).slice(0, 120);
    const capa = db.capa.filter(c => (sbu === 'ALL' || c.sbu === sbu) && (domain === 'ALL' || c.domain === domain)).slice(0, 60);
    return {
      notice: 'All supplied application records are synthetic demo data unless replaced by an authorized live data connector.',
      scope: { sbu, domain, dataDate: db.generated_on || null },
      obligations,
      documents,
      evidence,
      capa
    };
  }

  async function askLive(message) {
    const r = await fetch('./api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, context: compactContext() })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.detail || data.error || 'Live AI request failed');
    return data;
  }

  window.runGlobalAsk = async function () {
    if (!liveReady && !(await health())) return demoGlobalAsk();
    const input = document.getElementById('globalAsk');
    const box = document.getElementById('globalResult');
    const q = input?.value.trim();
    if (!q) return;
    box.style.display = 'block';
    box.innerHTML = '<h3>ARG Live AI</h3><div class="meta">Running server-side OpenAI agent…</div>';
    try {
      const data = await askLive(q);
      box.innerHTML = `<h3>ARG Live AI</h3><div class="meta">${esc(data.model || 'OpenAI')} · ${esc(data.responseId || '')}</div><div class="small" style="white-space:pre-wrap;line-height:1.6">${esc(data.output)}</div>`;
      if (typeof logAudit === 'function') logAudit('LIVE_AI_QUERY',q,'No');
    } catch (e) {
      liveReady = false;
      box.innerHTML = `<h3>Live AI unavailable</h3><div class="meta">Falling back to the built-in synthetic engine.</div>`;
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
        ['Master Agent','Live request routed through secure server-side API'],
        ['OpenAI Responses API',`Response ${data.responseId || 'completed'}`],
        ['Authority Control','AI output remains advisory; controlled decisions require human approval']
      ]);
      if (typeof logAudit === 'function') logAudit('LIVE_AI_WORKSPACE_QUERY',q,'No');
    } catch (e) {
      liveReady = false;
      if (typeof addChat === 'function') addChat('ai','Live AI is unavailable, so this request is being handled by the synthetic demo engine.');
      input.value = q;
      demoSendPrompt();
    }
  };

  health();
})();
