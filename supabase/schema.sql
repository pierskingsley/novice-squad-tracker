-- ============================================================
--  Squad Tracker — Supabase schema
--  Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
create extension if not exists "uuid-ossp";


-- ══════════════════════════════════════════════════════════════
--  TABLES
-- ══════════════════════════════════════════════════════════════

-- ── Profiles (extends auth.users) ────────────────────────────
create table public.profiles (
  id     uuid references auth.users(id) on delete cascade primary key,
  name   text not null,
  role   text not null check (role in ('ATHLETE', 'COACH')),
  created_at timestamptz default now()
);

-- ── Exercises (master list) ───────────────────────────────────
create table public.exercises (
  id       uuid default gen_random_uuid() primary key,
  name     text not null unique,
  category text not null default 'compound'
);

-- ── Programmes ────────────────────────────────────────────────
create table public.programmes (
  id         uuid default gen_random_uuid() primary key,
  coach_id   uuid references public.profiles(id) on delete cascade not null,
  name       text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── Programme exercises ───────────────────────────────────────
create table public.programme_exercises (
  id                 uuid default gen_random_uuid() primary key,
  programme_id       uuid references public.programmes(id) on delete cascade not null,
  exercise_id        uuid references public.exercises(id) not null,
  prescribed_sets    integer not null default 3,
  prescribed_reps    integer not null default 5,
  prescribed_weight  numeric not null default 0,
  notes              text,
  order_index        integer not null default 0
);

-- ── Programme assignments (programme → athlete → date) ────────
create table public.programme_assignments (
  id            uuid default gen_random_uuid() primary key,
  programme_id  uuid references public.programmes(id) on delete cascade not null,
  athlete_id    uuid references public.profiles(id) on delete cascade not null,
  assigned_date date not null,
  created_at    timestamptz default now()
);

-- ── Sessions ──────────────────────────────────────────────────
create table public.sessions (
  id                        uuid default gen_random_uuid() primary key,
  athlete_id                uuid references public.profiles(id) on delete cascade not null,
  programme_assignment_id   uuid references public.programme_assignments(id),
  date                      date not null default current_date,
  completed_at              timestamptz,
  total_tonnage             numeric default 0,
  created_at                timestamptz default now()
);

-- ── Session exercises ─────────────────────────────────────────
create table public.session_exercises (
  id                    uuid default gen_random_uuid() primary key,
  session_id            uuid references public.sessions(id) on delete cascade not null,
  exercise_id           uuid references public.exercises(id) not null,
  programme_exercise_id uuid references public.programme_exercises(id),
  notes                 text,
  order_index           integer not null default 0
);

-- ── Sets ──────────────────────────────────────────────────────
create table public.sets (
  id                   uuid default gen_random_uuid() primary key,
  session_exercise_id  uuid references public.session_exercises(id) on delete cascade not null,
  set_number           integer not null,
  weight               numeric not null,
  reps                 integer not null,
  completed_at         timestamptz default now()
);

-- unique constraint allows upsert by (session_exercise_id, set_number)
create unique index sets_se_num_idx on public.sets(session_exercise_id, set_number);

-- ── Personal bests ────────────────────────────────────────────
create table public.personal_bests (
  id          uuid default gen_random_uuid() primary key,
  athlete_id  uuid references public.profiles(id) on delete cascade not null,
  exercise_id uuid references public.exercises(id) not null,
  weight      numeric not null,
  reps        integer not null,
  achieved_at timestamptz default now(),
  set_id      uuid references public.sets(id),
  unique(athlete_id, exercise_id)
);


-- ══════════════════════════════════════════════════════════════
--  AUTO-CREATE PROFILE ON SIGN-UP
-- ══════════════════════════════════════════════════════════════

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'ATHLETE')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ══════════════════════════════════════════════════════════════
--  ROW LEVEL SECURITY
-- ══════════════════════════════════════════════════════════════

alter table public.profiles            enable row level security;
alter table public.exercises           enable row level security;
alter table public.programmes          enable row level security;
alter table public.programme_exercises enable row level security;
alter table public.programme_assignments enable row level security;
alter table public.sessions            enable row level security;
alter table public.session_exercises   enable row level security;
alter table public.sets                enable row level security;
alter table public.personal_bests      enable row level security;


-- ── Profiles ─────────────────────────────────────────────────

-- Every user can read their own profile
create policy "profiles: own read"
  on public.profiles for select
  using (auth.uid() = id);

-- Coaches can read all profiles
create policy "profiles: coach read all"
  on public.profiles for select
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'COACH')
  );

-- Own write
create policy "profiles: own insert"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles: own update"
  on public.profiles for update
  using (auth.uid() = id);


-- ── Exercises (read-only for everyone) ───────────────────────

create policy "exercises: all read"
  on public.exercises for select
  using (true);

