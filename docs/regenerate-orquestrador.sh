#!/usr/bin/env bash
# Regenera ORQUESTRADOR-VOL*.md a partir de docs/modelagem e docs/backend canônicos.
# Uso: de dentro da pasta docs/ → bash regenerate-orquestrador.sh

set -euo pipefail
DOCROOT="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$DOCROOT/.." && pwd)"
M="$DOCROOT/modelagem"

write_vol_header() {
  local title="$1"
  cat << EOF
# ${title}

**Pacote de orquestração ChatGPT — LTCashFlow.** Conteúdo abaixo foi **concatenado do repositório** com marcação de arquivo-fonte.  
Leia também o **índice:** [\`ORQUESTRADOR-00-INDICE.md\`](./ORQUESTRADOR-00-INDICE.md).

---

EOF
}

emit_src() {
  echo ""
  echo "---"
  echo ""
  echo "## ▶ Fonte: \`$1\`"
  echo ""
}

write_vol_header "ORQUESTRADOR VOL 1 — Produto, UX e roadmap (modelagem)" > "$DOCROOT/ORQUESTRADOR-VOL1-PRODUTO-UX.md"
for f in \
  README.md \
  product/README.md \
  product/visao-produto.md \
  product/objetivos.md \
  product/publico-alvo.md \
  product/diferenciais.md \
  product/identidade-produto.md \
  product/principios-sistema.md \
  product/sistema-familiar.md \
  ux/README.md \
  ux/visao-ux.md \
  ux/filosofia-ux-ltcashflow.md \
  ux/arquitetura-ux.md \
  ux/mobile-first.md \
  ux/estrutura-paginas-layouts-navegacao.md \
  ux/padroes-cards-dashboard-formularios-graficos.md \
  ux/padronizacao-visual.md \
  ux/acessibilidade.md \
  roadmap/README.md
do
  emit_src "docs/modelagem/$f" >> "$DOCROOT/ORQUESTRADOR-VOL1-PRODUTO-UX.md"
  cat "$M/$f" >> "$DOCROOT/ORQUESTRADOR-VOL1-PRODUTO-UX.md"
done

write_vol_header "ORQUESTRADOR VOL 2 — Stack oficial, arquitetura e codebase" > "$DOCROOT/ORQUESTRADOR-VOL2-STACK-ARQUITETURA.md"
emit_src "docs/stack-padrao.md" >> "$DOCROOT/ORQUESTRADOR-VOL2-STACK-ARQUITETURA.md"
cat "$DOCROOT/stack-padrao.md" >> "$DOCROOT/ORQUESTRADOR-VOL2-STACK-ARQUITETURA.md"
for f in \
  architecture/README.md \
  architecture/frontend.md \
  architecture/backend.md \
  architecture/estado-e-dados.md \
  architecture/financial-engine.md \
  architecture/rotas-next-app-router.md \
  codebase/README.md \
  codebase/frontend-estrutura-ideal.md \
  codebase/backend-estrutura-ideal.md
do
  emit_src "docs/modelagem/$f" >> "$DOCROOT/ORQUESTRADOR-VOL2-STACK-ARQUITETURA.md"
  cat "$M/$f" >> "$DOCROOT/ORQUESTRADOR-VOL2-STACK-ARQUITETURA.md"
done

write_vol_header "ORQUESTRADOR VOL 3 — Domínio de dados e fluxos" > "$DOCROOT/ORQUESTRADOR-VOL3-DADOS-FLUXOS.md"
for f in \
  database/README.md \
  database/convencoes.md \
  database/multi-gestao.md \
  database/transacoes.md \
  database/recorrencias.md \
  database/metas.md \
  database/categorias.md \
  database/dashboards-e-agregacoes.md \
  database/cartao-vs-conta.md \
  flows/README.md \
  flows/fluxo-financeiro-core.md
do
  emit_src "docs/modelagem/$f" >> "$DOCROOT/ORQUESTRADOR-VOL3-DADOS-FLUXOS.md"
  cat "$M/$f" >> "$DOCROOT/ORQUESTRADOR-VOL3-DADOS-FLUXOS.md"
done

write_vol_header "ORQUESTRADOR VOL 4 — IA (estratégia), observabilidade, segurança, ops e meta" > "$DOCROOT/ORQUESTRADOR-VOL4-IA-OBS-SEG-OPS.md"
for f in \
  ai/README.md \
  ai/estrategia-ia.md \
  ai/insights-financeiros.md \
  ai/automacoes-futuras.md \
  ai/comportamento-e-notificacoes.md \
  observability/README.md \
  observability/analytics-produto.md \
  observability/logs-e-tracing.md \
  security/README.md \
  security/seguranca-dados.md \
  security/permissoes-rbac.md \
  security/backups.md \
  ops/README.md \
  ops/ci-cd.md \
  ops/deploy.md \
  ops/ambientes-e-segredos.md \
  meta/ia-por-etapa.md
do
  emit_src "docs/modelagem/$f" >> "$DOCROOT/ORQUESTRADOR-VOL4-IA-OBS-SEG-OPS.md"
  cat "$M/$f" >> "$DOCROOT/ORQUESTRADOR-VOL4-IA-OBS-SEG-OPS.md"
done

write_vol_header "ORQUESTRADOR VOL 5 — Documentos canônicos na raiz de docs/" > "$DOCROOT/ORQUESTRADOR-VOL5-CANONICOS.md"
for src in produto-roadmap.md briefing-modelagem-cloud.md assistente-ia.md catalogo-comandos-ia.md deploy-railway.md; do
  emit_src "docs/$src" >> "$DOCROOT/ORQUESTRADOR-VOL5-CANONICOS.md"
  cat "$DOCROOT/$src" >> "$DOCROOT/ORQUESTRADOR-VOL5-CANONICOS.md"
done

write_vol_header "ORQUESTRADOR VOL 6 — Backend: modelagem descritiva, SQL canônico e observabilidade (legado)" > "$DOCROOT/ORQUESTRADOR-VOL6-SQL-E-MODELO.md"
emit_src "backend/docs/modelagem-dados.md" >> "$DOCROOT/ORQUESTRADOR-VOL6-SQL-E-MODELO.md"
cat "$REPO/backend/docs/modelagem-dados.md" >> "$DOCROOT/ORQUESTRADOR-VOL6-SQL-E-MODELO.md"
emit_src "backend/database/schema.sql" >> "$DOCROOT/ORQUESTRADOR-VOL6-SQL-E-MODELO.md"
cat "$REPO/backend/database/schema.sql" >> "$DOCROOT/ORQUESTRADOR-VOL6-SQL-E-MODELO.md"
emit_src "backend/docs/readme_observabilidade.md" >> "$DOCROOT/ORQUESTRADOR-VOL6-SQL-E-MODELO.md"
cat "$REPO/backend/docs/readme_observabilidade.md" >> "$DOCROOT/ORQUESTRADOR-VOL6-SQL-E-MODELO.md"

echo "OK — volumes atualizados em $DOCROOT"
wc -l "$DOCROOT"/ORQUESTRADOR-VOL*.md
