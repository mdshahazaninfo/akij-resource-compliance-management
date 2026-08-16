create table if not exists public.permits (
  id text primary key,
  sbu_id text not null references public.org_units(id),
  site_id text references public.org_units(id),
  permit_type text not null,
  permit_number text,
  issuing_authority text,
  issue_date date,
  expiry_date date,
  status text not null default 'Active',
  owner_user_id uuid references auth.users(id),
  source_uri text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audits (
  id text primary key,
  sbu_id text not null references public.org_units(id),
  audit_type text not null,
  title text not null,
  planned_date date,
  completed_date date,
  lead_auditor_user_id uuid references auth.users(id),
  status text not null default 'Planned',
  scope text,
  summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.esg_monthly_metrics (
  id uuid primary key default gen_random_uuid(),
  sbu_id text not null references public.org_units(id),
  period date not null,
  production numeric,
  electricity_kwh numeric,
  fuel_liters numeric,
  water_m3 numeric,
  waste_tonnes numeric,
  recycled_tonnes numeric,
  scope1_tco2e numeric,
  scope2_tco2e numeric,
  ltifr numeric,
  source_system text,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sbu_id, period)
);

create table if not exists public.hr_training_summary (
  id uuid primary key default gen_random_uuid(),
  sbu_id text not null references public.org_units(id),
  period date not null,
  headcount integer,
  training_hours numeric,
  mandatory_training_completion_pct numeric(5,2),
  incidents integer,
  lost_time_injuries integer,
  source_system text,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sbu_id, period)
);

alter table public.permits enable row level security;
alter table public.audits enable row level security;
alter table public.esg_monthly_metrics enable row level security;
alter table public.hr_training_summary enable row level security;

create policy "Authenticated users read scoped permits" on public.permits for select to authenticated using (private.has_org_scope(sbu_id));
create policy "Authenticated users read scoped audits" on public.audits for select to authenticated using (private.has_org_scope(sbu_id));
create policy "Authenticated users read scoped ESG metrics" on public.esg_monthly_metrics for select to authenticated using (private.has_org_scope(sbu_id));
create policy "Authenticated users read scoped HR training summary" on public.hr_training_summary for select to authenticated using (private.has_org_scope(sbu_id));
