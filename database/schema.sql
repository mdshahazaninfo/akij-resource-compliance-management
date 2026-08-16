-- Akij Resource Compliance Management — production database foundation
-- Target: PostgreSQL / Supabase
-- Safe default: RLS is enabled and business tables have no broad client policies.
-- Apply only after review in a controlled Supabase project.

create extension if not exists pgcrypto;

create table if not exists public.org_units (
  id text primary key,
  name text not null,
  unit_type text not null check (unit_type in ('Group','SBU','Site','Department')),
  parent_id text references public.org_units(id),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  work_email text not null unique,
  display_name text,
  role text not null default 'employee',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_org_scope (
  user_id uuid not null references auth.users(id) on delete cascade,
  org_unit_id text not null references public.org_units(id) on delete cascade,
  access_level text not null default 'read' check (access_level in ('read','contribute','approve','admin')),
  primary key (user_id, org_unit_id)
);

create table if not exists public.requirements (
  id text primary key,
  source_type text not null,
  source_name text not null,
  clause text,
  title text not null,
  requirement_text text not null,
  domain text,
  jurisdiction text,
  authoritative boolean not null default true,
  effective_date date,
  status text not null default 'Active',
  source_uri text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.obligations (
  id text primary key,
  requirement_id text not null references public.requirements(id),
  sbu_id text not null references public.org_units(id),
  site_id text references public.org_units(id),
  department_id text references public.org_units(id),
  process text,
  owner_user_id uuid references auth.users(id),
  frequency text,
  due_date date,
  risk_level text not null default 'Medium' check (risk_level in ('Low','Medium','High','Critical')),
  compliance_status text not null default 'Not Assessed' check (compliance_status in ('Compliant','Partially Compliant','Non-Compliant','Not Assessed')),
  applicability text not null default 'Applicable',
  last_assessed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.controls (
  id text primary key,
  obligation_id text not null references public.obligations(id) on delete cascade,
  title text not null,
  description text,
  owner_user_id uuid references auth.users(id),
  frequency text,
  status text not null default 'Active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.documents (
  id text not null,
  version text not null,
  title text not null,
  document_type text not null,
  sbu_id text not null references public.org_units(id),
  department_id text references public.org_units(id),
  process text,
  owner_user_id uuid references auth.users(id),
  approver_user_id uuid references auth.users(id),
  status text not null default 'Draft',
  effective_date date,
  review_date date,
  confidentiality text not null default 'Internal',
  retention_period text,
  supersedes_version text,
  source_uri text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (id, version)
);

create table if not exists public.obligation_documents (
  obligation_id text not null references public.obligations(id) on delete cascade,
  document_id text not null,
  primary key (obligation_id, document_id)
);

create table if not exists public.evidence (
  id text primary key,
  obligation_id text not null references public.obligations(id) on delete cascade,
  title text not null,
  evidence_type text not null,
  sbu_id text not null references public.org_units(id),
  department_id text references public.org_units(id),
  evidence_date date,
  expiry_date date,
  period text,
  status text not null default 'Valid',
  source_system text,
  source_uri text,
  verified_by uuid references auth.users(id),
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  obligation_id text not null references public.obligations(id) on delete cascade,
  assessed_by uuid references auth.users(id),
  assessed_at timestamptz not null default now(),
  conclusion text not null,
  rationale text,
  confidence numeric(5,2),
  ai_run_id uuid,
  human_validated boolean not null default false
);

create table if not exists public.findings (
  id text primary key,
  obligation_id text references public.obligations(id),
  audit_type text,
  classification text not null,
  statement text not null,
  status text not null default 'Open',
  owner_user_id uuid references auth.users(id),
  due_date date,
  created_at timestamptz not null default now()
);

create table if not exists public.capa (
  id text primary key,
  finding_id text references public.findings(id),
  obligation_id text references public.obligations(id),
  correction text,
  root_cause text,
  corrective_action text,
  owner_user_id uuid references auth.users(id),
  due_date date,
  status text not null default 'Draft',
  effectiveness_status text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  request_type text not null,
  object_type text not null,
  object_id text not null,
  requested_action jsonb not null,
  requested_by uuid references auth.users(id),
  requested_at timestamptz not null default now(),
  status text not null default 'Pending' check (status in ('Pending','Approved','Rejected','Expired')),
  decided_by uuid references auth.users(id),
  decided_at timestamptz,
  decision_comment text
);

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  session_id text,
  agent_name text not null,
  model text,
  user_request text,
  output_summary text,
  citations jsonb not null default '[]'::jsonb,
  tool_calls jsonb not null default '[]'::jsonb,
  approval_required boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  actor_user_id uuid references auth.users(id),
  action text not null,
  object_type text,
  object_id text,
  sbu_id text references public.org_units(id),
  old_value jsonb,
  new_value jsonb,
  details jsonb not null default '{}'::jsonb,
  agent_run_id uuid references public.agent_runs(id)
);

create index if not exists idx_obligations_sbu on public.obligations(sbu_id);
create index if not exists idx_obligations_due on public.obligations(due_date);
create index if not exists idx_documents_sbu on public.documents(sbu_id);
create index if not exists idx_documents_review on public.documents(review_date);
create index if not exists idx_evidence_obligation on public.evidence(obligation_id);
create index if not exists idx_capa_due on public.capa(due_date);
create index if not exists idx_user_scope_user on public.user_org_scope(user_id);
create index if not exists idx_audit_occurred on public.audit_log(occurred_at desc);

-- RLS: secure-by-default on every exposed public table.
alter table public.org_units enable row level security;
alter table public.user_profiles enable row level security;
alter table public.user_org_scope enable row level security;
alter table public.requirements enable row level security;
alter table public.obligations enable row level security;
alter table public.controls enable row level security;
alter table public.documents enable row level security;
alter table public.obligation_documents enable row level security;
alter table public.evidence enable row level security;
alter table public.assessments enable row level security;
alter table public.findings enable row level security;
alter table public.capa enable row level security;
alter table public.approval_requests enable row level security;
alter table public.agent_runs enable row level security;
alter table public.audit_log enable row level security;

-- Self-service identity context only. Business-data policies are intentionally not broad-opened here.
create policy "Users read own profile"
on public.user_profiles for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users read own organization scope"
on public.user_org_scope for select
to authenticated
using ((select auth.uid()) = user_id);

-- Production policy strategy:
-- 1. Add explicit SELECT/INSERT/UPDATE policies per business table based on user_org_scope.
-- 2. Keep approval/status writes server-side and additionally validate the user's role/scope.
-- 3. Never expose SUPABASE_SERVICE_ROLE_KEY to browser code.
-- 4. Store authorization attributes in controlled profile/app metadata, not editable user metadata.
