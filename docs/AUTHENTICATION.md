# Autenticação

O backend é a fonte de verdade da sessão. O contrato completo (cookie, rotação,
reuso, prazos e erros) está em `api-workspace/.docs/authentication/ACCESS_AND_REFRESH_TOKENS.md`.
Este documento descreve como o Angular o consome.

## Contrato consumido

| Endpoint | Autenticação | Uso no frontend |
| --- | --- | --- |
| `POST /users/login` | `{ email, password }` | Tela de login |
| `POST /users/register` | `{ name, email, password }` | Tela de cadastro |
| `POST /users/refresh` | Cookie `plannerfy_refresh`, corpo `{}` | Inicialização e renovação |
| `POST /users/logout` | Cookie `plannerfy_refresh`, corpo `{}` | Botão "Sair da conta" |
| `GET /users/me` e demais recursos | `Authorization: Bearer <accessToken>` | Chamadas privadas |

Todos os `POST` de sessão enviam `X-PlannerFy-Session: 1` e `withCredentials: true`.
Login, cadastro e refresh respondem `{ accessToken, tokenType, expiresIn, user }`.
`POST /users/logout-all` existe na API, mas ainda não há botão para ele.

O frontend usa `/api`, encaminhado pelo proxy, para manter frontend e API no mesmo
site: o cookie é `SameSite=Strict`, `HttpOnly` e host-only. JavaScript não lê esse cookie.

## Onde fica cada parte

| Arquivo | Responsabilidade |
| --- | --- |
| [`session-api.service.ts`](../src/app/core/auth/data-access/session-api.service.ts) | Chamadas HTTP de refresh e logout, cabeçalhos de sessão e timeout de 15 s |
| [`auth.service.ts`](../src/app/core/auth/data-access/auth.service.ts) | Login, cadastro e `/users/me` |
| [`auth-session.service.ts`](../src/app/core/auth/session/auth-session.service.ts) | Identidade e token em memória, renovação compartilhada, restauração e logout |
| [`auth.interceptor.ts`](../src/app/core/auth/http/auth.interceptor.ts) | Bearer apenas para a API configurada, renovação e repetição única após 401 |
| [`auth.guard.ts`](../src/app/core/auth/routing/auth.guard.ts) | Rotas privadas aguardam a renovação; visitantes autenticados saem do login |
| [`app.config.ts`](../src/app/app.config.ts) | `provideAppInitializer` restaura a sessão antes da primeira rota |

## Ciclo da sessão

1. **Abertura ou recarga da página:** o inicializador chama `/users/refresh`. Com cookie
   válido, a sessão volta sem novo login. Sem cookie, ou com 401, o visitante continua
   anônimo, sem redirecionamento em loop.
2. **Requisição com token válido:** o interceptor envia o Bearer imediatamente.
3. **Token vencido:** a identidade continua na tela. A próxima requisição, ou a próxima
   navegação para rota privada, renova antes de prosseguir. O token é tratado como
   vencido 30 segundos antes de `expiresIn` para não expirar durante o envio.
4. **401 em recurso privado:** uma única renovação é feita e a requisição original é
   repetida uma única vez. Requisições simultâneas compartilham o mesmo refresh.
   Se outra requisição já obteve um token mais novo da mesma conta, ele é reutilizado.
5. **Encerramento por expiração:** refresh com 401 ou nova 401 após a repetição limpa
   a memória e faz navegação completa para `/login?reason=expired`, descartando caches.
6. **Logout:** aguarda uma rotação pendente, chama `/users/logout` e só então limpa a
   memória e navega para `/login`. Se a chamada falhar, a sessão continua, o botão volta
   a ficar disponível e a interface mostra "Não foi possível sair. Tente novamente."

403, 5xx, timeout e falha de rede não encerram a sessão: a requisição falha e a próxima
tenta renovar novamente. Uma renovação que devolve outra conta encerra a sessão sem
repetir requisições da conta anterior.

## Várias abas

Refresh e logout rodam dentro de um Web Lock (`plannerfy-auth-session`), então abas da
mesma origem não rotacionam o mesmo cookie ao mesmo tempo. Cada aba mantém o próprio
access token em memória. Sem Web Locks, a concorrência é agrupada apenas dentro da aba;
duas abas renovando juntas podem ser tratadas como reuso pelo backend, que revoga a
família e exige novo login.

Logout em uma aba revoga o cookie; as outras abas continuam até o access token vencer
e então são levadas ao login na próxima renovação.

## Erros exibidos

401 indica falha de autenticação; 403 indica recusa da solicitação; 409 no cadastro
indica conflito; 400/422 indicam validação; 426 exige HTTPS; 429 indica limite de
tentativas. A interface não exibe mensagens internas do servidor.

## Segurança

- Access token apenas em memória; nada em `localStorage`, `sessionStorage`, URLs ou logs.
- O Bearer só é enviado para a origem e o caminho exatos de `API_BASE_URL`.
- Endpoints de sessão nunca recebem Bearer nem disparam outra renovação.
- Guards são apenas navegação; o backend autoriza cada requisição.

## Testes

[`auth.spec.ts`](../src/app/core/auth/testing/auth.spec.ts) cobre credenciais, Bearer
restrito à API, renovação compartilhada, repetição única, token vencido antes do envio,
falha temporária, troca de conta, restauração, logout com falha e espera pela rotação,
além dos guards. Execute `npm test -- --watch=false`, `npm run lint` e `npm run build`.

Veja [Desenvolvimento local e produção](HTTPS_SETUP.md) para iniciar o ambiente e preparar a hospedagem.
