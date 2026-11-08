-- Quản Lý Chi Tiêu: lược đồ cơ sở dữ liệu cho Supabase.
-- Dán toàn bộ file này vào Supabase > SQL Editor > New query, rồi bấm Run (chạy lại nhiều lần vẫn an toàn).

create table if not exists public.transactions (
  user_id    uuid   not null default auth.uid() references auth.users(id) on delete cascade,
  id         text   not null,
  type       text   not null check (type in ('income', 'expense')),
  amount     bigint not null check (amount > 0),
  category   text   not null,
  date       date   not null,
  note       text   not null default '',
  account    text   not null default '',
  payee      text   not null default '',
  tags       text[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists transactions_user_date_idx on public.transactions (user_id, date desc);

create table if not exists public.accounts (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id      text not null,
  name    text not null,
  kind    text not null,
  opening bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.goals (
  user_id  uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id       text not null,
  name     text not null,
  target   bigint not null,
  saved    bigint not null default 0,
  deadline text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.categories (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id      text not null,
  label   text not null,
  icon    text not null default '📦',
  type    text not null check (type in ('income', 'expense')),
  color   int  not null default 1,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- Ngân sách: mỗi người dùng một dòng, lưu dạng JSON { "ma_danh_muc": so_tien }
create table if not exists public.settings (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id      text not null default 'budgets',
  budgets jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- Bảo mật: mỗi người chỉ đọc và ghi được dữ liệu của chính mình.
do $$
declare t text;
begin
  foreach t in array array['transactions', 'accounts', 'goals', 'categories', 'settings'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "owner_all" on public.%I', t);
    execute format(
      'create policy "owner_all" on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t
    );
  end loop;
end $$;

-- Cập nhật tức thời giữa các thiết bị (Realtime).
do $$
declare t text;
begin
  foreach t in array array['transactions', 'accounts', 'goals', 'categories', 'settings'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
