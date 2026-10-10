#!/bin/bash
# ============================================================================
# TEST-BILLING-API.SH - SMOKE TEST DO MÓDULO BILLING (Issue #349 / BE-BILL-001)
# ----------------------------------------------------------------------------
# Ciclo completo: login dinâmico -> CRUD de planos -> lazy-default Free ->
# segurança (401/403) -> latência (time_total) por request.
#
# Uso:
#   bash backend/test/smoke/test-billing-api.sh
#   BASE_URL=http://localhost:3000 bash test-billing-api.sh
#
# Resultados brutos (CSV) exportados para o diretório de reports (o runner
# universal run-all-smoke-tests.sh exporta SMOKE_REPORT_DIR) para geração do
# dashboard e do relatório HTML.
# ============================================================================

set -u

BASE_URL="${BASE_URL:-http://localhost:3000}"
ADMIN_EMAIL="${SMOKE_ADMIN_EMAIL:-admin@smartcontact.com.br}"
ADMIN_PASSWORD="${SMOKE_ADMIN_PASSWORD:-Senha@123}"
USER_EMAIL="${SMOKE_USER_EMAIL:-ana-silva@smartcontact.tiweb.app.br}"
USER_PASSWORD="${SMOKE_USER_PASSWORD:-Senha!123}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODULE_NAME="$(basename "${BASH_SOURCE[0]}" .sh)"
REPORT_ROOT="${SMOKE_REPORT_DIR:-$SCRIPT_DIR/reports}"

if [ -n "${SMOKE_REPORT_DIR:-}" ]; then
  REPORT_DIR="$SMOKE_REPORT_DIR"
else
  REPORT_DIR="$REPORT_ROOT/$(date +%Y%m%d-%H%M%S)"
fi
mkdir -p "$REPORT_DIR"

RESULT_CSV="$REPORT_DIR/$MODULE_NAME.csv"
echo "test,expected,got,code,time,result" > "$RESULT_CSV"

PASS_COUNT=0
FAIL_COUNT=0
TOKEN_ADMIN=""
TOKEN_USER=""
CREATED_PLAN_ID=""
PLAN_CODE="smoke-$(date +%s)"
HTTP_CODE=""
HTTP_TIME=""
HTTP_BODY=""

green() { printf '\033[0;32m%s\033[0m\n' "$1"; }
red()   { printf '\033[0;31m%s\033[0m\n' "$1"; }
cyan()  { printf '\033[0;36m%s\033[0m\n' "$1"; }

record() {
  # record <nome> <esperado> <obtido> <http_code> <time_total>
  local name="$1" expected="$2" got="$3" code="$4" time="$5"
  local result="PASS"
  if [ "$got" != "$expected" ]; then
    result="FAIL"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    red "[ FAIL ] $name (esperado: $expected | obtido: $got | HTTP $code | ${time}s)"
  else
    PASS_COUNT=$((PASS_COUNT + 1))
    green "[ PASS ] $name (HTTP $code | ${time}s)"
  fi
  echo "$name,$expected,$got,$code,$time,$result" >> "$RESULT_CSV"
}

http_request() {
  # http_request <method> <path> <body> <token>
  # Seta HTTP_CODE, HTTP_TIME e HTTP_BODY no escopo do chamador (sem subshell).
  local method="$1" path="$2" body="$3" token="$4"
  local out
  local -a args=(-s -o "$REPORT_DIR/.body" -w "%{http_code} %{time_total}" -X "$method" "$BASE_URL$path")
  if [ -n "$body" ]; then
    args+=(-H 'Content-Type: application/json' -d "$body")
  fi
  if [ -n "$token" ]; then
    args+=(-H "Authorization: Bearer $token")
  fi
  out=$(curl "${args[@]}")
  HTTP_CODE="${out%% *}"
  HTTP_TIME="${out##* }"
  HTTP_BODY="$(cat "$REPORT_DIR/.body" 2>/dev/null || true)"
}

extract_token() {
  echo "$1" | grep -o '"access_token":"[^"]*"' | head -1 | cut -d'"' -f4
}

