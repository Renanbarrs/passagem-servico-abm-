# Especificação funcional --- Portal ABM

## 1. Objetivo e estado

O Portal ABM deve reunir a Passagem de Serviço e os módulos internos de
QIS, Escalas de Serviço e Avisos e Determinações.

O protótipo HTML v0.8 é a referência visual e de organização atual do
portal. O protótipo v0.6 continua como referência funcional da Passagem
de Serviço. Esta especificação descreve o comportamento esperado; não
significa que todas as funcionalidades existam no projeto Next.js.

A aplicação Next.js atualmente tem página inicial, shell de navegação,
uma área de QIS com edição demonstrativa de rascunhos e Passagem de
Serviço com Dados Gerais, Viaturas, Abastecimentos, Alterações e
providências temporárias por setor. A conferência exibe um resumo,
permite retornar às etapas e concluir somente uma demonstração local,
sem persistir dados; a finalização oficial ainda não está implementada.
A rota Escalas de Serviço tem calendário e
designações demonstrativas, que também podem preencher sugestões na data
inicial da passagem. O mural de Avisos e Determinações oferece
publicações demonstrativas. QIS, Escalas e Avisos usam somente
armazenamento local do navegador; não há banco, autenticação,
autorização real, upload de arquivos ou PDFs integrados.

## 2. Perfis e participantes

O portal tem somente dois perfis de acesso:

### Usuário da ABM

-   Consulta QIS e histórico publicado.
-   Consulta escalas e o mural.
-   Inicia e preenche uma passagem e consulta histórico e relatórios
    conforme as permissões institucionais aprovadas.
-   Pode publicar avisos e determinações oficiais.

### Administrador

-   Gerencia cadastros administrativos, militares e oficiais.
-   Gerencia designações das escalas.
-   Cria, edita, revisa e publica versões do QIS.
-   Corrige passagens finalizadas mediante justificativa e auditoria.

Oficial de Dia, Auxiliar de Dia, Condutor e responsáveis por
abastecimentos, QIS e publicações são militares da ABM cadastrados no
sistema, não perfis de acesso adicionais. Campos de nomes/responsáveis
devem oferecer busca na lista de militares. A lista pode ser filtrada
pela função: Oficiais para Oficial de Dia e praças para Auxiliar,
Condutor e responsável pelo abastecimento; campos gerais de
responsabilidade/publicação podem consultar todos os militares. Nome
selecionado deve ser copiado para o registro histórico. Oficial externo
continua permitido somente no campo de Oficial de Dia, conforme regra
específica. O seletor de perfis do protótipo é demonstrativo e não
representa autenticação ou autorização reais. Não criar perfis
adicionais de publicador, Auxiliar ou Condutor.

## 3. Navegação e início

-   Navegação principal: Início, QIS, Escalas de Serviço, Avisos e
    Determinações e grupo expansível de Passagem de Serviço.
-   Grupo Passagem: Nova passagem, Histórico, Viaturas, Abastecimentos,
    Alterações e Administração.
-   Indicar a seção ativa e adaptar a navegação a celular e computador.
-   Administração é uma área do administrador. Ocultar uma opção na
    interface não substitui autorização no servidor.
-   O início pode mostrar resumos de passagens finalizadas, QIS
    disponíveis, escala de hoje e publicações ativas quando existirem
    dados disponíveis. Não apresentar valores fictícios como indicadores
    oficiais; identificar dados demonstrativos.

## 4. QIS

-   A tela de consulta disponível atualmente demonstra apenas o formato
    semanal com conteúdo fictício claramente identificado; não exibe
    QIS oficial nem importa os PDFs usados como referência.
-   A tela oferece alternância de perfil apenas para demonstração:
    Usuário da ABM consulta versões publicadas; a simulação de
    Administrador pode criar e editar rascunhos. Essa alternância não é
    autenticação nem proteção de acesso.
-   Cada QIS guarda período inicial/final, responsável e linhas de
    horário compartilhadas pelos cinco dias úteis. Cada linha contém
    uma célula de atividade por dia, com tema, uniforme, local,
    frente/responsável e observações.
-   Os tipos do QIS e a interface de `QisRepository` estão separados da
    tela. `LocalStorageQisRepository` salva os dados somente no
    navegador, para teste; uma futura implementação poderá substituir
    esse adaptador pelo banco sem concentrar persistência na interface.
-   A demonstração permite salvar rascunhos e publicar snapshots locais.
    Pede apenas um nome fictício de PDF terminado em `.pdf`; não recebe o
    arquivo, não valida assinatura e não publica um QIS oficialmente.
-   Editar um QIS já publicado cria uma revisão em rascunho e preserva
    as versões publicadas anteriores.
