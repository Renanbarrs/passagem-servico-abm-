# Modelo de dados e segurança --- proposta inicial do Portal ABM

Este documento é uma proposta para discussão. Nenhuma tabela, política
RLS, autenticação ou integração com Supabase deve ser considerada
existente até ser criada e testada no repositório.

## 1. Arquitetura proposta

-   **Aplicação:** Next.js App Router + TypeScript.
-   **Banco:** PostgreSQL.
-   **Serviços possíveis:** Supabase Auth, PostgreSQL e Storage privado.
-   **Interface:** React + Tailwind CSS.
-   **Hospedagem:** a decidir depois dos testes e da autorização
    institucional.

A lógica de negócio deve ser separada da interface. As operações de
finalização e correção devem ocorrer no servidor e ser validadas no
banco sempre que possível.

## 2. Entidades sugeridas

### `profiles`

Perfil ligado ao usuário autenticado: - `user_id` --- UUID que
referencia a identidade de autenticação. - `display_name`. - `role` ---
`usuario_abm` ou `administrador`, conforme aprovação institucional. -
`active`. - `created_at`, `updated_at`.

O portal tem somente os perfis `Usuário da ABM` e `Administrador`.
Oficial de Dia, Auxiliar de Dia, Condutor e responsável pelo
abastecimento são participantes identificados nos registros, não perfis
de acesso.

### `personnel`

Cadastro mestre administrável de militares da ABM para seleção: - `id`.
- `full_name`. - `rank` ou posto/graduação, se necessário. - `active`.
- Indicadores de função/elegibilidade (Oficial de Dia, Auxiliar,
Condutor ou responsável por abastecimento), conforme validação da
unidade. - `created_at`, `updated_at`.

Todos os campos que representam uma pessoa devem buscar neste cadastro
mestre, aplicando os filtros de elegibilidade apropriados. Os nomes
selecionados devem ser preservados como snapshots nos registros para
que uma mudança no cadastro não altere o passado.

### `officer_options`

As sugestões de Oficial de Dia devem ser filtradas do cadastro mestre de
militares por posto/função, em vez de manter um segundo cadastro
independente de nomes. Se houver necessidade de opções especiais
adicionais, manter somente referências aos militares existentes.

A passagem também precisa guardar o nome registrado como texto
histórico. Se o oficial for externo, aceitar texto livre sem exigir que
exista nesta lista.

Sugestões iniciais do protótipo: - `1º TEN FELIPE` - `1º TEN VICTOR` -
`1º TEN PADILHA` - `1º TEN LORENA` - `1º TEN JEAN` - `TCEL BRUNO`

### `vehicles`

Cadastro das viaturas fixas: - `id` ou identificador textual, usando
`APS-112` e `AR-99`. - `model`. - `fuel_type`. - `active`.

Os identificadores não devem ser duplicados. Alterações de cadastro
devem preservar o histórico.

### `service_passages`

Registro principal da passagem: - `id` UUID. - `service_date`. -
`date_start`, `time_start`, `date_end`, `time_end`. - Referências
opcionais para o cadastro de oficial, Auxiliar e Condutor. - Cópias
históricas dos nomes de Oficial, Auxiliar e Condutor. - `status` ---
rascunho ou finalizado. - Dados de providências por setor: Frota,
Patrimônio e Pessoal, ou relação separada se isso ficar mais adequado. -
Campos MOP provisórios, caso continuem necessários. - `created_by`,
`updated_by`, `finalized_by`. - `created_at`, `updated_at`,
`finalized_at`.

Não dependa apenas de um campo `status` no navegador. A transição para
finalizado deve ser validada no servidor.

### `service_vehicles`

Uma linha por viatura vinculada à passagem: - `id`. -
`service_passage_id`. - `vehicle_id`. - `status` --- operacional ou
baixada. - `odometer_initial`, `odometer_final`. - `tank_level`. -
`notes`.

Impedir duplicação da mesma viatura na mesma passagem com uma restrição
única (`service_passage_id`, `vehicle_id`). Validar a coerência dos
hodômetros.

### `fuelings`

Um registro por abastecimento: - `id`. - `service_passage_id`. -
`vehicle_id`. - `date`, `time`. - `responsible_name_snapshot`. -
`odometer`. - `liters` --- decimal com precisão adequada. - `amount` ---
decimal monetário, nunca ponto flutuante binário. - `balance` ---
decimal monetário. - `receipt_storage_path` e metadados necessários. -
`created_by`, `created_at`.

O banco guarda o caminho/referência do comprovante, não uma imagem em
base64. O arquivo deve ficar em bucket privado e ser acessado por meio
de autorização e URL temporária quando apropriado.

