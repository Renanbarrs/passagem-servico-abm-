from datetime import date, timedelta
from fractions import Fraction

import numpy as np
import pytest

from fairness_poc.__main__ import (
    InfeasibleScheduleError,
    Member,
    Scenario,
    build_problem,
    build_scenarios,
    column_generation,
    candidate_report,
    append_zero_weight,
    is_certified_stage,
    norm_constraint_dual_to_squared_objective,
    marginal_targets,
    function_gradient,
    mixture_marginals,
    primary_gradient,
    schedule_vector,
    secondary_lagrangian_gradient,
    solve_pricing,
    validate_mixture,
    verify_optimality_certificate,
)


def test_candidate_expectations_reproduce_all_five_scenario_totals():
    for scenario in build_scenarios():
        problem = build_problem(scenario)
        candidate = candidate_report(problem)

        assert sum(item["auxiliary"] for item in candidate.values()) == 10
        assert sum(item["driver"] for item in candidate.values()) == 10
        assert sum(item["total"] for item in candidate.values()) == 20
        assert all(
            abs(
                item["total"]
                - item["auxiliary"]
                - item["driver"]
            )
            < 1e-12
            for item in candidate.values()
        )


def test_target_key_order_is_deterministic_for_solver_matrices():
    for scenario in build_scenarios():
        problem = build_problem(scenario)
        total_keys = list(problem.target_total)
        role_keys = list(problem.target_role)

        assert total_keys == sorted(total_keys, key=lambda key: (key[1], key[0]))
        assert role_keys == sorted(
            role_keys,
            key=lambda key: (key[1], key[2], key[0]),
        )


def test_actual_history_blocks_dates_inside_four_day_rest_window():
    scenario = build_scenarios()[0]
    with_history = Scenario(
        "history-test",
        "Histórico ACTUAL de teste",
        scenario.members,
        scenario.unavailable,
        (("D01", date(2026, 9, 29)),),
    )
    problem = build_problem(with_history)

    assert not any(
        member_id == "D01" and service_date <= date(2026, 10, 2)
        for member_id, service_date, _ in problem.coordinates
    )
    assert any(
        member_id == "D01" and service_date == date(2026, 10, 3)
        for member_id, service_date, _ in problem.coordinates
    )


def test_cpsat_produces_a_valid_integer_scale_for_the_certificate():
    problem = build_problem(build_scenarios()[0])
    vector, pricing = solve_pricing(problem, max_time_seconds=10)

    validation = validate_mixture(problem, [(vector, Fraction(1))])

    assert pricing["status"] in {"OPTIMAL", "FEASIBLE"}
    assert validation["valid"]
    assert validation["all_scales_valid"]
    assert validation["weight_sum_exact"] == (1, 1)


def test_problem_builder_accepts_a_benchmark_period_length():
    scenario = build_scenarios()[0]
    start = date(2026, 11, 1)
    problem = build_problem(scenario, start, day_count=20)

    assert len(problem.days) == 20
    assert problem.days[0] == start
    assert problem.days[-1] == start + timedelta(days=19)


def test_inaccurate_master_or_feasible_pricing_cannot_certify_optimality():
    assert not is_certified_stage("OPTIMAL", "optimal_inaccurate", 0.0, 1e-4)
    assert not is_certified_stage("FEASIBLE", "optimal", 0.0, 1e-4)
    assert not is_certified_stage("OPTIMAL", "optimal", 1e-3, 1e-4)
    assert is_certified_stage("OPTIMAL", "optimal", 1e-5, 1e-4)


def test_new_column_warm_start_preserves_mass_and_matches_expanded_model():
    weights = append_zero_weight(np.array([0.25, 0.75]))

    assert weights.tolist() == [0.25, 0.75, 0.0]
    assert sum(weights) == 1


def test_normalized_cone_dual_is_converted_back_to_squared_objective_units():
    dual = norm_constraint_dual_to_squared_objective(
        norm_dual=4.0,
        constraint_scale=0.1,
        residual_norm=0.1,
    )

    assert abs(dual - 200.0) < 1e-12
    assert norm_constraint_dual_to_squared_objective(4.0, 0.1, 0.0) == 0.0


def test_secondary_recheck_uses_both_gradients_at_the_certified_mixture():
    problem = build_problem(build_scenarios()[0])
    _, function_target = marginal_targets(problem)
    marginals = function_target.copy()
    marginals[0] += 0.25
    multiplier = 7.0

    gradient = secondary_lagrangian_gradient(problem, marginals, multiplier)

    np.testing.assert_allclose(
        gradient,
        function_gradient(problem, marginals)
        + multiplier * primary_gradient(problem, marginals),
    )
    assert not np.array_equal(
        gradient,
        function_gradient(problem, marginals)
        + multiplier * primary_gradient(problem, function_target),
    )


def test_scenario_one_certifies_both_stages_and_verifies_its_certificate():
    problem = build_problem(build_scenarios()[0])
    result = column_generation(
        problem,
        time_limit_seconds=60,
        gap_tolerance=1e-4,
        max_iterations=300,
        random_seed=20261105,
        pricing_solver="HIGHS",
    )
    mixture = [
        (
            schedule_vector(
                problem,
                {
                    (
                        assignment["member_id"],
                        date.fromisoformat(assignment["date"]),
                        assignment["role"],
                    )
                    for assignment in scale["assignments"]
                },
            ),
            Fraction(
                scale["weight_exact"]["numerator"],
                scale["weight_exact"]["denominator"],
            ),
        )
        for scale in result["certificate"]["mixtures"]
    ]

    verification = verify_optimality_certificate(
        problem, result, mixture_marginals(problem, mixture)
    )

    assert result["objectives"]["primary_certified_to_tolerance"]
    assert result["objectives"]["secondary_certified_to_tolerance"]
    assert verification["valid"]


def test_role_capacity_precheck_rejects_two_drivers_for_ten_days():
    start = date(2026, 10, 1)
    members = tuple(
        [Member(f"D{index:02}", True, True, start) for index in range(1, 3)]
        + [
            Member(f"A{index:02}", True, False, start)
            for index in range(1, 15)
        ]
    )
    scenario = Scenario("two-drivers", "Equipe fictícia inviável", members, {})

    with pytest.raises(
        InfeasibleScheduleError,
        match=r"capacidade máxima para Condutor é 6 para 10 vagas.*D01=3, D02=3",
    ):
        build_problem(scenario)


def test_role_capacity_precheck_does_not_reject_capacity_sufficient_case():
    scenario = build_scenarios()[1]

    problem = build_problem(scenario)

    assert len(problem.days) == 10
