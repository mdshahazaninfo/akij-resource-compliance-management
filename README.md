# Akij Resource Compliance Management

Demo-first, live-ready Compliance Management + Document Intelligence platform for Akij Resource.

## Current state

The repository contains a complete interactive synthetic-data demonstration that runs as a static site and preserves the management demo experience: login screen, executive dashboard, compliance register, controlled documents, evidence, audit/CAPA, ESG/operating data, free-form Master AI Workspace, MCP/agent control plane, human-approval simulation, audit trail, filtering, drill-down and exports.

All bundled business records are **synthetic demonstration data** and must not be treated as actual Akij Resource compliance evidence.

## Two operating modes

### Demo Mode — default

- Static HTML/CSS/JavaScript
- No external server required
- No database required
- No OpenAI API key required
- Deterministic synthetic enterprise dataset
- Free-form local query engine
- Human-approval simulation
- Suitable for GitHub Pages

### Live AI Mode — optional

Open a Vercel deployment with `?mode=live`. If `/api/health` confirms server-side OpenAI configuration, the same AI input areas use `/api/chat`. If the live service is unavailable, the interface falls back to the synthetic demo engine.

Live Mode is designed for:

- Server-side OpenAI Responses API
- Supabase PostgreSQL + Auth + RLS
- Real user/SBU/department permissions
- Human-in-the-loop approval workflow
- Real audit logging
- Controlled MCP integrations
- Future Google Workspace, PeopleDesk, iBOS/ERP and SCADA connectors

## Repository structure

```text
.
├── index.html
├── assets/
│   ├── app.css
│   ├── app.js
│   └── live-mode.js
├── api/
│   ├── health.js
│   └── chat.js
├── config/
│   ├── agent-catalog.json
│   └── mcp-catalog.json
├── database/
│   └── schema.sql
├── docs/
│   ├── ARCHITECTURE.md
│   └── DEPLOYMENT.md
├── .env.example
├── .gitignore
├── .nojekyll
├── package.json
└── vercel.json
```

## GitHub Pages

The root `index.html` is GitHub Pages-ready. Enable Pages from repository **Settings → Pages**, choose **Deploy from a branch**, select `main` and `/(root)`.

## Live configuration

Copy `.env.example` to `.env.local` for local development, or add the variables to the Vercel project. Never commit real keys or passwords.

Core variables:

```env
APP_MODE=live
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5.6-luna
SUPABASE_URL=...
SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

`SUPABASE_SERVICE_ROLE_KEY` and `OPENAI_API_KEY` are server-side secrets only.

## Governance principle

The AI is an analysis/orchestration layer, not the system of record or compliance authority. Consequential actions such as official compliance-status changes, controlled-document approval, CAPA closure, regulatory submission and record deletion require authorized human control.

See `docs/DEPLOYMENT.md` and `docs/ARCHITECTURE.md` for the implementation path.
