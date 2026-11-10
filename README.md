# CinemaIP Digital Marketing Plan

A single-page marketing plan for CinemaIP (targets, calendar, initiatives, critic economics, decisions, budget) with a shared task board the team works from.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
# or, for production
npm run build && npm start
```

Everyone uses the same running app, so they all see and edit the same board. Changes made by others appear within a few seconds.

## Where the board is saved

Everything on the task board is saved straight away: the team, every task and a log of who changed what. Where it goes depends on where the app runs:

| Running on | Board is stored in |
|---|---|
| Your computer or any normal server (`npm run dev` / `npm start`) | **`data/tasks.json`** (set `TASKS_FILE` to move it) |
| Vercel | **Upstash Redis**, because Vercel has no permanent disk |

### Setting up Vercel (one time)

1. In Vercel, open the project → **Storage** → **Create** → **Upstash for Redis** (the free plan is enough) → connect it to this project. This adds `KV_REST_API_URL` and `KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_URL` / `_TOKEN`) for you.
2. **Redeploy** (Deployments → ⋯ → Redeploy, or push to `main`).
3. Open the site → Team panel → **Import JSON**, and pick your local `data/tasks.json` (or a team list like `examples/team.json`) to add the team.

Until storage is connected, the Vercel site shows the plan tasks read-only, with a "Saving isn't set up on this site yet" message.

On Redis, saves are compare-and-swap, so people editing at the same moment never overwrite each other. The last 60 backups are kept in the `cinemaip:board:backups` list, and **Export** downloads the board as a `.json` file. Set `TASKS_REDIS_KEY` to use a different key.

### The local file

- **Keep this file safe.** `data/` is git-ignored because it holds team names and emails. Back it up, and don't delete it.
- **Automatic backups.** Before saves (at most one every 5 minutes), and always before an upgrade, import, permanent delete or member removal, a copy goes to `data/backups/auto-*.json`. The newest 60 are kept. Files you put in `data/backups/` yourself are never touched.
- **Restore.** Copy a backup over `data/tasks.json`. The board picks it up within a few seconds.
- **Download.** Use *Export* in the Team panel (or `GET /api/export`) to get the whole file.

### File format

```jsonc
{
  "version": 2,
  "rev": 42,                        // goes up on every save
  "updatedAt": "2026-11-10T14:41:34.721Z",
  "team": [
    { "id": "m_1a2b3c4d", "name": "Priya Sharma", "role": "Growth lead", "email": "priya@example.com",
      "addedAt": "…", "updatedAt": "…" }
  ],
  "tasks": [
    {
      "id": "decision:cash-cap",     // plan tasks: decision:…, activity:p1-i1, initiative:9; your own: custom:…
      "type": "decision",            // decision | activity | initiative | custom
      "title": "Cash cap",
      "summary": "One line shown on the card",
      "description": "Context: …\nSteps:\n- …\nDone when: …",
      "context": "Decision before launch",
      "pillar": null,                // or "Be found" | "Be seen" | "Build the community" | "Contests and intelligence"
      "assigneeId": "m_1a2b3c4d",    // must match a team id; "assignee" is filled in from the team
      "assignee": "Priya Sharma",
      "status": "in_progress",       // todo | in_progress | blocked | done
      "priority": "high",            // high | medium | low
      "due": "2026-11-30",           // YYYY-MM-DD or null
      "notes": "",
      "removed": false,              // true = in "Removed tasks", restorable
      "createdAt": "…", "updatedAt": "…", "updatedBy": "Priya Sharma"
    }
  ],
  "activity": [                      // newest first, last 500 kept
    { "id": "a_…", "at": "…", "by": "Priya Sharma", "taskId": "decision:cash-cap",
      "subject": "Cash cap", "action": "status To do → In progress" }
  ]
}
```

**Editing by hand.** You can edit the file in any editor while the app runs.
- **Tidying.** On the next read the app checks it and fixes small problems: it gives new people an id, clears owners who aren't on the team, and adds back any missing plan task.
- **Broken JSON.** If the file isn't valid JSON, the page keeps showing the last good version and pauses edits, so your file is never overwritten. Fix the file and it carries on.

**Descriptions.** A description is plain text with two conventions. A line like `Label: text` gets a bold label, and a line starting with `- ` becomes a bullet.

## Team

- **Add people** in the Team panel, or use **Import JSON** with a list like [`examples/team.json`](examples/team.json). A downloaded board file works too.
- **Matching on import.** People already on the team are matched by email, then by name, and only have a missing role or email filled in.
- **Who made a change.** Each person picks their name under **You are** in the Team panel, so the history shows who made each change.

## Code map

- `lib/plan.ts`: the plan data (budget, goals, calendar, payouts, decisions)
- `lib/tasks.ts`: task model, and the default task wording and descriptions built from the plan
- `lib/task-store.ts`: the JSON file store (validation, locking, atomic writes, backups, upgrades)
- `app/api/`: `tasks`, `tasks/[id]`, `tasks/[id]/restore`, `members`, `members/[id]`, `members/import`, `export`
- `components/tasks/`: the board, task panel, team panel and shared UI
