-- Quản Lý Chi Tiêu: lược đồ cơ sở dữ liệu cho Supabase (gồm duyệt thiết bị bằng mã).
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

-- ======================================================================
-- Duyệt thiết bị bằng mã: thiết bị mới đăng nhập phải được thiết bị đã tin cậy
-- xác nhận (nhập mã 6 số) thì mới đọc/ghi được dữ liệu. Thiết bị đầu tiên của
-- tài khoản được duyệt tự động.
-- ======================================================================
create table if not exists public.devices (
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id          text not null,            -- mã thiết bị (ngẫu nhiên, sinh trên thiết bị)
  token_hash  text not null,            -- băm khóa bí mật lưu trên thiết bị
  session_id  uuid,                     -- phiên đăng nhập hiện tại của thiết bị
  name        text not null default '',
  status      text not null default 'pending' check (status in ('pending', 'approved', 'denied')),
  code        text,                     -- mã 6 số; chỉ thiết bị đang chờ đọc được (qua my_device)
  attempts    int  not null default 0,
  created_at  timestamptz not null default now(),
  approved_at timestamptz,
  denied_at   timestamptz,
  last_seen   timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.recovery_codes (
  user_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  code_hash text not null,
  used_at   timestamptz,
  primary key (user_id, code_hash)
);

-- Hai bảng này chỉ truy cập qua các hàm bên dưới, không cấp quyền trực tiếp.
alter table public.devices enable row level security;
alter table public.recovery_codes enable row level security;
revoke all on public.devices, public.recovery_codes from anon, authenticated;

create or replace function public.current_session_id() returns uuid
language sql stable as $$ select nullif(auth.jwt() ->> 'session_id', '')::uuid $$;

-- Phiên đăng nhập hiện tại thuộc một thiết bị đã được duyệt?
create or replace function public.device_ok() returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.devices d
    where d.user_id = auth.uid() and d.status = 'approved'
      and d.session_id is not null and d.session_id = public.current_session_id()
  )
$$;

create or replace function public._code6() returns text
language sql volatile as $$
  select lpad(((('x' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))::bit(32)::bigint) % 1000000)::text, 6, '0')
$$;

create or replace function public._hash(t text) returns text
language sql immutable as $$ select encode(sha256(convert_to(t, 'utf8')), 'hex') $$;

-- Thiết bị khai báo sau mỗi lần đăng nhập. Trả về trạng thái và (nếu đang chờ) mã 6 số.
create or replace function public.register_device(p_id text, p_token text, p_name text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid uuid := auth.uid();
  sid uuid := public.current_session_id();
  h text := public._hash(p_token);
  d public.devices;
  was_found boolean;
  n_approved int;
begin
  if uid is null or sid is null then raise exception 'not_authenticated'; end if;
  if length(coalesce(p_id, '')) < 8 or length(coalesce(p_token, '')) < 16 then raise exception 'bad_device'; end if;
  perform pg_advisory_xact_lock(hashtext(uid::text));

  select * into d from public.devices where user_id = uid and id = p_id for update;
  was_found := found;
  if was_found and d.token_hash <> h then raise exception 'bad_device'; end if;

  select count(*) into n_approved from public.devices where user_id = uid and status = 'approved';

  if not was_found then
    if n_approved = 0 then
      insert into public.devices (user_id, id, token_hash, session_id, name, status, approved_at)
      values (uid, p_id, h, sid, left(coalesce(p_name, ''), 80), 'approved', now()) returning * into d;
    else
      insert into public.devices (user_id, id, token_hash, session_id, name, status, code)
      values (uid, p_id, h, sid, left(coalesce(p_name, ''), 80), 'pending', public._code6()) returning * into d;
    end if;
  else
    if d.status = 'denied' and d.denied_at < now() - interval '10 minutes' then
      update public.devices set status = 'pending', code = public._code6(), attempts = 0, denied_at = null
        where user_id = uid and id = p_id;
    end if;
    update public.devices
      set session_id = sid, last_seen = now(), name = coalesce(nullif(left(p_name, 80), ''), name)
      where user_id = uid and id = p_id returning * into d;
  end if;

  return jsonb_build_object(
    'status', d.status,
    'code', case when d.status = 'pending' then d.code end,
    'first', (not was_found and n_approved = 0),
    'has_recovery', exists (select 1 from public.recovery_codes where user_id = uid)
  );
end $$;

-- Trạng thái của chính thiết bị đang đăng nhập (kèm mã nếu đang chờ duyệt)
create or replace function public.my_device()
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare d public.devices;
begin
  select * into d from public.devices where user_id = auth.uid() and session_id = public.current_session_id();
  if not found then return jsonb_build_object('status', 'none'); end if;
  return jsonb_build_object('status', d.status, 'code', case when d.status = 'pending' then d.code end);
end $$;

-- Danh sách thiết bị (không kèm mã). Chỉ thiết bị đã duyệt xem được.
create or replace function public.list_devices()
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not public.device_ok() then raise exception 'not_approved'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', d.id, 'name', d.name, 'status', d.status, 'created_at', d.created_at,
      'approved_at', d.approved_at, 'last_seen', d.last_seen,
      'current', d.session_id = public.current_session_id(), 'attempts', d.attempts
    ) order by (d.status = 'pending') desc, d.created_at)
    from public.devices d where d.user_id = auth.uid()
  ), '[]'::jsonb);
end $$;

