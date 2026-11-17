/**
 * Échantillonneur d'entrée (cadrage D29, D39, D18 partiel). TS pur : ni framework, ni Wasm, ni global du DOM
 * à l'exécution. Un geste par pointerId ; pointerup ne pousse aucun point (pression 0 du stylet levé) ; aucun
 * contact `touch` ne trace tant qu'un stylet touche, qu'il soit posé avant ou après la pointe.
 */

export interface InputSample {
  readonly x: number;
  readonly y: number;
  readonly pressure: number;
  readonly tiltX: number;
  readonly tiltY: number;
  readonly t: number;
}

export type GestureKind = "start" | "move" | "end" | "cancel";

export interface GestureEvent {
  readonly kind: GestureKind;
  readonly pointerId: number;
  readonly pointerType: string;
  readonly eraserButton: boolean;
  readonly samples: readonly InputSample[];
  readonly predicted: readonly InputSample[];
  /** Vrai sur le `cancel` d'un contact `touch` annulé parce que le stylet touche (paume, D18). */
  readonly palm?: boolean;
}

export interface SamplerOptions {
  readonly coalesced: boolean;
  readonly predicted: boolean;
  readonly raw: boolean;
}

export interface SamplerStats {
  readonly moveEvents: number;
  readonly samples: number;
  readonly rawUpdateUsed: boolean;
  readonly pointerCancels: number;
  readonly lostCaptures: number;
  readonly touchIgnored: number;
  readonly eraserSeen: boolean;
  readonly gestures: number;
}

export interface PointerLike {
  readonly pointerId: number;
  readonly pointerType: string;
  readonly clientX: number;
  readonly clientY: number;
  readonly pressure: number;
  readonly tiltX: number;
  readonly tiltY: number;
  readonly buttons: number;
  readonly timeStamp: number;
  getCoalescedEvents?(): PointerLike[];
  getPredictedEvents?(): PointerLike[];
  preventDefault(): void;
}

export interface PointerSurface {
  addEventListener(type: string, listener: (e: Event) => void): void;
  removeEventListener(type: string, listener: (e: Event) => void): void;
  setPointerCapture(pointerId: number): void;
  getBoundingClientRect(): { readonly left: number; readonly top: number };
}

export interface Sampler {
  onGesture(cb: (g: GestureEvent) => void): () => void;
  stats(): SamplerStats;
  dispose(): void;
}

/** Bit du bouton gomme du stylet dans `PointerEvent.buttons`. */
const ERASER_BUTTON = 32;
/** Pression donnée à la souris et au doigt (D8). */
const NON_PEN_PRESSURE = 0.5;

/** Pression retenue pour un pointeur : celle du stylet, 0,5 pour la souris et le doigt (D8). */
export function pressureOf(pointerType: string, pressure: number): number {
  return pointerType === "pen" ? pressure : NON_PEN_PRESSURE;
}

interface ActiveGesture {
  readonly pointerType: string;
  readonly left: number;
  readonly top: number;
  eraser: boolean;
}

