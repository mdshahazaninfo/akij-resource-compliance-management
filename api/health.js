const DEFAULT_SUPABASE_URL = 'https://beubdcsqxvlukhficvjq.supabase.co';

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    ok: true,
    service: 'akij-resource-compliance-management',
    mode: process.env.APP_MODE || 'demo',
    openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
    supabaseConfigured: Boolean(process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL),
    authMode: 'supabase-jwt-rls',
    timestamp: new Date().toISOString()
  });
}
