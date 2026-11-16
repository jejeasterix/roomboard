export type ToolId = "pen" | "eraser" | "select";

export interface ToolDef {
  readonly id: ToolId;
  readonly label: string;
}

export const toolbar: readonly ToolDef[] = [
  { id: "pen", label: "Stylo" },
  { id: "eraser", label: "Gomme" },
  { id: "select", label: "Sélection" },
];

/** Retourne la liste des erreurs de cohérence de la barre d'outils. */
export function validateToolbar(tools: readonly ToolDef[]): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const t of tools) {
    if (seen.has(t.id)) errors.push(`doublon : ${t.id}`);
    seen.add(t.id);
    if (t.label.trim() === "") errors.push(`libellé vide : ${t.id}`);
  }
  return errors;
}
