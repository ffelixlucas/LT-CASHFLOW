# 🧠 LT CashFlow — Guia de Observabilidade e Infraestrutura

Versão: 3.0  
Atualizado: Novembro/2025  
Autor: Lucas Fanha Felix

---

## 🔹 Visão Geral

O **LT CashFlow** utiliza uma arquitetura orientada a logs e contexto global para garantir rastreabilidade total de todas as ações do sistema.

Este documento define as **ferramentas, boas práticas e utilitários obrigatórios** para manter observabilidade, monitoramento e auditoria consistentes em todos os módulos do backend.

---

## ⚙️ Ferramentas Principais

| Categoria | Ferramenta | Função / Motivo |
|------------|-------------|----------------|
| **Ambiente** | **dotenv** | Gerencia variáveis de ambiente (.env) e mantém credenciais fora do código. |
| **Servidor** | **express** | Framework HTTP principal — modular, rápido e estável. |
| **Segurança e CORS** | **cors** | Controla acesso entre domínios e evita bloqueios de origem cruzada. |
| **Banco de Dados** | **mysql2/promise** | Cliente MySQL com suporte nativo a Promises e conexão por pool. |
| **Logs e Auditoria** | **winston** | Logger principal com níveis personalizados: `error`, `warn`, `info`, `echo`, `debug`. |
| **Requisições HTTP** | **morgan** | Middleware para logar cada requisição HTTP, integrado ao Winston (`logger.debug`). |
| **Identificação de Requisições** | **uuid** | Gera um `requestId` único por requisição, rastreando logs ponta a ponta. |
| **Contexto Global** | **AsyncLocalStorage (nativo do Node)** | Armazena o `requestId` e outros metadados de requisição, acessíveis em qualquer módulo. |
| **Monitoramento** | **express-status-monitor** | Painel leve com CPU, memória, uptime e volume de requisições. |
| **Observabilidade Global** | **process.on(...)** | Captura exceções (`uncaughtException`) e rejeições de Promise (`unhandledRejection`). |

---

## 🧱 Estrutura de Pastas

```
backend/
│
├── config/
│   └── db.js               # conexão MySQL (pool + initDB)
│
├── modules/
│   ├── auth/               # primeiro módulo funcional (login/registro)
│   ├── gestoes/            # módulo de gestões financeiras
│   └── ...                 # novos módulos seguem o mesmo padrão
│
├── utils/
│   ├── logger.js           # logger global Winston
│   ├── logContext.js       # controle de contexto (requestId global)
│   └── ...                 # outros utilitários (dateFormatter, jwtHelper, etc.)
│
├── server.js               # inicialização principal do backend
├── .env                    # variáveis de ambiente
└── package.json
```

---

## 🧩 Boas Práticas de Desenvolvimento

1. **Usar sempre o `logger` em vez de `console.log`.**

   | Método | Finalidade |
   |---------|-------------|
   | `logger.debug()` | Logs técnicos e detalhados (queries, payloads, etc.). |
   | `logger.info()` | Operações normais (usuário criado, login, etc.). |
   | `logger.warn()` | Situações inesperadas, mas não críticas. |
   | `logger.error()` | Falhas ou exceções tratadas. |
   | `logger.echo()` | Mensagens limpas e visíveis em produção. |

2. **Cada log carrega automaticamente o `requestId`** (por meio do `AsyncLocalStorage`).

3. **Cada camada deve logar seu escopo mínimo:**
   - `Controller` → entrada da rota + parâmetros.
   - `Service` → regras de negócio executadas.
   - `Repository` → consultas SQL e resultados.

4. **O servidor nunca sobe sem conexão de banco ativa.**  
   - O `server.js` aguarda `await initDB()` antes do `app.listen()`.

5. **Monitoramento técnico ativo:**
   - `http://localhost:4000/status` → painel técnico (CPU, memória, uptime).
   - `http://localhost:4000/api/status` → endpoint de saúde (para automações e balanceadores).

6. **Nenhuma falha silenciosa:**
   - Todas as exceções e promessas rejeitadas são capturadas globalmente e registradas nos logs.

---

## 🧰 Utilitários do Sistema

| Arquivo | Descrição |
|----------|------------|
| **`logger.js`** | Logger Winston com níveis customizados e integração automática com o contexto de requisição. |
| **`logContext.js`** | Implementa `AsyncLocalStorage` para armazenar `requestId` e acessar globalmente. |
| **`db.js`** | Cria e exporta o pool de conexões MySQL, com teste de conexão inicial e logs detalhados. |
| **`server.js`** | Inicializa logger, middlewares, banco, rotas e captura global de erros. |

---

## 🔄 Fluxo de Inicialização

1. Carrega `.env`
2. Inicializa logger
3. Cria instância do Express
4. Configura middlewares (`cors`, `status-monitor`, `uuid`, `morgan`)
5. Inicializa conexão com banco (`await initDB()`)
6. Sobe o servidor
7. Exibe logs:

```
✅ Conexão com o banco de dados estabelecida com sucesso!
🚀 Servidor LT CashFlow iniciado na porta 4000
✅ Servidor LT CashFlow está online!
```

---

## 🧩 Painel e Monitoramento

- **Painel técnico:** [http://localhost:4000/status](http://localhost:4000/status)  
  Exibe CPU, memória, uptime e quantidade de requisições em tempo real.

- **Endpoint de saúde:** [http://localhost:4000/api/status](http://localhost:4000/api/status)  
  Resposta JSON padrão:

  ```json
  {
    "status": "ok",
    "message": "LT CashFlow API rodando com sucesso!"
  }
  ```

---

## 🧩 Regras de Log de Auditoria

- Cada ação relevante (create, update, delete, login, convite, etc.) deve ser registrada na **tabela `auditoria`**.
- Campos obrigatórios:
  ```
  usuario_id
  gestao_id
  acao
  modulo
  detalhes (JSON)
  origem
  criado_em
  ```
- Toda operação deve usar `logger.info()` e também inserir registro em `auditoria`.

---

## ✅ Conclusão

Com este pacote, o LT CashFlow possui:
- Logs estruturados com contexto global,
- Rastreabilidade por `requestId`,
- Monitoramento técnico embutido,
- Auditoria transacional por módulo,
- Erros e promessas sempre capturados.

**Resultado:** uma base estável, segura e profissional para todos os módulos futuros (Auth, Gestões, Lançamentos, Auditoria, etc.).

---

