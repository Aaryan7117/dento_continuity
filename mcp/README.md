# DENTO Continuity — Model Context Protocol (MCP) Server

Connect any LLM (Claude Desktop, Cursor, Antigravity IDE, Ollama, OpenAI) directly to your live DENTO Continuity clinical database via the standard **Model Context Protocol (MCP)**.

---

## ⚡ Quick Start: Connecting to Claude Desktop

### Windows:
Edit `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "dento-continuity": {
      "command": "npx",
      "args": ["-y", "tsx", "E:/dento-continuity/mcp/server.ts"],
      "env": {
        "DIRECT_DATABASE_URL": "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
      }
    }
  }
}
```

### macOS:
Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "dento-continuity": {
      "command": "npx",
      "args": ["-y", "tsx", "/path/to/dento-continuity/mcp/server.ts"],
      "env": {
        "DIRECT_DATABASE_URL": "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
      }
    }
  }
}
```

---

## 🛠️ Available MCP Tools

| Tool | Parameters | What it does |
|---|---|---|
| `get_practice_summary` | `none` | Real-time overview of appointments, chair occupancy, retention approvals, and revenue recovered. |
| `search_patients` | `query` (string), `limit?` (number) | Search patient records across name, phone, or email. |
| `get_patient_chart` | `patientId` (UUID) | Complete clinical record: demographics, active FDI tooth findings, past encounters, treatment plans, and recalls. |
| `get_today_schedule` | `status?` (string) | Full schedule for today with patient contacts, scheduled procedures, providers, and financial values. |
| `get_pending_recommendations` | `none` | Active retention messages drafted by the AI agent awaiting human sign-off. |
| `approve_recommendation` | `recommendationId` (UUID), `editedMessage?`, `channel?` | Approves a recovery message and logs an append-only audit event. |
| `dismiss_recommendation` | `recommendationId` (UUID) | Dismisses unneeded follow-up from the queue. |
| `chart_tooth_finding` | `patientId`, `toothCode` (FDI), `finding`, `surfaces?`, `note?` | Charts a per-tooth condition into the patient's record (e.g. FDI #24 CARIES on MESIAL/OCCLUSAL). |
| `get_smart_waitlist` | `unfilledOnly?` (boolean) | Lists waitlisted patients with their procedure requirements and availability. |
| `book_appointment` | `patientId`, `startsAt`, `endsAt`, `reason`, `estimatedValue?` | Books a new appointment slot directly into the practice diary. |
| `get_chair_utilization` | `date?` (YYYY-MM-DD) | Hourly breakdown of clinic chair occupancy and downtime. |

---

## 📂 Realtime Resources

- `dento://clinic/summary` — Live JSON snapshot of practice KPIs.
- `dento://schedule/today` — Current day's appointment list.
- `dento://continuity/queue` — Pending retention queue.
- `dento://reference/fdi-notation` — FDI 2-digit tooth numbering and surface reference.

---

## 💡 Example Prompts to Ask Your LLM

1. *"Give me a morning briefing of today's schedule, high-value treatments, and any pending no-shows."*
2. *"Search for patient Adeyemi and summarize her dental chart and active treatment plans."*
3. *"Chart a restoration on tooth 36 with occlusal and distal surfaces for patient Kelechi Anyanwu."*
4. *"Who is currently on our smart waitlist for a crown fitting?"*
5. *"Review all pending retention drafts and approve Marcus Delgado's recovery SMS."*

---

## 🧪 Testing Locally

You can test the MCP server anytime by running:

```bash
npm run mcp
```
or run the automated test suite:
```bash
npx tsx scripts/test-mcp.ts
```
