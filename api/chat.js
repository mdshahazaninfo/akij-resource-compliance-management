const MASTER_INSTRUCTIONS = `You are the Akij Resource Compliance Management Master Agent.
Operate as a compliance and document-intelligence assistant. Separate facts from AI assessment, gaps, risks, recommendations, and human decisions. Never invent legal requirements, document IDs, evidence, approvals, compliance status, audit results, permits, or ESG records. Treat the authenticated Supabase records supplied in this request as the only organization-specific live facts available. Cite record IDs when present. If a table is empty, say that no authorized live records are available. Controlled decisions such as official compliance status, CAPA closure, policy approval, regulatory submission, or deletion require an authorized human.`;

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://beubdcsqxvlukhficvjq.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_LcEiB0JMNG_y9IJRRRWcfg_S-0m0xR5';

function extractText(data) {
  if (typeof data.output_text === 'string' && data.output_text) return data.output_text;
  const parts = [];
  for (const item of data.output || []) {
    for (const c of item.content || []) {
      if ((c.type === 'output_text' || c.type === 'text') && c.text) parts.push(c.text);
    }
  }
  return parts.join('\n').trim();
}

function bearer(req) {
  const value = String(req.headers.authorization || '');
  return value.startsWith('Bearer ') ? value.slice(7).trim() : '';
}

async function supabase(path, token) {
  const r = await fetch(`${SUPABASE_URL}${path}`, {
    headers: {
      'apikey': SUPABASE_PUBLISHABLE_KEY,
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  const text = await r.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch (_) { data = text; }
  if (!r.ok) {
    const error = new Error(data?.message || data?.msg || `Supabase request failed (${r.status})`);
    error.status = r.status;
    throw error;
  }
  return data;
}

function addFilter(path, field, value) {
  if (!value || value === 'ALL') return path;
  return `${path}&${encodeURIComponent(field)}=eq.${encodeURIComponent(value)}`;
}

async function loadAuthorizedContext(token, requestedScope = {}) {
  const user = await supabase('/auth/v1/user', token);
  if (!user?.id) throw Object.assign(new Error('Invalid authenticated session'), { status: 401 });

  const profile = await supabase('/rest/v1/user_profiles?select=work_email,display_name,role,active&limit=1', token);
  if (profile?.[0]?.active === false) throw Object.assign(new Error('User account is inactive'), { status: 403 });

  const scopes = await supabase('/rest/v1/user_org_scope?select=org_unit_id,access_level&order=org_unit_id.asc', token);
  const sbu = String(requestedScope?.sbu || 'ALL');
  const domain = String(requestedScope?.domain || 'ALL');

  let obligationsPath = '/rest/v1/obligations?select=id,requirement_id,sbu_id,site_id,department_id,process,frequency,due_date,risk_level,compliance_status,applicability,last_assessed_at&order=due_date.asc&limit=120';
  obligationsPath = addFilter(obligationsPath, 'sbu_id', sbu);
  if (domain !== 'ALL') {
    const requirements = await supabase(`/rest/v1/requirements?select=id,domain,source_name,clause,title&domain=eq.${encodeURIComponent(domain)}&limit=100`, token);
    const reqIds = (requirements || []).map(r => r.id);
    if (reqIds.length) obligationsPath += `&requirement_id=in.(${reqIds.map(encodeURIComponent).join(',')})`;
    else obligationsPath += '&id=eq.__NO_MATCH__';
  }

  const scopedTable = (table, select, limit, order) => {
    let path = `/rest/v1/${table}?select=${select}&limit=${limit}`;
    if (order) path += `&order=${order}`;
    return addFilter(path, 'sbu_id', sbu);
  };

  const [requirements, obligations, documents, evidence, capa, permits, audits, esg, hr, approvals] = await Promise.all([
    supabase('/rest/v1/requirements?select=id,source_type,source_name,clause,title,domain,jurisdiction,effective_date,status&limit=120', token),
    supabase(obligationsPath, token),
    supabase(scopedTable('documents','id,version,title,document_type,sbu_id,department_id,process,status,effective_date,review_date,confidentiality,retention_period',100,'review_date.asc'), token),
    supabase(scopedTable('evidence','id,obligation_id,title,evidence_type,sbu_id,department_id,evidence_date,expiry_date,period,status,source_system',140,'evidence_date.desc'), token),
    supabase('/rest/v1/capa?select=id,finding_id,obligation_id,correction,root_cause,corrective_action,due_date,status,effectiveness_status&order=due_date.asc&limit=80', token),
    supabase(scopedTable('permits','id,sbu_id,site_id,title,permit_type,authority,issue_date,expiry_date,status',60,'expiry_date.asc'), token),
    supabase(scopedTable('audits','id,sbu_id,audit_type,domain,title,audit_date,score,status,summary',60,'audit_date.desc'), token),
    supabase(scopedTable('esg_monthly_metrics','sbu_id,period,production_t,electricity_mwh,fuel_gj,water_m3,waste_t,recycled_t,scope1_tco2e,scope2_tco2e,ltifr',100,'period.desc'), token),
    supabase(scopedTable('hr_training_summary','sbu_id,period,headcount,training_compliance_pct,open_grievances,mandatory_training_overdue',40,'period.desc'), token),
    supabase('/rest/v1/approval_requests?select=id,request_type,object_type,object_id,requested_at,status,decided_at,decision_comment&order=requested_at.desc&limit=50', token)
  ]);

  return {
    identity: {
      email: user.email || profile?.[0]?.work_email || null,
      role: profile?.[0]?.role || null,
      scopes: scopes || []
    },
    requested_scope: { sbu, domain },
    data_notice: 'These are live records returned by Supabase under the signed-in user JWT and Row Level Security policies. Empty arrays mean no authorized live records are currently available.',
    requirements,
    obligations,
    documents,
    evidence,
    capa,
    permits,
    audits,
    esg_monthly_metrics: esg,
    hr_training_summary: hr,
    approval_requests: approvals
  };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' });
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: 'Live AI is not configured. Demo Mode remains available.' });

  const token = bearer(req);
  if (!token) return res.status(401).json({ error: 'Authenticated Supabase session required' });

  const message = String(req.body?.message || '').trim();
  if (!message) return res.status(400).json({ error: 'message is required' });
  if (message.length > 12000) return res.status(413).json({ error: 'message is too long' });

  try {
    const context = await loadAuthorizedContext(token, req.body?.scope || {});
    const serialized = JSON.stringify(context).slice(0, 120000);

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-5.6-luna',
        reasoning: { effort: 'low' },
        instructions: MASTER_INSTRUCTIONS,
        input: `User request:\n${message}\n\nAuthenticated live application context:\n${serialized}`
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: 'OpenAI request failed', detail: data?.error?.message || 'Unknown error' });

    return res.status(200).json({
      ok: true,
      mode: 'live',
      model: data.model || process.env.OPENAI_MODEL || 'gpt-5.6-luna',
      responseId: data.id || null,
      output: extractText(data) || 'No text output returned.',
      authorizedScopeCount: context.identity.scopes.length
    });
  } catch (error) {
    const status = Number(error?.status) || 500;
    return res.status(status === 401 || status === 403 ? status : 500).json({
      error: status === 401 ? 'Authentication failed' : status === 403 ? 'Access denied' : 'Live AI request failed',
      detail: error instanceof Error ? error.message : String(error)
    });
  }
}
