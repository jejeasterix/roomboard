/**
 * Panneau d'options de l'outil (OG11, T10) : îlot à gauche, sections dans l'ordre d'Excalidraw (Trait, Arrière-plan,
 * Largeur, Style du trait, Style de tracé, Angles, Transparence, Actions), valeurs mixtes sans choix enfoncé. Visuel
 * RoomBoard : îlot, jetons `--rf-*`, icônes de `icons.ts`. Cibles = taille du profil (`--rb-btn-size`), pointeur d'abord.
 * Comportement copié d'Excalidraw (packages/excalidraw/components/Actions.tsx), Copyright (c) 2020 Excalidraw, licence MIT.
 */
import { For, Show, createEffect, createMemo, createSignal, on, onCleanup, onMount, type Accessor, type JSX } from "solid-js";
import type { Command, ElementView, TextAttrsPatch } from "../core/api";
import {
  endArrowheadOf, fillStyleOf, opacityOf, roughnessOf, roundnessOf, startArrowheadOf, strokeKindOf, textAlignOf,
  elbowedOf, type Arrowhead, type FillKind, type StrokeKind, type TextAlign,
} from "../core/look";
import { isPointsShape, isSegment } from "../core/shapes";
import type { DeviceSettings } from "../device-settings";
import type { Engine, EngineState } from "../engine/engine";
import { DEFAULT_ITEM_STYLE, type ArrowType, type ItemStyle } from "../engine/item-style";
import type { ButtonSize, Profile } from "../toolbar";
import { observeBox } from "./Island";
import { objectKey, type KeyLike } from "../engine/input/keys";
import { ColorPicker } from "./ColorPicker";
import { LinkPopover } from "./LinkPopover";
import { Icon, IconButton, TipBubble, tipPointerHandlers } from "./IconButton";
import { createTip } from "./tooltip";
import { BUTTON_PX, optionsWidth, placeLinkAvoiding, placeOptions, topRowBottom, type Box, type Rect } from "./island-place";
import { RadioChoices, type RadioOption } from "./RadioChoices";
import {
  FONTS, TEXT_SIZES, WIDTHS, appliesTo, backgroundPicks, disabledIn, formValue, sectionsFor, showsPanel, strokePicks, type OptionKey, type Pick,
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
  /** Rectangle posé de l'îlot latéral de début (barre latérale d'OG4), px de la zone ; null : aucun. */
  readonly sideStart: Accessor<Rect | null>;
  /** Îlots qui surplombent le panneau (îlot d'outils descendu) ; absent : aucun. */
  readonly above?: Accessor<readonly Rect[]>;
  /** T33, T34 : vrai quand un panneau passager (Aide, Grille, Réglages, Profils, Image, Bibliothèque, Fonds) est ouvert : le panneau d'options se retire plutôt que de dépasser. */
  readonly hidden?: Accessor<boolean>;
  /** T39 : ouverture sûre d'un lien (`ShellPort.openLink`), pour « Ouvrir le lien » de l'éditeur de lien. */
  readonly openLink?: (url: string) => void;
}