### `occurrence_categories`

-   `id`.
-   `name`.
-   `active`.
-   `is_system`.
-   `created_at`, `updated_at`.

Categorias iniciais: Viaturas, Patrimônio, Pessoal, Instalações,
Instruções e atividades, Outros. A opção `Sem alteração` é especial e
não pode ser duplicada ou removida como uma categoria comum.

### `occurrences`

-   `id`.
-   `service_passage_id`.
-   `category_id`.
-   `occurred_at` ou data/horário em campos separados.
-   `description`.
-   `created_by`, `created_at`.

Para `Sem alteração`, preservar o texto fixo
`O serviço transcorreu sem alterações`. A regra de exclusividade entre
essa confirmação e ocorrências reais precisa ser validada numa operação
transacional no servidor. O desenho final pode optar por representar a
confirmação como campo próprio, desde que os filtros e relatórios
continuem exibindo a categoria `Sem alteração` corretamente.

### `service_audit_entries`

-   `id`.
-   `service_passage_id`.
-   `changed_by`.
-   `changed_at`.
-   `field_name`.
-   `old_value`.
-   `new_value`.
-   `justification`.

Toda correção administrativa deve gravar a alteração e a auditoria na
mesma transação, para evitar que uma correção fique sem registro de
justificativa.

### Entidades propostas para os módulos do portal

#### QIS e versões

-   `qis_schedules`: `id`, `period_start`, `period_end`, responsável,
    status de rascunho/publicado, versão atual, autor e timestamps.
-   `period_start` e `period_end` devem corresponder à mesma semana
    completa, de segunda a sexta-feira; a interface sugere a semana atual
    ao criar o QIS.
-   O conteúdo contém linhas de horário compartilhadas pelos cinco dias
    úteis. Cada linha tem horário, tipo (`atividade` ou `intervalo`) e
    as células de segunda a sexta. Cada célula de atividade guarda tema,
    uniforme, local, frente/responsável e observações; uma linha de
    intervalo guarda também seu rótulo.
-   O editor pode oferecer sugestões genéricas para tema, uniforme,
    local e frente/responsável, mas deve aceitar texto livre e não tratar
    essas sugestões como dados oficiais.
-   `qis_schedule_versions`: `id`, `qis_schedule_id`, número da versão,
    snapshot imutável do conteúdo, referência privada ao PDF assinado,
    autor e data de publicação. O snapshot pode ser armazenado como
    JSONB ou em tabelas relacionais, decisão a tomar ao criar migrações.
-   O modelo atual do protótipo apresenta horários em linhas e dias da
    semana em colunas; células vazias são permitidas. Uma linha pode ser
    inserida, removida ou movida, e o horário é comum aos cinco dias.
    Se a persistência futura for relacional, representar a linha do
    horário e as células diárias como entidades relacionadas; não
    persistir cada dia como uma agenda independente.
-   Publicação exige PDF assinado anexado. A versão publicada não deve
    ser sobrescrita; nova publicação cria nova versão e preserva as
    anteriores.
-   A rotina semanal continua consultável no portal; PDF é complementar.
-   No protótipo, `QisRepository` separa tela e persistência;
    `LocalStorageQisRepository` mantém rascunhos e versões somente neste
    navegador. É temporário e não substitui PostgreSQL, autenticação ou
    autorização no servidor.
-   O modelo fictício do protótipo começa com as faixas 09h–10h30,
    10h45–12h, intervalo 12h–13h, 13h–15h e 15h–17h, e permite inserir
    linhas adicionais, como 07h30–09h. Esses horários são referências
    editáveis, não programação oficial.
-   A simulação guarda apenas um nome fictício de PDF; não recebe
    arquivos, não verifica assinatura e não representa publicação
    institucional.

#### Escalas

-   `duty_rosters`: uma designação por data, com nomes de Oficial de
    Dia, Auxiliar, Condutor, observações e timestamps.
-   Campos podem referenciar pessoas quando aplicável, mas devem
    preservar snapshots textuais para histórico.
-   Não há geração automática de escalas aprovada.
-   No protótipo, `LocalStorageDutyRosterRepository` guarda as
    designações somente no navegador e a interface pode ser testada com
    opções de participantes fictícias. Uma futura integração deverá
    buscar a escala pela data inicial da passagem e copiar os nomes para
    o registro, sem atualizar passagens antigas quando a escala mudar.

#### Avisos e determinações

-   `announcements`: tipo (aviso/determinação), categoria, título,
    texto, autor, publicação, validade, estado e indicador de fixação.
