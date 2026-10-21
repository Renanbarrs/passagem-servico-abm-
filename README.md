# Passagem de Serviço --- ABM

## Objetivo

Aplicação web para registrar, consultar e documentar a passagem diária
de serviço da Academia de Bombeiro Militar (ABM), com foco em
rastreabilidade, controle de viaturas, abastecimentos, alterações e
providências.

## Estado atual do projeto

**A aplicação Next.js ainda está no início do desenvolvimento.** O
projeto foi criado com `create-next-app` e contém uma tela inicial e as
etapas `Dados gerais`, `Viaturas` e `Abastecimentos`, com validação
somente no navegador. Os dados permanecem apenas enquanto a página está
aberta e não são salvos. A seleção de comprovante é demonstrativa: o
arquivo não é enviado nem armazenado. Os demais fluxos descritos na
documentação foram exercitados em protótipos HTML independentes,
principalmente na versão `v0.6`, e ainda precisam ser reconstruídos na
aplicação Next.js.

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

O protótipo HTML `Passagem_de_Servico_ABM_Prototipo_v06.html` é a
principal referência funcional e visual. Também foram produzidas versões
anteriores (`v0.1` a `v0.5`), capturas de tela e PDFs de exemplo.

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

**Limitação dos protótipos:** eles funcionam localmente no navegador,
usam `localStorage`, não têm autenticação real, banco de dados
centralizado, controle de acesso de servidor nem backup. O login é
demonstrativo e os dados iniciais são fictícios. Não devem ser usados
para dados oficiais ou restritos.

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

Não presuma que Supabase, autenticação, tabelas ou armazenamento já
estejam configurados. Consulte os arquivos reais do repositório antes de
agir.

## Como executar localmente

No terminal do VS Code, dentro da pasta do projeto:

``` powershell
npm run dev
```

Abra `http://localhost:3000`. Para encerrar o servidor, use `Ctrl+C` no
terminal.

A pasta principal do projeto é `passagem-servico-abm`. Não é necessário
recriar o projeto se ele já foi criado com sucesso.

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
