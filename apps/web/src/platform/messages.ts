/**
 * Messages partagés par la page, la coque et la CLI (OF13, cadrage platform-feuilles D9) : feuille sans aucun import.
 * `controller.ts` réexporte `messageOf`, `open-export.ts` réexporte `openFailedMessage`.
 */

/** Texte d'une erreur : son `message`, sinon sa conversion en chaîne (une chaîne reste elle-même). */
export function messageOf(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** « Ouverture impossible (<nom>) : <message> » ; `name` est le nom affiché, jamais un chemin. */
export const openFailedMessage = (name: string, e: unknown): string => `Ouverture impossible (${name}) : ${messageOf(e)}`;