-   `announcement_attachments`: metadados e referência a arquivo
    privado associado à publicação.
-   No protótipo, `LocalStorageAnnouncementRepository` mantém
    publicações fictícias no navegador. A seleção de anexo não envia nem
    persiste o arquivo; não representa um sistema de arquivos privado.
-   Qualquer usuário pode publicar avisos e determinações oficiais.
    Autorização deve refletir essa regra no servidor, não só na
    interface.
-   Política de retenção e consulta de publicações expiradas ainda está
    pendente de decisão.

Foi criada uma primeira migração PostgreSQL em
`passagem-servico-abm/database/migrations/0001_service_passages.sql`.
Ela define o esquema inicial da Passagem, categorias padrão e
restrições relacionais/de consistência. A migração **não foi executada**
em um banco: não há provedor, conexão, credenciais, autenticação,
autorização/RLS, políticas de backup ou integração configurados. Os
demais módulos e a auditoria continuam apenas como propostas.

## 3. Regras de consistência

-   Distância calculada somente quando ambos os hodômetros são válidos e
    `final >= initial`.
-   Para viatura operacional, hodômetros inicial/final e nível do tanque
    são obrigatórios.
-   Para viatura baixada, exigir motivo nas observações.
-   Abastecimento deve referenciar uma viatura válida e uma passagem
    existente.
-   Litros, valor, saldo e hodômetro não podem ser negativos.
-   O hodômetro de abastecimento deve ser compatível com o intervalo da
    viatura quando os valores inicial/final estiverem disponíveis.
-   A passagem finalizada deve ter todos os campos obrigatórios e pelo
    menos uma ocorrência ou confirmação `Sem alteração`.
-   A confirmação `Sem alteração` não pode coexistir com ocorrências
    reais. A migração impede essa coexistência no banco e mantém a
    categoria especial única.
-   As restrições SQL protegem valores e relações básicos, mas ainda não
    implementam a operação de finalização. O servidor deverá validar os
    campos e gravar a passagem e seus itens em uma transação antes de
    permitir status finalizado.
-   Correções de passagens finalizadas exigem administrador e
    justificativa.
-   Somente os perfis aprovados `usuario_abm` e `administrador` devem
    existir. Participantes operacionais não são perfis de acesso.
-   A publicação do QIS exige PDF assinado e preserva todas as versões
    já publicadas.
-   Qualquer usuário pode publicar aviso ou determinação.
-   Os relatórios devem usar apenas registros que o usuário tenha
    autorização para consultar.

## 4. Segurança mínima antes de qualquer uso real

1.  Autenticação real; remover login demonstrativo.
2.  Autorização por perfil aplicada no servidor.
3.  Políticas RLS no PostgreSQL/Supabase revisadas e testadas.
4.  Bucket privado para comprovantes; validação de formato/tamanho e
    controle de acesso.
5.  Nenhuma chave secreta enviada ao navegador ou versionada.
6.  Logs persistentes de correções administrativas.
7.  Backups e teste de restauração.
8.  Tratamento de erros sem expor credenciais ou dados pessoais.
9.  Testes de autorização para confirmar que um Usuário da ABM não
    consegue executar ações administrativas por chamada direta.
10. Aprovação institucional antes de inserir dados oficiais.

## 5. Variáveis de ambiente

Se Supabase for adotado, as variáveis e seus nomes finais devem seguir a
documentação atual do SDK escolhido. Em geral, a URL e a chave pública
podem ser usadas no cliente somente com políticas RLS corretamente
configuradas. Chaves administrativas devem permanecer exclusivamente no
servidor.

-   Guardar valores locais em `.env.local`.
-   Garantir que `.env.local` esteja no `.gitignore`.
-   Não colocar valores reais de segredos neste documento.
-   Não compartilhar arquivos `.env` com o Copilot nem adicioná-los ao
    Git.
-   Nunca usar a chave `service_role` em componentes client-side.

## 6. Questões ainda abertas

-   Qual provedor será autorizado para banco, autenticação,
    armazenamento e hospedagem?
-   Quais pessoas poderão ter conta e quais serão apenas participantes
    selecionáveis?
-   Qual será a política de retenção, backup e exclusão de registros?
-   Qual padrão de geração de PDF será adotado?
-   Quais permissões de consulta e edição o Usuário da ABM terá em
    rascunhos e passagens em andamento?
-   A seção MOP será mantida? Qual é sua finalidade oficial?
-   Quais requisitos institucionais de privacidade e segurança se
    aplicam?
-   Qual é a política de histórico para avisos e determinações expirados?
