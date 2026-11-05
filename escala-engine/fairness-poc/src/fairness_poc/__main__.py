from __future__ import annotations

import argparse
import json
import math
import sys
import time
from dataclasses import dataclass
from datetime import date, timedelta
from fractions import Fraction
from pathlib import Path
from typing import Any

import cvxpy as cp
import clarabel
import numpy as np
import ortools
from scipy.optimize import Bounds, LinearConstraint, milp
from scipy.sparse import coo_matrix
from ortools.sat.python import cp_model

ROLES = ("auxiliary", "driver")
MIN_REST_DAYS = 4
PRICING_SCALE = 10**8
DEFAULT_GAP_TOLERANCE = 1e-6
PRIMARY_LOCK_TOLERANCE = 1e-8
PRIMARY_FEASIBILITY_TOLERANCE = 1e-12


@dataclass(frozen=True)
class Member:
    id: str
    can_auxiliary: bool
    can_driver: bool
    entry_date: date


@dataclass(frozen=True)
class Scenario:
    id: str
    title: str
    members: tuple[Member, ...]
    unavailable: dict[str, tuple[tuple[date, date], ...]]
    historical_actual: tuple[tuple[str, date], ...] = ()


@dataclass(frozen=True)
class Problem:
    scenario: Scenario
    days: tuple[date, ...]
    coordinates: tuple[tuple[str, date, str], ...]
    target_total: dict[tuple[str, date], Fraction]
    target_role: dict[tuple[str, date, str], Fraction]


class InfeasibleScheduleError(ValueError):
    pass


def role_capacity_bound(
    eligible_by_day: dict[date, dict[str, set[str]]],
    days: tuple[date, ...],
    role: str,
) -> tuple[int, dict[str, int]]:
    member_capacities: dict[str, int] = {}
    for member_id in sorted(
        {member_id for roles in eligible_by_day.values() for member_id in roles[role]}
    ):
        eligible_dates = [
            service_date
            for service_date in days
            if member_id in eligible_by_day[service_date][role]
        ]
        last_assigned: date | None = None
        capacity = 0
        for service_date in eligible_dates:
            if (
                last_assigned is None
                or (service_date - last_assigned).days >= MIN_REST_DAYS
            ):
                capacity += 1
                last_assigned = service_date
        member_capacities[member_id] = capacity
    return sum(member_capacities.values()), member_capacities


def build_scenarios() -> tuple[Scenario, ...]:
    start = date(2026, 10, 1)
    all_dates = tuple(start + timedelta(days=offset) for offset in range(10))

    def members(
        dual: int,
        auxiliary_only: int,
        new_dual_from_day: int | None = None,
    ) -> tuple[Member, ...]:
        result = [
            Member(f"D{index:02}", True, True, start)
            for index in range(1, dual + 1)
        ]
        result.extend(
            Member(f"A{index:02}", True, False, start)
            for index in range(1, auxiliary_only + 1)
        )
        if new_dual_from_day is not None:
            result.append(
                Member(
                    "NEW01",
                    True,
                    True,
                    start + timedelta(days=new_dual_from_day - 1),
                )
            )
        return tuple(result)

    history = (("D01", date(2026, 9, 27)),)
    return (
        Scenario(
            "scenario-1",
            "16 militares: 14 habilitados para ambas e 2 somente Auxiliar",
            members(14, 2),
            {},
            history,
        ),
        Scenario(
            "scenario-2",
            "10 militares: 4 habilitados para ambas e 6 somente Auxiliar",
            members(4, 6),
            {},
            history,
        ),
        Scenario(
            "scenario-3",
            "Férias: um dos dois Auxiliar-only indisponível nos últimos 5 dias",
            members(14, 2),
            {
                "A02": (
                    (all_dates[5], all_dates[-1]),
                )
            },
            history,
        ),
        Scenario(
            "scenario-4",
            "Entrada: novo militar habilitado para ambas a partir do dia 6",
            members(14, 2, new_dual_from_day=6),
            {},
            history,
        ),
        Scenario(
            "scenario-5",
            "16 militares: 4 habilitados para ambas e 12 somente Auxiliar",
            members(4, 12),
            {},
            history,
        ),
    )


def build_problem(
    scenario: Scenario,
    period_start: date = date(2026, 10, 1),
    day_count: int = 10,
) -> Problem:
    if day_count <= 0:
        raise ValueError("O período deve conter ao menos um dia.")
    days = tuple(period_start + timedelta(days=offset) for offset in range(day_count))
    coordinates: list[tuple[str, date, str]] = []
    eligible_by_day: dict[date, dict[str, set[str]]] = {}
    for service_date in days:
        eligible_by_day[service_date] = {}
        for role in ROLES:
            eligible = {
                member.id
                for member in scenario.members
                if is_eligible(scenario, member, service_date, role)
            }
            eligible_by_day[service_date][role] = eligible
            if not eligible:
                role_label = "Auxiliar" if role == "auxiliary" else "Condutor"
                raise InfeasibleScheduleError(
                    f"{scenario.id}: não há militares habilitados e disponíveis "
                    f"para {role_label} em {service_date}."
                )
            coordinates.extend(
                (member_id, service_date, role)
                for member_id in sorted(eligible)
            )

    target_total: dict[tuple[str, date], Fraction] = {}
    target_role: dict[tuple[str, date, str], Fraction] = {}
    for service_date, roles in eligible_by_day.items():
        any_eligible = roles["auxiliary"] | roles["driver"]
        for member_id in sorted(any_eligible):
            target_total[(member_id, service_date)] = Fraction(
                2, len(any_eligible)
            )
        for role in ROLES:
            eligible = roles[role]
            for member_id in sorted(eligible):
                target_role[(member_id, service_date, role)] = Fraction(
                    1, len(eligible)
                )
    for role in ROLES:
        capacity, member_capacities = role_capacity_bound(
            eligible_by_day, days, role
        )
        if capacity < len(days):
            role_label = "Auxiliar" if role == "auxiliary" else "Condutor"
            details = ", ".join(
                f"{member_id}={member_capacity}"
                for member_id, member_capacity in member_capacities.items()
            )
            raise InfeasibleScheduleError(
                f"{scenario.id}: capacidade máxima para {role_label} é {capacity} "
                f"para {len(days)} vagas, considerando descanso mínimo de "
                f"{MIN_REST_DAYS} dias ({details})."
            )
    return Problem(
        scenario,
        days,
        tuple(coordinates),
        target_total,
        target_role,
    )


def is_eligible(
    scenario: Scenario,
    member: Member,
    service_date: date,
    role: str,
) -> bool:
    qualified = member.can_auxiliary if role == "auxiliary" else member.can_driver
    unavailable = any(
        start <= service_date <= end
        for start, end in scenario.unavailable.get(member.id, ())
    )
    return (
        qualified
        and member.entry_date <= service_date
        and not unavailable
        and not historical_rest_blocks(scenario, member.id, service_date)
    )


def historical_rest_blocks(
    scenario: Scenario,
    member_id: str,
    service_date: date,
) -> bool:
    return any(
        actual_member == member_id
        and abs((service_date - actual_date).days) < MIN_REST_DAYS
        for actual_member, actual_date in scenario.historical_actual
    )


def pricing_lower_bound(pricing: dict[str, Any]) -> float:
    if "best_bound" in pricing:
        return float(pricing["best_bound"]) - float(
            pricing.get("bound_safety_tolerance", 1e-10)
        )
    return (
        float(pricing["best_bound_scaled"]) / PRICING_SCALE
        - float(pricing["quantization_error_bound"])
        - 1e-10
    )


