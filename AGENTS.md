# Guia de desenvolvimento

## Produto e princípio

`plannerFyFront` é o frontend Angular da aplicação de produtividade; o backend
`api-workspace` usa Java 21, Spring Boot, JPA, PostgreSQL e Flyway.

**O backend é a fonte de verdade.** Ele autentica, autoriza, valida propriedade,
persiste dados e calcula regras de produto (progresso, métricas, recorrência,
disponibilidade, conflitos, limites e datas oficiais). O frontend captura intenções,
mostra respostas e calcula somente apresentação ou feedback imediato não autoritativo.

Não aceite `userId`, papéis, totais ou timestamps enviados pelo navegador como
autoridade. Uma regra antecipada na interface deve ser validada e confirmada pelo
servidor.

## Contratos e segurança

- Antes de integrar, confira controller, DTO e consumidor; não invente endpoints.
- Preserve campos, enums, nulabilidade e rotas publicadas. Para contratos novos,
  use JSON `camelCase`, datas civis `YYYY-MM-DD` e timestamps UTC/com offset.
- Separe DTO HTTP de modelo visual quando necessário, sem esconder regra de negócio
  no mapper. Trate 401, 403, 404, validação e conflito de forma distinta.
- Recursos privados sempre são filtrados e autorizados pelo backend. A visibilidade
  de um botão ou guard Angular não concede permissão.
- Tokens, senhas e segredos não vão para logs, URLs ou armazenamento persistente.
  Preserve o fluxo de token em memória definido em [docs/AUTHENTICATION.md](docs/AUTHENTICATION.md).
- Uma falha de escrita nunca vira sucesso local. Cache privado é limpo ao sair ou
  trocar de conta; lista vazia é um resultado válido, não motivo para dados fictícios.

## Organização

- Backend: `controller` adapta HTTP; `service` concentra casos de uso e transações;
  `repository` persiste/consulta; `domain` ou `entity` modela o domínio; `dto` define
  contratos. Schema muda somente por nova migration Flyway.
- Frontend: `pages/` contém funcionalidades, `core/` autenticação/configuração/HTTP e
  `shared/` apenas itens realmente reutilizáveis. Componentes standalone coordenam a
  interface; services de API não duplicam o domínio.
- Em Angular, use signals/computed para estado visual e RxJS para HTTP. Novos arquivos
  usam `kebab-case`, services `.service.ts`, modelos `.model.ts`, TypeScript estrito e
  `import type` quando aplicável.
- Preserve design tokens, acessibilidade por teclado e estados de carregamento, vazio,
  erro e sucesso. Não faça refatorações amplas fora do pedido.

## Preferências por usuário

Configurações de interface escolhidas pelo usuário pertencem à conta e acompanham o
usuário em qualquer dispositivo. A API guarda um documento JSON por conta
(`GET`/`PATCH /users/me/preferences`) sem interpretar as chaves; o frontend define quais
preferências existem, seus valores aceitos e padrões, e usa o `localStorage` só como cache.

**Em toda atualização, verifique se ela cria ou altera uma configuração do usuário; se
sim, registre-a como preferência por usuário.** Para uma preferência visual basta
`PreferenceStore.define()` no serviço do frontend que é dono do estado, com chave
`camelCase` estável, padrão e validação, além de testes e uma linha na tabela de
`docs/USER_PREFERENCES.md` — sem migration nem mudança no backend. Se o valor passar a
influenciar regras ou cálculos do servidor (disponibilidade, datas, limites), ele deixa
de ser preferência visual: crie um campo próprio validado no backend. Rascunhos, abas
abertas e outros estados temporários de tela não são preferências.

## Fluxo e validação

1. Defina caso de uso, usuário, contrato e resultados (sucesso e erro).
2. Ajuste backend e contrato antes do consumidor quando a regra for de negócio.
3. Integre a interface e trate falhas sem simular dados oficiais.
4. Teste o escopo afetado: `npm test`, `npm run lint` e/ou
   `npm run build`; no backend, `./mvnw.cmd test`.

Mudanças apenas de documentação exigem revisão de conteúdo, links e diff. Preserve
trabalho local alheio. Consulte [BUSINESS_RULES.md](BUSINESS_RULES.md) para contratos
e limitações da migração; antes de implantar, recupere as migrations Flyway V1/V2
originais — não invente migrations nem desative a validação.
