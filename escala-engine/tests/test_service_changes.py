from __future__ import annotations

from datetime import date

from abm_schedule_engine import generate_schedule, load_request


def test_sale_and_swap_keep_original_credit_and_use_actual_person_for_rest(
    request_payload,
):
    request_payload["historical_services"] = [
        {
            "credit": {
                "date": "2026-09-20",
                "role": "auxiliary",
                "member_id": "member-01",
            },
            "actual": {
                "date": "2026-09-20",
                "role": "auxiliary",
                "member_id": "member-02",
            },
        },
        {
            "credit": {
                "date": "2026-09-24",
                "role": "driver",
                "member_id": "member-03",
            },
            "actual": {
                "date": "2026-09-28",
                "role": "auxiliary",
                "member_id": "member-04",
            },
        },
    ]
    result = generate_schedule(load_request(request_payload))

    assert result.status in {"OPTIMAL", "FEASIBLE"}
    by_id = {item.member_id: item for item in result.fairness}
    assert by_id["member-01"].historical_credits["auxiliary"] == 1
    assert by_id["member-02"].historical_credits["total"] == 0
    assert by_id["member-03"].historical_credits["driver"] == 1
    assert by_id["member-04"].historical_credits["total"] == 0
    assert all(
        not (
            item.member_id == "member-04"
            and item.date in {
                date(2026, 10, 1),
                date(2026, 10, 2),
            }
        )
        for item in result.assignments
    )
