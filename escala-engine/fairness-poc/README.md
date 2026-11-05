# Prova de conceito: marginais de escalas válidas

Este projeto é independente de `abm_schedule_engine`. Não importa nem
modifica o solver principal, suas funções objetivo ou seus testes.

## Método

1. Um solver inteiro (HiGHS por padrão, CP-SAT opcional) gera escalas
   inteiras com uma vaga por função/data, habilitações, indisponibilidades,
   entrada, conflito diário e quatro dias entre serviços, inclusive em
   relação ao histórico `ACTUAL`. Ambos só produzem uma coluna certificável
   quando retornam `OPTIMAL`; `FEASIBLE` nunca fecha o pricing.
2. Cada escala é uma coluna binária. O mestre escolhe pesos não negativos
   que somam 1 e minimiza primeiro os desvios quadráticos totais.
3. Uma segunda otimização minimiza os desvios por função, sujeita a
   manter o objetivo total dentro da tolerância reportada.
4. Geração de colunas resolve o pricing como MILP inteiro. HiGHS usa
   `mip_rel_gap=0`, exige bound finito quando retorna `OPTIMAL` e valida
   integralidade e escala; CP-SAT permanece disponível para comparação de
   reprodutibilidade. Um gap de Frank-Wolfe (e, no desempate, um gap
   Lagrangiano) limita quanto o valor global ainda pode melhorar; o bound
   HiGHS inclui margem de segurança numérica, enquanto o bound CP-SAT inclui
   a margem pelo arredondamento dos coeficientes inteiros.
5. Os pesos do certificado são convertidos em frações exatas. O
   verificador revalida a soma exata dos pesos, vagas, habilitações,
   disponibilidade, entrada, descanso, marginais, objetivos e a
   consistência do certificado de pricing.

O certificado é numérico/toleranciado, não uma prova simbólica exata.
Otimalidade só é marcada como certificada dentro da tolerância se o
mestre CLARABEL e o pricing selecionado terminarem com `OPTIMAL`, houver
viabilidade primal validada e o limite superior de gap ficar abaixo da
tolerância. Um resultado viável sem isso é reportado como não certificado.

## Instalação no Windows PowerShell

Use um interpretador Python suportado pelo OR-Tools, de 3.10 a 3.14:

```powershell
Set-Location 'C:\caminho\para\ABM\escala-engine\fairness-poc'
py -3.14 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -e .
.\.venv\Scripts\python.exe -m pip install -e ".[dev]"
.\.venv\Scripts\python.exe -m fairness_poc --pricing-solver HIGHS --output-dir .\reports
```

O projeto principal já pode ter seu próprio ambiente virtual. O ambiente
acima é separado e não altera as dependências dele.

Para ajustar tempo e tolerância:

```powershell
.\.venv\Scripts\python.exe -m fairness_poc --time-limit 120 --gap-tolerance 0.000001 --max-iterations 300
```

Quando CP-SAT é selecionado, usa um worker e semente fixa por padrão. Para
registrar explicitamente a configuração e logs detalhados do mestre:

```powershell
.\.venv\Scripts\python.exe -m fairness_poc `
  --time-limit 120 `
  --gap-tolerance 0.0001 `
  --max-iterations 300 `
  --pricing-workers 1 `
  --seed 20261104 `
  --pricing-solver HIGHS `
  --verbose-master `
  --output-dir .\reports
```

O mestre primário aceita `CLARABEL`, `OSQP` ou `SCS`; a fase secundária
aceita `CLARABEL` ou `SCS`, pois a restrição de preservação da justiça total
é cônica. A combinação `--primary-master-solver OSQP
--secondary-master-solver CLARABEL` permite comparar o QP primário com
CLARABEL sem trocar a formulação nem reduzir os critérios de certificação.
`optimal_inaccurate`, pricing `FEASIBLE`, inviabilidade primal ou gap acima
da tolerância nunca certificam otimalidade. Uma escala/mistura viável sem
esses certificados deve ser tratada apenas como provisória.

Para verificar as escalas e pesos salvos no certificado:

```powershell
.\.venv\Scripts\python.exe -m fairness_poc --verify .\reports\fairness-poc-results.json
```

Para repetir os benchmarks de desempenho e os casos adicionais de justiça:

```powershell
.\.venv\Scripts\python.exe -m fairness_poc.evaluation `
  --benchmark-time-limit 30 `
  --fairness-time-limit 15 `
  --sensitivity-time-limit 120 `
  --gap-tolerance 0.0001 `
  --max-iterations 120 `
  --output-dir .\reports\evaluation
```

`--pricing-solver CP-SAT` seleciona o pricing CP-SAT; `HIGHS` usa o MILP
inteiro do SciPy/HiGHS. A validação de reprodutibilidade sempre usa CP-SAT,
com duas execuções independentes por configuração de um e oito workers,
semente fixa e `PYTHONHASHSEED` fixado. O relatório registra os PIDs,
certificações, gaps, colunas e diferenças entre expectativas.

`--sensitivity-time-limit` controla separadamente os testes ampliados dos
cenários 1, 3 e 4 (o padrão é 120 segundos). Os tempos configurados e
efetivamente usados ficam registrados no relatório.

O benchmark usa equipes de 16, 20 e 30 militares, mantendo dois
Auxiliares-only e aumentando o grupo habilitado para ambas as funções.
Os casos extras cobrem férias no início/meio/fim, entrada, disponibilidade
muito reduzida, histórico ACTUAL e impossibilidade de igualdade total.
Três cenários também são repetidos com 120 segundos e até 300 iterações
para medir se o aumento do limite ajuda. As execuções produzem um JSON e
um relatório Markdown; tempos são específicos do computador e da
configuração registrada no relatório.

## Cenários

Os cinco cenários usam dez dias, de 2026-10-01 a 2026-10-10. Cada um
inclui um serviço `ACTUAL` fictício em 2026-09-27; ele respeita o descanso
de quatro dias e não bloqueia o primeiro dia. Um teste adicional usa
`D01` em 2026-09-29 para comprovar o bloqueio de 01 e 02 de outubro.

Antes de gerar colunas, a PoC calcula uma cota superior necessária para
cada função: a capacidade máxima individual respeita habilitação,
disponibilidade, entrada, histórico e descanso de quatro dias. Com apenas
dois Condutores em dez dias, cada um pode cobrir no máximo três datas; a
capacidade 6 é inferior às dez vagas, então o caso é rejeitado antes do
pricing. Passar por essa cota não garante viabilidade: os conflitos entre
funções ainda exigem o solver inteiro.

As expectativas candidatas anteriores são comparadas com os resultados
do mestre. Diferenças podem surgir porque agora o alvo é otimizado sobre
a distribuição convexa de escalas com descanso, em vez de simplesmente
distribuir oportunidades por dia.

## Limitações

- CP-SAT é chamado repetidamente pelo pricing; o custo cresce com dias,
  militares, indisponibilidades e iterações de geração de colunas.
- O mestre convexo usa tolerâncias numéricas. O gap certificado é um
  limite dentro dessas tolerâncias, não aritmética exata.
- O descanso histórico neste PoC usa serviços `ACTUAL` anteriores ao
  período. Entradas de histórico no mesmo dia por pessoa devem ser
  consolidadas pelo chamador.
- Os exemplos e nomes são fictícios. Este código não lê banco, API nem
  dados do Portal.
- Não há rodízio por função nem preferência de oito dias na construção
  da distribuição.
