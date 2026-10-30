from __future__ import annotations

from datetime import date, timedelta
from fractions import Fraction
from math import isfinite, lcm

from ortools.sat.python import cp_model

from .fairness import (
    build_fairness_report,
    expected_opportunities,
    historical_credit_counts,
)
from .models import (
    Assignment,
    GenerationRequest,
    GenerationResult,
    Role,
)

MIN_REST_DAYS_BETWEEN_SERVICES = 4
TOTAL_FAIRNESS_WEIGHT = 100
FUNCTION_FAIRNESS_WEIGHT = 35
ROLES: tuple[Role, Role] = ("auxiliary", "driver")
INT64_SAFE_LIMIT = 2**62


def generate_schedule(
    request: GenerationRequest,
    max_time_seconds: float = 30.0,
) -> GenerationResult:
    if not isfinite(max_time_seconds) or max_time_seconds <= 0:
        raise ValueError("max_time_seconds deve ser maior que zero.")

    days = _days_between(request.period.start_date, request.period.end_date)
    members = {member.id: member for member in request.members}
    unavailable = {
        member.id: [
            item
            for item in request.unavailabilities
            if item.member_id == member.id
        ]
        for member in request.members
    }
    eligible_by_day: dict[date, dict[str, set[str]]] = {}
    diagnostics: list[str] = []
    for service_date in days:
        eligible_by_day[service_date] = {
            role: {
                member.id
                for member in request.members
                if _eligible(member, role, service_date, unavailable[member.id])
            }
            for role in ROLES
        }
        for role in ROLES:
            if not eligible_by_day[service_date][role]:
                diagnostics.append(
                    f"Não há militar elegível para {role} em {service_date.isoformat()}."
                )

    expected = expected_opportunities(request, eligible_by_day)
    model = cp_model.CpModel()
    assignments: dict[tuple[str, date, Role], cp_model.IntVar] = {}
    for service_date in days:
        for role in ROLES:
            for member_id in sorted(eligible_by_day[service_date][role]):
                assignments[(member_id, service_date, role)] = model.NewBoolVar(
                    f"x_{member_id}_{service_date.isoformat()}_{role}"
                )
            model.Add(
                sum(
                    assignments[(member_id, service_date, role)]
                    for member_id in eligible_by_day[service_date][role]
                )
                == 1
            )

        for member_id in members:
            auxiliary = assignments.get((member_id, service_date, "auxiliary"))
            driver = assignments.get((member_id, service_date, "driver"))
            if auxiliary is not None and driver is not None:
                model.Add(auxiliary + driver <= 1)

    _add_rest_constraints(
        model,
        assignments,
        days,
        request,
        members,
    )
    objective_scale = _objective_scale(request, expected)
    if objective_scale >= INT64_SAFE_LIMIT:
        return _result_without_solution(
            request,
            "MODEL_INVALID",
            diagnostics
            + [
                "A escala exata das frações de justiça excede o limite seguro de inteiros do CP-SAT."
            ],
        )

    historical = historical_credit_counts(request)
    total_deviations: list[cp_model.IntVar] = []
    function_deviations: list[cp_model.IntVar] = []
    for member in request.members:
        for metric, role in (
            ("total", None),
            ("auxiliary", "auxiliary"),
            ("driver", "driver"),
        ):
            generated_terms = [
                variable
                for (member_id, _, assigned_role), variable in assignments.items()
                if member_id == member.id and (role is None or assigned_role == role)
            ]
            baseline = getattr(
                request.fairness_baseline[member.id],
                {
                    "total": "expected_total",
                    "auxiliary": "expected_auxiliary",
                    "driver": "expected_driver",
                }[metric],
            )
            target_expected = baseline + expected[member.id][metric]
            target_scaled = _scale_fraction(target_expected, objective_scale)
            realized_before_period = historical[member.id][metric]
            realized_expression = (
                realized_before_period * objective_scale + sum(generated_terms) * objective_scale
            )
            deviation = model.NewIntVar(
                0,
                max(
                    target_scaled,
                    realized_before_period * objective_scale
                    + len(days) * objective_scale,
                ),
                f"deviation_{member.id}_{metric}",
            )
            model.AddAbsEquality(
                deviation,
                realized_expression - target_scaled,
            )
            if metric == "total":
                total_deviations.append(deviation)
            else:
                function_deviations.append(deviation)

    objective = (
        TOTAL_FAIRNESS_WEIGHT * sum(total_deviations)
        + FUNCTION_FAIRNESS_WEIGHT * sum(function_deviations)
    )
    if not _objective_is_safe(
        request,
        expected,
        objective_scale,
        len(days),
    ):
        return _result_without_solution(
            request,
            "MODEL_INVALID",
            diagnostics
            + [
                "O limite superior dos componentes do objetivo excede a faixa segura de inteiros do CP-SAT."
            ],
        )
    model.Minimize(objective)

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = max_time_seconds
    solver.parameters.num_search_workers = 1
    solver.parameters.random_seed = 0
    validation_error = model.Validate()
    if validation_error:
        return _result_without_solution(
            request,
            "MODEL_INVALID",
            diagnostics + [validation_error],
        )

    status_code = solver.Solve(model)
    status = solver.StatusName(status_code)
    if status_code not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        if status_code == cp_model.INFEASIBLE:
            diagnostics.append(
                "O CP-SAT provou que as restrições informadas não permitem preencher todas as vagas."
            )
        elif status_code == cp_model.MODEL_INVALID:
            diagnostics.append("O CP-SAT rejeitou o modelo de otimização.")
        else:
            diagnostics.append(
                "O CP-SAT encerrou sem encontrar uma escala válida dentro do limite de busca."
            )
        return _result_without_solution(
            request,
            status,
            diagnostics,
            solver=_solver_statistics(solver),
        )

    generated: list[tuple[date, Role, str]] = []
    public_assignments: list[Assignment] = []
    for service_date in days:
        for role in ROLES:
            selected_member = next(
                member_id
                for member_id in eligible_by_day[service_date][role]
                if solver.Value(assignments[(member_id, service_date, role)])
            )
            generated.append((service_date, role, selected_member))
            public_assignments.append(
                Assignment(
                    date=service_date,
                    role=role,
                    member_id=selected_member,
                    member_name=members[selected_member].name,
                )
            )

    fairness, objective_components = build_fairness_report(
        request,
        generated,
        expected,
    )
    warnings = ()
    if status_code == cp_model.FEASIBLE:
        warnings = (
            "Foi encontrada uma escala válida, mas a otimalidade não foi provada dentro do limite de tempo.",
        )
    return GenerationResult(
        status=status,
        period=request.period,
        assignments=tuple(public_assignments),
        fairness=fairness,
        objective=objective_components,
        diagnostics=tuple(diagnostics),
        warnings=warnings,
        solver=_solver_statistics(solver),
    )


