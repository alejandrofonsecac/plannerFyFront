# PlannerFy Frontend

Frontend Angular da aplicação de produtividade PlannerFy. O backend `api-workspace`
é responsável por autenticação, persistência e regras de negócio.

## Desenvolvimento

Inicie o backend localmente conforme o
[guia de desenvolvimento](docs/HTTPS_SETUP.md). Depois:

```powershell
npm ci
npm start
```

Abra **http://localhost:4200**. As chamadas `/api` passam pelo proxy em
[`config/proxy/`](config/proxy/). Certificados e chaves locais são ignorados pelo Git.

## Validação

```powershell
npm run test:proxy
npm test -- --watch=false
npm run lint
npm run build
```

O build de produção é gerado em `dist/`. O servidor Angular de desenvolvimento
não é um servidor de hospedagem para produção.

## Documentação

- [Índice de documentação](docs/README.md)
- [HTTPS e proxy](docs/HTTPS_SETUP.md)
- [Autenticação e ciclo da sessão](docs/AUTHENTICATION.md)
- [Guia de desenvolvimento](AGENTS.md)
