/**
 * Panneau d'options de l'outil (OG11, T10) : îlot à gauche, sections dans l'ordre d'Excalidraw (Trait, Arrière-plan,
 * Largeur, Style du trait, Style de tracé, Angles, Transparence, Actions), valeurs mixtes sans choix enfoncé. Visuel
 * RoomBoard : îlot, jetons `--rf-*`, icônes de `icons.ts`. Cibles = taille du profil (`--rb-btn-size`), pointeur d'abord.
 * Comportement copié d'Excalidraw (packages/excalidraw/components/Actions.tsx), Copyright (c) 2020 Excalidraw, licence MIT.
 * OG41 (D33) : Dupliquer et Supprimer sont dans la barre d'objet.
 */
import { For, Show, createEffect, createMemo, createSignal, on, onCleanup, onMount, type Accessor, type JSX } from "solid-js";
import type { Command, ElementView, TextAttrsPatch } from "../core/api";
import {
  dragCopyOf, endArrowheadOf, fillStyleOf, opacityOf, roughnessOf, roundnessOf, startArrowheadOf, strokeKindOf, textAlignOf, variabilityOf,
  elbowedOf, type Arrowhead, type FillKind, type StrokeKind, type TextAlign,
} from "../core/look";
import { isBoxShape, isSegment } from "../core/shapes";
import type { DeviceSettings } from "../device-settings";
import type { Engine, EngineState } from "../engine/engine";
import { DEFAULT_ITEM_STYLE, type ArrowType, type ItemStyle } from "../engine/item-style";
import type { ButtonSize, Profile } from "../toolbar";
import { observeBox } from "./Island";
import { objectKey, type KeyLike } from "../engine/input/keys";
import { ColorPicker } from "./ColorPicker";
import { LinkPopover } from "./LinkPopover";
import { buttonShortcut } from "./shortcuts";
import type { ArrangeHow } from "../core/arrange";
import { Icon, IconButton, TipBubble, tipPointerHandlers } from "./IconButton";
import { createTip } from "./tooltip";
import { BUTTON_PX, optionsWidth, placeLinkAvoiding, placeOptions, topRowBottom, type Box, type Rect } from "./island-place";
import { RadioChoices, type RadioOption } from "./RadioChoices";
import {
  DISTRIBUTE_MIN_UNITS, FONTS, admitsDragCopy, TEXT_SIZES, WIDTHS, appliesTo, backgroundPicks, disabledIn, formValue, sectionOpen, sectionsFor, showsPanel, strokePicks, type OptionKey, type Pick,
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
  /** OG23 (T13) : ouvre le panneau de l'image ; `start` arme le rognage ou la baguette, `null` : ouverture simple. */
  readonly openImage?: (start: "crop" | "background" | null) => void;
  /** OG34 : corps des sections Média et Objet 3D (barres de C14 et C15), rendus par l'appelant qui tient leurs commandes. */
  readonly media?: () => JSX.Element;
  readonly model3d?: () => JSX.Element;
}

