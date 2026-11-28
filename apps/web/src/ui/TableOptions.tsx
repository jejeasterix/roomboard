/**
 * Options du tableau (personnalisation-3, D26, DA5, DS10) : corps des sections `table*` de l'accordéon d'OG23. Chaque
 * bouton est un geste, une commande, une étape (G7) : la plage (sinon la zone) de la case active reçoit le réglage par
 * l'hôte (`Engine.tableAction`, `Engine.tableLook`) ; ce fichier n'écrit rien lui-même. Boutons à la taille du profil
 * (`--rb-btn-size`), icônes Lucide ; chaque geste montre son raccourci (infobulle) et l'annonce (`aria-keyshortcuts`).
 */
import { For, type Accessor, type JSX } from "solid-js";
import type { BorderStyle, CellLook, HAlign, TableBorder, VAlign } from "../core/api";
import { TABLE_LINE_WIDTH, type TableAction, type TableCellState } from "../engine/table-geom";
import { Icon, IconButton } from "./IconButton";
import { RadioChoices, type RadioOption } from "./RadioChoices";
import { buttonShortcut } from "./shortcuts";
import { WIDTHS, type Pick } from "./tool-options";

export type TableSectionKey = "tableObjects" | "tableAlign" | "tableBorder" | "tableRows";
export interface TableOptionsHost {
  act(a: TableAction): void;
  look(l: CellLook): void;
}

const HA_OPTIONS: readonly RadioOption<HAlign>[] = [
  { value: "left", label: "À gauche", icon: "align-left" },
  { value: "center", label: "Centré", icon: "align-center" },
  { value: "right", label: "À droite", icon: "align-right" },
];
const VA_OPTIONS: readonly RadioOption<VAlign>[] = [
  { value: "top", label: "En haut", icon: "align-start-horizontal" },
  { value: "middle", label: "Au milieu", icon: "align-center-horizontal" },
  { value: "bottom", label: "En bas", icon: "align-end-horizontal" },
];
const STYLE_OPTIONS: readonly RadioOption<BorderStyle>[] = [
  { value: "solid", label: "Plein", icon: "stroke-solid" },
  { value: "dashed", label: "Tirets", icon: "stroke-dashed" },
  { value: "dotted", label: "Pointillés", icon: "stroke-dotted" },
  { value: "none", label: "Aucune bordure", icon: "ban", shortcut: buttonShortcut("table-border-none") },
];
const WIDTH_OPTIONS: readonly RadioOption<string>[] = WIDTHS.map((w) => ({
  value: w.value, label: w.label, icon: w.value === "2" ? "width-thin" : w.value === "4" ? "width-medium" : "width-thick",
}));
const FIT_OPTIONS: readonly RadioOption<"grow" | "shrink">[] = [
  { value: "grow", label: "Agrandir la case", shortcut: buttonShortcut("table-fit") },
  { value: "shrink", label: "Rétrécir l'objet", shortcut: buttonShortcut("table-fit") },
];

export function TableSection(props: {
  readonly section: TableSectionKey;
  readonly cell: Accessor<TableCellState | null>;
  readonly host: TableOptionsHost;
  readonly picks: Accessor<readonly Pick[]>;
}): JSX.Element {
  /** Bordure de départ : celle de la case active, sinon la 1re pastille, trait de la grille, plein. */
  const cur = (): TableBorder => props.cell()?.border ?? [props.picks()[0]?.color ?? "#000000", TABLE_LINE_WIDTH, "solid"];
  /** Une couleur ou une épaisseur choisie sous « Aucune bordure » repart en plein. */
  const styled = (s: BorderStyle): BorderStyle => (s === "none" ? "solid" : s);
  const border = (b: TableBorder): void => props.host.look({ key: "border", value: b });
  const fit = (): "grow" | "shrink" => (props.cell()?.fit === "shrink" ? "shrink" : "grow");
  const bodies: Readonly<Record<TableSectionKey, () => JSX.Element>> = {
    tableObjects: () => (
      <div class="rb-opt-stack">
        <RadioChoices keepFocus name="tableFit" label="Objets dans les cases" look="segment" options={FIT_OPTIONS} valueAttr="data-option-value"
          value={fit()} choose={(v) => { if (v !== fit()) props.host.act("fit-toggle"); }} />
        <IconButton keepFocus icon={null} label="Ajuster au contenu" shortcut={buttonShortcut("table-fit-content")}
          attrs={{ "data-table-option": "fit-content", class: "rb-opt-btn rb-opt-wide" }} onPress={() => props.host.act("fit-content")}>
          <Icon name="move-horizontal" />
          <span class="rb-opt-wide-label" aria-hidden="true">Ajuster au contenu</span>
        </IconButton>
      </div>
    ),
    tableAlign: () => (
      <>
        <RadioChoices keepFocus name="tableHa" label="Alignement horizontal" look="segment" options={HA_OPTIONS} valueAttr="data-option-value"
          shortcut={buttonShortcut("table-ha-next")} value={props.cell()?.ha ?? "left"} choose={(v) => props.host.look({ key: "ha", value: v })} />
        <RadioChoices keepFocus name="tableVa" label="Alignement vertical" look="segment" options={VA_OPTIONS} valueAttr="data-option-value"
          shortcut={buttonShortcut("table-va-next")} value={props.cell()?.va ?? "top"} choose={(v) => props.host.look({ key: "va", value: v })} />
      </>
    ),
    tableBorder: () => (
      <>
        <div class="rb-pick-row">
          <For each={props.picks().filter((p) => p.color !== null)}>
            {(p) => (
              <IconButton keepFocus icon={null} label={p.label} pressed={props.cell()?.border?.[0] === p.color} shortcut={buttonShortcut("table-border-set")}
                attrs={{ "data-table-border-color": p.color ?? "", class: "rb-pick" }}
                onPress={() => border([p.color ?? "#000000", cur()[1], styled(cur()[2])])}>
                <span class="rb-pick-dot" aria-hidden="true" style={{ background: p.color ?? "transparent" }} />
              </IconButton>
            )}
          </For>
        </div>
        <RadioChoices keepFocus name="tableBorderWidth" label="Épaisseur de la bordure" look="segment" options={WIDTH_OPTIONS} valueAttr="data-option-value"
          value={props.cell()?.border ? String(props.cell()!.border![1]) : null} choose={(w) => border([cur()[0], Number(w), styled(cur()[2])])} />
        <RadioChoices keepFocus name="tableBorderStyle" label="Style de la bordure" look="segment" options={STYLE_OPTIONS} valueAttr="data-option-value"
          value={props.cell()?.border?.[2] ?? null} choose={(s) => border([cur()[0], cur()[1], s])} />
        <IconButton keepFocus icon={null} label="Bordure par défaut" attrs={{ "data-table-border-default": "", class: "rb-opt-btn rb-opt-wide" }}
          onPress={() => props.host.look({ key: "border", value: null })}>
          <span class="rb-opt-wide-label" aria-hidden="true">Par défaut</span>
        </IconButton>
      </>
    ),
    tableRows: () => (
      <div class="rb-pick-row">
        <IconButton keepFocus icon="rows-2" label="En-tête" shortcut={buttonShortcut("table-header")}
          attrs={{ "data-table-option": "header", class: "rb-opt-btn", role: "switch", "aria-checked": String(props.cell()?.header === true) }}
          onPress={() => props.host.act("header-toggle")} />
      </div>
    ),
  };
  return bodies[props.section]();
}
