# Escolha de IA por etapa do trabalho

Este guia é **heurístico**: o melhor modelo é sempre o que sua equipe valida com qualidade, custo e latência. Abaixo, recomendações típicas para SaaS financeiro com forte componente de produto e engenharia.

| Etapa | Objetivo | Perfil desejado | Sugestão típica |
|-------|----------|-----------------|-----------------|
| Arquitetura de sistema | Trade-offs, modularização, fronteiras, evolução sem microserviços prematuros | Raciocínio longo, conservador em hype | Modelo “thinking” / reasoning (ex.: família Opus, o1-style) ou Claude com contexto grande |
| UX / information architecture | Hierarquia mental, redução de carga cognitiva, fluxos | Forte em linguagem clara e critérios de usabilidade | Modelo equilibrado multimodal se houver prints; senão reasoning médio |
| Design system | Tokens, componentes, consistência, acessibilidade | Precisão em especificação e CSS | Modelo forte em código front + design (ex.: Sonnet/GPT codex-class) |
| Refatoração grande | Mudanças seguras, diff mínimo, preservação de comportamento | Excelente em leitura de codebase | Modelo com janela grande + modo agente no repo |
| Modelagem SQL | Integridade, índices, migrações, consistência transacional | Rigor formal + experiência em OLTP | Reasoning + revisão humana obrigatória para FINANCEIRO |
| Debugging | Hipóteses, reprodução, causas raiz | Bom em correlacionar logs e stack traces | Modelo rápido iterativo + ferramentas de runtime |
| Geração de componentes | JSX/TS, Tailwind, testes, Storybook opcional | Alta velocidade e estilo consistente | Modelo codificação rápida no mesmo estilo do repo |
| Revisão de código | Segurança, edge cases, conformidade com docs | Crítico e conservador | Modelo separado do autor (“reviewer”) + checklist em `docs/modelagem/security/` |

## Regras de ouro para dados financeiros

1. **Nunca** tratar sugestão de IA como verdade de saldo: sempre reconciliar com fonte canônica (banco/extrato).
2. Para mudanças em SQL ou regras de liquidação: **dois pares de olhos** (humano + IA reviewer).
3. Manter `docs/stack-padrao.md` e `docs/modelagem/database/` alinhados ao que está em produção.

## Automação responsável

- Tarefas repetitivas de código (boilerplate, testes) → modelo rápido + lint.
- Decisões de produto ou contratos públicos → modelo reasoning + registro em `docs/modelagem/product/` ou ADRs futuros.
