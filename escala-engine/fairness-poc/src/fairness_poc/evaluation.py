from __future__ import annotations

import argparse
import contextlib
import io
import json
import logging
import os
import subprocess
import sys
from datetime import date, timedelta
from pathlib import Path
from time import monotonic
from typing import Any

import numpy as np

import clarabel
import cvxpy as cp
import ortools

import fairness_poc.__main__ as poc
from fairness_poc.__main__ import (
    Member,
    Scenario,
    InfeasibleScheduleError,
    build_problem,
    build_scenarios,
    column_generation,
    marginal_targets,
    schedule_vector,
    solve_restricted_master,
)

PERIOD_START = date(2026, 10, 1)


def build_team_scenario(dual: int, auxiliary_only: int, scenario_id: str) -> Scenario:
    members = tuple(
        [
            Member(f"D{index:02}", True, True, PERIOD_START)
            for index in range(1, dual + 1)
        ]
        + [
            Member(f"A{index:02}", True, False, PERIOD_START)
            for index in range(1, auxiliary_only + 1)
        ]
    )
    return Scenario(scenario_id, scenario_id, members, {})


def make_evaluation_cases() -> tuple[list[tuple[Scenario, int]], list[tuple[Scenario, int]]]:
    benchmarks: list[tuple[Scenario, int]] = []
    for day_count in (10, 20):
        for headcount, dual, auxiliary_only in (
            (16, 14, 2),
            (20, 18, 2),
            (30, 28, 2),
        ):
            benchmarks.append(
                (
                    build_team_scenario(
                        dual, auxiliary_only, f"benchmark-{headcount}-{day_count}"
                    ),
                    day_count,
                )
            )

    start = PERIOD_START
    ten_days = tuple(start + timedelta(days=index) for index in range(10))
    base = build_team_scenario(14, 2, "vacation-template")
    vacation_cases = []
    for label, first, last in (
        ("vacation-start", 0, 2),
        ("vacation-middle", 4, 6),
        ("vacation-end", 7, 9),
    ):
        vacation_cases.append(
            (
                Scenario(
                    label,
                    label,
                    base.members,
                    {"A02": ((ten_days[first], ten_days[last]),)},
                    (("D01", start - timedelta(days=4)),),
                ),
                10,
            )
        )

    entry_case = next(
        scenario for scenario in build_scenarios() if scenario.id == "scenario-4"
    )
    scenario_1 = next(
        scenario for scenario in build_scenarios() if scenario.id == "scenario-1"
    )
    scenario_3 = next(
        scenario for scenario in build_scenarios() if scenario.id == "scenario-3"
    )
    history_case = Scenario(
        "history-blocks-start",
        "ACTUAL blocks the first three dates",
        base.members,
        {},
        (("D01", start - timedelta(days=1)),),
    )
    low_availability_case = Scenario(
        "very-reduced-availability",
        "D01 available only on the first and last dates",
        base.members,
        {"D01": ((ten_days[1], ten_days[8]),)},
        (("D01", start - timedelta(days=4)),),
    )
    impossible_equality_case = next(
        scenario for scenario in build_scenarios() if scenario.id == "scenario-2"
    )
    fairness_cases = [
        (scenario_1, 10),
        (scenario_3, 10),
        *vacation_cases,
        (entry_case, 10),
        (low_availability_case, 10),
        (history_case, 10),
        (impossible_equality_case, 10),
        (build_team_scenario(8, 8, "ratio-8-dual-8-aux-only"), 10),
        (build_team_scenario(2, 14, "ratio-2-dual-14-aux-only"), 10),
    ]
    return benchmarks, fairness_cases


def run_case(
    scenario: Scenario,
    day_count: int,
    time_limit: float,
    gap_tolerance: float,
    max_iterations: int,
    pricing_workers: int = 1,
    random_seed: int = 0,
    primary_master_solver: str = "CLARABEL",
    secondary_master_solver: str = "CLARABEL",
    pricing_solver: str = "HIGHS",
) -> dict[str, Any]:
    started = monotonic()
    try:
        problem = build_problem(scenario, PERIOD_START, day_count)
        result = column_generation(
            problem,
            time_limit,
            gap_tolerance,
            max_iterations,
            master_solver=primary_master_solver,
            pricing_workers=pricing_workers,
            random_seed=random_seed,
            secondary_master_solver=secondary_master_solver,
            pricing_solver=pricing_solver,
        )
    except InfeasibleScheduleError as error:
        return {
            "scenario": scenario.id,
            "title": scenario.title,
            "member_count": len(scenario.members),
            "dual_count": sum(member.can_driver for member in scenario.members),
            "auxiliary_only_count": sum(
                member.can_auxiliary and not member.can_driver
                for member in scenario.members
            ),
            "days": day_count,
            "feasible": False,
            "pricing_solver": pricing_solver,
            "runtime": {
                "total_seconds": monotonic() - started,
                "columns": 0,
                "primary_iterations": 0,
                "secondary_iterations": 0,
                "primary_master_status": "NOT_RUN",
                "master_status": "NOT_RUN",
                "primary_termination": "infeasible",
                "secondary_termination": "not_run",
            },
            "objectives": {
                "primary_gap_upper_bound": None,
                "secondary_gap_upper_bound": None,
                "primary_certified_to_tolerance": False,
                "secondary_certified_to_tolerance": False,
                "total_squared_deviation": None,
                "function_squared_deviation": None,
            },
            "sums": {"auxiliary": None, "driver": None, "total": None},
            "expectations_by_member": {},
            "mixture_validation": {
                "valid": False,
                "all_scales_valid": False,
                "violations": [str(error)],
            },
            "certificate_valid": False,
            "infeasibility_reason": str(error),
            "pricing_status": {
                "primary_final": "INFEASIBLE",
                "secondary_final": "NOT_RUN",
            },
            "diagnostics": [str(error)],
        }
    certificates = result["certificate"]["pricing_certificates"]
    return {
        "scenario": scenario.id,
        "title": scenario.title,
        "member_count": len(scenario.members),
        "dual_count": sum(member.can_driver for member in scenario.members),
        "auxiliary_only_count": sum(
            member.can_auxiliary and not member.can_driver
            for member in scenario.members
        ),
        "days": day_count,
        "feasible": True,
        "pricing_solver": pricing_solver,
        "runtime": result["runtime"],
        "objectives": result["objectives"],
        "sums": result["expectations"]["sums"],
        "expectations_by_member": result["expectations"]["by_member"],
        "mixture_validation": result["validation"],
        "certificate_valid": result["validation"]["valid"],
        "pricing_status": {
            "primary_final": certificates["primary_final"]["pricing"]["status"],
            "secondary_final": certificates["secondary_final"]["pricing"]["status"],
        },
        "diagnostics": result["diagnostics"],
    }