-- Only coaches can insert exercises (e.g., custom ones in future)
create policy "exercises: coach insert"
  on public.exercises for insert
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'COACH')
  );


-- ── Programmes ───────────────────────────────────────────────

-- Coach: full access to own programmes
create policy "programmes: coach own all"
  on public.programmes for all
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

-- Athlete: read programmes they're assigned to
create policy "programmes: athlete read assigned"
  on public.programmes for select
  using (
    exists (
      select 1 from public.programme_assignments
      where programme_assignments.programme_id = programmes.id
        and programme_assignments.athlete_id = auth.uid()
    )
  );


-- ── Programme exercises ──────────────────────────────────────

-- Coach: full access via their own programmes
create policy "programme_exercises: coach own all"
  on public.programme_exercises for all
  using (
    exists (
      select 1 from public.programmes
      where programmes.id = programme_exercises.programme_id
        and programmes.coach_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.programmes
      where programmes.id = programme_exercises.programme_id
        and programmes.coach_id = auth.uid()
    )
  );

-- Athlete: read exercises from assigned programmes
create policy "programme_exercises: athlete read assigned"
  on public.programme_exercises for select
  using (
    exists (
      select 1 from public.programme_assignments
      where programme_assignments.programme_id = programme_exercises.programme_id
        and programme_assignments.athlete_id = auth.uid()
    )
  );


-- ── Programme assignments ────────────────────────────────────

-- Coach: full access to assignments for their programmes
create policy "programme_assignments: coach own all"
  on public.programme_assignments for all
  using (
    exists (
      select 1 from public.programmes
      where programmes.id = programme_assignments.programme_id
        and programmes.coach_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.programmes
      where programmes.id = programme_assignments.programme_id
        and programmes.coach_id = auth.uid()
    )
  );

-- Athlete: read own assignments
create policy "programme_assignments: athlete read own"
  on public.programme_assignments for select
  using (athlete_id = auth.uid());


-- ── Sessions ─────────────────────────────────────────────────

-- Athlete: full access to own sessions
create policy "sessions: athlete own all"
  on public.sessions for all
  using (athlete_id = auth.uid())
  with check (athlete_id = auth.uid());

-- Coach: read all sessions
create policy "sessions: coach read all"
  on public.sessions for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'COACH')
  );


-- ── Session exercises ─────────────────────────────────────────

-- Athlete: full access via own sessions
create policy "session_exercises: athlete own all"
  on public.session_exercises for all
  using (
    exists (
      select 1 from public.sessions
      where sessions.id = session_exercises.session_id
        and sessions.athlete_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.sessions
      where sessions.id = session_exercises.session_id
        and sessions.athlete_id = auth.uid()
    )
  );

-- Coach: read all
create policy "session_exercises: coach read all"
  on public.session_exercises for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'COACH')
  );


-- ── Sets ─────────────────────────────────────────────────────

-- Athlete: full access via own sessions
create policy "sets: athlete own all"
  on public.sets for all
  using (
    exists (
      select 1 from public.session_exercises se
      join public.sessions s on s.id = se.session_id
      where se.id = sets.session_exercise_id
        and s.athlete_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.session_exercises se
      join public.sessions s on s.id = se.session_id
      where se.id = sets.session_exercise_id
        and s.athlete_id = auth.uid()
    )
  );

-- Coach: read all
create policy "sets: coach read all"
  on public.sets for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'COACH')
  );


-- ── Personal bests ───────────────────────────────────────────

-- Athlete: full access to own PBs
create policy "personal_bests: athlete own all"
  on public.personal_bests for all
  using (athlete_id = auth.uid())
  with check (athlete_id = auth.uid());

-- Coach: read all
create policy "personal_bests: coach read all"
  on public.personal_bests for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'COACH')
  );


-- ══════════════════════════════════════════════════════════════
--  SEED DATA — exercise master list
-- ══════════════════════════════════════════════════════════════

insert into public.exercises (name, category) values
  ('Bench Press',                        'compound'),
  ('Pull Up',                            'compound'),
  ('Deadlift',                           'compound'),
  ('Romanian Deadlift',                  'compound'),
  ('Charlotte Clover''s Special Deadlift', 'compound'),
  ('Overhead Press',                     'compound'),
  ('Front Squat',                        'compound'),
  ('Back Squat',                         'compound'),
  ('Goblet Squat',                       'compound'),
  ('Hip Thrust',                         'compound'),
  ('Barbell Row',                        'compound'),
  ('Push Up',                            'compound'),
  ('Bulgarian Split Squat',              'accessory'),
  ('Bicep Curls',                        'accessory'),
  ('Plank',                              'core'),
  ('Side Plank',                         'core'),
  ('Leg Raises',                         'core'),
  ('Russian Twists',                     'core')
on conflict (name) do update set category = excluded.category;
