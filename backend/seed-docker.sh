#!/bin/bash

# ============================================================================
# SEED-DOCKER.SH - SCRIPT PARA EXECUTAR SEED DENTRO DO DOCKER
# ============================================================================
#
# Este script automatiza todo o processo:
# 1. Verifica se docker-compose está funcionando
# 2. Entra no container backend
# 3. Executa npm run seed:verbose
# 4. Mostra todos os logs em tempo real
# 5. Permite você confirmar que viu tudo antes de sair
#
# Uso:
#   ./seed-docker.sh
#   ou da pasta raiz: ./backend/seed-docker.sh
#
# ============================================================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BRIGHT='\033[1m'
NC='\033[0m' # No Color

# Funções de log
print_header() {
    echo -e "\n${CYAN}${BRIGHT}════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}${BRIGHT}  ${1}${NC}"
    echo -e "${CYAN}${BRIGHT}════════════════════════════════════════════════════════════${NC}\n"
}

print_section() {
    echo -e "\n${BLUE}${BRIGHT}▶ ${1}${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ ${1}${NC}"
}

print_error() {
    echo -e "${RED}✗ ${1}${NC}"
}

print_info() {
    echo -e "${CYAN}ℹ ${1}${NC}"
}

print_warn() {
    echo -e "${YELLOW}⚠ ${1}${NC}"
}

print_attention() {
    echo -e "${MAGENTA}${BRIGHT}→ ${1}${NC}"
}

# Detectar a pasta correta
find_project_root() {
    # Se estamos na pasta do backend
    if [ -f "package.json" ] && [ -f "src/run-seed.ts" ]; then
        PROJECT_ROOT=".."
        return 0
    fi

    # Se estamos na raiz do projeto
    if [ -d "backend" ] && [ -d "frontend" ]; then
        PROJECT_ROOT="."
        return 0
    fi

    # Se estamos em alguma pasta intermediária
    if [ -d "../backend" ] && [ -d "../frontend" ]; then
        PROJECT_ROOT=".."
        return 0
    fi

    return 1
}

# ============================================================================
# INÍCIO DO SCRIPT
# ============================================================================

print_header "🌱 SEED DOCKER - EXECUÇÃO AUTOMATIZADA"

print_info "Detectando localização do projeto..."

# Encontrar raiz do projeto
if ! find_project_root; then
    print_error "Não consegui encontrar a estrutura do projeto!"
    print_info "Certifique-se de executar este script:"
    print_info "  • From: /backend ou /frontend ou /"
    print_info "  • Em um projeto com estrutura: /backend /frontend"
    exit 1
fi

print_success "Projeto encontrado em: $PROJECT_ROOT"

# ============================================================================
# ETAPA 1: Verificar docker-compose
# ============================================================================

print_section "Etapa 1: Verificando docker-compose"

if ! command -v docker-compose &> /dev/null; then
    print_error "docker-compose não encontrado!"
    print_info "Instale o Docker Desktop ou docker-compose"
    print_info "Visite: https://docs.docker.com/compose/install/"
    exit 1
fi

print_success "docker-compose disponível"

# ============================================================================
# ETAPA 2: Verificar se containers estão rodando
# ============================================================================

print_section "Etapa 2: Verificando status dos containers"

cd "$PROJECT_ROOT"

# Mostrar status
echo -e "${CYAN}Status atual:${NC}"
docker-compose ps | tail -n +3 | while read line; do
    if echo "$line" | grep -q "Up"; then
        echo "  ${GREEN}✓ $line${NC}"
    else
        echo "  ${RED}✗ $line${NC}"
    fi
done

# Verificar se backend está rodando
if ! docker compose ps api 2>/dev/null | grep -q "Up"; then
    print_error "Backend não está rodando!"
    print_info "Execute para iniciar: docker compose up -d"
    exit 1
fi

print_success "Backend está rodando"

# Verificar se db está rodando
if ! docker compose ps db 2>/dev/null | grep -q "Up"; then
    print_warn "Banco de dados (db) pode não estar rodando"
    print_info "Aguarde alguns segundos e tente de novo..."
    sleep 3
fi

# ============================================================================
# ETAPA 3: Executar seed dentro do container
# ============================================================================

print_section "Etapa 3: Executando seed dentro do container backend"

print_attention "Conectando ao container backend..."
echo ""

# Rodar o seed e capturar saída
docker compose exec api npm run seed:verbose

SEED_EXIT_CODE=$?

# ============================================================================
# ETAPA 4: Resumo e confirmação
# ============================================================================

echo ""
print_section "Etapa 4: Resumo da execução"

if [ $SEED_EXIT_CODE -eq 0 ]; then
    print_success "Seed executado com SUCESSO!"
else
    print_error "Seed finalizou com erro (código: $SEED_EXIT_CODE)"
fi

# ============================================================================
# ETAPA 5: Confirmação para sair
# ============================================================================

print_section "Confirmação final"

print_attention "Você conseguiu acompanhar todo o log acima?"
print_info "O script vai encerrar agora."
echo ""

read -p "$(echo -e ${BRIGHT}${BLUE}Pressione ENTER para confirmar e sair...${NC})" confirm

echo ""
print_section "Encerrando"

print_success "Script finalizado com sucesso!"

if [ $SEED_EXIT_CODE -eq 0 ]; then
    echo ""
    print_info "Próximos passos:"
    echo -e "  ${BRIGHT}${CYAN}1. Abra seu frontend no navegador${NC}"
    echo -e "  ${BRIGHT}${CYAN}2. Faça login com:${NC}"
    echo ""
    echo -e "    ${GREEN}Email:${NC}  ${BRIGHT}admin@smartcontact.com.br${NC}"
    echo -e "    ${GREEN}Senha:${NC}  ${BRIGHT}Senha@123${NC}"
    echo ""
    echo -e "  ${BRIGHT}${CYAN}3. Comece a usar o sistema! 🎉${NC}"
fi

echo ""

exit $SEED_EXIT_CODE