def compare_master_solvers(random_seed: int) -> tuple[dict[str, Any], str]:
    scenario = next(
        scenario for scenario in build_scenarios() if scenario.id == "scenario-1"
    )
    problem = build_problem(scenario)
    poc._active_coordinates = problem.coordinates
    poc._active_total_keys = tuple(problem.target_total)
    total_target, function_target = marginal_targets(problem)
    prior_report_path = Path(__file__).resolve().parents[2] / "reports" / (
        "fairness-poc-results.json"
    )
    if not prior_report_path.exists():
        raise FileNotFoundError(
            "Execute primeiro a PoC principal para gerar as colunas válidas "
            "usadas no benchmark de mestres."
        )
    prior_report = json.loads(prior_report_path.read_text(encoding="utf-8"))
    scenario_result = next(
        result
        for result in prior_report["scenarios"]
        if result["scenario"] == "scenario-1"
    )
    columns = []
    seen: set[bytes] = set()
    for certified_scale in scenario_result["certificate"]["mixtures"]:
        assignments = {
            (
                item["member_id"],
                date.fromisoformat(item["date"]),
                item["role"],
            )
            for item in certified_scale["assignments"]
        }
        column = schedule_vector(problem, assignments)
        if column.tobytes() not in seen:
            columns.append(column)
            seen.add(column.tobytes())
    generation_iterations = None
    if not columns:
        raise RuntimeError("O certificado do cenário 1 não contém colunas únicas.")

    primary_runs: dict[str, tuple[np.ndarray, dict[str, Any]]] = {}
    primary_summary: dict[str, Any] = {}
    logs: list[str] = []
    for solver in ("CLARABEL", "OSQP", "SCS"):
        capture = io.StringIO()
        cvxpy_logger = logging.getLogger("cvxpy")
        log_handler = logging.StreamHandler(capture)
        old_level = cvxpy_logger.level
        old_propagate = cvxpy_logger.propagate
        cvxpy_logger.addHandler(log_handler)
        cvxpy_logger.setLevel(logging.INFO)
        cvxpy_logger.propagate = False
        try:
            with contextlib.redirect_stdout(capture), contextlib.redirect_stderr(
                capture
            ):
                weights, diagnostics = solve_restricted_master(
                    columns,
                    "total",
                    total_target,
                    function_target,
                    solver=solver,
                    verbose=solver == "CLARABEL",
                )
            primary_runs[solver] = (weights, diagnostics)
            primary_summary[solver] = {
                "status": diagnostics["status"],
                "objective": diagnostics["primary_value"],
                "wall_time_seconds": diagnostics["wall_time_seconds"],
                "solver_stats": diagnostics["solver_stats"],
                "primal_feasible": diagnostics["primal_feasible"],
                "primal_violation": diagnostics["primal_violation"],
                "warm_start_used": diagnostics["warm_start_used"],
            }
        except (cp.error.SolverError, RuntimeError) as error:
            primary_summary[solver] = {
                "status": "ERROR",
                "error": f"{type(error).__name__}: {error}",
            }
        finally:
            cvxpy_logger.removeHandler(log_handler)
            cvxpy_logger.setLevel(old_level)
            cvxpy_logger.propagate = old_propagate
        logs.append(f"===== MESTRE PRIMÁRIO / {solver} =====\n{capture.getvalue()}")

    if "CLARABEL" not in primary_runs:
        raise RuntimeError("CLARABEL não resolveu o mestre de referência.")
    reference_weights, reference_diagnostics = primary_runs["CLARABEL"]
    primary_bound = reference_diagnostics["primary_value"] + 1e-8
    secondary_summary: dict[str, Any] = {}
    secondary_configs = (
        ("CLARABEL", True, True),
        ("CLARABEL", False, True),
        ("SCS", True, True),
        ("SCS", True, False),
        ("OSQP", True, True),
    )
    for solver, normalized_lock, with_warm_start in secondary_configs:
        name = (
            f"{solver}-"
            f"{'scaled-soc' if normalized_lock else 'quadratic-lock'}-"
            f"{'warm' if with_warm_start else 'cold'}"
        )
        capture = io.StringIO()
        cvxpy_logger = logging.getLogger("cvxpy")
        log_handler = logging.StreamHandler(capture)
        old_level = cvxpy_logger.level
        old_propagate = cvxpy_logger.propagate
        cvxpy_logger.addHandler(log_handler)
        cvxpy_logger.setLevel(logging.INFO)
        cvxpy_logger.propagate = False
        try:
            with contextlib.redirect_stdout(capture), contextlib.redirect_stderr(
                capture
            ):
                weights, diagnostics = solve_restricted_master(
                    columns,
                    "functions",
                    total_target,
                    function_target,
                    primary_bound=primary_bound,
                    warm_start=reference_weights if with_warm_start else None,
                    solver=solver,
                    verbose=solver == "CLARABEL",
                    normalize_primary_constraint=normalized_lock,
                )
            secondary_summary[name] = {
                "status": diagnostics["status"],
                "objective": diagnostics["objective"],
                "primary_value": diagnostics["primary_value"],
                "primary_bound": primary_bound,
                "primary_constraint_scale": diagnostics[
                    "primary_constraint_scale"
                ],
                "primary_constraint_dual": diagnostics[
                    "primary_constraint_dual"
                ],
                "primary_constraint_raw_dual": diagnostics[
                    "primary_constraint_raw_dual"
                ],
                "wall_time_seconds": diagnostics["wall_time_seconds"],
                "solver_stats": diagnostics["solver_stats"],
                "primal_feasible": diagnostics["primal_feasible"],
                "primal_violation": diagnostics["primal_violation"],
                "warm_start_used": diagnostics["warm_start_used"],
                "normalized_primary_constraint": normalized_lock,
            }
        except (cp.error.SolverError, RuntimeError) as error:
            secondary_summary[name] = {
                "status": "ERROR",
                "error": f"{type(error).__name__}: {error}",
                "primary_bound": primary_bound,
                "normalized_primary_constraint": normalized_lock,
                "warm_start_used": with_warm_start,
            }
        finally:
            cvxpy_logger.removeHandler(log_handler)
            cvxpy_logger.setLevel(old_level)
            cvxpy_logger.propagate = old_propagate
        logs.append(f"===== MESTRE SECUNDÁRIO / {name} =====\n{capture.getvalue()}")

    matrix = np.column_stack(columns)
    unique_keys = list(problem.target_total)
    total_projection = np.zeros((len(unique_keys), len(problem.coordinates)))
    key_index = {key: index for index, key in enumerate(unique_keys)}
    for coordinate_index, (member_id, service_date, _) in enumerate(
        problem.coordinates
    ):
        total_projection[key_index[(member_id, service_date)], coordinate_index] = 1.0
    total_design = total_projection @ matrix
    total_singular_values = np.linalg.svd(total_design, compute_uv=False)
    role_singular_values = np.linalg.svd(matrix, compute_uv=False)

    def singular_summary(values: np.ndarray) -> dict[str, Any]:
        tolerance = max(values, default=0.0) * max(values.shape, default=1) * np.finfo(float).eps
        nonzero = values[values > tolerance]
        return {
            "rank": int(len(nonzero)),
            "dimension": int(len(values)),
            "largest_singular_value": float(values[0]) if len(values) else 0.0,
            "smallest_nonzero_singular_value": (
                float(nonzero[-1]) if len(nonzero) else None
            ),
            "effective_condition_number": (
                float(nonzero[0] / nonzero[-1]) if len(nonzero) else None
            ),
        }

    return (
        {
            "scenario": "scenario-1",
            "seed": prior_report.get("execution", {}).get(
                "cp_sat_random_seed"
            ),
            "pricing_workers": 1,
            "columns": len(columns),
            "coordinates": len(problem.coordinates),
            "total_residual_dimension": len(unique_keys),
            "matrix_coefficient_range": [
                float(matrix.min()),
                float(matrix.max()),
            ],
            "total_target_range": [
                float(total_target.min()),
                float(total_target.max()),
            ],
            "function_target_range": [
                float(function_target.min()),
                float(function_target.max()),
            ],
            "primary_best_value": reference_diagnostics["primary_value"],
            "column_generation_iterations": generation_iterations,
            "column_pool_source": str(prior_report_path),
            "primary_lock_bound": primary_bound,
            "total_design_singular_values": singular_summary(total_singular_values),
            "role_design_singular_values": singular_summary(role_singular_values),
            "primary": primary_summary,
            "secondary": secondary_summary,
            "column_warm_start_policy": (
                "Carry prior weights forward and append zero for every new column."
            ),
            "columns_shared_between_phases": True,
            "solver_settings": {
                "clarabel_tolerances": {
                    "tol_feas": 1e-9,
                    "tol_gap_abs": 1e-9,
                    "tol_gap_rel": 1e-9,
                },
                "strict_primal_feasibility_tolerance": 1e-12,
                "primary_lock_tolerance": 1e-8,
                "secondary_lock_formulation": (
                    "Scaled SOC equivalent to squared total-objective bound."
                ),
                "inaccurate_status_certifies": False,
            },
            "logs_file": "clarabel-master-logs.txt",
        },
        "\n".join(logs),
    )


