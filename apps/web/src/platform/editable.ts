/** Cible éditable (R19, C3) : champ de texte, zone de texte ou `contenteditable` ; le collage et la copie d'objets s'y
 *  effacent. Feuille sans import (OF13, D4) : `clipboard.ts` et `paste.ts` l'importent ; `paste.ts` réexporte `isEditable`. */
const NOT_TEXT = new Set(["button", "checkbox", "radio", "file", "submit", "reset", "range", "color", "image", "hidden"]);

export function isEditable(t: EventTarget | null): boolean {
  if (typeof HTMLElement === "undefined" || !(t instanceof HTMLElement)) return false;
  const ce = t.getAttribute("contenteditable");
  if (t.isContentEditable || ce === "" || ce === "true") return true;
  if (t instanceof HTMLTextAreaElement) return true;
  return t instanceof HTMLInputElement && !NOT_TEXT.has(t.type);
}
