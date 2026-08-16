# Deployment Guide

## A. GitHub Pages — Demo Mode

This is the required management-demo deployment. It does not require a server, database or OpenAI key.

1. Open the GitHub repository.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, select **Deploy from a branch**.
4. Branch: `main`.
5. Folder: `/(root)`.
6. Save.
7. Open the published Pages URL after GitHub completes the deployment.

The static entry point is `index.html`. `.nojekyll` is included so the project is served as a plain static site.

### Demo login

The login screen is preserved for presentation. The public-repository demo does **not** store a real corporate password or password hash. The configured work email is used as the presentation identity gate; production credentials must be handled by real authentication.

## B. Vercel — Live AI Mode

Use the same repository for the live backend/API deployment.

1. Import the GitHub repository into Vercel.
2. Keep the repository root as the project root.
3. Add the following server-side environment variables in Vercel:

```env
APP_MODE=live
OPENAI_API_KEY=your_server_side_key
OPENAI_MODEL=gpt-5.6-luna
SUPABASE_URL=your_project_url
SUPABASE_PUBLISHABLE_KEY=your_publishable_key
SUPABASE_SERVICE_ROLE_KEY=your_server_only_service_role_key
```

4. Deploy.
5. Confirm `/api/health` returns `ok: true`.
6. Open the Vercel site with `?mode=live`.
7. If OpenAI is configured, the same AI input boxes use `/api/chat`.
8. If the live endpoint is unavailable, the interface falls back to Demo Mode.

Do not place server secrets in `index.html`, `assets/*.js`, GitHub Pages variables, or any `NEXT_PUBLIC_`/browser-exposed variable.

## C. Supabase — Database/Auth stage

`database/schema.sql` is a secure-by-default foundation, not an instruction to expose the database publicly.

Before applying it:

1. Create a dedicated Supabase development project.
2. Review the schema and naming with the ARG application owner.
3. Apply the schema in the development environment.
4. Verify RLS is enabled on all exposed public tables.
5. Create production-grade policies for actual roles/SBU scopes before browser access is enabled.
6. Create real Auth users only after the role and scope model is approved.
7. Keep the service-role key server-side only.

Recommended roles:

- system_admin
- corporate_compliance
- sbu_compliance
- auditor
- document_controller
- process_owner
- document_author
- employee
- read_only

## D. Production integration sequence

Connect enterprise systems one at a time, keeping Demo Mode available throughout:

1. Supabase Auth + database.
2. DMS / Google Workspace.
3. PeopleDesk.
4. iBOS / ERP.
5. SCADA.
6. Validated legal/regulatory sources.
7. Remote MCP servers with managed authorization.

Every connector should begin read-only. Write capabilities are added only after identity, authorization, audit logging and human-approval controls are tested.

## E. Acceptance checklist

Before calling the system production-ready, verify:

- Demo Mode still works with external services disabled.
- Real login uses server-backed Auth/SSO.
- SBU and department access is enforced outside model prompts.
- Confidential document access is permission-filtered before retrieval.
- Official status changes create approval requests.
- CAPA closure is human-controlled.
- All AI/tool actions produce auditable run records.
- Source record/document IDs are present in compliance conclusions.
- Prompt-injection and data-leakage tests are completed.
- Backup, recovery, monitoring and incident response are configured.