def compare_master_solvers_repeated(
    random_seed: int, repetitions: int = 5
) -> tuple[dict[str, Any], str]:
    reference: dict[str, Any] | None = None
    reference_logs = ""
    trials = []
    for index in range(1, repetitions + 1):
        result, logs = compare_master_solvers(random_seed)
        if reference is None:
            reference = result
            reference_logs = logs
        trials.append(
            {
                "run": index,
                "primary": {
                    solver: {
                        "status": item["status"],
                        "primal_feasible": item.get("primal_feasible"),
                        "primal_violation": item.get("primal_violation"),
                        "wall_time_seconds": item.get("wall_time_seconds"),
                    }
                    for solver, item in result["primary"].items()
                },
                "secondary": {
                    solver: {
                        "status": item["status"],
                        "primal_feasible": item.get("primal_feasible"),
                        "primal_violation": item.get("primal_violation"),
                        "wall_time_seconds": item.get("wall_time_seconds"),
                    }
                    for solver, item in result["secondary"].items()
                },
            }
        )
    if reference is None:
        raise ValueError("A comparação exige ao menos uma repetição.")
    reference["repeat_count"] = repetitions
    reference["repeat_trials"] = trials
    return reference, reference_logs


def run_reproducibility_trials(
    time_limit: float,
    gap_tolerance: float,
    max_iterations: int,
    random_seed: int,
) -> dict[str, Any]:
    executions = []
    for workers in (1, 1, 8, 8):
        command = [
            sys.executable,
            "-m",
            "fairness_poc.evaluation",
            "--single-reproducibility-run",
            "--fairness-time-limit",
            str(time_limit),
            "--gap-tolerance",
            str(gap_tolerance),
            "--max-iterations",
            str(max_iterations),
            "--pricing-workers",
            str(workers),
            "--seed",
            str(random_seed),
            "--pricing-solver",
            "CP-SAT",
        ]
        environment = os.environ.copy()
        environment["PYTHONHASHSEED"] = str(random_seed)
        process = subprocess.Popen(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            env=environment,
        )
        try:
            stdout, stderr = process.communicate(timeout=time_limit + 30)
        except subprocess.TimeoutExpired as error:
            process.kill()
            _, stderr = process.communicate()
            raise TimeoutError(
                "Execução de reprodutibilidade excedeu o limite de segurança "
                f"(workers={workers}, limite={time_limit + 30} s): "
                f"{stderr[-4000:]}"
            ) from error
        if process.returncode:
            raise RuntimeError(
                "Execução de reprodutibilidade em processo independente falhou "
                f"(workers={workers}, código={process.returncode}): "
                f"{stderr[-4000:]}"
            )
        item = json.loads(stdout)
        item["process_isolated"] = True
        item["process_id"] = process.pid
        item["python_hash_seed"] = random_seed
        executions.append(item)
    references = executions[0]["expectations_by_member"]
    for item in executions:
        rows = item["expectations_by_member"]
        item["max_abs_expectation_difference_from_first"] = max(
            abs(
                rows[member_id][key] - references[member_id][key]
            )
            for member_id in references
            for key in (
                "expected_auxiliary",
                "expected_driver",
                "expected_total",
            )
        )
    return {
        "scenario": "scenario-1",
        "seed": random_seed,
        "independent_processes": all(
            item["process_isolated"] for item in executions
        ),
        "process_ids": [item["process_id"] for item in executions],
        "trials": executions,
        "interpretation": (
            "Single-worker trials with fixed seed/search should be deterministic; "
            "multi-worker CP-SAT may return different tied optima. Every run keeps "
            "its own exact status and certificate."
        ),
    }