def _eligible(member, role: Role, service_date: date, unavailable) -> bool:
    permitted = (
        member.can_auxiliary if role == "auxiliary" else member.can_driver
    )
    return (
        member.active
        and permitted
        and member.entry_date <= service_date
        and not any(
            item.start_date <= service_date <= item.end_date
            for item in unavailable
        )
    )


def _add_rest_constraints(
    model,
    assignments,
    days: list[date],
    request: GenerationRequest,
    members,
) -> None:
    for member_id in members:
        member_dates = [
            service_date
            for service_date in days
            if any(
                (member_id, service_date, role) in assignments
                for role in ROLES
            )
        ]
        for index, first_date in enumerate(member_dates):
            for second_date in member_dates[index + 1 :]:
                if (
                    second_date - first_date
                ).days < MIN_REST_DAYS_BETWEEN_SERVICES:
                    model.Add(
                        sum(
                            assignments[key]
                            for key in (
                                (member_id, first_date, role)
                                for role in ROLES
                                if (member_id, first_date, role) in assignments
                            )
                        )
                        + sum(
                            assignments[key]
                            for key in (
                                (member_id, second_date, role)
                                for role in ROLES
                                if (member_id, second_date, role) in assignments
                            )
                        )
                        <= 1
                    )

        prior_actual_dates = {
            service.actual.date
            for service in request.historical_services
            if service.actual.member_id == member_id
        }
        for service_date in member_dates:
            if any(
                abs((service_date - actual_date).days)
                < MIN_REST_DAYS_BETWEEN_SERVICES
                for actual_date in prior_actual_dates
            ):
                model.Add(
                    sum(
                        assignments[(member_id, service_date, role)]
                        for role in ROLES
                        if (member_id, service_date, role) in assignments
                    )
                    == 0
                )


def _objective_scale(
    request: GenerationRequest,
    expected_period: dict[str, dict[str, Fraction]],
) -> int:
    denominators = [1]
    for member in request.members:
        baseline = request.fairness_baseline[member.id]
        denominators.extend(
            [
                (baseline.expected_total + expected_period[member.id]["total"]).denominator,
                (
                    baseline.expected_auxiliary
                    + expected_period[member.id]["auxiliary"]
                ).denominator,
                (baseline.expected_driver + expected_period[member.id]["driver"]).denominator,
            ]
        )
    return lcm(*denominators)


def _scale_fraction(value: Fraction, scale: int) -> int:
    return value.numerator * (scale // value.denominator)


def _objective_is_safe(
    request: GenerationRequest,
    expected_period: dict[str, dict[str, Fraction]],
    scale: int,
    period_days: int,
) -> bool:
    upper_bound = 0
    historical = historical_credit_counts(request)
    for member in request.members:
        baseline = request.fairness_baseline[member.id]
        total_target = baseline.expected_total + expected_period[member.id]["total"]
        auxiliary_target = (
            baseline.expected_auxiliary
            + expected_period[member.id]["auxiliary"]
        )
        driver_target = baseline.expected_driver + expected_period[member.id]["driver"]
        total_max = historical[member.id]["total"] + period_days
        auxiliary_max = historical[member.id]["auxiliary"] + period_days
        driver_max = historical[member.id]["driver"] + period_days
        upper_bound += TOTAL_FAIRNESS_WEIGHT * max(
            _scale_fraction(total_target, scale),
            total_max * scale,
        )
        upper_bound += FUNCTION_FAIRNESS_WEIGHT * (
            max(_scale_fraction(auxiliary_target, scale), auxiliary_max * scale)
            + max(_scale_fraction(driver_target, scale), driver_max * scale)
        )
    return upper_bound < INT64_SAFE_LIMIT


def _days_between(start_date: date, end_date: date) -> list[date]:
    count = (end_date - start_date).days + 1
    return [start_date + timedelta(days=offset) for offset in range(count)]


def _solver_statistics(solver: cp_model.CpSolver) -> dict[str, float | int | str]:
    return {
        "wall_time_seconds": solver.WallTime(),
        "branches": solver.NumBranches(),
        "conflicts": solver.NumConflicts(),
        "objective_value": solver.ObjectiveValue(),
        "best_objective_bound": solver.BestObjectiveBound(),
    }


def _result_without_solution(
    request: GenerationRequest,
    status: str,
    diagnostics: list[str],
    solver: dict[str, float | int | str] | None = None,
) -> GenerationResult:
    return GenerationResult(
        status=status,
        period=request.period,
        assignments=(),
        fairness=(),
        objective=None,
        diagnostics=tuple(diagnostics),
        warnings=(),
        solver=solver or {},
    )
