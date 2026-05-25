#!/bin/bash

# Script para Reset de Contas de Teste (Google/Registros)
# Mantém o Seed Oficial (Tiweb) intacto.

echo "🧹 Iniciando limpeza de contas de teste..."

# IDs que NÃO serão apagados (Admin e Seed da Tiweb)
# O seed usa @smartcontact.tiweb.app.br e o admin oficial admin@smartcontact.com.br
SKIP_CONDITION="email LIKE '%@smartcontact.tiweb.app.br' OR email = 'admin@smartcontact.com.br'"

# 1. Remover Tags e Perfis de usuários que serão apagados
docker compose exec -T db psql -U postgres -d mydb -c "
DELETE FROM tags WHERE user_id IN (SELECT id FROM \"user\" WHERE NOT ($SKIP_CONDITION));
DELETE FROM profiles WHERE user_id IN (SELECT id FROM \"user\" WHERE NOT ($SKIP_CONDITION));
"

# 2. Remover Logs de Interação vinculados a esses usuários/tags
docker compose exec -T db psql -U postgres -d mydb -c "
DELETE FROM interaction_logs WHERE tag_id NOT IN (SELECT id FROM tags);
"

# 3. Remover contatos (Leads) e associações de tenant criadas pelos usuários de teste
docker compose exec -T db psql -U postgres -d mydb -c "
DELETE FROM phones WHERE owner_id IN (SELECT id FROM \"user\" WHERE NOT ($SKIP_CONDITION));
DELETE FROM addresses WHERE owner_id IN (SELECT id FROM \"user\" WHERE NOT ($SKIP_CONDITION));
DELETE FROM user_emails WHERE owner_id IN (SELECT id FROM \"user\" WHERE NOT ($SKIP_CONDITION));
DELETE FROM user_links WHERE owner_id IN (SELECT id FROM \"user\" WHERE NOT ($SKIP_CONDITION));
"

# 4. Remover as associações de membros (RBAC Multi-Tenant)
docker compose exec -T db psql -U postgres -d mydb -c "
DELETE FROM tenant_members WHERE user_id IN (SELECT id FROM \"user\" WHERE NOT ($SKIP_CONDITION));
"

# 5. Por fim, remover os próprios usuários
docker compose exec -T db psql -U postgres -d mydb -c "
DELETE FROM \"user\" WHERE NOT ($SKIP_CONDITION);
"

echo "✅ Limpeza concluída! O sistema está pronto para novos testes de onboarding."
