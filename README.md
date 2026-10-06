# DENTO Continuity

Clinic software for small dental practices in India: one clean patient and
appointment record, a day-of-visit schedule that runs by voice, and a retention
agent that recovers missed appointments with a human approving every message.

The scope and build order are in `CLAUDE.md`. Read it before changing anything.

## Run it locally

Requirements: Node 22, a PostgreSQL database (we use Supabase, Mumbai region).

```bash
npm install
cp .env.example .env        # then fill in the values; see the comments inside
npx prisma generate
npx prisma migrate deploy   # creates the tables
npx prisma db seed          # demo clinic, staff accounts, patients, today's schedule
npm run dev                 # http://localhost:3000
```

Sign in with any seeded account; the password is `dento-demo-2026` unless
`SEED_PASSWORD` was set when seeding.

| Role | Email |
|---|---|
| Front desk | front.desk@dentocontinuity.demo |
| Dentist | s.adeleke@dentocontinuity.demo |
| Dentist | n.chukwu@dentocontinuity.demo |
| Owner | owner@dentocontinuity.demo |

Re-running the seed wipes and recreates the demo data, so today's schedule
always has the no-show case on it.

More accounts or clinics:

```bash
npx tsx scripts/create-user.ts --clinic demo --email you@example.com --name "Your Name" --role FRONT_DESK --password "..."
npx tsx scripts/create-user.ts --new-clinic "Smile Dental" --clinic smile --email owner@smile.in --name "Dr Rao" --role OWNER --password "..."
```

## Voice

Voice commands work in Chrome or Edge. Press Alt+V anywhere in the staff app,
wait for the red light and the tone, then speak. Forms have a "Fill by voice"
button.

Two recognisers exist. With no model present the browser's own recogniser is
used (audio goes to the browser vendor). Put a sherpa-onnx model folder under
`models/` (or point `VOICE_MODEL_DIR` at one) and recognition runs on the
server machine instead; the Settings page shows which one is live. The desktop
build offers to download the model on first launch. Benchmark a model with:

```bash
npx tsx scripts/voice-bench.ts qwen3 --hotwords
```

## Useful commands

| Command | What it does |
|---|---|
| `npm run dev` | development server with hot reload |
| `npm run build && npm start` | production build, for realistic timings |
| `npm run lint` | ESLint |
| `npx tsc --noEmit -p .` | type-check |
| `npx prisma migrate dev --name <change>` | create a migration after editing `prisma/schema.prisma` |
| `npx prisma studio` | browse the database |
| `npm run electron:build:win` | Windows desktop installer |
| `npm run mcp` | the MCP server for LLM tools (needs `DENTO_CLINIC_ID`) |

Prisma Migrate must use the session-mode connection (`DIRECT_DATABASE_URL`).
Through the transaction pooler it hangs without any output.

## Where things live

- `app/(staff)/` staff pages: front desk, dashboard, patients, calendar, settings
- `app/p/[token]/` the patient's own page, reached only through a signed link
- `app/api/` route handlers used by client-side fetching
- `lib/` all business logic: appointments and state rules, clinic settings,
  retention agent, patient links, voice grammar and actions, tenancy, auth
- `prisma/` schema, migrations, seed
- `electron/` desktop wrapper and first-launch model download
- `scripts/` account creation, voice benchmark, desktop diagnostics

Internal company documents and `docs/sprint0/` are git-ignored on purpose:
this repository is public.
