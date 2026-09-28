# Suru

**Turn intentions into momentum.**

Suru is a task manager with an AI assistant built in. At its core it's a to-do list. The AI turns vague intentions ("work on project", "prepare for grad school") into clear tasks you can actually finish.

Built with Next.js 16, TypeScript, Tailwind CSS v4, Radix UI, Motion and Zustand.

---

## Features

### Tasks
- Create, edit, delete, complete and un-complete tasks. Every change can be undone from the toast.
- Priority (Urgent / High / Medium / Low), due date with optional time, workspace (Personal / Work / Projects) and free-form tags
- Search, filter (priority, tag, status), and sort (smart, due date, priority, newest, A–Z)
- Views: **Home** dashboard, **Inbox**, **Today** (overdue + due today), **Upcoming** (grouped by day), **Completed** (grouped by when you finished), plus one view per workspace
- Tasks are saved to `localStorage` and survive refreshes. Open tabs stay in sync, and Settings has a JSON export.

### The command bar
One input handles everything, and you type in plain language:

```
Remind me to submit the scholarship application next Friday at 10am
Ship landing page tomorrow 5pm !high @work #launch
p1 call the bank by monday
```

As you type, Suru picks out the date, time, priority (`!high`, `p1`, `asap`), workspace (`@work`) and tags (`#launch`) and shows each one as a chip.
- <kbd>Enter</kbd> adds the task using the instant local parser
- <kbd>⌘/Ctrl</kbd> + <kbd>Enter</kbd> sends the text to the AI parser instead
- **Enhance** rewrites a vague task into a specific one
- **Break down** splits the text into subtasks

### AI features
| Feature | Where |
| --- | --- |
| **Task breakdown**: a goal becomes 4–8 steps. Edit them, pick the ones you want, then *Add selected* or *Add all* | Command bar, task menu, task editor, assistant |
| **Task enhancement**: "Work on project" becomes "Complete the authentication flow and test login/logout behaviour." | Command bar, the ✨ button on each row, task editor |
| **Natural-language creation**: pulls title, date, time, priority, workspace and tags out of plain text | Command bar (<kbd>⌘/Ctrl</kbd>+<kbd>Enter</kbd>) |
| **Productivity assistant**: answers "What should I focus on today?", "Which tasks are overdue?", "Help me organise my workload", "Turn these notes into tasks" from your real task data. Answers include task rows you can check off and suggestions you can add | Side panel (<kbd>⌘/Ctrl</kbd>+<kbd>J</kbd>) |

**Demo mode.** If no API key is configured, all of these features still work using a built-in rules engine (`src/lib/ai/fallback.ts`), and the UI shows a **Demo** badge. If the live model fails (bad key, outage, rate limit), Suru answers from the same engine and says so. The AI features never leave you stuck.

### Keyboard shortcuts
| Keys | Action |
| --- | --- |
| <kbd>⌘/Ctrl</kbd> <kbd>K</kbd>, <kbd>N</kbd>, <kbd>/</kbd> | New task |
| <kbd>⌘/Ctrl</kbd> <kbd>J</kbd> | Toggle Suru AI |
| <kbd>G</kbd> then <kbd>H</kbd> / <kbd>I</kbd> / <kbd>T</kbd> / <kbd>U</kbd> / <kbd>C</kbd> | Home / Inbox / Today / Upcoming / Completed |
| <kbd>↑</kbd> <kbd>↓</kbd> (or <kbd>J</kbd> <kbd>K</kbd>) on a task | Move between tasks |
| <kbd>X</kbd> / <kbd>Space</kbd> | Complete / undo |
| <kbd>E</kbd> / <kbd>Enter</kbd> | Edit |
| <kbd>⌫</kbd> | Delete (with undo) |
| <kbd>?</kbd> | Show all shortcuts |

---

## Getting started

Requires **Node.js 20.9+**.

```bash
npm install
npm run dev
```

Open http://localhost:3000. On first launch Suru loads realistic sample tasks so the dashboard has something to show.

### Sample data
- **Clear it:** click **Clear sample data** in the banner on the Home dashboard, or choose *Start with a clean slate* on the welcome screen.
- **Reload it:** Settings → **Load sample tasks**.
- **Wipe everything:** Settings → **Delete all tasks**.

### Enabling a live AI model (optional)

```bash
cp .env.example .env.local
# then set ONE of:
ANTHROPIC_API_KEY=sk-ant-...
# or
OPENAI_API_KEY=sk-...
```

Restart the dev server. The badge in the AI panel changes from **Demo** to **Live**.

