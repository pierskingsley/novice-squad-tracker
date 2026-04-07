# Squad Tracker

A mobile-first weightlifting tracker for novice squads. Athletes log sessions against coach-built programmes; coaches build programmes, assign them to athletes, and track squad progress.

## Tech stack

- React 18 + Vite
- Supabase (auth + Postgres + RLS)
- Tailwind CSS
- Recharts
- React Router v6

---

## 1 — Set up Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. In the dashboard, go to **SQL Editor** and paste + run the contents of `supabase/schema.sql`.
3. Go to **Project Settings → API** and copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`
4. In **Authentication → Providers** confirm Email is enabled (it is by default).
5. Optional — in **Authentication → Email Templates** you can customise the confirmation email.

> **Email confirmation**: Supabase requires email confirmation by default. During development you can disable it in **Authentication → Settings → Disable email confirmations**, or just click the confirmation link sent to your inbox.

---

## 2 — Run locally

```bash
# Clone / open the project folder
cd "Novice Squad Tracker"

# Install dependencies
npm install

# Create your .env file
cp .env.example .env
# then edit .env and fill in your Supabase URL and anon key

# Start the dev server
npm run dev
```

The app runs at `http://localhost:5173`.

### First run

1. Sign up as a **Coach** first.
2. Sign up one or more **Athlete** accounts.
3. As the coach, go to **Programmes → New** and build a programme, then assign it to an athlete for today's date.
4. Sign in as the athlete — the session will appear on the Home tab.

---

## 3 — Deploy to Vercel

```bash
# Install Vercel CLI (if you haven't)
npm i -g vercel

# From the project root
vercel
```

Follow the prompts. When asked for environment variables, add:

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key |

Or add them in the Vercel dashboard under **Project → Settings → Environment Variables**.

Vercel will auto-detect Vite and set the build command to `vite build` with output dir `dist`.

---

## Project structure

```
src/
  components/ui/     Shared components (Layout, BottomNav, Modal, Spinner)
  context/           AuthContext — user session + profile
  lib/               supabase.js, constants.js
  pages/
    Login.jsx
    athlete/         Home, History, Progress, Profile
    coach/           Programmes, ProgrammeBuilder, Squad, AthleteDetail
supabase/
  schema.sql         Full DB schema + RLS policies + seed data
```

---

## Features

### Athlete
- **Today** — logs sets live against today's programme; running tonnage counter; PR badges fire automatically
- **History** — expandable list of completed sessions with full set detail
- **Progress** — max weight + tonnage charts per exercise (Recharts)
- **Profile** — PR board showing best ever lift per exercise

### Coach
- **Programmes** — list with edit / duplicate
- **Programme builder** — add exercises with prescribed sets × reps × weight; assign to athletes with date
- **Squad** — list of all athletes; tap to see sessions + PR board (read-only)

---

## Database schema (overview)

```
profiles               ← extends auth.users (name, role)
exercises              ← master list (seeded)
programmes             ← coach-created
programme_exercises    ← exercises within a programme
programme_assignments  ← programme → athlete → date
sessions               ← one per athlete per assigned day
session_exercises      ← exercises within a session
sets                   ← individual set logs
personal_bests         ← upserted on each set; one row per athlete+exercise
```

All tables use Row Level Security. Athletes read/write only their own data; coaches read all athlete data.
