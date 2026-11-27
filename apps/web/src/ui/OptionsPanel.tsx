/**
 * Panneau d'options de l'outil (OG11, T10) : îlot à gauche, sections dans l'ordre d'Excalidraw (Trait, Arrière-plan,
 * Largeur, Style du trait, Style de tracé, Angles, Transparence, Actions), valeurs mixtes sans choix enfoncé. Visuel
 * RoomBoard : îlot, jetons `--rf-*`, icônes de `icons.ts`. Cibles = taille du profil (`--rb-btn-size`), pointeur d'abord.
 * Comportement copié d'Excalidraw (packages/excalidraw/components/Actions.tsx), Copyright (c) 2020 Excalidraw, licence MIT.
 */
import { For, Show, createEffect, createMemo, createSignal, on, onCleanup, onMount, type Accessor, type JSX } from "solid-js";
import type { ElementView } from "../core/api";
import { opacityOf, roughnessOf, roundnessOf, strokeKindOf, type StrokeKind } from "../core/look";
import type { DeviceSettings } from "../device-settings";
import type { Engine, EngineState } from "../engine/engine";
import { DEFAULT_ITEM_STYLE, type ItemStyle } from "../engine/item-style";
import type { ButtonSize, Profile } from "../toolbar";
import { observeBox } from "./Island";
import { IconButton, TipBubble, tipPointerHandlers } from "./IconButton";
import { createTip } from "./tooltip";
import { BUTTON_PX, placeOptions, topRowBottom, type Box } from "./island-place";
import { RadioChoices, type RadioOption } from "./RadioChoices";
import {
  WIDTHS, appliesTo, backgroundPicks, formValue, sectionsFor, showsPanel, strokePicks, type OptionKey, type Pick,
} from "./tool-options";

export interface OptionsPanelProps {
  readonly engine: Accessor<Engine>;
  readonly state: Accessor<EngineState>;
  /** Élément du document par id (le moteur n'expose pas le document) ; absent ou illisible : null. */
  readonly element: (id: string) => ElementView | null;
  readonly presets: Accessor<Profile["presets"]>;
  readonly size: Accessor<ButtonSize>;
  readonly profileId: Accessor<string>;
  readonly settings: DeviceSettings;
  readonly annotating: Accessor<boolean>;
  /** null tant qu'OG4 n'a pas de barre latérale. */
  readonly sideStart: Accessor<Box | null>;
}

const LABEL: Readonly<Record<OptionKey, string>> = {
  strokeColor: "Trait",
  background: "Arrière-plan",
  strokeWidth: "Largeur du contour",
  strokeStyle: "Style du trait",
  roughness: "Style de tracé",
  roundness: "Angles",
  opacity: "Transparence",
  actions: "Actions",
};
const STROKES: readonly RadioOption<StrokeKind>[] = [
  { value: "solid", label: "Plein", icon: "stroke-solid" },
  { value: "dashed", label: "Tirets", icon: "stroke-dashed" },
  { value: "dotted", label: "Pointillés", icon: "stroke-dotted" },
];
const ROUGH: readonly RadioOption<"0" | "1" | "2">[] = [
  { value: "0", label: "Architecte", icon: "sloppiness-0" },
  { value: "1", label: "Artiste", icon: "sloppiness-1" },
  { value: "2", label: "Caricaturiste", icon: "sloppiness-2" },
];
const CORNERS: readonly RadioOption<"sharp" | "round">[] = [
  { value: "sharp", label: "Droits", icon: "corner-sharp" },
  { value: "round", label: "Angles arrondis", icon: "corner-round" },
];
const WIDTH_OPTIONS: readonly RadioOption<"2" | "4" | "8">[] = WIDTHS.map((w) => ({ value: w.value, label: w.label }));
/** Largeur du panneau : 5 cibles, 4 écarts de 4, 2 marges de 12. */
const widthOf = (btn: number): number => 5 * btn + 4 * 4 + 2 * 12;

/** Une saisie de texte ouverte garde son focus : le bouton ne le prend jamais (comme FormatRow). */
const keep = (e: Event): void => e.preventDefault();

