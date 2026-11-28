/**
 * OG34 : raccourcis d'un panneau ou d'une barre, actifs quand le focus y est (clavier après le tactile). Une lettre seule,
 * sans Ctrl, Alt, Maj ni Méta (Maj+V reste « Retourner verticalement »), lue par `e.key` en minuscule (AZERTY, QWERTY, QWERTZ) ; jamais dans une liste ni une zone de saisie
 * de texte (un curseur `range` les laisse passer). Une touche prise est arrêtée là : les raccourcis de la fenêtre (outils,
 * panoramique) ne la voient pas. `false` rendu par une action : touche laissée (geste grisé).
 */
export type PanelKeys = Readonly<Record<string, () => boolean | void>>;

export function typing(t: EventTarget | null): boolean {
  if (t instanceof HTMLSelectElement || t instanceof HTMLTextAreaElement) return true;
  if (t instanceof HTMLInputElement) return t.type !== "range";
  return t instanceof HTMLElement && t.isContentEditable;
}

export function panelKeyDown(keys: PanelKeys): (e: KeyboardEvent) => void {
  return (e) => {
    if (e.ctrlKey || e.altKey || e.shiftKey || e.metaKey || e.isComposing || e.repeat || typing(e.target)) return;
    const key = e.key.toLowerCase();
    const act = Object.hasOwn(keys, key) ? keys[key]! : null;
    if (act === null || act() === false) return;
    e.preventDefault();
    e.stopPropagation();
  };
}
