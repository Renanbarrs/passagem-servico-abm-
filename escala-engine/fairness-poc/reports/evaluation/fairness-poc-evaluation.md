# Avaliação de desempenho e robustez da PoC

Execução somente na prova de conceito independente; o motor principal não foi alterado.

- Período iniciado em 2026-10-01.
- Limite por execução: benchmarks 20.0 s; casos de justiça 10.0 s; sensibilidade 30.0 s.
- Tolerância de gap: 0.0001; máximo de 120 iterações por fase.
- Equipes de benchmark: 14/18/28 habilitados para ambas as funções + 2 somente Auxiliar.
- Python 3.14.10; OR-Tools 9.15.6755; CVXPY 1.9.3; CLARABEL 0.11.1; pricing HIGHS; configuração CP-SAT 1 worker(s); seed 20261105; mestre primário/secundário CLARABEL/CLARABEL; semente fixa.

O status `OPTIMAL` significa que o solver de pricing selecionado encerrou o subproblema inteiro com bound global coincidente para os coeficientes atuais. Isso não prova sozinho a otimalidade do problema mestre: também é necessário fechar o gap global da geração de colunas e certificar o mestre convexo. `FEASIBLE` nunca é usado como prova.

## Benchmarks

| Militares | Dias | Tempo (s) | Colunas | Iter. total/funções | Mestre total/funções | Pricing total/funções | Encerramento total/funções | Gap total | Gap funções | Certificação total/funções | Certificado viável |
|---:|---:|---:|---:|---|---|---|---|---:|---:|---|---|
| 16 | 10 | 11.25 | 180 | 60/120 | optimal/optimal | OPTIMAL/OPTIMAL | gap_tolerance/max_iterations | 8.82e-05 | 0.0505 | True/False | True |
| 20 | 10 | 16.00 | 179 | 59/120 | optimal/optimal | OPTIMAL/OPTIMAL | gap_tolerance/max_iterations | 9.86e-05 | 119 | True/False | True |
| 30 | 10 | 18.34 | 177 | 57/120 | optimal/optimal | OPTIMAL/OPTIMAL | gap_tolerance/max_iterations | 8.68e-05 | 88.6 | True/False | True |
| 16 | 20 | 20.26 | 182 | 77/105 | optimal/optimal | OPTIMAL/OPTIMAL | gap_tolerance/time_limit | 9.09e-05 | 59 | True/False | True |
| 20 | 20 | 20.23 | 155 | 78/77 | optimal/optimal | OPTIMAL/OPTIMAL | gap_tolerance/time_limit | 9.11e-05 | 313 | True/False | True |
| 30 | 20 | 20.48 | 98 | 76/22 | optimal/optimal | OPTIMAL/OPTIMAL | gap_tolerance/time_limit | 8.08e-05 | 211 | True/False | True |

## Casos adicionais de justiça

| Caso | Equipe | Dias | Tempo (s) | Total esperado | Gap total | Certificação total/funções | Certificado viável |
|---|---:|---:|---:|---:|---:|---|---|
| scenario-1 | 16 | 10 | 10.15 | 20.000000 | 8.82e-05 | True/False | True |
| scenario-3 | 16 | 10 | 10.79 | 20.000000 | 8.84e-05 | True/False | True |
| vacation-start | 16 | 10 | 9.72 | 20.000000 | 8.06e-05 | True/False | True |
| vacation-middle | 16 | 10 | 9.79 | 20.000000 | 9.78e-05 | True/False | True |
| vacation-end | 16 | 10 | 8.83 | 20.000000 | 8.7e-05 | True/False | True |
| scenario-4 | 17 | 10 | 10.15 | 20.000000 | 8.27e-05 | True/False | True |
| very-reduced-availability | 16 | 10 | 10.16 | 20.000000 | 7.42e-05 | True/False | True |
| history-blocks-start | 16 | 10 | 10.08 | 20.000000 | 8.19e-05 | True/False | True |
| scenario-2 | 10 | 10 | 1.84 | 20.000000 | 7.24e-05 | True/True | True |
| ratio-8-dual-8-aux-only | 16 | 10 | 10.11 | 20.000000 | 0.000299 | False/False | True |
| ratio-2-dual-14-aux-only | 16 | 10 | 0.00 | inviável | n/a | não certificado | False |

