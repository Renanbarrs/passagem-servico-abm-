# Plano de implementação --- Passagem de Serviço ABM

O objetivo é avançar por etapas pequenas, verificáveis e didáticas. Não
construir todo o sistema em uma única alteração.

## Etapa 0 --- Ambiente e scaffold

**Status: concluída.** - Node.js, npm e Git instalados. - Projeto
Next.js criado com TypeScript, App Router e Tailwind. - `npm run dev`
iniciou e respondeu em `http://localhost:3000`.

Pendência técnica: revisar o aviso de vulnerabilidades com `npm audit`,
sem executar correções forçadas às cegas.

## Etapa 1 --- Entender e organizar o projeto

-   Inspecionar a estrutura e os arquivos atuais.
-   Confirmar os scripts disponíveis em `package.json`.
-   Preservar o scaffold que funciona.
-   Criar uma página inicial simples com navegação visual, sem banco e
    sem dados reais.
-   Usar o protótipo HTML v0.6 como referência visual e funcional.
-   Fazer uma alteração pequena por vez e testar.

**Pronto quando:** o projeto tiver uma estrutura clara e o usuário
entender onde ficam páginas, componentes, estilos e lógica.

## Etapa 2 --- Definir e validar o banco com dados fictícios

-   Escolher o provedor com o usuário e verificar a autorização
    necessária.
-   Criar o esquema inicial a partir de
    `MODELO_DE_DADOS_E_SEGURANCA.md`.
-   Versionar migrações.
-   Criar apenas dados fictícios para testes.
-   Validar relações entre passagens, viaturas, abastecimentos,
    categorias, ocorrências e auditoria.
-   Definir estratégia para anexos privados antes de salvar
    comprovantes.

**Pronto quando:** o banco puder guardar e recuperar uma passagem
fictícia e seus registros relacionados sem perder integridade.

## Etapa 3 --- Autenticação e permissões

-   Remover o login demonstrativo.
-   Implementar autenticação real.
-   Implementar os perfis aprovados.
-   Aplicar autorização no servidor e políticas no banco.
-   Testar acesso permitido e negado, inclusive por chamadas diretas.

**Pronto quando:** cada perfil só conseguir executar as ações
autorizadas.

## Etapa 4 --- Cadastros administrativos

-   Implementar lista de militares para Auxiliar e Condutor.
-   Implementar lista de oficiais sugeridos e entrada de oficial
    externo.
-   Implementar categorias de alterações.
-   Permitir ativar/desativar opções sem reescrever registros
    históricos.
-   Registrar auditoria de operações administrativas relevantes.

## Etapa 5 --- Fluxo de passagem

-   Construir o formulário em cinco etapas.
-   Salvar rascunhos no banco.
-   Validar datas, horários, hodômetros e campos obrigatórios.
-   Implementar viaturas, abastecimentos, comprovantes privados,
    alterações e providências.
-   Implementar a regra especial `Sem alteração`.
-   Implementar conferência e finalização transacional.

## Etapa 6 --- Histórico, filtros e PDFs

-   Implementar histórico e visualização detalhada.
-   Implementar filtros por período, viatura, categoria e texto.
-   Preservar o comportamento explícito `Aplicar filtros` e
    `Limpar filtros`.
-   Gerar PDF individual e relatórios de Viaturas, Abastecimentos e
    Alterações.
-   Testar filtros vazios, filtros combinados, datas inválidas e zero
    resultados.

## Etapa 7 --- Correções, auditoria e testes

-   Implementar correção administrativa com justificativa obrigatória.
-   Persistir autor, data, campo, valor anterior, novo valor e motivo.
-   Testar todas as regras de negócio.
-   Testar permissões, uploads, acesso aos comprovantes e recuperação
    após falha.
-   Testar backup e restauração.

## Etapa 8 --- Avaliação para uso real

-   Revisar segurança, privacidade, acessibilidade e logs.
-   Confirmar autorização institucional para hospedagem e dados.
-   Documentar operação, suporte, backup e recuperação.
-   Só então considerar um piloto com dados reais e autorização formal.

## Método de trabalho recomendado

Para cada tarefa: 1. Explicar o que será feito e por quê. 2. Listar os
arquivos que serão criados/alterados. 3. Implementar somente o escopo
combinado. 4. Executar os testes adequados. 5. Explicar o resultado e
como o usuário pode verificar. 6. Registrar decisões importantes na
documentação.
