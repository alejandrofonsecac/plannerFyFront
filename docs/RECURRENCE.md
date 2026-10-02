# Repetição de eventos

A criação de eventos no Planner e no Calendário oferece **Não repetir**, **Todo dia**,
**Toda semana**, **Todo mês** e **Todo ano**. Para repetir, escolha a primeira data
e a data final (inclusiva). O atalho **Até o fim do ano** usa o ano da primeira
ocorrência. É possível escolher uma data final em outro ano.

O backend cria e persiste as ocorrências em uma única transação. Cada uma recebe
um ID e uma conclusão independente: concluir esta semana não conclui a próxima.
As ocorrências recorrentes conservam a proteção contra a limpeza após sete dias.
Editar, concluir, reabrir ou excluir afeta somente a ocorrência selecionada.
Esta versão não oferece edição ou exclusão de uma série inteira.

## Contrato reutilizado

- Eventos: `POST /events` ou `/planner/events`; `PUT` na mesma rota com o ID.
- Campos: `isRecurring: true` e `recurrenceRule: "FREQ=WEEKLY;UNTIL=20301231"`.
- Frequências aceitas: `DAILY`, `WEEKLY`, `MONTHLY`, `YEARLY`.
- `date` continua sendo uma data civil `YYYY-MM-DD`; a repetição exige uma primeira
  data, portanto eventos sem data não se repetem. O `UNTIL` usa `YYYYMMDD` dentro da regra, sem conversão de fuso.
- A resposta de criação mantém o contrato anterior: retorna a primeira ocorrência.
  O frontend recarrega a listagem para obter as demais ocorrências oficiais.
- Não repetir envia `isRecurring: false` e `recurrenceRule: ""`.
- `completedAt` permanece exclusivamente definido pelo servidor.

## Datas, consultas e limites

O servidor aceita até 1.000 ocorrências e até dez anos entre a primeira data e o
fim. Recorrências mensais/anuais mantêm a data original e pulam datas inexistentes:
dia 31 não vira dia 28; 29 de fevereiro reaparece no próximo ano bissexto.

O planner e o calendário recebem todas as ocorrências persistidas, inclusive as
concluídas.

Eventos validam conflitos em **todas** as datas antes da gravação. Conflito em
qualquer data rejeita a operação inteira (`409`). Datas/regras/limites inválidos
retornam `400`; sessão, permissão e recurso inexistente conservam `401/403/404`.
Uma falha de escrita mantém o rascunho e não cria sucesso local.

## Compatibilidade e implantação

Reutiliza os campos de retenção da migration V5 da branch `clear-data` do backend,
sem alterar migrations. Regras legadas sem `UNTIL` continuam sendo metadados de
proteção: não são expandidas retroativamente. A geração é feita na criação com
data final explícita; atualizar uma ocorrência não gera outra série.

Frontend e backend devem ser disponibilizados juntos: a versão anterior do
backend armazena a regra, mas não gera as ocorrências. Continua válida a pendência
de recuperar as migrations Flyway V1/V2 originais antes de implantar no banco real.
