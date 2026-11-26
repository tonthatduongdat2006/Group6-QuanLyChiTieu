#!/usr/bin/env bash
# Tạo tài khoản e2e@test.vn qua API (bỏ qua nếu đã tồn tại)
API=${API:-http://localhost:3000/api/v1}
curl -s -o /dev/null -w "%{http_code}\n" -X POST "$API/auth/register" -H 'Content-Type: application/json' \
  -d '{"full_name":"E2E","email":"e2e@test.vn","password":"Example123","phone":null,"terms_accepted":true}'
