# Instruções do Copilot --- Passagem de Serviço ABM

## Contexto obrigatório

Leia `README.md` e os documentos em `docs/` antes de propor alterações
relevantes. O Next.js atual é somente o scaffold inicial; as
funcionalidades do protótipo HTML ainda não foram migradas para ele. O
protótipo v0.6 é uma referência funcional, não uma implementação de
produção.

## Como trabalhar com o usuário

-   Responda em português brasileiro, com explicações claras e
    didáticas.
-   O usuário está aprendendo desenvolvimento e quer compreender o que
    está construindo, não apenas copiar código.
-   Trabalhe em etapas pequenas. Antes de alterar vários arquivos ou
    criar uma grande estrutura, explique o objetivo e o impacto.
-   Ao sugerir código, informe os caminhos exatos dos arquivos e
    explique o papel de cada um.
-   Dê comandos de terminal específicos para Windows PowerShell quando
    forem necessários.
-   Depois de uma mudança, indique como testar e o que deve aparecer se
    tudo estiver correto.
-   Se houver erro, peça ou analise a mensagem exata e investigue antes
    de sugerir uma solução destrutiva.
-   Não afirme que uma funcionalidade existe sem verificar o código
    atual.
-   Não sobrescreva arquivos, migrações ou configurações sem inspecionar
    seu conteúdo.
-   Não instale dependências ou faça mudanças amplas sem explicar por
    que são necessárias.

## Tecnologias e estrutura

-   Use Next.js App Router, React, TypeScript e Tailwind CSS já
    presentes no projeto.
-   PostgreSQL/Supabase são a arquitetura proposta, mas ainda não estão
    configurados. Não suponha que existam projeto, tabelas, credenciais
    ou políticas.
-   Separe interface, regras de negócio e acesso a dados. Evite colocar
    toda a lógica em um único componente.
-   Valide os dados no servidor. A validação no navegador serve para
    experiência do usuário, mas não substitui a validação do servidor.
-   Use migrações versionadas para alterações no banco.
-   Nunca coloque senhas, tokens ou chaves secretas no código, em
    arquivos versionados ou em variáveis `NEXT_PUBLIC_*`.
-   Nunca exponha a chave `service_role` do Supabase no navegador. O
    acesso deve ser protegido por autenticação, autorização e políticas
    RLS.
-   Não use `localStorage` como banco definitivo de passagens, pessoas,
    abastecimentos ou comprovantes.

## Regras de negócio que devem ser preservadas

1.  As viaturas fixas são `APS-112` (Ford Ka, gasolina) e `AR-99` (L200
    Triton, Diesel S10).
2.  A distância de uma viatura é `hodômetro final - hodômetro inicial`,
    somente quando os valores são válidos e o final não é inferior ao
    inicial.
3.  Se a viatura estiver `Operacional`, exigir hodômetro inicial,
    hodômetro final e nível do tanque. Se estiver `Baixada`, exigir
    justificativa nas observações.
4.  O hodômetro inicial pode ser sugerido a partir do último serviço
    finalizado, mas deve continuar editável e ser validado.
5.  Um serviço pode ter zero ou mais abastecimentos. Cada lançamento
    inclui viatura, data, horário, responsável, hodômetro, litros,
    valor, saldo informado e, quando disponível, foto do comprovante.
6.  Aceitar vírgula ou ponto como separador decimal e normalizar os
    valores antes de armazenar.
7.  O serviço deve conter ao menos uma ocorrência ou uma confirmação de
    `Sem alteração`.
8.  `Sem alteração` é uma opção especial e única. Ao confirmá-la, criar
    o registro com o texto exato `O serviço transcorreu sem alterações`,
    sem exigir horário ou descrição. Não permitir coexistência dessa
    confirmação com ocorrências reais.
9.  Categorias padrão do protótipo: `Viaturas`, `Patrimônio`, `Pessoal`,
    `Instalações`, `Instruções e atividades` e `Outros`. O administrador
    pode gerenciar categorias, mas não pode cadastrar uma segunda opção
    `Sem alteração`.
10. Oficiais sugeridos inicialmente: `1º TEN FELIPE`, `1º TEN VICTOR`,
    `1º TEN PADILHA`, `1º TEN LORENA`, `1º TEN JEAN` e `TCEL BRUNO`.
    Deve ser possível informar um oficial externo por texto.
11. A busca de Auxiliar e Condutor deve localizar nomes por trechos
    digitados. A lista administrável não deve alterar os nomes
    históricos de serviços já finalizados.
12. O rascunho pode ser editado pelo responsável antes de finalizar. A
    finalização exige conferência e validações.
13. Após a finalização, bloquear edição comum. Uma correção
    administrativa exige justificativa e registro de auditoria com
    autor, data, campo, valor anterior e novo valor.
14. Os filtros das páginas de relatórios começam sem período restritivo.
    As mudanças nos campos só afetam resultados e PDFs depois de
    `Aplicar filtros`. `Limpar filtros` restaura todo o histórico.
15. Relatórios de período devem refletir os filtros aplicados e indicar
    claramente quando não houver resultados. Se a data inicial for
    posterior à final, impedir a consulta até corrigir.
16. A seção MOP existe apenas como seção provisória independente; não
    inventar sua finalidade nem misturá-la às duas viaturas sem
    confirmação.

## Segurança e dados

-   Usar dados fictícios durante o desenvolvimento.
-   Não incluir nomes de efetivo, planilhas, comprovantes ou registros
    reais em exemplos, seeds, testes ou prompts externos.
-   Proteger comprovantes em armazenamento privado, validar o tipo e o
    tamanho dos arquivos e autorizar o acesso no servidor.
-   Nunca confiar apenas em um botão escondido ou em verificações do
    cliente para proteger funções administrativas.
-   Planejar políticas de acesso no servidor e no banco, logs de
    auditoria, backup e recuperação antes de qualquer uso real.
-   Não transformar uma demonstração em sistema oficial sem testes e
    autorização da ABM.

## Critérios de qualidade

-   Interface e mensagens em português brasileiro.
-   Valores monetários em BRL; datas e números apresentados em formato
    brasileiro.
-   Acessibilidade básica: rótulos, foco visível, mensagens de erro
    claras e navegação por teclado nas listas de sugestões.
-   Não inventar dados de exemplo como se fossem reais.
-   Antes de concluir uma tarefa, informar arquivos alterados, testes
    executados, resultado e próximos passos.
