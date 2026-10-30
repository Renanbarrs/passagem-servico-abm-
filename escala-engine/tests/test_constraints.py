from __future__ import annotations

from collections import Counter, defaultdict
from datetime import date

from abm_schedule_engine import generate_schedule, load_request


def assignments_by_day(result):
    grouped = defaultdict(dict)
    for assignment in result.assignments:
        grouped[assignment.date][assignment.role] = assignment.member_id
    return grouped


def test_generates_both_roles_for_each_day_in_ten_day_period(generation_request):
    result = generate_schedule(generation_request)

    assert result.status == "OPTIMAL"
    assert len(result.assignments) == 20
    grouped = assignments_by_day(result)
    assert len(grouped) == 10
    assert all(set(roles) == {"auxiliary", "driver"} for roles in grouped.values())
    assert all(
        roles["auxiliary"] != roles["driver"] for roles in grouped.values()
    )


def test_never_assigns_member_to_unqualified_role(request_payload):
    request_payload["members"][6]["can_driver"] = False
    request_payload["members"][7]["can_driver"] = False
    result = generate_schedule(load_request(request_payload))

    assert result.status in {"OPTIMAL", "FEASIBLE"}
    assert all(
        assignment.role != "driver"
        or next(
            member
            for member in request_payload["members"]
            if member["id"] == assignment.member_id
        )["can_driver"]
        for assignment in result.assignments
    )
    assert all(
        item["generated_credits"]["driver"] == 0
        for item in result.fairness
        if item.member_id in {"member-07", "member-08"}
    )


def test_respects_entry_date_and_unavailability(request_payload):
    request_payload["members"][0]["entry_date"] = "2026-10-05"
    request_payload["unavailabilities"] = [
        {
            "member_id": "member-02",
            "start_date": "2026-10-03",
            "end_date": "2026-10-06",
            "kind": "vacation",
            "notes": "Férias fictícias",
        }
    ]
    request = load_request(request_payload)
    result = generate_schedule(request)

    assert result.status in {"OPTIMAL", "FEASIBLE"}
    assert all(
        not (
            item.member_id == "member-01"
            and item.date < date(2026, 10, 5)
        )
        for item in result.assignments
    )
    assert all(
        not (
            item.member_id == "member-02"
            and date(2026, 10, 3) <= item.date <= date(2026, 10, 6)
        )
        for item in result.assignments
    )


def test_enforces_four_calendar_days_between_any_services(generation_request):
    result = generate_schedule(generation_request)

    assert result.status in {"OPTIMAL", "FEASIBLE"}
    member_dates = defaultdict(list)
    for item in result.assignments:
        member_dates[item.member_id].append(item.date)
    assert all(
        (later - earlier).days >= 4
        for dates in member_dates.values()
        for earlier, later in zip(sorted(dates), sorted(dates)[1:])
    )


def test_uses_actual_service_for_rest_not_original_credit(request_payload):
    request_payload["historical_services"] = [
        {
            "credit": {
                "date": "2026-09-20",
                "role": "auxiliary",
                "member_id": "member-01",
            },
            "actual": {
                "date": "2026-09-29",
                "role": "driver",
                "member_id": "member-02",
            },
        }
    ]
    request = load_request(request_payload)
    result = generate_schedule(request)

    assert result.status in {"OPTIMAL", "FEASIBLE"}
    assert all(
        not (
            item.member_id == "member-02"
            and item.date == date(2026, 10, 1)
        )
        for item in result.assignments
    )
    member_one = next(item for item in result.fairness if item.member_id == "member-01")
    member_two = next(item for item in result.fairness if item.member_id == "member-02")
    assert member_one.historical_credits == {
        "total": 1,
        "auxiliary": 1,
        "driver": 0,
    }
    assert member_two.historical_credits == {
        "total": 0,
        "auxiliary": 0,
        "driver": 0,
    }


def test_historical_credits_influence_total_fairness(request_payload):
    request_payload["fairness_baseline"] = {
        member["id"]: {
            "expected_total": {"numerator": 5, "denominator": 1},
            "expected_auxiliary": {"numerator": 0, "denominator": 1},
            "expected_driver": {"numerator": 0, "denominator": 1},
        }
        for member in request_payload["members"]
    }
    request_payload["historical_services"] = [
        {
            "credit": {
                "date": f"2026-08-{day:02}",
                "role": "auxiliary" if index % 2 == 0 else "driver",
                "member_id": "member-01",
            },
            "actual": {
                "date": f"2026-08-{day:02}",
                "role": "auxiliary" if index % 2 == 0 else "driver",
                "member_id": "member-01",
            },
        }
        for index, day in enumerate(range(1, 33, 4))
    ]
    result = generate_schedule(load_request(request_payload))

    assert result.status in {"OPTIMAL", "FEASIBLE"}
    generated = {
        item.member_id: item.generated_credits["total"]
        for item in result.fairness
    }
    assert generated["member-01"] < generated["member-02"]
