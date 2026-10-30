from __future__ import annotations

from datetime import date
from fractions import Fraction
from typing import Any

from .models import (
    Credit,
    Execution,
    FairnessBaseline,
    GenerationRequest,
    HistoricalService,
    Member,
    Period,
    Role,
    Unavailability,
)

SCHEMA_VERSION = 1
ROLES = {"auxiliary", "driver"}
UNAVAILABILITY_KINDS = {
    "vacation",
    "leave",
    "absence",
    "course",
    "manual",
    "other",
}


class InputValidationError(ValueError):
    pass


def load_request(payload: Any) -> GenerationRequest:
    data = _object(payload, "request")
    if (
        isinstance(data.get("schema_version"), bool)
        or data.get("schema_version") != SCHEMA_VERSION
    ):
        raise InputValidationError(
            f"schema_version deve ser {SCHEMA_VERSION}."
        )

    period_data = _object(data.get("period"), "period")
    period = Period(
        start_date=_date(period_data.get("start_date"), "period.start_date"),
        end_date=_date(period_data.get("end_date"), "period.end_date"),
    )
    if period.end_date < period.start_date:
        raise InputValidationError(
            "period.end_date não pode ser anterior a period.start_date."
        )

    members_data = _array(data.get("members"), "members")
    members = tuple(
        _member(item, f"members[{index}]")
        for index, item in enumerate(members_data)
    )
    if not members:
        raise InputValidationError("Informe ao menos um militar.")

    member_ids = [member.id for member in members]
    if len(set(member_ids)) != len(member_ids):
        raise InputValidationError("Os IDs dos militares devem ser únicos.")
    member_by_id = {member.id: member for member in members}

    unavailabilities_data = _array(
        data.get("unavailabilities"), "unavailabilities"
    )
    unavailabilities = tuple(
        _unavailability(item, f"unavailabilities[{index}]")
        for index, item in enumerate(unavailabilities_data)
    )
    for item in unavailabilities:
        if item.member_id not in member_by_id:
            raise InputValidationError(
                f"Indisponibilidade referencia militar desconhecido: {item.member_id}."
            )

    baseline_data = _object(
        data.get("fairness_baseline"), "fairness_baseline"
    )
    if set(baseline_data) != set(member_ids):
        raise InputValidationError(
            "fairness_baseline deve ter exatamente uma entrada por militar."
        )
    fairness_baseline = {
        member_id: _baseline(value, f"fairness_baseline.{member_id}")
        for member_id, value in baseline_data.items()
    }
    for member in members:
        if member.entry_date >= period.start_date:
            baseline = fairness_baseline[member.id]
            if any(
                (
                    baseline.expected_total,
                    baseline.expected_auxiliary,
                    baseline.expected_driver,
                )
            ):
                raise InputValidationError(
                    f"fairness_baseline.{member.id} deve ser zero, pois a data de entrada "
                    "é igual ou posterior ao início do período."
                )

    history_data = _array(
        data.get("historical_services"), "historical_services"
    )
    historical_services = tuple(
        _historical_service(item, f"historical_services[{index}]")
        for index, item in enumerate(history_data)
    )
    for item in historical_services:
        for member_id, service_date in (
            (item.credit.member_id, item.credit.date),
            (item.actual.member_id, item.actual.date),
        ):
            if member_id not in member_by_id:
                raise InputValidationError(
                    f"Histórico referencia militar desconhecido: {member_id}."
                )
            if service_date < member_by_id[member_id].entry_date:
                raise InputValidationError(
                    f"O histórico do militar {member_id} antecede sua entrada na escala."
                )
        if (
            item.credit.date >= period.start_date
            or item.actual.date >= period.start_date
        ):
            raise InputValidationError(
                "O histórico informado deve anteceder o início do período solicitado."
            )

    return GenerationRequest(
        period=period,
        members=members,
        unavailabilities=unavailabilities,
        fairness_baseline=fairness_baseline,
        historical_services=historical_services,
    )


def _member(value: Any, path: str) -> Member:
    data = _object(value, path)
    member = Member(
        id=_nonempty_string(data.get("id"), f"{path}.id"),
        name=_nonempty_string(data.get("name"), f"{path}.name"),
        active=_boolean(data.get("active"), f"{path}.active"),
        can_auxiliary=_boolean(
            data.get("can_auxiliary"), f"{path}.can_auxiliary"
        ),
        can_driver=_boolean(data.get("can_driver"), f"{path}.can_driver"),
        entry_date=_date(data.get("entry_date"), f"{path}.entry_date"),
    )
    if member.can_driver and not member.can_auxiliary:
        raise InputValidationError(
            f"{path}: quem pode ser Condutor também deve poder ser Auxiliar."
        )
    if member.active and not (member.can_auxiliary or member.can_driver):
        raise InputValidationError(
            f"{path}: militar ativo precisa estar habilitado para ao menos uma função."
        )
    return member


