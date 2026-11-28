/**
 * Routeur d'entrées (D18) : pour chaque geste de l'échantillonneur, tracer, déplacer la vue, pincer ou ignorer.
 * Un geste par pointerId. Stylet et souris tracent avec l'outil courant (bouton gomme du stylet : gomme). Doigt : trace
 * tant qu'aucun stylet n'a été vu (ENI sans stylet), sinon déplace la vue (réglable). Un second doigt posé dans les
 * 150 ms du premier annule le trait commencé (rien d'écrit) et passe en pincement. L'outil d'un geste est fixé au début.
 * Outil main ou espace tenu : tout geste déplace la vue (D17).
 * OG25 : un contact tactile large, ou trois doigts serrés, dans les 250 ms de leur pose, ouvrent une gomme automatique à
 * la taille du contact (seuils et calculs : `contact.ts`), sous un identifiant de geste négatif ; l'outil courant ne
 * change jamais (A1). Un geste établi n'est jamais interrompu ; un stylet posé ferme la gomme sans rien écrire.
 */
import { DETECT_MS, eraserCircle, isLargeContact, isTightCluster, joinsCluster, type ContactBox } from "./contact";
import type { CloseReason, DrawTool, GestureSink, ToolChoice, ViewSink } from "./gesture";
import { pressureOf, type GestureEvent, type InputSample } from "./sampler";

export const SECOND_FINGER_MS = 150;

export interface RouterOptions {
  /** Après un stylet vu dans la séance, le doigt seul déplace la vue au lieu de tracer (D18, réglable). */
  readonly fingerPansAfterPen: boolean;
  readonly secondFingerMs: number;
  /** OG25 (déc. 25) : gomme automatique à la paume ; lu à chaque pose (la page passe un accesseur) ; absent : coupée. */
  readonly autoEraser?: boolean;
}

export const DEFAULT_ROUTER_OPTIONS: RouterOptions = { fingerPansAfterPen: true, secondFingerMs: SECOND_FINGER_MS };

/** OG25 (déc. 24) : anneau de la gomme automatique, px CSS de la scène. */
export interface EraserRingView {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
}

export interface RouterDeps {
  /** Outil courant ; "hand" (outil main, D17) : tout geste déplace la vue. */
  currentTool(): ToolChoice;
  /** Barre d'espace tenue (D17) : lue au début du geste ; absent = jamais tenue. */
  panHeld?(): boolean;
  /** OG25 (déc. 23) : faux quand une retouche d'image ou une orbite prend les gestes ; absent : vrai. */
  gesturesToTools?(): boolean;
  /** OG25 (déc. 24) : montre l'anneau de la gomme automatique (null : le retire) ; absent : rien. */
  ring?(c: EraserRingView | null): void;
  readonly gestures: GestureSink;
  readonly view: ViewSink;
  /** OG12 (n° 29, DA-6) : doigt tardif tenu pendant un geste au doigt = Maj ; absent : ignoré comme avant. */
  modifier?(held: boolean): void;
}

export interface Router {
  handle(g: GestureEvent): void;
  penSeen(): boolean;
  /**
   * Rôle du geste en cours de ce pointeur : "ink" (trace), "erase" (gomme), "view" (déplacement ou pincement de la vue),
   * null (inconnu, ignoré, annulé ou fini). Source unique pour la traînée déléguée (échelon 3).
   */
  roleOf(pointerId: number): "ink" | "erase" | "edit" | "view" | null;
}

/**
 * OG25 : "palm" : membre du groupe gomme ; "spent" : inerte jusqu'à son lever, contact d'une gomme fermée (déc. 15) ou
 * défilement et pincement hors du groupe à la bascule (règle 5).
 */
type Role = "draw" | "pan" | "pinch" | "ignored" | "palm" | "spent";

interface Track {
  role: Role;
  tool: DrawTool;
  readonly pointerType: string;
  readonly startT: number;
  late?: boolean;
  x: number;
  y: number;
  /** OG25 : dernière géométrie reçue (px CSS) ; 0 × 0 sans géométrie. */
  w: number;
  h: number;
  /** OG25 (déc. 14, 33) : outil choisi et espace tenu à la pose. */
  readonly choice: ToolChoice;
  readonly held: boolean;
  /** OG25 (déc. 12) : déplacement de vue cumulé par ce contact (rôle "pan"), défait à la bascule. */
  panX: number;
  panY: number;
}

/** OG25 : groupe gomme ; `id` : identifiant réservé négatif du geste (déc. 35) ; `radius` : le plus grand vu (déc. 19). */
interface PalmGroup {
  readonly id: number;
  readonly members: Set<number>;
  radius: number;
}

