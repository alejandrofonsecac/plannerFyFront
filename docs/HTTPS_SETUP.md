# Desenvolvimento local e HTTPS em produção

## Desenvolvimento local

O ambiente local usa HTTP para evitar instalação de certificados. O backend já
permite esse modo no perfil `local`; nesse perfil o cookie de renovação não recebe
o atributo `Secure`. Use-o somente durante o desenvolvimento local.

### 1. Iniciar o backend

Na pasta `api-workspace`, inicie o Spring Boot com o perfil `local`, preservando
as variáveis de banco e JWT já usadas pelo projeto:

```powershell
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=local"
```

No IntelliJ, informe `--spring.profiles.active=local` em **Program arguments** e
reinicie a aplicação. A API deve ficar disponível em `http://localhost:8080`.
O CORS padrão desse perfil permite `http://localhost:4200`. Se
`CORS_ALLOWED_ORIGINS` estiver definido no ambiente, configure-o para essa origem.

### 2. Iniciar o frontend

Na raiz do `plannerFyFront`:

```powershell
npm ci
npm start
```

Abra **http://localhost:4200**. O ambiente Angular usa `/api`; o dev-server
encaminha essas chamadas pelo proxy em
[`config/proxy/proxy.conf.cjs`](../config/proxy/proxy.conf.cjs), remove o prefixo
`/api` e entrega ao backend. Não é necessário instalar mkcert nem criar certificados.

### Erros comuns

| Erro | Causa e solução |
| --- | --- |
| `426 HTTPS_REQUIRED` | Backend iniciado sem perfil `local` (ou com `prod`/`production`). Inicie com `local`. |
| `403 SESSION_HEADER_REQUIRED` | Atualize o frontend e confirme que login, cadastro, refresh e logout enviam `X-PlannerFy-Session: 1`. |
| `Invalid CORS request` | Defina `CORS_ALLOWED_ORIGINS=http://localhost:4200` e reinicie o backend. |
| `Cannot POST /api/users/login` | Proxy não carregado. Pare o servidor Angular e execute `npm start` novamente na raiz do frontend. |
| `ECONNREFUSED` ou 502 | Backend indisponível em `localhost:8080`. |
| 401 no login | A requisição chegou à validação das credenciais; confira email, senha e estado da conta. |

O cookie de renovação é HttpOnly e SameSite=Strict, mas no perfil `local` não é
Secure. O access token continua apenas em memória. Esses ajustes permitem testar
localmente; não mudam a política HTTPS de produção.

## Produção

Não use `ng serve` nem a configuração do proxy local para hospedar a aplicação.
Compile o frontend com `npm ci` e `npm run build`; sirva `dist/AgendaFrontend/browser`
por um servidor de produção com certificado TLS válido para o domínio.

Mantenha frontend e API na mesma origem: o servidor de produção encaminha `/api/`
à API, removendo esse prefixo, e preserva cookies. Configure o backend com o perfil
`production`, `CORS_ALLOWED_ORIGINS` para a origem HTTPS do frontend e confiança
restrita aos endereços/IPs reais do proxy. A configuração de produção do backend
pressupõe proxy e API no loopback da mesma máquina; containers e proxies remotos
exigem ajuste de rede e lista confiável. Nunca confie em qualquer IP nem exponha
a API HTTP diretamente à internet.

Antes da implantação, recupere e confira as migrations Flyway V1/V2 originais
conforme o `AGENTS.md`; não desative validação de migrations.

## Sobre certificados locais

mkcert pode ser usado para reproduzir HTTPS em desenvolvimento, mas não é
necessário no fluxo local padrão deste projeto. Certificados e chaves privadas
continuam ignorados pelo Git. Nunca use o certificado local de desenvolvimento
em produção.