-   Exibir e editar a rotina semanal diretamente em uma tabela HTML no
    portal, com horários nas linhas e segunda a sexta nas colunas.
    Em telas estreitas, a tabela deve rolar horizontalmente dentro do
    próprio contêiner, sem alargar a página.
-   O administrador pode criar QIS a partir de modelo, editar período e
    responsável, salvar rascunho e adicionar, remover ou reordenar
    linhas de horário. O modelo demonstrativo inicia com as faixas
    09h–10h30, 10h45–12h, 12h–13h (intervalo), 13h–15h e 15h–17h; deve
    ser possível inserir, por exemplo, uma faixa extra 07h30–09h.
-   O período deve ser sempre uma semana completa, de segunda a
    sexta-feira. Ao criar um QIS, sugerir a semana atual; ao escolher
    qualquer dia em um calendário mensal, destacar os dias úteis da
    semana correspondente e ajustar o período para a segunda e a
    sexta-feira. Não permitir salvar rascunho ou publicar período fora
    dessa regra. As opções de consulta devem mostrar o intervalo completo
    (segunda a sexta) de cada QIS publicado.
-   Não permitir dois registros independentes de QIS para a mesma semana.
    Ao encontrar um período ocupado, informar que já existe QIS e oferecer
    abrir o registro existente ou selecionar outra semana. Edições e novas
    versões do mesmo registro permanecem permitidas; os snapshots
    publicados anteriores não devem ser substituídos.
-   Cada célula de atividade pode editar tema, uniforme, local,
    frente/responsável e observações. Tema, uniforme, local e
    frente/responsável oferecem sugestões genéricas selecionáveis, sem
    impedir texto livre; observações continuam livres. As sugestões não
    devem ser interpretadas como programação oficial.
-   O responsável pelo QIS deve ser selecionado na lista de militares
    cadastrados; o rascunho não salva nome fora da lista e a versão
    publicada guarda o nome como snapshot.
-   O intervalo é uma linha especial compartilhada visualmente pelos
    cinco dias. Os horários e conteúdos pré-preenchidos são editáveis e
    servem somente como modelo fictício.
-   O sistema pode gerar minuta para assinatura, mas não simula nem
    valida assinatura oficial.
-   Na aplicação oficial, o administrador deve anexar o PDF assinado
    antes de publicar; sem arquivo real e autorização no servidor,
    bloquear a publicação. A simulação atual não satisfaz esse requisito.
-   Uma alteração publicada cria uma nova versão e preserva a rotina e
    o arquivo anteriores. O PDF assinado é complementar e nunca
    substitui a rotina visível no portal.
-   Permitir expandir semanas anteriores para consulta do histórico
    quando houver QIS publicados. Até a integração desses dados, exibir
    estado vazio sem inventar histórico.

## 5. Escalas de Serviço

-   Exibir calendário mensal compacto.
-   Ao selecionar uma data, mostrar Oficial de Dia, Auxiliar de Dia,
    Condutor e observações.
-   Na interface atual, o administrador seleciona a data e cadastra,
    altera ou limpa designações manualmente; o motor independente ainda
    não está ligado a esta tela.
-   Um motor Python independente em `escala-engine/` está sendo
    desenvolvido com OR-Tools CP-SAT e JSON para gerar prévias de
    Auxiliar e Condutor usando somente dados fictícios. Ele não está
    conectado à tela, ao calendário, a um backend nem a um banco.
-   O Oficial de Dia permanece manual, selecionado entre oficiais
    cadastrados no Portal; ele não faz parte do problema de otimização.
-   A primeira fase formaliza a justiça total e por função conforme os
    pesos definidos; concentração, intervalos preferenciais e bônus de
    retorno permanecem pendentes de definição matemática. Venda e
    permuta separam crédito original da execução efetiva: o crédito de
    justiça não muda e o descanso considera quem serviu.
-   A integração futura exige backend autorizado, confirmação
    administrativa, persistência e publicação explícita no calendário.
-   Na demonstração Next.js, a rota `/escalas` guarda designações
    fictícias no `localStorage` deste navegador e oferece alternância de
    perfil exclusivamente para testar as telas. Isso não é autenticação
    ou autorização real.
-   Os campos de participantes da demonstração usam opções fictícias já
    existentes e preservam seus nomes como snapshots textuais por data.
-   Na passagem, buscar designações pela data inicial e preencher
    sugestões editáveis. Quando não houver escala, informar isso e
    manter os campos editáveis.
-   Se a data inicial mudar antes de iniciar/continuar a passagem,
    atualizar a sugestão. Copiar os nomes para a passagem iniciada;
    alterações posteriores no calendário não modificam registros
    históricos.

## 6. Avisos e Determinações

-   Abrir diretamente o mural de publicações em `/avisos`; abrir o
    formulário somente após ação explícita de adicionar publicação.
-   Exibir tipo, categoria, título, texto, autor, data de publicação,
    validade e anexos quando existirem.