extract_field() {
  echo "$1" | grep -o "\"$2\":\"[^\"]*\"" | head -1 | cut -d'"' -f4
}

cyan "════════════════════════════════════════════════════════════"
cyan "  SMOKE BILLING API — $BASE_URL"
cyan "════════════════════════════════════════════════════════════"
echo ""

# ----------------------------------------------------------------------------
# 1. AUTENTICAÇÃO
# ----------------------------------------------------------------------------
cyan "▶ Autenticação"

http_request POST /api/auth/login "{\"identifier\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" ""
TOKEN_ADMIN="$(extract_token "$HTTP_BODY")"
login_code="$HTTP_CODE"
if [ -z "$TOKEN_ADMIN" ]; then login_code="000"; fi
record "Login admin (token dinâmico)" "201" "$login_code" "$HTTP_CODE" "$HTTP_TIME"

http_request POST /api/auth/login "{\"identifier\":\"$USER_EMAIL\",\"password\":\"$USER_PASSWORD\"}" ""
TOKEN_USER="$(extract_token "$HTTP_BODY")"
login_code="$HTTP_CODE"
if [ -z "$TOKEN_USER" ]; then login_code="000"; fi
record "Login usuário comum (para cenário 403)" "201" "$login_code" "$HTTP_CODE" "$HTTP_TIME"

# ----------------------------------------------------------------------------
# 2. PLANO EFETIVO (lazy default Free)
# ----------------------------------------------------------------------------
cyan "▶ Plano efetivo do tenant"

http_request GET /api/billing/subscription "" "$TOKEN_ADMIN"
subscription_code="$(extract_field "$HTTP_BODY" "code")"
if [ "$HTTP_CODE" = "200" ] && [ "$subscription_code" = "free" ]; then
  record "GET /billing/subscription sem assinatura => plano Free" "200" "200" "$HTTP_CODE" "$HTTP_TIME"
else
  record "GET /billing/subscription sem assinatura => plano Free" "200:free" "$HTTP_CODE:$subscription_code" "$HTTP_CODE" "$HTTP_TIME"
fi

# ----------------------------------------------------------------------------
# 3. CICLO DE VIDA COMPLETO DO CRUD DE PLANOS
# ----------------------------------------------------------------------------
cyan "▶ CRUD de planos"

http_request GET /api/billing/plans "" "$TOKEN_ADMIN"
if [ "$HTTP_CODE" = "200" ] && echo "$HTTP_BODY" | grep -q '"code":"free"'; then
  record "GET /billing/plans lista catálogo seed (free)" "200" "200" "$HTTP_CODE" "$HTTP_TIME"
else
  record "GET /billing/plans lista catálogo seed (free)" "200" "$HTTP_CODE" "$HTTP_CODE" "$HTTP_TIME"
fi

http_request POST /api/billing/plans "{\"code\":\"$PLAN_CODE\",\"name\":\"Plano Smoke\",\"priceCents\":1990,\"maxMembers\":2}" "$TOKEN_ADMIN"
CREATED_PLAN_ID="$(extract_field "$HTTP_BODY" "id")"
if [ "$HTTP_CODE" = "201" ] && [ -n "$CREATED_PLAN_ID" ]; then
  record "POST /billing/plans cria plano (201 + id)" "201" "201" "$HTTP_CODE" "$HTTP_TIME"
else
  record "POST /billing/plans cria plano (201 + id)" "201" "$HTTP_CODE" "$HTTP_CODE" "$HTTP_TIME"
fi

