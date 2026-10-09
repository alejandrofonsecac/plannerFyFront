# Preferências por usuário

As configurações da interface ficam salvas na conta do usuário. Ao entrar em outro
navegador ou computador, elas são carregadas automaticamente.

| Preferência | Onde é aplicada | Cache local |
| --- | --- | --- |
| Tema (`theme`) | `shared/theme.service.ts` | `plannerfy-theme` |
| Cor de destaque (`accent`) | `shared/theme.service.ts` | `plannerfy-accent` |
| Visualização do planner (`plannerDisplay`) | `shared/planner-view.service.ts` | `plannerfy-planner-display` |
| Horário de sono (`sleep`) | `shared/planner-view.service.ts` | `plannerfy-planner-sleep` |
| Largura da barra lateral (`sidebarWidth`) | `shared/components/sidebar/sidebar-state.ts` | `agenda.sidebar-width` |

Contrato da API (`GET` e `PUT /users/me/preferences`), valores aceitos e erros:
`.docs/preferences/README.md` no repositório `api-workspace`. O tipo de transporte
está em `core/preferences/user-preferences.model.ts`.

## Funcionamento

`core/preferences/user-preferences.service.ts` (`UserPreferencesService`) é criado na
inicialização (`app.config.ts`) e acompanha `AuthSession.user()`:

1. **Antes do login** a interface usa o cache local (assim a tela de login já abre com
   o tema conhecido).
2. **Ao iniciar uma sessão** (login, cadastro ou restauração pelo cookie) faz
   `GET /users/me/preferences` e aplica a resposta nos serviços acima, que também
   atualizam o cache local.
3. **Primeiro acesso de uma conta** (`updatedAt: null`): se o cache local não pertence a
   outra conta, o que já estava configurado neste navegador é enviado com `PUT`, para o
   usuário não perder a configuração existente. Se o cache pertence a outra conta
   (`plannerfy-preferences-owner`), a conta nova recebe os padrões.
4. **Alterações** (modal de configurações ou arraste da barra lateral) são enviadas com
   `PUT` do estado completo, agrupadas por 600 ms; há no máximo uma gravação em
   andamento e a seguinte sempre leva o estado mais recente. A largura da barra lateral
   só é gravada ao soltar o arraste.
5. **Falhas** não são tratadas como sucesso: `status()` fica `error` e o rodapé do modal
   de configurações informa que as alterações valem apenas neste navegador, com o botão
   "Tentar novamente" (`retry()`). Enquanto o carregamento da conta não funcionar, nada
   é gravado, para não sobrescrever a conta com valores locais.

Ao sair, a aplicação navega para `/login` recarregando a página; o cache local continua
com as preferências da última conta, que são visuais e não contêm dados privados. A
próxima conta que entrar recebe as próprias preferências do servidor.

Limitação conhecida: uma alteração feita menos de 600 ms antes de fechar a aba pode
não chegar ao servidor (fica apenas no cache local).

## Como adicionar uma nova preferência

Regra do projeto (veja `AGENTS.md`): **em toda atualização, verifique se ela cria ou
altera uma configuração do usuário; se sim, inclua-a nas preferências por usuário.**

1. Backend primeiro: siga "Como adicionar uma nova preferência" em
   `.docs/preferences/README.md` (migration, DTO, validação e testes).
2. Acrescente o campo em `UserPreferences` (`user-preferences.model.ts`).
3. No `UserPreferencesService`, inclua o signal de origem em `current`, aplique o valor
   em `apply()` e adicione o campo à função `key()`.
4. Mantenha um setter no serviço dono do estado que também atualize o cache local.
5. Cubra carregamento, gravação e falha em `user-preferences.spec.ts` e atualize a
   tabela acima.
