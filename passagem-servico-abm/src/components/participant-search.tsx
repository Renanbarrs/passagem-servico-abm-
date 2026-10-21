"use client";

import { useMemo, useState, type KeyboardEvent } from "react";
import type { ParticipantOption } from "@/data/participant-options";

type ParticipantSearchProps = {
  id: string;
  label: string;
  value: string;
  options: ParticipantOption[];
  hint: string;
  error?: string;
  selectionRequired: boolean;
  onChange: (value: string, selectedId: string | null) => void;
};

const inputClassName =
  "mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#b82029] focus:ring-4 focus:ring-[#b82029]/10";

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

export default function ParticipantSearch({
  id,
  label,
  value,
  options,
  hint,
  error,
  selectionRequired,
  onChange,
}: ParticipantSearchProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const listId = `${id}-suggestions`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  const matches = useMemo(() => {
    const query = normalizeSearch(value);
    return options.filter((option) =>
      normalizeSearch(option.name).includes(query),
    );
  }, [options, value]);

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }

    if (event.key === "ArrowDown" && matches.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => (index + 1) % matches.length);
      return;
    }

    if (event.key === "ArrowUp" && matches.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => (index - 1 + matches.length) % matches.length);
      return;
    }

    if (event.key === "Enter" && open && matches[activeIndex]) {
      event.preventDefault();
      const option = matches[activeIndex];
      onChange(option.name, option.id);
      setOpen(false);
    }
  }

  const describedBy = error ? `${hintId} ${errorId}` : hintId;

  return (
    <div className="relative">
      <label className="text-sm font-semibold text-slate-800" htmlFor={id}>
        {label} <span className="text-[#b82029]">*</span>
      </label>
      <input
        aria-activedescendant={
          open && matches[activeIndex] ? `${listId}-${activeIndex}` : undefined
        }
        aria-autocomplete="list"
        aria-controls={listId}
        aria-describedby={describedBy}
        aria-expanded={open}
        aria-invalid={Boolean(error)}
        aria-required="true"
        autoComplete="off"
        className={`${inputClassName} ${error ? "border-red-600" : ""}`}
        id={id}
        onBlur={() => setOpen(false)}
        onChange={(event) => {
          onChange(event.target.value, null);
          setActiveIndex(0);
          setOpen(true);
        }}
        onFocus={() => {
          setActiveIndex(0);
          setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        placeholder="Digite parte do nome ou da graduação"
        role="combobox"
        type="text"
        value={value}
      />
      <p className="mt-1.5 text-xs leading-5 text-slate-500" id={hintId}>
        {hint}
      </p>
      {error ? (
        <p className="mt-1 text-xs font-medium text-red-700" id={errorId}>
          {error}
        </p>
      ) : null}

      {open ? (
        <div
          className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg"
          id={listId}
          role="listbox"
        >
          {matches.length > 0 ? (
            matches.map((option, index) => (
              <button
                aria-selected={index === activeIndex}
                className={`w-full rounded-lg px-3 py-2.5 text-left text-sm ${
                  index === activeIndex
                    ? "bg-[#f9e9ea] font-semibold text-[#8f1820]"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
                id={`${listId}-${index}`}
                key={option.id}
                onClick={() => {
                  onChange(option.name, option.id);
                  setOpen(false);
                }}
                onMouseDown={(event) => event.preventDefault()}
                role="option"
                type="button"
              >
                {option.name}
              </button>
            ))
          ) : (
            <p className="px-3 py-2.5 text-sm text-slate-500">
              {selectionRequired
                ? "Nenhum militar encontrado. Tente outro trecho."
                : "Nenhuma sugestão encontrada. Você pode informar um oficial externo."}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