if [ -n "$CREATED_PLAN_ID" ]; then
  http_request GET "/api/billing/plans/$CREATED_PLAN_ID" "" "$TOKEN_ADMIN"
  got="$HTTP_CODE"
  if [ "$HTTP_CODE" = "200" ] && echo "$HTTP_BODY" | grep -q "$PLAN_CODE"; then got="200"; else got="$HTTP_CODE"; fi
  record "GET /billing/plans/:id detalha o plano criado" "200" "$got" "$HTTP_CODE" "$HTTP_TIME"

  http_request PATCH "/api/billing/plans/$CREATED_PLAN_ID" '{"name":"Plano Smoke Editado","priceCents":2990}' "$TOKEN_ADMIN"
  got="$HTTP_CODE"
  if [ "$HTTP_CODE" = "200" ] && echo "$HTTP_BODY" | grep -q "Plano Smoke Editado"; then got="200"; else got="$HTTP_CODE"; fi
  record "PATCH /billing/plans/:id atualiza nome e preço" "200" "$got" "$HTTP_CODE" "$HTTP_TIME"

  http_request POST /api/billing/plans "{\"code\":\"$PLAN_CODE\",\"name\":\"Duplicado\"}" "$TOKEN_ADMIN"
  record "POST /billing/plans rejeita code duplicado (400)" "400" "$HTTP_CODE" "$HTTP_CODE" "$HTTP_TIME"

  http_request DELETE "/api/billing/plans/$CREATED_PLAN_ID" "" "$TOKEN_ADMIN"
  record "DELETE /billing/plans/:id soft delete (204)" "204" "$HTTP_CODE" "$HTTP_CODE" "$HTTP_TIME"

  http_request GET "/api/billing/plans/$CREATED_PLAN_ID" "" "$TOKEN_ADMIN"
  got="$HTTP_CODE"
  if [ "$HTTP_CODE" = "200" ] && echo "$HTTP_BODY" | grep -q '"isActive":false'; then got="200"; else got="$HTTP_CODE"; fi
  record "GET após DELETE => plano inativo (isActive:false)" "200" "$got" "$HTTP_CODE" "$HTTP_TIME"
else
  record "GET /billing/plans/:id detalha o plano criado" "200" "SKIP" "-" "-"
  record "PATCH /billing/plans/:id atualiza nome e preço" "200" "SKIP" "-" "-"
  record "POST /billing/plans rejeita code duplicado (400)" "400" "SKIP" "-" "-"
  record "DELETE /billing/plans/:id soft delete (204)" "204" "SKIP" "-" "-"
  record "GET após DELETE => plano inativo (isActive:false)" "200" "SKIP" "-" "-"
fi

http_request GET "/api/billing/plans/00000000-0000-4000-8000-000000000000" "" "$TOKEN_ADMIN"
record "GET /billing/plans/:id inexistente (404)" "404" "$HTTP_CODE" "$HTTP_CODE" "$HTTP_TIME"

# ----------------------------------------------------------------------------
# 4. SEGURANÇA (isolamento de acesso)
# ----------------------------------------------------------------------------
cyan "▶ Segurança (401 / 403)"

http_request POST /api/billing/plans '{"code":"sem-token","name":"X"}' ""
record "POST /billing/plans sem token (401)" "401" "$HTTP_CODE" "$HTTP_CODE" "$HTTP_TIME"

http_request POST /api/billing/plans '{"code":"nao-admin","name":"X"}' "$TOKEN_USER"
record "POST /billing/plans sem role administrador (403)" "403" "$HTTP_CODE" "$HTTP_CODE" "$HTTP_TIME"

http_request GET /api/billing/subscription "" ""
record "GET /billing/subscription sem token (401)" "401" "$HTTP_CODE" "$HTTP_CODE" "$HTTP_TIME"

# ----------------------------------------------------------------------------
echo ""
cyan "────────────────────────────────────────────────────────────"
if [ "$FAIL_COUNT" -eq 0 ]; then
  green "  BILLING SMOKE: $PASS_COUNT/$((PASS_COUNT + FAIL_COUNT)) PASS — 0 falhas"
else
  red "  BILLING SMOKE: $PASS_COUNT/$((PASS_COUNT + FAIL_COUNT)) — $FAIL_COUNT FALHA(S)"
fi
cyan "  Resultados: $RESULT_CSV"
cyan "────────────────────────────────────────────────────────────"

[ "$FAIL_COUNT" -eq 0 ] || exit 1
exit 0
