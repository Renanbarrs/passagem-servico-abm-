from __future__ import annotations

import copy

import pytest

from abm_schedule_engine.validation import load_request


@pytest.fixture
def request_payload():
    members = []
    for index in range(1, 9):
        can_driver = index <= 6
        members.append(
            {
                "id": f"member-{index:02}",
                "name": f"MILITAR FICTÍCIO {index:02}",
                "active": True,
                "can_auxiliary": True,
                "can_driver": can_driver,
                "entry_date": "2026-01-01",
            }
        )
    baseline = {
        member["id"]: {
            "expected_total": {"numerator": 0, "denominator": 1},
            "expected_auxiliary": {"numerator": 0, "denominator": 1},
            "expected_driver": {"numerator": 0, "denominator": 1},
        }
        for member in members
    }
    return {
        "schema_version": 1,
        "period": {"start_date": "2026-10-01", "end_date": "2026-10-10"},
        "members": members,
        "unavailabilities": [],
        "fairness_baseline": baseline,
        "historical_services": [],
    }


@pytest.fixture
def generation_request(request_payload):
    return load_request(copy.deepcopy(request_payload))
