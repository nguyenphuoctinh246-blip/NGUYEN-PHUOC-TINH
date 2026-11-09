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

-- ======================================================================
-- Tài khoản con (thành viên): chủ tài khoản tạo MÃ MỜI, người nhà dùng mã để tham gia.
-- Dữ liệu vẫn thuộc về chủ; mỗi giao dịch ghi lại ai nhập (created_by) và lúc nào (created_at).
-- Tài khoản con chỉ được nhập/sửa/xóa giao dịch do chính mình nhập; các bảng khác chỉ đọc.
-- ======================================================================
alter table public.transactions add column if not exists created_by uuid default auth.uid() references auth.users(id) on delete set null;
alter table public.transactions add column if not exists created_at timestamptz not null default now();
update public.transactions set created_by = user_id where created_by is null;

create table if not exists public.workspace_members (
  owner_id     uuid not null references auth.users(id) on delete cascade,
  member_id    uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  can_view_all boolean not null default false,
  created_at   timestamptz not null default now(),
  primary key (owner_id, member_id),
  unique (member_id)
);

create table if not exists public.workspace_invites (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users(id) on delete cascade,
  code_hash    text not null unique,
  display_name text not null,
  can_view_all boolean not null default false,
  expires_at   timestamptz not null,
  used_at      timestamptz,
  created_at   timestamptz not null default now()
);

alter table public.workspace_members enable row level security;
alter table public.workspace_invites enable row level security;
revoke all on public.workspace_members, public.workspace_invites from anon, authenticated;

-- Nếu người đang đăng nhập là tài khoản con: id của chủ tài khoản; nếu không thì null.
create or replace function public.member_owner() returns uuid
language sql stable security definer set search_path = public, pg_temp as $$
  select owner_id from public.workspace_members where member_id = auth.uid()
$$;

create or replace function public.member_can_view_all() returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce((select can_view_all from public.workspace_members where member_id = auth.uid()), false)
$$;

-- Kho dữ liệu mà người đang đăng nhập làm việc trên đó
create or replace function public.my_workspace() returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare m public.workspace_members;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select * into m from public.workspace_members where member_id = auth.uid();
  if found then
    return jsonb_build_object('workspace_id', m.owner_id, 'role', 'member', 'name', m.display_name, 'can_view_all', m.can_view_all);
  end if;
  return jsonb_build_object('workspace_id', auth.uid(), 'role', 'owner', 'name', 'Chủ tài khoản', 'can_view_all', true);
end $$;

-- Mã mời gồm 8 ký tự dễ đọc (bỏ 0/O, 1/I/L), hiện đúng một lần, hết hạn sau 7 ngày, dùng một lần.
create or replace function public.create_invite(p_name text, p_view_all boolean)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid uuid := auth.uid(); alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  b bytea; raw text := ''; i int; code text; exp timestamptz := now() + interval '7 days';
begin
  if not public.device_ok() then raise exception 'not_approved'; end if;
  if public.member_owner() is not null then raise exception 'members_cannot_invite'; end if;
  if length(trim(coalesce(p_name, ''))) < 1 then raise exception 'name_required'; end if;
  if (select count(*) from public.workspace_invites where owner_id = uid and used_at is null and expires_at > now()) >= 20 then raise exception 'too_many_invites'; end if;
  b := decode(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16), 'hex');
  for i in 0..7 loop raw := raw || substr(alphabet, (get_byte(b, i) % 31) + 1, 1); end loop;
  code := substr(raw, 1, 4) || '-' || substr(raw, 5, 4);
  insert into public.workspace_invites (owner_id, code_hash, display_name, can_view_all, expires_at)
    values (uid, public._hash(raw), left(trim(p_name), 40), coalesce(p_view_all, false), exp);
  return jsonb_build_object('code', code, 'expires_at', exp);
end $$;

create or replace function public.list_invites()
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not public.device_ok() then raise exception 'not_approved'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'name', i.display_name, 'can_view_all', i.can_view_all, 'expires_at', i.expires_at) order by i.created_at desc)
    from public.workspace_invites i where i.owner_id = auth.uid() and i.used_at is null and i.expires_at > now()), '[]'::jsonb);
end $$;

