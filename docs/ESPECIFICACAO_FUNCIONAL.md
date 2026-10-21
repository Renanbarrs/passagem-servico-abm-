# Especificação funcional --- Passagem de Serviço ABM

## 1. Objetivo e status

O sistema deve digitalizar a passagem diária de serviço da Academia de
Bombeiro Militar (ABM), reunindo os dados gerais do serviço, estado das
viaturas, hodômetros, abastecimentos, alterações, providências e
relatórios.

Esta especificação reúne comportamentos já exercitados nos protótipos
HTML até a versão v0.6. Ela descreve o comportamento esperado para a
nova aplicação; **não significa que as funcionalidades já existam no
projeto Next.js**.

## 2. Perfis e participantes

### Auxiliar de Dia

-   Inicia uma passagem e preenche os dados do serviço.
-   Registra os dados das viaturas, abastecimentos, alterações e
    providências.
-   Confere e finaliza a passagem.
-   Depois de finalizado, não pode editar livremente o registro.

### Administrador

-   Gerencia a lista de militares disponíveis para Auxiliar e Condutor.
-   Gerencia a lista de oficiais sugeridos.
-   Gerencia categorias de alterações.
-   Ativa ou desativa opções para novos registros.
-   Corrige passagens finalizadas mediante justificativa obrigatória e
    trilha de auditoria.

### Oficial de Dia e Condutor

No protótipo, são participantes identificados na passagem, não contas de
acesso independentes confirmadas. Não criar novos perfis de login para
eles sem uma decisão explícita.

## 3. Navegação e telas

### Visão geral

-   Exibe indicadores de passagens finalizadas, distância acumulada,
    abastecimentos e alterações.
-   Mostra as passagens recentes e acesso ao histórico.
-   Apresenta as duas viaturas fixas e seus últimos hodômetros finais.
-   Dados de demonstração devem ser claramente identificados como
    fictícios.

### Nova passagem

Fluxo em cinco etapas:

1.  **Dados gerais:** datas e horários de início/término, Oficial de
    Dia, Auxiliar de Dia e Condutor.
2.  **Viaturas:** condição, hodômetros, tanque e observações de cada
    viatura.
3.  **Abastecimentos:** zero ou mais lançamentos, com comprovantes
    opcionais.
4.  **Alterações:** ocorrências individuais ou confirmação especial de
    `Sem alteração`; também inclui providências por setor.
5.  **Conferência:** resumo de tudo, pendências e confirmação explícita
    de finalização.

Na navegação do formulário, etapas anteriores e já liberadas podem ser
abertas diretamente sem perder os dados preenchidos. Uma etapa futura só
é liberada depois da validação da etapa atual. Em telas pequenas, o
indicador de etapas pode ser rolado horizontalmente e deve permanecer
legível e utilizável por toque e teclado.

O protótipo salva o rascunho automaticamente no navegador. Na aplicação
final, o rascunho deve ser salvo no banco, associado ao usuário
autenticado e recuperável em outro dispositivo autorizado.

### Histórico

-   Lista passagens finalizadas.
-   Permite visualizar detalhes e consultar auditoria.
-   Permite gerar PDF individual.
-   Mudanças futuras na lista de militares/oficiais não devem reescrever
    os nomes registrados em passagens antigas.

### Viaturas e quilometragem

-   Filtra por intervalo de datas e viatura.
-   Mostra a distância por serviço, total do período e detalhamento por
    viatura.
-   Ignora medições inválidas no total e identifica registros sem
    distância válida.
-   Disponibiliza `Gerar PDF do período`.

### Abastecimentos

-   Lista lançamentos por data e viatura.
-   Mostra quantidade de abastecimentos, volume total, valor total e
    saldo informado.
-   Permite visualizar comprovantes quando existirem.
-   Disponibiliza `Gerar PDF do período`.

### Alterações

-   Filtra por intervalo de datas, categoria e palavra-chave.
-   Mostra resumo por categoria e histórico cronológico.
-   Inclui a categoria especial `Sem alteração`.
-   Disponibiliza `Gerar PDF do período`.

### Administração

-   Adiciona, edita e ativa/desativa militares e oficiais para
    sugestões.
-   Adiciona e ativa/desativa categorias.
-   Não permite duplicar a categoria especial `Sem alteração`.
-   Permite corrigir campos autorizados de passagens finalizadas com
    justificativa e auditoria.
-   Atualizar uma lista não altera os nomes históricos salvos na
    passagem.

## 4. Dados gerais da passagem

Campos do serviço: - Data inicial e horário inicial. - Data final e
horário final. - Oficial de Dia. - Auxiliar de Dia. - Condutor. -
Situação do registro: rascunho ou finalizado. - Data/hora de criação,
atualização e finalização. - Providências por setor: Frota, Patrimônio e
Pessoal. - Seção MOP provisória, independente, com nível informado e
observações.

Validações: - Campos gerais obrigatórios precisam ser preenchidos. - A
data final não pode ser anterior à data inicial. - Se início e término
ocorrerem na mesma data, o horário final não pode ser anterior ao
inicial. - A finalização exige confirmação explícita após a tela de
conferência.

## 5. Viaturas

Viaturas fixas: - `APS-112` --- Ford Ka --- gasolina. - `AR-99` --- L200
Triton --- Diesel S10.

Campos por viatura e passagem: - Situação: `Operacional` ou `Baixada`. -
Hodômetro inicial. - Hodômetro final. - Nível do tanque. - Observações.

Opções de nível de tanque usadas no protótipo: - `CHEIO` - `↑ 3/4` -
`3/4` - `↓ 3/4` - `2/4 (meio)` - `1/4`

