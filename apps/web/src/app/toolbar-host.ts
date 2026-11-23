import type { FormatAction } from "../engine/rich-edit";
import type { Engine } from "../engine/engine";
import type { DroppedFile, Point } from "../platform/files";
import type { FileCommand } from "../platform/controller";
import type { AnnotationControl } from "../platform/annotation-port";
import { messageOf } from "../platform/controller";
import { fillChoices, isKnownTool, presetsOf, TOOL_TABLE, type Profile, type StartMode } from "../toolbar";

export type SelectionAction = "group" | "ungroup" | "copy" | "paste" | "export";

/** U15 : ce que la barre sait du reste ; implémentation locale par appels directs. */
export interface ToolbarHost {
  setTool(tool: string, preset?: string): void;
  runAction(id: string): void;
  dropFiles(files: readonly DroppedFile[], at?: Point | null): void;
  setMode(mode: StartMode): void;
  /** Pastille de remplissage de la rangée du tableau (C10a, T12) ; null retire. */
  tableFill(fill: string | null): void;
  /** « Aucune » de la rangée du pot (C6a, PC6) : null retire ; ne change ni l'outil ni le stylo. */
  fillColor(color: string | null): void;
  /** Curseur de tolérance de la rangée du pot (C6b, B10) : relayé au moteur ; ne change pas l'outil. */
  fillTolerance(t: number): void;
  /** Bouton de la rangée Format (C7b, R13) : relayé au moteur, puis à l'outil actif. */
  textFormat(a: FormatAction): void;
  /** C3 (Z13) : bouton de la rangée Sélection. */
  selection(a: SelectionAction): void;
  /** C5 (I25) : bouton « Image » de la rangée Sélection : ouvre ou ferme le panneau de retouche. */
  imagePanel(): void;
}
export interface HostTargets {
  /** C11a (P6, P8, P15, P22) : contrôleur d'annotation ; absent (web sans faux hôte, tests) : sans effet (PC9). */
  annotation?: Pick<AnnotationControl, "state" | "enter" | "exit" | "toggle" | "nextScreen">;
  engine(): Pick<Engine, "setTool" | "setEraserMode" | "state" | "undo" | "redo" | "addPage" | "removePage" | "nextPage" | "prevPage" | "fitPage" | "setPenStyle" | "setFillColor" | "setFillTolerance" | "tableAction" | "tableFill" | "textFormat">;
  runFile(cmd: FileCommand): void;
  importFiles(files: readonly DroppedFile[], at?: Point | null): void;
  toggle(panel: "settings" | "profiles" | "grid" | "image" | "library"): void;
  /** C3 (Z12). */
  insertPages(): void;
  /** C12 (PF19) : « Exporter en PDF… » ; absent (hôte partiel) : sans effet (PC9). */
  exportPdf?(): void;
  /** C13 (D17) : « Enregistrer une copie au format .iwb… » ou « … .ubz… » ; absent (hôte partiel) : sans effet. */
  exportBoard?(format: "iwb" | "ubz"): void;
  /** C16 (O19) : « Modifier dans l'application d'origine » ; absent (hôte partiel) : sans effet. */
  editOriginal?(): void;
  /** C3 (Z13). */
  selection(a: SelectionAction): void;
}

/** Une transition d'annotation refusée ne doit jamais devenir un rejet non géré (le contrôleur dit l'échec par `say`). */
function settle(p: Promise<void> | undefined): void {
  p?.catch((e: unknown) => {
    console.warn(`RoomBoard : annotation non réalisée (${messageOf(e)})`);
  });
}

const file = (cmd: FileCommand) => (t: HostTargets): void => t.runFile(cmd);

export const ACTIONS: Readonly<Record<string, (t: HostTargets) => void>> = {
  "desktop-annotation": (t) => {
    const a = t.annotation;
    if (a !== undefined) settle(a.state().active ? a.exit() : a.enter());
  },
  "annotation-pointer": (t) => settle(t.annotation?.toggle()),
  "annotation-screen": (t) => settle(t.annotation?.nextScreen()),
  undo: (t) => t.engine().undo(),
  redo: (t) => t.engine().redo(),
  "page-prev": (t) => void t.engine().prevPage(),
  "page-next": (t) => void t.engine().nextPage(),
  "page-add": (t) => void t.engine().addPage(),
  "page-remove": (t) => void t.engine().removePage(),
  "page-insert-file": (t) => t.insertPages(),
  "edit-original": (t) => t.editOriginal?.(),
  "export-pdf": (t) => t.exportPdf?.(),
  "export-iwb": (t) => t.exportBoard?.("iwb"),
  "export-ubz": (t) => t.exportBoard?.("ubz"),
  "fit-page": (t) => t.engine().fitPage(),
  "eraser-mode": (t) => t.engine().setEraserMode(t.engine().state().eraserMode === "partial" ? "object" : "partial"),
  "file-new": file("new"),
  "file-open": file("open"),
  "file-import": file("import"),
  "file-save": file("save"),
  "file-save-as": file("saveAs"),
  settings: (t) => t.toggle("settings"),
  profiles: (t) => t.toggle("profiles"),
  grid: (t) => t.toggle("grid"),
  library: (t) => t.toggle("library"),
  "table-row-insert": (t) => t.engine().tableAction("row-insert"),
  "table-col-insert": (t) => t.engine().tableAction("col-insert"),
  "table-row-remove": (t) => t.engine().tableAction("row-remove"),
  "table-col-remove": (t) => t.engine().tableAction("col-remove"),
  "table-uniform": (t) => t.engine().tableAction("uniform"),
  "table-merge": (t) => t.engine().tableAction("merge"),
  "table-split": (t) => t.engine().tableAction("split"),
  "table-shade": (t) => t.engine().tableAction("shade"),
  "table-unshade": (t) => t.engine().tableAction("unshade"),
};

export function createLocalToolbarHost(t: HostTargets, profile: () => Profile): ToolbarHost {
  return {
    setTool(tool, preset) {
      if (!isKnownTool(tool)) return;
      if (preset !== undefined && tool === "fill") {
        // PC6 : le pot a sa couleur, jamais le style du stylo.
        const c = fillChoices(profile().presets).find((x) => x.id === preset);
        if (c !== undefined) t.engine().setFillColor(c.color);
      } else if (preset !== undefined) {
        const p = presetsOf(profile().presets, tool).find((x) => x.id === preset);
        if (p?.color !== undefined && p.width !== undefined) t.engine().setPenStyle({ color: p.color, width: p.width });
      }
      t.engine().setTool(TOOL_TABLE[tool]!.choice);
    },
    runAction(id) {
      if (Object.hasOwn(ACTIONS, id)) ACTIONS[id]!(t);
    },
    dropFiles: (files, at) => t.importFiles(files, at),
    fillColor: (color) => t.engine().setFillColor(color),
    fillTolerance: (v) => t.engine().setFillTolerance(v),
    tableFill: (fill) => t.engine().tableFill(fill),
    textFormat: (a) => t.engine().textFormat(a),
    selection: (a) => t.selection(a),
    imagePanel: () => t.toggle("image"),
    setMode(mode) {
      // U14, P22 : « Annotation du bureau » entre en annotation ; sans contrôleur, rien (repli silencieux sur le tableau).
      if (mode === "desktop-annotation") settle(t.annotation?.enter());
    },
  };
}
