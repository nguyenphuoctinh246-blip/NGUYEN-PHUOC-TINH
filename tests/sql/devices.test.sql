-- Kiểm thử duyệt thiết bị + RLS trên Postgres thật. Chạy sau supabase-stub.sql và schema.sql.
\set ON_ERROR_STOP on
drop table if exists public.zz_results; create table public.zz_results (ok boolean, name text); grant all on public.zz_results to public;
create or replace function pg_temp.chk(cond boolean, name text) returns void language plpgsql as $$
begin insert into public.zz_results values (coalesce(cond, false), name); end $$;
create or replace function pg_temp.as_dev(uid uuid, sid uuid) returns void language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'session_id', sid, 'role', 'authenticated')::text, true);
  set local role authenticated;
end $$;

do $$
declare
  ua uuid := '11111111-1111-1111-1111-111111111111'; ub uuid := '22222222-2222-2222-2222-222222222222';
  sA uuid := 'aaaaaaaa-0000-0000-0000-000000000001'; sB uuid := 'bbbbbbbb-0000-0000-0000-000000000002';
  sC uuid := 'cccccccc-0000-0000-0000-000000000003'; sA2 uuid := 'aaaaaaaa-0000-0000-0000-000000000009';
  sU2 uuid := 'dddddddd-0000-0000-0000-000000000004';
  tokA text := 'token-A-0123456789abcdef'; tokB text := 'token-B-0123456789abcdef'; tokC text := 'token-C-0123456789abcdef';
  r jsonb; cnt int; code text; codes text[]; failed boolean; i int;