def solve_pricing_highs(
    problem: Problem,
    gradient: np.ndarray | None = None,
    max_time_seconds: float = 10.0,
) -> tuple[np.ndarray, dict[str, Any]]:
    coordinate_index = {
        coordinate: index for index, coordinate in enumerate(problem.coordinates)
    }
    row_indices: list[int] = []
    column_indices: list[int] = []
    coefficients: list[float] = []
    lower_bounds: list[float] = []
    upper_bounds: list[float] = []

    def add_constraint(
        variable_indices: list[int],
        lower_bound: float,
        upper_bound: float,
    ) -> None:
        row = len(lower_bounds)
        lower_bounds.append(lower_bound)
        upper_bounds.append(upper_bound)
        for index in variable_indices:
            row_indices.append(row)
            column_indices.append(index)
            coefficients.append(1.0)

    for service_date in problem.days:
        for role in ROLES:
            add_constraint(
                [
                    index
                    for (member_id, current_date, current_role), index
                    in coordinate_index.items()
                    if current_date == service_date and current_role == role
                ],
                1.0,
                1.0,
            )

    for member in problem.scenario.members:
        eligible_dates = [
            service_date
            for service_date in problem.days
            if any(
                (member.id, service_date, role) in coordinate_index
                for role in ROLES
            )
        ]
        for service_date in eligible_dates:
            same_day = [
                coordinate_index[(member.id, service_date, role)]
                for role in ROLES
                if (member.id, service_date, role) in coordinate_index
            ]
            if len(same_day) > 1:
                add_constraint(same_day, 0.0, 1.0)
        for first_index, first_date in enumerate(eligible_dates):
            for second_date in eligible_dates[first_index + 1 :]:
                if (second_date - first_date).days < MIN_REST_DAYS:
                    add_constraint(
                        [
                            coordinate_index[(member.id, current_date, role)]
                            for current_date in (first_date, second_date)
                            for role in ROLES
                            if (member.id, current_date, role) in coordinate_index
                        ],
                        0.0,
                        1.0,
                    )

    constraint_matrix = coo_matrix(
        (coefficients, (row_indices, column_indices)),
        shape=(len(lower_bounds), len(problem.coordinates)),
    ).tocsr()
    objective = (
        np.zeros(len(problem.coordinates), dtype=float)
        if gradient is None
        else np.asarray(gradient, dtype=float)
    )
    started = time.monotonic()
    result = milp(
        c=objective,
        integrality=np.ones(len(problem.coordinates), dtype=np.uint8),
        bounds=Bounds(0.0, 1.0),
        constraints=LinearConstraint(
            constraint_matrix,
            np.asarray(lower_bounds),
            np.asarray(upper_bounds),
        ),
        options={
            "presolve": True,
            "time_limit": max_time_seconds,
            "mip_rel_gap": 0.0,
        },
    )
    elapsed = time.monotonic() - started
    if result.status == 2:
        raise InfeasibleScheduleError(
            f"{problem.scenario.id}: nenhuma escala satisfaz as regras do período."
        )
    if result.x is None:
        raise RuntimeError(
            f"HiGHS pricing terminou sem escala: {result.message}."
        )
    raw_vector = np.asarray(result.x, dtype=float)
    integrality_violation = float(
        np.max(np.abs(raw_vector - np.rint(raw_vector)))
    )
    if integrality_violation > 1e-8:
        raise RuntimeError(
            "HiGHS pricing retornou variáveis não inteiras "
            f"(violação {integrality_violation:.3g})."
        )
    vector = np.rint(raw_vector)
    scale_validation = validate_mixture(problem, [(vector, Fraction(1))])
    if not scale_validation["valid"]:
        raise RuntimeError(
            "HiGHS pricing retornou uma escala inválida: "
            + "; ".join(scale_validation["violations"])
        )
    status = "OPTIMAL" if result.status == 0 else "FEASIBLE"
    best_bound = getattr(result, "mip_dual_bound", None)
    if status == "OPTIMAL" and (
        best_bound is None or not math.isfinite(float(best_bound))
    ):
        raise RuntimeError("HiGHS não retornou um bound finito para pricing ótimo.")
    pricing = {
        "status": status,
        "solver": "SciPy/HiGHS MILP",
        "objective": float(result.fun),
        "best_bound": float(best_bound) if best_bound is not None else None,
        "bound_safety_tolerance": 1e-10,
        "wall_time_seconds": elapsed,
        "mip_gap": getattr(result, "mip_gap", None),
        "node_count": getattr(result, "mip_node_count", None),
        "integrality_violation": integrality_violation,
        "quantization_error_bound": 0.0,
    }
    return vector, pricing


def schedule_vector(problem: Problem, assignments: set[tuple[str, date, str]]) -> np.ndarray:
    vector = np.zeros(len(problem.coordinates), dtype=float)
    index = {coordinate: position for position, coordinate in enumerate(problem.coordinates)}
    for assignment in assignments:
        vector[index[assignment]] = 1.0
    return vector


def solve_pricing(
    problem: Problem,
    gradient: np.ndarray | None = None,
    max_time_seconds: float = 10.0,
    search_workers: int = 1,
    random_seed: int = 0,
    solver: str = "CP-SAT",
) -> tuple[np.ndarray, dict[str, Any]]:
    normalized_solver = solver.upper()
    if normalized_solver in {"HIGHS", "SCIPY/HIGHS"}:
        return solve_pricing_highs(problem, gradient, max_time_seconds)
    if normalized_solver != "CP-SAT":
        raise ValueError(f"Solver de pricing não suportado pela PoC: {solver}.")
    model = cp_model.CpModel()
    assignment_vars: dict[tuple[str, date, str], cp_model.IntVar] = {}
    coordinate_index = {
        coordinate: index for index, coordinate in enumerate(problem.coordinates)
    }

    for coordinate in problem.coordinates:
        member_id, service_date, role = coordinate
        assignment_vars[coordinate] = model.NewBoolVar(
            f"x_{member_id}_{service_date.isoformat()}_{role}"
        )

    for service_date in problem.days:
        for role in ROLES:
            model.Add(
                sum(
                    variable
                    for (member_id, current_date, current_role), variable
                    in assignment_vars.items()
                    if current_date == service_date and current_role == role
                )
                == 1
            )
        for member in problem.scenario.members:
            auxiliary = assignment_vars.get((member.id, service_date, "auxiliary"))
            driver = assignment_vars.get((member.id, service_date, "driver"))
            if auxiliary is not None and driver is not None:
                model.Add(auxiliary + driver <= 1)

    for member in problem.scenario.members:
        eligible_dates = [
            service_date
            for service_date in problem.days
            if any(
                (member.id, service_date, role) in assignment_vars
                for role in ROLES
            )
        ]
        for first_index, first_date in enumerate(eligible_dates):
            for second_date in eligible_dates[first_index + 1 :]:
                if (second_date - first_date).days < MIN_REST_DAYS:
                    model.Add(
                        sum(
                            assignment_vars[(member.id, current_date, role)]
                            for current_date in (first_date, second_date)
                            for role in ROLES
                            if (member.id, current_date, role) in assignment_vars
                        )
                        <= 1
                    )

    if gradient is not None:
        integer_coefficients = [
            int(round(float(value) * PRICING_SCALE)) for value in gradient
        ]
        model.Minimize(
            sum(
                integer_coefficients[index] * assignment_vars[coordinate]
                for coordinate, index in coordinate_index.items()
            )
        )

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = max_time_seconds
    solver.parameters.num_search_workers = search_workers
    solver.parameters.random_seed = random_seed
    solver.parameters.randomize_search = False
    status_code = solver.Solve(model)
    status = solver.StatusName(status_code)
    if status_code == cp_model.INFEASIBLE:
        raise InfeasibleScheduleError(
            f"{problem.scenario.id}: nenhuma escala satisfaz as regras do período."
        )
    if status_code not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        raise RuntimeError(
            f"{problem.scenario.id}: CP-SAT pricing terminou com {status}."
        )

    chosen = {
        coordinate
        for coordinate, variable in assignment_vars.items()
        if solver.Value(variable)
    }
    vector = schedule_vector(problem, chosen)
    selected_count = len(problem.days) * len(ROLES)
    quantization_error = selected_count / (2 * PRICING_SCALE)
    pricing = {
        "status": status,
        "solver": "OR-Tools CP-SAT",
        "objective_scaled": solver.ObjectiveValue(),
        "best_bound_scaled": solver.BestObjectiveBound(),
        "wall_time_seconds": solver.WallTime(),
        "quantization_error_bound": quantization_error,
        "search_workers": search_workers,
        "random_seed": random_seed,
    }
    return vector, pricing


def marginal_targets(problem: Problem) -> tuple[np.ndarray, np.ndarray]:
    total = np.array(
        [
            float(problem.target_total.get((member_id, service_date), Fraction()))
            for member_id, service_date, _ in problem.coordinates
        ],
        dtype=float,
    )
    function = np.array(
        [
            float(problem.target_role[(member_id, service_date, role)])
            for member_id, service_date, role in problem.coordinates
        ],
        dtype=float,
    )
    return total, function


def objective_values(
    problem: Problem, marginals: np.ndarray
) -> tuple[float, float, np.ndarray, np.ndarray]:
    total_target, function_target = marginal_targets(problem)
    total_actual = marginals.copy()
    for index, (_, _, role) in enumerate(problem.coordinates):
        if role not in ROLES:
            raise AssertionError("Função desconhecida na coordenada.")
    total_diffs: list[float] = []
    seen: set[tuple[str, date]] = set()
    for member_id, service_date, _ in problem.coordinates:
        key = (member_id, service_date)
        if key in seen:
            continue
        seen.add(key)
        indices = [
            index
            for index, coordinate in enumerate(problem.coordinates)
            if coordinate[0] == member_id and coordinate[1] == service_date
        ]
        total_actual[indices] = float(sum(marginals[indices]))
        target = float(problem.target_total.get(key, Fraction()))
        total_diffs.append(total_actual[indices[0]] - target)
    total_value = float(np.dot(total_diffs, total_diffs))
    function_value = float(np.sum((marginals - function_target) ** 2))
    return total_value, function_value, total_actual, function_target


