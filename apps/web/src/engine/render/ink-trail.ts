/**
 * Échelon 3 de DA9 : traînée déléguée `navigator.ink` (Chromium sous Windows : le système dessine la pointe devant
 * l'encre du moteur). Éteinte par défaut ; là où l'API manque, sans effet et dit (`absent`). Le moteur n'en sait
 * rien : la page branche ce module sur la zone de dessin et lui passe `navigator.ink` (aucun global ici).
 */

export interface InkTrailStyle {
  readonly color: string;
  /** Diamètre de la pointe en px CSS. */
  readonly diameter: number;
}

export interface InkPresenterLike {
  updateInkTrailStartPoint(evt: PointerEvent, style: InkTrailStyle): void;
}

export interface InkLike {
  requestPresenter(param?: { presentationArea?: Element | null }): Promise<InkPresenterLike>;
}

/** Ce que `styleFor` lit de l'événement : l'identifiant du pointeur (le routeur dit ce que ce geste fait), son type et ses boutons. */
export interface TrailEvent {
  readonly pointerId: number;
  readonly pointerType: string;
  readonly buttons: number;
}

export interface InkTrailDeps {
  /** Réglage `inkTrail` (T30) : faux = rien n'est demandé au navigateur. */
  readonly enabled: boolean;
  readonly ink: InkLike | undefined;
  /** Canvas d'interaction : zone où le système dessine la pointe. */
  readonly area: Element;
  readonly surface: {
    addEventListener(type: string, l: (e: Event) => void): void;
    removeEventListener(type: string, l: (e: Event) => void): void;
  };
  /** Style de la pointe pour ce geste, ou null s'il ne trace pas (gomme, outil main, espace, doigt qui déplace la vue). */
  styleFor(e: TrailEvent): InkTrailStyle | null;
}

export type InkTrailStatus = "on" | "off" | "absent" | "refused";

export interface InkTrail {
  readonly status: InkTrailStatus;
  /** Appels refusés par le navigateur (événement non accepté), comptés sans être propagés. */
  failures(): number;
  dispose(): void;
}

const inert = (status: InkTrailStatus): InkTrail => ({ status, failures: () => 0, dispose: () => {} });

export async function attachInkTrail(deps: InkTrailDeps): Promise<InkTrail> {
  if (!deps.enabled) return inert("off");
  const ink = deps.ink;
  if (!ink || typeof ink.requestPresenter !== "function") return inert("absent");
  let presenter: InkPresenterLike;
  try {
    presenter = await ink.requestPresenter({ presentationArea: deps.area });
  } catch {
    return inert("refused");
  }
  let failures = 0;
  const onMove = (ev: Event): void => {
    const e = ev as PointerEvent;
    if (e.buttons === 0) return;
    const style = deps.styleFor(e);
    if (!style || !(style.diameter > 0)) return;
    try {
      presenter.updateInkTrailStartPoint(e, style);
    } catch {
      failures++;
    }
  };
  deps.surface.addEventListener("pointermove", onMove);
  return {
    status: "on",
    failures: () => failures,
    dispose: () => deps.surface.removeEventListener("pointermove", onMove),
  };
}
