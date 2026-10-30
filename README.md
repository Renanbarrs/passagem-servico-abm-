# Portal ABM

## Objetivo

Portal interno demonstrativo da Academia Bombeiro Militar (ABM). A
Passagem de Serviço é um dos módulos do portal, junto com QIS, Escalas
de Serviço e Avisos e Determinações planejados.

## Estado atual do projeto

O projeto Next.js contém uma página inicial de portal e um shell
compartilhado com navegação responsiva. A página QIS permite, em modo de
demonstração, editar uma grade semanal em tabela, salvar rascunhos,
consultar versões locais e simular a publicação. O modelo apresenta
linhas de horário compartilhadas pelos dias úteis, células com campos
editáveis e uma faixa extra que pode ser inserida. Os dados fictícios
ficam no `localStorage` deste navegador: isso não é banco de dados nem
autenticação. O nome de PDF informado para testar publicação é apenas
texto; nenhum arquivo é enviado ou validado.

Ao criar ou editar o QIS, o período é mantido como semana completa de
segunda a sexta: a semana atual é sugerida em um calendário mensal, onde
os dias úteis da semana selecionada ficam destacados. Tema, uniforme,
local e frente/responsável oferecem sugestões genéricas, sem bloquear
texto livre; observações também permanecem livres. As opções de consulta
dos QIS publicados identificam o intervalo completo de cada semana. A
demonstração impede criar outro registro para um período já ocupado e
oferece abrir o QIS existente ou escolher outra semana; revisões do
mesmo registro continuam permitidas.

A rota `Nova passagem` mantém as etapas `Dados gerais`, `Viaturas`,
`Abastecimentos` e `Alterações`, com validação somente no navegador. A
etapa Alterações aceita ocorrências nas categorias padrão ou a
confirmação exclusiva `O serviço transcorreu sem alterações`. Providências
por Frota, Patrimônio e Pessoal também podem ser registradas. A
conferência apresenta um resumo temporário das etapas e permite voltar
para edição. Datas e horários são verificados; abastecimentos devem
ocorrer dentro do período da passagem, e seus hodômetros são conferidos
novamente caso os dados da viatura mudem. A seção de providências começa
minimizada e abre ao clicar no cabeçalho. A conferência revalida as
pendências e permite concluir uma demonstração após confirmação
explícita, sem salvar os dados. Os dados da passagem são temporários e
não são salvos. A seleção de comprovante é demonstrativa: o arquivo não
é enviado nem armazenado.

A rota `Escalas de Serviço` oferece calendário mensal, consulta por data e
cadastro manual demonstrativo de Oficial de Dia, Auxiliar de Dia,
Condutor e observações. As designações e a troca de perfil ficam no
`localStorage` deste navegador; não há geração automática de escala nem
controle real de acesso. A data inicial da Nova Passagem consulta a
designação local e preenche sugestões editáveis quando houver registro.

Foi iniciado em `escala-engine/` um motor independente em Python com
OR-Tools CP-SAT para calcular prévias globais de Auxiliar e Condutor. Ele
usa JSON, dados fictícios e testes; não tem API, banco ou ligação com o
Portal. A tela, o calendário e a escolha manual do Oficial de Dia não
foram alterados. O resultado do motor ainda não preenche o calendário:
isso dependerá de integração futura com backend, persistência e
autorização aprovados.

O mural `/avisos` permite criar, editar, excluir e fixar publicações
fictícias dos tipos Aviso e Determinação, além de pesquisar e filtrar os
registros locais. O anexo é apenas selecionado localmente para demonstrar
o formulário; o arquivo não é enviado ou guardado. Qualquer pessoa com
acesso ao navegador pode testar as ações, pois não há autenticação nem
autorização real.

Os campos que identificam um militar oferecem busca em uma lista central
de participantes fictícios, filtrada conforme a função (por exemplo,
Oficial de Dia ou praça). O responsável pelo QIS e o autor das
publicações também devem ser selecionados dessa lista; os nomes ficam
como snapshots nos registros da demonstração. O cadastro atual é
estático e fictício, não uma lista de efetivo real.

O protótipo HTML `v0.8` é a referência visual atual do portal; o HTML
`v0.6` continua sendo referência funcional para a Passagem de Serviço.
Os fluxos de QIS, Escalas e Avisos são demonstrativos: não há
autenticação, autorização real, PDF/arquivo integrado nem banco.
Histórico completo da Passagem, relatórios e administração ainda não
foram migrados para o Next.js. Consultar os protótipos não significa que
essas funcionalidades estejam implementadas na aplicação.