def primary_gradient(problem: Problem, marginals: np.ndarray) -> np.ndarray:
    total_target, _ = marginal_targets(problem)
    gradient = np.zeros(len(problem.coordinates), dtype=float)
    for member_id, service_date in problem.target_total:
        indices = [
            index
            for index, coordinate in enumerate(problem.coordinates)
            if coordinate[0] == member_id and coordinate[1] == service_date
        ]
        current = float(sum(marginals[indices]))
        component = 2 * (current - float(problem.target_total[(member_id, service_date)]))
        for index in indices:
            gradient[index] = component
    return gradient


def function_gradient(problem: Problem, marginals: np.ndarray) -> np.ndarray:
    _, target = marginal_targets(problem)
    return 2 * (marginals - target)


def secondary_lagrangian_gradient(
    problem: Problem, marginals: np.ndarray, multiplier: float
) -> np.ndarray:
    return function_gradient(problem, marginals) + multiplier * primary_gradient(
        problem, marginals
    )


def is_certified_stage(
    pricing_status: str,
    master_status: str,
    gap_upper_bound: float | None,
    gap_tolerance: float,
    master_primal_feasible: bool = True,
) -> bool:
    return (
        pricing_status == "OPTIMAL"
        and master_status == cp.OPTIMAL
        and master_primal_feasible
        and gap_upper_bound is not None
        and math.isfinite(gap_upper_bound)
        and gap_upper_bound <= gap_tolerance
    )


def append_zero_weight(weights: np.ndarray) -> np.ndarray:
    return np.pad(weights, (0, 1))


def norm_constraint_dual_to_squared_objective(
    norm_dual: float,
    constraint_scale: float,
    residual_norm: float,
) -> float:
    if norm_dual <= 0 or constraint_scale <= 0 or residual_norm <= 0:
        return 0.0
    return norm_dual / (2 * constraint_scale * residual_norm)


def solve_restricted_master(
    columns: list[np.ndarray],
    objective: str,
    total_target: np.ndarray,
    function_target: np.ndarray,
    primary_bound: float | None = None,
    warm_start: np.ndarray | None = None,
    solver: str = "CLARABEL",
    verbose: bool = False,
    normalize_primary_constraint: bool = True,
) -> tuple[np.ndarray, dict[str, Any]]:
    matrix = np.column_stack(columns)
    weights = cp.Variable(len(columns), nonneg=True)
    marginals = matrix @ weights
    total_key_index = {
        key: index for index, key in enumerate(_active_total_keys)
    }
    total_operator = np.zeros(
        (len(_active_total_keys), len(_active_coordinates)), dtype=float
    )
    for coordinate_index, (member_id, service_date, _) in enumerate(
        _active_coordinates
    ):
        total_operator[
            total_key_index[(member_id, service_date)], coordinate_index
        ] = 1.0
    total_values = np.array(
        [
            total_target[
                next(
                    index
                    for index, coordinate in enumerate(_active_coordinates)
                    if coordinate[0] == member_id
                    and coordinate[1] == service_date
                )
            ]
            for member_id, service_date in _active_total_keys
        ],
        dtype=float,
    )
    total_matrix = total_operator @ matrix
    total_residual = total_matrix @ weights - total_values
    role_residual = marginals - function_target
    constraints = [cp.sum(weights) == 1]
    total_objective = cp.sum_squares(total_residual)
    function_objective = cp.sum_squares(marginals - function_target)
    total_constraint = None
    primary_constraint_scale = None
    if primary_bound is not None:
        primary_constraint_scale = max(math.sqrt(max(primary_bound, 0.0)), 1e-12)
        if normalize_primary_constraint:
            total_constraint = cp.norm(
                total_residual / primary_constraint_scale, 2
            ) <= math.sqrt(max(primary_bound, 0.0)) / primary_constraint_scale
        else:
            total_constraint = total_objective <= primary_bound
        constraints.append(total_constraint)
    problem_objective = total_objective if objective == "total" else function_objective
    problem = cp.Problem(cp.Minimize(problem_objective), constraints)
    warm_start_used = warm_start is not None and len(warm_start) == len(columns)
    if warm_start_used:
        weights.value = warm_start
    started = time.monotonic()
    solver_options: dict[str, Any]
    if solver == "CLARABEL":
        solver_options = {
            "tol_gap_abs": 1e-9,
            "tol_feas": 1e-9,
            "tol_gap_rel": 1e-9,
            "max_iter": 500,
            "verbose": verbose,
        }
    elif solver == "SCS":
        solver_options = {
            "eps_abs": 1e-7,
            "eps_rel": 1e-7,
            "max_iters": 100_000,
            "verbose": verbose,
        }
    elif solver == "OSQP":
        solver_options = {
            "eps_abs": 1e-9,
            "eps_rel": 1e-9,
            "max_iter": 100_000,
            "polishing": True,
            "verbose": verbose,
        }
    else:
        raise ValueError(f"Solver mestre não suportado pela PoC: {solver}.")
    problem.solve(solver=solver, warm_start=warm_start_used, **solver_options)
    elapsed = time.monotonic() - started
    if weights.value is None or problem.status not in {
        cp.OPTIMAL,
        cp.OPTIMAL_INACCURATE,
    }:
        raise RuntimeError(f"{solver} mestre terminou com {problem.status}.")
    raw_dual_value = (
        float(np.asarray(total_constraint.dual_value).item())
        if total_constraint is not None
        and total_constraint.dual_value is not None
        else 0.0
    )
    raw_weights = np.asarray(weights.value, dtype=float)
    raw_sum = float(raw_weights.sum())
    normalized_weights = np.maximum(raw_weights, 0.0)
    normalized_sum = float(normalized_weights.sum())
    if normalized_sum <= 0:
        raise RuntimeError(f"{solver} mestre retornou pesos sem massa positiva.")
    normalized_weights /= normalized_sum
    resulting_marginals = matrix @ normalized_weights
    resulting_total = total_operator @ resulting_marginals
    total_value = float(np.sum((resulting_total - total_values) ** 2))
    if (
        primary_bound is not None
        and normalize_primary_constraint
    ):
        residual_norm = math.sqrt(total_value)
        dual_value = norm_constraint_dual_to_squared_objective(
            raw_dual_value,
            primary_constraint_scale
            if primary_constraint_scale is not None
            else 1e-12,
            residual_norm,
        )
    else:
        dual_value = raw_dual_value
    resulting_function = float(
        np.sum((resulting_marginals - function_target) ** 2)
    )
    simplex_violation = abs(raw_sum - 1.0)
    nonnegative_violation = max(0.0, -float(raw_weights.min()))
    primary_lock_violation = (
        max(0.0, total_value - primary_bound)
        if primary_bound is not None
        else 0.0
    )
    primal_violation = max(
        simplex_violation,
        nonnegative_violation,
        primary_lock_violation,
    )
    primal_feasible = (
        simplex_violation <= 1e-9
        and nonnegative_violation <= 1e-9
        and primary_lock_violation <= PRIMARY_FEASIBILITY_TOLERANCE
    )
    solver_stats = {
        "num_iters": problem.solver_stats.num_iters,
        "solve_time_seconds": problem.solver_stats.solve_time,
        "setup_time_seconds": problem.solver_stats.setup_time,
    }
    return normalized_weights, {
        "status": problem.status,
        "solver": solver,
        "wall_time_seconds": elapsed,
        "objective": total_value if objective == "total" else resulting_function,
        "reported_objective": float(problem.value),
        "primary_constraint_dual": dual_value,
        "primary_constraint_raw_dual": raw_dual_value,
        "primary_value": total_value,
        "primary_bound": primary_bound,
        "primary_constraint_scale": primary_constraint_scale,
        "normalized_primary_constraint": normalize_primary_constraint,
        "warm_start_provided": warm_start is not None,
        "warm_start_used": warm_start_used,
        "warm_start_length": len(warm_start) if warm_start is not None else None,
        "column_count": len(columns),
        "weight_sum_before_normalization": raw_sum,
        "minimum_raw_weight": float(raw_weights.min()),
        "simplex_violation": simplex_violation,
        "nonnegative_violation": nonnegative_violation,
        "primary_lock_violation": primary_lock_violation,
        "primal_violation": primal_violation,
        "primal_feasible": primal_feasible,
        "solver_stats": solver_stats,
    }


_active_coordinates: tuple[tuple[str, date, str], ...] = ()
_active_total_keys: tuple[tuple[str, date], ...] = ()


