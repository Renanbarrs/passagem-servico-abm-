from __future__ import annotations

from fractions import Fraction

from .models import GenerationResult


def fraction_to_json(value: Fraction) -> dict[str, int]:
    return {
        "numerator": value.numerator,
        "denominator": value.denominator,
    }


def result_to_dict(result: GenerationResult) -> dict:
    by_date: dict[str, dict] = {}
    for assignment in result.assignments:
        day = by_date.setdefault(
            assignment.date.isoformat(),
            {
                "date": assignment.date.isoformat(),
                "auxiliary": None,
                "driver": None,
                "officer_of_day": None,
            },
        )
        day[assignment.role] = {
            "member_id": assignment.member_id,
            "name": assignment.member_name,
        }

    return {
        "schema_version": 1,
        "status": result.status,
        "period": {
            "start_date": result.period.start_date.isoformat(),
            "end_date": result.period.end_date.isoformat(),
        },
        "days": list(by_date.values()),
        "fairness": [
            {
                "member_id": item.member_id,
                "name": item.member_name,
                "historical_credits": item.historical_credits,
                "generated_credits": item.generated_credits,
                "expected_period": {
                    key: fraction_to_json(value)
                    for key, value in item.expected_period.items()
                },
                "projected_expected": {
                    key: fraction_to_json(value)
                    for key, value in item.projected_expected.items()
                },
                "projected_credits": item.projected_credits,
                "absolute_deviation": {
                    key: fraction_to_json(value)
                    for key, value in item.absolute_deviation.items()
                },
            }
            for item in result.fairness
        ],
        "objective": (
            {
                key: fraction_to_json(value)
                for key, value in result.objective.items()
            }
            if result.objective is not None
            else None
        ),
        "diagnostics": list(result.diagnostics),
        "warnings": list(result.warnings),
        "solver": result.solver,
    }
