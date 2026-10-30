# Motor de Escalas ABM

Motor independente em Python para gerar, com Google OR-Tools CP-SAT, uma
prévia global das vagas de Auxiliar de Dia e Condutor. O Oficial de Dia
não é gerado pelo motor e continua sendo uma designação manual no Portal.

Esta primeira fase não inclui API HTTP, banco de dados, autenticação,
hospedagem, interface administrativa, confirmação nem gravação de escala
no calendário do Next.js. A entrada/saída JSON e a função Python pública
foram separadas para permitir integração futura por um backend autorizado.
Use somente os dados fictícios deste diretório.

## Requisitos

- Python 3.10 ou superior.
- Google OR-Tools (`ortools`) para CP-SAT.
- `pytest` para testes automatizados.

As dependências são isoladas em um ambiente virtual local. No PowerShell,
na raiz do repositório:

```powershell
Set-Location 'C:\Users\DEN CFAE\OneDrive\Documentos\SD R. Sousa\ABM\escala-engine'
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -e '.[dev]'
```

Se a política local bloquear a ativação do ambiente, não altere a política
do Windows. Execute diretamente o interpretador do ambiente virtual:

```powershell
.\.venv\Scripts\python.exe -m pip install -e '.[dev]'
.\.venv\Scripts\python.exe -m pytest
```

## Executar testes

```powershell
python -m pytest
```

Os testes verificam regras da escala, dados fictícios, critérios de
crédito e casos inviáveis. O solver é configurado com uma thread e seed
fixa para tornar as execuções reproduzíveis sempre que o limite permitir.

## Gerar JSON

Na raiz do repositório, com o ambiente ativado:

```powershell
abm-schedule .\escala-engine\examples\request-fictitious-10-days.json `
  --output .\escala-engine\examples\result-fictitious-10-days.json
```

Ou usando o módulo, dentro desta pasta:

```powershell
python -m abm_schedule_engine.cli .\examples\request-fictitious-10-days.json
```

Status possíveis:

- `OPTIMAL`: solução válida e ótimo provado.
- `FEASIBLE`: solução válida encontrada, sem prova de otimalidade antes do limite.
- `INFEASIBLE`: o CP-SAT provou que as restrições não podem ser atendidas.
- `UNKNOWN`: limite atingido sem solução válida e sem prova de inviabilidade.
- `MODEL_INVALID`: dados numéricos ou modelo fora dos limites seguros.

Somente `OPTIMAL` e `FEASIBLE` incluem designações. Resultados sem solução
não apresentam uma escala parcial como se fosse válida.

## Contrato JSON

Veja [generation-request.schema.json](./schemas/generation-request.schema.json),
[generation-result.schema.json](./schemas/generation-result.schema.json) e
o exemplo fictício de [entrada](./examples/request-fictitious-10-days.json).
As datas usam ISO `YYYY-MM-DD`; início e fim são inclusivos.

### Histórico e créditos

Cada serviço anterior separa:

- `credit`: data, função e militar originalmente escalado, usados para
  contar o crédito de justiça.
- `actual`: data, função e militar que efetivamente executou, usados
  para impor o descanso mínimo.

Assim, venda e permuta não transferem créditos, mas a pessoa que
efetivamente serviu continua sujeita ao descanso. A entrada contém
expectativas históricas acumuladas (`fairness_baseline`) como frações
exatas. Elas devem ser calculadas a partir das oportunidades reais
anteriores, excluindo indisponibilidade, inatividade e dias anteriores à
entrada na escala. O motor não inventa esse histórico se os dados não
forem enviados.

### Restrições implementadas

- Uma vaga de Auxiliar e uma de Condutor por data.
- O mesmo militar não ocupa as duas funções no mesmo dia.
- Condutor também deve estar habilitado a Auxiliar; Auxiliar-apenas não
  pode ser Condutor.
- Respeito a status ativo, data de entrada e indisponibilidades inclusivas.
- Pelo menos três dias completos livres: datas de serviços separadas por
  no mínimo quatro dias, inclusive entre funções distintas.
- Descanso histórico baseado em quem efetivamente executou o serviço.

### Objetivo nesta fase

O CP-SAT modela o período inteiro numa única otimização. Para cada dia,
usa a expectativa total literal aprovada `2/N(d)` para cada militar apto
a pelo menos uma função; por função, usa `1/N_função(d)`. Somam-se as
expectativas futuras às expectativas históricas fornecidas e comparam-se
com créditos históricos e novos créditos atribuídos pela escala.

O objetivo implementado nesta fase é exatamente a parte formalizada:

```text
J = 100 * J_total + 35 * (J_auxiliar + J_condutor)
```

As frações são escaladas para inteiros exatos antes de chegar ao CP-SAT;
não se usa arredondamento decimal. Não foram adicionadas fórmulas
inventadas para concentração, preferência por intervalos maiores ou
bônus de retorno de indisponibilidade. Esses termos permanecem fora do
modelo até serem definidos e aprovados.

## Integração futura

Um backend do Portal poderá validar a sessão e a autorização do
administrador, preparar este JSON com IDs estáveis e snapshots de nomes,
invocar `load_request()` e `generate_schedule()`, e enviar a resposta ao
administrador para revisão. A confirmação deverá ser uma operação
separada, persistente e auditável. Esta biblioteca não lê cadastro,
armazenamento local nem dados de produção do Portal.
