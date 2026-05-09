# `versioning/` — snapshots leves antes de sobrescrever

Implementa o `preWriteHook` que copia o estado atual para `docs/.versions/<isoTs>-<basename>` antes da nova escrita.

## Componentes

- `versioning.hook.ts` — `createVersioningHook({ versionsDir })`.

## Garantias

- **Não bloqueia** o save em caso de falha (warn + segue).
- **Não cria** versão quando o arquivo ainda não existia (primeiro save).
- Mantém **flat** com prefixo ISO timestamp para ordenação trivial.

## Limites e evolução

- O snapshot é por arquivo. Não é um diff. Para `git-like` semântico, plugar `simple-git` ou armazenar deltas — não previsto agora.
- Pode crescer. **`docs/.versions/`** é forte candidato a `.gitignore`.
- Política de retenção: hoje **infinita**. Próximo passo razoável é uma rotação por idade/quantidade dentro do próprio hook.
