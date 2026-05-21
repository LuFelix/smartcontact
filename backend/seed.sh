#!/bin/bash

# ============================================================================
# SCRIPT SHELL PARA EXECUTAR SEEDING
# ============================================================================
#
# Este script facilita a execução do seeding tanto localmente quanto no Docker
#
# Uso:
#   ./seed.sh              - Roda o seed detalhado
#   ./seed.sh simple       - Roda o seed simples (original)
#   ./seed.sh docker       - Roda dentro do Docker
#
# ============================================================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Função para imprimir com cor
print_header() {
    echo -e "\n${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}  ${1}${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ ${1}${NC}"
}

print_error() {
    echo -e "${RED}✗ ${1}${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ ${1}${NC}"
}

print_warn() {
    echo -e "${YELLOW}⚠ ${1}${NC}"
}

# Verificar se o comando foi fornecido
command="${1:-verbose}"

case $command in
    verbose)
        print_header "🌱 EXECUTANDO SEED DETALHADO"
        print_info "Rodando: npm run seed:verbose"
        print_info "Isso pode levar alguns segundos...\n"
        npm run seed:verbose
        print_success "Seed concluído!"
        ;;

    simple)
        print_header "🌱 EXECUTANDO SEED SIMPLES"
        print_info "Rodando: npm run seed"
        print_warn "Saiba que você verá menos logs"
        print_info "Rodando...\n"
        npm run seed
        print_success "Seed concluído!"
        ;;

    docker)
        print_header "🐳 EXECUTANDO SEED NO DOCKER"

        # Verificar se docker compose está disponível
        if ! command -v docker &> /dev/null; then
            print_error "docker não encontrado!"
            print_info "Instale o Docker Desktop"
            exit 1
        fi

        print_info "Verificando se os containers estão rodando..."

        # Verificar se o backend container está rodando
        if ! docker compose ps api 2>/dev/null | grep -q "Up"; then
            print_error "Backend não está rodando!"
            print_info "Execute: docker compose up -d"
            exit 1
        fi

        print_success "Containers estão rodando"
        print_info "Executando seed dentro do Docker...\n"

        docker compose exec -T api npm run seed:verbose

        print_success "Seed concluído no Docker!"
        ;;

    help|--help|-h)
        print_header "📖 AJUDA - SCRIPT DE SEED"
        echo "Uso: ./seed.sh [comando]"
        echo ""
        echo "Comandos disponíveis:"
        echo -e "  ${GREEN}verbose${NC}    - Seed detalhado com muitos logs (padrão)"
        echo -e "  ${GREEN}simple${NC}     - Seed simples, menos verbose"
        echo -e "  ${GREEN}docker${NC}     - Seed dentro do container Docker"
        echo -e "  ${GREEN}help${NC}       - Mostra esta mensagem"
        echo ""
        echo "Exemplos:"
        echo "  ./seed.sh              # Roda o seed detalhado"
        echo "  ./seed.sh docker       # Roda no Docker"
        echo "  ./seed.sh simple       # Roda versão simples"
        ;;

    *)
        print_error "Comando desconhecido: $command"
        echo -e "\nExecute ${BLUE}./seed.sh help${NC} para ver os comandos disponíveis"
        exit 1
        ;;
esac

exit 0
