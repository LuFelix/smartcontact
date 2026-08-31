#!/bin/bash

# ==========================================
# Configurações VPS e Local
# Ajuste o usuário e o IP/Domínio da sua VPS
# ==========================================
SSH_USER="root"
SSH_HOST="smartcontact.tiweb.app.br" 

VPS_CONTAINER_NAME="smartcontact_postgres_db_dev" # Ajuste se na VPS for apenas smartcontact_postgres_db
LOCAL_CONTAINER_NAME="smartcontact_postgres_db_dev"
DB_USER="postgres"
DB_NAME="mydb"

# Caminhos
BKP_DIR="$(dirname "$0")"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BKP_FILE="dump_${TIMESTAMP}.sql"
BKP_PATH="${BKP_DIR}/${BKP_FILE}"

echo "============================================"
echo "🚀 Iniciando Sincronização de Banco de Dados"
echo "============================================"

echo "🔄 [1/3] Conectando na VPS e gerando o dump remoto..."
# O parâmetro -c (--clean) inclui DROP TABLE para limpar o banco local antes de recriar
# O parâmetro -O (--no-owner) evita problemas de permissão de owner no restore
ssh "${SSH_USER}@${SSH_HOST}" "docker exec ${VPS_CONTAINER_NAME} pg_dump -U ${DB_USER} -d ${DB_NAME} -c -O" > "${BKP_PATH}"

if [ $? -eq 0 ] && [ -s "${BKP_PATH}" ]; then
    echo "✅ [2/3] Dump baixado com sucesso: ${BKP_FILE}"
else
    echo "❌ Erro: Falha ao gerar ou baixar o dump da VPS."
    rm -f "${BKP_PATH}"
    exit 1
fi

echo "🔄 [3/3] Aplicando dump no container local (${LOCAL_CONTAINER_NAME})..."
# Desabilita logs excessivos do psql no terminal com -q (quiet)
cat "${BKP_PATH}" | docker exec -i "${LOCAL_CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}" -q

if [ $? -eq 0 ]; then
    echo "✅ Sincronização concluída com sucesso! Seu ambiente local agora reflete a produção."
else
    echo "❌ Erro ao restaurar os dados no banco local."
    exit 1
fi