create or replace function public.revoke_invite(p_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not public.device_ok() then raise exception 'not_approved'; end if;
  delete from public.workspace_invites where id = p_id and owner_id = auth.uid();
end $$;

-- Người dùng mới nhập mã mời để trở thành tài khoản con của chủ. Không nhận nếu mình đã có giao dịch/mục tiêu riêng.
create or replace function public.join_workspace(p_code text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := auth.uid(); inv public.workspace_invites; h text := public._hash(upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g')));
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  perform pg_advisory_xact_lock(hashtext(uid::text));
  if public.member_owner() is not null then raise exception 'already_member'; end if;
  if exists (select 1 from public.transactions where user_id = uid) or exists (select 1 from public.goals where user_id = uid) then raise exception 'has_data'; end if;
  select * into inv from public.workspace_invites where code_hash = h and used_at is null and expires_at > now() for update;
  if not found then raise exception 'invalid_code'; end if;
  if inv.owner_id = uid then raise exception 'own_code'; end if;
  insert into public.workspace_members (owner_id, member_id, display_name, can_view_all) values (inv.owner_id, uid, inv.display_name, inv.can_view_all);
  update public.workspace_invites set used_at = now() where id = inv.id;
  return jsonb_build_object('workspace_id', inv.owner_id, 'name', inv.display_name, 'can_view_all', inv.can_view_all);
end $$;

-- Danh sách người trong kho dữ liệu (để hiện tên người nhập). Cờ quyền chỉ chủ tài khoản thấy.
create or replace function public.workspace_people()
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare ow uuid := coalesce(public.member_owner(), auth.uid()); is_owner boolean := public.member_owner() is null;
begin
  if not public.device_ok() then raise exception 'not_approved'; end if;
  return jsonb_build_array(jsonb_build_object('id', ow, 'name', 'Chủ tài khoản', 'role', 'owner', 'can_view_all', null, 'joined', null))
    || coalesce((select jsonb_agg(jsonb_build_object('id', m.member_id, 'name', m.display_name, 'role', 'member',
         'can_view_all', case when is_owner then m.can_view_all end, 'joined', m.created_at) order by m.created_at)
       from public.workspace_members m where m.owner_id = ow), '[]'::jsonb);
end $$;

create or replace function public.update_member(p_member uuid, p_view_all boolean, p_name text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not public.device_ok() or public.member_owner() is not null then raise exception 'not_approved'; end if;
  update public.workspace_members set can_view_all = coalesce(p_view_all, can_view_all),
    display_name = coalesce(nullif(left(trim(p_name), 40), ''), display_name)
  where owner_id = auth.uid() and member_id = p_member;
end $$;

create or replace function public.remove_member(p_member uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not public.device_ok() or public.member_owner() is not null then raise exception 'not_approved'; end if;
  delete from public.workspace_members where owner_id = auth.uid() and member_id = p_member;
end $$;

revoke execute on function public.member_owner(), public.member_can_view_all(), public.my_workspace(), public.create_invite(text, boolean),
  public.list_invites(), public.revoke_invite(uuid), public.join_workspace(text), public.workspace_people(),
  public.update_member(uuid, boolean, text), public.remove_member(uuid) from public, anon;
grant execute on function public.member_owner(), public.member_can_view_all(), public.my_workspace(), public.create_invite(text, boolean),
  public.list_invites(), public.revoke_invite(uuid), public.join_workspace(text), public.workspace_people(),
  public.update_member(uuid, boolean, text), public.remove_member(uuid) to authenticated;

-- Cấp quyền rõ ràng cho người đã đăng nhập (an toàn kể cả khi Supabase không tự cấp), và không cho khách ẩn danh.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.transactions, public.accounts, public.goals, public.categories, public.settings to authenticated;
revoke all on public.transactions, public.accounts, public.goals, public.categories, public.settings from anon;

-- Bảo mật dữ liệu. Điều kiện chung: thiết bị đã được duyệt.
--  * Chủ tài khoản: toàn quyền trên dữ liệu của mình.
--  * Tài khoản con: chỉ đọc danh mục/tài khoản/mục tiêu/ngân sách của chủ; với giao dịch thì ghi (thêm, sửa, xóa) CHỈ
--    giao dịch do chính mình nhập; đọc giao dịch của mình, hoặc của tất cả nếu chủ cho phép (can_view_all).
do $$
declare t text;
begin
  foreach t in array array['transactions', 'accounts', 'goals', 'categories', 'settings'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "owner_all" on public.%I', t);
    execute format('drop policy if exists "owner_approved_device" on public.%I', t);
    execute format('drop policy if exists "p_select" on public.%I', t);
    execute format('drop policy if exists "p_insert" on public.%I', t);
    execute format('drop policy if exists "p_update" on public.%I', t);
    execute format('drop policy if exists "p_delete" on public.%I', t);
  end loop;

  -- giao dịch
  create policy "p_select" on public.transactions for select to authenticated using (
    (select public.device_ok()) and (
      user_id = (select auth.uid())
      or (user_id = (select public.member_owner()) and (created_by = (select auth.uid()) or (select public.member_can_view_all())))));
  create policy "p_insert" on public.transactions for insert to authenticated with check (
    (select public.device_ok()) and created_by = (select auth.uid())
    and (user_id = (select auth.uid()) or user_id = (select public.member_owner())));
  create policy "p_update" on public.transactions for update to authenticated
    using ((select public.device_ok()) and (user_id = (select auth.uid()) or (user_id = (select public.member_owner()) and created_by = (select auth.uid()))))
    with check ((select public.device_ok()) and (user_id = (select auth.uid()) or (user_id = (select public.member_owner()) and created_by = (select auth.uid()))));
  create policy "p_delete" on public.transactions for delete to authenticated using (
    (select public.device_ok()) and (user_id = (select auth.uid()) or (user_id = (select public.member_owner()) and created_by = (select auth.uid()))));

  -- các bảng còn lại: chủ ghi được, tài khoản con chỉ đọc
  foreach t in array array['accounts', 'goals', 'categories', 'settings'] loop
    execute format('create policy "p_select" on public.%I for select to authenticated using ((select public.device_ok()) and (user_id = (select auth.uid()) or user_id = (select public.member_owner())))', t);
    execute format('create policy "p_insert" on public.%I for insert to authenticated with check ((select public.device_ok()) and user_id = (select auth.uid()))', t);
    execute format('create policy "p_update" on public.%I for update to authenticated using ((select public.device_ok()) and user_id = (select auth.uid())) with check ((select public.device_ok()) and user_id = (select auth.uid()))', t);
    execute format('create policy "p_delete" on public.%I for delete to authenticated using ((select public.device_ok()) and user_id = (select auth.uid()))', t);
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
