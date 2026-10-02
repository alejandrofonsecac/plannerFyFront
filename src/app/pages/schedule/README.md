# Agenda

`schedule.ts` compõe o cabeçalho e o planner, compartilhando a data selecionada e o
modo diário/semanal. A agenda trabalha apenas com **eventos**; a antiga
funcionalidade de tarefas foi removida.

```text
schedule/
├── schedule.*                    # Página: cabeçalho + planner
├── components/
│   ├── schedule-header/          # Data, diário/semanal e "Novo evento"
│   ├── planning/                 # Coordena o planner: seleção, mensagens e formulário
│   ├── views/                    # Visualizações diária, semanal e circular
│   ├── events/                   # Cartão, formulário, lista simples e sobreposições
│   ├── event-tray/               # Bandeja de eventos sem data e seus chips arrastáveis
│   └── sidebar/                  # Painel lateral e seus cartões
├── models/                       # Tipos e contratos (*.model.ts)
├── constants/                    # Slots, períodos, rótulos e medidas da linha do tempo
├── pipes/                        # Formatação para templates (horário do evento)
├── services/                     # Acesso à API e coordenação das gravações
└── utils/                        # Funções puras, com testes ao lado (*.spec.ts)
```

## Responsabilidades

- `services/planner.service.ts` acessa `planner/events` e `planner/summary` e atualiza
  os sinais somente após a confirmação de cada escrita.
- `services/planner-scheduling.service.ts` serializa as gravações (`busy`) e traduz
  respostas da API em resultados explícitos (`occupied`, `invalid`, `missing-event`,
  `unauthorized`, `forbidden`, `failed`). Falhas nunca viram sucesso local.
- `services/habit-execution.service.ts` carrega e alterna os hábitos do dia.
- `components/planning/` mantém apenas estado visual; regras de produto (conflitos,
  disponibilidade, resumo do dia, recorrência) vêm do backend.

## Eventos sem data, sem horário e pontuais

Um evento pode não ter `date` (sem data), não ter `startTime` (sem horário) ou não
ter `endTime` (pontual).

- **Sem data:** aparece na bandeja (visão diária) ou na lista "Eventos sem data"
  (visão semanal). Agendar pela bandeja envia um `PUT planner/events/{id}` com a data,
  o início escolhido e um bloco de uma hora (`slotEndTime`). O término é necessário
  porque o backend só verifica conflitos de eventos que têm término.
- **Sem horário:** aparece na lista "Sem horário neste dia" do dia selecionado.
- **Pontual:** ocupa apenas o minuto inicial na linha do tempo (`eventEndMinutes`), para
  colidir com eventos que começam no mesmo minuto sem inventar duração.

A bandeja usa a disponibilidade calculada pelo backend: horários ocupados ficam
desabilitados e o primeiro horário livre é sugerido. A validação final continua
sendo da API (`409` para conflito).

## Utilitários

| Arquivo                 | Conteúdo                                                      |
| ----------------------- | ------------------------------------------------------------- |
| `date.utils.ts`         | Datas civis locais: `dateKey`, `parseLocalDate`, semanas      |
| `time.utils.ts`         | Minutos, validação de intervalo, término efetivo e formatação |
| `event-layout.utils.ts` | Interseções, colunas e grupos de eventos sobrepostos          |
| `day-layout.utils.ts`   | Segmentos e geometria da visão diária                         |
| `radial.utils.ts`       | Projeção das 24 horas no círculo                              |

## Convenções

- Mantenha `.ts`, `.html`, `.css` e `.spec.ts` de cada componente, serviço ou
  utilitário juntos.
- Use `@pages/schedule/models`, `@pages/schedule/utils` e `@pages/schedule/constants`
  nos consumidores. Entre componentes vizinhos, prefira imports relativos curtos.
  Marque imports exclusivos de tipos com `import type`.
- `models/` contém somente tipos; funções ficam em `utils/` e valores fixos em
  `constants/`.
- Exiba horários com o pipe `eventTime`, que trata intervalos, eventos pontuais e
  eventos sem horário.
- `utils/` também é consumido por `calendar` e `home` (`startOfDay`, `addDays`,
  `startOfWeek`, `dateKey`, `parseLocalDate`, `isPlannerInterval`); preserve essas assinaturas.