/** OG25 (déc. 33) : outils sans effet au `begin`, seuls à pouvoir basculer. */
const SWITCHABLE: ReadonlySet<ToolChoice> = new Set<ToolChoice>(["pen", "eraser", "rect", "diamond", "ellipse", "line", "arrow", "fill"]);

const lastOf = (samples: readonly InputSample[]): InputSample | undefined => samples[samples.length - 1];
const boxOf = (t: Track): ContactBox => ({ x: t.x, y: t.y, width: t.w, height: t.h });
const sampleAt = (x: number, y: number, t: number): InputSample => ({ x, y, pressure: pressureOf("touch", 0), tiltX: 0, tiltY: 0, t });

export function createRouter(opts: RouterOptions, deps: RouterDeps): Router {
  const tracks = new Map<number, Track>();
  let seenPen = false;
  let palm: PalmGroup | null = null;
  let nextPalmId = -1;

  const touches = (role: Role): [number, Track][] =>
    [...tracks].filter(([, t]) => t.pointerType === "touch" && t.role === role);

  const pinchPair = (): [Track, Track] | null => {
    const p = touches("pinch");
    const a = p[0];
    const b = p[1];
    return a && b ? [a[1], b[1]] : null;
  };

  /** OG12 (n° 29) : seul un geste au doigt dont l'outil n'est ni le stylo ni la gomme donne ce sens au doigt tardif ;
   *  le doigt garde le rôle `ignored`. */
  let lateCount = 0;
  const lateFinger = (drawing: Track, track: Track): void => {
    if (drawing.tool === "pen" || drawing.tool === "eraser" || deps.modifier === undefined) return;
    track.late = true;
    if (lateCount++ === 0) deps.modifier(true);
  };
  /** OG12 : le geste au doigt finit (fermé, ou avorté par la paume d'OG25) : ses doigts tardifs ne valent plus Maj ;
   *  `which` : seulement ceux-là (doigts tardifs entrés dans la gomme). */
  const releaseLate = (which: (t: Track) => boolean = () => true): void => {
    for (const [, o] of tracks) {
      if (o.late && which(o)) {
        o.late = false;
        if (--lateCount === 0) deps.modifier?.(false);
      }
    }
  };

  const memberBoxes = (): ContactBox[] => {
    const out: ContactBox[] = [];
    if (palm === null) return out;
    for (const id of palm.members) {
      const t = tracks.get(id);
      if (t) out.push(boxOf(t));
    }
    return out;
  };

  /** OG25 : le chemin et l'anneau suivent le centre du groupe ; le rayon ne fait que grandir (déc. 17, 19). */
  const follow = (t: number): void => {
    if (palm === null) return;
    const boxes = memberBoxes();
    if (boxes.length === 0) return;
    const c = eraserCircle(boxes);
    if (c.radius > palm.radius) {
      palm.radius = c.radius;
      deps.gestures.resize?.(palm.id, c.radius);
    }
    deps.gestures.extend(palm.id, [sampleAt(c.x, c.y, t)], []);
    deps.ring?.({ x: c.x, y: c.y, radius: palm.radius });
  };

  /** OG25 : ferme la gomme ; les contacts encore posés n'agissent plus jusqu'à leur lever, ni ne rouvrent une gomme. */
  const closePalm = (how: CloseReason): void => {
    if (palm === null) return;
    const p = palm;
    palm = null;
    for (const id of p.members) {
      const t = tracks.get(id);
      if (t) t.role = "spent";
    }
    deps.gestures.close(p.id, how);
    deps.ring?.(null);
  };

  /**
   * OG25 : essaie la bascule déclenchée par `trigger` (contact posé ou élargi) à l'instant `now`. Rien ne bascule si un
   * contact tactile, où qu'il soit, tient un geste établi (trait, défilement ou pincement au-delà de sa fenêtre : déc. 13,
   * 32), ni hors des outils sans effet au `begin` (déc. 33), ni avec la main ou l'espace (déc. 14), ni pendant une
   * retouche ou une orbite (déc. 23). Le groupe : le déclencheur, les contacts tactiles encore dans leur fenêtre à
   * CLUSTER_PX au plus de lui (trait, défilement, pincement, ou ignoré : second doigt tardif, troisième doigt, déc. 9,
   * règle 2), et le partenaire de pincement de tout membre, où qu'il soit (une paire entre en entier). Hors du groupe,
   * à la bascule : un trait garde son geste (deux personnes au tableau) ; un défilement ou un pincement devient inerte
   * jusqu'à son lever, la vue ne bouge plus (règle 5) ; un ignoré le reste (déc. 12).
   */
  const tryPalm = (triggerId: number, trigger: Track, now: number): boolean => {
    if (opts.autoEraser !== true || palm !== null || trigger.pointerType !== "touch" || now - trigger.startT > DETECT_MS) return false;
    const group: [number, Track][] = [[triggerId, trigger]];
    const near = boxOf(trigger);
    for (const [id, t] of tracks) {
      if (id === triggerId || t.pointerType !== "touch") continue;
      const live = t.role === "draw" || t.role === "pan" || t.role === "pinch";
      // Un geste établi, où qu'il soit, empêche la bascule (déc. 13, 32).
      if (live && now - t.startT > DETECT_MS) return false;
      // Un contact à plus de CLUSTER_PX du déclencheur garde son geste (revue T10) : il n'entre pas dans la gomme.
      if ((live || (t.role === "ignored" && now - t.startT <= DETECT_MS)) && joinsCluster([near], boxOf(t))) group.push([id, t]);
    }
    // Une paire de pincement entre en entier (revue T11) : le partenaire d'un membre le suit, où qu'il soit.
    if (group.some(([, t]) => t.role === "pinch")) {
      for (const p of touches("pinch")) if (!group.some(([id]) => id === p[0])) group.push(p);
    }
    let first = trigger;
    for (const [, t] of group) if (t.startT < first.startT) first = t;
    if (first.held || !SWITCHABLE.has(first.choice)) return false;
    const boxes = group.map(([, t]) => boxOf(t));
    if (!group.some(([, t]) => isLargeContact({ width: t.w, height: t.h })) && !isTightCluster(boxes)) return false;
    if (deps.gesturesToTools?.() === false) return false;
    const id = nextPalmId--;
    const aborted = group.some(([, t]) => t.role === "draw");
    for (const [pid, t] of group) {
      if (t.role === "draw") deps.gestures.close(pid, "abort");
      else if (t.role === "pan" && (t.panX !== 0 || t.panY !== 0)) deps.view.panBy(-t.panX, -t.panY);
      t.role = "palm";
      t.panX = 0;
      t.panY = 0;
    }
    // OG12 × OG25 (A-1, A-2) : la paume gagne sur le doigt tardif, Maj retombe avant la gomme ; un trait hors du groupe
    // garde son geste et son Maj, sauf le doigt tardif entré dans la gomme.
    releaseLate(aborted ? undefined : (o) => o.role === "palm");
    // Hors du groupe, défilement et pincement s'arrêtent jusqu'au lever : la vue ne bouge plus (règle 5, revue T11).
    for (const [, t] of touches("pan")) t.role = "spent";
    for (const [, t] of touches("pinch")) t.role = "spent";
    const c = eraserCircle(boxes);
    palm = { id, members: new Set(group.map(([pid]) => pid)), radius: c.radius };
    deps.gestures.begin(id, "eraser", [sampleAt(c.x, c.y, now)], "touch");
    deps.gestures.resize?.(id, c.radius);
    deps.ring?.({ x: c.x, y: c.y, radius: c.radius });
    return true;
  };

  const onStart = (g: GestureEvent): void => {
    const s = g.samples[0];
    if (!s) return;
    const tool = deps.currentTool();
    const held = deps.panHeld?.() === true;
    const track: Track = {
      role: "ignored",
      tool: "pen",
      pointerType: g.pointerType,
      startT: s.t,
      x: s.x,
      y: s.y,
      w: g.contact?.width ?? 0,
      h: g.contact?.height ?? 0,
      choice: tool,
      held,
      panX: 0,
      panY: 0,
    };
    tracks.set(g.pointerId, track);
    if (g.pointerType === "pen") {
      seenPen = true;
      closePalm("abort"); // OG25 (déc. 15) : une main posée pour écrire n'est pas une gomme
    }
    if (g.pointerType !== "touch") {
      if (tool === "hand" || held) {
        track.role = "pan";
        return;
      }
      track.role = "draw";
      track.tool = g.eraserButton ? "eraser" : tool;
      deps.gestures.begin(g.pointerId, track.tool, g.samples, g.pointerType);
      return;
    }
    if (palm !== null) {
      // OG25 (déc. 12) : un contact proche rejoint le groupe ; un plus loin est ignoré, et la vue ne bouge plus.
      if (joinsCluster(memberBoxes(), boxOf(track))) {
        track.role = "palm";
        palm.members.add(g.pointerId);
        follow(s.t);
      }
      return;
    }
    if (tryPalm(g.pointerId, track, s.t)) return;
    if (pinchPair()) return; // troisième doigt : ignoré
    const drawing = touches("draw")[0];
    const panning = touches("pan")[0];
    if (drawing && s.t - drawing[1].startT <= opts.secondFingerMs) {
      deps.gestures.close(drawing[0], "abort");
      drawing[1].role = "pinch";
      track.role = "pinch";
      return;
    }
    if (panning) {
      panning[1].role = "pinch";
      track.role = "pinch";
      return;
    }
    if (drawing) {
      lateFinger(drawing[1], track); // OG12 : doigt tardif = Maj pendant un geste au doigt, jamais le stylo ni la gomme
      return;
    }
    if (tool === "hand" || held || (seenPen && opts.fingerPansAfterPen)) {
      track.role = "pan";
      return;
    }
    track.role = "draw";
    track.tool = tool;
    deps.gestures.begin(g.pointerId, tool, g.samples, g.pointerType);
  };

  const onMove = (g: GestureEvent): void => {
    const t = tracks.get(g.pointerId);
    const s = lastOf(g.samples);
    if (!t || !s) return;
    if (g.contact) {
      t.w = g.contact.width;
      t.h = g.contact.height;
    }
    if (t.role === "palm") {
      t.x = s.x;
      t.y = s.y;
      follow(s.t);
      return;
    }
    if (
      palm === null &&
      t.pointerType === "touch" &&
      opts.autoEraser === true &&
      s.t - t.startT <= DETECT_MS &&
      (t.role === "draw" || t.role === "pan" || t.role === "pinch" || t.role === "ignored") &&
      isLargeContact({ width: t.w, height: t.h })
    ) {
      // OG25 : un contact qui s'élargit dans sa fenêtre bascule ; la gomme part de sa position nouvelle (H10).
      const px = t.x;
      const py = t.y;
      t.x = s.x;
      t.y = s.y;
      if (tryPalm(g.pointerId, t, s.t)) return;
      t.x = px;
      t.y = py;
    }
    if (t.role === "draw") {
      deps.gestures.extend(g.pointerId, g.samples, g.predicted);
    } else if (t.role === "pan") {
      deps.view.panBy(s.x - t.x, s.y - t.y);
      t.panX += s.x - t.x;
      t.panY += s.y - t.y;
    } else if (t.role === "pinch") {
      const pair = pinchPair();
      if (pair) {
        const [a, b] = pair;
        const cx0 = (a.x + b.x) / 2;
        const cy0 = (a.y + b.y) / 2;
        const d0 = Math.hypot(a.x - b.x, a.y - b.y);
        t.x = s.x;
        t.y = s.y;
        const cx1 = (a.x + b.x) / 2;
        const cy1 = (a.y + b.y) / 2;
        const d1 = Math.hypot(a.x - b.x, a.y - b.y);
        deps.view.panBy(cx1 - cx0, cy1 - cy0);
        if (d0 > 0 && d1 > 0) deps.view.zoomAt(cx1, cy1, d1 / d0);
      }
    }
    t.x = s.x;
    t.y = s.y;
  };

  const onClose = (g: GestureEvent): void => {
    const t = tracks.get(g.pointerId);
    if (!t) return;
    tracks.delete(g.pointerId);
    if (t.late && --lateCount === 0) deps.modifier?.(false);
    if (t.role === "palm") {
      if (palm === null) return;
      palm.members.delete(g.pointerId);
      // OG25 (déc. 15, 22) : paume annulée par le stylet : abort ; dernier contact levé : end, ou cancel s'il est annulé.
      if (g.palm === true) closePalm("abort");
      else if (palm.members.size === 0) closePalm(g.kind === "cancel" ? "cancel" : "end");
      return;
    }
    if (t.role === "draw") {
      const how: CloseReason = g.palm === true ? "abort" : g.kind === "cancel" ? "cancel" : "end";
      deps.gestures.close(g.pointerId, how);
      releaseLate();
    } else if (t.role === "pinch") {
      for (const [, other] of touches("pinch")) other.role = "ignored";
    }
  };

  return {
    handle(g) {
      if (g.kind === "start") onStart(g);
      else if (g.kind === "move") onMove(g);
      else onClose(g);
    },
    penSeen: () => seenPen,
    roleOf(pointerId) {
      const t = tracks.get(pointerId);
      if (!t) return null;
      if (t.role === "palm") return "erase";
      if (t.role === "draw") return t.tool === "eraser" ? "erase" : t.tool === "pen" ? "ink" : "edit";
      return t.role === "pan" || t.role === "pinch" ? "view" : null;
    },
  };
}
