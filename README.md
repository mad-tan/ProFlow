# ProFlow — All-in-One Productivity Platform

> A full-stack productivity platform built with Next.js 15 App Router, SQLite, and Google Gemini AI. Manage tasks, projects, time, notes, mental health, and more — all from one place.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Database | SQLite via `better-sqlite3` |
| Auth | Cookie-based sessions (bcrypt) |
| AI | Google Gemini via Vercel AI SDK |
| Styling | Tailwind CSS + shadcn/ui |
| Data Fetching | SWR |
| Deployment | Railway (Docker, persistent volume) |

---

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Environment variables** (`.env.local`):
```
DATABASE_PATH=./data/productivity.db
GEMINI_API_KEY=your_key_here
```

---

## Feature Catalog

### 1. Dashboard

- Time-aware greeting (Good morning / afternoon / evening)
- **Stats cards** — each clickable, navigates to its respective page:
  - Active Projects → `/projects`
  - Active Tasks → `/tasks`
  - Completed Today → `/tasks?status=done`
  - Time Tracked Today → `/time-tracking`
  - Current Streak → `/analytics`
  - Average Mood Score → `/mental-health`
- **Recent Tasks** — latest 5 tasks with status and priority
- **Upcoming Deadlines** — tasks with due dates sorted by urgency
- **Productivity Chart** — weekly task completion bar chart
- **Active Timer widget** — live elapsed time, description, stop button
- **Mood Snapshot** — latest check-in with energy/stress levels
- **AI Insights card** — personalised recommendations from Gemini

---

### 2. Tasks

#### Task List (`/tasks`)
- **View modes:** List view and Kanban board
- **Statuses:** `backlog` → `todo` → `in_progress` → `in_review` → `done` / `cancelled`
  - Any transition between statuses is valid (no blocking rules)
- **Priorities:** `urgent` · `high` · `medium` · `low` · `none`
- **Filters:** search by title, filter by status, filter by priority
- **Create task dialog:** title, description, status, priority, due date, project
- **Kanban board:** columns for Todo / In Progress / In Review / Done; drag-and-drop cards between columns
- **Task cards:** priority colour dot, title, due date, priority badge, strikethrough when done

#### Task Detail (`/tasks/[taskId]`)
- Inline-editable title and description
- Sidebar: project link, status selector, priority selector, due date, created/updated timestamps
- Time entries linked to this task (total time, history)
- Delete task with confirmation

---

### 3. Projects

#### Project List (`/projects`)
- Responsive grid (1 / 2 / 3 columns)
- **Statuses:** `active` · `on_hold` · `completed` · `archived`
- **Colours:** 8 options — red, orange, yellow, green, cyan, blue, purple, pink
- Cards show: colour bar, name, description, status badge, task count, completion progress bar
- **Filters:** search by name, filter by status, toggle to show archived
- **Actions:** archive / delete via dropdown (with confirmation)
- Create project dialog: name, description, status, colour

#### Project Detail (`/projects/[projectId]`)
- Edit name, description, status inline
- Progress bar (completed / total tasks)
- Embedded task list with create, filter, list/board toggle

---

### 4. Time Tracking (`/time-tracking`)

- **Live timer** — start with an optional description; large MM:SS / HH:MM:SS display with animated recording dot
- **Stop timer** — auto-records start/end and calculates duration
- **Today's summary** — total hours, number of entries, average per entry
- **Time entries list** — date/time range, description, formatted duration badge
- **Manual entry dialog** — description, start datetime, end datetime, auto-calculated duration
- Timer state synced across the app (topbar indicator, dashboard widget, chatbot)

---

### 5. Reminders (`/reminders`)

- **Three tabs:** Upcoming · Past · All
- **Frequencies:** once · daily · weekly · monthly · custom
- **Card display:** title, description, scheduled datetime, frequency badge
- **Actions:** dismiss (marks inactive), delete
- Create dialog: title, description, date & time picker, frequency

---

### 6. Checklists (`/checklists`)

#### Checklist List
- Responsive grid; **types:** daily · weekly · project · custom (colour-coded)
- Cards: title, type badge, description, progress bar, completion count
- Delete via hover dropdown menu (no navigation required)

#### Checklist Detail (`/checklists/[checklistId]`)
- Inline-editable title
- **Delete checklist** — red trash icon in header → confirmation dialog (warns all items will be deleted)
- Items: checkbox toggle, text, per-item delete button (visible on hover)
- Add item: text input + Add button (or press Enter)
- Real-time progress bar

---

### 7. Notes (`/notes`)

- Responsive grid (1 / 2 / 3 columns)
- **Pinned notes** highlighted with amber ring border; appear first
- **Filters:** search by title/content, toggle pinned-only
- **Card display:** pin indicator, title, content preview (3 lines), creation date
- **Actions per card:** edit, pin/unpin, delete (via hover menu)
- **Create / Edit dialog:** title, content (textarea), pin toggle
- AI chatbot can create, list, and delete notes

