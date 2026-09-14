# Agenda

`schedule.ts` compõe o cabeçalho e alterna entre as abas de planejamento e tarefas.

```text
schedule/
├── components/
│   ├── schedule-header/                 # Data, diário/semanal e ação principal
│   ├── planner/
│   │   ├── planning.*                   # Composição e coordenação do planner
│   │   ├── views/                       # Visualizações diária, semanal e circular
│   │   ├── events/                      # Cartão, formulário e agrupamento de sobreposições
│   │   ├── sidebar/                     # Painel lateral e seus cartões
│   │   ├── planner-task-tray/           # Bandeja, seleção de horário e estado de salvamento
│   │   └── planner-unscheduled-tasks/   # Lista de chips arrastáveis usada pela bandeja
│   └── tasks/
│       ├── tasks.*                      # Lista e detalhes de tarefas
│       └── task-form/                   # Formulário de criação de tarefa
├── models/                              # Tipos e contratos (*.model.ts)
├── constants/                           # Slots e definições dos períodos
├── utils/                               # Funções puras de datas, horários e indicadores
├── tests/utils/                         # Testes das funções puras
└── services/                            # Tarefas e endpoints; planner em planner-services/
```

- Mantenha `.ts`, `.html`, `.css` e testes do componente juntos.
- Coloque componentes específicos do planner no grupo correspondente; o cabeçalho pertence à agenda porque atende às duas abas.
- Use `sidebar/daily-summary` para o resumo do dia. O antigo `planner-summary-card`, duplicado e sem consumidores, foi removido.
- Centralize os serviços da agenda em `services/`; componentes não devem conter pastas de acesso a dados. `tasks.service.ts` também é consumido pelo calendário.
- `planning.ts` compõe a tela e mantém o estado visual de seleção, mensagens e formulários.
- `utils/planner-summary.utils.ts` contém cálculos puros dos indicadores e interseções de intervalos.
- `services/planner-services/planner-scheduling.service.ts` coordena validação, gravação e resultados explícitos. `planner.service.ts` acessa a API e atualiza os sinais somente após a confirmação das escritas.

## Fluxo de agendamento

`PlannerTaskTray` emite a intenção de agendar; `Planning` a encaminha para `PlannerSchedulingService`. O serviço cria o compromisso e só depois solicita a retirada da tarefa da bandeja. Falhas de gravação não são mais convertidas em sucesso local. O formulário mantém o rascunho, e as ações de gravação ficam bloqueadas durante a operação.

Se a criação funcionar e a retirada falhar, a interface oferece **Concluir agendamento**. Durante a sessão, a nova tentativa repete apenas a retirada, preservando o compromisso já criado. São duas requisições nos endpoints existentes: uma transação atômica e recuperação após recarregar a página dependem de suporte no backend, que não faz parte deste repositório.

## Modelos, imports e testes

`models/` contém somente tipos, interfaces e enums, separados por domínio: planner, tarefas, rotinas, visualização, layout e resultado de agendamento. Seu `index.ts` expõe esses contratos. Funções executáveis ficam em `utils/`, e valores fixos em `constants/`.

Use `@pages/schedule/models`, `@pages/schedule/utils` e `@pages/schedule/constants` nos consumidores. Para serviços distantes, use o alias com o caminho do arquivo; para arquivos vizinhos, prefira imports relativos curtos. Marque imports exclusivos de tipos com `import type`.

Testes junto ao código são uma prática válida. Nesta organização, os testes de utilitários ficam em `tests/utils/`, fora de `models/`; testes de componentes e serviços continuam junto às implementações. A pasta `models/` não concentra lógica que precisaria desses testes.
