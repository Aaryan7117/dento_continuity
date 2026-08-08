# DENTO Continuity — Demo Build (Project Memory)

## What this is
A dental clinic SaaS demo built to pitch at a dentist association meeting on Aug 15, seeking pilot/funding interest. Source spec: `DENTO_Continuity_SRS_v0.1` — an 18–24 week production spec written for a full team. This build is a deliberately compressed, single-tenant demo proving two things:
1. One clean, structured patient/clinical record replaces paper and spreadsheets.
2. The Retention Agent recovers a missed appointment end-to-end, with a human approving every action it takes.

Read this whole file before writing any code. Don't re-derive scope from the original SRS — this file is the authoritative scope for the demo build.

## Stack (fixed — do not deviate without asking)
- Next.js (App Router, TypeScript) — **one app**, frontend and backend together (route handlers / server actions). No separate backend service.
- Prisma ORM + PostgreSQL (hosted on Supabase)
- Tailwind CSS for styling
- Deployment target: Vercel — not urgent yet, local/dev is fine for now
- No auth provider complexity: hardcode two roles, `dentist` and `front_desk`, no permission engine

## Scope — build these (demo depth, not production depth)
- **Tenant**: hardcode to ONE clinic. No multi-tenant logic anywhere.
- **Users/roles**: two hardcoded roles, no permission engine.
- **Patient registry**: full CRUD.
- **Consent**: a boolean + timestamp captured at patient intake. Not a legal workflow.
- **Appointments**: create/edit/cancel, status field including `no_show`.
- **Encounters + notes**: one encounter per visit, freeform note text, a `signed` boolean.
- **Odontogram**: per-tooth findings from a small fixed list of finding types. Not full periodontal charting.
- **Imaging repository**: upload + list + view images per patient. No DICOM parsing, no AI validation.
- **Treatment plans**: state machine `proposed -> accepted -> completed`.
- **Recall**: a due-date field tied to a patient/treatment plan.
- **Retention Agent**: when an appointment's status becomes `no_show`, generate a Recommendation (reason + drafted follow-up message). Requires human approval (`front_desk` role) before it's marked `sent`. Sending is mocked — log it, don't call a real provider.
- **Communications**: logged/mocked only. No real SMS/WhatsApp/email integration.
- **Billing state**: a status enum (`paid` / `pending` / `overdue`) on treatment plans. No real payment processing.
- **Patient portal**: read-only — own appointments, plan status, message log.
- **Audit**: a simple append-only event log table (actor, action, entity, timestamp). Not cryptographic.

## Explicitly out of scope — do not build, do not suggest
FHIR mapping, DICOMweb gateway, insurer/insurance-claims fields, multi-branch hierarchy, AI model registry, lab case identifiers, autonomous diagnosis, production imaging AI, biometric identity, CAD/CAM, lab manufacturing integration, marketplace, real messaging provider integration, granular RBAC, production-grade security hardening. If a task seems to need one of these, stop and ask instead of building a version of it.

## The one flow that must work perfectly (demo golden path)
1. Front desk sees today's schedule with a flagged no-show.
2. The Retention Agent has already drafted a recommended follow-up for that no-show.
3. Front desk reviews and approves it → logged as sent.
4. The patient (seed data) shows a rebooked appointment as the outcome.
5. The dashboard reflects the recovered appointment and estimated revenue recovered.

Every other feature should work, but this exact path needs to be fast and bulletproof — the audience is practicing dentists who will judge chairside speed on the clinical and front-desk screens specifically.

## Conventions
- All entities: `id` (uuid), `createdAt`, `updatedAt`.
- Validate all API input with Zod.
- Prefer server actions; use route handlers only where the frontend needs client-side fetching.
- Business logic lives in `/lib` or `/server`, not inline in route handlers — keep it testable.
- Seed script produces ~15–20 realistic patients with varied history: several with treatment plans in different states, a few upcoming appointments, and exactly one patient set up as the no-show demo case with enough history to make the Retention Agent's recommendation believable.
- Keep UI components simple and functional. Visual polish is a deliberate later pass — don't over-invest in styling before the data and flows work.

## Working style
- Build module by module, in the order given in `PROMPT_PLAYBOOK.md` — don't attempt the full scope in one pass.
- Ask before deviating from this file's scope, and before adding any dependency not already listed under Stack.
