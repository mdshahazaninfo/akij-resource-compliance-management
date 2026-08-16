const MASTER_INSTRUCTIONS = `You are the Akij Resource Compliance Management Master Agent.
Operate as a compliance and document-intelligence assistant. Separate facts from AI assessment, gaps, risks, recommendations, and human decisions. Never invent legal requirements, document IDs, evidence, approvals, or compliance status. Treat supplied records as the only organization-specific facts available in this request. Cite record IDs when present. Controlled decisions such as official compliance status, CAPA closure, policy approval, regulatory submission, or deletion require an authorized human.`;

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

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' });
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: 'Live AI is not configured. Demo Mode remains available.' });

  const message = String(req.body?.message || '').trim();
  if (!message) return res.status(400).json({ error: 'message is required' });
  if (message.length > 12000) return res.status(413).json({ error: 'message is too long' });

  const context = req.body?.context && typeof req.body.context === 'object'
    ? JSON.stringify(req.body.context).slice(0, 60000)
    : '{}';

  try {
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
        input: `User request:\n${message}\n\nAuthorized application context supplied for this request:\n${context}`
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: 'OpenAI request failed', detail: data?.error?.message || 'Unknown error' });

    return res.status(200).json({
      ok: true,
      mode: 'live',
      model: data.model || process.env.OPENAI_MODEL || 'gpt-5.6-luna',
      responseId: data.id || null,
      output: extractText(data) || 'No text output returned.'
    });
  } catch (error) {
    return res.status(500).json({ error: 'Live AI request failed', detail: error instanceof Error ? error.message : String(error) });
  }
}