## Expectativas individuais por função

### scenario-1 — 14 habilitados para ambas, 2 somente Auxiliar

| Militar | E(Auxiliar) | E(Condutor) | E(total) |
|---|---:|---:|---:|
| D01 | 0.534748869 | 0.715279970 | 1.250028839 |
| D02 | 0.534939038 | 0.715091092 | 1.250030130 |
| D03 | 0.534948575 | 0.715080480 | 1.250029055 |
| D04 | 0.540661136 | 0.709368970 | 1.250030107 |
| D05 | 0.534088635 | 0.715944063 | 1.250032698 |
| D06 | 0.534043279 | 0.715986493 | 1.250029772 |
| D07 | 0.535168373 | 0.714860636 | 1.250029009 |
| D08 | 0.535719308 | 0.714312880 | 1.250032188 |
| D09 | 0.536745796 | 0.713284576 | 1.250030372 |
| D10 | 0.535567781 | 0.714462502 | 1.250030283 |
| D11 | 0.534901302 | 0.715130271 | 1.250031573 |
| D12 | 0.534477376 | 0.715553895 | 1.250031271 |
| D13 | 0.538747740 | 0.711281377 | 1.250029117 |
| D14 | 0.535669894 | 0.714362795 | 1.250032689 |
| A01 | 1.249786419 | 0.000000000 | 1.249786419 |
| A02 | 1.249786478 | 0.000000000 | 1.249786478 |

### scenario-3 — 14 habilitados para ambas, 2 somente Auxiliar

| Militar | E(Auxiliar) | E(Condutor) | E(total) |
|---|---:|---:|---:|
| D01 | 0.575024993 | 0.716667586 | 1.291692580 |
| D02 | 0.575978208 | 0.715715318 | 1.291693526 |
| D03 | 0.576801103 | 0.714894846 | 1.291695948 |
| D04 | 0.578000092 | 0.713691973 | 1.291692065 |
| D05 | 0.577459592 | 0.714231616 | 1.291691207 |
| D06 | 0.577562437 | 0.714128455 | 1.291690893 |
| D07 | 0.575969466 | 0.715723387 | 1.291692853 |
| D08 | 0.576832249 | 0.714864177 | 1.291696426 |
| D09 | 0.579930163 | 0.711764131 | 1.291694294 |
| D10 | 0.578290368 | 0.713403803 | 1.291694171 |
| D11 | 0.577573151 | 0.714121129 | 1.291694280 |
| D12 | 0.577222681 | 0.714470237 | 1.291692918 |
| D13 | 0.577064048 | 0.714630149 | 1.291694197 |
| D14 | 0.579999091 | 0.711693192 | 1.291692283 |
| A01 | 1.291416043 | 0.000000000 | 1.291416043 |
| A02 | 0.624876314 | 0.000000000 | 0.624876314 |

### scenario-4 — 15 habilitados para ambas, 2 somente Auxiliar

