from __future__ import annotations

from abm_schedule_engine import generate_schedule, load_request


def test_reports_infeasible_when_only_one_person_can_fill_two_daily_roles(
    request_payload,
):
    request_payload["period"]["end_date"] = "2026-10-01"
    request_payload["members"] = [request_payload["members"][0]]
    request_payload["fairness_baseline"] = {
        "member-01": {
            "expected_total": {"numerator": 0, "denominator": 1},
            "expected_auxiliary": {"numerator": 0, "denominator": 1},
            "expected_driver": {"numerator": 0, "denominator": 1},
        }
    }

    result = generate_schedule(load_request(request_payload))

    assert result.status == "INFEASIBLE"
    assert result.assignments == ()
    assert result.objective is None
    assert any("provou" in message for message in result.diagnostics)


def test_reports_missing_role_eligibility(request_payload):
    for member in request_payload["members"]:
        member["can_driver"] = False
    result = generate_schedule(load_request(request_payload))

    assert result.status == "INFEASIBLE"
    assert result.assignments == ()
    assert any("Não há militar elegível para driver" in item for item in result.diagnostics)
