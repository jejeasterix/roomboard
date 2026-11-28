/**
 * Outil Texte (D14, CL4-2 à CL4-6) : un clic ouvre une boîte (nouvelle, ou le texte touché, masqué de la scène pendant
 * l'édition) ; la saisie se fait dans la zone de la page (hôte injecté : `app/text-editor.ts`) ; une seule SetText à la
 * validation, portant les segments de la zone (C7b, R6), hauteur mesurée par `layoutRich` sur eux. Composition IME (CL4-3) : toute demande de validation attend
 * `compositionend` (porte partagée, `commit-gate.ts`) ; rien n'est écrit pendant la composition. Clic pendant l'édition : valide seulement.
 */
import type { Matrix, TextSpan } from "../../core/api";
import { lookFrom, type Look, type TextAlign } from "../../core/look";
import { plainSpans, sameSpans } from "../../core/rich-text";
import type { FormatAction, FormatState } from "../rich-edit";
import { screenToWorld, type Camera } from "../camera";
import { DEFAULT_TEXT_BOX_WIDTH, layoutRich, richBoxHeight, type Measure } from "../text-layout";
import { fittedTextWidth } from "../table-geom";
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
  /** Matrice monde de la boîte (translation pour une boîte neuve). */
  readonly matrix: Matrix;
  readonly boxWidth: number;
  /** OG79 : texte logé dans une case : édité à la largeur d'un clic, sa boîte reprend sa ligne la plus longue à la validation. */
  readonly lodged?: boolean;
  readonly color: string;
  readonly size: number;
  readonly initial: string;
  /** Segments à l'ouverture (C7, T11) : la hauteur prévoit ceux d'après l'édition ; boîte neuve : un segment vide. */
  readonly spans: readonly TextSpan[];
  /** Fond opaque de la zone (cellule de tableau, C10a HC10-10) ; absent : transparent. */
  readonly background?: string;
  /** D15 : alignement de la zone (case de tableau) ; absent : gauche. */
  readonly align?: TextAlign;
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
    if (s.id === null && content === "") return;
    // R6 : texte et segments inchangés : aucune commande ; mise en forme seule (S6) : la commande part.
    if (s.id !== null && content === s.initial && sameSpans(spans, s.spans)) return;
    const look = s.id === null ? currentLook() : undefined;
    const boxWidth = s.lodged === true ? (fittedTextWidth({ spans, size: s.size, boxWidth: s.boxWidth }, measure) ?? s.boxWidth) : s.boxWidth;
    const boxHeight = richBoxHeight(layoutRich(spans, { size: s.size }, boxWidth, measure));
    ctx.run({ type: "SetText", page: s.page, id: s.id, x: s.matrix[4], y: s.matrix[5], content, color: s.color, size: s.size, boxWidth, boxHeight, spans, ...(s.id === null && look ? { look } : {}) });
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
        // OG79 : la boîte d'un texte logé a été réduite à sa ligne ; l'édition reprend la largeur d'un clic.
        boxWidth: el.cell === undefined ? el.text.boxWidth : Math.max(el.text.boxWidth, DEFAULT_TEXT_BOX_WIDTH),
        ...(el.cell === undefined ? {} : { lodged: true }),
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

  return {
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
