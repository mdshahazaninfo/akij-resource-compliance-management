export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    ok: true,
    service: 'akij-resource-compliance-management',
    mode: process.env.APP_MODE || 'demo',
    openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
    supabaseConfigured: Boolean(process.env.SUPABASE_URL),
    timestamp: new Date().toISOString()
  });
}
