# Autenticação

## Contrato

- `POST /users/login`: `{ email, password }`.
- `POST /users/register`: `{ name, email, password }`.
- Cabeçalho obrigatório: `X-PlannerFy-Session: 1`.
- Resposta: `{ accessToken, tokenType, expiresIn, user }`.

O frontend usa `/api`, encaminhado pelo proxy. Login e cadastro usam
`withCredentials: true`. O backend valida credenciais, autorização e propriedade
e emite cookie de renovação HttpOnly. JavaScript não deve ler esse cookie.
O access token fica apenas em memória e é enviado como Bearer somente para a API.
Senhas e tokens não devem ir para armazenamento persistente, URLs ou logs.

401 indica falha de autenticação; 403 indica recusa da solicitação; 409 no cadastro
indica conflito; 400/422 indicam validação; 426 exige HTTPS; 429 indica limite de
tentativas. A interface não exibe mensagens internas do servidor.

## Limitações atuais

O frontend ainda não chama `/users/refresh`, `/users/logout` ou `/users/logout-all`.
Recarregar a página exige novo login; expirar o token encerra a sessão visual.
O logout atual limpa a memória e navega para login, mas não revoga o cookie de
renovação no backend. A correção de HTTPS/login não implementa renovação automática
nem revogação de sessão. Esses fluxos precisam de integração própria.

Veja [Desenvolvimento local e produção](HTTPS_SETUP.md) para iniciar o ambiente e preparar a hospedagem.
