# AgendaFrontend

## Branch de produção e ChatGPT Sites

A branch `production` é dedicada à versão publicada para testar alterações em produção.
Prepare alterações em branches de desenvolvimento e integre nesta branch quando estiverem prontas para validação no ambiente publicado.

- Compile com `npm run build:production`; a saída pública fica em `dist/`.
- O projeto do ChatGPT Sites está vinculado em `.openai/hosting.json`.
- Publique sempre o código e o build do mesmo commit da branch `production`.
- Um push para `origin/production` não publica automaticamente no Sites; solicite a publicação de uma nova versão no ChatGPT Sites.
- O frontend depende de um backend separado. A URL da API e a permissão CORS para a origem do site precisam estar configuradas para testar operações com dados reais.
- Endereço do site: https://plannerfy-production.jfonsecacorrea08.chatgpt.site (acesso privado do proprietário).
- O build de produção usa `https://api-workspace-vmky.onrender.com`, configurado em `src/environments/environment.production.ts`. O desenvolvimento local usa `http://localhost:8080` em `src/environments/environment.ts`.
- O backend deve permitir CORS para `https://plannerfy-production.jfonsecacorrea08.chatgpt.site`, incluindo os métodos e cabeçalhos usados pela API. A conexão JDBC com o banco fica somente no backend.
- `work/planner-views-preview.html` é uma prévia isolada; a publicação usa a aplicação Angular completa.


This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.14.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
