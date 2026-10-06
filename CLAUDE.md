# DENTO Continuity — Demo Build (Project Memory)

## What this is
A dental clinic SaaS demo built to pitch at a dentist association meeting on Aug 15, seeking pilot/funding interest. Source spec: `DENTO_Continuity_SRS_v0.1` — an 18–24 week production spec written for a full team. This build is a deliberately compressed, single-tenant demo proving two things:
1. One clean, structured patient/clinical record replaces paper and spreadsheets.
2. The Retention Agent recovers a missed appointment end-to-end, with a human approving every action it takes.

Read this whole file before writing any code. Don't re-derive scope from the original SRS — this file is the authoritative scope for the demo build. The SRS and the other company documents sit in the repo root for reference but are git-ignored: this repository is public on GitHub, and they are internal.

## Current direction (Architecture Update, 6 October 2026)
The governing plan is `Dento_Developer_Architecture_Update_2026-10-06.docx` (repo root, git-ignored), which supersedes the phase list agreed on 5 October. Its release order:

- **P0 outcome pilot** — tenant/facility/chair/roles, patient registry, schedule and queue (chair and dentist conflicts, check-in, no-show, waitlist), consent, no-show continuity queue with human approval, real WhatsApp, money ledger (invoices, part-payments, balances), LabLink Lite, audit, CSV imports, patient self-action link, transactional outbox + worker.
- **P1 clinical and 3D core** — encounter, structured notes, dental chart with shared 2D/3D views, imaging records, treatment plans, recall, patient portal.
- **P2 practice expansion**, **P3 regulated/partner features** (imaging AI, insurance, marketplace, MCP tools).

Consequences for this repository:
- The 5 Oct Phase 0 work (conflict check, reschedule, waitlist entry, live notifications) is P0 scope and stays.
- Voice control was pulled forward from P2 by our own decision on 6 Oct 2026 (the client asked for it on day one). It lives in `lib/voice/parse.ts` (offline grammar, English + Hinglish, chrono-node for dates, runs in the browser), `lib/voice-actions.ts` (resolves patient/dentist/slot, proposes, executes only after confirmation), `app/components/voice/` (console in the header, Alt+V; VoiceFill for forms). Recognition is the browser Web Speech API for now (Chrome/Edge; audio goes to Google — swap `useSpeech.ts` for an on-device engine later). No LLM is involved yet; an unknown phrase just says so.
- 3D needs an explicit scope decision and clinical/licence approval first. Candidate generic model: github.com/Yoosseph/dental-scope (MIT code; CC BY-SA models — licence review pending).
- Sprint 0 artefacts live in `docs/sprint0/` (implementation inventory, SRS traceability, source reconciliation), also git-ignored because they quote the internal documents. Progress must be reported as documented / prototyped / implemented / tested / pilot-validated, with evidence.
- The named owners in the brief are nominal; the development team is Aryan + Claude, with freedom to decide how to build. Our build order within P0 (6 Oct 2026): 1 clinics/users/sign-in ✔ → 2 chairs + full schedule states ✔ → 3 patient self-action link ✔ → 4 outbox + real WhatsApp → 5 money ledger → 6 LabLink Lite → 7 CSV import → 8 hardening (tests, backups, India-region database, password rotation). New dependencies are fine when justified; name them in the commit message. Still external: WhatsApp Business account, Mumbai Supabase project.

## Stack (fixed — do not deviate without asking)
- Next.js (App Router, TypeScript) — **one app**, frontend and backend together (route handlers / server actions). No separate backend service.
- Prisma ORM + PostgreSQL (hosted on Supabase)
- Tailwind CSS for styling
- Deployment target: Vercel — not urgent yet, local/dev is fine for now
- Sign-in is our own: email + bcrypt password, signed cookie session (`lib/auth.ts`), guarded by `proxy.ts` and the staff layout. Roles OWNER / DENTIST / FRONT_DESK on the session; no permission engine yet. No external identity provider.

## Scope — build these (demo depth, not production depth)
- **Tenant**: multi-clinic since 6 Oct 2026. `Clinic` model; every tenant row has `clinicId`; `lib/db.ts` exports a clinic-scoped `prisma` (resolves the clinic from `runAsClinic()`, the session, or `DENTO_CLINIC_ID` outside requests) and `prismaUnscoped` for sign-in, provisioning and scripts. Creates must still pass `clinicId` explicitly (`await currentClinicId()`); the scope overrides a forged value.
- **Users/roles**: real accounts (`scripts/create-user.ts`), roles OWNER / DENTIST / FRONT_DESK, no permission engine yet.
- **Patient registry**: full CRUD.
- **Consent**: a boolean + timestamp captured at patient intake. Not a legal workflow.
- **Appointments**: states SCHEDULED → CONFIRMED → CHECKED_IN → IN_CHAIR → COMPLETED, plus CANCELLED / NO_SHOW (rules in `lib/schedule-rules.ts`; every move goes through `transitionAppointment`). Booking and rescheduling use `bookAppointment` / `rescheduleAppointment` in `lib/appointments.ts`, which refuse a slot the same patient, dentist or chair already holds. Opening hours, slot grid and chairs are clinic settings (`lib/clinic.ts`, `/settings`); the booking form offers only free slots from `/api/slots`. Walk-ins are booked as already arrived.
- **Encounters + notes**: one encounter per visit, freeform note text, a `signed` boolean.
- **Odontogram**: per-tooth findings from a small fixed list of finding types. Not full periodontal charting.
- **Imaging repository**: upload + list + view images per patient. No DICOM parsing, no AI validation.
- **Treatment plans**: state machine `proposed -> accepted -> completed`.
- **Recall**: a due-date field tied to a patient/treatment plan.
- **Retention Agent**: when an appointment's status becomes `no_show`, generate a Recommendation (reason + drafted follow-up message). Requires human approval (`front_desk` role) before it's marked `sent`. Sending is mocked — log it, don't call a real provider.
- **Communications**: logged/mocked only. No real SMS/WhatsApp/email integration.
- **Billing state**: a status enum (`paid` / `pending` / `overdue`) on treatment plans. No real payment processing.
- **Patient link**: `/p/<token>` is the patient page, reached only through a signed 30-day link (`lib/patient-links.ts`, issued by staff from the schedule menu and embedded in Retention Agent drafts). From it a patient can confirm, move (free slots only), cancel with a reason, or book a replacement after a missed visit; every action is audited `via: patient_link` and shows in staff notifications. The old open-by-UUID `/portal` is gone. `APP_BASE_URL` in `.env` is the public address used in links.
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
- Build module by module, in the P0 → P1 order under "Current direction" — don't attempt the full scope in one pass. (`PROMPT_PLAYBOOK.md`, the original build order, is not in the repo.)
- Ask before deviating from this file's scope, and before adding any dependency not already listed under Stack.