def column_generation(
    problem: Problem,
    time_limit_seconds: float,
    gap_tolerance: float,
    max_iterations: int,
    master_solver: str = "CLARABEL",
    pricing_workers: int = 1,
    random_seed: int = 0,
    master_verbose: bool = False,
    secondary_master_solver: str | None = None,
    pricing_solver: str = "CP-SAT",
) -> dict[str, Any]:
    secondary_master_solver = secondary_master_solver or master_solver
    global _active_coordinates, _active_total_keys
    _active_coordinates = problem.coordinates
    _active_total_keys = tuple(problem.target_total)
    started = time.monotonic()
    first, first_pricing = solve_pricing(
        problem,
        max_time_seconds=time_limit_seconds,
        search_workers=pricing_workers,
        random_seed=random_seed,
        solver=pricing_solver,
    )
    columns = [first]
    column_keys = {first.tobytes()}
    total_target, function_target = marginal_targets(problem)
    primary_records: list[dict[str, Any]] = []
    primary_certified = False
    primary_gap = math.inf
    primary_master: dict[str, Any] = {}
    primary_termination = "max_iterations"
    primary_warm_start: np.ndarray | None = None

    for iteration in range(1, max_iterations + 1):
        remaining = time_limit_seconds - (time.monotonic() - started)
        if remaining <= 0:
            primary_termination = "time_limit"
            break
        weights, primary_master = solve_restricted_master(
            columns,
            "total",
            total_target,
            function_target,
            warm_start=primary_warm_start,
            solver=master_solver,
            verbose=master_verbose,
        )
        primary_warm_start = weights.copy()
        marginals = np.column_stack(columns) @ weights
        primary_value, _, _, _ = objective_values(problem, marginals)
        gradient = primary_gradient(problem, marginals)
        schedule, pricing = solve_pricing(
            problem,
            gradient,
            max_time_seconds=max(0.1, remaining),
            search_workers=pricing_workers,
            random_seed=random_seed,
            solver=pricing_solver,
        )
        minimum_dot = float(np.dot(gradient, schedule))
        current_dot = float(np.dot(gradient, marginals))
        lower_bound = pricing_lower_bound(pricing)
        primary_gap = max(0.0, current_dot - lower_bound)
        primary_records.append(
            {
                "iteration": iteration,
                "restricted_objective": primary_value,
                "frank_wolfe_gap_upper_bound": primary_gap,
                "pricing": pricing,
                "master": primary_master.copy(),
            }
        )
        if (
            pricing["status"] == "OPTIMAL"
            and primary_master["status"] == cp.OPTIMAL
            and primary_master["primal_feasible"]
            and primary_gap + PRIMARY_LOCK_TOLERANCE <= gap_tolerance
        ):
            primary_certified = True
            primary_termination = "gap_tolerance"
            break
        key = schedule.tobytes()
        if key in column_keys:
            primary_termination = "duplicate_column_with_gap_above_tolerance"
            break
        columns.append(schedule)
        column_keys.add(key)
        primary_warm_start = append_zero_weight(primary_warm_start)

    weights, primary_master = solve_restricted_master(
        columns,
        "total",
        total_target,
        function_target,
        warm_start=primary_warm_start,
        solver=master_solver,
        verbose=master_verbose,
    )
    marginals = np.column_stack(columns) @ weights
    primary_value, _, _, _ = objective_values(problem, marginals)
    primary_fallback_weights = weights.copy()
    primary_reference_positive = exact_mixture(columns, primary_fallback_weights)
    primary_reference_marginals = mixture_marginals(
        problem, primary_reference_positive
    )
    primary_reference_total, _, _, _ = objective_values(
        problem, primary_reference_marginals
    )
    primary_bound = primary_reference_total + PRIMARY_LOCK_TOLERANCE

    secondary_records: list[dict[str, Any]] = []
    secondary_certified = False
    secondary_gap = math.inf
    secondary_master: dict[str, Any] = {}
    initial_weights = weights.copy()
    fallback_weights = weights.copy()
    fallback_master: dict[str, Any] = {
        "status": "NOT_SOLVED",
        "primary_constraint_dual": 0.0,
    }
    secondary_solver_error: str | None = None
    secondary_termination = "max_iterations"
    for iteration in range(1, max_iterations + 1):
        remaining = time_limit_seconds - (time.monotonic() - started)
        if remaining <= 0:
            secondary_termination = "time_limit"
            break
        try:
            weights, secondary_master = solve_restricted_master(
                columns,
                "functions",
                total_target,
                function_target,
                primary_bound=primary_bound,
                warm_start=initial_weights,
                solver=secondary_master_solver,
                verbose=master_verbose,
            )
        except cp.error.SolverError as error:
            secondary_solver_error = f"{type(error).__name__}: {error}"
            secondary_termination = "master_solver_error"
            break
        initial_weights = weights.copy()
        fallback_weights = weights.copy()
        fallback_master = secondary_master.copy()
        marginals = np.column_stack(columns) @ weights
        actual_total, actual_function, _, _ = objective_values(problem, marginals)
        multiplier = max(0.0, secondary_master["primary_constraint_dual"])
        gradient = secondary_lagrangian_gradient(
            problem, marginals, multiplier
        )
        schedule, pricing = solve_pricing(
            problem,
            gradient,
            max_time_seconds=max(0.1, remaining),
            search_workers=pricing_workers,
            random_seed=random_seed,
            solver=pricing_solver,
        )
        current_dot = float(np.dot(gradient, marginals))
        minimum_dot = float(np.dot(gradient, schedule))
        lower_bound = pricing_lower_bound(pricing)
        lagrangian_gap = (
            multiplier * max(0.0, primary_bound - actual_total)
            + current_dot
            - lower_bound
        )
        secondary_gap = max(0.0, lagrangian_gap)
        secondary_records.append(
            {
                "iteration": iteration,
                "restricted_function_objective": actual_function,
                "primary_value": actual_total,
                "primary_bound": primary_bound,
                "primary_constraint_dual": multiplier,
                "lagrangian_gap_upper_bound": secondary_gap,
                "pricing": pricing,
                "master": secondary_master.copy(),
            }
        )
        if (
            pricing["status"] == "OPTIMAL"
            and secondary_master["status"] == cp.OPTIMAL
            and secondary_master["primal_feasible"]
            and secondary_gap <= gap_tolerance
        ):
            secondary_certified = True
            secondary_termination = "gap_tolerance"
            break
        key = schedule.tobytes()
        if key in column_keys:
            secondary_termination = "duplicate_column_with_gap_above_tolerance"
            break
        columns.append(schedule)
        column_keys.add(key)
        initial_weights = append_zero_weight(initial_weights)

    final_weights = fallback_weights
    secondary_master = fallback_master
    if len(final_weights) < len(columns):
        final_weights = np.pad(final_weights, (0, len(columns) - len(final_weights)))
    final_marginals = np.column_stack(columns) @ final_weights
    final_total, final_function, total_marginals, role_targets = objective_values(
        problem, final_marginals
    )

    positive = exact_mixture(columns, final_weights)
    certificate_marginals = mixture_marginals(problem, positive)
    cert_total, cert_function, _, _ = objective_values(problem, certificate_marginals)
    primary_lock_feasible = (
        cert_total <= primary_bound + PRIMARY_FEASIBILITY_TOLERANCE
    )
    lock_diagnostic: str | None = None
    if not primary_lock_feasible:
        primary_fallback_weights = np.pad(
            primary_fallback_weights,
            (0, len(columns) - len(primary_fallback_weights)),
        )
        positive = exact_mixture(columns, primary_fallback_weights)
        certificate_marginals = mixture_marginals(problem, positive)
        cert_total, cert_function, _, _ = objective_values(
            problem, certificate_marginals
        )
        primary_lock_feasible = (
            cert_total <= primary_bound + PRIMARY_FEASIBILITY_TOLERANCE
        )
        lock_diagnostic = (
            "A mistura secundária ultrapassou o limite numérico da justiça total; "
            "o certificado retornou à mistura da fase total."
        )
    final_primary_gradient = primary_gradient(problem, primary_reference_marginals)
    final_primary_schedule, final_primary_pricing = solve_pricing(
        problem,
        final_primary_gradient,
        max_time_seconds=3.0,
        search_workers=pricing_workers,
        random_seed=random_seed,
        solver=pricing_solver,
    )
    final_primary_lower_bound = pricing_lower_bound(final_primary_pricing)
    primary_pricing_gap = max(
        0.0,
        float(np.dot(final_primary_gradient, primary_reference_marginals))
        - final_primary_lower_bound,
    )
    primary_gap = primary_pricing_gap + max(
        0.0, cert_total - primary_reference_total
    )
    primary_certified = is_certified_stage(
        final_primary_pricing["status"],
        primary_master["status"],
        primary_gap,
        gap_tolerance,
        primary_master["primal_feasible"],
    ) and primary_lock_feasible

    final_dual = max(0.0, secondary_master.get("primary_constraint_dual", 0.0))
    final_secondary_gradient = secondary_lagrangian_gradient(
        problem, certificate_marginals, final_dual
    )
    final_secondary_schedule, final_secondary_pricing = solve_pricing(
        problem,
        final_secondary_gradient,
        max_time_seconds=3.0,
        search_workers=pricing_workers,
        random_seed=random_seed,
        solver=pricing_solver,
    )
    final_secondary_gap: float | None = None
    if primary_lock_feasible:
        final_secondary_lower_bound = pricing_lower_bound(
            final_secondary_pricing
        )
        final_secondary_gap = max(
            0.0,
            final_dual * max(0.0, primary_bound - cert_total)
            + float(np.dot(final_secondary_gradient, certificate_marginals))
            - final_secondary_lower_bound,
        )
    secondary_certified = (
        primary_lock_feasible
        and is_certified_stage(
            final_secondary_pricing["status"],
            secondary_master["status"],
            final_secondary_gap,
            gap_tolerance,
            secondary_master.get("primal_feasible", False),
        )
    )
    if not primary_certified and primary_termination == "gap_tolerance":
        primary_termination = "final_certificate_recheck_failed"
    if not secondary_certified and secondary_termination == "gap_tolerance":
        secondary_termination = "final_certificate_recheck_failed"
    elapsed = time.monotonic() - started

    result = {
        "scenario": problem.scenario.id,
        "title": problem.scenario.title,
        "period": {
            "start": problem.days[0].isoformat(),
            "end": problem.days[-1].isoformat(),
            "days": len(problem.days),
        },
        "historical_actual": [
            {"member_id": member_id, "date": service_date.isoformat()}
            for member_id, service_date in problem.scenario.historical_actual
        ],
        "validation": validate_mixture(problem, positive),
        "expectations": expectations_report(problem, certificate_marginals),
        "objectives": {
            "total_squared_deviation": cert_total,
            "function_squared_deviation": cert_function,
            "primary_best_restricted_value": primary_value,
            "primary_gap_upper_bound": primary_gap,
            "primary_pricing_gap_upper_bound": primary_pricing_gap,
            "primary_reference_total_objective": primary_reference_total,
            "primary_certified_to_tolerance": primary_certified,
            "primary_gap_tolerance": gap_tolerance,
            "secondary_gap_upper_bound": final_secondary_gap,
            "secondary_certified_to_tolerance": secondary_certified,
            "secondary_gap_tolerance": gap_tolerance,
            "primary_bound_for_secondary": primary_bound,
            "primary_lock_tolerance": PRIMARY_LOCK_TOLERANCE,
            "primary_lock_feasible": primary_lock_feasible,
            "hierarchy_certified_to_tolerance": (
                primary_certified and secondary_certified
            ),
        },
        "diagnostics": [
            *(
                [f"Falha explícita no mestre secundário: {secondary_solver_error}"]
                if secondary_solver_error
                else []
            ),
            *([lock_diagnostic] if lock_diagnostic else []),
            *(
                [
                    "A geração de colunas da justiça total parou por coluna repetida "
                    "antes de atingir a tolerância."
                ]
                if primary_termination
                == "duplicate_column_with_gap_above_tolerance"
                else []
            ),
            *(
                [
                    "A geração de colunas da justiça por função parou por coluna "
                    "repetida antes de atingir a tolerância."
                ]
                if secondary_termination
                == "duplicate_column_with_gap_above_tolerance"
                else []
            ),
            *(
                [
                    "A verificação final da justiça total não confirmou o "
                    "certificado após a mistura final."
                ]
                if primary_termination == "final_certificate_recheck_failed"
                else []
            ),
            *(
                [
                    "A verificação final da justiça por função não confirmou o "
                    "certificado após a mistura final."
                ]
                if secondary_termination == "final_certificate_recheck_failed"
                else []
            ),
        ],
        "runtime": {
            "total_seconds": elapsed,
            "columns": len(columns),
            "primary_iterations": len(primary_records),
            "secondary_iterations": len(secondary_records),
            "master_solver": master_solver,
            "secondary_master_solver": secondary_master_solver,
            "pricing_solver": pricing_solver,
            "master_status": secondary_master["status"],
            "primary_master_status": primary_master["status"],
            "primary_master_diagnostics": primary_master,
            "secondary_master_diagnostics": secondary_master,
            "primary_termination": primary_termination,
            "secondary_termination": secondary_termination,
            "pricing_workers": pricing_workers,
            "random_seed": random_seed,
        },
        "certificate": {
            "primary_reference_mixture": [
                {
                    "weight": float(weight),
                    "weight_exact": {
                        "numerator": weight.numerator,
                        "denominator": weight.denominator,
                    },
                    "assignments": assignments_from_vector(problem, column),
                }
                for column, weight in primary_reference_positive
            ],
            "mixtures": [
                {
                    "weight": float(weight),
                    "weight_exact": {
                        "numerator": weight.numerator,
                        "denominator": weight.denominator,
                    },
                    "assignments": assignments_from_vector(problem, column),
                }
                for column, weight in positive
            ],
            "pricing_certificates": {
                "primary_last": primary_records[-1] if primary_records else None,
                "secondary_last": (
                    secondary_records[-1] if secondary_records else None
                ),
                "secondary_final": {
                    "gradient": final_secondary_gradient.tolist(),
                    "schedule_dot": float(
                        np.dot(final_secondary_gradient, final_secondary_schedule)
                    ),
                    "pricing_schedule": assignments_from_vector(
                        problem, final_secondary_schedule
                    ),
                    "lower_bound": pricing_lower_bound(
                        final_secondary_pricing
                    ),
                    "pricing": final_secondary_pricing,
                    "dual_multiplier": final_dual,
                    "raw_dual_multiplier": secondary_master.get(
                        "primary_constraint_raw_dual", 0.0
                    ),
                    "primary_constraint_scale": secondary_master.get(
                        "primary_constraint_scale"
                    ),
                    "master_status": secondary_master["status"],
                    "master_primal_feasible": secondary_master.get(
                        "primal_feasible", False
                    ),
                },
                "primary_final": {
                    "gradient": final_primary_gradient.tolist(),
                    "schedule_dot": float(
                        np.dot(final_primary_gradient, final_primary_schedule)
                    ),
                    "pricing_schedule": assignments_from_vector(
                        problem, final_primary_schedule
                    ),
                    "lower_bound": final_primary_lower_bound,
                    "pricing": final_primary_pricing,
                    "master_status": primary_master["status"],
                    "master_primal_feasible": primary_master.get(
                        "primal_feasible", False
                    ),
                    "pricing_gap_upper_bound": primary_pricing_gap,
                    "reference_total_objective": primary_reference_total,
                    "final_objective_gap_allowance": max(
                        0.0, cert_total - primary_reference_total
                    ),
                },
            },
        },
    }
    return result


