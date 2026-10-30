# Plano de implementação --- Portal ABM

O objetivo é avançar por etapas pequenas, verificáveis e didáticas. Não
construir todo o sistema em uma única alteração.

# Plano de implementação --- Portal ABM

O desenvolvimento será feito em etapas pequenas, verificáveis e
didáticas. O protótipo v0.8 orienta a estrutura visual do portal; o v0.6
continua como referência funcional da Passagem de Serviço. Nenhum
protótipo deve ser tratado como sistema de produção.

## Etapa 0 --- Scaffold e entendimento

**Status: concluída.** Next.js com App Router, TypeScript, Tailwind e
ESLint foi criado e executa localmente.

## Etapa 1 --- Shell e documentação

**Status: concluída para a demonstração atual.**

-   Criar navegação compartilhada e responsiva.
-   Manter acessível a rota existente `/nova-passagem`.
-   Marcar módulos ainda não implementados como indisponíveis.
-   Alinhar README, requisitos, plano e instruções com o escopo do
    Portal v0.8.
-   Não configurar banco, autenticação ou serviços externos nesta etapa.

**Pronto quando:** início, QIS e Nova passagem usam a mesma moldura
responsiva; rotas e fluxos existentes continuam funcionais; lint/build
passam.

## Etapa 2 --- QIS

-   **Demonstração local atual:** tipos de dados, regras e repositório
    estão separados da interface; o administrador de demonstração edita
    o QIS em uma grade de horários compartilhados e dias úteis,
    incluindo inserção, remoção e reordenação de linhas. Rascunhos e
    snapshots de versões são armazenados no navegador; a alternância
    Usuário/Administrador serve apenas para testar a interface.
-   O modelo semanal apresenta horários fictícios pré-preenchidos,
    campos editáveis por célula e uma faixa de intervalo compartilhada.
    A migração local de dados da estrutura anterior agrupa atividades
    por faixa horária e preserva atividades repetidas em linhas
    separadas.
-   O período do QIS é uma semana completa de segunda a sexta; a semana
    atual é sugerida ao criar e outras semanas podem ser selecionadas.
    Campos de atividade oferecem sugestões genéricas com texto livre.
-   A publicação demonstrativa registra somente metadados fictícios e
    não valida arquivo/assinatura. Não é uma publicação oficial.
-   Próximo: escolher e implementar uma fonte de dados aprovada,
    autenticação e autorização de servidor antes de tratar a publicação
    como funcionalidade real.
-   Integrar arquivo PDF assinado real, acesso privado e versionamento
    persistente depois de definir a arquitetura e testar com dados
    fictícios.
-   O PDF complementa e não substitui a rotina legível no portal.

## Etapa 3 --- Escalas de Serviço

-   **Demonstração local atual:** calendário mensal, consulta por data e
    cadastro, edição e remoção manual de designações fictícias; os dados
    ficam no navegador e a alternância de perfil não oferece segurança.
-   A data inicial da Nova Passagem consulta a designação local e aplica
    sugestões editáveis. Alterações na escala não reescrevem dados que já
    foram copiados para o formulário da passagem.
-   **Motor independente em desenvolvimento:** `escala-engine/` usa
    Python + OR-Tools CP-SAT, contrato JSON e testes fictícios para gerar
    uma prévia global de Auxiliar e Condutor. O Oficial de Dia permanece
    manual. Não há API, integração com Next.js, persistência nem
    preenchimento automático do calendário.
-   O escopo matemático inicial implementa `J = 100 * J_total + 35 *
    (J_auxiliar + J_condutor)`, com expectativa total literal `2/N`,
    expectativas por função `1/N_função` e descanso de três dias
    completos entre serviços. Concentração, preferência por intervalos
    maiores e bônus de retorno foram adiados por ainda não terem
    formulação matemática aprovada.
-   Próximos passos após validar o motor: resolver os critérios
    secundários pendentes; depois decidir backend, fonte de dados
    compartilhada, autorização e persistência antes de integrar geração,
    revisão/ajuste administrativo e confirmação ao calendário.

## Etapa 4 --- Avisos e Determinações

-   **Demonstração local atual:** mural com pesquisa, filtros por tipo,
    ordenação por fixação e data, formulário de publicação, validade
    visível e ações demonstrativas de edição, exclusão e fixação.
-   A seleção de anexo não envia nem guarda arquivo; validação confiável,
    armazenamento privado e autorização ainda são requisitos futuros.
-   Qualquer usuário pode publicar qualquer um dos dois tipos, conforme
    regra aprovada. A demonstração local não oferece autenticação ou
    controle de acesso real.
-   Definir política de retenção e consulta de conteúdo expirado antes da
    persistência definitiva.

## Etapa 5 --- Completar a Passagem

-   **Demonstração local atual:** a etapa Alterações aceita ocorrências
    com as categorias padrão e a confirmação exclusiva de `Sem
    alteração`, além de campos opcionais de providências para Frota,
    Patrimônio e Pessoal; os registros existem somente enquanto a página
    está aberta. A conferência exibe o resumo temporário das etapas,
    destaca pendências, permite voltar à edição e oferece confirmação
    explícita para concluir a demonstração, sem persistir os dados.
-   Próximo: decidir e implementar persistência e finalização real após
    definir autorização, auditoria, backup e recuperação.
-   Manter a seção MOP independente e provisória, sem inventar sua
    finalidade.
-   Preservar as regras de viaturas, abastecimentos, decimais,
    `Sem alteração`, validação e edição do rascunho.
-   Manter dados temporários durante a demonstração, sem declarar
    salvamento definitivo.

## Etapa 6 --- Decidir e testar persistência

-   **Preparação inicial:** criada a migração PostgreSQL
    `passagem-servico-abm/database/migrations/0001_service_passages.sql`
    para o esquema inicial da Passagem. Ainda não foi aplicada e não há
    conexão com provedor.
-   Antes do salvamento definitivo, comparar opções PostgreSQL gratuitas
    para desenvolvimento e decidir com o usuário; hospedagem de produção
    permanece decisão futura com a instituição.
-   Definir modelo, migrações versionadas, autenticação, autorização,
    armazenamento privado de anexos, backups e recuperação.
-   Testar integração incremental com dados fictícios; validar
    operações simples e relações antes de habilitar o salvamento real
    das passagens.

**Pronto quando:** o ambiente de desenvolvimento conseguir salvar e
recuperar dados fictícios com permissões e integridade testadas.

## Etapa 7 --- Histórico, relatórios e auditoria

-   Implementar histórico, filtros explícitos e PDFs.
-   Implementar correção administrativa com justificativa e trilha de
    auditoria persistente.
-   Testar regras de negócio, permissões, anexos privados e recuperação.

## Etapa 8 --- Avaliação para uso real

-   Revisar segurança, privacidade, acessibilidade, logs, backup e
    restauração.
-   Obter autorização institucional para hospedagem e dados.
-   Só então considerar piloto com dados reais e autorização formal.

## Método de trabalho

Para cada tarefa: explicar objetivo e impacto, indicar arquivos,
implementar somente o escopo combinado, executar os testes pertinentes e
explicar como verificar o resultado. Não instalar dependências nem
configurar serviços externos sem necessidade explicada e aprovação.

## Método de trabalho recomendado

Para cada tarefa: 1. Explicar o que será feito e por quê. 2. Listar os
arquivos que serão criados/alterados. 3. Implementar somente o escopo
combinado. 4. Executar os testes adequados. 5. Explicar o resultado e
como o usuário pode verificar. 6. Registrar decisões importantes na
documentação.
