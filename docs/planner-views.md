# Visualizações do planner

Em Configurações → Visualização → Planner, escolha Compacta (padrão), Por período ou Circular. A preferência diária é salva localmente em `plannerfy-planner-display`; a visão semanal continua disponível e também cobre as 24 horas.

- **Compacta:** mantém os 24 destinos de agendamento, reduzindo os horários livres para 32 px no desktop e pelo menos 44 px no mobile. Um toque expande o horário; horários ocupados crescem com seu conteúdo. Arrastar continua funcionando nos horários recolhidos.
- **Por período:** madrugada 00:00–07:00, manhã 07:00–13:00, tarde 13:00–19:00, noite 19:00–24:00 (fim exclusivo). Isso inclui todos os blocos citados nos rótulos 00–06h, 07–12h, 13–18h e 19–24h. O período inicial segue a hora local; atualiza ao atravessar um limite e ao voltar à janela. A escolha manual permanece até a próxima mudança de período, data ou visualização.
- **Circular:** 00h no topo, 06h à direita, 12h abaixo e 18h à esquerda. O círculo é quadrado, limitado a 340 px, à largura do conteúdo e à largura da tela menos 40 px. Cada fatia tem pelo menos 8 graus visuais, sem alterar os horários. Interseções reais aparecem em um grupo com contador; tocar abre os detalhes em um painel inferior. A área de toque do arco tem 28 px. As setas e o gesto horizontal mudam a data.

A bandeja fica fixa embaixo até 1024 px, com rolagem horizontal dos chips. Segurar por 250 ms ativa o arraste por toque. No círculo, a prévia encaixa na hora mais próxima; o centro e solturas fora do alvo não agendam. A vibração é opcional, quando suportada pelo navegador. Selecionar um evento sem data também oferece os 24 horários em um seletor, sem depender de arraste, hover ou gestos; horários ocupados aparecem desabilitados e o primeiro horário livre vem sugerido.

## Dados e backend

A escolha de layout, relógio local, períodos, ângulos e áreas de toque são apresentação e não precisam de novas regras no backend. Não há código do backend neste projeto. O planner usa somente `planner/events` e `planner/summary`; a antiga funcionalidade de tarefas foi removida.

O contrato dos horários permanece `HH:mm`: início de `00:00` a `23:59`, término posterior até `24:00` (fim do dia selecionado). O formulário preserva os minutos de eventos curtos. Um evento sem data agendado pela bandeja recebe um bloco de uma hora, incluindo `23:00–24:00`, gravado com `PUT planner/events/{id}`. O término é enviado de propósito: o backend só verifica conflitos de eventos que têm término. O término é opcional no formulário; um evento só com início é exibido como pontual e ocupa apenas o minuto inicial na linha do tempo. Integração com o backend e aparelhos reais não foi validada nesta sessão.

## Verificação manual

1. Alternar as três visualizações em configurações; recarregar e verificar a preferência. No desktop, conferir as prévias por hover e foco; no mobile, usar os controles sem hover.
2. Conferir campos, relógio, bandeja e painel de detalhes nos temas claro, escuro e alto contraste.
3. Arrastar eventos sem data para 00h, horários livres recolhidos e 23h; tentar um horário ocupado e cancelar um arraste fora do destino. Repetir com toque longo e com o seletor de horário.
4. Conferir a troca automática nos limites 07h, 13h, 19h e 00h, inclusive ao retornar à aba, e a navegação manual entre períodos e dias.
5. Mostrar um evento de 15 minutos e eventos sobrepostos; abrir e fechar o painel por toque, teclado e Escape. Confirmar que os horários precisos não mudam ao editar outros campos.
6. Conferir o círculo e a bandeja em larguras de 320, 390, 768 e 1024 px. O círculo nunca cresce com a quantidade de eventos; em telas baixas, o restante da página pode exigir rolagem.