| Militar | E(Auxiliar) | E(Condutor) | E(total) |
|---|---:|---:|---:|
| D01 | 0.518680920 | 0.694586176 | 1.213267095 |
| D02 | 0.519422728 | 0.693841132 | 1.213263859 |
| D03 | 0.526352172 | 0.686912269 | 1.213264441 |
| D04 | 0.525470669 | 0.687794917 | 1.213265587 |
| D05 | 0.524994722 | 0.688267159 | 1.213261881 |
| D06 | 0.521877961 | 0.691386784 | 1.213264745 |
| D07 | 0.523238432 | 0.690031054 | 1.213269486 |
| D08 | 0.522213784 | 0.691049340 | 1.213263124 |
| D09 | 0.519699235 | 0.693566173 | 1.213265408 |
| D10 | 0.525980969 | 0.687283403 | 1.213264372 |
| D11 | 0.527883986 | 0.685381362 | 1.213265348 |
| D12 | 0.522223899 | 0.691039148 | 1.213263048 |
| D13 | 0.520921543 | 0.692341031 | 1.213262574 |
| D14 | 0.521369464 | 0.691897848 | 1.213267312 |
| A01 | 1.213021620 | 0.000000000 | 1.213021620 |
| A02 | 1.213020960 | 0.000000000 | 1.213020960 |
| NEW01 | 0.253626937 | 0.334622204 | 0.588249140 |

### ratio-8-dual-8-aux-only — 8 habilitados para ambas, 8 somente Auxiliar

| Militar | E(Auxiliar) | E(Condutor) | E(total) |
|---|---:|---:|---:|
| D01 | 0.000172542 | 1.250006714 | 1.250179256 |
| D02 | 0.000190866 | 1.249988394 | 1.250179260 |
| D03 | 0.000159065 | 1.250020184 | 1.250179249 |
| D04 | 0.000197260 | 1.249982012 | 1.250179272 |
| D05 | 0.000160265 | 1.250018991 | 1.250179256 |
| D06 | 0.000168102 | 1.250011162 | 1.250179264 |
| D07 | 0.000171802 | 1.250007444 | 1.250179245 |
| D08 | 0.000214164 | 1.249965100 | 1.250179264 |
| A01 | 1.249820729 | 0.000000000 | 1.249820729 |
| A02 | 1.249820739 | 0.000000000 | 1.249820739 |
| A03 | 1.249820741 | 0.000000000 | 1.249820741 |
| A04 | 1.249820739 | 0.000000000 | 1.249820739 |
| A05 | 1.249820750 | 0.000000000 | 1.249820750 |
| A06 | 1.249820733 | 0.000000000 | 1.249820733 |
| A07 | 1.249820751 | 0.000000000 | 1.249820751 |
| A08 | 1.249820750 | 0.000000000 | 1.249820750 |


## Sensibilidade ao limite ampliado

Os cenários 1, 3 e 4 foram repetidos com limite configurado de 30.0 s e até 300 iterações por fase. O runtime medido mostra se o processo usou o tempo ou encerrou antes por convergência/coluna repetida.

| Cenário | Tempo efetivo (s) | Limite (s) | Colunas | Iter. total/funções | Pricing total/funções | Encerramento total/funções | Gap total | Gap funções | Certificação total/funções | Diagnóstico |
|---|---:|---:|---:|---|---|---|---:|---:|---|---|
| scenario-1 | 15.57 | 30.0 | 211 | 60/152 | OPTIMAL/OPTIMAL | gap_tolerance/gap_tolerance | 8.82e-05 | 8.95e-05 | True/True | nenhum |
| scenario-3 | 14.38 | 30.0 | 208 | 58/151 | OPTIMAL/OPTIMAL | gap_tolerance/gap_tolerance | 8.84e-05 | 9.9e-05 | True/True | nenhum |
| scenario-4 | 15.25 | 30.0 | 216 | 62/155 | OPTIMAL/OPTIMAL | gap_tolerance/gap_tolerance | 8.27e-05 | 9.9e-05 | True/True | nenhum |

## Comparação de solvers do mestre

Os mestres foram comparados sobre as mesmas colunas válidas, extraídas da mistura do cenário 1. O QP da justiça total foi tentado com CLARABEL, OSQP e SCS; a fase por função (com bloqueio quadrático) foi tentada com CLARABEL e SCS. OSQP não suporta a restrição cônica da fase secundária.

