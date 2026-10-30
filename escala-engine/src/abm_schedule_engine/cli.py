from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from .serialization import result_to_dict
from .solver import generate_schedule
from .validation import InputValidationError, load_request


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Gera uma escala de serviço fictícia com OR-Tools CP-SAT."
    )
    parser.add_argument("input", type=Path, help="Arquivo JSON de entrada.")
    parser.add_argument(
        "--output",
        type=Path,
        help="Arquivo JSON de saída. Sem esta opção, escreve no stdout.",
    )
    parser.add_argument(
        "--time-limit",
        type=float,
        default=30.0,
        help="Limite de busca em segundos (padrão: 30).",
    )
    args = parser.parse_args()

    try:
        payload = json.loads(args.input.read_text(encoding="utf-8"))
        request = load_request(payload)
        result = generate_schedule(request, max_time_seconds=args.time_limit)
        serialized = json.dumps(
            result_to_dict(result),
            ensure_ascii=False,
            indent=2,
        )
        if args.output:
            args.output.write_text(serialized + "\n", encoding="utf-8")
        else:
            print(serialized)
        return 0
    except (OSError, json.JSONDecodeError, InputValidationError, ValueError) as error:
        print(f"Erro: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
