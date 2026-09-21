# AgendaFrontend

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

## AutenticaÃ§Ã£o

Login e cadastro estÃ£o conectados Ã  API. Consulte [AUTHENTICATION.md](AUTHENTICATION.md) para configuraÃ§Ã£o, seguranÃ§a e testes. A sessÃ£o fica em memÃ³ria; recarregar a pÃ¡gina exige novo login.

## Contexto de desenvolvimento

Consulte [AGENTS.md](AGENTS.md) antes de alterar o projeto. O documento define o backend como responsÃ¡vel pelas regras de negÃ³cio e pelos cÃ¡lculos oficiais, a divisÃ£o de responsabilidades e os padrÃµes de cÃ³digo compartilhados com o repositÃ³rio api-workspace.

## Regras de negócio

Consulte [BUSINESS_RULES.md](BUSINESS_RULES.md) para os contratos migrados e a pendência de recuperação das migrations V1/V2 antes da implantação.
