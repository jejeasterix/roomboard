/**
 * Outil Texte (D14, CL4-2 à CL4-6) : un clic ouvre une boîte (nouvelle, ou le texte touché, masqué de la scène pendant
 * l'édition) ; la saisie se fait dans la zone de la page (hôte injecté : `app/text-editor.ts`) ; une seule SetText à la
 * validation, hauteur mesurée par `layoutRich` sur les segments prévus après l'édition (C7, T11). Composition IME (CL4-3) : toute demande de validation attend
 * `compositionend` ; rien n'est écrit pendant la composition. Clic pendant l'édition : valide seulement.
 */
import type { Matrix, TextSpan } from "../../core/api";
import { editSpans, plainSpans } from "../../core/rich-text";
import { screenToWorld, type Camera } from "../camera";
import { DEFAULT_TEXT_BOX_WIDTH, layoutRich, richBoxHeight, type Measure } from "../text-layout";
import { NO_LIVE, type GestureTool, type LivePart, type ToolContext } from "./tool";

export const TEXT_HIT_TOL_PX = 6;

export interface TextStyle {
  readonly color: string;
  readonly size: number;
}

export interface TextEditSession {
  readonly page: string;
  /** null : nouvelle boîte. */
  readonly id: string | null;
  /** Matrice monde de la boîte (translation pour une boîte neuve). */
  readonly matrix: Matrix;
  readonly boxWidth: number;
  readonly color: string;
  readonly size: number;
  readonly initial: string;
  /** Segments à l'ouverture (C7, T11) : la hauteur prévoit ceux d'après l'édition ; boîte neuve : un segment vide. */
  readonly spans: readonly TextSpan[];
}

/** Zone de saisie de la page (DOM, T56) : le moteur n'en connaît que ceci. */
export interface TextEditorHost {
  open(session: TextEditSession, camera: Camera): void;
  close(): void;
  value(): string;
}

export interface TextTool extends GestureTool {
  editing(): TextEditSession | null;
  composing(): boolean;
  compositionStart(): void;
  compositionEnd(): void;
  /** Échap, clic ailleurs, perte du focus, outil ou page quittés : valide, ou attend la fin de la composition. */
  requestCommit(): void;
}

export function createTextTool(ctx: ToolContext, host: TextEditorHost, style: () => TextStyle, measure: Measure): TextTool {
  let session: TextEditSession | null = null;
  let composing = false;
  /** Validation demandée pendant la composition : jouée à `compositionend`. */
  let pending = false;
  let live: LivePart = NO_LIVE;

  /** Écrit la boîte ouverte (une SetText au plus) ; la session est fermée avant `host.close()` (blur réentrant sans effet). */
  const commit = (): void => {
    const s = session;
    if (!s) return;
    const content = host.value();
    const hadHidden = live.hidden.size > 0;
    session = null;
    pending = false;
    composing = false;
    live = NO_LIVE;
    host.close();
    // La boucle est arrêtée (outil inactif) : sans image, l'id masqué resterait invisible jusqu'au geste suivant.
    if (hadHidden) ctx.requestFrame?.();
    if (s.id === null && content === "") return;
    if (s.id !== null && content === s.initial) return;
    const boxHeight = richBoxHeight(layoutRich(editSpans(s.spans, content), { size: s.size }, s.boxWidth, measure));
    ctx.run({
      type: "SetText",
      page: s.page,
      id: s.id,
      x: s.matrix[4],
      y: s.matrix[5],
      content,
      color: s.color,
      size: s.size,
      boxWidth: s.boxWidth,
      boxHeight,
    });
  };

  /**
   * Seule porte de validation. Même règle que `engine/input/keys.ts:27` (« composition IME : la touche appartient à
   * l'IME », D14), appliquée aux demandes de validation : pendant la composition, la demande est différée.
   */
  const requestCommit = (): void => {
    if (!session) return;
    if (composing) {
      pending = true;
      return;
    }
    commit();
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
      session = { page, id: null, matrix: [1, 0, 0, 1, x, y], boxWidth: DEFAULT_TEXT_BOX_WIDTH, color: st.color, size: st.size, initial: "", spans: plainSpans("") };
      live = NO_LIVE;
    }
    composing = false;
    pending = false;
    host.open(session, cam);
  };

  return {
    begin(_pointerId, samples) {
      const s = samples[0];
      if (!s) return;
      if (session) {
        requestCommit();
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
      requestCommit();
    },
    editing: () => session,
    composing: () => composing,
    compositionStart() {
      if (session) composing = true;
    },
    compositionEnd() {
      composing = false;
      if (pending) commit();
    },
    requestCommit,
  };
}