-   Permitir fixar publicações, pesquisar e filtrar por tipo; ordenar
    por fixadas e recentes.
-   O formulário oferece Aviso ou Determinação oficial, título, texto,
    categoria, validade e anexo.
-   O responsável/autor da publicação deve ser selecionado na lista de
    militares cadastrados. O nome selecionado deve permanecer como
    snapshot histórico, mesmo que o cadastro seja alterado depois; texto
    livre que não corresponda a militar cadastrado não pode ser publicado.
-   A demonstração Next.js guarda os avisos e determinações no
    `localStorage` deste navegador; permite criar, editar, excluir e
    fixar publicações criadas na própria demonstração. O acesso é aberto
    para teste e não representa autorização real.
-   A seleção de arquivo no protótipo apenas demonstra o campo: o
    conteúdo não é enviado ou guardado. A validação real de arquivo,
    armazenamento privado e autorização devem ser implementados no
    servidor antes de uso real.
-   Enquanto a política de histórico não for definida, publicações cuja
    validade terminou continuam no mural com indicação visual de
    validade encerrada.
-   Qualquer usuário pode publicar qualquer um dos dois tipos. Essa
    regra substitui textos antigos do protótipo que restrinjam a
    publicação de determinações a usuários autorizados.
-   O usuário pode editar ou excluir as próprias publicações conforme
    regras aprovadas. A autorização de ações sobre publicações de
    terceiros precisa ser aplicada no servidor.
-   Ao cancelar a criação, retornar ao mural; após publicar, atualizar a
    lista.
-   A política de histórico para publicações expiradas ainda precisa
    ser decidida antes da persistência definitiva.

## 7. Nova Passagem de Serviço

O fluxo previsto tem cinco etapas:

1.  **Dados gerais:** datas e horários de início/término, Oficial de
    Dia, Auxiliar de Dia e Condutor.
2.  **Viaturas:** condição, hodômetros, tanque e observações de cada
    viatura.
3.  **Abastecimentos:** zero ou mais lançamentos, com comprovantes
    opcionais.
4.  **Alterações e providências:** ocorrências, confirmação de
    `Sem alteração` e campos opcionais por setor estão disponíveis
    temporariamente no navegador.
5.  **Conferência e finalização:** resumo e indicação de pendências estão
    disponíveis temporariamente; a confirmação conclui somente uma
    demonstração local, sem persistir ou finalizar oficialmente.

Etapas anteriores já liberadas podem ser abertas sem perder os dados;
uma etapa futura só é liberada após validação da etapa anterior. Em
telas pequenas, o indicador de etapas pode rolar horizontalmente e deve
permanecer legível e utilizável por toque e teclado.

O rascunho poderá ser editado pelo responsável antes de finalizar. Na
aplicação final, deve ser persistido no banco e recuperável em outro
dispositivo autorizado. A finalização exige conferência, validações e
confirmação explícita.

### Dados gerais

-   Registrar data e horário iniciais e finais, Oficial de Dia,
    Auxiliar de Dia e Condutor.
-   Exigir datas e horários válidos no formato do formulário.
-   Data final não pode anteceder a inicial; no mesmo dia, horário final
    não pode anteceder o inicial.
-   Os nomes podem ser sugeridos pela escala, mas são cópias editáveis
    da passagem.
-   Oficial externo pode ser informado por texto.

### Viaturas

-   Viaturas fixas: `APS-112` (Ford Ka, gasolina) e `AR-99` (L200
    Triton, Diesel S10).
-   Registrar situação (`Operacional` ou `Baixada`), hodômetro inicial
    e final, nível do tanque e observações.
-   Operacional exige os dois hodômetros e nível do tanque. Baixada
    exige justificativa nas observações.
-   Hodômetro final não pode ser menor que inicial. Distância é final
    menos inicial somente quando ambos forem inteiros não negativos e
    representáveis com segurança.
-   Hodômetro inicial pode ser sugerido do último serviço finalizado,
    mas continua editável e deve ser validado.
-   Opções de tanque do protótipo: `CHEIO`, `↑ 3/4`, `3/4`, `↓ 3/4`,
    `2/4 (meio)` e `1/4`.

### Abastecimentos

-   Um serviço pode ter zero ou mais abastecimentos, inclusive mais de
    um por viatura.
-   Cada lançamento registra viatura, data, horário, responsável,
    hodômetro, litros, valor em reais, saldo informado e foto opcional
    do comprovante.
-   Responsável é selecionado por busca na mesma lista de militares do
    Auxiliar e Condutor conforme elegibilidade definida no cadastro. A
    opção deve corresponder a um militar registrado, não a texto livre.
-   Valores numéricos não podem ser negativos. Aceitar vírgula ou ponto
    decimal ao digitar, normalizar antes de armazenar e apresentar
    formato brasileiro.