---

### 8. Calendar (`/calendar`)

- Month navigation (prev / next / today)
- Grid shows dots on dates that have tasks or reminders
- Clicking a date shows:
  - **Tasks** for that day — priority dot, title, project name, priority badge
  - **Reminders** for that day — title, description, time

---

### 9. Mental Health (`/mental-health`)

#### Check-in Tab
- **Mood** — 5 emoji buttons (😢 😟 😐 🙂 😄)
- **Energy level** — slider 1–5 (Exhausted → Energized)
- **Stress level** — slider 1–5 (Relaxed → Very Stressed)
- **Sleep hours** — optional number input (0–24, step 0.5)
- **Notes** — optional free-form text
- Submit creates a check-in record and resets the form

#### History Tab
- Card grid of past check-ins
- Each card: mood emoji, date, energy bar, stress bar, sleep hours, notes preview

#### Journal Tab
- Create journal entries: title (optional), content (required)
- Entry cards: title, mood emoji, date, content preview, tags
- Delete entry with confirmation

---

### 10. Analytics (`/analytics`)

- **Productivity Score** — 0–100, colour-coded (green ≥ 80, blue ≥ 60, amber ≥ 40, red < 40)
  - Formula: task completion 50% + time tracked 30% + mood 20%
- **4 metric cards:** tasks completed today, hours tracked today, average mood, current streak
- **Weekly bar chart** — 8 weeks of task completion data
- **AI Insights** — up to 4 personalised insights:
  - Task completion rate analysis
  - Time tracking assessment
  - Mood trend analysis
  - Streak milestones
  - Top project activity highlights

---

### 11. Audit Log (`/audit-log`)

- Tracks every create, update, delete, complete, archive, restore action
- **Entity types logged:** projects, tasks, time entries, checklists, reminders, check-ins, journal entries
- **Filters:** entity type, action type, date range (start + end)
- Entry display: action icon + label (colour-coded), entity type, entity name, field-level change description (`priority: urgent → high`), timestamp
- Pagination: 30 entries/page with prev/next and page indicator

---

### 12. Settings (`/settings`)

- **Profile** — edit display name; email shown read-only
- **Appearance** — dark/light mode toggle (persists across sessions)
- **Password** — change password (requires current password, min 6 chars, confirm match)
- **Data export** — downloads `proflow-export-YYYY-MM-DD.json`
- **Sign out**

---

### 13. AI Chatbot

Opens via the floating **AI** button (bottom-right) or **Shift+C** from anywhere.
On mobile the chatbot opens full-screen; drag the pill handle down to dismiss.

#### Task Commands
| Example phrase | Action |
|---|---|
| "Add task Review code due tomorrow urgent" | `create_task` — extracts title, due date, priority, project in one shot |
| "Create a task called Deploy v2 in the HRMS project" | `create_task` with project association |
| "Delete the Review code task" | `delete_task` |
| "Mark Deploy v2 as done" | `complete_task` |
| "List my tasks" | `list_tasks` |
| "Set Review code to in progress" | `update_task` |

#### Project Commands
| Example phrase | Action |
|---|---|
| "Create a project called ProFlow Redesign" | `create_project` |
| "Show my projects" | `list_projects` |
| "Delete the HRMS project" | `delete_project` |

#### Reminder Commands
| Example phrase | Action |
|---|---|
| "Remind me at 3pm today to submit the report" | `set_reminder` |
| "Set a daily reminder at 9am to check email" | `set_reminder` with frequency |
| "Show my reminders" | `list_reminders` |
| "Delete the standup reminder" | `delete_reminder` |

#### Timer Commands
| Example phrase | Action |
|---|---|
| "Start timer for deep work" | `start_timer` |
| "Stop the timer" | `stop_timer` |

#### Checklist Commands
| Example phrase | Action |
|---|---|
| "Create a daily checklist called Morning Routine" | `create_checklist` |
| "Add buy groceries to my weekly checklist" | `add_checklist_item` |

#### Mental Health Commands
| Example phrase | Action |
|---|---|
| "Log mood 4, energy 3, stress 2" | `log_mood` — creates check-in directly |
| "Write a journal: Today was productive" | `write_journal` |

#### Note Commands
| Example phrase | Action |
|---|---|
| "Note: Remember to call John" | `create_note` |
| "Show my notes" | `list_notes` |
| "Delete the grocery note" | `delete_note` |

#### Summary Command
| Example phrase | Action |
|---|---|
| "Show my summary" / "How am I doing?" | `show_summary` — tasks, time, mood, streak |

#### Natural Language Date/Time Parsing
- `today`, `tomorrow`, `yesterday`
- `next week`, `next month`, `in 3 days`, `in 2 hours`
- `at 3pm`, `at 15:30`, `March 15`, `15th March`
- ISO format `2025-03-15`

#### Entity Extraction (single-shot via Gemini)
Title, due date, priority, project name, description, reminder time, mood/energy/stress ratings, notes content, timer description — all parsed from one message with no follow-up questions.

