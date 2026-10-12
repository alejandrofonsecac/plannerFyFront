# Preferências por usuário

As configurações da interface ficam salvas na conta do usuário. Ao entrar em outro
navegador ou computador, elas são carregadas automaticamente.

A API guarda um documento JSON por conta e **não conhece as chaves**: o frontend define
quais preferências existem, os valores aceitos e os padrões. Contrato e limites:
`.docs/preferences/README.md` no repositório `api-workspace`.

## Preferências atuais

| Chave | Padrão | Dono | Cache local (legado) |
| --- | --- | --- | --- |
| `theme` | `light` | `shared/theme.service.ts` | `plannerfy-theme` |
| `accent` | `blue` | `shared/theme.service.ts` | `plannerfy-accent` |
| `plannerDisplay` | `compact` | `shared/planner-view.service.ts` | `plannerfy-planner-display` |
| `sleep` | `{ enabled: false, start: 23, end: 7 }` | `shared/planner-view.service.ts` | `plannerfy-planner-sleep` |
| `sidebarWidth` | `280` (240–340) | `shared/components/sidebar/sidebar-state.ts` | `agenda.sidebar-width` |

## Como adicionar uma preferência

No serviço que é dono do estado:

```ts
private readonly weekStartPreference = inject(PreferenceStore).define<WeekStart>({
  key: 'weekStart', // camelCase, estável depois de publicada
  defaultValue: 'monday',
  parse: oneOf(['monday', 'sunday']), // undefined para valores inválidos
});
readonly weekStart = this.weekStartPreference.value; // Signal
setWeekStart(value: WeekStart) {
  this.weekStartPreference.set(value); // atualiza interface, cache e conta
}
```

Depois, adicione uma linha na tabela acima e testes do comportamento. **Não é preciso
mudar o backend.**

Cuidados:

- Não renomeie nem reutilize uma chave publicada com outro significado: contas antigas
  ainda têm o valor salvo. Para mudar o formato, crie uma chave nova.
- `parse` deve aceitar apenas valores que a interface sabe exibir. Valores
  desconhecidos (por exemplo, gravados por uma versão mais nova) viram o padrão
  localmente e **não** são sobrescritos na conta.
- Se o valor passar a influenciar cálculos ou regras do servidor, ele não é preferência
  visual: precisa de campo próprio validado no backend.

## Funcionamento

São duas peças em `core/preferences/`:

- **`PreferenceStore`** (`preference-store.service.ts`): registro das preferências.
  Guarda o valor atual (signal) e o cache em `localStorage`. Não depende de HTTP, então
  os serviços que definem preferências continuam testáveis isoladamente.
- **`UserPreferencesService`** (`user-preferences.service.ts`): sincroniza o store com a
  conta. É criado na inicialização (`app.config.ts`) e acompanha `AuthSession.user()`.

Fluxo:

1. **Antes do login** vale o cache local (a tela de login já abre com o tema conhecido).
2. **Ao iniciar uma sessão** (login, cadastro ou restauração pelo cookie), faz
   `GET /users/me/preferences`. Para cada preferência registrada:
   - a chave existe na conta → aplica o valor (ou o padrão, se `parse` o rejeitar);
   - a chave não existe na conta → se o cache local é desta conta ou de ninguém
     (`plannerfy-preferences-owner`), o valor deste navegador é enviado; se o cache é
     de **outra conta**, vale o padrão.
   - alteração feita antes da resposta chegar → a escolha local é mantida e enviada.
3. **Preferências registradas depois** (funcionalidades carregadas sob demanda) passam
   pela mesma regra assim que são definidas.
4. **Alterações** do usuário enviam `PATCH` só com as chaves alteradas, agrupadas por
   600 ms, uma gravação por vez.
5. **Falhas** não são tratadas como sucesso: `status()` fica `error`, o rodapé do modal
   de configurações avisa que as alterações valem só neste navegador e oferece "Tentar
   novamente" (`retry()`). Se o carregamento falhar, nada é enviado, para não
   sobrescrever a conta.

Ao sair, a aplicação recarrega em `/login`; o cache continua com as preferências visuais
da última conta (sem dados privados) e a próxima conta recebe as suas.

Limitação conhecida: uma alteração feita menos de 600 ms antes de fechar a aba pode não
chegar à conta; no próximo acesso, o valor salvo na conta prevalece.
