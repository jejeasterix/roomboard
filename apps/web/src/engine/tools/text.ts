/**
 * Outil Texte (D14, CL4-2 à CL4-6) : un clic ouvre une boîte (nouvelle, ou le texte touché, masqué de la scène pendant
 * l'édition) ; la saisie se fait dans la zone de la page (hôte injecté : `app/text-editor.ts`) ; une seule SetText à la
 * validation, portant les segments de la zone (C7b, R6), hauteur mesurée par `layoutRich` sur eux. Composition IME (CL4-3) : toute demande de validation attend
 * `compositionend` (porte partagée, `commit-gate.ts`) ; rien n'est écrit pendant la composition. Clic pendant l'édition : valide seulement.
 */
import type { Matrix, TextSpan } from "../../core/api";
import { lookFrom, type Look } from "../../core/look";
import { plainSpans, sameSpans } from "../../core/rich-text";
import { LABEL_SIZE, labelBox, labelTop } from "../../core/shape-label";
import { composeMatrix, IDENTITY_MATRIX } from "../../core/shapes";
import type { FormatAction, FormatState } from "../rich-edit";
import { screenToWorld, type Camera } from "../camera";
import { DEFAULT_TEXT_BOX_WIDTH, TEXT_LINE_HEIGHT, layoutRich, richBoxHeight, type Measure } from "../text-layout";
import { EMPTY_OVERLAY } from "../render/overlay";
import { createCommitGate } from "./commit-gate";
import { NO_LIVE, type GestureTool, type LivePart, type ToolContext } from "./tool";

export const TEXT_HIT_TOL_PX = 6;

export interface TextStyle {
  readonly color: string;
  readonly size: number;
  /** OG11 : transparence du style courant (0..100) pour une boîte neuve ; absente : opaque. */
  readonly opacity?: number;
  /** T28 : alignement du style courant ; absent ou `left` : rien écrit. */
  readonly textAlign?: "left" | "center" | "right";
  /** T31 : police du style courant (absente : la normale) ; portée par les segments d'une boîte neuve. */
  readonly font?: string;
}

export interface TextEditSession {
  readonly page: string;
  /** null : nouvelle boîte. */
  readonly id: string | null;
  /** OG33 : forme dont on écrit le texte ; `id` reste null. */
  readonly shape?: string;
  /** Matrice monde de la boîte (translation pour une boîte neuve). */
  readonly matrix: Matrix;
  readonly boxWidth: number;
  readonly color: string;
  readonly size: number;
  readonly initial: string;
  /** Segments à l'ouverture (C7, T11) : la hauteur prévoit ceux d'après l'édition ; boîte neuve : un segment vide. */
  readonly spans: readonly TextSpan[];
  /** Fond opaque de la zone (cellule de tableau, C10a HC10-10) ; absent : transparent. */
  readonly background?: string;
  /** T32 : police du style courant d'une boîte neuve, pour que la zone la montre pendant la frappe ; absente : la normale. */
  readonly font?: string;
}

/** Zone de saisie de la page (DOM, T56 ; riche en C7b, R18) : le moteur n'en connaît que ceci. */
export interface TextEditorHost {
  open(session: TextEditSession, camera: Camera): void;
  close(): void;
  value(): string;
  /** Segments de la séance (C7b, R18) ; fermée : un segment vide. */
  spans(): readonly TextSpan[];
  /** Action de la barre ou d'un raccourci sur la sélection (R8) ; fermée ou pendant une composition : sans effet. */
  format(a: FormatAction): void;
  /** État de la barre (R15) ; fermée : null. */
  formatState(): FormatState | null;
}

export interface TextTool extends GestureTool {
  editing(): TextEditSession | null;
  composing(): boolean;
  compositionStart(): void;
  compositionEnd(): void;
  /** Échap, clic ailleurs, perte du focus, outil ou page quittés : valide, ou attend la fin de la composition. */
  requestCommit(): void;
  /** Barre de format (C7b, DAR4) : relayée à la zone si une saisie est ouverte, hors composition (R5). */
  format(a: FormatAction): void;
  formatState(): FormatState | null;
  /** La zone a changé sélection ou format : l'état du moteur est republié (R15). */
  formatChanged(): void;
  /** OG33 (choix 8, 9) : séance sur le texte de la forme `id` ; faux si ce n'est pas une forme à texte. */
  openLabel(id: string): boolean;
}

