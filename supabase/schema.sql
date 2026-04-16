-- EaseStay Supabase Schema

-- Custom Enums
CREATE TYPE user_role AS ENUM ('resident', 'owner', 'worker', 'admin');
CREATE TYPE worker_role AS ENUM ('plumber', 'electrician', 'cleaner', 'maintenance');
CREATE TYPE issue_priority AS ENUM ('Low', 'Medium', 'High', 'Critical');
CREATE TYPE issue_status AS ENUM ('Pending', 'In Progress', 'Resolved');

-- Users / Profiles wrapper (extending auth.users)
CREATE TABLE public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  role user_role,
  full_name text not null,
  phone text,
  bio text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- PG Communities
CREATE TABLE public.communities (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  owner_id uuid references public.profiles(id) on delete cascade not null,
  join_code text unique not null,
  status text default 'active',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Members (Residents of a Community)
CREATE TABLE public.members (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  community_id uuid references public.communities(id) on delete cascade not null,
  room_number text not null,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  UNIQUE(user_id, community_id)
);

-- Workers assigned to communities
CREATE TABLE public.workers (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  role worker_role not null,
  community_id uuid references public.communities(id) on delete cascade not null,
  profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Issues raised by residents
CREATE TABLE public.issues (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  community_id uuid references public.communities(id) on delete cascade not null,
  title text not null,
  description text,
  category text not null,
  priority issue_priority default 'Low' not null,
  status issue_status default 'Pending' not null,
  assigned_worker_id uuid references public.workers(id) on delete set null,
  room_number text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Function to handle auto-updates of `updated_at`
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_issues_updated_at
BEFORE UPDATE ON public.issues
FOR EACH ROW
EXECUTE FUNCTION handle_updated_at();

-- RLS (Row Level Security) Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;

-- Basic Profile sharing policies
CREATE POLICY "Public profiles are viewable by everyone." on public.profiles
  for select using (true);
CREATE POLICY "Users can insert their own profile." on public.profiles
  for insert with check (auth.uid() = id);
CREATE POLICY "Users can update own profile." on public.profiles
  for update using (auth.uid() = id);
CREATE POLICY "Admins can update any profile." on public.profiles
  for update using (
    EXISTS (select 1 from public.profiles p where p.id = auth.uid() and p.role::text = 'admin')
  )
  with check (
    EXISTS (select 1 from public.profiles p where p.id = auth.uid() and p.role::text = 'admin')
  );

-- Community read everywhere, insert by owners
CREATE POLICY "Communities are viewable by everyone." on public.communities
  for select using (status is null or status <> 'banned');
CREATE POLICY "Owners can insert communities." on public.communities
  for insert with check (auth.uid() = owner_id);
CREATE POLICY "Owners can view own communities." on public.communities
  for select using (auth.uid() = owner_id);
CREATE POLICY "Admins can view all communities." on public.communities
  for select using (
    EXISTS (select 1 from public.profiles p where p.id = auth.uid() and p.role::text = 'admin')
  );
CREATE POLICY "Admins can update communities." on public.communities
  for update using (
    EXISTS (select 1 from public.profiles p where p.id = auth.uid() and p.role::text = 'admin')
  )
  with check (
    EXISTS (select 1 from public.profiles p where p.id = auth.uid() and p.role::text = 'admin')
  );
CREATE POLICY "Admins can delete communities." on public.communities
  for delete using (
    EXISTS (select 1 from public.profiles p where p.id = auth.uid() and p.role::text = 'admin')
  );

-- Members
CREATE POLICY "Members are viewable by community." on public.members
  for select using (true);
CREATE POLICY "Users can join communities." on public.members
  for insert with check (auth.uid() = user_id);

-- Workers
CREATE POLICY "Workers viewable by all." on public.workers
  for select using (true);
CREATE POLICY "Owner can insert workers." on public.workers
  for insert with check (
    EXISTS (select 1 from public.communities where id = community_id and owner_id = auth.uid())
  );

-- Issues policies
CREATE POLICY "Issues viewable by community members and owners." on public.issues
  for select using (true);
CREATE POLICY "Residents can insert issues." on public.issues
  for insert with check (auth.uid() = user_id);
CREATE POLICY "Owners can update any issue in their community, users can update own." on public.issues
  for update using (
    auth.uid() = user_id OR 
    EXISTS (select 1 from public.communities where id = community_id and owner_id = auth.uid())
  );
