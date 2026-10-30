from __future__ import annotations

from collections import Counter
from datetime import date
from fractions import Fraction

from .models import (
    GenerationRequest,
    MemberFairness,
    Role,
)


def build_fairness_report(
    request: GenerationRequest,
    generated: list[tuple[date, Role, str]],
    expected_period: dict[str, dict[str, Fraction]],
) -> tuple[tuple[MemberFairness, ...], dict[str, Fraction]]:
    historical_total: Counter[str] = Counter()
    historical_roles: dict[str, Counter[str]] = {
        member.id: Counter() for member in request.members
    }
    for service in request.historical_services:
        historical_total[service.credit.member_id] += 1
        historical_roles[service.credit.member_id][service.credit.role] += 1

    generated_total: Counter[str] = Counter()
    generated_roles: dict[str, Counter[str]] = {
        member.id: Counter() for member in request.members
    }
    for _, role, member_id in generated:
        generated_total[member_id] += 1
        generated_roles[member_id][role] += 1

    report: list[MemberFairness] = []
    total_deviation = Fraction()
    function_deviation = Fraction()
    for member in request.members:
        baseline = request.fairness_baseline[member.id]
        historical_expected = {
            "total": baseline.expected_total,
            "auxiliary": baseline.expected_auxiliary,
            "driver": baseline.expected_driver,
        }
        expected = expected_period[member.id]
        projected_expected = {
            key: historical_expected[key] + expected[key]
            for key in historical_expected
        }
        historical_credits = {
            "total": historical_total[member.id],
            "auxiliary": historical_roles[member.id]["auxiliary"],
            "driver": historical_roles[member.id]["driver"],
        }
        generated_credits = {
            "total": generated_total[member.id],
            "auxiliary": generated_roles[member.id]["auxiliary"],
            "driver": generated_roles[member.id]["driver"],
        }
        projected_credits = {
            key: historical_credits[key] + generated_credits[key]
            for key in historical_credits
        }
        deviation = {
            key: abs(Fraction(projected_credits[key]) - projected_expected[key])
            for key in projected_credits
        }
        total_deviation += deviation["total"]
        function_deviation += deviation["auxiliary"] + deviation["driver"]
        report.append(
            MemberFairness(
                member_id=member.id,
                member_name=member.name,
                historical_credits=historical_credits,
                generated_credits=generated_credits,
                expected_period=expected,
                projected_expected=projected_expected,
                projected_credits=projected_credits,
                absolute_deviation=deviation,
            )
        )

    return tuple(report), {
        "total": total_deviation,
        "functions": function_deviation,
        "weighted": 100 * total_deviation + 35 * function_deviation,
    }


def expected_opportunities(
    request: GenerationRequest,
    eligible_by_day: dict[date, dict[str, set[str]]],
) -> dict[str, dict[str, Fraction]]:
    expected = {
        member.id: {
            "total": Fraction(),
            "auxiliary": Fraction(),
            "driver": Fraction(),
        }
        for member in request.members
    }
    for roles in eligible_by_day.values():
        eligible_for_any = roles["auxiliary"] | roles["driver"]
        if eligible_for_any:
            share = Fraction(2, len(eligible_for_any))
            for member_id in eligible_for_any:
                expected[member_id]["total"] += share
        for role in ("auxiliary", "driver"):
            role_members = roles[role]
            if role_members:
                share = Fraction(1, len(role_members))
                for member_id in role_members:
                    expected[member_id][role] += share
    return expected


def historical_credit_counts(request: GenerationRequest) -> dict[str, dict[str, int]]:
    counts = {
        member.id: {"total": 0, "auxiliary": 0, "driver": 0}
        for member in request.members
    }
    for service in request.historical_services:
        member_counts = counts[service.credit.member_id]
        member_counts["total"] += 1
        member_counts[service.credit.role] += 1
    return counts
