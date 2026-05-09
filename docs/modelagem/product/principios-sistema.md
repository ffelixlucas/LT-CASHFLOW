# Princípios do sistema

Princípios que **produto**, **UX** e **engenharia** comprometem-se a aplicar em decisões diárias.

## Produto

1. **Clareza > completude:** menos métricas, mais compreensão.
2. **Fluxo financeiro explícito:** toda movimentação tem história auditável.
3. **Consentimento para automação:** IA e regras automáticas precisam de opt-in ou confirmação clara.
4. **Neutralidade empática:** dados descrevem; julgamento moral fica fora do sistema.

## UX

1. **Snapshot primeiro:** abrir o app deve responder “onde estou agora?” antes de histórico profundo.
2. **Progressive disclosure:** resumo → detalhe → edição técnica.
3. **Estados de esforço zero:** vazio, erro e offline orientam ação próxima.

## Engenharia

1. **Fonte única da verdade:** MySQL + regras documentadas; caches são derivados e invalidáveis.
2. **Contratos tipados:** entrada/saída validada (`zod`), erros com códigos estáveis para UI.
3. **Mudanças reversíveis:** migrações e feature flags para domínio financeiro sensível.
4. **Observabilidade por padrão:** logs estruturados em fluxos de conciliação e importação.

## Princípio de fronteira com ERP

Se uma funcionalidade exige fluxo contábil completo, ela **não entra** no núcleo sem revisão explícita de escopo.