def assignments_from_vector(
    problem: Problem, vector: np.ndarray
) -> list[dict[str, str]]:
    assignments = []
    for value, (member_id, service_date, role) in zip(vector, problem.coordinates):
        if value > 0.5:
            assignments.append(
                {
                    "member_id": member_id,
                    "date": service_date.isoformat(),
                    "role": role,
                }
            )
    return sorted(assignments, key=lambda item: (item["date"], item["role"]))


def exact_mixture(
    columns: list[np.ndarray], weights: np.ndarray
) -> list[tuple[np.ndarray, Fraction]]:
    mixture = [
        (column, Fraction(float(weight)).limit_denominator(1_000_000_000_000))
        for column, weight in zip(columns, weights)
        if weight > 1e-9
    ]
    weight_sum = sum((weight for _, weight in mixture), Fraction())
    if weight_sum <= 0:
        raise RuntimeError("O mestre não produziu pesos positivos para a mistura.")
    return [
        (column, weight / weight_sum)
        for column, weight in mixture
    ]


def mixture_marginals(
    problem: Problem, mixture: list[tuple[np.ndarray, Fraction]]
) -> np.ndarray:
    return sum(
        (column * float(weight) for column, weight in mixture),
        np.zeros(len(problem.coordinates), dtype=float),
    )


def validate_mixture(
    problem: Problem, mixture: list[tuple[np.ndarray, Fraction | float]]
) -> dict[str, Any]:
    violations: list[str] = []
    weight_sum = sum((weight for _, weight in mixture), Fraction())
    if abs(weight_sum - 1) > 1e-7:
        violations.append(f"Soma dos pesos difere de 1: {weight_sum}.")
    for index, (vector, weight) in enumerate(mixture, start=1):
        if weight < -1e-10:
            violations.append(f"Peso negativo na escala {index}.")
        selected = {
            coordinate
            for value, coordinate in zip(vector, problem.coordinates)
            if value > 0.5
        }
        if len(selected) != len(problem.days) * 2:
            violations.append(
                f"Escala {index} não contém exatamente duas designações por dia."
            )
        for service_date in problem.days:
            for role in ROLES:
                assigned = [
                    member_id
                    for member_id, assigned_date, assigned_role in selected
                    if assigned_date == service_date and assigned_role == role
                ]
                if len(assigned) != 1:
                    violations.append(
                        f"Escala {index}: {len(assigned)} vagas para {role} em {service_date}."
                    )
            day_members = [
                member_id
                for member_id, assigned_date, _ in selected
                if assigned_date == service_date
            ]
            if len(day_members) != len(set(day_members)):
                violations.append(
                    f"Escala {index}: pessoa em duas funções em {service_date}."
                )
        by_member: dict[str, list[date]] = {}
        members = {member.id: member for member in problem.scenario.members}
        for member_id, service_date, role in selected:
            by_member.setdefault(member_id, []).append(service_date)
            member = members[member_id]
            if not is_eligible(problem.scenario, member, service_date, role):
                violations.append(
                    f"Escala {index}: designação inelegível {member_id}/{role}/{service_date}."
                )
        for member_id, service_dates in by_member.items():
            dates = sorted(service_dates)
            for first, second in zip(dates, dates[1:]):
                if (second - first).days < MIN_REST_DAYS:
                    violations.append(
                        f"Escala {index}: descanso menor que quatro dias para {member_id}."
                    )
    return {
        "valid": not violations,
        "mixture_count": len(mixture),
        "weight_sum": float(weight_sum),
        "weight_sum_exact": (
            weight_sum.numerator,
            weight_sum.denominator,
        )
        if isinstance(weight_sum, Fraction)
        else None,
        "all_scales_valid": not violations,
        "violations": violations,
    }