---

### 14. Search

- **Global search dialog** — `Cmd+K` / `Ctrl+K` or search button in topbar
- Searches across: Tasks, Projects, Notes, Reminders, Checklists
- Results grouped by entity type, click to navigate

---

### 15. Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Shift+C` | Open / close AI chatbot (fresh session) |
| `Cmd/Ctrl+K` | Open global search |

---

### 16. Mobile & PWA (iOS)

- **Add to Home Screen** — works as a standalone PWA (no browser chrome)
- **App icon** — purple gradient lightning bolt (auto-generated PNG)
- **Status bar** — `black-translucent` so the header gradient extends behind it
- **Safe area insets** — topbar, sidebar, FAB, and chatbot all respect notch / Dynamic Island / home indicator
- **Swipe gestures:**
  - Swipe right from left edge → open navigation drawer
  - Swipe left anywhere → close navigation drawer
  - Pull down on chatbot header pill → dismiss chatbot
- **No double-tap zoom** on buttons; no blue tap highlight
- **Smooth momentum scroll** on all scrollable containers

---

### 17. Authentication

- Register with name, email, password
- Login with email + password (bcrypt hashed)
- Session stored in a signed HTTP-only cookie
- All `/app/*` routes protected; redirect to `/login` if unauthenticated
- Show/hide password toggle on all password inputs

---

## API Reference

| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET/PUT | `/api/auth/me` | Get / update profile & password |
| GET/POST | `/api/tasks` | List / create tasks |
| GET/PUT/DELETE | `/api/tasks/[id]` | Get / update / delete task |
| GET/POST | `/api/projects` | List / create projects |
| GET/PUT/DELETE | `/api/projects/[id]` | Get / update / delete project |
| POST | `/api/projects/[id]/archive` | Archive project |
| GET/POST | `/api/time-entries` | List / create time entries |
| GET | `/api/time-entries/active` | Get active timer |
| POST | `/api/time-entries/[id]/stop` | Stop active timer |
| GET/POST | `/api/reminders` | List / create reminders |
| PATCH/DELETE | `/api/reminders/[id]` | Update (dismiss) / delete reminder |
| GET/POST | `/api/checklists` | List / create checklists |
| GET/PUT/DELETE | `/api/checklists/[id]` | Get / update / delete checklist |
| GET/POST | `/api/checklists/[id]/items` | List / add items |
| PUT/DELETE | `/api/checklists/[id]/items/[itemId]` | Update / delete item |
| PATCH | `/api/checklists/[id]/items/[itemId]/toggle` | Toggle item completion |
| GET/POST | `/api/notes` | List / create notes |
| GET/PUT/DELETE | `/api/notes/[id]` | Get / update / delete note |
| PATCH | `/api/notes/[id]/pin` | Toggle pin |
| GET/POST | `/api/mental-health/check-ins` | List / create check-ins |
| DELETE | `/api/mental-health/check-ins/[id]` | Delete check-in |
| GET/POST | `/api/mental-health/journal` | List / create journal entries |
| DELETE | `/api/mental-health/journal/[id]` | Delete journal entry |
| GET | `/api/analytics/summary` | Productivity summary |
| GET | `/api/audit-log` | Paginated audit entries |
| GET | `/api/search` | Full-text search across entities |
| POST | `/api/ai/chat` | AI chatbot message handler |

---

## Deployment (Railway)

1. Connect repo → add a **Volume** mounted at `/app/data`
2. Set environment variables:
   ```
   DATABASE_PATH=/app/data/productivity.db
   GEMINI_API_KEY=...
   NODE_ENV=production
   ```
3. Railway auto-builds via `Dockerfile` — multi-stage build, runs as root for volume write access
4. Database persists across deploys via the volume mount

---

## Project Structure

```
src/
├── app/
│   ├── (app)/          # Protected app pages
│   │   ├── dashboard/
│   │   ├── tasks/
│   │   ├── projects/
│   │   ├── time-tracking/
│   │   ├── reminders/
│   │   ├── checklists/
│   │   ├── notes/
│   │   ├── calendar/
│   │   ├── mental-health/
│   │   ├── analytics/
│   │   ├── audit-log/
│   │   └── settings/
│   ├── api/            # API route handlers
│   ├── login/
│   └── register/
├── components/
│   ├── ai-chatbot/     # Chat FAB, panel, messages, input
│   ├── dashboard/      # Stats cards, widgets
│   ├── layout/         # Sidebar, topbar, mobile nav, swipe handler
│   ├── shared/         # Empty states, search dialog
│   └── ui/             # shadcn/ui primitives
└── lib/
    ├── contexts/        # Theme, Sidebar, Timer, Chatbot
    ├── db/              # SQLite setup, migrations, repositories
    ├── hooks/           # SWR data hooks
    ├── services/        # Business logic layer
    └── types/           # Shared TypeScript types
```
