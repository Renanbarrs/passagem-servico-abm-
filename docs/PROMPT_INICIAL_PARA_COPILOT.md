# Prompt para iniciar uma tarefa com o Copilot

Leia `README.md`, `.github/copilot-instructions.md` e os documentos em
`docs/` antes de propor alterações relevantes.

Estou desenvolvendo o Portal ABM com orientação de IA e quero aprender
como o sistema é construído. Trabalhe em etapas pequenas, explique as
decisões em português brasileiro e informe os caminhos dos arquivos
envolvidos.

## Contexto do projeto

-   A aplicação usa Next.js App Router, React, TypeScript e Tailwind.
-   O Portal v0.8 é a referência visual e organizacional atual; o
    protótipo v0.6 permanece referência funcional da Passagem de
    Serviço.
-   A aplicação Next.js já tem início, shell responsivo e os passos de
    Dados Gerais, Viaturas e Abastecimentos na rota `/nova-passagem`.
-   O QIS tem um fluxo demonstrativo de rascunho e versões armazenados
    no `localStorage`; a troca de perfil não autentica ninguém. QIS
    oficial, Avisos e Determinações e etapas restantes ainda não foram
    implementados.
-   Escalas tem calendário mensal e designações demonstrativas no
    `localStorage`; a troca de perfil não autentica ninguém. A data
    inicial da Nova Passagem consulta a designação como sugestão
    editável, sem atualizar dados já copiados para uma passagem.
-   Avisos e Determinações tem mural, filtros e publicação
    demonstrativos locais; a seleção de anexo não envia nem guarda o
    arquivo.
-   Os dados da aplicação são temporários. Não há banco, autenticação,
    autorização de servidor ou armazenamento de anexos configurados.
-   Os únicos perfis previstos são `Usuário da ABM` e `Administrador`.
    Qualquer usuário pode publicar avisos e determinações oficiais.
-   Campos de Oficial, militar, autor ou responsável devem selecionar
    pessoas do cadastro mestre de militares, filtradas conforme a função.
    Preserve o nome como snapshot histórico; texto de Oficial externo é
    exceção exclusiva do campo Oficial de Dia da Passagem.
-   Use somente dados fictícios.

## Como trabalhar

1.  Inspecione os arquivos atuais relacionados à tarefa antes de editá-los.
2.  Explique brevemente objetivo, impacto e arquivos a alterar antes de
    mudanças amplas.
3.  Preserve a rota existente de Nova passagem e suas regras de negócio.
4.  Não implemente banco, login, autenticação nem dados fictícios que
    pareçam operacionais sem que isso faça parte do escopo combinado.
5.  Não instale dependências sem necessidade justificada.
6.  Ao concluir, informe arquivos alterados, testes executados,
    resultado e como validar no navegador.