export function createTextTool(ctx: ToolContext, host: TextEditorHost, style: () => TextStyle, measure: Measure): TextTool {
  let session: TextEditSession | null = null;
  let live: LivePart = NO_LIVE;
  /** Aspect du style courant pour une boîte neuve (transparence, alignement) ; relu à la validation pour que le panneau agisse pendant la saisie. */
  const currentLook = (): Look | undefined => {
    const st = style();
    return lookFrom({ strokeStyle: "solid", roughness: 0, roundness: "sharp", opacity: st.opacity ?? 100, textAlign: st.textAlign ?? "left" }, null);
  };
  /** Porte IME (CL4-3), partagée avec l'outil Tableau : toute validation attend la fin d'une composition. */
  const gate = createCommitGate(() => commit(), () => session !== null);

  /** Écrit la boîte ouverte (une SetText au plus, portant les segments de la zone, R6) ; la session est fermée avant
   *  `host.close()` (blur réentrant sans effet). */
  const commit = (): void => {
    const s = session;
    if (!s) return;
    const content = host.value();
    const typed = host.spans();
    const font = s.font;
    const spans = s.id === null && font !== undefined ? typed.map((x) => (x.attrs.font === undefined ? { ...x, attrs: { ...x.attrs, font } } : x)) : typed;
    const hadHidden = live.hidden.size > 0;
    session = null;
    gate.reset();
    live = NO_LIVE;
    host.close();
    // La boucle est arrêtée (outil inactif) : sans image, l'id masqué resterait invisible jusqu'au geste suivant.
    if (hadHidden) ctx.requestFrame?.();
    ctx.stateChanged?.();
    if (s.shape !== undefined) {
      if (content !== s.initial) ctx.run({ type: "SetShapeLabel", id: s.shape, label: content });
      ctx.labelDone?.(s.shape);
      return;
    }
    if (s.id === null && content === "") return;
    // R6 : texte et segments inchangés : aucune commande ; mise en forme seule (S6) : la commande part.
    if (s.id !== null && content === s.initial && sameSpans(spans, s.spans)) return;
    const look = s.id === null ? currentLook() : undefined;
    const boxHeight = richBoxHeight(layoutRich(spans, { size: s.size }, s.boxWidth, measure));
    ctx.run({ type: "SetText", page: s.page, id: s.id, x: s.matrix[4], y: s.matrix[5], content, color: s.color, size: s.size, boxWidth: s.boxWidth, boxHeight, spans, ...(s.id === null && look ? { look } : {}) });
  };

  const open = (x: number, y: number): void => {
    const page = ctx.page();
    const cam = ctx.camera();
    const hit = ctx.doc.hitTest(page, x, y, TEXT_HIT_TOL_PX / cam.zoom);
    const el = hit === null ? null : ctx.doc.element(hit);
    if (el?.kind === "text") {
      session = {
        page,
        id: el.id,
        matrix: el.transform,
        boxWidth: el.text.boxWidth,
        color: el.style.color,
        size: el.text.size,
        initial: el.text.content,
        spans: el.text.spans,
      };
      live = { ...NO_LIVE, hidden: new Set([el.id]) };
    } else {
      const st = style();
      session = { page, id: null, matrix: [1, 0, 0, 1, x, y], boxWidth: DEFAULT_TEXT_BOX_WIDTH, color: st.color, size: st.size, initial: "", spans: plainSpans(""), ...(st.font !== undefined ? { font: st.font } : {}) };
      live = NO_LIVE;
    }
    gate.reset();
    host.open(session, cam);
    ctx.stateChanged?.();
  };

  /** OG33 (choix 8, 9) : séance sur le texte de la forme `id`, zone centrée dans sa boîte ; la forme est masquée et
   *  repeinte sans son texte (fantôme `noLabel`). */
  const openLabel = (id: string): boolean => {
    const el = ctx.doc.element(id);
    if (el?.kind !== "shape") return false;
    const box = labelBox(el.shape);
    if (box === null) return false;
    if (session) gate.request();
    const label = el.shape.label ?? "";
    const spans = plainSpans(label);
    const height = Math.max(richBoxHeight(layoutRich(spans, { size: LABEL_SIZE }, box.w, measure)), LABEL_SIZE * TEXT_LINE_HEIGHT);
    session = { page: ctx.page(), id: null, shape: id, matrix: composeMatrix(el.transform, [1, 0, 0, 1, box.x, labelTop(box, height)]), boxWidth: box.w, color: el.style.color, size: LABEL_SIZE, initial: label, spans };
    live = { ...NO_LIVE, hidden: new Set([id]), overlay: { ...EMPTY_OVERLAY, ghosts: [{ id, matrix: IDENTITY_MATRIX, noLabel: true }] } };
    gate.reset();
    host.open(session, ctx.camera());
    ctx.stateChanged?.();
    return true;
  };

  return {
    openLabel,
    begin(_pointerId, samples) {
      const s = samples[0];
      if (!s) return;
      if (session) {
        gate.request();
        return;
      }
      const [x, y] = screenToWorld(ctx.camera(), s.x, s.y);
      open(x, y);
    },
    extend() {
      // la saisie passe par l'hôte
    },
    frame() {
      // rien à pousser
    },
    close() {
      // le clic a tout fait au begin
    },
    live: () => live,
    active: () => false,
    leave() {
      gate.request();
    },
    editing: () => session,
    composing: () => gate.composing(),
    compositionStart() {
      gate.compositionStart();
    },
    compositionEnd() {
      gate.compositionEnd();
    },
    requestCommit() {
      gate.request();
    },
    format(a) {
      if (session !== null && !gate.composing()) host.format(a);
    },
    formatState: () => (session === null ? null : host.formatState()),
    formatChanged() {
      ctx.stateChanged?.();
    },
  };
}