def create_report(
    benchmark_cases: list[tuple[Scenario, int]],
    fairness_cases: list[tuple[Scenario, int]],
    sensitivity_cases: list[tuple[Scenario, int]],
    benchmark_time_limit: float,
    fairness_time_limit: float,
    sensitivity_time_limit: float,
    gap_tolerance: float,
    max_iterations: int,
    pricing_workers: int,
    random_seed: int,
    solver_log_path: Path,
    primary_master_solver: str,
    secondary_master_solver: str,
    pricing_solver: str,
    reproducibility_time_limit: float,
) -> dict[str, Any]:
    benchmarks = [
        run_case(
            scenario,
            days,
            benchmark_time_limit,
            gap_tolerance,
            max_iterations,
            pricing_workers,
            random_seed,
            primary_master_solver,
            secondary_master_solver,
            pricing_solver,
        )
        for scenario, days in benchmark_cases
    ]
    fairness = [
        run_case(
            scenario,
            days,
            fairness_time_limit,
            gap_tolerance,
            max_iterations,
            pricing_workers,
            random_seed,
            primary_master_solver,
            secondary_master_solver,
            pricing_solver,
        )
        for scenario, days in fairness_cases
    ]
    sensitivity = [
        run_case(
            scenario,
            days,
            sensitivity_time_limit,
            gap_tolerance,
            300,
            pricing_workers,
            random_seed,
            primary_master_solver,
            secondary_master_solver,
            pricing_solver,
        )
        for scenario, days in sensitivity_cases
    ]
    solver_choice_cases = []
    for scenario_id in ("scenario-1", "scenario-3", "scenario-4", "scenario-5"):
        scenario = next(
            item for item in build_scenarios() if item.id == scenario_id
        )
        solver_choice_cases.append(
            run_case(
                scenario,
                10,
                benchmark_time_limit,
                gap_tolerance,
                max_iterations,
                pricing_workers,
                random_seed,
                "OSQP",
                "CLARABEL",
                pricing_solver,
            )
        )
    reproducibility = run_reproducibility_trials(
        reproducibility_time_limit,
        gap_tolerance,
        max_iterations,
        random_seed,
    )
    master_comparison, solver_logs = compare_master_solvers_repeated(
        random_seed=random_seed
    )
    solver_log_path.parent.mkdir(parents=True, exist_ok=True)
    solver_log_path.write_text(solver_logs, encoding="utf-8")
    return {
        "configuration": {
            "period_start": PERIOD_START.isoformat(),
            "python": sys.version.split()[0],
            "ortools": ortools.__version__,
            "cvxpy": cp.__version__,
            "clarabel": clarabel.__version__,
            "benchmark_time_limit_seconds": benchmark_time_limit,
            "fairness_time_limit_seconds": fairness_time_limit,
            "sensitivity_time_limit_seconds": sensitivity_time_limit,
            "gap_tolerance": gap_tolerance,
            "max_iterations_per_phase": max_iterations,
            "pricing_workers": pricing_workers,
            "random_seed": random_seed,
            "primary_master_solver": primary_master_solver,
            "secondary_master_solver": secondary_master_solver,
            "pricing_solver": pricing_solver,
            "reproducibility_time_limit_seconds": reproducibility_time_limit,
            "strict_primal_feasibility_tolerance": 1e-12,
            "primary_lock_tolerance": 1e-8,
            "team_pattern": (
                "14/18/28 habilitados para ambas as funções + 2 somente Auxiliar"
            ),
            "pricing_search_workers": pricing_workers,
        },
        "benchmarks": benchmarks,
        "fairness_cases": fairness,
        "sensitivity_cases": sensitivity,
        "solver_choice_cases": solver_choice_cases,
        "reproducibility_trials": reproducibility,
        "master_solver_comparison": master_comparison,
        "persistence_recommendation": {
            "expectations": [
                "expected_auxiliary",
                "expected_driver",
                "expected_total",
                "exact_numerator_and_denominator_per_expectation",
            ],
            "accumulated_baseline": [
                "previous_expected_auxiliary",
                "previous_expected_driver",
                "previous_expected_total",
                "updated_expected_auxiliary",
                "updated_expected_driver",
                "updated_expected_total",
                "credit_auxiliary",
                "credit_driver",
            ],
            "metadata": [
                "formula_version",
                "reference_period_start",
                "reference_period_end",
                "previous_baseline_id",
                "certification_status",
                "objective_values_and_gaps",
                "solver_versions_and_configuration",
                "created_at",
                "supersedes_id",
            ],
            "states": [
                "certified_optimal_within_tolerance",
                "feasible_provisional",
                "failed_or_infeasible",
            ],
            "rule": (
                "Never replace a consolidated period silently. Persist each "
                "calculation as an immutable version; add each period's expected "
                "role marginals to the prior baseline exactly once, preserve "
                "E_total = E_auxiliary + E_driver, and require explicit "
                "supersession/recalculation."
            ),
        },
    }


