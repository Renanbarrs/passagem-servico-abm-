from __future__ import annotations

import pytest

from abm_schedule_engine.validation import (
    InputValidationError,
    load_request,
)


def test_driver_eligibility_requires_auxiliary_eligibility(request_payload):
    request_payload["members"][0]["can_auxiliary"] = False

    with pytest.raises(InputValidationError, match="também deve poder ser Auxiliar"):
        load_request(request_payload)


def test_baseline_requires_every_member(request_payload):
    del request_payload["fairness_baseline"]["member-08"]

    with pytest.raises(InputValidationError, match="exatamente uma entrada"):
        load_request(request_payload)


def test_history_cannot_precede_member_entry(request_payload):
    request_payload["members"][0]["entry_date"] = "2026-10-05"
    request_payload["historical_services"] = [
        {
            "credit": {
                "date": "2026-10-04",
                "member_id": "member-01",
                "role": "auxiliary",
            },
            "actual": {
                "date": "2026-10-04",
                "member_id": "member-01",
                "role": "auxiliary",
            },
        }
    ]

    with pytest.raises(InputValidationError, match="antecede sua entrada"):
        load_request(request_payload)
