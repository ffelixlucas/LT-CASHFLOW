# Fluxo financeiro core

## 1. Registrar movimento manual

**Atores:** membro com papel editor+.  
**Passos:** escolher conta → tipo → valor → competência → categoria opcional → confirmar.  
**Pós-condição:** lançamento aparece no extrato; agregações invalidadas.

## 2. Importar extrato

**Atores:** editor+.  
**Passos:** upload/parsing → correspondência de conta → pré-visualização → deduplicação por `origem_externa` → confirmar lotes.  
**Erros esperados:** duplicidade, formato divergente — UX deve permitir rollback parcial.

## 3. Conciliar

**Atores:** editor+.  
**Passos:** comparar linhas importadas x lançamentos existentes → aceitar match ou criar novo → marcar status conciliado.

## 4. Transferência entre contas

**Passos:** origem → destino → valor → data → validação antidupla contagem.  
**Documentação espelhada:** `docs/modelagem/database/transacoes.md`.

## 5. Cartão — ciclo de fatura

Ver `docs/modelagem/database/cartao-vs-conta.md`. Fluxo deve explicitar qual saldo o usuário está interpretando.

## 6. Família — convite e permissão

Convite → aceite → papel atribuído → visibilidade de contas herdada conforme política (`docs/modelagem/security/permissoes-rbac.md`).

## Métricas de fluxo

- Tempo médio de conciliação,
- Taxa de erro de import,
- Abandono em passos de wizard.
