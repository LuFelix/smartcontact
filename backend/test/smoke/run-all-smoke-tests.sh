#!/bin/bash
# ============================================================================
# RUN-ALL-SMOKE-TESTS.SH - RUNNER UNIVERSAL DE SMOKE TESTS (Protocolo §11)
# ----------------------------------------------------------------------------
# Executa TODOS os scripts test-<modulo>-api.sh deste diretório (descoberta
# automática por glob — nenhum registro manual é necessário), consolida o
# dashboard no terminal e gera o relatório HTML em reports/smoke-report.html.
#
# Uso:
#   bash backend/test/smoke/run-all-smoke-tests.sh
#   BASE_URL=http://localhost:3000 bash run-all-smoke-tests.sh
# ============================================================================

set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPORT_ROOT="${SMOKE_REPORT_DIR:-$SCRIPT_DIR/reports}"
RUN_STAMP="$(date +%Y%m%d-%H%M%S)"
RUN_DIR="$REPORT_ROOT/$RUN_STAMP"
mkdir -p "$RUN_DIR"

SUMMARY_CSV="$RUN_DIR/summary.csv"
HTML_REPORT="$REPORT_ROOT/smoke-report.html"
echo "modulo,tests,passed,failed,avg_time_s" > "$SUMMARY_CSV"

green()  { printf '\033[0;32m%s\033[0m\n' "$1"; }
red()    { printf '\033[0;31m%s\033[0m\n' "$1"; }
cyan()   { printf '\033[0;36m%s\033[0m\n' "$1"; }
bold()   { printf '\033[1m%s\033[0m\n' "$1"; }

cyan "════════════════════════════════════════════════════════════"
cyan "  🧪 SMOKE TEST DASHBOARD — SmartContact"
cyan "  Base URL: ${BASE_URL:-http://localhost:3000}"
cyan "  Runner:   $RUN_STAMP"
cyan "════════════════════════════════════════════════════════════"
echo ""

TOTAL_TESTS=0
TOTAL_PASS=0
TOTAL_FAIL=0
MODULES_RUN=0
HTML_ROWS=""

shopt -s nullglob
for script in "$SCRIPT_DIR"/test-*-api.sh; do
  module="$(basename "$script" .sh)"
  MODULES_RUN=$((MODULES_RUN + 1))
  bold "▶ $module"

  export SMOKE_REPORT_DIR="$RUN_DIR"
  bash "$script"
  script_exit=$?
  unset SMOKE_REPORT_DIR

  csv="$RUN_DIR/$module.csv"
  if [ -f "$csv" ]; then
    m_tests=$(tail -n +2 "$csv" | wc -l | tr -d ' ')
    m_pass=$(tail -n +2 "$csv" | awk -F',' '$6=="PASS"' | wc -l | tr -d ' ')
    m_fail=$(tail -n +2 "$csv" | awk -F',' '$6=="FAIL"' | wc -l | tr -d ' ')
    m_avg=$(tail -n +2 "$csv" | awk -F',' '{ if ($5 != "-" && $5 != "") { t+=$5; n++ } } END { if (n>0) printf "%.3f", t/n; else printf "-"; }')
    echo "$module,$m_tests,$m_pass,$m_fail,$m_avg" >> "$SUMMARY_CSV"
    TOTAL_TESTS=$((TOTAL_TESTS + m_tests))
    TOTAL_PASS=$((TOTAL_PASS + m_pass))
    TOTAL_FAIL=$((TOTAL_FAIL + m_fail))

    if [ "$m_fail" -eq 0 ] && [ "$script_exit" -eq 0 ]; then
      green "  ✓ $module: $m_pass/$m_tests (média ${m_avg}s)"
    else
      red "  ✗ $module: $m_fail falha(s) de $m_tests"
    fi

    while IFS=',' read -r name expected got code time result; do
      [ "$name" = "test" ] && continue
      [ -z "$name" ] && continue
      color="#2e7d32"; [ "$result" = "FAIL" ] && color="#c62828"
      HTML_ROWS="$HTML_ROWS<tr><td>$module</td><td>$name</td><td>$expected</td><td>$got</td><td>$code</td><td>${time}s</td><td style=\"color:$color;font-weight:bold\">$result</td></tr>"
    done < "$csv"
  else
    red "  ✗ $module: sem arquivo de resultados (script falhou antes de reportar)"
    TOTAL_FAIL=$((TOTAL_FAIL + 1))
  fi
  echo ""
done
shopt -u nullglob

if [ "$MODULES_RUN" -eq 0 ]; then
  red "Nenhum script test-<modulo>-api.sh encontrado em $SCRIPT_DIR"
  exit 1
fi

# ----------------------------------------------------------------------------
# Dashboard consolidado
# ----------------------------------------------------------------------------
if [ "$TOTAL_TESTS" -gt 0 ]; then
  RATE=$(( TOTAL_PASS * 100 / TOTAL_TESTS ))
else
  RATE=0
fi

cyan "════════════════════════════════════════════════════════════"
bold "  📊 RESUMO GERAL"
cyan "  Módulos: $MODULES_RUN | Testes: $TOTAL_TESTS | Pass: $TOTAL_PASS | Fail: $TOTAL_FAIL | Taxa: $RATE%"
cyan "════════════════════════════════════════════════════════════"

# ----------------------------------------------------------------------------
# Relatório HTML (padrão §11.3)
# ----------------------------------------------------------------------------
cat > "$HTML_REPORT" <<EOF
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>SmartContact Smoke Report</title>
<style>
  body { font-family: system-ui, sans-serif; background: #f5f5f5; margin: 40px; color: #212121; }
  h1 { margin-bottom: 4px; }
  .meta { color: #616161; margin-bottom: 24px; }
  .cards { display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
  .card { background: #fff; border-radius: 8px; padding: 16px 24px; box-shadow: 0 1px 3px rgba(0,0,0,.12); min-width: 140px; }
  .card b { display: block; font-size: 28px; }
  .ok { color: #2e7d32; } .ko { color: #c62828; }
  table { border-collapse: collapse; width: 100%; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.12); }
  th, td { border: 1px solid #e0e0e0; padding: 8px 12px; text-align: left; font-size: 14px; }
  th { background: #37474f; color: #fff; }
  tr:nth-child(even) { background: #fafafa; }
</style>
</head>
<body>
  <h1>🧪 SmartContact — Smoke Report</h1>
  <div class="meta">Gerado em $(date '+%d/%m/%Y %H:%M:%S') · Run $RUN_STAMP · Base ${BASE_URL:-http://localhost:3000}</div>
  <div class="cards">
    <div class="card"><b>$TOTAL_TESTS</b>Testes</div>
    <div class="card ok"><b>$TOTAL_PASS</b>Pass</div>
    <div class="card ko"><b>$TOTAL_FAIL</b>Fail</div>
    <div class="card"><b>$RATE%</b>Taxa de sucesso</div>
    <div class="card"><b>$MODULES_RUN</b>Módulos</div>
  </div>
  <table>
    <thead><tr><th>Módulo</th><th>Teste</th><th>Esperado</th><th>Obtido</th><th>HTTP</th><th>Duração</th><th>Resultado</th></tr></thead>
    <tbody>
$HTML_ROWS
    </tbody>
  </table>
</body>
</html>
EOF

echo ""
echo "📄 Relatório HTML: $HTML_REPORT"
echo "🗂  Dados brutos:   $RUN_DIR/"

[ "$TOTAL_FAIL" -eq 0 ] || exit 1
exit 0