-- Duyệt thiết bị đang chờ bằng mã hiển thị trên thiết bị đó. Sai 5 lần thì bị từ chối.
create or replace function public.approve_device(p_id text, p_code text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := auth.uid(); d public.devices;
begin
  if not public.device_ok() then raise exception 'not_approved'; end if;
  perform pg_advisory_xact_lock(hashtext(uid::text));
  select * into d from public.devices where user_id = uid and id = p_id and status = 'pending' for update;
  if not found then raise exception 'not_pending'; end if;
  if d.code is not null and d.code = trim(p_code) then
    update public.devices set status = 'approved', approved_at = now(), code = null, attempts = 0 where user_id = uid and id = p_id;
    return jsonb_build_object('ok', true, 'status', 'approved');
  end if;
  if d.attempts + 1 >= 5 then
    update public.devices set status = 'denied', denied_at = now(), code = null, attempts = d.attempts + 1 where user_id = uid and id = p_id;
    return jsonb_build_object('ok', false, 'status', 'denied', 'attempts_left', 0);
  end if;
  update public.devices set attempts = d.attempts + 1 where user_id = uid and id = p_id;
  return jsonb_build_object('ok', false, 'status', 'pending', 'attempts_left', 5 - (d.attempts + 1));
end $$;

create or replace function public.deny_device(p_id text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not public.device_ok() then raise exception 'not_approved'; end if;
  update public.devices set status = 'denied', denied_at = now(), code = null
    where user_id = auth.uid() and id = p_id and status = 'pending';
end $$;

-- Thu hồi (xóa) một thiết bị. Không cho thu hồi thiết bị đã duyệt cuối cùng.
create or replace function public.revoke_device(p_id text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := auth.uid(); d public.devices; n int;
begin
  if not public.device_ok() then raise exception 'not_approved'; end if;
  perform pg_advisory_xact_lock(hashtext(uid::text));
  select * into d from public.devices where user_id = uid and id = p_id;
  if not found then return; end if;
  select count(*) into n from public.devices where user_id = uid and status = 'approved';
  if d.status = 'approved' and n <= 1 then raise exception 'last_device'; end if;
  delete from public.devices where user_id = uid and id = p_id;
end $$;

-- Mã khôi phục (hiện một lần) để duyệt thiết bị mới khi mất hết thiết bị cũ.
create or replace function public.create_recovery_codes()
returns text[] language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := auth.uid(); codes text[] := '{}'; c text; i int;
begin
  if not public.device_ok() then raise exception 'not_approved'; end if;
  delete from public.recovery_codes where user_id = uid;
  for i in 1..8 loop
    c := substr(replace(gen_random_uuid()::text, '-', ''), 1, 4) || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 4);
    codes := codes || c;
    insert into public.recovery_codes (user_id, code_hash) values (uid, public._hash(c));
  end loop;
  return codes;
end $$;

create or replace function public.use_recovery_code(p_code text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := auth.uid(); d public.devices; h text := public._hash(lower(trim(p_code)));
begin
  perform pg_advisory_xact_lock(hashtext(uid::text));
  select * into d from public.devices where user_id = uid and session_id = public.current_session_id() and status = 'pending' for update;
  if not found then raise exception 'not_pending'; end if;
  if exists (select 1 from public.recovery_codes where user_id = uid and code_hash = h and used_at is null) then
    update public.recovery_codes set used_at = now() where user_id = uid and code_hash = h;
    update public.devices set status = 'approved', approved_at = now(), code = null, attempts = 0 where user_id = uid and id = d.id;
    return jsonb_build_object('ok', true, 'status', 'approved');
  end if;
  if d.attempts + 1 >= 5 then
    update public.devices set status = 'denied', denied_at = now(), code = null, attempts = d.attempts + 1 where user_id = uid and id = d.id;
    return jsonb_build_object('ok', false, 'status', 'denied');
  end if;
  update public.devices set attempts = d.attempts + 1 where user_id = uid and id = d.id;
  return jsonb_build_object('ok', false, 'status', 'pending', 'attempts_left', 5 - (d.attempts + 1));
end $$;

revoke execute on function public.register_device(text, text, text), public.my_device(), public.list_devices(),
  public.approve_device(text, text), public.deny_device(text), public.revoke_device(text),
  public.create_recovery_codes(), public.use_recovery_code(text), public.device_ok(), public.current_session_id() from public, anon;
grant execute on function public.register_device(text, text, text), public.my_device(), public.list_devices(),
  public.approve_device(text, text), public.deny_device(text), public.revoke_device(text),
  public.create_recovery_codes(), public.use_recovery_code(text), public.device_ok(), public.current_session_id() to authenticated;

-- Cấp quyền rõ ràng cho người đã đăng nhập (an toàn kể cả khi Supabase không tự cấp), và không cho khách ẩn danh.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.transactions, public.accounts, public.goals, public.categories, public.settings to authenticated;
revoke all on public.transactions, public.accounts, public.goals, public.categories, public.settings from anon;

-- Bảo mật dữ liệu: mỗi người chỉ đọc/ghi dữ liệu của chính mình, VÀ chỉ từ thiết bị đã được duyệt.
do $$
declare t text;
begin
  foreach t in array array['transactions', 'accounts', 'goals', 'categories', 'settings'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "owner_all" on public.%I', t);
    execute format('drop policy if exists "owner_approved_device" on public.%I', t);
    execute format(
      'create policy "owner_approved_device" on public.%I for all to authenticated using (user_id = (select auth.uid()) and (select public.device_ok())) with check (user_id = (select auth.uid()) and (select public.device_ok()))',
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
