export type ParticipantOption = {
  id: string;
  name: string;
};

export const militaryOptions: ParticipantOption[] = [
  { id: "personnel-01", name: "SD FICTÍCIO ALFA" },
  { id: "personnel-02", name: "SD FICTÍCIO BRAVO" },
  { id: "personnel-03", name: "SD FICTÍCIO CHARLIE" },
  { id: "personnel-04", name: "SD FICTÍCIO DELTA" },
  { id: "personnel-05", name: "CB FICTÍCIO ALFA" },
  { id: "personnel-06", name: "CB FICTÍCIO BRAVO" },
  { id: "personnel-07", name: "CB FICTÍCIO CHARLIE" },
  { id: "personnel-08", name: "CB FICTÍCIO DELTA" },
  { id: "personnel-09", name: "SGT FICTÍCIO ALFA" },
  { id: "personnel-10", name: "SGT FICTÍCIO BRAVO" },
  { id: "personnel-11", name: "SGT FICTÍCIO CHARLIE" },
  { id: "personnel-12", name: "SGT FICTÍCIO DELTA" },
  { id: "personnel-13", name: "TEN FICTÍCIO ALFA" },
  { id: "personnel-14", name: "TEN FICTÍCIO BRAVO" },
  { id: "personnel-15", name: "TEN FICTÍCIO CHARLIE" },
  { id: "personnel-16", name: "TEN FICTÍCIO DELTA" },
  { id: "officer-01", name: "1º TEN FICTÍCIO ALFA" },
  { id: "officer-02", name: "1º TEN FICTÍCIO BRAVO" },
  { id: "officer-03", name: "1º TEN FICTÍCIO CHARLIE" },
  { id: "officer-04", name: "1º TEN FICTÍCIO DELTA" },
  { id: "officer-05", name: "TCEL FICTÍCIO ALFA" },
  { id: "officer-06", name: "TCEL FICTÍCIO BRAVO" },
];

export const personnelOptions = militaryOptions.filter((person) =>
  person.id.startsWith("personnel-"),
);

export const officerOptions = militaryOptions.filter((person) =>
  person.id.startsWith("officer-"),
);

export function isRegisteredMilitaryName(name: string) {
  return militaryOptions.some((person) => person.name === name.trim());
}
