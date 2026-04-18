-- =============================================================================
-- Multiply — DB schema
-- Brain-repo: planning/03-architecture.md (base schema).
-- Extended with: learnings, swarm_runs, agent_tiles, product_profiles.
-- =============================================================================

-- enums --------------------------------------------------------------------

create type stage as enum (
  'new', 'contacted', 'engaged', 'qualified', 'booked', 'lost'
);

create type agent_mode as enum ('cold', 'warm', 'hot', 'handoff');

-- product profiles (uploaded by sales manager) -----------------------------

create table if not exists product_profiles (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz default now(),
  name          text not null,
  description   text,
  value_props   jsonb default '[]',
  pricing       jsonb default '{}',
  objections    jsonb default '[]'
);

-- leads --------------------------------------------------------------------

create table if not exists leads (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz default now(),
  product_profile_id  uuid references product_profiles on delete set null,
  name                text,
  phone               text,
  email               text,
  source              text,
  interest            text,
  score               int default 0,
  stage               stage default 'new',
  current_mode        agent_mode default 'cold',
  hr_contact_id       text,
  hr_run_id           text,
  hr_session_id       text,
  research            jsonb default '{}',
  metadata            jsonb default '{}'
);

-- messages -----------------------------------------------------------------

create table if not exists messages (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid references leads on delete cascade,
  ts          timestamptz default now(),
  role        text,
  content     text,
  channel     text,
  hr_msg_id   text
);

-- raw HR webhook events (audit) --------------------------------------------

create table if not exists hr_events (
  id        uuid primary key default gen_random_uuid(),
  ts        timestamptz default now(),
  type      text,
  payload   jsonb
);

-- swarm runs (one per /api/swarm/launch invocation) ------------------------

create table if not exists swarm_runs (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz default now(),
  product_profile_id  uuid references product_profiles,
  lead_count          int,
  status              text default 'running',
  pipeline_value_eur  numeric default 0
);

-- agent tiles (live state for each lead in a swarm run) --------------------

create table if not exists agent_tiles (
  id              uuid primary key default gen_random_uuid(),
  swarm_run_id    uuid references swarm_runs on delete cascade,
  lead_id         uuid references leads on delete cascade,
  mode            agent_mode default 'cold',
  signal_score    numeric default 0,
  is_live         boolean default false,
  voice_profile   text,
  updated_at      timestamptz default now()
);

-- learnings (the hero feature) ---------------------------------------------

create table if not exists learnings (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz default now(),
  source_lead_id  uuid references leads on delete set null,
  pattern         text not null,
  trigger         text not null,
  applied_count   int default 0,
  is_active       boolean default true
);

-- realtime: enable in Supabase dashboard for `leads`, `messages`,
-- `agent_tiles`, `learnings`.
-- (Database → Replication → public.<table>)