def expectations_report(problem: Problem, marginals: np.ndarray) -> dict[str, Any]:
    report: dict[str, Any] = {}
    per_day: dict[str, Any] = {}
    for member in problem.scenario.members:
        by_role = {role: 0.0 for role in ROLES}
        for value, (member_id, _, role) in zip(marginals, problem.coordinates):
            if member_id == member.id:
                by_role[role] += float(value)
        total = by_role["auxiliary"] + by_role["driver"]
        report[member.id] = {
            "expected_auxiliary": by_role["auxiliary"],
            "expected_driver": by_role["driver"],
            "expected_total": total,
        }
        if abs(total - by_role["auxiliary"] - by_role["driver"]) > 1e-9:
            raise AssertionError("E_total não é a soma das expectativas por função.")

    for service_date in problem.days:
        day_data = {}
        for role in ROLES:
            day_data[role] = sum(
                float(value)
                for value, (_, current_date, current_role) in zip(
                    marginals, problem.coordinates
                )
                if current_date == service_date and current_role == role
            )
        day_data["total"] = day_data["auxiliary"] + day_data["driver"]
        per_day[service_date.isoformat()] = day_data
    return {
        "by_member": report,
        "by_day": per_day,
        "sums": {
            "auxiliary": sum(
                item["expected_auxiliary"] for item in report.values()
            ),
            "driver": sum(item["expected_driver"] for item in report.values()),
            "total": sum(item["expected_total"] for item in report.values()),
        },
    }


def candidate_report(problem: Problem) -> dict[str, Any]:
    by_group: dict[str, tuple[Fraction, Fraction, Fraction]]
    if problem.scenario.id == "scenario-1":
        by_group = {
            "dual": (Fraction(15, 28), Fraction(5, 7), Fraction(5, 4)),
            "auxiliary_only": (Fraction(5, 4), Fraction(), Fraction(5, 4)),
        }
    elif problem.scenario.id == "scenario-2":
        by_group = {
            "dual": (Fraction(), Fraction(5, 2), Fraction(5, 2)),
            "auxiliary_only": (Fraction(5, 3), Fraction(), Fraction(5, 3)),
        }
    elif problem.scenario.id == "scenario-3":
        by_group = {
            "dual": (Fraction(97, 168), Fraction(5, 7), Fraction(31, 24)),
            "auxiliary_full": (Fraction(31, 24), Fraction(), Fraction(31, 24)),
            "auxiliary_limited": (Fraction(5, 8), Fraction(), Fraction(5, 8)),
        }
    elif problem.scenario.id == "scenario-4":
        by_group = {
            "dual": (Fraction(1493, 2856), Fraction(29, 42), Fraction(165, 136)),
            "auxiliary_only": (Fraction(165, 136), Fraction(), Fraction(165, 136)),
            "new": (Fraction(13, 51), Fraction(1, 3), Fraction(10, 17)),
        }
    elif problem.scenario.id == "scenario-5":
        by_group = {
            "dual": (Fraction(), Fraction(5, 2), Fraction(5, 2)),
            "auxiliary_only": (Fraction(5, 6), Fraction(), Fraction(5, 6)),
        }
    else:
        raise ValueError(f"Cenário sem tabela candidata: {problem.scenario.id}")

    report: dict[str, Any] = {}
    for member in problem.scenario.members:
        if member.id == "NEW01":
            group = "new"
        elif (
            problem.scenario.id == "scenario-3"
            and not member.can_driver
            and member.id == "A02"
        ):
            group = "auxiliary_limited"
        elif problem.scenario.id == "scenario-3" and not member.can_driver:
            group = "auxiliary_full"
        elif member.can_driver:
            group = "dual"
        else:
            group = "auxiliary_only"
        auxiliary, driver, total = by_group[group]
        report[member.id] = {
            "auxiliary": float(auxiliary),
            "driver": float(driver),
            "total": float(total),
        }
    return report


def compare_to_candidate(problem: Problem, actual: dict[str, Any]) -> dict[str, Any]:
    candidate = candidate_report(problem)
    comparisons: dict[str, Any] = {}
    for member_id, actual_row in actual["by_member"].items():
        candidate_row = candidate[member_id]
        comparisons[member_id] = {
            metric: {
                "candidate": candidate_row[metric.replace("expected_", "")],
                "poc": actual_row[metric],
                "difference": actual_row[metric]
                - candidate_row[metric.replace("expected_", "")],
            }
            for metric in (
                "expected_auxiliary",
                "expected_driver",
                "expected_total",
            )
        }
    return comparisons


def run_history_stress(
    base: Scenario,
    time_limit_seconds: float,
    gap_tolerance: float,
    max_iterations: int,
    master_solver: str = "CLARABEL",
    pricing_workers: int = 1,
    random_seed: int = 0,
    master_verbose: bool = False,
    secondary_master_solver: str | None = None,
    pricing_solver: str = "CP-SAT",
) -> dict[str, Any]:
    stressed = Scenario(
        "history-rest-check",
        "Verificação extra: ACTUAL em 29/09 bloqueia 01/10 e 02/10",
        base.members,
        base.unavailable,
        (("D01", date(2026, 9, 29)),),
    )
    problem = build_problem(stressed)
    result = column_generation(
        problem,
        time_limit_seconds,
        gap_tolerance,
        max_iterations,
        master_solver,
        pricing_workers,
        random_seed,
        master_verbose,
        secondary_master_solver,
        pricing_solver,
    )
    blocked_expected = [
        date(2026, 10, 1).isoformat(),
        date(2026, 10, 2).isoformat(),
    ]
    member_dates = {
        row["date"]
        for mixture in result["certificate"]["mixtures"]
        for row in mixture["assignments"]
        if row["member_id"] == "D01"
    }
    result["history_rest_check"] = {
        "blocked_dates": blocked_expected,
        "member_has_assignment_on_blocked_dates": bool(
            member_dates.intersection(blocked_expected)
        ),
    }
    return result


def run_all(
    time_limit_seconds: float,
    gap_tolerance: float,
    max_iterations: int,
    master_solver: str = "CLARABEL",
    pricing_workers: int = 1,
    random_seed: int = 0,
    master_verbose: bool = False,
    secondary_master_solver: str | None = None,
    pricing_solver: str = "CP-SAT",
) -> dict[str, Any]:
    results = []
    for scenario in build_scenarios():
        problem = build_problem(scenario)
        result = column_generation(
            problem,
            time_limit_seconds,
            gap_tolerance,
            max_iterations,
            master_solver,
            pricing_workers,
            random_seed,
            master_verbose,
            secondary_master_solver,
            pricing_solver,
        )
        result["candidate_comparison"] = compare_to_candidate(
            problem, result["expectations"]
        )
        results.append(result)
    history = run_history_stress(
        build_scenarios()[0],
        time_limit_seconds,
        gap_tolerance,
        max_iterations,
        master_solver,
        pricing_workers,
        random_seed,
        master_verbose,
        secondary_master_solver,
        pricing_solver,
    )
    return {
        "title": "Prova de conceito independente de expectativas por marginais",
        "method": {
            "primary_objective": "min sum_(i,d) (p_total[i,d] - 2/n[d])^2",
            "secondary_objective": (
                "min sum_(i,d,r) (p[i,d,r] - 1/n[d,r])^2 "
                "subject to primary optimum within reported tolerance"
            ),
            "mixture": "nonnegative weights summing to one over valid integer schedules",
            "pricing": pricing_solver,
            "master": (
                f"CVXPY with {master_solver} in the total phase and "
                f"{secondary_master_solver or master_solver} in the role phase"
            ),
            "minimum_rest_days": MIN_REST_DAYS,
            "preferred_eight_day_interval_used_as_constraint": False,
        },
        "scenarios": results,
        "history_stress": history,
    }


