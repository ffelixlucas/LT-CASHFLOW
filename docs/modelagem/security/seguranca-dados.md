# Segurança de dados

## Superfícies

- Transporte TLS obrigatório.
- Cookies/session hardened conforme Auth.js.
- Secrets apenas em env gerenciado (`docs/modelagem/ops/ambientes-e-segredos.md`).

## Dados sensíveis

- Informações financeiras tratadas como **altamente sensíveis**.
- Logs não devem gravar valores completos de extratos sem máscara em ambientes não produtivos.

## Ameaças prioritárias

1. IDOR entre gestões — mitigar com checagem de membership em toda query.
2. SQL injection — queries parametrizadas / ORM.
3. XSS — sanitização e CSP progressiva no Next.

## Conformidade

Práticas alinhadas a boas práticas LGPD/GDPR-minded; mapa de dados detalhado em evolução.
