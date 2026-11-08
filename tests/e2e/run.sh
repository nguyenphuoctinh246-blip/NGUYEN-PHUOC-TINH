#!/usr/bin/env bash
# Chạy kiểm thử trình duyệt đầy đủ: Postgres thật + máy chủ giả lập + ứng dụng build có cấu hình Supabase.
# Yêu cầu: Postgres đang chạy ở cổng 54329 (socket /tmp), user postgres.
set -e
cd "$(dirname "$0")/../.."
PSQL="psql -h /tmp -p 54329 -U postgres -q"
$PSQL -c "drop database if exists t" -c "create database t" 2>&1 | grep -v NOTICE || true
$PSQL -d t -v ON_ERROR_STOP=1 -f tests/sql/supabase-stub.sql 2>&1 | grep -v "WARNING\|HINT" || true
$PSQL -d t -v ON_ERROR_STOP=1 -f supabase/schema.sql 2>&1 | grep -v NOTICE || true
pkill -f tests/e2e/mock-supabase || true; pkill -f "next-server" || true
node tests/e2e/mock-supabase.cjs > /tmp/mock.log 2>&1 &
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=test npm run build > /tmp/e2e-build.log 2>&1
npx next start -p 3106 > /tmp/e2e-next.log 2>&1 &
sleep 3
node tests/e2e/devices-browser.cjs
