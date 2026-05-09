# Convenções de dados

## Identificadores

- Chaves primárias surrogate (`bigint`/`varchar` UUID conforme schema) estáveis no tempo.
- IDs externos (`origem_externa`) para reconciliação de importações.

## Nomes

- Tabelas no plural em PT quando já estabelecido no schema legado; novas tabelas avaliam consistência antes de misturar idiomas.
- Campos `*_data`, `*_em` para timestamps sempre em UTC no banco; conversão no edge/UI.

## Migrações

- Todas reversíveis quando possível; dados financeiros exigem script de backfill documentado.
- Nunca alterar significado de coluna sem migração de dados + atualização desta pasta.

## Validação

- Todo boundary HTTP/action validado com zod compartilhado (`packages/validation`).
