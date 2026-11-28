import { inEditable } from "../engine/input/keys";

/**
 * OG34 : raccourcis d'un panneau ou d'une barre, actifs quand le focus y est (clavier après le tactile). Une lettre seule,
 * sans Ctrl, Alt, Maj ni Méta (Maj+V reste « Retourner verticalement »), lue par `e.key` en minuscule (AZERTY, QWERTY,
 * QWERTZ), hors champ de saisie (`inEditable` : une réglette laisse passer) ; ou l'accord `mod+enter` (Ctrl ou ⌘ + Entrée,
 * partout dans le panneau). Une touche prise est arrêtée là : les raccourcis de la fenêtre (outils, panoramique) ne la
 * voient pas. `false` rendu par une action : touche laissée (geste grisé).
 */
export type PanelKeys = Readonly<Record<string, () => boolean | void>>;

export function panelKeyDown(keys: PanelKeys): (e: KeyboardEvent) => void {
  return (e) => {
    if (e.isComposing || e.repeat || e.altKey) return;
    const mod = e.ctrlKey || e.metaKey;
    let name: string;
    if (mod && !e.shiftKey && e.key === "Enter") name = "mod+enter";
    else if (mod || e.shiftKey || inEditable(e.target instanceof HTMLElement ? e.target : null)) return;
    else name = e.key.toLowerCase();
    const act = Object.hasOwn(keys, name) ? keys[name]! : null;
    if (act === null || act() === false) return;
    e.preventDefault();
    e.stopPropagation();
  };
}
