#!/usr/bin/env bash
# Chạy kiểm thử trình duyệt đầy đủ: Postgres thật + máy chủ giả lập + ứng dụng build.
# Yêu cầu: Postgres đang chạy ở cổng 54329 (socket /tmp), user postgres.
set -e
cd "$(dirname "$0")/../.."
PSQL="psql -h /tmp -p 54329 -U postgres -q"
reset_db() {
  $PSQL -c "drop database if exists t" -c "create database t" 2>&1 | grep -v NOTICE || true
  $PSQL -d t -v ON_ERROR_STOP=1 -f tests/sql/supabase-stub.sql 2>&1 | grep -v "WARNING\|HINT" || true
  $PSQL -d t -v ON_ERROR_STOP=1 -f supabase/schema.sql 2>&1 | grep -v NOTICE || true
  pkill -f tests/e2e/mock-supabase || true; sleep 0.5
  node tests/e2e/mock-supabase.cjs > /tmp/mock.log 2>&1 &
  sleep 1
}
pkill -f "next-server" || true; pkill -f "next-server" || true; pkill -f "next start" || true

# 1) Ứng dụng có cấu hình Supabase từ biến môi trường (như khi đặt trên Vercel)
NEXT_DIST_DIR=.next-e2e-env NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=test-anon-key npm run build > /tmp/e2e-build1.log 2>&1
# 2) Ứng dụng KHÔNG có biến môi trường: nhập cấu hình ngay trong ứng dụng
NEXT_DIST_DIR=.next-e2e-open npm run build > /tmp/e2e-build2.log 2>&1
NEXT_DIST_DIR=.next-e2e-env npx next start -p 3106 > /tmp/e2e-next1.log 2>&1 &
NEXT_DIST_DIR=.next-e2e-open npx next start -p 3107 > /tmp/e2e-next2.log 2>&1 &
sleep 3
reset_db; node tests/e2e/devices-browser.cjs
reset_db; node tests/e2e/members-browser.cjs
reset_db
pkill -f tests/e2e/mock-supabase || true; sleep 0.5; MOCK_LEGACY=1 node tests/e2e/mock-supabase.cjs > /tmp/mock.log 2>&1 &
sleep 1; node tests/e2e/schema-help.cjs
reset_db; node tests/e2e/quick-connect.cjs
pkill -f tests/e2e/mock-supabase || true; pkill -f "next-server" || true; pkill -f "next start" || true
