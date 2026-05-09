# Multi-gestão (multi-organização)

## Conceitos

- **Gestão:** tenant lógico do lar ou projeto financeiro.
- **Membro:** usuário vinculado com papel (`docs/modelagem/security/permissoes-rbac.md`).

## Regras

1. Toda query mutável inclui filtro explícito de **gestão** autorizada.
2. Convites e remoções auditados (`auditoria` quando disponível).
3. UI sempre mostra **gestão ativa** visível.

## Migração / onboarding

- Primeira gestão criada no signup; fluxo de convite por email em roadmap.

## Limites futuros

- Cotas por gestão (storage de extratos, número de contas) como produto B2C leve.