def verify_report(report: dict[str, Any]) -> dict[str, Any]:
    checks = []
    for result in report["scenarios"] + [report["history_stress"]]:
        scenario = next(
            (
                scenario
                for scenario in build_scenarios()
                if scenario.id == result["scenario"]
            ),
            None,
        )
        if result["scenario"] == "history-rest-check":
            base = build_scenarios()[0]
            scenario = Scenario(
                "history-rest-check",
                result["title"],
                base.members,
                base.unavailable,
                (("D01", date(2026, 9, 29)),),
            )
        if scenario is None:
            raise ValueError(f"Cenário desconhecido: {result['scenario']}")
        problem = build_problem(scenario)
        mixture: list[tuple[np.ndarray, Fraction]] = []
        for certified_scale in result["certificate"]["mixtures"]:
            vector = schedule_vector(
                problem,
                {
                    (item["member_id"], date.fromisoformat(item["date"]), item["role"])
                    for item in certified_scale["assignments"]
                },
            )
            exact = certified_scale["weight_exact"]
            mixture.append(
                (
                    vector,
                    Fraction(exact["numerator"], exact["denominator"]),
                )
            )
        exact_weight_sum = sum(
            (weight for _, weight in mixture), Fraction()
        )
        validation = validate_mixture(problem, mixture)
        recomputed_marginals = sum(
            (
                vector * float(weight)
                for vector, weight in mixture
            ),
            np.zeros(len(problem.coordinates), dtype=float),
        )
        recomputed_expectations = expectations_report(problem, recomputed_marginals)
        stored_expectations = result["expectations"]
        recomputed_total_objective, recomputed_function_objective, _, _ = (
            objective_values(problem, recomputed_marginals)
        )
        expectation_match = all(
            abs(
                recomputed_expectations["by_member"][member_id][key]
                - stored_expectations["by_member"][member_id][key]
            )
            <= 1e-8
            for member_id in recomputed_expectations["by_member"]
            for key in ("expected_auxiliary", "expected_driver", "expected_total")
        )
        objective_match = (
            abs(
                recomputed_total_objective
                - result["objectives"]["total_squared_deviation"]
            )
            <= 1e-8
            and abs(
                recomputed_function_objective
                - result["objectives"]["function_squared_deviation"]
            )
            <= 1e-8
        )
        validation["weight_sum_exactly_one"] = exact_weight_sum == 1
        validation["marginals_match_certificate"] = expectation_match
        validation["objectives_match_certificate"] = objective_match
        validation["valid"] = (
            validation["valid"]
            and exact_weight_sum == 1
            and expectation_match
            and objective_match
        )
        optimality_validation = verify_optimality_certificate(
            problem, result, recomputed_marginals
        )
        checks.append(
            {
                "scenario": result["scenario"],
                "valid": validation["valid"],
                "validation": validation,
                "optimality_certificate_valid": optimality_validation["valid"],
                "optimality": optimality_validation,
            }
        )
    return {
        "valid": all(
            item["valid"] and item["optimality_certificate_valid"]
            for item in checks
        ),
        "checks": checks,
    }


def verify_optimality_certificate(
    problem: Problem,
    result: dict[str, Any],
    marginals: np.ndarray,
) -> dict[str, Any]:
    objectives = result["objectives"]
    certificate = result["certificate"]["pricing_certificates"]
    total_value, _, _, _ = objective_values(problem, marginals)
    primary_reference_mixture: list[tuple[np.ndarray, Fraction]] = []
    for certified_scale in result["certificate"]["primary_reference_mixture"]:
        vector = schedule_vector(
            problem,
            {
                (item["member_id"], date.fromisoformat(item["date"]), item["role"])
                for item in certified_scale["assignments"]
            },
        )
        exact = certified_scale["weight_exact"]
        primary_reference_mixture.append(
            (
                vector,
                Fraction(exact["numerator"], exact["denominator"]),
            )
        )
    primary_reference_validation = validate_mixture(
        problem, primary_reference_mixture
    )
    primary_reference_weight_sum = sum(
        (weight for _, weight in primary_reference_mixture), Fraction()
    )
    primary_reference_marginals = mixture_marginals(
        problem, primary_reference_mixture
    )
    primary_reference_total, _, _, _ = objective_values(
        problem, primary_reference_marginals
    )
    primary_expected_gradient = primary_gradient(problem, marginals)
    primary_reference_gradient = primary_gradient(
        problem, primary_reference_marginals
    )
    primary_certificate = certificate.get("primary_final")
    secondary_certificate = certificate.get("secondary_final")
    checks: dict[str, Any] = {}

    for stage, stage_certificate, expected_gradient in (
        ("primary", primary_certificate, primary_reference_gradient),
        (
            "secondary",
            secondary_certificate,
            function_gradient(problem, marginals)
            + max(
                0.0,
                float(
                    secondary_certificate.get("dual_multiplier", 0.0)
                    if secondary_certificate
                    else 0.0
                ),
            )
            * primary_expected_gradient,
        ),
    ):
        if stage_certificate is None:
            checks[stage] = {"valid": False, "reason": "certificado ausente"}
            continue
        assignments = {
            (
                item["member_id"],
                date.fromisoformat(item["date"]),
                item["role"],
            )
            for item in stage_certificate["pricing_schedule"]
        }
        vector = schedule_vector(problem, assignments)
        schedule_validation = validate_mixture(
            problem, [(vector, Fraction(1))]
        )
        gradient = np.asarray(stage_certificate["gradient"], dtype=float)
        pricing = stage_certificate["pricing"]
        lower_bound = pricing_lower_bound(pricing)
        dot_value = float(np.dot(gradient, vector))
        stage_marginals = (
            primary_reference_marginals if stage == "primary" else marginals
        )
        current_dot = float(np.dot(gradient, stage_marginals))
        pricing_gap = max(0.0, current_dot - lower_bound)
        expected_gap = (
            pricing_gap
            + max(0.0, total_value - primary_reference_total)
            if stage == "primary"
            else max(
                0.0,
                max(0.0, stage_certificate["dual_multiplier"])
                * max(
                    0.0,
                    objectives["primary_bound_for_secondary"] - total_value,
                )
                + current_dot
                - lower_bound,
            )
        )
        stored_gap = objectives[
            "primary_gap_upper_bound"
            if stage == "primary"
            else "secondary_gap_upper_bound"
        ]
        gap_components_match = True
        if stage == "primary":
            gap_components_match = (
                abs(
                    stage_certificate["pricing_gap_upper_bound"] - pricing_gap
                )
                <= 1e-8
                and abs(
                    stage_certificate["reference_total_objective"]
                    - primary_reference_total
                )
                <= 1e-8
                and abs(
                    stage_certificate["final_objective_gap_allowance"]
                    - max(0.0, total_value - primary_reference_total)
                )
                <= 1e-8
            )
        claimed = objectives[
            "primary_certified_to_tolerance"
            if stage == "primary"
            else "secondary_certified_to_tolerance"
        ]
        gradient_match = (
            gradient.shape == expected_gradient.shape
            and float(np.max(np.abs(gradient - expected_gradient))) <= 1e-8
        )
        gap_match = (
            stored_gap is not None and abs(stored_gap - expected_gap) <= 1e-8
        ) and gap_components_match
        claim_sound = (
            not claimed
            or (
                pricing["status"] == "OPTIMAL"
                and stage_certificate["master_status"] == cp.OPTIMAL
                and stage_certificate["master_primal_feasible"]
                and gap_match
                and stored_gap <= objectives[f"{stage}_gap_tolerance"]
                and schedule_validation["valid"]
                and (
                    stage != "primary"
                    or (
                        primary_reference_validation["valid"]
                        and primary_reference_weight_sum == 1
                    )
                )
            )
        )
        dual_conversion_valid = True
        if stage == "secondary":
            raw_dual = float(stage_certificate["raw_dual_multiplier"])
            constraint_scale = stage_certificate["primary_constraint_scale"]
            expected_dual = norm_constraint_dual_to_squared_objective(
                raw_dual,
                float(constraint_scale) if constraint_scale is not None else 1e-12,
                math.sqrt(max(total_value, 0.0)),
            )
            dual_conversion_valid = (
                abs(expected_dual - stage_certificate["dual_multiplier"]) <= 1e-8
            )
        schedule_dot_matches = (
            abs(dot_value - stage_certificate["schedule_dot"]) <= 1e-8
        )
        lower_bound_matches = (
            abs(lower_bound - stage_certificate["lower_bound"]) <= 1e-8
        )
        checks[stage] = {
            "valid": (
                schedule_validation["valid"]
                and gradient_match
                and dual_conversion_valid
                and schedule_dot_matches
                and lower_bound_matches
                and (gap_match or stored_gap is None)
                and claim_sound
                and (
                    stage != "primary"
                    or (
                        primary_reference_validation["valid"]
                        and primary_reference_weight_sum == 1
                    )
                )
            ),
            "pricing_schedule_valid": schedule_validation["valid"],
            "gradient_matches_marginals": gradient_match,
            "pricing_status": pricing["status"],
            "master_status": stage_certificate["master_status"],
            "master_primal_feasible": stage_certificate[
                "master_primal_feasible"
            ],
            "dual_conversion_valid": dual_conversion_valid,
            "gap_matches": gap_match,
            "gap_components_match": gap_components_match,
            "claim_sound": claim_sound,
            "schedule_dot_matches": schedule_dot_matches,
            "recomputed_schedule_dot": dot_value,
            "reported_schedule_dot": stage_certificate["schedule_dot"],
            "lower_bound_matches": lower_bound_matches,
            "recomputed_gap_upper_bound": expected_gap,
            "reported_gap_upper_bound": stored_gap,
            "claimed_certified": claimed,
            "primary_reference_mixture_valid": (
                primary_reference_validation["valid"]
                and primary_reference_weight_sum == 1
            ),
        }
    return {
        "valid": all(item["valid"] for item in checks.values()),
        "primary_lock_feasible": (
            total_value
            <= objectives["primary_bound_for_secondary"]
            + PRIMARY_FEASIBILITY_TOLERANCE
        ),
        "stages": checks,
    }


