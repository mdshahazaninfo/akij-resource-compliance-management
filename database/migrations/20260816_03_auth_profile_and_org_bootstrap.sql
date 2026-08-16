insert into public.org_units (id,name,unit_type,parent_id,active) values
('ARG','Akij Resource','Group',null,true),
('ACCL','Akij Cement Company Ltd.','SBU','ARG',true),
('AISL','Akij Ispat Ltd.','SBU','ARG',true),
('AAFL','Akij Agro Feed Ltd.','SBU','ARG',true),
('AEL','Akij Essential Ltd.','SBU','ARG',true),
('ALEL','Akij Light Engineering Ltd.','SBU','ARG',true)
on conflict (id) do update set name=excluded.name, unit_type=excluded.unit_type, parent_id=excluded.parent_id, active=excluded.active;

create or replace function private.sync_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public, private, auth
as $$
declare
  v_email text := lower(coalesce(new.email,''));
  v_is_bootstrap_admin boolean := v_email = 'ibtahaz@akijresource.com' and new.email_confirmed_at is not null;
begin
  if v_email = '' then return new; end if;

  insert into public.user_profiles(user_id,work_email,display_name,role,active,updated_at)
  values (
    new.id,
    v_email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(v_email,'@',1)),
    case when v_is_bootstrap_admin then 'platform_admin' else 'employee' end,
    true,
    now()
  )
  on conflict (user_id) do update set
    work_email = excluded.work_email,
    display_name = excluded.display_name,
    role = case when v_is_bootstrap_admin then 'platform_admin' else public.user_profiles.role end,
    active = true,
    updated_at = now();

  if v_is_bootstrap_admin then
    insert into public.user_org_scope(user_id,org_unit_id,access_level)
    select new.id, id, 'admin' from public.org_units where active = true
    on conflict (user_id,org_unit_id) do update set access_level='admin';
  end if;

  return new;
end;
$$;

revoke all on function private.sync_auth_user_profile() from public, anon, authenticated;

drop trigger if exists trg_sync_auth_user_profile on auth.users;
create trigger trg_sync_auth_user_profile
after insert or update of email,email_confirmed_at,raw_user_meta_data on auth.users
for each row execute function private.sync_auth_user_profile();
