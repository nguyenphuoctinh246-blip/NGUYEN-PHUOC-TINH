-- Kiểm thử tài khoản con (mã mời, ghi nhận người nhập, quyền xem/ghi) trên Postgres thật.
-- Chạy sau supabase-stub.sql và schema.sql.
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
  o uuid := 'a0000000-0000-0000-0000-00000000000a'; m1 uuid := 'b0000000-0000-0000-0000-00000000000b'; m2 uuid := 'c0000000-0000-0000-0000-00000000000c';
  x uuid := 'd0000000-0000-0000-0000-00000000000d';
  so uuid := 'a1111111-0000-0000-0000-000000000001'; s1 uuid := 'b1111111-0000-0000-0000-000000000001'; s2 uuid := 'c1111111-0000-0000-0000-000000000001'; sx uuid := 'd1111111-0000-0000-0000-000000000001';
  r jsonb; cnt int; code text; code2 text; failed boolean; who uuid;
begin
  insert into auth.users (id, email) values (o, 'chu@chitieu.local'), (m1, 'be.an@chitieu.local'), (m2, 'be.binh@chitieu.local'), (x, 'nguoila@chitieu.local');

  -- Chủ tài khoản: thiết bị đầu tiên được duyệt, có giao dịch riêng
  perform pg_temp.as_dev(o, so);
  perform public.register_device('dev-owner-0001', 'token-owner-0123456789', 'Chrome trên Windows');
  insert into public.transactions (user_id, id, type, amount, category, date) values (o, 'o1', 'expense', 1000, 'an_uong', '2026-11-08');
  insert into public.categories (user_id, id, label, icon, type, color) values (o, 'an_uong', 'Ăn uống', '🍜', 'expense', 1);
  insert into public.settings (user_id, id, budgets) values (o, 'budgets', '{"an_uong": 5000000}');

  -- 1. Mã mời
  r := public.create_invite('Bé An', false);
  code := r->>'code';
  perform pg_temp.chk(code ~ '^[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$', '1. chủ tạo mã mời 8 ký tự dễ đọc (' || code || ')');
  perform pg_temp.chk(jsonb_array_length(public.list_invites()) = 1, '1. danh sách mã mời đang chờ hiện 1 mã');
  perform pg_temp.chk(not (public.list_invites()::text like '%' || code || '%'), '1. danh sách mã mời không lộ mã');

  -- 2. Người lạ dùng mã sai; Bé An dùng mã đúng
  perform pg_temp.as_dev(m1, s1);
  perform public.register_device('dev-an-00000001', 'token-an-0123456789abcd', 'Safari trên iPhone');
  failed := false; begin perform public.join_workspace('ZZZZ-9999'); exception when others then failed := true; end;
  perform pg_temp.chk(failed, '2. mã sai bị từ chối');
  r := public.join_workspace(lower(code));
  perform pg_temp.chk(r->>'name' = 'Bé An' and (r->>'workspace_id')::uuid = o, '2. mã đúng (không phân biệt hoa thường): tham gia kho của chủ');
  failed := false; begin perform public.join_workspace(code); exception when others then failed := true; end;
  perform pg_temp.chk(failed, '2. mã chỉ dùng được một lần (người đã là thành viên thử lại)');
  r := public.my_workspace();
  perform pg_temp.chk(r->>'role' = 'member' and (r->>'workspace_id')::uuid = o and not (r->>'can_view_all')::boolean, '2. my_workspace báo vai trò thành viên, chưa được xem tất cả');

  perform pg_temp.as_dev(x, sx);
  perform public.register_device('dev-la-00000001', 'token-la-0123456789abcd', 'Chrome');
  failed := false; begin perform public.join_workspace(code); exception when others then failed := true; end;
  perform pg_temp.chk(failed, '2. người khác dùng lại mã đã dùng bị từ chối');

  -- 3. Bé An ghi giao dịch vào kho của chủ, máy chủ ghi nhận người nhập
  perform pg_temp.as_dev(m1, s1);
  insert into public.transactions (user_id, id, type, amount, category, date) values (o, 'a1', 'expense', 2000, 'an_uong', '2026-11-08');
  select created_by into who from public.transactions where id = 'a1';
  perform pg_temp.chk(who = m1, '3. máy chủ ghi nhận created_by = tài khoản con');
  failed := false; begin insert into public.transactions (user_id, created_by, id, type, amount, category, date) values (o, o, 'a2', 'expense', 1, 'x', '2026-11-08'); exception when others then failed := true; end;
  perform pg_temp.chk(failed, '3. không thể ghi danh nghĩa người khác (created_by giả mạo)');
  failed := false; begin insert into public.transactions (user_id, id, type, amount, category, date) values (x, 'a3', 'expense', 1, 'x', '2026-11-08'); exception when others then failed := true; end;
  perform pg_temp.chk(failed, '3. không ghi được vào kho dữ liệu của người khác');
  select count(*) into cnt from public.transactions;
  perform pg_temp.chk(cnt = 1, '3. chưa được phép xem tất cả: chỉ thấy giao dịch của chính mình (1)');
  select count(*) into cnt from public.categories; perform pg_temp.chk(cnt = 1, '3. đọc được danh mục của chủ để chọn khi nhập');
  select count(*) into cnt from public.settings; perform pg_temp.chk(cnt = 1, '3. đọc được ngân sách của chủ');

  -- 4. Tài khoản con không sửa được cấu hình của chủ
  failed := false; begin insert into public.categories (user_id, id, label, icon, type, color) values (o, 'moi', 'Mới', 'x', 'expense', 1); exception when others then failed := true; end;
  perform pg_temp.chk(failed, '4. tài khoản con không thêm được danh mục');
  update public.categories set label = 'Hack' where user_id = o; get diagnostics cnt = row_count;
  perform pg_temp.chk(cnt = 0, '4. tài khoản con không sửa được danh mục');
  delete from public.settings where user_id = o; get diagnostics cnt = row_count;
  perform pg_temp.chk(cnt = 0, '4. tài khoản con không xóa được ngân sách');
  update public.transactions set amount = 2500 where id = 'a1'; get diagnostics cnt = row_count;
  perform pg_temp.chk(cnt = 1, '4. sửa được giao dịch do chính mình nhập');
  update public.transactions set amount = 9 where id = 'o1'; get diagnostics cnt = row_count;
  perform pg_temp.chk(cnt = 0, '4. không sửa được giao dịch của chủ');
  delete from public.transactions where id = 'o1'; get diagnostics cnt = row_count;
  perform pg_temp.chk(cnt = 0, '4. không xóa được giao dịch của chủ');

  -- 5. Chủ thấy tất cả và biết ai nhập; sửa được giao dịch của con mà không đổi người nhập
  perform pg_temp.as_dev(o, so);
  select count(*) into cnt from public.transactions; perform pg_temp.chk(cnt = 2, '5. chủ thấy cả giao dịch của mình và của tài khoản con');
  select created_by into who from public.transactions where id = 'a1'; perform pg_temp.chk(who = m1, '5. người nhập hiển thị đúng là tài khoản con');
  insert into public.transactions (user_id, id, type, amount, category, date) values (o, 'a1', 'expense', 3000, 'an_uong', '2026-11-08')
    on conflict (user_id, id) do update set amount = excluded.amount;
  select created_by, amount into who, cnt from public.transactions where id = 'a1';
  perform pg_temp.chk(who = m1 and cnt = 3000, '5. chủ sửa số tiền nhưng người nhập vẫn là tài khoản con');
  perform pg_temp.chk(jsonb_array_length(public.workspace_people()) = 2, '5. danh sách người trong kho: chủ + 1 tài khoản con');

  -- 6. Chủ cho phép xem tất cả
  perform public.update_member(m1, true, null);
  perform pg_temp.as_dev(m1, s1);
  select count(*) into cnt from public.transactions; perform pg_temp.chk(cnt = 2, '6. được cấp quyền xem tất cả: thấy cả giao dịch của chủ');
  update public.transactions set amount = 1 where id = 'o1'; get diagnostics cnt = row_count;
  perform pg_temp.chk(cnt = 0, '6. dù xem được tất cả vẫn không sửa được giao dịch của chủ');
  failed := false; begin perform public.create_invite('Con lậu', false); exception when others then failed := true; end;
  perform pg_temp.chk(failed, '6. tài khoản con không tự tạo mã mời được');
  failed := false; begin perform public.update_member(m1, true, 'Tự phong'); exception when others then failed := true; end;
  perform pg_temp.chk(failed, '6. tài khoản con không tự cấp quyền cho mình');

  -- 7. Hai tài khoản con không thấy giao dịch của nhau
  perform pg_temp.as_dev(o, so);
  code2 := (public.create_invite('Bé Bình', false))->>'code';
  perform pg_temp.as_dev(m2, s2);
  perform public.register_device('dev-binh-0000001', 'token-binh-0123456789ab', 'Chrome trên Android');
  perform public.join_workspace(code2);
  insert into public.transactions (user_id, id, type, amount, category, date) values (o, 'b1', 'expense', 700, 'an_uong', '2026-11-08');
  select count(*) into cnt from public.transactions; perform pg_temp.chk(cnt = 1, '7. Bé Bình chỉ thấy giao dịch của mình, không thấy của Bé An');
  perform pg_temp.as_dev(m1, s1);
  select count(*) into cnt from public.transactions where id = 'b1'; perform pg_temp.chk(cnt = 1, '7. Bé An (được xem tất cả) thấy giao dịch của Bé Bình');

  -- 8. Mã hết hạn, và người đã có dữ liệu riêng không tham gia được
  perform pg_temp.as_dev(o, so);
  code := (public.create_invite('Quá hạn', false))->>'code';
  reset role; update public.workspace_invites set expires_at = now() - interval '1 minute' where display_name = 'Quá hạn';
  perform pg_temp.as_dev(x, sx);
  failed := false; begin perform public.join_workspace(code); exception when others then failed := true; end;
  perform pg_temp.chk(failed, '8. mã hết hạn bị từ chối');
  perform pg_temp.as_dev(o, so);
  code := (public.create_invite('Người có dữ liệu', false))->>'code';
  perform pg_temp.as_dev(x, sx);
  insert into public.transactions (user_id, id, type, amount, category, date) values (x, 'x1', 'expense', 5, 'a', '2026-11-08');
  failed := false; begin perform public.join_workspace(code); exception when others then failed := true; end;
  perform pg_temp.chk(failed, '8. người đã có giao dịch riêng không được tham gia (tránh ẩn mất dữ liệu)');
  perform pg_temp.as_dev(o, so);
  failed := false; begin perform public.join_workspace(code); exception when others then failed := true; end;
  perform pg_temp.chk(failed, '8. chủ không dùng được mã của chính mình');

  -- 9. Gỡ tài khoản con
  perform public.remove_member(m2);
  perform pg_temp.as_dev(m2, s2);
  select count(*) into cnt from public.transactions; perform pg_temp.chk(cnt = 0, '9. tài khoản con bị gỡ mất quyền xem ngay');
  failed := false; begin insert into public.transactions (user_id, id, type, amount, category, date) values (o, 'b2', 'expense', 1, 'x', '2026-11-08'); exception when others then failed := true; end;
  perform pg_temp.chk(failed, '9. tài khoản con bị gỡ không ghi được nữa');
  perform pg_temp.as_dev(o, so);
  select count(*) into cnt from public.transactions where id = 'b1'; perform pg_temp.chk(cnt = 1, '9. dữ liệu đã nhập trước đó vẫn thuộc chủ tài khoản');

  -- 10. Người lạ không đọc được gì của chủ
  perform pg_temp.as_dev(x, sx);
  select count(*) into cnt from public.transactions where user_id = o; perform pg_temp.chk(cnt = 0, '10. người ngoài không thấy dữ liệu của chủ');
  reset role;
end $$;

select case when ok then '  ✓ ' else '  ✗ FAIL: ' end || name as ket_qua from public.zz_results;
select case when count(*) filter (where not ok) = 0 then format('Tất cả %s kiểm thử tài khoản con đạt', count(*)) else format('%s kiểm thử THẤT BẠI', count(*) filter (where not ok)) end as tong from public.zz_results;
drop table public.zz_results;
