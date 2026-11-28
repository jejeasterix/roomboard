/**
 * Profondeur d'imbrication JSON (OG45) : un plafond explicite au lieu du débordement de pile, qui dépend de la version
 * du moteur (Node 22 : `JSON.parse` lève vers 50 000 niveaux ; Node 26 : il les lit, puis `JSON.stringify` lève, ou non).
 * Profondeur = nombre de tableaux et d'objets emboîtés : `1` → 0, `[]` → 1, `{"a":[1]}` → 2.
 * Les deux mesures sont itératives : elles ne débordent jamais, quelle que soit l'entrée.
 */

/** 64 niveaux : un profil livré en compte 8 (profil > barres > barre > groupes > groupe > outils > outil > `requires`),
 *  `json-depth.test.ts` le mesure ; la marge laisse aux clés inconnues (`rest`) de futures versions de quoi s'imbriquer. */
export const MAX_JSON_DEPTH = 64;

/** Vrai si le texte imbrique plus de `max` tableaux ou objets. Balayé avant `JSON.parse` : crochets et accolades hors
 *  chaînes, échappements compris ; un texte qui n'est pas du JSON est laissé à `JSON.parse`. */
export function textTooDeep(text: string, max: number = MAX_JSON_DEPTH): boolean {
  let depth = 0;
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (inString) {
      if (c === 0x5c) i++; // `\` : le caractère suivant est échappé
      else if (c === 0x22) inString = false;
    } else if (c === 0x22) inString = true;
    else if (c === 0x5b || c === 0x7b) {
      if (++depth > max) return true;
    } else if (c === 0x5d || c === 0x7d) depth--;
  }
  return false;
}

/** Vrai si la valeur imbrique plus de `max` tableaux ou objets (parcours par pile, arrêté dès `max` dépassé : une
 *  boucle d'objets s'arrête donc aussi). */
export function valueTooDeep(value: unknown, max: number = MAX_JSON_DEPTH): boolean {
  const stack: Array<[unknown, number]> = [[value, 0]];
  for (let top = stack.pop(); top !== undefined; top = stack.pop()) {
    const [v, d] = top;
    if (typeof v !== "object" || v === null) continue;
    if (d + 1 > max) return true;
    for (const child of Object.values(v)) stack.push([child, d + 1]);
  }
  return false;
}