| Variable | Required | Description |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | no | Uses the Anthropic Messages API. Takes priority if both keys are set. |
| `OPENAI_API_KEY` | no | Uses OpenAI Chat Completions, or any OpenAI-compatible API |
| `OPENAI_BASE_URL` | no | Point the OpenAI provider at a compatible API (OpenRouter, Groq, Ollama…). Default `https://api.openai.com/v1` |
| `AI_MODEL` | no | Model override. Defaults: `claude-haiku-4-5` / `gpt-4o-mini` |
| `AI_RATE_LIMIT_PER_MINUTE` | no | Per-IP limit on the AI route (default `30`) |
| `AI_DISABLED` | no | `true` forces demo mode |

Keys are only read on the server, in the `/api/ai` route handler. They never reach the browser and are never committed (`.env*` is git-ignored; only `.env.example` is tracked).

---

## Deployment (Vercel)

1. Push the project to GitHub.
2. In Vercel, click **Add New → Project** and import the repository. The framework is detected automatically, so no configuration is needed.
3. *(Optional)* Under **Settings → Environment Variables**, add `ANTHROPIC_API_KEY` or `OPENAI_API_KEY`.
4. Deploy.

Without a key, the deployed app runs in demo mode and is fully functional. Any Node host that supports Next.js works too: `npm run build && npm start`.

### Pre-deploy checklist
```bash
npm run typecheck   # TypeScript
npm run lint        # ESLint
npm run build       # production build
```

---

## Architecture

```
src/
├── app/
│   ├── layout.tsx            # fonts, metadata, no-flash theme script
│   ├── page.tsx              # renders <SuruApp />
│   ├── icon.svg
│   └── api/ai/route.ts       # AI endpoint: validation, rate limit, provider call, demo fallback
├── components/
│   ├── app/                  # app shell, loading skeleton
│   ├── layout/               # sidebar, mobile header, drawer, bottom tab bar
│   ├── dashboard/            # greeting, progress ring, focus lists
│   ├── tasks/                # command bar, task row, list, toolbar, editor, pickers, views
│   ├── ai/                   # assistant panel, breakdown dialog, suggestion list, markdown
│   ├── dialogs/              # settings, shortcuts, confirmations, welcome
│   └── ui/                   # button, dialog, menu/popover/tooltip, logo, empty state
├── hooks/                    # task actions (toasts + undo), shortcuts, time, media queries
└── lib/
    ├── types.ts              # domain + AI contract types
    ├── constants.ts          # priorities, workspaces
    ├── dates.ts              # date helpers (dependency-free)
    ├── selectors.ts          # filtering, sorting, grouping, dashboard stats
    ├── demo-data.ts          # sample tasks relative to "now"
    ├── nlp/parse-task.ts     # local natural-language parser (chrono-node)
    ├── store/                # Zustand stores: tasks + settings (persisted), UI (ephemeral)
    └── ai/
        ├── client.ts         # browser client: mode detection, fallback, date normalisation
        ├── prompts.ts        # JSON-only prompts per action
        ├── provider.server.ts# Anthropic / OpenAI via fetch (server-only)
        ├── validate.ts       # treats model output as untrusted; coerces to typed shapes
        └── fallback.ts       # demo intelligence (rules engine)
```

**Design decisions**
- **Client-side persistence.** Suru is a single-user app, so `localStorage` (through Zustand `persist`, with a safe in-memory fallback) keeps it free of infrastructure. A database could replace the store layer without touching components.
- **Structured AI responses.** Every AI action returns validated JSON rather than free text. That's why AI output can be shown as checklists, task rows and one-click actions instead of chat bubbles.
- **Timezone-correct dates.** The model receives and returns local wall-clock times, and the browser converts them, so "tomorrow at 10am" means 10am for the user and not for the server.
- **Privacy.** The assistant receives a compact projection of up to 80 relevant tasks: titles, dates, priority and tags. Notes are not sent.

### Design system
- Dark-first, with a refined light theme and a System option. The theme is applied before first paint, so there's no flash.
- One restrained accent, *signal lime*, reserved for momentum: progress, focus, primary actions.
- Geist Sans and Geist Mono (self-hosted through the `geist` package, so builds need no network access)
- Lucide icons and a custom priority glyph set (signal bars, plus an alert tile for urgent)
- Accessibility: semantic landmarks, skip link, visible focus rings, labelled controls, ARIA checkboxes and radios, Radix-managed focus trapping, and `prefers-reduced-motion` support

---

Made with care. Simple concept, careful execution.
