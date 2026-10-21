# Modelo de dados e segurança --- proposta inicial

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
inicialmente `auxiliar_dia` ou `administrador`, sujeito a validação da
unidade. - `active`. - `created_at`, `updated_at`.

Oficial de Dia e Condutor são participantes identificados no serviço,
não perfis de acesso confirmados.

### `personnel`

Lista administrável de militares para seleção: - `id`. - `full_name`. -
`rank` ou posto/graduação, se necessário. - `active`. - Indicadores de
elegibilidade para Auxiliar e/ou Condutor, se a unidade precisar dessa
distinção. - `created_at`, `updated_at`.

Os nomes selecionados devem ser preservados como cópias históricas na
passagem, para que uma mudança de cadastro não altere o passado.

### `officer_options`

Lista de sugestões de Oficial de Dia: - `id`. - `display_name`. -
`active`. - `created_at`, `updated_at`.

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
    reais.
-   Correções de passagens finalizadas exigem administrador e
    justificativa.
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
9.  Testes de autorização para confirmar que um Auxiliar não consegue
    executar ações administrativas por chamada direta.
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
-   Quais pessoas poderão ter conta e quais serão apenas nomes
    selecionáveis?
-   Qual será a política de retenção, backup e exclusão de registros?
-   Qual padrão de geração de PDF será adotado?
-   Quais permissões exatas o Auxiliar terá em rascunhos e passagens em
    andamento?
-   A seção MOP será mantida? Qual é sua finalidade oficial?
-   Quais requisitos institucionais de privacidade e segurança se
    aplicam?