- Colunas: 8; objetivo primário de referência: 0.189; bound da fase secundária: 0.189.
- Condicionamento efetivo da matriz total: 1.2; da matriz por função: 1.18.

| Fase | Solver/configuração | Status | Tempo (s) | Iterações | Primal viável | Desvio total | Objetivo fase função |
|---|---|---|---:|---:|---|---:|---:|
| Total | CLARABEL | optimal | 0.0180 | 6 | True | 0.189 | — |
| Total | OSQP | optimal | 0.0067 | 75 | True | 0.189 | — |
| Total | SCS | optimal | 0.0115 | 25 | False | 0.189 | — |
| Função | CLARABEL-scaled-soc-warm | optimal | 0.0169 | 21 | True | 0.189 | 1.30311 |
| Função | CLARABEL-quadratic-lock-warm | optimal | 0.0172 | 21 | True | 0.189 | 1.30311 |
| Função | SCS-scaled-soc-warm | optimal | 0.3139 | 26700 | False | 0.189 | 1.30311 |
| Função | SCS-scaled-soc-cold | optimal | 0.3133 | 26700 | False | 0.189 | 1.30311 |
| Função | OSQP-scaled-soc-warm | ERROR | — | — | — | — | — |

Repetições idênticas do mestre: 5.

| Formulação CLARABEL | Status nas repetições | Primal viável | Maior violação |
|---|---|---:|---:|
| CLARABEL-scaled-soc-warm | optimal: 5/5 | 5/5 | 6.97e-13 |
| CLARABEL-quadratic-lock-warm | optimal: 5/5 | 5/5 | 6.13e-13 |

O log detalhado do CLARABEL está em `clarabel-master-logs.txt`. A formulação com norma SOC escalada é matematicamente equivalente ao limite quadrático; o multiplicador dual é convertido de volta para as unidades do objetivo quadrático antes do pricing.

### Solver primário OSQP + secundário CLARABEL

| Cenário | Tempo (s) | Mestre total/funções | Pricing total/funções | Gap total/funções | Certificação total/funções |
|---|---:|---|---|---:|---|
| scenario-1 | 9.33 | optimal/optimal | OPTIMAL/OPTIMAL | 9.08e-05/0.0356 | True/False |
| scenario-3 | 8.83 | optimal/optimal | OPTIMAL/OPTIMAL | 9.42e-05/0.0212 | True/False |
| scenario-4 | 10.12 | optimal/optimal | OPTIMAL/OPTIMAL | 9.07e-05/0.0433 | True/False |
| scenario-5 | 4.85 | optimal/optimal_inaccurate | OPTIMAL/OPTIMAL | 8.49e-05/1e-10 | True/False |

### Reprodutibilidade do cenário 1

| Execução | PID | Processo isolado | Workers | Seed | Tempo (s) | Colunas | Iterações total/funções | Status mestres | Gaps total/funções | Certificação | Diferença máx. das expectativas vs. primeira |
|---:|---:|---|---:|---:|---:|---:|---|---|---:|---|---:|
| 1 | 8312 | True | 1 | 20261105 | 33.14 | 8 | 7/0 | optimal/NOT_SOLVED | 2.85/5.28 | False/False | 0 |
| 2 | 14312 | True | 1 | 20261105 | 33.14 | 8 | 7/0 | optimal/NOT_SOLVED | 2.85/5.28 | False/False | 0 |
| 3 | 13732 | True | 8 | 20261105 | 14.59 | 173 | 53/120 | optimal/optimal | 7.16e-05/0.157 | True/False | 0.622 |
| 4 | 17272 | True | 8 | 20261105 | 15.17 | 176 | 56/120 | optimal/optimal | 8.43e-05/0.175 | True/False | 0.625 |

### Interpretação