Foi preparada uma primeira migração PostgreSQL para o esquema da
Passagem em `passagem-servico-abm/database/migrations/`, mas ela ainda
não foi aplicada. Não há conexão com banco nem credenciais configuradas;
o formulário continua temporário no navegador.

Ambiente informado no primeiro teste:

-   Windows com PowerShell.
-   Node.js `v22.17.1`.
-   npm `10.9.2`.
-   Git `2.50.0.windows.2`.
-   Next.js `16.4.2`.
-   URL local: `http://localhost:3000`.

O instalador informou cinco vulnerabilidades de alta severidade nas
dependências. Isso não impediu a inicialização. **Não execute
`npm audit fix --force` sem antes revisar o relatório**, porque o
comando pode introduzir atualizações incompatíveis.

## Protótipos existentes

O arquivo `Portal_ABM_Prototipo_v08.html` é a referência visual e de
organização atual do portal. O arquivo
`Passagem_de_Servico_ABM_Prototipo_v06.html` continua como referência
funcional da Passagem de Serviço.

Os protótipos demonstram:

-   Painel inicial e histórico de passagens.
-   Formulário em etapas com salvamento automático de rascunho.
-   Cadastro de dados gerais, viaturas, abastecimentos, alterações e
    providências.
-   Controle de hodômetros, distância percorrida e nível do tanque.
-   Anexos de comprovantes de abastecimento.
-   Pesquisa digitável de militares e oficiais.
-   Gestão demonstrativa de listas por administrador.
-   Correções justificadas de passagens finalizadas.
-   PDFs de uma passagem e relatórios por período.
-   QIS semanal com rotina visível no portal, histórico, edição por
    administrador, versões e publicação condicionada a PDF assinado.
-   Calendário mensal de Escalas de Serviço e integração proposta com a
    data da Passagem.
-   Mural de Avisos e Determinações.

**Limitação dos protótipos:** eles funcionam localmente no navegador,
usam `localStorage`, não têm autenticação real, banco de dados
centralizado, controle de acesso de servidor nem backup. O login é
demonstrativo e os dados iniciais são fictícios. Não devem ser usados
para dados oficiais ou restritos.

No Portal v0.8, qualquer usuário pode publicar avisos e determinações.
Essa regra substitui textos antigos do protótipo que restrinjam a
publicação de determinações a usuários autorizados.

## Tecnologias

### Já presentes no scaffold

-   Next.js com App Router.
-   React.
-   TypeScript.
-   Tailwind CSS.
-   ESLint.

### Arquitetura planejada, ainda não configurada

-   PostgreSQL como banco relacional.
-   Supabase como opção para PostgreSQL, autenticação e armazenamento
    privado de comprovantes.
-   Hospedagem futura, possivelmente na Vercel, somente depois de
    validação técnica e autorização institucional.
-   Validação de dados no servidor e controle de acesso no banco.
-   PDFs consistentes, mantendo os relatórios individuais e por período.

PostgreSQL e Supabase são possibilidades para testes e evolução; a
decisão sobre hospedagem institucional é futura. Não presuma que
Supabase, autenticação, tabelas ou armazenamento já estejam
configurados.

## Como executar localmente

No terminal do VS Code, dentro de `passagem-servico-abm`:

``` powershell
npm.cmd run dev
```

Abra `http://localhost:3000`. Para encerrar o servidor, use `Ctrl+C` no
terminal.

A pasta da aplicação Next.js é `passagem-servico-abm`.

## Documentos do projeto

-   `.github/copilot-instructions.md`: regras para o Copilot trabalhar
    neste projeto.
-   `docs/ESPECIFICACAO_FUNCIONAL.md`: requisitos e comportamentos
    aprovados no protótipo.
-   `docs/MODELO_DE_DADOS_E_SEGURANCA.md`: proposta inicial de banco de
    dados, permissões e proteção dos dados.
-   `docs/PLANO_DE_IMPLEMENTACAO.md`: etapas sugeridas para desenvolver
    e validar o sistema.
-   `docs/PROMPT_INICIAL_PARA_COPILOT.md`: texto pronto para iniciar uma
    conversa com o Copilot.

## Regra de segurança

Até que a arquitetura, as permissões, os backups e o armazenamento sejam
testados e autorizados pela unidade, trabalhe apenas com dados
fictícios. Não copie para serviços externos planilhas, comprovantes ou
registros reais sem revisar as regras de privacidade e obter a
autorização necessária.
