create or replace function private.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select exists (
    select 1 from public.user_profiles p
    where p.user_id = (select auth.uid())
      and p.active = true
      and p.role in ('platform_admin','admin')
  );
$$;

create or replace function private.has_admin_scope(target_org_unit_id text)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select exists (
    select 1
    from public.user_org_scope s
    join public.user_profiles p on p.user_id = s.user_id
    where s.user_id = (select auth.uid())
      and s.org_unit_id = target_org_unit_id
      and s.access_level = 'admin'
      and p.active = true
  );
$$;

revoke all on function private.is_platform_admin() from public;
revoke all on function private.has_admin_scope(text) from public;
grant execute on function private.is_platform_admin() to authenticated;
grant execute on function private.has_admin_scope(text) to authenticated;

alter table public.requirements add column if not exists visibility text not null default 'Internal' check (visibility in ('Private','Internal','Public'));
alter table public.requirements add column if not exists publication_status text not null default 'Draft' check (publication_status in ('Draft','Under Review','Approved','Published','Archived'));
alter table public.requirements add column if not exists is_archived boolean not null default false;

alter table public.obligations add column if not exists visibility text not null default 'Internal' check (visibility in ('Private','Internal','Public'));
alter table public.obligations add column if not exists publication_status text not null default 'Draft' check (publication_status in ('Draft','Under Review','Approved','Published','Archived'));
alter table public.obligations add column if not exists is_archived boolean not null default false;

alter table public.documents add column if not exists visibility text not null default 'Internal' check (visibility in ('Private','Internal','Public'));
alter table public.documents add column if not exists publication_status text not null default 'Draft' check (publication_status in ('Draft','Under Review','Approved','Published','Archived'));
alter table public.documents add column if not exists is_archived boolean not null default false;

alter table public.evidence add column if not exists visibility text not null default 'Internal' check (visibility in ('Private','Internal','Public'));
alter table public.evidence add column if not exists publication_status text not null default 'Draft' check (publication_status in ('Draft','Under Review','Approved','Published','Archived'));
alter table public.evidence add column if not exists is_archived boolean not null default false;

alter table public.capa add column if not exists visibility text not null default 'Internal' check (visibility in ('Private','Internal','Public'));
alter table public.capa add column if not exists publication_status text not null default 'Draft' check (publication_status in ('Draft','Under Review','Approved','Published','Archived'));
alter table public.capa add column if not exists is_archived boolean not null default false;

alter table public.permits add column if not exists visibility text not null default 'Internal' check (visibility in ('Private','Internal','Public'));
alter table public.permits add column if not exists publication_status text not null default 'Draft' check (publication_status in ('Draft','Under Review','Approved','Published','Archived'));
alter table public.permits add column if not exists is_archived boolean not null default false;

alter table public.audits add column if not exists visibility text not null default 'Internal' check (visibility in ('Private','Internal','Public'));
alter table public.audits add column if not exists publication_status text not null default 'Draft' check (publication_status in ('Draft','Under Review','Approved','Published','Archived'));
alter table public.audits add column if not exists is_archived boolean not null default false;

alter table public.esg_monthly_metrics add column if not exists visibility text not null default 'Internal' check (visibility in ('Private','Internal','Public'));
alter table public.esg_monthly_metrics add column if not exists publication_status text not null default 'Draft' check (publication_status in ('Draft','Under Review','Approved','Published','Archived'));
alter table public.esg_monthly_metrics add column if not exists is_archived boolean not null default false;

create policy "Public read published requirements" on public.requirements for select to anon using (visibility='Public' and publication_status='Published' and is_archived=false);
create policy "Public read published obligations" on public.obligations for select to anon using (visibility='Public' and publication_status='Published' and is_archived=false);
create policy "Public read published documents" on public.documents for select to anon using (visibility='Public' and publication_status='Published' and is_archived=false);
create policy "Public read published permits" on public.permits for select to anon using (visibility='Public' and publication_status='Published' and is_archived=false);
create policy "Public read published audits" on public.audits for select to anon using (visibility='Public' and publication_status='Published' and is_archived=false);
create policy "Public read published ESG metrics" on public.esg_monthly_metrics for select to anon using (visibility='Public' and publication_status='Published' and is_archived=false);

grant select on public.requirements, public.obligations, public.documents, public.permits, public.audits, public.esg_monthly_metrics to anon;

create policy "Admins insert requirements" on public.requirements for insert to authenticated with check (private.is_platform_admin());
create policy "Admins update requirements" on public.requirements for update to authenticated using (private.is_platform_admin()) with check (private.is_platform_admin());
create policy "Admins insert scoped obligations" on public.obligations for insert to authenticated with check (private.is_platform_admin() or private.has_admin_scope(sbu_id));
create policy "Admins update scoped obligations" on public.obligations for update to authenticated using (private.is_platform_admin() or private.has_admin_scope(sbu_id)) with check (private.is_platform_admin() or private.has_admin_scope(sbu_id));
create policy "Admins insert scoped documents" on public.documents for insert to authenticated with check (private.is_platform_admin() or private.has_admin_scope(sbu_id));
create policy "Admins update scoped documents" on public.documents for update to authenticated using (private.is_platform_admin() or private.has_admin_scope(sbu_id)) with check (private.is_platform_admin() or private.has_admin_scope(sbu_id));
create policy "Admins insert scoped evidence" on public.evidence for insert to authenticated with check (private.is_platform_admin() or private.has_admin_scope(sbu_id));
create policy "Admins update scoped evidence" on public.evidence for update to authenticated using (private.is_platform_admin() or private.has_admin_scope(sbu_id)) with check (private.is_platform_admin() or private.has_admin_scope(sbu_id));
create policy "Admins insert scoped capa" on public.capa for insert to authenticated with check (private.is_platform_admin() or exists (select 1 from public.obligations o where o.id=capa.obligation_id and private.has_admin_scope(o.sbu_id)));
create policy "Admins update scoped capa" on public.capa for update to authenticated using (private.is_platform_admin() or exists (select 1 from public.obligations o where o.id=capa.obligation_id and private.has_admin_scope(o.sbu_id))) with check (private.is_platform_admin() or exists (select 1 from public.obligations o where o.id=capa.obligation_id and private.has_admin_scope(o.sbu_id)));
create policy "Admins insert scoped permits" on public.permits for insert to authenticated with check (private.is_platform_admin() or private.has_admin_scope(sbu_id));
create policy "Admins update scoped permits" on public.permits for update to authenticated using (private.is_platform_admin() or private.has_admin_scope(sbu_id)) with check (private.is_platform_admin() or private.has_admin_scope(sbu_id));
create policy "Admins insert scoped audits" on public.audits for insert to authenticated with check (private.is_platform_admin() or private.has_admin_scope(sbu_id));
create policy "Admins update scoped audits" on public.audits for update to authenticated using (private.is_platform_admin() or private.has_admin_scope(sbu_id)) with check (private.is_platform_admin() or private.has_admin_scope(sbu_id));
create policy "Admins insert scoped ESG metrics" on public.esg_monthly_metrics for insert to authenticated with check (private.is_platform_admin() or private.has_admin_scope(sbu_id));
create policy "Admins update scoped ESG metrics" on public.esg_monthly_metrics for update to authenticated using (private.is_platform_admin() or private.has_admin_scope(sbu_id)) with check (private.is_platform_admin() or private.has_admin_scope(sbu_id));

create policy "Admins insert audit log" on public.audit_log for insert to authenticated with check (
  actor_user_id=(select auth.uid()) and (
    private.is_platform_admin() or (sbu_id is not null and private.has_admin_scope(sbu_id))
  )
);