def write_markdown(report: dict[str, Any], path: Path) -> None:
    def format_gap(value: float | None) -> str:
        return f"{value:.3g}" if value is not None else "não calculado"

    lines = [
        "# Relatório da prova de conceito de expectativas",
        "",
        "Os certificados de mistura listam escalas inteiras válidas e pesos. "
        "A certificação de otimalidade é numérica e baseada no gap de Frank-Wolfe "
        "da fase total e no gap Lagrangiano da fase por função; não equivale a "
        "uma prova simbólica exata.",
        "",
        "| Cenário | E(Auxiliar) | E(Condutor) | E(total) | Misturas | Tempo (s) | Certificado total | Certificado funções |",
        "|---|---:|---:|---:|---:|---:|---|---|",
    ]
    for result in report["scenarios"]:
        sums = result["expectations"]["sums"]
        lines.append(
            f"| {result['scenario']} | {sums['auxiliary']:.9f} "
            f"| {sums['driver']:.9f} | {sums['total']:.9f} "
            f"| {result['validation']['mixture_count']} "
            f"| {result['runtime']['total_seconds']:.3f} "
            f"| {result['objectives']['primary_certified_to_tolerance']} "
            f"| {result['objectives']['secondary_certified_to_tolerance']} |"
        )
    lines.extend(["", "## Expectativas por militar", ""])
    for result in report["scenarios"]:
        lines.extend([f"### {result['scenario']} — {result['title']}", ""])
        lines.extend(
            [
                "| Militar | Auxiliar | Condutor | Total |",
                "|---|---:|---:|---:|",
            ]
        )
        for member_id, values in result["expectations"]["by_member"].items():
            lines.append(
                f"| {member_id} | {values['expected_auxiliary']:.9f} "
                f"| {values['expected_driver']:.9f} "
                f"| {values['expected_total']:.9f} |"
            )
        lines.extend(["", "### Comparação com os candidatos anteriores", ""])
        lines.extend(
            [
                "| Grupo | Aux. candidato | Aux. PoC | Cond. candidato | Cond. PoC | Total candidato | Total PoC |",
                "|---|---:|---:|---:|---:|---:|---:|",
            ]
        )
        grouped: dict[str, list[str]] = {
            "dual": [],
            "auxiliary_only": [],
            "auxiliary_full": [],
            "auxiliary_limited": [],
            "new": [],
        }
        members = {member.id: member for member in build_scenarios_by_id()[result["scenario"]].members}
        for member_id, values in result["candidate_comparison"].items():
            member = members[member_id]
            group = (
                "new"
                if member.id == "NEW01"
                else "dual"
                if member.can_driver
                else "auxiliary_limited"
                if result["scenario"] == "scenario-3" and member.id == "A02"
                else "auxiliary_full"
                if result["scenario"] == "scenario-3"
                else "auxiliary_only"
            )
            grouped[group].append(member_id)
        for group, member_ids in grouped.items():
            if not member_ids:
                continue
            averages = {}
            for metric in ("expected_auxiliary", "expected_driver", "expected_total"):
                averages[metric] = {
                    kind: sum(
                        result["candidate_comparison"][member_id][metric][kind]
                        for member_id in member_ids
                    )
                    / len(member_ids)
                    for kind in ("candidate", "poc")
                }
            lines.append(
                f"| {group} ({len(member_ids)}) "
                f"| {averages['expected_auxiliary']['candidate']:.9f} "
                f"| {averages['expected_auxiliary']['poc']:.9f} "
                f"| {averages['expected_driver']['candidate']:.9f} "
                f"| {averages['expected_driver']['poc']:.9f} "
                f"| {averages['expected_total']['candidate']:.9f} "
                f"| {averages['expected_total']['poc']:.9f} |"
            )
        lines.extend(
            [
                "",
                f"Desvios quadráticos: total `{result['objectives']['total_squared_deviation']:.12g}`, "
                f"funções `{result['objectives']['function_squared_deviation']:.12g}`. "
                f"Gaps certificados informados pelo solver: total "
                f"`{result['objectives']['primary_gap_upper_bound']:.3g}`, funções "
                f"`{format_gap(result['objectives']['secondary_gap_upper_bound'])}`.",
                "",
            ]
        )
        if result.get("diagnostics"):
            lines.extend(
                [
                    "**Diagnóstico:** " + " ".join(result["diagnostics"]),
                    "",
                ]
            )
    stress = report["history_stress"]
    lines.extend(
        [
            "## Verificação adicional do histórico ACTUAL",
            "",
            f"Histórico `D01` em 2026-09-29: bloqueio esperado em "
            f"{', '.join(stress['history_rest_check']['blocked_dates'])}. "
            f"Atribuição indevida encontrada: "
            f"`{stress['history_rest_check']['member_has_assignment_on_blocked_dates']}`.",
            "",
            "Os certificados completos, incluindo todas as escalas e pesos, "
            "estão no arquivo JSON junto deste relatório.",
            "",
        ]
    )
    path.write_text("\n".join(lines), encoding="utf-8")


def build_scenarios_by_id() -> dict[str, Scenario]:
    return {scenario.id: scenario for scenario in build_scenarios()}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--time-limit", type=float, default=120.0)
    parser.add_argument("--gap-tolerance", type=float, default=DEFAULT_GAP_TOLERANCE)
    parser.add_argument("--max-iterations", type=int, default=300)
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
    parser.add_argument("--pricing-workers", type=int, default=1)
    parser.add_argument(
        "--pricing-solver",
        choices=("CP-SAT", "HIGHS"),
        default="HIGHS",
    )
    parser.add_argument("--seed", type=int, default=0)
    parser.add_argument("--verbose-master", action="store_true")
    parser.add_argument("--output-dir", type=Path, default=Path("reports"))
    parser.add_argument("--verify", type=Path)
    args = parser.parse_args()

    if args.verify is not None:
        report = json.loads(args.verify.read_text(encoding="utf-8"))
        validation = verify_report(report)
        print(json.dumps(validation, indent=2, ensure_ascii=False))
        if not validation["valid"]:
            raise SystemExit(1)
        return

    if (
        args.time_limit <= 0
        or args.max_iterations <= 0
        or args.gap_tolerance <= 0
        or args.pricing_workers <= 0
    ):
        parser.error("limites e tolerância devem ser positivos.")

    args.output_dir.mkdir(parents=True, exist_ok=True)
    report = run_all(
        args.time_limit,
        args.gap_tolerance,
        args.max_iterations,
        args.primary_master_solver,
        args.pricing_workers,
        args.seed,
        args.verbose_master,
        args.secondary_master_solver,
        args.pricing_solver,
    )
    report["execution"] = {
        "python": sys.version.split()[0],
        "ortools": ortools.__version__,
        "cvxpy": cp.__version__,
        "clarabel": clarabel.__version__,
        "per_scenario_time_limit_seconds": args.time_limit,
        "gap_tolerance": args.gap_tolerance,
        "max_column_generation_iterations_per_phase": args.max_iterations,
        "primary_master_solver": args.primary_master_solver,
        "secondary_master_solver": args.secondary_master_solver,
        "cp_sat_search_workers": args.pricing_workers,
        "pricing_solver": args.pricing_solver,
        "cp_sat_random_seed": args.seed,
        "cp_sat_randomize_search": False,
        "pricing_coefficient_scale": PRICING_SCALE,
    }
    json_path = args.output_dir / "fairness-poc-results.json"
    markdown_path = args.output_dir / "fairness-poc-report.md"
    json_path.write_text(
        json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    write_markdown(report, markdown_path)
    print(f"JSON: {json_path}")
    print(f"Relatório: {markdown_path}")
    print(
        json.dumps(
            {
                result["scenario"]: {
                    "objectives": result["objectives"],
                    "runtime": result["runtime"],
                    "sums": result["expectations"]["sums"],
                    "valid_certificate": result["validation"]["valid"],
                }
                for result in report["scenarios"]
            },
            indent=2,
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
