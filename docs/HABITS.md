# Frequência e histórico de hábitos

O formulário oferece **Todo dia** (`daily`) e **Definir** (`custom`). Em Definir,
o usuário seleciona um ou mais dias da semana. O contrato existente usa
`daysOfWeek: [1, 3, 5]`, por exemplo, para segunda, quarta e sexta. A API valida
os valores de 1 a 7 e rejeita frequência personalizada sem dias. Hábitos legados
`weekdays` abrem para edição como Definir, com segunda a sexta selecionadas.

`POST /habits` e `PUT /habits/{id}` mantêm os campos existentes. As respostas e
`GET /habits/board` passam a incluir `history`, com `{ date, completed }` para os
até **30 dias previstos mais recentes**, em ordem cronológica. O backend usa a
mesma regra de frequência das métricas e da execução no planner, respeitando a
criação do hábito e a data `asOfDate`. Dias de descanso, futuros ou anteriores à
criação não geram quadradinhos. Um hábito novo pode começar com histórico vazio.

A grade tem no máximo 30 quadradinhos, inclusive com o cartão expandido: cinza
para não concluídos, verde para concluídos. Os tooltips mostram a data e o estado,
por exemplo `Hoje (27 set) · Concluído`. “Hoje” usa a data do servidor; a formatação
de datas civis não muda com o fuso do navegador. Mouse, foco por teclado e toque
prolongado são atendidos pelo tooltip do Angular Material.

As métricas continuam exclusivamente no backend. A consistência mantém sua janela
de 30 dias civis, considerando apenas os dias previstos. A grade pode abranger um
período maior para frequências personalizadas. A frequência atual rege o histórico;
esta versão não armazena versões anteriores das configurações de frequência.

Publicar frontend e backend juntos para disponibilizar o campo `history`. Não há
migration nova. Falhas ao salvar mantêm o formulário e suas escolhas para nova tentativa.
