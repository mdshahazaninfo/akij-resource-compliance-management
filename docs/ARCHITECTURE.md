# Architecture — Akij Resource Compliance Management

## Design goal

Preserve the current management demo exactly as an always-available synthetic experience while allowing the same UI to progressively connect to real authentication, AI, database and enterprise systems.

## Assurance chain

`Requirement → Obligation → Applicability → Risk → Control → Document → Record/Evidence → Assessment → Finding → CAPA → Verification → Compliance Status → Management Assurance`

## Runtime architecture

```text
Users
  │
  ▼
Akij Resource Compliance Management UI
  │
  ├──────────── Demo Mode ──────────────┐
  │                                     │
  │                              Synthetic Data Engine
  │                              Local Query Engine
  │                              Browser Audit Session
  │
  └──────────── Live Mode ──────────────┐
                                        ▼
                                  Secure API Layer
                                        │
                           ┌────────────┼────────────┐
                           ▼            ▼            ▼
                     OpenAI Master   Supabase     MCP Layer
                        Agent         Auth/DB          │
                           │             │             ├─ Legal
                    Specialist Agents   RLS            ├─ CMS
                           │             │             ├─ DMS
                           │             │             ├─ Evidence
                           │             │             ├─ Audit
                           │             │             ├─ CAPA
                           │             │             ├─ Identity
                           │             │             ├─ ERP
                           │             │             └─ Reporting
                           │             │
                           └─────────────┴──────► Enterprise Systems
```

## Master and specialist agents

The Master Agent owns orchestration and final response composition. Specialist responsibilities are recorded in `config/agent-catalog.json`.

The Master Agent may search, analyze, compare, summarize and draft. It must not silently convert AI analysis into an official compliance decision.

## MCP control plane

The intended MCP boundaries are defined in `config/mcp-catalog.json`:

- ARG-Legal-MCP
- ARG-CMS-MCP
- ARG-DMS-MCP
- ARG-Evidence-MCP
- ARG-Audit-MCP
- ARG-CAPA-MCP
- ARG-Identity-MCP
- ARG-ERP-MCP
- ARG-Reporting-MCP

## Authentication and authorization

Demo authentication is a presentation gate only. Production authentication belongs in Supabase Auth or enterprise SSO/MFA.

Production access control must combine:

- verified identity
- role
- SBU scope
- site/department scope
- tool allowlist
- RLS/database policies
- human approval for consequential writes

The database foundation in `database/schema.sql` enables RLS on exposed business tables and deliberately does not add broad business-data client policies.

## Human-in-the-loop boundary

Automatic AI actions:

- search
- filtering
- summarization
- comparison
- gap identification
- management narrative
- draft CAPA

Approval-gated actions:

- official compliance status update
- CAPA assignment
- controlled workflow writes

Human-only actions:

- policy/document approval
- regulatory submission
- critical NC closure
- official evidence deletion

## Data source evolution

1. Synthetic data engine — current.
2. Supabase structured registers.
3. Controlled DMS/storage.
4. Google Workspace documents and evidence.
5. PeopleDesk HR/training data.
6. iBOS/ERP transactions and production data.
7. SCADA energy/water/emissions/operating data.
8. Validated legal/standards knowledge sources.

## Security rule

No OpenAI API key, Supabase service-role key, corporate password, ERP token or SCADA token belongs in browser JavaScript or the public GitHub repository. Live secrets are supplied only to server-side runtime configuration.
