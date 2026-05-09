# Sistema familiar (multi-gestão)

## Conceito

Uma **gestão** é um espaço financeiro (ex.: pessoal, família Silva, projeto casa). Usuários participam de uma ou mais gestões com papéis distintos.

Quando a gestão é familiar, o modelo precisa mostrar dois níveis ao mesmo tempo:

- **família inteira** como unidade principal;
- **cada pessoa** como recorte individual dentro da mesma família.

## Objetivos

- Permitir **visibilidade compartilhada** sem perder **privacidade** onde aplicável.
- Manter **auditabilidade**: quem reconheceu, editou ou importou o quê.
- Acompanhar **semana** e **mês** no mesmo modelo mental.

## Modelo mental recomendado

- **Gestão ativa** escolhida explicitamente (evita “misturar contextos” na cabeça do usuário).
- Contas, categorias, metas e lançamentos são **escopo por gestão**.
- Relatórios sempre declaram a gestão e o período.
- O período padrão da família é **segunda a domingo**.
- A leitura principal da família é:
  - total da família na semana;
  - total da família no mês;
  - total individual de cada membro na semana;
  - total individual de cada membro no mês.

## Hierarquia familiar

Na interface, a família é apresentada em uma hierarquia simples:

| Nível | Papel prático |
|-------|---------------|
| **Pai / proprietário** | controla a gestão e define a estrutura |
| **Mãe / esposa / membro principal** | participa da leitura e do controle conjunto |
| **Outros membros** | aparecem com o próprio nome e papel configurado |

Observação: o rótulo exibido pode variar conforme a família. O sistema deve manter a base em **papéis**, não em suposições rígidas sobre parentesco.

## Papéis (conceituais — implementação em evolução)

| Papel | Esperado |
|-------|-----------|
| **Owner** | configura gestão, convida membros, define políticas |
| **Editor** | lança, concilia, edita categorias autorizadas |
| **Visualizador** | lê agregados e extratos permitidos |
| **Criança/dependente** (futuro) | escopo restrito, sem dados sensíveis adultos |

Detalhes de permissões: [`../security/permissoes-rbac.md`](../security/permissoes-rbac.md).

## UX para família

- Linguagem neutra em gastos compartilhados (“nossa casa”, não culpa individual por padrão).
- Indicar **contribuições** e **metas coletivas** como narrativa positiva.
- Evitar comparações implícitas entre membros.
- Separar claramente:
  - **total família**
  - **total por pessoa**
  - **semana**
  - **mês**

## Armadilhas conhecidas

- Dupla contagem entre cartão e conta corrente — documentar mentalmente em `docs/modelagem/database/cartao-vs-conta.md` e fluxos em `docs/modelagem/flows/`.
- Evitar esconder a hierarquia em um resumo genérico: família precisa ser lida de cima para baixo, não como uma lista solta.
