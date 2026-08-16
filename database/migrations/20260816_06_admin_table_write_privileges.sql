grant insert, update on public.requirements, public.obligations, public.documents, public.evidence, public.capa, public.permits, public.audits, public.esg_monthly_metrics to authenticated;
grant insert on public.audit_log to authenticated;
revoke delete on public.requirements, public.obligations, public.documents, public.evidence, public.capa, public.permits, public.audits, public.esg_monthly_metrics from anon, authenticated;
