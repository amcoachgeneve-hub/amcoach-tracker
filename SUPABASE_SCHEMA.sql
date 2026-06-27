-- Run this in your Supabase SQL editor

-- Table clients
create table if not exists clients (
  id          uuid default gen_random_uuid() primary key,
  slug        text unique not null,
  name        text not null,
  start_date  date not null,
  created_at  timestamp with time zone default now()
);

-- Table tracking
create table if not exists tracking (
  id          uuid default gen_random_uuid() primary key,
  client_slug text not null,
  day_index   integer not null,
  data        jsonb not null default '{}',
  updated_at  timestamp with time zone default now(),
  unique(client_slug, day_index)
);

-- Enable RLS (Row Level Security) - public access for MVP
alter table clients  enable row level security;
alter table tracking enable row level security;

-- Allow all reads and writes (MVP - no auth)
create policy "Public read clients"  on clients  for select using (true);
create policy "Public write tracking" on tracking for all using (true) with check (true);
create policy "Public read tracking"  on tracking for select using (true);
create policy "Public insert clients" on clients  for insert with check (true);
