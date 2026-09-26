# PlannerFy Frontend

Leia [AGENTS.md](AGENTS.md) antes de alterar o projeto: ele contém as regras
compartilhadas de arquitetura, contratos e segurança.

## Referência rápida

- Stack: Angular standalone, TypeScript strict, RxJS, signals, Angular Material/CDK e
  Tailwind CSS 4.
- Estrutura: `pages/` para funcionalidades, `core/` para infraestrutura e
  autenticação, `shared/` para itens reutilizáveis. A autenticação é organizada em
  `models/`, `data-access/`, `session/`, `routing/`, `http/` e `testing/`.
- API: valide controllers e DTOs do backend antes de consumir. Não replique regras de
  negócio no navegador nem transforme falhas de API em sucesso local.
- Sessão: token somente em memória, enviado apenas à API configurada. Consulte
  [AUTHENTICATION.md](AUTHENTICATION.md).
- Agenda: consulte o [mapa da funcionalidade](src/app/pages/schedule/README.md) quando
  trabalhar nela.

## Comandos

```text
npm start
npm run build
npm run lint
npm test
```

Não há suíte e2e configurada. Para documentação, revise links e o diff sem iniciar
serviços.
