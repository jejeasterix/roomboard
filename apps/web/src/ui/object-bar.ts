/** Barre d'objet (OG41, D19) : actions, ordre et règle « montrée » (seuls les boutons utiles, aucun grisé), déplacées de
 *  `SelectionRow.tsx` (`DISABLED`). Tables de prédicats, jamais de `switch` (garde de src/ui). Recalée sur le menu de
 *  sélection de MyViewBoard : principales, puis « … » pour les calques et l'export. */
import type { SelectionAction, ToolbarHost } from "../app/toolbar-host";
import type { ToolbarView } from "./item-state";

export type ObjectActionId = SelectionAction | "image" | "layer-front" | "layer-back";
export interface ObjectAction {
  readonly id: ObjectActionId;
  readonly label: string;
  /** Icône de `ICONS` (Lucide). */
  readonly icon: string;
  /** Id de `SHORTCUTS` montré dans l'infobulle ; null sans raccourci. */
  readonly shortcut: string | null;
  /** Dans le menu « … ». */
  readonly more: boolean;
}
const a = (id: ObjectActionId, label: string, icon: string, shortcut: string | null, more = false): ObjectAction => Object.freeze({ id, label, icon, shortcut, more });
export const OBJECT_ACTIONS: readonly ObjectAction[] = Object.freeze([
  a("duplicate", "Dupliquer", "copy-plus", "duplicate"),
  a("copy", "Copier", "copy", "copy"),
  a("paste", "Coller", "clipboard-paste", "paste"),
  a("group", "Grouper", "group", "group"),
  a("ungroup", "Dégrouper", "ungroup", "ungroup"),
  a("image", "Image", "image", null),
  a("delete", "Supprimer", "trash-2", "delete"),
  a("layer-front", "Premier plan", "bring-to-front", "front", true),
  a("layer-back", "Arrière-plan", "send-to-back", "back", true),
  a("export", "Exporter la sélection", "export", null, true),
]);

const some = (v: ToolbarView): boolean => (v.selection?.length ?? 0) > 0;
const SHOWN: Readonly<Record<ObjectActionId, (v: ToolbarView) => boolean>> = {
  duplicate: some,
  copy: some,
  paste: (v) => some(v) && v.canPaste === true,
  group: (v) => some(v) && (v.selectionUnits ?? 0) >= 2,
  ungroup: (v) => some(v) && v.selectionGrouped === true,
  image: (v) => some(v) && !!v.selectionImage,
  delete: some,
  "layer-front": some,
  "layer-back": some,
  export: some,
};
export function objectActionShown(id: ObjectActionId, v: ToolbarView): boolean {
  return SHOWN[id](v);
}

type Host = Pick<ToolbarHost, "selection" | "runAction" | "imagePanel">;
const PLAY: Readonly<Record<ObjectActionId, (h: Host) => void>> = {
  duplicate: (h) => h.selection("duplicate"),
  copy: (h) => h.selection("copy"),
  paste: (h) => h.selection("paste"),
  group: (h) => h.selection("group"),
  ungroup: (h) => h.selection("ungroup"),
  delete: (h) => h.selection("delete"),
  export: (h) => h.selection("export"),
  image: (h) => h.imagePanel(),
  "layer-front": (h) => h.runAction("layer-front"),
  "layer-back": (h) => h.runAction("layer-back"),
};
export function playObjectAction(id: ObjectActionId, host: Host): void {
  PLAY[id](host);
}