- Entrada nova, períodos de férias e histórico `ACTUAL` alteram a elegibilidade diária; as expectativas devem ser obtidas das marginais das escalas válidas, não de uma divisão uniforme por cabeça.
- O caso de disponibilidade muito reduzida mantém a pessoa no modelo somente nas datas elegíveis; o descanso entre dias continua aplicado.
- Igualdade total impossível é registrada como ótimo de desvio estritamente positivo quando certificado. Isso é diferente de falha do solver ou de inviabilidade da escala.
- Limite de tempo, `optimal_inaccurate` do CLARABEL ou gap acima da tolerância deixam o cálculo provisório; não autorizam declará-lo ótimo.
- A revisão desta rodada corrigiu a rechecagem secundária: o gradiente Lagrangiano final deve combinar ambos os gradientes avaliados na mesma mistura certificada. Reutilizar o gradiente total da mistura primária produzia um gap artificialmente alto. Também corrigiu o campo `schedule_dot` do certificado primário, que registrava o produto da mistura em vez do produto da escala de pricing.
- O teste prévio de capacidade rejeita a equipe com apenas dois Condutores: cada um cobre no máximo 3 das 10 datas sob descanso de quatro dias, portanto capacidade total 6 < 10. O teste é necessário, mas não prova viabilidade quando a capacidade passa.
- O pricing desta execução usou 1 worker(s) e seed 20261105. As repetições com um worker coincidiram exatamente: True. As execuções multiworker diferiram do primeiro resultado em até 0.625 na maior expectativa individual; duas repetições não bastam para uma afirmação geral de reprodutibilidade multiworker.
- Na comparação final repetida, CLARABEL resolveu o mestre primário e ambas as formulações secundárias com status `optimal` e viabilidade primal em todas as repetições. Em execuções exploratórias com tolerâncias mais estritas, CLARABEL retornou `optimal_inaccurate` mesmo com ponto primal viável; essa configuração foi descartada. O `SolverError` capturado é do OSQP, que não suporta a restrição cônica secundária.

## Persistência recomendada

Persistir, por militar e período, expectativas de Auxiliar, Condutor e total (idealmente como numerador/denominador exatos), junto com versão da fórmula, período exato, baseline anterior, créditos acumulados por função, estado de certificação, valores/gaps, versões/configuração dos solvers, data de cálculo e referência ao resultado substituído. Calcular o baseline seguinte somando cada marginal da dezena uma vez, mantendo E_total = E_auxiliar + E_condutor. Usar registros imutáveis por execução: somente resultados certificados podem receber o estado definitivo aprovado; resultados apenas viáveis ficam provisórios e não atualizam automaticamente o baseline consolidado. Recalcular período consolidado requer ação explícita e trilha de auditoria.

## Limitações e otimizações sem enfraquecer garantias

- O tempo é limitado por geração de colunas: cada iteração resolve um pricing CP-SAT; ampliar dias e militares aumenta variáveis, restrições de descanso e custo do mestre.
- Mais tempo pode diminuir gap, mas não permite prever um tempo adicional fixo nem garante certificação. A repetição com limite configurado de 30.0 s registra se o algoritmo parou antes do limite por pricing sem nova coluna ou por instabilidade do mestre.
- Otimizações seguras: warm-start e reaproveitamento de colunas entre fases; manter pricing exato/ótimo para bounds; usar certificados duais conservadores; melhorar escalonamento numérico do mestre; remover variáveis inelegíveis e simetrias comprovadamente equivalentes; e validar cada mudança contra o verificador independente.
- Não reduzir tolerâncias, arredondar expectativas ou aceitar `FEASIBLE` como certificado apenas para obter mais resultados positivos.
- As colunas são compartilhadas entre fases. O warm-start agora preserva os pesos existentes e acrescenta zero para cada coluna nova; antes, o tamanho incompatível fazia o valor inicial ser descartado.

## Certificados completos

O JSON associado registra configuração, status, gaps, tempos e metadados recomendados para persistência. A execução completa da PoC anterior contém as misturas detalhadas por escala.
