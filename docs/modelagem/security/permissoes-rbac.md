# Permissões (RBAC)

## Papéis base

| Papel | Leitura | Escrita | Config gestão |
|-------|---------|---------|---------------|
| Owner | ampla | ampla | sim |
| Editor | ampla | conforme política | limitada |
| Viewer | conforme política | não | não |

## Escopo por recurso

- Contas podem ser ocultadas para certos membros no futuro (privacy mode).
- Auditoria registra mutações sensíveis.

## Implementação

Middleware/guards centralizados; nunca confiar apenas em ocultar botões na UI.

## Roadmap

Políticas compostas (“ver totais sem ver extrato linha a linha”).