const LABEL: Readonly<Record<OptionKey, string>> = {
  strokeColor: "Trait",
  background: "Arrière-plan",
  fillStyle: "Remplissage",
  strokeWidth: "Largeur du contour",
  pressure: "Pression",
  strokeStyle: "Style du trait",
  roughness: "Style de tracé",
  roundness: "Angles",
  font: "Police",
  fontSize: "Taille",
  textAlign: "Alignement du texte",
  arrowType: "Type de flèche",
  arrowheads: "Pointes",
  opacity: "Transparence",
  image: "Image",
  media: "Média",
  model3d: "Objet 3D",
  layers: "Disposition",
  align: "Aligner",
  transform: "Transformer",
  actions: "Actions",
};
const STROKES: readonly RadioOption<StrokeKind>[] = [
  { value: "solid", label: "Plein", icon: "stroke-solid" },
  { value: "dashed", label: "Tirets", icon: "stroke-dashed" },
  { value: "dotted", label: "Pointillés", icon: "stroke-dotted" },
];
const ROUGH: readonly RadioOption<"0" | "1" | "2">[] = [
  { value: "0", label: "Net", icon: "sloppiness-0" },
  { value: "1", label: "À main levée", icon: "sloppiness-1" },
  { value: "2", label: "Très à main levée", icon: "sloppiness-2" },
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
const PRESSURE: readonly RadioOption<"constant" | "variable">[] = [
  { value: "constant", label: "Constante", icon: "pressure-constant", tip: "Épaisseur constante" },
  { value: "variable", label: "Variable", icon: "pressure-variable", tip: "Épaisseur selon la pression du stylet" },
];
interface ArrangeButton { readonly value: ArrangeHow; readonly label: string; readonly icon: string }
const ALIGN_H: readonly ArrangeButton[] = [
  { value: "align-left", label: "Aligner à gauche", icon: "align-start-vertical" },
  { value: "align-center", label: "Centrer horizontalement", icon: "align-center-vertical" },
  { value: "align-right", label: "Aligner à droite", icon: "align-end-vertical" },
  { value: "distribute-h", label: "Répartir horizontalement", icon: "align-horizontal-space-around" },
];
const ALIGN_V: readonly ArrangeButton[] = [
  { value: "align-top", label: "Aligner en haut", icon: "align-start-horizontal" },
  { value: "align-middle", label: "Centrer verticalement", icon: "align-center-horizontal" },
  { value: "align-bottom", label: "Aligner en bas", icon: "align-end-horizontal" },
  { value: "distribute-v", label: "Répartir verticalement", icon: "align-vertical-space-around" },
];
const TRANSFORMS: readonly ArrangeButton[] = [
  { value: "flip-h", label: "Retourner horizontalement", icon: "flip-horizontal" },
  { value: "flip-v", label: "Retourner verticalement", icon: "flip-vertical" },
  { value: "rotate-ccw", label: "Tourner de 90° à gauche", icon: "rotate-ccw-square" },
  { value: "rotate-cw", label: "Tourner de 90° à droite", icon: "rotate-cw-square" },
];
interface ImageAction { readonly value: string; readonly label: string; readonly icon: string; readonly start: "crop" | "background" | null }
const IMAGE_ACTIONS: readonly ImageAction[] = [
  { value: "panel-crop", label: "Rogner", icon: "crop", start: "crop" },
  { value: "panel-background", label: "Effacer le fond", icon: "eraser", start: "background" },
  { value: "panel-retouch", label: "Retouches…", icon: "sliders-horizontal", start: null },
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
const WIDTH_OPTIONS: readonly RadioOption<"2" | "4" | "8">[] = WIDTHS.map((w) => ({
  value: w.value, label: w.label, icon: w.value === "2" ? "width-thin" : w.value === "4" ? "width-medium" : "width-thick",
}));
/** Sections à segments : valeur (chaîne) et mot du résumé gris de l'en-tête. */
const SUMMARY: Readonly<Partial<Record<OptionKey, readonly RadioOption<string>[]>>> = {
  strokeWidth: WIDTH_OPTIONS, pressure: PRESSURE, strokeStyle: STROKES, roughness: ROUGH, roundness: CORNERS, fillStyle: FILLS,
  font: FONT_OPTIONS, fontSize: SIZE_OPTIONS, textAlign: ALIGNS,
};

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
    return (isSegment(s.shape) && !elbowedOf(t[0]!.look)) || isBoxShape(s.shape);
  };
  /** Bouton « Modifier les points » : cible seule, hors édition. */
  const showEditPoints = createMemo(() => lineTarget() && !props.state().lineEditing);
  /** Bouton « Retirer le point » : en édition, au moins un point choisi. */
  const showRemovePoint = createMemo(() => props.state().lineEditing != null && (props.state().linePointsSelected ?? 0) > 0);
  const off = (k: OptionKey): boolean => disabledIn(k, editing());
  const keys = createMemo((): readonly OptionKey[] =>
    props.hidden?.() !== true && showsPanel(props.state().tool, props.state().selection.length, props.annotating())
      ? sectionsFor(props.state().tool, targets(), editing(), (props.state().itemStyle ?? DEFAULT_ITEM_STYLE).background, props.state().selectionUnits ?? 0)
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
  // OG23 : accordéon. Signal local (les réglages d'appareil ne notifient pas), état gardé par section.
  const [openSections, setOpenSections] = createSignal<Readonly<Partial<Record<string, boolean>>>>(props.settings.optionSections());
  const isOpen = (k: OptionKey): boolean => sectionOpen(k, openSections());
  const toggleSection = (k: OptionKey): void => {
    const next = !isOpen(k);
    props.settings.setOptionSection(k, next);
    setOpenSections({ ...openSections(), [k]: next });
  };
  // En-tête de section : Entrée bascule au keydown, Espace au keyup (comme un bouton natif). Le keydown est arrêté ici :
  // sinon la fenêtre le prend pour le panoramique (`isPanKey`) et l'annule (`preventDefault`), et rien ne bascule.
  const headKeyDown = (e: KeyboardEvent, k: OptionKey): void => {
    if (e.key !== "Enter" && e.key !== " ") return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.key === "Enter" && !e.repeat) toggleSection(k);
  };
  const headKeyUp = (e: KeyboardEvent, k: OptionKey): void => {
    if (e.key !== " " || e.ctrlKey || e.metaKey || e.altKey) return;
    e.preventDefault(); // pas de `click` natif en plus
    toggleSection(k);
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
    pressure: (e) => variabilityOf(e.look),
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
    pressure: (s) => s.variability,
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
    const key: ColorKey = hit === "stroke-picker" ? "strokeColor" : "background";
    // Section repliée : l'ouvrir d'abord, le sélecteur s'ancre ensuite sur son bouton.
    if (!isOpen(key)) {
      toggleSection(key);
      queueMicrotask(() => openPicker(key));
      return;
    }
    openPicker(key);
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
          <Icon name="palette" />
        </button>
        <TipBubble tip={tip} label="Autres couleurs" anchor={() => anchors[k]!} />
      </>
    );
  };
  const colors = (k: ColorKey, picks: Accessor<readonly Pick[]>, make: (c: string | null) => Partial<ItemStyle>): JSX.Element => (
    <div class="rb-pick-row"><For each={picks()}>{(p) => swatch(k, p, () => write(make(p.color)))}</For>{moreColors(k)}</div>
  );
  /** Trait transparent : seulement pour des rectangles et des ellipses (déc. 11). */
  const strokeTransparentAllowed = (): boolean =>
    targets().length > 0 && targets().every((t) => t.kind === "shape" && (t.shape.shape === "rect" || t.shape.shape === "ellipse"));
  /** OG23 (T8) : pipette de scène. Clé et cibles sont figées à l'armement : `chooseFull` lit `picker()` au choix, or la
   *  lecture arrive après un toucher, quand sélecteur et sélection peuvent avoir changé. Résout null : l'écriture est faite ici. */
  let armed: { key: ColorKey; ids: readonly string[]; anchor: HTMLElement } | null = null;
  const pickFromScene = async (): Promise<string | null> => {
    const p = picker();
    if (p === null) return null;
    const mine = { key: p.key, ids: props.state().selection, anchor: p.anchor };
    armed = mine;
    const c = await props.engine().pickColor();
    if (armed !== mine) return null; // désarmée entre-temps (sélecteur fermé)
    armed = null;
    if (c === null) return null;
    // La sélection a changé pendant l'armement : rien n'est écrit sur d'autres cibles.
    if (props.state().selection.length !== mine.ids.length || props.state().selection.some((id, i) => id !== mine.ids[i])) return null;
    write(mine.key === "strokeColor" ? { color: c } : { background: c });
    setPicker(null);
    mine.anchor.focus();
    return null;
  };
  // Sélecteur fermé (Autres couleurs, repli du panneau…) pendant l'armement : la pipette est désarmée.
  // Ou ouvert sur une autre section (Fond après Trait) : la couleur lue n'ira pas à la section armée.
  createEffect(() => {
    const p = picker();
    if (armed !== null && (p === null || p.key !== armed.key || p.anchor !== armed.anchor)) {
      armed = null;
      props.engine().cancelPick?.();
    }
  });
  const chooseFull = (c: string | null): void => {
    const p = picker();
    if (p === null) return;
    write(p.key === "strokeColor" ? { color: c ?? "transparent" } : { background: c });
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
  /** OG23 : « Glisser une copie », `aria-pressed` vrai, faux ou `mixed` ; mixte : un clic pose partout. Grisée sans cible admise. */
  const dragCopyToggle = (): JSX.Element => {
    const tip = createTip();
    let button: HTMLButtonElement | undefined;
    const eligible = (): readonly ElementView[] => targets().filter(admitsDragCopy);
    const all = (): boolean => eligible().length > 0 && eligible().every((e) => dragCopyOf(e.look));
    const some = (): boolean => eligible().some((e) => dragCopyOf(e.look));
    return (
      <>
        <button
          ref={button}
          type="button"
          class="rb-opt-toggle"
          data-option-value="drag-copy"
          data-mixed={some() && !all() ? "" : undefined}
          aria-pressed={all() ? "true" : some() ? "mixed" : "false"}
          aria-label="Glisser une copie"
          disabled={eligible().length === 0}
          {...tipPointerHandlers(tip)}
          onPointerDown={(e) => { keep(e); tip.down(e.pointerType); }}
          onMouseDown={keep}
          onClick={() => void props.engine().setDragCopy(!all())}
        >
          <Icon name="copy" />
          <span class="rb-opt-wide-label">Glisser une copie</span>
        </button>
        <TipBubble tip={tip} label="Glisser une copie : le glissement laisse l'original et déplace une copie" anchor={() => button!} />
      </>
    );
  };
  /** Une rangée de boutons `Engine.arrange` : cible 44 px (`rb-opt-btn`), raccourci dans l'infobulle et `aria-keyshortcuts` ; Répartir demande 3 unités. */
  const arrangeRow = (row: readonly ArrangeButton[]): JSX.Element => (
    <For each={row.filter((b) => !b.value.startsWith("distribute") || (props.state().selectionUnits ?? 0) >= DISTRIBUTE_MIN_UNITS)}>
      {(b) => (
        <IconButton keepFocus icon={b.icon} label={b.label} shortcut={buttonShortcut(b.value)} attrs={{ "data-option-value": b.value, class: "rb-opt-btn" }} onPress={() => void props.engine().arrange(b.value)} />
      )}
    </For>
  );
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
    pressure: () => (
      <RadioChoices keepFocus name="pressure" label={LABEL.pressure} look="segment" options={PRESSURE} valueAttr="data-option-value"
        value={(value("pressure") as "constant" | "variable" | null) ?? null} choose={(v) => write({ variability: v })} />
    ),
    align: () => (
      <>
        <For each={[ALIGN_H, ALIGN_V]}>{(row) => <div class="rb-pick-row">{arrangeRow(row)}</div>}</For>
      </>
    ),
    transform: () => <div class="rb-pick-row">{arrangeRow(TRANSFORMS)}</div>,
    image: () => (
      <div class="rb-opt-stack">
        <For each={IMAGE_ACTIONS}>
          {(a) => (
            <IconButton keepFocus icon={null} label={a.label} attrs={{ "data-image-action": a.value, class: "rb-opt-btn rb-opt-wide" }} onPress={() => props.openImage?.(a.start)}>
              <Icon name={a.icon} />
              <span class="rb-opt-wide-label" aria-hidden="true">{a.label}</span>
            </IconButton>
          )}
        </For>
      </div>
    ),
    media: () => props.media?.() ?? null,
    model3d: () => props.model3d?.() ?? null,
    actions: () => (
      <>
      <Show when={showEditPoints() || showRemovePoint()}>
        {/* OG23 rangera cette section dans son accordéon par cet attribut */}
        <div class="rb-pick-row" data-section="points">
          <Show when={showEditPoints()}>
          <IconButton keepFocus icon="edit-points" label="Modifier les points (Ctrl+Entrée)" attrs={{ "data-option-value": "line-edit", class: "rb-opt-btn" }} onPress={() => void props.engine().editLinePoints()} />
          </Show>
          <Show when={showRemovePoint()}>
          <IconButton keepFocus icon="point-remove" label="Retirer le point (Suppr)" attrs={{ "data-option-value": "point-remove", class: "rb-opt-btn" }} onPress={() => void props.engine().removeLinePoints()} />
          </Show>
        </div>
      </Show>
      <div class="rb-pick-row">
        {dragCopyToggle()}
        <Show when={props.state().selection.length === 1}>
          <IconButton keepFocus icon="link" label="Lien (Ctrl+K)" attrs={{ "data-option-value": "link", class: "rb-opt-btn" }} onPress={() => void props.engine().editLink()} />
        </Show>
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
  /** Résumé gris de l'en-tête : « Mixte » ou le mot de la valeur commune ; aucun hors sections à segments. */
  const summary = (k: OptionKey): string | null => {
    const opts = SUMMARY[k];
    if (opts === undefined) return null;
    if (mixed(k)) return "Mixte";
    const v = value(k);
    const key = typeof v === "number" || typeof v === "string" ? String(v) : null;
    return opts.find((o) => o.value === key)?.label ?? null;
  };
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
              <section class="rb-options-sec" data-option={k} data-open={isOpen(k) ? "" : undefined} data-mixed={mixed(k) ? "" : undefined} data-disabled={off(k) ? "" : undefined}>
                <h3 class="rb-opt-h">
                <button
                  type="button"
                  class="rb-opt-head"
                  data-option-head={k}
                  aria-expanded={isOpen(k)}
                  aria-controls={`opt-body-${k}`}
                  disabled={off(k)}
                  onPointerDown={keep}
                  onMouseDown={keep}
                  onClick={() => toggleSection(k)}
                  onKeyDown={(e) => headKeyDown(e, k)}
                  onKeyUp={(e) => headKeyUp(e, k)}
                >
                  <span class="rb-opt-title">{LABEL[k]}</span>
                  <Show when={summary(k)}>{(t) => <span class="rb-opt-sum">· {t()}</span>}</Show>
                  <Icon name="chevron-down" />
                </button>
                </h3>
                <div id={`opt-body-${k}`} class="rb-opt-body" hidden={!isOpen(k)}>{body(k)}</div>
              </section>
            )}
          </For>
        </Show>
        <Show when={picker()} keyed>
          {(p) => (
            <div ref={pop} class="rb-color-pop" style={{ left: `${p.x}px`, top: `${popTop(p.y, p.minTop)}px`, ...(winH() > 0 ? { "max-block-size": `${winH() - p.minTop - 8}px` } : {}) }}>
              <ColorPicker
                transparent={p.key === "background" || strokeTransparentAllowed()}
                value={typeof value(p.key) === "string" && value(p.key) !== "transparent" ? (value(p.key) as string) : null}
                choose={chooseFull}
                pick={pickFromScene}
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
