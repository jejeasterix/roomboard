import type { Engine } from "../engine/engine";
import type { DroppedFile, Point } from "../platform/files";
import type { FileCommand } from "../platform/controller";
import { isKnownTool, TOOL_TABLE, type Profile, type StartMode } from "../toolbar";

/** U15 : ce que la barre sait du reste ; implémentation locale par appels directs. */
export interface ToolbarHost {
  setTool(tool: string, preset?: string): void;
  runAction(id: string): void;
  dropFiles(files: readonly DroppedFile[], at?: Point | null): void;
  setMode(mode: StartMode): void;
}
export interface HostTargets {
  engine(): Pick<Engine, "setTool" | "setEraserMode" | "state" | "undo" | "redo" | "addPage" | "removePage" | "nextPage" | "prevPage" | "fitPage" | "setPenStyle">;
  runFile(cmd: FileCommand): void;
  importFiles(files: readonly DroppedFile[], at?: Point | null): void;
  toggle(panel: "settings" | "profiles"): void;
}

const file = (cmd: FileCommand) => (t: HostTargets): void => t.runFile(cmd);

export const ACTIONS: Readonly<Record<string, (t: HostTargets) => void>> = {
  undo: (t) => t.engine().undo(),
  redo: (t) => t.engine().redo(),
  "page-prev": (t) => void t.engine().prevPage(),
  "page-next": (t) => void t.engine().nextPage(),
  "page-add": (t) => void t.engine().addPage(),
  "page-remove": (t) => void t.engine().removePage(),
  "fit-page": (t) => t.engine().fitPage(),
  "eraser-mode": (t) => t.engine().setEraserMode(t.engine().state().eraserMode === "partial" ? "object" : "partial"),
  "file-new": file("new"),
  "file-open": file("open"),
  "file-save": file("save"),
  "file-save-as": file("saveAs"),
  settings: (t) => t.toggle("settings"),
  profiles: (t) => t.toggle("profiles"),
};

export function createLocalToolbarHost(t: HostTargets, profile: () => Profile): ToolbarHost {
  return {
    setTool(tool, preset) {
      if (!isKnownTool(tool)) return;
      if (preset !== undefined) {
        const p = (Object.hasOwn(profile().presets, tool) ? profile().presets[tool] : undefined)?.find((x) => x.id === preset);
        if (p?.color !== undefined && p.width !== undefined) t.engine().setPenStyle({ color: p.color, width: p.width });
      }
      t.engine().setTool(TOOL_TABLE[tool]!.choice);
    },
    runAction(id) {
      if (Object.hasOwn(ACTIONS, id)) ACTIONS[id]!(t);
    },
    dropFiles: (files, at) => t.importFiles(files, at),
    setMode(mode) {
      console.warn(`mode de démarrage non livré au lot 5b : ${mode}`);
    },
  };
}
