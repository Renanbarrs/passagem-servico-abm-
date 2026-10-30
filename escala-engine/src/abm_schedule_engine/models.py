from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from fractions import Fraction
from typing import Literal

Role = Literal["auxiliary", "driver"]


@dataclass(frozen=True)
class Period:
    start_date: date
    end_date: date


@dataclass(frozen=True)
class Member:
    id: str
    name: str
    active: bool
    can_auxiliary: bool
    can_driver: bool
    entry_date: date


@dataclass(frozen=True)
class Unavailability:
    member_id: str
    start_date: date
    end_date: date
    kind: str
    notes: str


@dataclass(frozen=True)
class FairnessBaseline:
    expected_total: Fraction
    expected_auxiliary: Fraction
    expected_driver: Fraction


@dataclass(frozen=True)
class Credit:
    date: date
    role: Role
    member_id: str


@dataclass(frozen=True)
class Execution:
    date: date
    role: Role
    member_id: str


@dataclass(frozen=True)
class HistoricalService:
    credit: Credit
    actual: Execution


@dataclass(frozen=True)
class GenerationRequest:
    period: Period
    members: tuple[Member, ...]
    unavailabilities: tuple[Unavailability, ...]
    fairness_baseline: dict[str, FairnessBaseline]
    historical_services: tuple[HistoricalService, ...]


@dataclass(frozen=True)
class Assignment:
    date: date
    role: Role
    member_id: str
    member_name: str


@dataclass(frozen=True)
class MemberFairness:
    member_id: str
    member_name: str
    historical_credits: dict[str, int]
    generated_credits: dict[str, int]
    expected_period: dict[str, Fraction]
    projected_expected: dict[str, Fraction]
    projected_credits: dict[str, int]
    absolute_deviation: dict[str, Fraction]


@dataclass(frozen=True)
class GenerationResult:
    status: str
    period: Period
    assignments: tuple[Assignment, ...]
    fairness: tuple[MemberFairness, ...]
    objective: dict[str, Fraction] | None
    diagnostics: tuple[str, ...]
    warnings: tuple[str, ...]
    solver: dict[str, float | int | str]
