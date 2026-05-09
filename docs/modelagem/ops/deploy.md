# Deploy

## Alvo oficial

Conforme [`../stack-padrao.md`](../../stack-padrao.md): tipicamente **Vercel** para app + MySQL gerenciado + R2 + Resend.

## Ambientes

- dev local,
- staging espelhando schema,
- produção.

## Práticas

- Feature flags para áreas sensíveis (importação, IA).
- Smoke tests pós-deploy automatizados leves.

## Documentação legada/complementar

[`../deploy-railway.md`](../../deploy-railway.md) permanece como referência de alternativa/hosting.