export function OptionsPanel(props: OptionsPanelProps): JSX.Element {
  const targets = createMemo(() =>
    props.state().selection.map((id) => props.element(id)).filter((e): e is ElementView => e !== null));
  const keys = createMemo((): readonly OptionKey[] =>
    showsPanel(props.state().tool, props.state().selection.length, props.annotating())
      ? sectionsFor(props.state().tool, targets(), false)
      : []);
  const saved = (): boolean => props.settings.island(props.profileId(), "options").collapsed === true;
  // Signal local (les réglages d'appareil ne notifient pas), relu du réglage à chaque profil.
  const [collapsed, setCollapsed] = createSignal(saved());
  createEffect(on(props.profileId, () => setCollapsed(saved()), { defer: true }));
  const toggle = (): void => {
    const next = !collapsed();
    props.settings.setIsland(props.profileId(), "options", { at: null, collapsed: next });
    setCollapsed(next);
  };
  const cur = (): ItemStyle => props.state().itemStyle ?? DEFAULT_ITEM_STYLE;
  const write = (patch: Partial<ItemStyle>): void => props.engine().setItemStyle(patch);
  const btn = (): number => BUTTON_PX[props.size()];

  const readers: Readonly<Record<string, (e: ElementView) => unknown>> = {
    strokeColor: (e) => ("style" in e ? e.style.color : undefined),
    background: (e) => (e.kind === "shape" ? e.shape.fill ?? null : undefined),
    strokeWidth: (e) => ("style" in e ? e.style.width : undefined),
    strokeStyle: (e) => strokeKindOf(e.look),
    roughness: (e) => roughnessOf(e.look),
    roundness: (e) => roundnessOf(e.look),
    opacity: (e) => opacityOf(e.look),
  };
  const fallbacks: Readonly<Record<string, (s: ItemStyle) => unknown>> = {
    strokeColor: (s) => s.color,
    background: (s) => s.background,
    strokeWidth: (s) => s.width,
    strokeStyle: (s) => s.strokeStyle,
    roughness: (s) => s.roughness,
    roundness: (s) => s.roundness,
    opacity: (s) => s.opacity,
  };
  const fallback = (k: OptionKey): unknown => fallbacks[k]?.(cur());
  /** Valeur commune des cibles, ou null quand elles diffèrent ; sans cible, le style courant. */
  const value = (k: OptionKey): unknown => {
    const read = readers[k];
    if (read === undefined) return undefined;
    // Une cible à qui l'option ne s'applique pas (trait de stylo sans tirets, ligne sans fond) ne compte pas.
    const own = (e: ElementView): unknown => (appliesTo(k, e) ? read(e) : undefined);
    // Un `null` légitime (fond transparent) se lit comme `"transparent"` pour rester distinct de « mixte ».
    const tr = (v: unknown): unknown => (v === null ? "transparent" : v);
    return formValue(targets(), (e) => tr(own(e)) as never, tr(fallback(k)) as never);
  };
  const mixed = (k: OptionKey): boolean => readers[k] !== undefined && targets().length > 1 && value(k) === null;
  // Aire réelle : celle du parent positionné, mesurée comme `IslandLayer` ; non mesurée (h = 0) : aucune borne.
  const [area, setArea] = createSignal<Box>({ w: 0, h: 0 }, { equals: (a, b) => a.w === b.w && a.h === b.h });
  let root: HTMLElement | undefined;
  onMount(() => {
    const host = root?.offsetParent ?? root?.parentElement;
    if (host) onCleanup(observeBox(host, setArea, Math.floor));
  });
  const pos = (): { x: number; y: number } =>
    placeOptions(area().h > 0 ? area() : { w: 0, h: Number.MAX_SAFE_INTEGER }, props.sideStart(), topRowBottom(btn()));

  const swatch = (k: "strokeColor" | "background", pick: Pick, apply: () => void): JSX.Element => {
    const id = pick.color ?? "transparent";
    const tip = createTip();
    let button: HTMLButtonElement | undefined;
    return (
      <>
        <button
          ref={button}
          type="button"
          class="rb-pick"
          data-transparent={pick.color === null ? "" : undefined}
          data-option-value={id}
          aria-label={pick.label}
          aria-pressed={value(k) === id}
          {...tipPointerHandlers(tip)}
          onPointerDown={(e) => { keep(e); tip.down(e.pointerType); }}
          onMouseDown={keep}
          onClick={apply}
        >
          <span class="rb-pick-dot" style={pick.color !== null ? { background: pick.color } : undefined} />
        </button>
        <TipBubble tip={tip} label={pick.label} anchor={() => button!} />
      </>
    );
  };

  const colors = (k: "strokeColor" | "background", picks: Accessor<readonly Pick[]>, make: (c: string | null) => Partial<ItemStyle>): JSX.Element => (
    <div class="rb-pick-row"><For each={picks()}>{(p) => swatch(k, p, () => write(make(p.color)))}</For></div>
  );
  // Les corps ne lisent rien hors d'un getter de prop ou d'un memo : un `emit` du moteur ne les reconstruit pas,
  // le focus clavier reste dans la section.
  const strokeChoices = createMemo(() => strokePicks(props.presets(), props.state().tool));
  const widthValue = (): "2" | "4" | "8" | null => {
    const v = value("strokeWidth");
    return typeof v === "number" && [2, 4, 8].includes(v) ? (String(v) as "2" | "4" | "8") : null;
  };
  const roughValue = (): "0" | "1" | "2" | null => {
    const v = value("roughness");
    return typeof v === "number" ? (String(v) as "0" | "1" | "2") : null;
  };
  const opacityValue = (): number | null => {
    const v = value("opacity");
    return typeof v === "number" ? v : null;
  };
  const bodies: Readonly<Record<OptionKey, () => JSX.Element>> = {
    strokeColor: () => colors("strokeColor", strokeChoices, (c) => ({ color: c ?? "#000000" })),
    background: () => colors("background", backgroundPicks, (c) => ({ background: c })),
    strokeWidth: () => (
      <RadioChoices name="strokeWidth" label={LABEL.strokeWidth} look="segment" options={WIDTH_OPTIONS} valueAttr="data-option-value"
        value={widthValue()} choose={(w) => write({ width: Number(w) })} />
    ),
    strokeStyle: () => (
      <RadioChoices name="strokeStyle" label={LABEL.strokeStyle} look="segment" options={STROKES} valueAttr="data-option-value"
        value={(value("strokeStyle") as StrokeKind | null) ?? null} choose={(s) => write({ strokeStyle: s })} />
    ),
    roughness: () => (
      <RadioChoices name="roughness" label={LABEL.roughness} look="segment" options={ROUGH} valueAttr="data-option-value"
        value={roughValue()} choose={(r) => write({ roughness: Number(r) as 0 | 1 | 2 })} />
    ),
    roundness: () => (
      <RadioChoices name="roundness" label={LABEL.roundness} look="segment" options={CORNERS} valueAttr="data-option-value"
        value={(value("roundness") as "sharp" | "round" | null) ?? null} choose={(r) => write({ roundness: r })} />
    ),
    opacity: () => (
      <label class="rb-opacity">
        <input
          type="range"
          min="0"
          max="100"
          step="10"
          aria-label={LABEL.opacity}
          value={opacityValue() ?? cur().opacity}
          onChange={(e) => write({ opacity: Number(e.currentTarget.value) })}
        />
        <output>{opacityValue() !== null ? `${opacityValue()} %` : "Mixte"}</output>
      </label>
    ),
    actions: () => (
      <div class="rb-pick-row">
        <IconButton icon="copy-plus" label="Dupliquer" attrs={{ "data-option-value": "duplicate", class: "rb-opt-btn" }} onPress={() => void props.engine().duplicateSelection()} />
        <IconButton icon="trash-2" label="Supprimer" attrs={{ "data-option-value": "delete", class: "rb-opt-btn" }} onPress={() => void props.engine().deleteSelection()} />
      </div>
    ),
  };
  const body = (k: OptionKey): JSX.Element => bodies[k]();

  return (
    <Show when={keys().length > 0}>
      <aside
        ref={root}
        class="rb-island rb-options"
        data-options
        data-collapsed={collapsed() ? "" : undefined}
        aria-label="Options de l'outil"
        style={{ left: `${pos().x}px`, top: `${pos().y}px`, "--rb-btn-size": `${btn()}px`, ...(collapsed() ? {} : { width: `${widthOf(btn())}px` }) }}
      >
        <IconButton
          icon={collapsed() ? "sliders-horizontal" : "chevron-left"}
          label={collapsed() ? "Options de l'outil" : "Replier les options"}
          attrs={{ "data-options-toggle": "", class: "rb-opt-btn", "aria-expanded": String(!collapsed()) }}
          onPress={toggle}
        />
        <Show when={!collapsed()}>
          <For each={keys()}>
            {(k) => (
              <section class="rb-options-sec" data-option={k} data-mixed={mixed(k) ? "" : undefined}>
                <h3>{LABEL[k]}</h3>
                {body(k)}
              </section>
            )}
          </For>
        </Show>
      </aside>
    </Show>
  );
}