Regras: - O hodômetro inicial pode ser sugerido pelo último registro
finalizado da mesma viatura, mas deve ser editável. - Para viatura
operacional, exigir hodômetro inicial, hodômetro final e nível do
tanque. - O hodômetro final não pode ser menor que o inicial. - Para
viatura baixada, exigir o motivo nas observações. - Distância =
hodômetro final − hodômetro inicial, desde que os dois valores sejam
válidos. - A distância do período é a soma das distâncias válidas dos
serviços finalizados no intervalo selecionado.

## 6. Abastecimentos

Um serviço pode ter nenhum, um ou vários abastecimentos. É possível
registrar mais de um por viatura.

Campos por abastecimento: - Viatura. - Data. - Horário. - Responsável. -
Hodômetro no abastecimento. - Volume em litros. - Valor em reais. -
Saldo informado em reais. - Foto do comprovante, quando disponível.

Regras: - Volume, valor, saldo e hodômetro devem ser numéricos e não
negativos. - Aceitar vírgula ou ponto como separador decimal,
normalizando antes de salvar. - O hodômetro do abastecimento deve ser
coerente com os hodômetros inicial/final da viatura no serviço quando
esses valores estiverem disponíveis. - A foto é opcional no protótipo,
mas o sistema deve indicar claramente quando não há comprovante. - No
sistema final, o arquivo deve ficar em armazenamento privado e o banco
deve guardar apenas metadados e a referência segura do arquivo; não usar
`localStorage` como armazenamento definitivo. - O protótipo reduz a
imagem para demonstração. Os limites e formatos finais devem ser
definidos e validados no servidor.

Na aplicação Next.js em desenvolvimento, a etapa permite adicionar e
remover lançamentos temporários. O formulário de um novo lançamento fica
visível desde a abertura da etapa; após validação e adição, o resumo
aparece abaixo do formulário. O responsável deve ser selecionado pela
busca usando a mesma lista de militares de Auxiliar e Condutor. Valores
decimais aceitam vírgula ou ponto durante a digitação e são padronizados
para vírgula ao sair do campo. O hodômetro é conferido com o intervalo
da viatura quando disponível. O comprovante pode ser selecionado apenas
para demonstração; não é enviado nem armazenado.

## 7. Alterações e confirmação de ausência

Categorias iniciais: - `Viaturas` - `Patrimônio` - `Pessoal` -
`Instalações` - `Instruções e atividades` - `Outros`

Cada ocorrência real deve registrar categoria, data/horário quando
aplicável e descrição livre.

### Regra especial `Sem alteração`

-   É uma opção fixa do sistema.
-   Não exige horário nem descrição digitados pelo usuário.
-   Ao confirmar, gera automaticamente o texto exato:
    `O serviço transcorreu sem alterações`.
-   Não pode coexistir com ocorrências reais na mesma passagem.
-   Se houver ocorrências reais, o usuário deve removê-las antes de
    confirmar `Sem alteração`.
-   Se a ausência de alterações tiver sido confirmada e depois for
    necessário registrar uma ocorrência, remover primeiro a confirmação.
-   A passagem não pode ser finalizada sem pelo menos uma ocorrência ou
    essa confirmação.
-   O administrador não pode criar uma segunda categoria chamada
    `Sem alteração`.

## 8. Filtros e relatórios PDF

Relatórios previstos: 1. PDF de uma passagem individual. 2. PDF do
período para Viaturas. 3. PDF do período para Abastecimentos. 4. PDF do
período para Alterações.

Regras dos filtros: - Inicialmente, não restringir o histórico por
datas. - Campos de filtro só alteram os resultados depois de clicar em
`Aplicar filtros`. - `Limpar filtros` restaura o histórico completo. -
Os PDFs devem refletir exatamente os filtros aplicados. - Se a data
inicial for posterior à final, informar o erro e não gerar o
relatório. - Se nenhum registro corresponder aos filtros, o PDF deve
informar que não foram encontrados resultados; não inventar dados. - O
PDF individual deve incluir dados gerais, viaturas, abastecimentos,
alterações, providências, seção MOP e auditoria, além de comprovantes
disponíveis conforme as permissões. - Os protótipos usam a janela de
impressão do navegador e dependem do usuário selecionar "Salvar como
PDF". A estratégia de geração do PDF na aplicação final ainda precisa
ser escolhida.

## 9. Correções e auditoria

-   A passagem finalizada fica bloqueada para edição comum.
-   O administrador escolhe um campo autorizado, visualiza o valor
    atual, informa o novo valor e fornece justificativa obrigatória.
-   A correção deve registrar autor, data/hora, campo, valor anterior,
    valor novo e justificativa.
-   A auditoria deve ser persistente e não pode depender somente do
    navegador.
-   Alterações de cadastro de militares, oficiais ou categorias não
    podem modificar registros históricos.
-   As permissões devem ser verificadas no servidor e no banco, não
    apenas escondendo botões na interface.

## 10. Critérios de aceite principais

-   Não finalizar uma passagem com campos obrigatórios pendentes.
-   Não aceitar hodômetro final menor que o inicial.
-   Não permitir coexistência de `Sem alteração` com ocorrências reais.
-   Calcular corretamente distâncias por viatura e período.
-   Permitir múltiplos abastecimentos e guardar metadados dos
    comprovantes.
-   Pesquisar militares/oficiais por trechos de texto e permitir
    navegação por teclado nas sugestões.
-   Permitir oficial externo digitado livremente.
-   Manter os nomes históricos quando os cadastros forem alterados.
-   Aplicar e limpar filtros conforme descrito.
-   Gerar os quatro tipos de relatório previstos.
-   Exigir justificativa e registrar auditoria para correções
    administrativas.
-   Impedir que usuários sem permissão acessem dados ou ações
    administrativas.
-   Não usar dados reais até que o sistema seja autorizado, protegido e
    testado.