-   Hodômetro do abastecimento deve ser coerente com o intervalo da
    viatura quando disponível.
-   Data e horário do abastecimento devem ser válidos e estar dentro do
    período da passagem. A conferência deve revalidar período e
    hodômetro caso os dados gerais ou da viatura mudem depois do
    lançamento.
-   Comprovantes devem ficar em armazenamento privado na aplicação
    final. Validar formato e tamanho no servidor e guardar no banco
    apenas metadados e referência segura.
-   Na aplicação atual, o formulário de lançamento permanece visível
    enquanto a etapa está aberta; após validação e adição, o resumo do
    abastecimento aparece abaixo. A seleção de comprovante é somente
    demonstrativa: não envia nem armazena o arquivo.

### Alterações, providências e MOP

-   Na demonstração Next.js, a etapa Alterações aceita ocorrências com
    categoria, data e horário opcionais e descrição; permite remover
    lançamentos. A confirmação de `Sem alteração` gera o texto exato
    `O serviço transcorreu sem alterações` e não pode coexistir com
    ocorrências. Os dados não são persistidos.
-   A demonstração também oferece campos opcionais de providências para
    Frota, Patrimônio e Pessoal. A seção começa recolhida e pode ser
    expandida pelo título; usa o controle nativo de detalhes, acessível
    por mouse e teclado. Os dados não são persistidos.
-   A etapa de conferência Next.js mostra dados gerais, viaturas,
    abastecimentos, alterações e providências, com atalhos para voltar
    às etapas de edição e revalidação das regras obrigatórias. Não salva
    a passagem.
-   Quando as validações obrigatórias estão atendidas, a demonstração
    permite solicitar a conclusão e exige uma segunda confirmação. Após
    concluir, bloqueia a edição nesta sessão e informa que os dados não
    foram salvos e serão perdidos ao sair/recarregar. Isso não é
    finalização oficial.
-   Persistência e trilha de auditoria ainda não estão implementadas na
    aplicação Next.js.
-   Categorias padrão: `Viaturas`, `Patrimônio`, `Pessoal`,
    `Instalações`, `Instruções e atividades` e `Outros`.
-   Cada ocorrência real registra categoria, data/horário quando
    aplicável e descrição. Datas e horários informados devem ser válidos.
-   `Sem alteração` é opção especial única: ao confirmar, criar texto
    exato `O serviço transcorreu sem alterações`, sem exigir horário ou
    descrição.
-   Não permitir coexistência de `Sem alteração` e ocorrências reais.
    A passagem exige ao menos uma ocorrência ou essa confirmação.
-   Administrador não pode cadastrar segunda opção `Sem alteração`.
-   Preservar providências por setor.
-   MOP existe apenas como seção provisória independente; não inventar
    sua finalidade nem misturá-la às viaturas sem confirmação.

## 8. Histórico, relatórios e correções

-   Preservar histórico, visualização detalhada e PDF individual.
-   Preservar relatórios por período de Viaturas/quilometragem,
    Abastecimentos e Alterações.
-   Filtros começam sem restrição de período; alterações nos campos só
    afetam resultados e PDFs depois de `Aplicar filtros`.
    `Limpar filtros` restaura o histórico completo.
-   Se data inicial for posterior à final, impedir consulta e informar
    o erro. Indicar claramente quando não houver resultados. PDFs devem
    refletir os filtros aplicados, sem inventar dados.
-   PDF individual inclui dados gerais, viaturas, abastecimentos,
    alterações, providências, seção MOP e auditoria, além de
    comprovantes disponíveis conforme permissões.
-   Estratégia de geração de PDFs para a aplicação final ainda precisa
    ser escolhida.
-   Após finalização, bloquear edição comum. Correção administrativa
    exige justificativa e registra autor, data/hora, campo, valor
    anterior e novo valor em trilha persistente de auditoria.
-   Mudanças em listas administráveis não podem reescrever nomes ou
    registros históricos.

## 9. Persistência e segurança

-   Protótipos usam armazenamento local e dados demonstrativos; não são
    persistência compartilhada ou segurança de produção.
-   PostgreSQL/Supabase são possibilidades em avaliação; banco,
    autenticação, autorização, armazenamento de arquivos e hospedagem
    não estão configurados.
-   Definir e testar arquitetura com dados fictícios por etapas antes
    do salvamento definitivo.
-   Separar interface, regras de negócio e acesso a dados; validar no
    servidor e no banco. Não confiar apenas em controles do navegador.
-   Proteger arquivos em armazenamento privado, validar tipo e tamanho,
    e autorizar acesso no servidor.
-   Antes de uso real, revisar permissões, logs de auditoria, backup,
    recuperação, privacidade e autorização institucional.
-   Usar somente dados fictícios até que o sistema seja autorizado,
    protegido e testado.