def write_markdown(report: dict[str, Any], path: Path) -> None:
    config = report["configuration"]

    def format_gap(value: float | None) -> str:
        return f"{value:.3g}" if value is not None else "n/a"

    lines = [
        "# Avaliação de desempenho e robustez da PoC",
        "",
        "Execução somente na prova de conceito independente; o motor principal "
        "não foi alterado.",
        "",
        f"- Período iniciado em {config['period_start']}.",
        f"- Limite por execução: benchmarks {config['benchmark_time_limit_seconds']} s; "
        f"casos de justiça {config['fairness_time_limit_seconds']} s; "
        f"sensibilidade {config['sensitivity_time_limit_seconds']} s.",
        f"- Tolerância de gap: {config['gap_tolerance']}; "
        f"máximo de {config['max_iterations_per_phase']} iterações por fase.",
        f"- Equipes de benchmark: {config['team_pattern']}.",
        f"- Python {config['python']}; OR-Tools {config['ortools']}; "
        f"CVXPY {config['cvxpy']}; CLARABEL {config['clarabel']}; "
        f"pricing {config['pricing_solver']}; configuração CP-SAT "
        f"{config['pricing_search_workers']} worker(s); seed "
        f"{config['random_seed']}; mestre primário/secundário "
        f"{config['primary_master_solver']}/{config['secondary_master_solver']}; "
        "semente fixa.",
        "",
        "O status `OPTIMAL` significa que o solver de pricing selecionado "
        "encerrou o subproblema inteiro com bound global coincidente para os "
        "coeficientes atuais. Isso não prova sozinho a otimalidade do problema "
        "mestre: também é necessário fechar o gap global da geração de colunas "
        "e certificar o mestre convexo. `FEASIBLE` nunca é usado como prova.",
        "",
        "## Benchmarks",
        "",
        "| Militares | Dias | Tempo (s) | Colunas | Iter. total/funções | Mestre total/funções | Pricing total/funções | Encerramento total/funções | Gap total | Gap funções | Certificação total/funções | Certificado viável |",
        "|---:|---:|---:|---:|---|---|---|---|---:|---:|---|---|",
    ]
    for item in report["benchmarks"]:
        objectives = item["objectives"]
        runtime = item["runtime"]
        lines.append(
            f"| {item['member_count']} | {item['days']} "
            f"| {runtime['total_seconds']:.2f} | {runtime['columns']} "
            f"| {runtime['primary_iterations']}/{runtime['secondary_iterations']} "
            f"| {runtime['primary_master_status']}/{runtime['master_status']} "
            f"| {item['pricing_status']['primary_final']}/{item['pricing_status']['secondary_final']} "
            f"| {runtime['primary_termination']}/{runtime['secondary_termination']} "
            f"| {objectives['primary_gap_upper_bound']:.3g} "
            f"| {format_gap(objectives['secondary_gap_upper_bound'])} "
            f"| {objectives['primary_certified_to_tolerance']}/{objectives['secondary_certified_to_tolerance']} "
            f"| {item['certificate_valid']} |"
        )
    lines.extend(["", "## Casos adicionais de justiça", ""])
    lines.extend(
        [
            "| Caso | Equipe | Dias | Tempo (s) | Total esperado | Gap total | Certificação total/funções | Certificado viável |",
            "|---|---:|---:|---:|---:|---:|---|---|",
        ]
    )
    for item in report["fairness_cases"]:
        objectives = item["objectives"]
        if not item.get("feasible", True):
            lines.append(
                f"| {item['scenario']} | {item['member_count']} | {item['days']} "
                f"| {item['runtime']['total_seconds']:.2f} | inviável | n/a "
                f"| não certificado | False |"
            )
            continue
        lines.append(
            f"| {item['scenario']} | {item['member_count']} | {item['days']} "
            f"| {item['runtime']['total_seconds']:.2f} "
            f"| {item['sums']['total']:.6f} "
            f"| {objectives['primary_gap_upper_bound']:.3g} "
            f"| {objectives['primary_certified_to_tolerance']}/{objectives['secondary_certified_to_tolerance']} "
            f"| {item['certificate_valid']} |"
        )
    lines.extend(["", "## Expectativas individuais por função", ""])
    for item in report["fairness_cases"]:
        if not item.get("feasible", True):
            continue
        if item["scenario"] not in {
            "scenario-4",
            "scenario-5",
            "scenario-1",
            "scenario-3",
            "ratio-8-dual-8-aux-only",
            "ratio-2-dual-14-aux-only",
        }:
            continue
        lines.extend(
            [
                f"### {item['scenario']} — {item['dual_count']} habilitados para ambas, "
                f"{item['auxiliary_only_count']} somente Auxiliar",
                "",
                "| Militar | E(Auxiliar) | E(Condutor) | E(total) |",
                "|---|---:|---:|---:|",
            ]
        )
        for member_id, expectation in item["expectations_by_member"].items():
            lines.append(
                f"| {member_id} | {expectation['expected_auxiliary']:.9f} "
                f"| {expectation['expected_driver']:.9f} "
                f"| {expectation['expected_total']:.9f} |"
            )
        lines.append("")
    lines.extend(
        [
            "",
            "## Sensibilidade ao limite ampliado",
            "",
            f"Os cenários 1, 3 e 4 foram repetidos com limite configurado de "
            f"{config['sensitivity_time_limit_seconds']} s e até 300 iterações "
            "por fase. O runtime medido mostra se o processo "
            "usou o tempo ou encerrou antes por convergência/coluna repetida.",
            "",
            "| Cenário | Tempo efetivo (s) | Limite (s) | Colunas | Iter. total/funções | Pricing total/funções | Encerramento total/funções | Gap total | Gap funções | Certificação total/funções | Diagnóstico |",
            "|---|---:|---:|---:|---|---|---|---:|---:|---|---|",
        ]
    )
    for item in report["sensitivity_cases"]:
        objectives = item["objectives"]
        runtime = item["runtime"]
        lines.append(
            f"| {item['scenario']} | {runtime['total_seconds']:.2f} "
            f"| {config['sensitivity_time_limit_seconds']} "
            f"| {runtime['columns']} "
            f"| {runtime['primary_iterations']}/{runtime['secondary_iterations']} "
            f"| {item['pricing_status']['primary_final']}/{item['pricing_status']['secondary_final']} "
            f"| {runtime['primary_termination']}/{runtime['secondary_termination']} "
            f"| {objectives['primary_gap_upper_bound']:.3g} "
            f"| {format_gap(objectives['secondary_gap_upper_bound'])} "
            f"| {objectives['primary_certified_to_tolerance']}/{objectives['secondary_certified_to_tolerance']} "
            f"| {'; '.join(item['diagnostics']) or 'nenhum'} |"
        )
    lines.extend(
        [
            "",
            "## Comparação de solvers do mestre",
            "",
            "Os mestres foram comparados sobre as mesmas colunas válidas, extraídas "
            "da mistura do cenário 1. O QP da justiça total foi tentado com "
            "CLARABEL, OSQP e SCS; a fase por função (com bloqueio quadrático) "
            "foi tentada com CLARABEL e SCS. OSQP não suporta a restrição cônica "
            "da fase secundária.",
            "",
            f"- Colunas: {report['master_solver_comparison']['columns']}; "
            f"objetivo primário de referência: "
            f"{report['master_solver_comparison']['primary_best_value']:.3g}; "
            f"bound da fase secundária: "
            f"{report['master_solver_comparison']['primary_lock_bound']:.3g}.",
            f"- Condicionamento efetivo da matriz total: "
            f"{report['master_solver_comparison']['total_design_singular_values']['effective_condition_number']:.3g}; "
            f"da matriz por função: "
            f"{report['master_solver_comparison']['role_design_singular_values']['effective_condition_number']:.3g}.",
            "",
            "| Fase | Solver/configuração | Status | Tempo (s) | Iterações | Primal viável | Desvio total | Objetivo fase função |",
            "|---|---|---|---:|---:|---|---:|---:|",
        ]
    )
    for solver, item in report["master_solver_comparison"]["primary"].items():
        if item["status"] == "ERROR":
            lines.append(f"| Total | {solver} | ERROR | — | — | — | — | — |")
        else:
            lines.append(
                f"| Total | {solver} | {item['status']} "
                f"| {item['wall_time_seconds']:.4f} "
                f"| {item['solver_stats']['num_iters']} "
                f"| {item['primal_feasible']} "
                f"| {item['objective']:.3g} | — |"
            )
    for solver, item in report["master_solver_comparison"]["secondary"].items():
        if item["status"] == "ERROR":
            lines.append(f"| Função | {solver} | ERROR | — | — | — | — | — |")
        else:
            lines.append(
                f"| Função | {solver} | {item['status']} "
                f"| {item['wall_time_seconds']:.4f} "
                f"| {item['solver_stats']['num_iters']} "
                f"| {item['primal_feasible']} "
                f"| {item['primary_value']:.3g} "
                f"| {item['objective']:.6g} |"
            )
    repeat_trials = report["master_solver_comparison"]["repeat_trials"]
    lines.extend(
        [
            "",
            f"Repetições idênticas do mestre: "
            f"{report['master_solver_comparison']['repeat_count']}.",
            "",
            "| Formulação CLARABEL | Status nas repetições | Primal viável | Maior violação |",
            "|---|---|---:|---:|",
        ]
    )
    for solver in (
        "CLARABEL-scaled-soc-warm",
        "CLARABEL-quadratic-lock-warm",
    ):
        observations = [
            trial["secondary"][solver] for trial in repeat_trials
        ]
        status_counts: dict[str, int] = {}
        for item in observations:
            status = item["status"]
            status_counts[status] = status_counts.get(status, 0) + 1
        status_summary = ", ".join(
            f"{status}: {count}/{len(observations)}"
            for status, count in sorted(status_counts.items())
        )
        feasible_count = sum(
            item["primal_feasible"] is True for item in observations
        )
        max_violation = max(
            (
                item["primal_violation"] or 0.0
                for item in observations
            ),
            default=0.0,
        )
        lines.append(
            f"| {solver} | {status_summary} "
            f"| {feasible_count}/{len(observations)} "
            f"| {max_violation:.3g} |"
        )
    lines.extend(
        [
            "",
            "O log detalhado do CLARABEL está em "
            f"`{report['master_solver_comparison']['logs_file']}`. A formulação "
            "com norma SOC escalada é matematicamente equivalente ao limite "
            "quadrático; o multiplicador dual é convertido de volta para as "
            "unidades do objetivo quadrático antes do pricing.",
            "",
            "### Solver primário OSQP + secundário CLARABEL",
            "",
            "| Cenário | Tempo (s) | Mestre total/funções | Pricing total/funções | Gap total/funções | Certificação total/funções |",
            "|---|---:|---|---|---:|---|",
        ]
    )
    for item in report["solver_choice_cases"]:
        objectives = item["objectives"]
        lines.append(
            f"| {item['scenario']} | {item['runtime']['total_seconds']:.2f} "
            f"| {item['runtime']['primary_master_status']}/{item['runtime']['master_status']} "
            f"| {item['pricing_status']['primary_final']}/{item['pricing_status']['secondary_final']} "
            f"| {format_gap(objectives['primary_gap_upper_bound'])}/"
            f"{format_gap(objectives['secondary_gap_upper_bound'])} "
            f"| {objectives['primary_certified_to_tolerance']}/"
            f"{objectives['secondary_certified_to_tolerance']} |"
        )
    lines.extend(
        [
            "",
            "### Reprodutibilidade do cenário 1",
            "",
            "| Execução | PID | Processo isolado | Workers | Seed | Tempo (s) | Colunas | Iterações total/funções | Status mestres | Gaps total/funções | Certificação | Diferença máx. das expectativas vs. primeira |",
            "|---:|---:|---|---:|---:|---:|---:|---|---|---:|---|---:|",
        ]
    )
    for index, item in enumerate(report["reproducibility_trials"]["trials"], 1):
        objectives = item["objectives"]
        runtime = item["runtime"]
        lines.append(
            f"| {index} | {item['process_id']} | {item['process_isolated']} "
            f"| {runtime['pricing_workers']} | {runtime['random_seed']} "
            f"| {runtime['total_seconds']:.2f} | {runtime['columns']} "
            f"| {runtime['primary_iterations']}/{runtime['secondary_iterations']} "
            f"| {runtime['primary_master_status']}/{runtime['master_status']} "
            f"| {format_gap(objectives['primary_gap_upper_bound'])}/"
            f"{format_gap(objectives['secondary_gap_upper_bound'])} "
            f"| {objectives['primary_certified_to_tolerance']}/"
            f"{objectives['secondary_certified_to_tolerance']} "
            f"| {item['max_abs_expectation_difference_from_first']:.3g} |"
        )
    one_worker_trials = [
        item
        for item in report["reproducibility_trials"]["trials"]
        if item["runtime"]["pricing_workers"] == 1
    ]
    multiworker_trials = [
        item
        for item in report["reproducibility_trials"]["trials"]
        if item["runtime"]["pricing_workers"] > 1
    ]
    one_worker_repeats_match = all(
        item["max_abs_expectation_difference_from_first"] == 0
        for item in one_worker_trials
    )
    multiworker_difference = max(
        (
            item["max_abs_expectation_difference_from_first"]
            for item in multiworker_trials
        ),
        default=0.0,
    )
    lines.extend(
        [
            "",
            "### Interpretação",
            "",
            "- Entrada nova, períodos de férias e histórico `ACTUAL` alteram a "
            "elegibilidade diária; as expectativas devem ser obtidas das marginais "
            "das escalas válidas, não de uma divisão uniforme por cabeça.",
            "- O caso de disponibilidade muito reduzida mantém a pessoa no modelo "
            "somente nas datas elegíveis; o descanso entre dias continua aplicado.",
            "- Igualdade total impossível é registrada como ótimo de desvio "
            "estritamente positivo quando certificado. Isso é diferente de falha "
            "do solver ou de inviabilidade da escala.",
            "- Limite de tempo, `optimal_inaccurate` do CLARABEL ou gap acima da "
            "tolerância deixam o cálculo provisório; não autorizam declará-lo ótimo.",
            "- A revisão desta rodada corrigiu a rechecagem secundária: o gradiente "
            "Lagrangiano final deve combinar ambos os gradientes avaliados na "
            "mesma mistura certificada. Reutilizar o gradiente total da mistura "
            "primária produzia um gap artificialmente alto. Também corrigiu o "
            "campo `schedule_dot` do certificado primário, que registrava o "
            "produto da mistura em vez do produto da escala de pricing.",
            "- O teste prévio de capacidade rejeita a equipe com apenas dois "
            "Condutores: cada um cobre no máximo 3 das 10 datas sob descanso de "
            "quatro dias, portanto capacidade total 6 < 10. O teste é necessário, "
            "mas não prova viabilidade quando a capacidade passa.",
            f"- O pricing desta execução usou {config['pricing_workers']} worker(s) "
            f"e seed {config['random_seed']}. As repetições com um worker "
            f"coincidiram exatamente: {one_worker_repeats_match}. "
            f"As execuções multiworker diferiram do primeiro resultado em até "
            f"{multiworker_difference:.3g} na maior expectativa individual; "
            "duas repetições não bastam para uma afirmação geral de "
            "reprodutibilidade multiworker.",
            "- Na comparação final repetida, CLARABEL resolveu o mestre primário "
            "e ambas as formulações secundárias com status `optimal` e viabilidade "
            "primal em todas as repetições. Em execuções exploratórias com "
            "tolerâncias mais estritas, CLARABEL retornou `optimal_inaccurate` "
            "mesmo com ponto primal viável; essa configuração foi descartada. "
            "O `SolverError` capturado é do OSQP, que não suporta a restrição "
            "cônica secundária.",
            "",
            "## Persistência recomendada",
            "",
            "Persistir, por militar e período, expectativas de Auxiliar, Condutor "
            "e total (idealmente como numerador/denominador exatos), junto com "
            "versão da fórmula, período exato, baseline anterior, créditos "
            "acumulados por função, estado de certificação, valores/gaps, "
            "versões/configuração dos solvers, data de cálculo e referência ao "
            "resultado substituído. Calcular o baseline seguinte somando cada "
            "marginal da dezena uma vez, mantendo E_total = E_auxiliar + "
            "E_condutor. "
            "Usar registros imutáveis por execução: somente resultados certificados "
            "podem receber o estado definitivo aprovado; resultados apenas viáveis "
            "ficam provisórios e não atualizam automaticamente o baseline "
            "consolidado. Recalcular período consolidado requer ação explícita e "
            "trilha de auditoria.",
            "",
            "## Limitações e otimizações sem enfraquecer garantias",
            "",
            "- O tempo é limitado por geração de colunas: cada iteração resolve um "
            "pricing CP-SAT; ampliar dias e militares aumenta variáveis, restrições "
            "de descanso e custo do mestre.",
            "- Mais tempo pode diminuir gap, mas não permite prever um tempo "
            "adicional fixo nem garante certificação. A repetição com limite "
            f"configurado de {config['sensitivity_time_limit_seconds']} s registra "
            "se o algoritmo parou antes do limite por pricing sem nova coluna ou "
            "por instabilidade do mestre.",
            "- Otimizações seguras: warm-start e reaproveitamento de colunas entre "
            "fases; manter pricing exato/ótimo para bounds; usar certificados "
            "duais conservadores; melhorar escalonamento numérico do mestre; "
            "remover variáveis inelegíveis e simetrias comprovadamente equivalentes; "
            "e validar cada mudança contra o verificador independente.",
            "- Não reduzir tolerâncias, arredondar expectativas ou aceitar "
            "`FEASIBLE` como certificado apenas para obter mais resultados positivos.",
            "- As colunas são compartilhadas entre fases. O warm-start agora "
            "preserva os pesos existentes e acrescenta zero para cada coluna nova; "
            "antes, o tamanho incompatível fazia o valor inicial ser descartado.",
            "",
            "## Certificados completos",
            "",
            "O JSON associado registra configuração, status, gaps, tempos e "
            "metadados recomendados para persistência. A execução completa da "
            "PoC anterior contém as misturas detalhadas por escala.",
            "",
        ]
    )
    path.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--benchmark-time-limit", type=float, default=30.0)
    parser.add_argument("--fairness-time-limit", type=float, default=15.0)
    parser.add_argument("--sensitivity-time-limit", type=float, default=120.0)
    parser.add_argument("--reproducibility-time-limit", type=float, default=120.0)
    parser.add_argument("--gap-tolerance", type=float, default=1e-4)
    parser.add_argument("--max-iterations", type=int, default=120)
    parser.add_argument("--pricing-workers", type=int, default=1)
    parser.add_argument(
        "--pricing-solver",
        choices=("CP-SAT", "HIGHS"),
        default="HIGHS",
    )
    parser.add_argument("--seed", type=int, default=0)
    parser.add_argument(
        "--single-reproducibility-run",
        action="store_true",
        help=argparse.SUPPRESS,
    )
    parser.add_argument(
        "--primary-master-solver",
        choices=("CLARABEL", "OSQP", "SCS"),
        default="CLARABEL",
    )
    parser.add_argument(
        "--secondary-master-solver",
        choices=("CLARABEL", "SCS"),
        default="CLARABEL",
    )
    parser.add_argument(
        "--output-dir", type=Path, default=Path("reports") / "evaluation"
    )
    args = parser.parse_args()
    if args.single_reproducibility_run:
        scenario = next(
            item for item in build_scenarios() if item.id == "scenario-1"
        )
        print(
            json.dumps(
                run_case(
                    scenario,
                    10,
                    args.fairness_time_limit,
                    args.gap_tolerance,
                    args.max_iterations,
                    args.pricing_workers,
                    args.seed,
                    args.primary_master_solver,
                    args.secondary_master_solver,
                    "CP-SAT",
                ),
                ensure_ascii=False,
            )
        )
        return
    if (
        args.benchmark_time_limit <= 0
        or args.fairness_time_limit <= 0
        or args.sensitivity_time_limit <= 0
        or args.reproducibility_time_limit <= 0
        or args.gap_tolerance <= 0
        or args.max_iterations <= 0
        or args.pricing_workers <= 0
    ):
        parser.error("limites e tolerância devem ser positivos.")

    benchmarks, fairness_cases = make_evaluation_cases()
    sensitivity_cases = [
        (scenario, 10)
        for scenario in build_scenarios()
        if scenario.id in {"scenario-1", "scenario-3", "scenario-4"}
    ]
    report = create_report(
        benchmarks,
        fairness_cases,
        sensitivity_cases,
        args.benchmark_time_limit,
        args.fairness_time_limit,
        args.sensitivity_time_limit,
        args.gap_tolerance,
        args.max_iterations,
        args.pricing_workers,
        args.seed,
        args.output_dir / "clarabel-master-logs.txt",
        args.primary_master_solver,
        args.secondary_master_solver,
        args.pricing_solver,
        args.reproducibility_time_limit,
    )
    args.output_dir.mkdir(parents=True, exist_ok=True)
    json_path = args.output_dir / "fairness-poc-evaluation.json"
    markdown_path = args.output_dir / "fairness-poc-evaluation.md"
    json_path.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    write_markdown(report, markdown_path)
    print(f"JSON: {json_path}")
    print(f"Relatório: {markdown_path}")
    print(
        json.dumps(
            {
                "benchmarks": [
                    {
                        "scenario": item["scenario"],
                        "seconds": item["runtime"]["total_seconds"],
                        "columns": item["runtime"]["columns"],
                        "master_status": (
                            item["runtime"]["primary_master_status"],
                            item["runtime"]["master_status"],
                        ),
                        "pricing_status": item["pricing_status"],
                        "certified": (
                            item["objectives"]["primary_certified_to_tolerance"],
                            item["objectives"]["secondary_certified_to_tolerance"],
                        ),
                    }
                    for item in report["benchmarks"]
                ],
                "fairness_cases": [
                    {
                        "scenario": item["scenario"],
                        "seconds": item["runtime"]["total_seconds"],
                        "certified": (
                            item["objectives"]["primary_certified_to_tolerance"],
                            item["objectives"]["secondary_certified_to_tolerance"],
                        ),
                        "valid": item["certificate_valid"],
                    }
                    for item in report["fairness_cases"]
                ],
                "sensitivity_cases": [
                    {
                        "scenario": item["scenario"],
                        "seconds": item["runtime"]["total_seconds"],
                        "columns": item["runtime"]["columns"],
                        "iterations": (
                            item["runtime"]["primary_iterations"],
                            item["runtime"]["secondary_iterations"],
                        ),
                        "gaps": (
                            item["objectives"]["primary_gap_upper_bound"],
                            item["objectives"]["secondary_gap_upper_bound"],
                        ),
                        "certified": (
                            item["objectives"]["primary_certified_to_tolerance"],
                            item["objectives"]["secondary_certified_to_tolerance"],
                        ),
                    }
                    for item in report["sensitivity_cases"]
                ],
            },
            indent=2,
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