const LABEL: Readonly<Record<OptionKey, string>> = {
  strokeColor: "Trait",
  background: "Arrière-plan",
  fillStyle: "Remplissage",
  strokeWidth: "Largeur du contour",
  strokeStyle: "Style du trait",
  roughness: "Style de tracé",
  roundness: "Angles",
  font: "Police",
  fontSize: "Taille",
  textAlign: "Alignement du texte",
  arrowType: "Type de flèche",
  arrowheads: "Pointes",
  opacity: "Transparence",
  layers: "Disposition",
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
const FILLS: readonly RadioOption<FillKind>[] = [
  { value: "solid", label: "Plein", icon: "fill-solid" },
  { value: "hachure", label: "Hachures", icon: "fill-hachure" },
  { value: "cross-hatch", label: "Croisillons", icon: "fill-cross" },
];
const ALIGNS: readonly RadioOption<TextAlign>[] = [
  { value: "left", label: "À gauche", icon: "align-left" },
  { value: "center", label: "Centré", icon: "align-center" },
  { value: "right", label: "À droite", icon: "align-right" },
];
const HEADS: readonly RadioOption<Arrowhead>[] = [
  { value: "none", label: "Aucune", icon: "head-none" },
  { value: "arrow", label: "Flèche", icon: "head-arrow" },
  { value: "triangle", label: "Triangle", icon: "head-triangle" },
  { value: "triangle_outline", label: "Triangle creux", icon: "head-triangle-outline" },
  { value: "bar", label: "Barre", icon: "head-bar" },
  { value: "circle", label: "Rond", icon: "head-circle" },
  { value: "circle_outline", label: "Rond creux", icon: "head-circle-outline" },
];
const ARROW_TYPES: readonly RadioOption<ArrowType>[] = [
  { value: "sharp", label: "Droite", icon: "arrow-type-sharp" },
  { value: "round", label: "Courbe", icon: "arrow-type-round" },
  { value: "elbow", label: "Coudée", icon: "arrow-type-elbow" },
];
const FONT_OPTIONS: readonly RadioOption<string>[] = FONTS.map((f) => ({ value: f.value, label: f.label }));
const SIZE_OPTIONS: readonly RadioOption<string>[] = TEXT_SIZES.map((n) => ({ value: String(n), label: String(n) }));
const LAYERS = [
  // Les fonctions d'ordre d'OG4 (une `Restack` chacune, groupes entiers) et ses icônes Premier plan / Arrière-plan.
  { value: "front", label: "Premier plan", icon: "bring-to-front", act: (e: Engine) => e.bringToFront() },
  { value: "forward", label: "Avancer", icon: "chevron-up", act: (e: Engine) => e.reorder("up") },
  { value: "backward", label: "Reculer", icon: "chevron-down", act: (e: Engine) => e.reorder("down") },
  { value: "back", label: "Arrière-plan", icon: "send-to-back", act: (e: Engine) => e.sendToBack() },
] as const;
const WIDTH_OPTIONS: readonly RadioOption<"2" | "4" | "8">[] = WIDTHS.map((w) => ({ value: w.value, label: w.label }));

/** T18 : taille de l'éditeur de lien (largeur bornée à la zone ; hauteur avec la ligne d'erreur). */
const LINK_POP_W = 360;
const LINK_POP_H = 112;

/** Une saisie de texte ouverte garde son focus : le bouton ne le prend jamais (comme FormatRow). */
const keep = (e: Event): void => e.preventDefault();

export function OptionsPanel(props: OptionsPanelProps): JSX.Element {
  const targets = createMemo(() =>
    props.state().selection.map((id) => props.element(id)).filter((e): e is ElementView => e !== null));
  /** Saisie de texte ouverte (outil Texte ou Tableau) : la rangée Format gouverne police, taille et couleur. */
  const editing = (): boolean => props.state().textFormat != null;
  /** OG12 T11 et lot 2a : une ligne ou flèche non coudée, ou une forme convertible (n° 34), seule : cible de « Modifier les points ». */
  const lineTarget = (): boolean => {
    const t = targets();
    if (t.length !== 1 || t[0]!.kind !== "shape") return false;
    const s = t[0]!.shape;
    return (isSegment(s.shape) && !elbowedOf(t[0]!.look)) || isPointsShape(s.shape);
  };
  const off = (k: OptionKey): boolean => disabledIn(k, editing());
  const keys = createMemo((): readonly OptionKey[] =>
    props.hidden?.() !== true && showsPanel(props.state().tool, props.state().selection.length, props.annotating())
      ? sectionsFor(props.state().tool, targets(), editing(), (props.state().itemStyle ?? DEFAULT_ITEM_STYLE).background)
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

  /** Valeur commune des segments, ou un marqueur de mélange (jamais égal à une valeur d'option). */
  const common = <T,>(vs: readonly T[]): T | "mixed" => (vs.length > 0 && vs.every((v) => v === vs[0]) ? vs[0]! : ("mixed" as const));
  /** Clés lisibles : les options, plus les deux pointes (lues ensemble sous la section `arrowheads`). */
  type ReadKey = OptionKey | "startArrowhead" | "endArrowhead";
  const readers: Readonly<Partial<Record<ReadKey, (e: ElementView) => unknown>>> = {
    strokeColor: (e) => ("style" in e ? e.style.color : undefined),
    background: (e) => (e.kind === "shape" ? e.shape.fill ?? null : undefined),
    strokeWidth: (e) => ("style" in e ? e.style.width : undefined),
    strokeStyle: (e) => strokeKindOf(e.look),
    roughness: (e) => roughnessOf(e.look),
    roundness: (e) => roundnessOf(e.look),
    arrowType: (e) => (e.kind === "shape" && e.shape.shape === "arrow" ? (elbowedOf(e.look) ? "elbow" : roundnessOf(e.look) === "round" ? "round" : "sharp") : undefined),
    opacity: (e) => opacityOf(e.look),
    fillStyle: (e) => fillStyleOf(e.look),
    textAlign: (e) => textAlignOf(e.look),
    startArrowhead: (e) => startArrowheadOf(e.look),
    endArrowhead: (e) => endArrowheadOf(e.look),
    font: (e) => (e.kind === "text" ? common(e.text.spans.map((x) => x.attrs.font ?? "default")) : undefined),
    fontSize: (e) => (e.kind === "text" ? common(e.text.spans.map((x) => x.attrs.size ?? e.text.size)) : undefined),
  };
  const fallbacks: Readonly<Partial<Record<ReadKey, (s: ItemStyle) => unknown>>> = {
    strokeColor: (s) => s.color,
    background: (s) => s.background,
    strokeWidth: (s) => s.width,
    strokeStyle: (s) => s.strokeStyle,
    roughness: (s) => s.roughness,
    roundness: (s) => s.roundness,
    arrowType: (s) => s.arrowType,
    opacity: (s) => s.opacity,
    fillStyle: (s) => s.fillStyle,
    textAlign: (s) => s.textAlign,
    startArrowhead: (s) => s.startArrowhead,
    endArrowhead: (s) => s.endArrowhead,
    font: (s) => s.font,
    fontSize: (s) => s.fontSize,
  };
  const fallback = (k: ReadKey): unknown => fallbacks[k]?.(cur());
  /** Valeur commune des cibles, ou null quand elles diffèrent ; sans cible, le style courant. */
  function value(k: OptionKey): unknown;
  function value(k: "startArrowhead" | "endArrowhead", section: OptionKey): unknown;
  function value(k: ReadKey, section?: OptionKey): unknown {
    const sec: OptionKey = section ?? (k as OptionKey); // sans section, `k` en est une (surcharge 1)
    const read = readers[k];
    if (read === undefined) return undefined;
    // Une cible à qui l'option ne s'applique pas (trait de stylo sans tirets, ligne sans fond) ne compte pas.
    const own = (e: ElementView): unknown => (appliesTo(sec, e) ? read(e) : undefined);
    // Un `null` légitime (fond transparent) se lit comme `"transparent"` pour rester distinct de « mixte ».
    const tr = (v: unknown): unknown => (v === null ? "transparent" : v);
    return formValue(targets(), (e) => tr(own(e)) as never, tr(fallback(k)) as never);
  }
  const mixed = (k: OptionKey): boolean => readers[k] !== undefined && targets().length > 1 && value(k) === null;
  // Aire réelle : celle du parent positionné, mesurée comme `IslandLayer` ; non mesurée (h = 0) : aucune borne.
  const [area, setArea] = createSignal<Box>({ w: 0, h: 0 }, { equals: (a, b) => a.w === b.w && a.h === b.h });
  let root: HTMLElement | undefined;
  onMount(() => {
    const host = root?.offsetParent ?? root?.parentElement;
    if (host) onCleanup(observeBox(host, setArea, Math.floor));
  });
  const pos = (): { x: number; y: number } =>
    placeOptions(area().h > 0 ? area() : { w: 0, h: Number.MAX_SAFE_INTEGER }, props.sideStart(), topRowBottom(btn()), props.above?.() ?? [], optionsWidth(btn()));

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
          disabled={off(k)}
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

  /** T16 : sélecteur complet ouvert depuis le bouton « Autres couleurs » d'une section (S : Trait, G : Arrière-plan). */
  type ColorKey = "strokeColor" | "background";
  const [picker, setPicker] = createSignal<{ key: ColorKey; anchor: HTMLElement; x: number; y: number; minTop: number } | null>(null);
  const anchors: Partial<Record<ColorKey, HTMLButtonElement>> = {};
  /** Hauteur supposée du sélecteur avant sa première mesure : `popTop` la remplace par la hauteur réelle (`popH`). */
  const PICKER_GUESS_H = 440;
  const openPicker = (key: ColorKey): void => {
    const anchor = anchors[key];
    if (anchor === undefined || off(key)) return;
    const r = anchor.getBoundingClientRect();
    const h = typeof window === "undefined" ? 0 : window.innerHeight;
    // T33 (comme Excalidraw) : à droite du panneau d'options, jamais au-dessus de son haut (les îlots du haut restent libres).
    const pr = root?.getBoundingClientRect();
    const minTop = Math.max(8, Math.round(pr?.top ?? 0));
    setPicker({ key, anchor, x: Math.round((pr?.right ?? r.right) + 8), y: Math.max(minTop, Math.min(Math.round(r.top), h > 0 ? h - PICKER_GUESS_H : 8)), minTop });
  };
  // T31 : hauteur réelle du sélecteur posé (rb-color-pop), mesurée après chaque ouverture ; le haut est borné par elle.
  let pop: HTMLDivElement | undefined;
  const [popH, setPopH] = createSignal(0);
  createEffect(() => {
    picker();
    setPopH(pop?.offsetHeight ?? 0);
  });
  const winH = (): number => (typeof window === "undefined" ? 0 : window.innerHeight);
  const popTop = (y: number, minTop: number): number => (winH() > 0 && popH() > 0 ? Math.max(minTop, Math.min(Math.round(y), Math.round(winH() - popH() - 8))) : Math.round(y));
  const onObjectKey = (e: KeyboardEvent): void => {
    const hit = objectKey(e as unknown as KeyLike);
    if (hit !== "stroke-picker" && hit !== "fill-picker") return;
    if (!keys().includes(hit === "stroke-picker" ? "strokeColor" : "background")) return;
    e.preventDefault();
    openPicker(hit === "stroke-picker" ? "strokeColor" : "background");
  };
  onMount(() => {
    window.addEventListener("keydown", onObjectKey);
    onCleanup(() => window.removeEventListener("keydown", onObjectKey));
  });
  // Section retirée ou panneau replié : le sélecteur ouvert n'a plus de bouton d'origine.
  createEffect(() => {
    const p = picker();
    if (p !== null && (!keys().includes(p.key) || collapsed())) setPicker(null);
  });
  const moreColors = (k: ColorKey): JSX.Element => {
    const tip = createTip();
    return (
      <>
        <button
          ref={(el) => { anchors[k] = el; }}
          type="button"
          class="rb-pick-more"
          data-more-colors={k}
          aria-label="Autres couleurs"
          aria-haspopup="dialog"
          aria-expanded={picker()?.key === k}
          disabled={off(k)}
          {...tipPointerHandlers(tip)}
          onPointerDown={(e) => { keep(e); tip.down(e.pointerType); }}
          onMouseDown={keep}
          onClick={() => (picker()?.key === k ? setPicker(null) : openPicker(k))}
        >
          <Icon name="plus" />
        </button>
        <TipBubble tip={tip} label="Autres couleurs" anchor={() => anchors[k]!} />
      </>
    );
  };
  const colors = (k: ColorKey, picks: Accessor<readonly Pick[]>, make: (c: string | null) => Partial<ItemStyle>): JSX.Element => (
    <div class="rb-pick-row"><For each={picks()}>{(p) => swatch(k, p, () => write(make(p.color)))}</For>{moreColors(k)}</div>
  );
  const chooseFull = (c: string): void => {
    const p = picker();
    if (p === null) return;
    write(p.key === "strokeColor" ? { color: c } : { background: c });
    setPicker(null);
    p.anchor.focus();
  };
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
    fillStyle: () => (
      <RadioChoices keepFocus name="fillStyle" label={LABEL.fillStyle} look="segment" options={FILLS} valueAttr="data-option-value"
        value={(value("fillStyle") as FillKind | null) ?? null} choose={(f) => write({ fillStyle: f })} />
    ),
    font: () => (
      <RadioChoices keepFocus name="font" label={LABEL.font} look="segment" options={FONT_OPTIONS} valueAttr="data-option-value" disabled={off("font")}
        value={(value("font") as string | null) ?? null}
        choose={(f) => { write({ font: f }); formatAll({ font: FONTS.find((x) => x.value === f)?.font ?? null }); }} />
    ),
    fontSize: () => (
      <RadioChoices keepFocus name="fontSize" label={LABEL.fontSize} look="segment" options={SIZE_OPTIONS} valueAttr="data-option-value" disabled={off("fontSize")}
        value={typeof value("fontSize") === "number" ? String(value("fontSize")) : null} choose={(n) => { write({ fontSize: Number(n) }); formatAll({ size: Number(n) }); }} />
    ),
    textAlign: () => (
      <RadioChoices keepFocus name="textAlign" label={LABEL.textAlign} look="segment" options={ALIGNS} valueAttr="data-option-value"
        value={(value("textAlign") as TextAlign | null) ?? null} choose={(a) => write({ textAlign: a })} />
    ),
    arrowType: () => (
      <RadioChoices keepFocus name="arrowType" label={LABEL.arrowType} look="segment" options={ARROW_TYPES} valueAttr="data-option-value"
        value={(value("arrowType") as ArrowType | null) ?? null} choose={(t) => write({ arrowType: t })} />
    ),
    arrowheads: () => (
      <>
        <RadioChoices keepFocus name="startArrowhead" label="Pointe de début" look="segment" options={HEADS} valueAttr="data-option-value"
          value={(value("startArrowhead", "arrowheads") as Arrowhead | null) ?? null} choose={(h) => write({ startArrowhead: h })} />
        <RadioChoices keepFocus name="endArrowhead" label="Pointe de fin" look="segment" options={HEADS} valueAttr="data-option-value"
          value={(value("endArrowhead", "arrowheads") as Arrowhead | null) ?? null} choose={(h) => write({ endArrowhead: h })} />
        <IconButton keepFocus icon="arrow-binding" label="Liaison des flèches"
          attrs={{ "data-option-value": "arrow-binding", class: "rb-opt-btn", role: "switch", "aria-checked": String(cur().arrowBinding) }}
          onPress={() => write({ arrowBinding: !cur().arrowBinding })} />
      </>
    ),
    layers: () => (
      <div class="rb-pick-row">
        <For each={LAYERS}>
          {(l) => (
            <IconButton keepFocus icon={l.icon} label={l.label} attrs={{ "data-option-value": l.value, class: "rb-opt-btn" }} onPress={() => void l.act(props.engine())} />
          )}
        </For>
      </div>
    ),
    strokeWidth: () => (
      <RadioChoices keepFocus name="strokeWidth" label={LABEL.strokeWidth} look="segment" options={WIDTH_OPTIONS} valueAttr="data-option-value"
        value={widthValue()} choose={(w) => write({ width: Number(w) })} />
    ),
    strokeStyle: () => (
      <RadioChoices keepFocus name="strokeStyle" label={LABEL.strokeStyle} look="segment" options={STROKES} valueAttr="data-option-value"
        value={(value("strokeStyle") as StrokeKind | null) ?? null} choose={(s) => write({ strokeStyle: s })} />
    ),
    roughness: () => (
      <RadioChoices keepFocus name="roughness" label={LABEL.roughness} look="segment" options={ROUGH} valueAttr="data-option-value"
        value={roughValue()} choose={(r) => write({ roughness: Number(r) as 0 | 1 | 2 })} />
    ),
    roundness: () => (
      <RadioChoices keepFocus name="roundness" label={LABEL.roundness} look="segment" options={CORNERS} valueAttr="data-option-value"
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
      <>
      <Show when={(lineTarget() && !props.state().lineEditing) || (props.state().lineEditing && (props.state().linePointsSelected ?? 0) > 0)}>
        {/* OG23 rangera cette section dans son accordéon par cet attribut */}
        <div class="rb-pick-row" data-section="points">
          <Show when={lineTarget() && !props.state().lineEditing}>
          <IconButton keepFocus icon="edit-points" label="Modifier les points (Ctrl+Entrée)" attrs={{ "data-option-value": "line-edit", class: "rb-opt-btn" }} onPress={() => void props.engine().editLinePoints()} />
          </Show>
          <Show when={props.state().lineEditing && (props.state().linePointsSelected ?? 0) > 0}>
          <IconButton keepFocus icon="point-remove" label="Retirer le point (Suppr)" attrs={{ "data-option-value": "point-remove", class: "rb-opt-btn" }} onPress={() => void props.engine().removeLinePoints()} />
          </Show>
        </div>
      </Show>
      <div class="rb-pick-row">
        <Show when={props.state().selection.length === 1}>
          <IconButton keepFocus icon="link" label="Lien (Ctrl+K)" attrs={{ "data-option-value": "link", class: "rb-opt-btn" }} onPress={() => void props.engine().editLink()} />
        </Show>
        <IconButton keepFocus icon="copy-plus" label="Dupliquer" attrs={{ "data-option-value": "duplicate", class: "rb-opt-btn" }} onPress={() => void props.engine().duplicateSelection()} />
        <IconButton keepFocus icon="trash-2" label="Supprimer" attrs={{ "data-option-value": "delete", class: "rb-opt-btn" }} onPress={() => void props.engine().deleteSelection()} />
      </div>
      </>
    ),
  };
  /** Police et taille : un FormatText sur tout le contenu de chaque texte choisi (hors saisie). */
  const formatAll = (attrs: TextAttrsPatch): void => {
    const cmds: Command[] = [];
    for (const t of targets()) {
      if (t.kind === "text") cmds.push({ type: "FormatText", id: t.id, start: 0, len: t.text.content.length, attrs });
    }
    // Une étape d'annulation par changement (T37) : `runAll`, une ou plusieurs commandes.
    props.engine().runAll(cmds);
  };
  const body = (k: OptionKey): JSX.Element => bodies[k]();
  /** T18 (déc. 38) : éditeur de lien sous l'élément (au-dessus faute de place), bord droit sur celui de la boîte. */
  const linkPos = (): JSX.CSSProperties => {
    const a = area();
    const w = a.w > 0 ? Math.min(LINK_POP_W, a.w - 16) : LINK_POP_W;
    const b = props.state().selectionBounds;
    const c = props.engine().camera();
    const minTop = topRowBottom(btn());
    let x = 8;
    let y = minTop;
    if (b !== null) {
      const bottom = b.y1 * c.zoom + c.ty;
      x = b.x1 * c.zoom + c.tx - w;
      y = a.h > 0 && bottom + 12 + LINK_POP_H > a.h ? b.y0 * c.zoom + c.ty - 12 - LINK_POP_H : bottom + 12;
    }
    const maxX = a.w > 0 ? a.w - w - 8 : Number.MAX_SAFE_INTEGER;
    const maxY = a.h > 0 ? a.h - LINK_POP_H - 8 : Number.MAX_SAFE_INTEGER;
    const top = Math.round(Math.max(minTop, Math.min(y, maxY)));
    // T33 : ni le panneau d'options (posé, mesuré) ni les îlots voisins ne sont recouverts : décalé à leur droite.
    const panel: Rect[] = root?.isConnected === true ? [{ x: pos().x, y: pos().y, w: root.offsetWidth, h: root.offsetHeight }] : [];
    const obstacles = [...panel, ...(props.above?.() ?? []), ...(props.sideStart() !== null ? [props.sideStart()!] : [])];
    const left = placeLinkAvoiding({ x: Math.max(8, Math.min(x, maxX)), y: top, w, h: LINK_POP_H }, obstacles, maxX);
    return { left: `${left}px`, top: `${top}px`, width: `${Math.round(w)}px` };
  };

  return (
    <>
    <Show when={keys().length > 0}>
      <aside
        ref={root}
        class="rb-island rb-options"
        data-options
        data-collapsed={collapsed() ? "" : undefined}
        data-picker={picker() !== null ? "" : undefined}
        aria-label="Options de l'outil"
        style={{ left: `${pos().x}px`, top: `${pos().y}px`, "--rb-btn-size": `${btn()}px`, ...(area().h > 0 ? { "max-block-size": `${Math.max(0, area().h - pos().y - 88)}px` } : {}), ...(collapsed() ? {} : { width: `${optionsWidth(btn())}px` }) }}
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
              <section class="rb-options-sec" data-option={k} data-mixed={mixed(k) ? "" : undefined} data-disabled={off(k) ? "" : undefined}>
                <h3>{LABEL[k]}</h3>
                {body(k)}
              </section>
            )}
          </For>
        </Show>
        <Show when={picker()} keyed>
          {(p) => (
            <div ref={pop} class="rb-color-pop" style={{ left: `${p.x}px`, top: `${popTop(p.y, p.minTop)}px`, ...(winH() > 0 ? { "max-block-size": `${winH() - p.minTop - 8}px` } : {}) }}>
              <ColorPicker
                value={typeof value(p.key) === "string" && value(p.key) !== "transparent" ? (value(p.key) as string) : null}
                choose={chooseFull}
                close={() => setPicker(null)}
                anchor={p.anchor}
              />
            </div>
          )}
        </Show>
      </aside>
    </Show>
    <Show when={props.state().linkEditing ?? null} keyed>
      {(id) => (
        <LinkPopover
          value={props.element(id)?.look?.link ?? null}
          submit={(url) => props.engine().setLink(url)}
          {...(props.openLink === undefined ? {} : { openLink: props.openLink })}
          close={() => props.engine().closeLink()}
          style={linkPos()}
        />
      )}
    </Show>
    </>
  );
}
