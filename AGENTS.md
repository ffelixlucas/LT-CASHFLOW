# LT CashFlow - Agent Instructions

Antes de qualquer mudanca neste repositorio, leia obrigatoriamente:

1. `docs/stack-padrao.md`
2. `backend/docs/modelagem-dados.md`
3. `backend/docs/readme_observabilidade.md`
4. `docs/assistente-ia.md`
5. `docs/catalogo-comandos-ia.md`
6. `docs/produto-roadmap.md`

Regras nao negociaveis:

- stack oficial: `Next.js + TypeScript + Tailwind + shadcn/ui + MySQL + Drizzle + Auth.js`
- `Tailwind` e obrigatorio; `Bootstrap` e proibido no produto principal
- arquitetura oficial: monolito modular
- nao separar servicos sem necessidade operacional real
- SEO obrigatorio nas paginas publicas
- area logada nao e foco de indexacao
- modelagem oficial e baseada em `gestoes`
- logs e auditoria sao obrigatorios
- o assistente deve seguir `docs/assistente-ia.md`
- o assistente deve seguir `docs/catalogo-comandos-ia.md`
- o produto deve seguir `docs/produto-roadmap.md`

Se houver conflito entre codigo legado e a stack oficial, siga a stack oficial e documente a migracao.
