create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.has_org_scope(target_org_unit_id text)
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
      and p.active = true
  );
$$;

revoke all on function private.has_org_scope(text) from public;
grant execute on function private.has_org_scope(text) to authenticated;

create policy "Authenticated users read scoped org units" on public.org_units for select to authenticated using (private.has_org_scope(id));
create policy "Authenticated users read requirements" on public.requirements for select to authenticated using (true);
create policy "Authenticated users read scoped obligations" on public.obligations for select to authenticated using (private.has_org_scope(sbu_id));
create policy "Authenticated users read scoped controls" on public.controls for select to authenticated using (exists (select 1 from public.obligations o where o.id = controls.obligation_id and private.has_org_scope(o.sbu_id)));
create policy "Authenticated users read scoped documents" on public.documents for select to authenticated using (private.has_org_scope(sbu_id));
create policy "Authenticated users read scoped obligation documents" on public.obligation_documents for select to authenticated using (exists (select 1 from public.obligations o where o.id = obligation_documents.obligation_id and private.has_org_scope(o.sbu_id)));
create policy "Authenticated users read scoped evidence" on public.evidence for select to authenticated using (private.has_org_scope(sbu_id));
create policy "Authenticated users read scoped assessments" on public.assessments for select to authenticated using (exists (select 1 from public.obligations o where o.id = assessments.obligation_id and private.has_org_scope(o.sbu_id)));
create policy "Authenticated users read scoped findings" on public.findings for select to authenticated using (exists (select 1 from public.obligations o where o.id = findings.obligation_id and private.has_org_scope(o.sbu_id)));
create policy "Authenticated users read scoped capa" on public.capa for select to authenticated using (exists (select 1 from public.obligations o where o.id = capa.obligation_id and private.has_org_scope(o.sbu_id)));
create policy "Users read own approval requests" on public.approval_requests for select to authenticated using (requested_by = (select auth.uid()) or decided_by = (select auth.uid()));
create policy "Users read own agent runs" on public.agent_runs for select to authenticated using (user_id = (select auth.uid()));
create policy "Users read own or scoped audit log" on public.audit_log for select to authenticated using (actor_user_id = (select auth.uid()) or (sbu_id is not null and private.has_org_scope(sbu_id)));