def _unavailability(value: Any, path: str) -> Unavailability:
    data = _object(value, path)
    start_date = _date(data.get("start_date"), f"{path}.start_date")
    end_date = _date(data.get("end_date"), f"{path}.end_date")
    if end_date < start_date:
        raise InputValidationError(
            f"{path}.end_date não pode ser anterior à data inicial."
        )
    kind = _nonempty_string(data.get("kind"), f"{path}.kind")
    if kind not in UNAVAILABILITY_KINDS:
        raise InputValidationError(
            f"{path}.kind deve ser um destes valores: "
            f"{', '.join(sorted(UNAVAILABILITY_KINDS))}."
        )
    notes = data.get("notes", "")
    if not isinstance(notes, str):
        raise InputValidationError(f"{path}.notes deve ser texto.")
    return Unavailability(
        member_id=_nonempty_string(data.get("member_id"), f"{path}.member_id"),
        start_date=start_date,
        end_date=end_date,
        kind=kind,
        notes=notes,
    )


def _baseline(value: Any, path: str) -> FairnessBaseline:
    data = _object(value, path)
    return FairnessBaseline(
        expected_total=_fraction(data.get("expected_total"), f"{path}.expected_total"),
        expected_auxiliary=_fraction(
            data.get("expected_auxiliary"), f"{path}.expected_auxiliary"
        ),
        expected_driver=_fraction(
            data.get("expected_driver"), f"{path}.expected_driver"
        ),
    )


def _historical_service(value: Any, path: str) -> HistoricalService:
    data = _object(value, path)
    credit_data = _object(data.get("credit"), f"{path}.credit")
    actual_data = _object(data.get("actual"), f"{path}.actual")
    return HistoricalService(
        credit=Credit(
            date=_date(credit_data.get("date"), f"{path}.credit.date"),
            role=_role(credit_data.get("role"), f"{path}.credit.role"),
            member_id=_nonempty_string(
                credit_data.get("member_id"), f"{path}.credit.member_id"
            ),
        ),
        actual=Execution(
            date=_date(actual_data.get("date"), f"{path}.actual.date"),
            role=_role(actual_data.get("role"), f"{path}.actual.role"),
            member_id=_nonempty_string(
                actual_data.get("member_id"), f"{path}.actual.member_id"
            ),
        ),
    )


def _fraction(value: Any, path: str) -> Fraction:
    data = _object(value, path)
    numerator = data.get("numerator")
    denominator = data.get("denominator")
    if (
        isinstance(numerator, bool)
        or not isinstance(numerator, int)
        or numerator < 0
    ):
        raise InputValidationError(f"{path}.numerator deve ser inteiro não negativo.")
    if (
        isinstance(denominator, bool)
        or not isinstance(denominator, int)
        or denominator <= 0
    ):
        raise InputValidationError(f"{path}.denominator deve ser inteiro positivo.")
    return Fraction(numerator, denominator)


def _role(value: Any, path: str) -> Role:
    if not isinstance(value, str) or value not in ROLES:
        raise InputValidationError(
            f"{path} deve ser 'auxiliary' ou 'driver'."
        )
    return value


def _date(value: Any, path: str) -> date:
    if not isinstance(value, str):
        raise InputValidationError(f"{path} deve ser uma data ISO YYYY-MM-DD.")
    try:
        parsed = date.fromisoformat(value)
    except ValueError as error:
        raise InputValidationError(
            f"{path} deve ser uma data válida no formato YYYY-MM-DD."
        ) from error
    if parsed.isoformat() != value:
        raise InputValidationError(
            f"{path} deve ser uma data ISO no formato YYYY-MM-DD."
        )
    return parsed


def _object(value: Any, path: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise InputValidationError(f"{path} deve ser um objeto JSON.")
    return value


def _array(value: Any, path: str) -> list[Any]:
    if not isinstance(value, list):
        raise InputValidationError(f"{path} deve ser uma lista JSON.")
    return value


def _boolean(value: Any, path: str) -> bool:
    if not isinstance(value, bool):
        raise InputValidationError(f"{path} deve ser booleano.")
    return value


def _nonempty_string(value: Any, path: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise InputValidationError(f"{path} deve ser texto não vazio.")
    return value.strip()