begin
  insert into auth.users (id, email) values (ua, 'a@x.vn'), (ub, 'b@x.vn');

  -- 1. Thiết bị đầu tiên được duyệt tự động và ghi được dữ liệu
  perform pg_temp.as_dev(ua, sA);
  r := public.register_device('devA-aaaaaaaa', tokA, 'Chrome trên Windows');
  perform pg_temp.chk(r->>'status' = 'approved' and (r->>'first')::boolean, '1. thiết bị đầu tiên được duyệt tự động');
  insert into public.transactions (id, type, amount, category, date) values ('t1', 'expense', 1000, 'an_uong', '2026-11-08');
  select count(*) into cnt from public.transactions;
  perform pg_temp.chk(cnt = 1, '1. thiết bị đã duyệt ghi và đọc được dữ liệu');

  -- 2. Thiết bị B đăng nhập: chờ duyệt, nhận mã, KHÔNG đọc/ghi được dữ liệu
  perform pg_temp.as_dev(ua, sB);
  r := public.register_device('devB-bbbbbbbb', tokB, 'Safari trên iPhone');
  code := r->>'code';
  perform pg_temp.chk(r->>'status' = 'pending' and code ~ '^[0-9]{6}$', '2. thiết bị mới ở trạng thái chờ và có mã 6 số');
  select count(*) into cnt from public.transactions;
  perform pg_temp.chk(cnt = 0, '2. thiết bị chờ duyệt KHÔNG đọc được dữ liệu');
  failed := false;
  begin insert into public.transactions (id, type, amount, category, date) values ('t2', 'expense', 5, 'x', '2026-11-08'); exception when others then failed := true; end;
  perform pg_temp.chk(failed, '2. thiết bị chờ duyệt KHÔNG ghi được dữ liệu');
  failed := false;
  begin perform public.list_devices(); exception when others then failed := true; end;
  perform pg_temp.chk(failed, '2. thiết bị chờ duyệt không xem được danh sách thiết bị');
  failed := false;
  begin perform public.approve_device('devB-bbbbbbbb', code); exception when others then failed := true; end;
  perform pg_temp.chk(failed, '2. thiết bị chờ duyệt không tự duyệt được chính nó');
  failed := false;
  begin perform count(*) from public.devices; exception when insufficient_privilege then failed := true; end;
  perform pg_temp.chk(failed, '2. không đọc trực tiếp được bảng devices (giấu mã)');
  r := public.my_device();
  perform pg_temp.chk(r->>'code' = code and r->>'status' = 'pending', '2. thiết bị chờ đọc được mã của chính mình');

  -- 3. Thiết bị A thấy yêu cầu (không kèm mã), nhập sai rồi nhập đúng
  perform pg_temp.as_dev(ua, sA);
  r := public.list_devices();
  perform pg_temp.chk(jsonb_array_length(r) = 2 and not (r::text like '%' || code || '%') and (r->0->>'status') = 'pending', '3. thiết bị đã duyệt thấy yêu cầu chờ, danh sách không lộ mã');
  r := public.approve_device('devB-bbbbbbbb', case when code = '000000' then '111111' else '000000' end);
  perform pg_temp.chk(not (r->>'ok')::boolean and (r->>'attempts_left')::int = 4, '3. nhập sai mã: chưa duyệt, còn 4 lần');
  r := public.approve_device('devB-bbbbbbbb', code);
  perform pg_temp.chk((r->>'ok')::boolean, '3. nhập đúng mã: duyệt thành công');

  -- 4. Sau khi duyệt B đọc và ghi được
  perform pg_temp.as_dev(ua, sB);
  select count(*) into cnt from public.transactions;
  insert into public.transactions (id, type, amount, category, date) values ('t3', 'income', 7000, 'luong', '2026-11-08');
  perform pg_temp.chk(cnt = 1, '4. thiết bị B sau khi duyệt đọc thấy dữ liệu của A');
  perform pg_temp.as_dev(ua, sA);
  select count(*) into cnt from public.transactions;
  perform pg_temp.chk(cnt = 2, '4. thiết bị A thấy dữ liệu do B nhập');

  -- 5. Nhập sai 5 lần thì bị từ chối
  perform pg_temp.as_dev(ua, sC);
  r := public.register_device('devC-cccccccc', tokC, 'Firefox trên Linux');
  code := r->>'code';
  perform pg_temp.as_dev(ua, sA);
  for i in 1..5 loop r := public.approve_device('devC-cccccccc', case when code = '999999' then '888888' else '999999' end); end loop;
  perform pg_temp.chk(r->>'status' = 'denied', '5. sai 5 lần: thiết bị bị từ chối');
  perform pg_temp.as_dev(ua, sC);
  select count(*) into cnt from public.transactions;
  perform pg_temp.chk(cnt = 0, '5. thiết bị bị từ chối không đọc được dữ liệu');

  -- 6. Mã khôi phục
  perform pg_temp.as_dev(ua, sA);
  codes := public.create_recovery_codes();
  perform pg_temp.chk(array_length(codes, 1) = 8 and codes[1] ~ '^[0-9a-f]{4}-[0-9a-f]{4}$', '6. tạo 8 mã khôi phục');
  reset role;
  update public.devices set status = 'pending', code = '123456', attempts = 0, denied_at = null where user_id = ua and id = 'devC-cccccccc';
  perform pg_temp.as_dev(ua, sC);
  r := public.use_recovery_code('0000-0000');
  perform pg_temp.chk(not (r->>'ok')::boolean, '6. mã khôi phục sai bị từ chối');
  r := public.use_recovery_code(upper(codes[1]));
  perform pg_temp.chk((r->>'ok')::boolean, '6. mã khôi phục đúng duyệt được thiết bị (không phân biệt hoa thường)');
  select count(*) into cnt from public.transactions;
  perform pg_temp.chk(cnt = 2, '6. sau khi dùng mã khôi phục đọc được dữ liệu');
  reset role; update public.devices set status = 'pending', code = '123456' where user_id = ua and id = 'devC-cccccccc';
  perform pg_temp.as_dev(ua, sC);
  r := public.use_recovery_code(codes[1]);
  perform pg_temp.chk(not (r->>'ok')::boolean, '6. mã khôi phục chỉ dùng được một lần');
  reset role; update public.devices set status = 'approved', code = null where user_id = ua and id = 'devC-cccccccc';

  -- 7. Đăng nhập lại cùng thiết bị (phiên mới) giữ nguyên quyền; sai khóa bí mật bị chặn
  perform pg_temp.as_dev(ua, sA2);
  select count(*) into cnt from public.transactions;
  perform pg_temp.chk(cnt = 0, '7. phiên mới chưa khai báo thiết bị thì chưa đọc được');
  r := public.register_device('devA-aaaaaaaa', tokA, 'Chrome trên Windows');
  select count(*) into cnt from public.transactions;
  perform pg_temp.chk(r->>'status' = 'approved' and cnt = 2, '7. đăng nhập lại cùng thiết bị: vẫn được duyệt');
  failed := false;
  begin perform public.register_device('devA-aaaaaaaa', 'sai-khoa-bi-mat-xxxxxxxx', 'Kẻ giả mạo'); exception when others then failed := true; end;
  perform pg_temp.chk(failed, '7. dùng sai khóa bí mật của thiết bị bị chặn');
  perform pg_temp.as_dev(ua, sA);
  select count(*) into cnt from public.transactions;
  perform pg_temp.chk(cnt = 0, '7. phiên cũ của thiết bị không còn quyền sau khi phiên mới thay thế');

  -- 8. Thu hồi thiết bị
  perform pg_temp.as_dev(ua, sA2);
  perform public.revoke_device('devB-bbbbbbbb');
  perform pg_temp.as_dev(ua, sB);
  select count(*) into cnt from public.transactions;
  perform pg_temp.chk(cnt = 0, '8. thiết bị bị thu hồi mất quyền ngay');
  perform pg_temp.as_dev(ua, sA2);
  perform public.revoke_device('devC-cccccccc');
  failed := false;
  begin perform public.revoke_device('devA-aaaaaaaa'); exception when others then failed := true; end;
  perform pg_temp.chk(failed, '8. không thu hồi được thiết bị đã duyệt cuối cùng');

  -- 9. Người dùng khác
  perform pg_temp.as_dev(ub, sU2);
  r := public.register_device('devU-uuuuuuuu', 'token-U-0123456789abcdef', 'Máy của B');
  select count(*) into cnt from public.transactions;
  perform pg_temp.chk(r->>'status' = 'approved' and cnt = 0, '9. tài khoản khác tự có thiết bị đầu tiên và không thấy dữ liệu người khác');
  failed := false;
  begin insert into public.transactions (user_id, id, type, amount, category, date) values (ua, 'hack', 'expense', 1, 'x', '2026-11-08'); exception when others then failed := true; end;
  perform pg_temp.chk(failed, '9. không ghi giả mạo vào dữ liệu người khác được');
  perform pg_temp.as_dev(ub, sU2);
  failed := false;
  begin perform public.approve_device('devA-aaaaaaaa', '000000'); exception when others then failed := true; end;
  perform pg_temp.chk(failed, '9. tài khoản khác không duyệt được thiết bị của bạn');
  reset role;
end $$;

select case when ok then '  ✓ ' else '  ✗ FAIL: ' end || name as ket_qua from public.zz_results;
select case when count(*) filter (where not ok) = 0 then format('Tất cả %s kiểm thử RLS/thiết bị đạt', count(*)) else format('%s kiểm thử THẤT BẠI', count(*) filter (where not ok)) end as tong from public.zz_results;
