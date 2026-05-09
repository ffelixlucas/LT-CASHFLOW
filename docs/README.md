# Documentação LTCashFlow

Hub do repositório de documentação. A base **produto + arquitetura + dados + UX + operações** (modelagem antes das telas) está **centralizada** em **[`modelagem/`](./modelagem/README.md)**.

- **Resumo único para ChatGPT:** [`COMPACTO-CHATGPT.md`](./COMPACTO-CHATGPT.md)
- **Pacote completo para IA orquestrar o projeto (poucos arquivos grandes):** [`ORQUESTRADOR-00-INDICE.md`](./ORQUESTRADOR-00-INDICE.md) → `ORQUESTRADOR-VOL1` … `VOL6`

## Como ler

1. **Congelamento técnico:** [`stack-padrao.md`](./stack-padrao.md)
2. **Roadmap macro:** [`produto-roadmap.md`](./produto-roadmap.md)
3. **Modelagem estrutural (pacote único):** [`modelagem/README.md`](./modelagem/README.md) → dentro dela: `product/`, `ux/`, `architecture/`, `database/`, `flows/`, `ai/`, `security/`, `observability/`, `ops/`, `roadmap/`, `codebase/`, `meta/`
4. **IA operacional (copiloto):** [`assistente-ia.md`](./assistente-ia.md), [`catalogo-comandos-ia.md`](./catalogo-comandos-ia.md)
5. **Handoff / cloud:** [`briefing-modelagem-cloud.md`](./briefing-modelagem-cloud.md)
6. **Deploy (referência):** [`deploy-railway.md`](./deploy-railway.md)
7. **Artefatos de exemplo:** [`extratos/`](./extratos/)

## Árvore de alto nível

```
docs/
├── README.md                    ← você está aqui
├── COMPACTO-CHATGPT.md          ← resumo 1 arquivo
├── ORQUESTRADOR-00-INDICE.md    ← índice do pacote ChatGPT “completo”
├── ORQUESTRADOR-VOL1-PRODUTO-UX.md … VOL6 …  ← cópias concatenadas para upload
├── stack-padrao.md
├── produto-roadmap.md
├── assistente-ia.md
├── catalogo-comandos-ia.md
├── briefing-modelagem-cloud.md
├── deploy-railway.md
├── extratos/
└── modelagem/                   ← TUDO da base estrutural (centralizado)
    ├── README.md
    ├── product/
    ├── ux/
    ├── architecture/
    ├── database/
    ├── flows/
    ├── ai/
    ├── security/
    ├── observability/
    ├── ops/
    ├── roadmap/
    ├── codebase/
    └── meta/
```

## Princípio operacional

Documentação primeiro define **modelo mental, contratos e decisões**. Telas nascem como consequência de clareza de domínio, não o contrário.

## Manutenção

- Stack: atualizar `stack-padrao.md`.
- Domínio financeiro e fluxos: atualizar `modelagem/database/` e `modelagem/flows/` junto com o código quando possível.
- UX sensível a ansiedade: referência principal em `modelagem/ux/filosofia-ux-ltcashflow.md`.
- Após mudanças grandes na modelagem, regenere o pacote ChatGPT: `cd docs && bash regenerate-orquestrador.sh`.