export function createSampler(target: PointerSurface, opts: SamplerOptions): Sampler {
  const listeners = new Set<(g: GestureEvent) => void>();
  const active = new Map<number, ActiveGesture>();
  const useRaw = opts.raw && "onpointerrawupdate" in target;
  // Sous pointerrawupdate, Chromium ne donne aucun point prédit : on n'en lit pas (predicted effectif = faux).
  const usePredicted = opts.predicted && !useRaw;
  let moveEvents = 0;
  let samples = 0;
  let pointerCancels = 0;
  let lostCaptures = 0;
  let touchIgnored = 0;
  let gestures = 0;
  let eraserSeen = false;

  const emit = (g: GestureEvent): void => {
    for (const cb of listeners) cb(g);
  };

  /** Ferme un geste (déjà retiré de `active`) : aucun point, aucun prédit. */
  const emitClose = (pointerId: number, g: ActiveGesture, kind: "end" | "cancel", palm = false): void => {
    emit({
      kind,
      pointerId,
      pointerType: g.pointerType,
      eraserButton: g.eraser,
      samples: [],
      predicted: [],
      ...(palm ? { palm: true } : {}),
    });
  };

  const penInContact = (): boolean => {
    for (const g of active.values()) if (g.pointerType === "pen") return true;
    return false;
  };

  const toSample = (e: PointerLike, g: ActiveGesture): InputSample => ({
    x: e.clientX - g.left,
    y: e.clientY - g.top,
    pressure: pressureOf(g.pointerType, e.pressure),
    tiltX: e.tiltX ?? 0,
    tiltY: e.tiltY ?? 0,
    t: e.timeStamp,
  });

  /**
   * D18 : un contact `touch` déjà posé quand le stylet touche (paume posée avant la pointe) ne trace plus. Son geste
   * est fermé par `cancel` et compté comme ignoré ; ses événements suivants n'ont plus de geste actif.
   */
  const cancelTouches = (): void => {
    const touches: number[] = [];
    for (const [pointerId, g] of active) if (g.pointerType === "touch") touches.push(pointerId);
    for (const pointerId of touches) {
      const g = active.get(pointerId);
      if (!g) continue;
      active.delete(pointerId);
      touchIgnored++;
      emitClose(pointerId, g, "cancel", true);
    }
  };

  const onDown = (ev: Event): void => {
    const e = ev as unknown as PointerLike;
    if (active.has(e.pointerId)) return;
    // T27 : à la souris, seul le bouton gauche trace (milieu, droit, autres : aucun geste).
    if (e.pointerType === "mouse" && (e.buttons & 1) === 0) return;
    if (e.pointerType === "touch" && penInContact()) {
      touchIgnored++;
      return;
    }
    if (e.pointerType === "pen") cancelTouches();
    try {
      target.setPointerCapture(e.pointerId);
    } catch {
      // Pointeur déjà relâché ou inconnu : le geste continue sans capture.
    }
    const rect = target.getBoundingClientRect();
    const g: ActiveGesture = {
      pointerType: e.pointerType,
      left: rect.left,
      top: rect.top,
      eraser: (e.buttons & ERASER_BUTTON) !== 0,
    };
    active.set(e.pointerId, g);
    gestures++;
    samples++;
    if (g.eraser) eraserSeen = true;
    emit({
      kind: "start",
      pointerId: e.pointerId,
      pointerType: g.pointerType,
      eraserButton: g.eraser,
      samples: [toSample(e, g)],
      predicted: [],
    });
  };

  const onMove = (ev: Event): void => {
    const e = ev as unknown as PointerLike;
    const g = active.get(e.pointerId);
    if (!g) return;
    if ((e.buttons & ERASER_BUTTON) !== 0) {
      g.eraser = true;
      eraserSeen = true;
    }
    const coalesced =
      opts.coalesced && typeof e.getCoalescedEvents === "function" ? e.getCoalescedEvents() : [];
    const source = coalesced.length > 0 ? coalesced : [e];
    const predicted =
      usePredicted && typeof e.getPredictedEvents === "function" ? e.getPredictedEvents() : [];
    moveEvents++;
    samples += source.length;
    emit({
      kind: "move",
      pointerId: e.pointerId,
      pointerType: g.pointerType,
      eraserButton: g.eraser,
      samples: source.map((s) => toSample(s, g)),
      predicted: predicted.map((s) => toSample(s, g)),
    });
  };

  const close = (e: PointerLike, kind: "end" | "cancel"): void => {
    const g = active.get(e.pointerId);
    if (!g) return;
    active.delete(e.pointerId);
    emitClose(e.pointerId, g, kind);
  };

  const onUp = (ev: Event): void => close(ev as unknown as PointerLike, "end");

  const onCancel = (ev: Event): void => {
    const e = ev as unknown as PointerLike;
    if (active.has(e.pointerId)) pointerCancels++;
    close(e, "cancel");
  };

  const onLostCapture = (ev: Event): void => {
    const e = ev as unknown as PointerLike;
    if (active.has(e.pointerId)) lostCaptures++;
    close(e, "cancel");
  };

  const onContextMenu = (ev: Event): void => {
    ev.preventDefault();
  };

  const bindings: ReadonlyArray<readonly [string, (e: Event) => void]> = [
    ["pointerdown", onDown],
    [useRaw ? "pointerrawupdate" : "pointermove", onMove],
    ["pointerup", onUp],
    ["pointercancel", onCancel],
    ["lostpointercapture", onLostCapture],
    ["contextmenu", onContextMenu],
  ];
  for (const [type, listener] of bindings) target.addEventListener(type, listener);

  return {
    onGesture(cb) {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    stats() {
      return {
        moveEvents,
        samples,
        rawUpdateUsed: useRaw,
        pointerCancels,
        lostCaptures,
        touchIgnored,
        eraserSeen,
        gestures,
      };
    },
    dispose() {
      for (const [type, listener] of bindings) target.removeEventListener(type, listener);
      // D39 : les gestes encore actifs sont fermés par cancel, l'encre reçue est gardée par l'abonné.
      const pending = [...active];
      active.clear();
      for (const [pointerId, g] of pending) emitClose(pointerId, g, "cancel");
      listeners.clear();
    },
  };
}
