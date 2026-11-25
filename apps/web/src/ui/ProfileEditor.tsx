/**
 * Éditeur de profil (C1, P20 ; design-l3, D-DS10) : panneau latéral de 600 px, calé à droite dans la case de la scène,
 * sans voile. Le brouillon reste (« Enregistrer » écrit, Fermer abandonne) et la page le montre : chaque geste appelle
 * `preview(brouillon)`, le démontage `endPreview()` (patron de `GridPanel.tsx`). Un brouillon différent du profil
 * enregistré (`sameProfile`) demande `confirm` avant d'être abandonné (L3-32). Chaque geste appelle une opération pure
 * de `profile-edit.ts` ; le composant n'écrit aucun stockage.
 */
import {
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  For,
  Index,
  on,
  onCleanup,
  onMount,
  Show,
  type Accessor,
  type JSX,
} from "solid-js";
import {
  addItem,
  addPreset,
  canHide,
  catalog,
  leaveDraft,
  moveItem,
  moveItemTo,
  presetFields,
  PRESET_TOOLS,
  removePreset,
  resetAllPresets,
  resetToolbars,
  sameProfile,
  setButtonSize,
  setDock,
  setHidden,
  setLabel,
  setStartMode,
  updatePreset,
  type CatalogEntry,
  type PresetField,
  type PresetPatch,
} from "../profile-edit";
import {
  ANNOTATION_ROLE,
  annotationBarOf,
  BUTTON_SIZES,
  DOCKS,
  isKnownItem,
  presetsOf,
  START_MODES,
  TOOL_TABLE,
  type ActionId,
  type ButtonSize,
  type Dock,
  type ItemKind,
  type Preset,
  type Profile,
  type StartMode,
  type Toolbar,
  type ToolItem,
} from "../toolbar";
import { Icon, IconButton } from "./IconButton";
import { iconFor } from "./icons";
import { POINTER_SUMMARY } from "./PointerSwitch";
import { RadioChoices, type RadioOption } from "./RadioChoices";
import { startSortDrag } from "./sort-drag";

export interface ProfileEditorProps {
  /** Profil enregistré (actif) ; le brouillon en est une copie prise au montage. */
  readonly profile: Profile;
  /** Profil livré d'origine (`originOf`) : source de « Rétablir les barres » et « Rétablir les préréglages ». */
  readonly origin: Profile;
  /** Profils du sélecteur (L3-6). */
  readonly profiles: Accessor<readonly Profile[]>;
  /** Vrai pour un profil de l'utilisateur : étiquette « Personnel ». */
  readonly canRemove: Accessor<boolean>;
  /** Vrai pour une copie d'un livré ou un profil de l'utilisateur : « Revenir à l'origine » agit sur l'enregistré (P6). */
  readonly canResetCurrent: Accessor<boolean>;
  /** Vrai au montage qui suit un choix fait dans le sélecteur : le focus y revient (L3-4). */
  readonly focusProfile?: boolean;
  save(draft: Profile): void;
  saveAsNew(draft: Profile, label: string): void;
  close(): void;
  /** L3-3 : brouillon montré par la page, à chaque geste. */
  preview(draft: Profile): void;
  /** L3-3 : la page revient au profil enregistré (démontage, brouillon rendu). */
  endPreview(): void;
  choose(id: string): void;
  importFile(): void;
  exportProfile(draft: Profile): void;
  resetCurrent(): void;
  confirm(message: string): Promise<boolean>;
}

type Edit = (f: (p: Profile) => Profile) => void;
/** Rend le focus après un geste : la ligne touchée peut être redessinée (nouvel objet), l'élément focalisé a disparu. */
type Refocus = (find: (root: HTMLElement) => HTMLElement | undefined) => void;

const DOCK_LABELS: Readonly<Record<Dock, string>> = { top: "En haut", bottom: "En bas", left: "À gauche", right: "À droite", floating: "Flottante" };
const DOCK_ICONS: Readonly<Record<Dock, string>> = { top: "dock-top", bottom: "dock-bottom", left: "dock-left", right: "dock-right", floating: "dock-float" };
/** L3-9 : sous la vignette « Flottante » de la barre montrée en annotation (`annotationBarOf` la pose en haut). */
const ANNOTATION_DOCK_DETAIL: Partial<Record<Dock, string>> = { floating: "En annotation : en haut" };
const SIZE_LABELS: Readonly<Record<ButtonSize, string>> = { s: "Petits", m: "Moyens", l: "Grands" };
/** L3-8 : tailles de L1 en px (`rb.css`, `--rb-btn-*`), liées par un test ; le profil garde le jeton `s|m|l` (P12). */
export const BUTTON_PX: Readonly<Record<ButtonSize, number>> = Object.freeze({ s: 44, m: 48, l: 64 });
const START_CHOICES: Readonly<Record<StartMode, { readonly label: string; readonly icon: string; readonly detail: string }>> = {
  board: { label: "Tableau", icon: "board", detail: "RoomBoard s'ouvre sur le tableau." },
  "desktop-annotation": { label: "Annotation du bureau", icon: "annotate", detail: "La barre seule, sur le bureau." },
};
const START_OPTIONS: readonly RadioOption<StartMode>[] = START_MODES.map((m) => ({ value: m, ...START_CHOICES[m] }));
const SIZE_OPTIONS: readonly RadioOption<ButtonSize>[] = BUTTON_SIZES.map((s) => ({ value: s, label: `${SIZE_LABELS[s]} · ${BUTTON_PX[s]}` }));
const ROLE_LABELS: Readonly<Record<string, string>> = { tools: "Barre d'outils", pages: "Barre des pages", [ANNOTATION_ROLE]: "Barre d'annotation" };
const UNKNOWN = "inconnu (version plus récente)";
/** L3-12 : lignes dont libellé et icône viennent d'ailleurs que de l'élément (renvois, aucune copie). */
const ROW_SUMMARY: Partial<Record<ActionId, { readonly label: string; readonly icon: string }>> = { "annotation-pointer": POINTER_SUMMARY };
/** Icône d'une ligne sans icône de table, par sorte. */
const KIND_ICONS: Partial<Record<ItemKind, string>> = { dropzone: "drop" };
const START_NOTE = "Sans annotation possible (web, iPad, Wayland) : tableau.";
const ANNOTATION_NOTE = "Montrée seulement en annotation du bureau : réglage visible à l'entrée suivante.";
const SORT_HINT = "Flèches haut et bas pour déplacer ; Entrée pour Monter et Descendre";
/** Flèche de la poignée → cran (table, L3-15 b). */
const ARROW_STEP: Readonly<Record<string, -1 | 1>> = { ArrowUp: -1, ArrowDown: 1 };
/** Champ de préréglage → modification (table : couleur en texte, épaisseur en nombre). */
const PATCH: Readonly<Record<PresetField["key"], (raw: string) => PresetPatch>> = {
  color: (raw) => ({ color: raw }),
  width: (raw) => ({ width: Number(raw) }),
};

/** Fixe la valeur d'un `select` une fois ses options posées, puis à chaque changement (fiable, contrairement à `selected`). */
export const syncValue = (el: HTMLSelectElement, value: () => string): void => {
  createEffect(() => {
    el.value = value();
  });
};
export const pick = <T extends string>(list: readonly T[], v: string): T | undefined => list.find((x) => x === v);

const summaryOf = (it: ToolItem): { readonly label: string; readonly icon: string } | undefined =>
  it.kind === "action" && it.action !== undefined && Object.hasOwn(ROW_SUMMARY, it.action) ? ROW_SUMMARY[it.action] : undefined;
const itemName = (it: ToolItem): string => summaryOf(it)?.label ?? (it.kind === "separator" ? "Séparateur" : it.label || it.id);
const rowIcon = (it: ToolItem): string | null =>
  summaryOf(it)?.icon ?? iconFor(it) ?? (Object.hasOwn(KIND_ICONS, it.kind) ? KIND_ICONS[it.kind]! : null);
const toolName = (tool: string): string => (Object.hasOwn(TOOL_TABLE, tool) ? TOOL_TABLE[tool]!.label : tool);
const entryKey = (e: CatalogEntry): string => `${e.kind}:${e.ref}`;
const entryIcon = (e: CatalogEntry): string | null =>
  iconFor({ id: e.ref, kind: e.kind, ...(e.kind === "tool" ? { tool: e.ref } : { action: e.ref }), label: e.label, requires: [], rest: {} });
const byData = (root: HTMLElement, attr: string, key: string, value: string): HTMLElement | undefined =>
  [...root.querySelectorAll<HTMLElement>(`[${attr}]`)].find((el) => el.dataset[key] === value);
/** Première commande présente et active de la ligne `itemId`, dans l'ordre de `controls` (grisée : la suivante). */
const rowControl = (itemId: string, ...controls: string[]) => (root: HTMLElement): HTMLElement | undefined => {
  const row = byData(root, "data-edit-item", "editItem", itemId);
  if (row === undefined) return undefined;
  for (const c of controls) {
    const el = row.querySelector<HTMLButtonElement>(`[data-edit="${c}"]`);
    if (el !== null && !el.disabled) return el;
  }
  return undefined;
};
/** L3-9 : libellé du rôle ; rôle inconnu ou partagé par deux barres : « Barre <id> ». */
function barLabels(bars: readonly Toolbar[]): Map<string, string> {
  const count = new Map<string, number>();
  for (const b of bars) count.set(b.role, (count.get(b.role) ?? 0) + 1);
  return new Map(bars.map((b) => [b.id, Object.hasOwn(ROLE_LABELS, b.role) && count.get(b.role) === 1 ? ROLE_LABELS[b.role]! : `Barre ${b.id}`]));
}
const sameOptions = (a: readonly RadioOption<string>[], b: readonly RadioOption<string>[]): boolean =>
  a.length === b.length && a.every((o, i) => o.value === b[i]!.value && o.label === b[i]!.label);

/** Ce que les lignes partagent : ligne dévoilée, tri au pointeur, annonce, aide de la poignée. */
interface RowShared {
  readonly revealed: Accessor<string | null>;
  readonly hint: string;
  sortFrom(e: PointerEvent, barId: string, itemId: string, from: number): void;
  gripClicked(itemId: string): void;
  announce(barId: string, itemId: string): void;
}

function ItemRow(props: { barId: string; item: ToolItem; index: number; last: number; edit: Edit; refocus: Refocus; row: RowShared }): JSX.Element {
  const known = (): boolean => isKnownItem(props.item);
  const name = (): string => itemName(props.item);
  const visible = (): boolean => props.item.hidden !== true;
  const move = (delta: -1 | 1, ...controls: string[]): void => {
    props.edit((p) => moveItem(p, props.barId, props.item.id, delta));
    props.row.announce(props.barId, props.item.id);
    props.refocus(rowControl(props.item.id, ...controls));
  };
  return (
    <li
      class="rb-item"
      data-edit-item={props.item.id}
      data-unknown={known() ? undefined : ""}
      data-separator={props.item.kind === "separator" ? "" : undefined}
      data-hidden={visible() ? undefined : ""}
      aria-disabled={known() ? undefined : "true"}
    >
      <button
        type="button"
        class="rb-grip"
        data-edit="grip"
        aria-label={`Déplacer ${name()}`}
        aria-describedby={props.row.hint}
        onPointerDown={(e) => props.row.sortFrom(e, props.barId, props.item.id, props.index)}
        onClick={() => props.row.gripClicked(props.item.id)}
        onKeyDown={(e) => {
          if (!Object.hasOwn(ARROW_STEP, e.key)) return;
          e.preventDefault();
          move(ARROW_STEP[e.key]!, "grip");
        }}
      >
        <Icon name="grip" />
      </button>
      <Show when={rowIcon(props.item)} fallback={<span class="rb-item-noicon" />}>
        {(n) => <Icon name={n()} />}
      </Show>
      <span class="rb-item-label">{known() ? name() : `${name()} — ${UNKNOWN}`}</span>
      <Show when={props.row.revealed() === props.item.id}>
        <button type="button" class="rb-sheet-ghost" data-edit="up" aria-label={`Monter ${name()}`} disabled={props.index === 0} onClick={() => move(-1, "up", "down", "grip")}>
          Monter
        </button>
        <button type="button" class="rb-sheet-ghost" data-edit="down" aria-label={`Descendre ${name()}`} disabled={props.index === props.last} onClick={() => move(1, "down", "up", "grip")}>
          Descendre
        </button>
      </Show>
      <IconButton
        icon={visible() ? "check" : "hidden"}
        label={`${visible() ? "Masquer" : "Afficher"} ${name()}`}
        pressed={visible()}
        disabled={!canHide(props.item)}
        attrs={{ "data-edit": "shown" }}
        onPress={() => {
          props.edit((p) => setHidden(p, props.item.id, visible()));
          props.refocus(rowControl(props.item.id, "shown", "grip"));
        }}
      />
    </li>
  );
}

function BarBlock(props: {
  bar: Toolbar;
  label: string;
  note: boolean;
  floatDetail: boolean;
  sorting: Accessor<boolean>;
  draft: Accessor<Profile>;
  edit: Edit;
  refocus: Refocus;
  row: RowShared;
}): JSX.Element {
  const items = (): readonly ToolItem[] => props.bar.groups.flatMap((g) => g.items);
  const choices = (): readonly CatalogEntry[] => catalog(props.draft(), props.bar.id);
  const [adding, setAdding] = createSignal(false);
  let addButton: HTMLButtonElement | undefined;
  createEffect(on(() => props.bar.id, () => setAdding(false), { defer: true }));
  const closeAdd = (): void => {
    setAdding(false);
    addButton?.focus();
  };
  // Mémos à égalité de valeur : les vignettes gardent leurs boutons (et le focus) d'un geste à l'autre.
  const detail = createMemo(() => props.floatDetail);
  const docks = createMemo((): readonly RadioOption<Dock>[] =>
    DOCKS.map((d) => ({ value: d, label: DOCK_LABELS[d], icon: DOCK_ICONS[d], ...(detail() && Object.hasOwn(ANNOTATION_DOCK_DETAIL, d) ? { detail: ANNOTATION_DOCK_DETAIL[d]! } : {}) })),
  );
  return (
    <div class="rb-sheet-bar" data-edit-bar={props.bar.id}>
      <h4 class="rb-sr">{props.label}</h4>
      <Show when={props.note}>
        <p class="rb-note" data-edit="annotation-note">
          {ANNOTATION_NOTE}
        </p>
      </Show>
      <RadioChoices name="dock" label={`Emplacement : ${props.label}`} look="tile" options={docks()} value={props.bar.dock} choose={(d) => props.edit((p) => setDock(p, props.bar.id, d))} />
      <div
        class="rb-add-wrap"
        onKeyDown={(e) => {
          if (e.key !== "Escape" || !adding()) return;
          e.preventDefault();
          closeAdd();
        }}
      >
        <div class="rb-sheet-h2row">
          <h4>Outils de la barre</h4>
          <button type="button" ref={addButton} class="rb-sheet-add" data-edit="add" aria-expanded={adding()} disabled={choices().length === 0} onClick={() => setAdding((a) => !a)}>
            <Icon name="plus" />
            Ajouter
          </button>
        </div>
        <Show when={adding()}>
          <ul class="rb-add-list" data-edit="add-list">
            <For each={choices()}>
              {(c) => (
                <li>
                  <button
                    type="button"
                    data-add-choice={entryKey(c)}
                    onClick={() => {
                      props.edit((p) => addItem(p, props.bar.id, c));
                      closeAdd();
                    }}
                  >
                    <Show when={entryIcon(c)}>{(n) => <Icon name={n()} />}</Show>
                    <span>{c.kind === "tool" ? `Outil : ${c.label}` : c.label}</span>
                  </button>
                </li>
              )}
            </For>
          </ul>
        </Show>
      </div>
      <ul class="rb-items" data-edit="items" data-sorting={props.sorting() ? "" : undefined}>
        <For each={items()}>
          {(it, i) => <ItemRow barId={props.bar.id} item={it} index={i()} last={items().length - 1} edit={props.edit} refocus={props.refocus} row={props.row} />}
        </For>
      </ul>
    </div>
  );
}

function PresetInput(props: { tool: string; preset: Preset; field: PresetField; edit: Edit }): JSX.Element {
  return (
    <label class={`rb-preset-${props.field.key}`}>
      <span class={props.field.input === "color" ? "rb-sr" : undefined}>{props.field.label}</span>
      <input
        type={props.field.input}
        data-edit={`preset-${props.field.key}`}
        value={String(props.preset[props.field.key] ?? "")}
        min={props.field.input === "number" ? "0.5" : undefined}
        step={props.field.input === "number" ? "0.5" : undefined}
        onChange={(e) => {
          const patch = PATCH[props.field.key](e.currentTarget.value);
          props.edit((d) => updatePreset(d, props.tool, props.preset.id, patch));
        }}
      />
    </label>
  );
}

function PresetList(props: { tool: string; draft: Accessor<Profile>; edit: Edit }): JSX.Element {
  const list = (): readonly Preset[] => presetsOf(props.draft().presets, props.tool);
  const fields = presetFields(props.tool);
  const colors = fields.filter((f) => f.input === "color");
  const others = fields.filter((f) => f.input !== "color");
  return (
    <div class="rb-presets" data-edit-presets={props.tool}>
      <h4>{toolName(props.tool)}</h4>
      <ul>
        {/* Index : la ligne et ses champs restent en place quand le préréglage change (le focus ne se perd pas). */}
        <Index each={list()}>
          {(p) => (
            <li class="rb-preset-row" data-edit-preset={p().id}>
              <For each={colors}>{(f) => <PresetInput tool={props.tool} preset={p()} field={f} edit={props.edit} />}</For>
              <label class="rb-preset-name">
                <span class="rb-sr">Nom</span>
                <input
                  type="text"
                  data-edit="preset-label"
                  value={p().label}
                  onChange={(e) => {
                    const label = e.currentTarget.value;
                    props.edit((d) => updatePreset(d, props.tool, p().id, { label }));
                  }}
                />
              </label>
              <For each={others}>{(f) => <PresetInput tool={props.tool} preset={p()} field={f} edit={props.edit} />}</For>
              <IconButton icon="trash" label={`Retirer ${p().label}`} attrs={{ "data-edit": "preset-remove" }} onPress={() => props.edit((d) => removePreset(d, props.tool, p().id))} />
            </li>
          )}
        </Index>
      </ul>
      <button type="button" class="rb-sheet-add" data-edit="preset-add" onClick={() => props.edit((d) => addPreset(d, props.tool))}>
        <Icon name="plus" />
        Ajouter une couleur
      </button>
    </div>
  );
}

export function ProfileEditor(props: ProfileEditorProps): JSX.Element {
  const [draft, setDraft] = createSignal<Profile>(props.profile);
  const [newName, setNewName] = createSignal(`${props.profile.label} (copie)`);
  const firstBar = (p: Profile): string => p.toolbars.find((b) => b.role === "tools")?.id ?? p.toolbars[0]?.id ?? "";
  const [barId, setBarId] = createSignal(firstBar(props.profile));
  const [revealed, setRevealed] = createSignal<string | null>(null);
  const [sorting, setSorting] = createSignal(false);
  const [said, setSaid] = createSignal("");
  const hint = createUniqueId();
  let root: HTMLElement | undefined;
  let profileSelect: HTMLSelectElement | undefined;
  /** Abandon du tri au pointeur en cours : l'éditeur démonté ne laisse ni écouteur sur `document` ni capture. */
  let abortSort: (() => void) | undefined;
  onCleanup(() => {
    abortSort?.();
    props.endPreview();
  });
  onMount(() => {
    if (props.focusProfile === true) queueMicrotask(() => profileSelect?.focus());
  });
  const edit: Edit = (f) => {
    const next = f(draft());
    setDraft(next);
    props.preview(next);
  };
  // Après le redessin (microtâche) : le focus revient sur la commande repérée dans le nouveau DOM.
  const refocus: Refocus = (find) =>
    queueMicrotask(() => {
      if (root !== undefined) find(root)?.focus();
    });
  const unchanged = (): boolean => sameProfile(draft(), props.profile);
  const named = (): boolean => draft().label.trim() !== "";
  /** L3-32 : brouillon égal au profil enregistré : `then` tout de suite ; sinon après un Oui. */
  const leave = (then: () => void): void => leaveDraft(draft(), props.profile, props.confirm, then);
  const tag = (): string => (props.canRemove() ? "Personnel" : props.canResetCurrent() ? "Fourni, modifié" : "Fourni");
  const canRevert = (): boolean => props.canResetCurrent() || !unchanged();
  /** L3-19 : copie ou profil de l'utilisateur : remise de l'enregistré (l'éditeur remonte) ; sinon, le brouillon revient. */
  const revert = (): void => {
    if (props.canResetCurrent()) return props.resetCurrent();
    setDraft(props.profile);
    props.endPreview();
  };
  let saidTurn = 0;
  const announce = (bar: string, itemId: string): void => {
    const b = draft().toolbars.find((x) => x.id === bar);
    if (b === undefined) return;
    const items = b.groups.flatMap((g) => g.items);
    const i = items.findIndex((it) => it.id === itemId);
    if (i === -1) return;
    const text = `${itemName(items[i]!)} : rang ${i + 1} sur ${items.length}`;
    const turn = ++saidTurn;
    if (said() !== text) {
      setSaid(text);
      return;
    }
    // Même texte : une région `aria-live` ne redit rien ; vidée, puis reposée au tour suivant (sauf annonce plus récente).
    setSaid("");
    setTimeout(() => {
      if (turn === saidTurn) setSaid(text);
    });
  };
  /** Vrai entre la fin d'un vrai glisser (ou d'un geste annulé) et le `click` qui le suit, ignoré (L3-15 a). Le `click`
   *  part dans la même tâche que le lâcher ; sans `click` (Échap puis lâcher hors de la poignée), le drapeau retombe au
   *  tour suivant, sinon il avalerait la frappe Entrée suivante sur la poignée. */
  let justSorted = false;
  const settle = (): void => {
    justSorted = true;
    setTimeout(() => {
      justSorted = false;
    });
  };
  const row: RowShared = {
    revealed,
    hint,
    announce,
    gripClicked: (itemId) => {
      if (justSorted) {
        justSorted = false;
        return;
      }
      setRevealed(itemId);
    },
    sortFrom: (e, bar, itemId, from) => {
      justSorted = false;
      const grip = e.currentTarget as HTMLElement | null;
      const list = grip?.closest("ul") ?? null;
      const scroller = grip?.closest<HTMLElement>("[data-sheet-body]") ?? null;
      if (list === null || scroller === null) return;
      abortSort = startSortDrag(e, {
        rows: () => Array.from(list.children) as HTMLElement[],
        scroller,
        from,
        moved: () => setSorting(true),
        drop: (to) => {
          settle();
          setSorting(false);
          edit((p) => moveItemTo(p, bar, itemId, to));
          announce(bar, itemId);
          refocus(rowControl(itemId, "grip"));
        },
        tap: () => {
          setSorting(false);
          setRevealed(itemId);
        },
        cancel: () => {
          settle();
          setSorting(false);
        },
      });
    },
  };
  const labels = createMemo(() => barLabels(draft().toolbars));
  const barOptions = createMemo(
    (): readonly RadioOption<string>[] => draft().toolbars.map((b) => ({ value: b.id, label: labels().get(b.id) ?? `Barre ${b.id}` })),
    undefined,
    { equals: sameOptions },
  );
  const shownBar = (): Toolbar | undefined => draft().toolbars.find((b) => b.id === barId()) ?? draft().toolbars.find((b) => b.id === firstBar(draft()));
  const floatBar = createMemo(() => annotationBarOf(draft())?.id);
  return (
    <aside ref={root} class="rb-sheet" data-profile-editor role="dialog" aria-label="Profils">
      <header class="rb-sheet-head">
        <h2>Profils</h2>
        <IconButton icon="close" label="Fermer" attrs={{ "data-edit": "close" }} onPress={() => leave(() => props.close())} />
      </header>
      <div class="rb-sheet-body" data-sheet-body>
        <section data-edit-section="profile">
          <h3>Profil actif</h3>
          <div class="rb-sheet-row">
            <label class="rb-select">
              <Icon name="profile" />
              <select
                ref={(el) => {
                  profileSelect = el;
                  syncValue(el, () => props.profile.id);
                }}
                data-edit="profile"
                aria-label="Profil actif"
                onChange={(e) => {
                  const el = e.currentTarget;
                  const id = el.value;
                  el.value = props.profile.id; // la liste montre le profil actif tant que le choix n'est pas fait
                  if (id !== props.profile.id) leave(() => props.choose(id));
                }}
              >
                <For each={props.profiles()}>{(p) => <option value={p.id}>{p.label}</option>}</For>
              </select>
              <span class="rb-tag" data-edit="profile-tag">
                {tag()}
              </span>
              <Icon name="down" />
            </label>
            <button type="button" class="rb-sheet-ghost" data-edit="import" aria-label="Importer un profil (.rbprofile)" onClick={() => leave(() => props.importFile())}>
              <Icon name="import" />
              <span>Importer</span>
            </button>
            <button type="button" class="rb-sheet-ghost" data-edit="export" aria-label="Exporter ce profil (.rbprofile)" disabled={!named()} onClick={() => props.exportProfile(draft())}>
              <Icon name="export" />
              <span>Exporter</span>
            </button>
          </div>
          <label class="rb-field">
            <span>Nom du profil</span>
            <input
              type="text"
              data-edit="label"
              value={draft().label}
              onInput={(e) => {
                const v = e.currentTarget.value;
                edit((p) => setLabel(p, v));
              }}
            />
          </label>
        </section>
        <section data-edit-section="general">
          <h3>Au démarrage</h3>
          <RadioChoices name="start-mode" label="Au démarrage" look="card" options={START_OPTIONS} value={draft().behavior.startMode} choose={(m) => edit((p) => setStartMode(p, m))} />
          <p class="rb-note">{START_NOTE}</p>
        </section>
        <section data-edit-section="size">
          <h3>Taille des boutons</h3>
          <RadioChoices name="button-size" label="Taille des boutons" look="segment" options={SIZE_OPTIONS} value={draft().interface.buttonSize} choose={(s) => edit((p) => setButtonSize(p, s))} />
        </section>
        <section data-edit-section="bars">
          <h3>Barres</h3>
          <RadioChoices
            name="bar"
            label="Barre à régler"
            look="segment"
            options={barOptions()}
            value={shownBar()?.id ?? ""}
            choose={(id) => {
              setBarId(id);
              setRevealed(null);
            }}
          />
          <Show when={shownBar()}>
            {(b) => (
              <BarBlock
                bar={b()}
                label={labels().get(b().id) ?? `Barre ${b().id}`}
                note={b().role === ANNOTATION_ROLE}
                floatDetail={floatBar() === b().id}
                sorting={sorting}
                draft={draft}
                edit={edit}
                refocus={refocus}
                row={row}
              />
            )}
          </Show>
          <button type="button" class="rb-sheet-ghost" data-edit="reset-bars" onClick={() => edit((p) => resetToolbars(p, props.origin))}>
            <Icon name="reset" />
            Rétablir les barres
          </button>
        </section>
        <section data-edit-section="presets">
          <h3>Préréglages</h3>
          <For each={PRESET_TOOLS}>{(tool) => <PresetList tool={tool} draft={draft} edit={edit} />}</For>
          <button type="button" class="rb-sheet-ghost" data-edit="reset-presets" onClick={() => edit((p) => resetAllPresets(p, props.origin))}>
            <Icon name="reset" />
            Rétablir les préréglages
          </button>
        </section>
        <section data-edit-section="new">
          <h3>Enregistrer comme nouveau</h3>
          <div class="rb-sheet-row">
            <label class="rb-field rb-field-grow">
              <span>Nom du nouveau profil</span>
              <input type="text" data-edit="new-name" value={newName()} onInput={(e) => setNewName(e.currentTarget.value)} />
            </label>
            <button type="button" class="rb-sheet-outline" data-edit="save-new" disabled={newName().trim() === ""} onClick={() => props.saveAsNew(draft(), newName().trim())}>
              Enregistrer comme nouveau
            </button>
          </div>
        </section>
        <p class="rb-sr" aria-live="polite" data-edit="announce">
          {said()}
        </p>
        <p class="rb-sr" id={hint}>
          {SORT_HINT}
        </p>
      </div>
      <footer class="rb-sheet-foot">
        <button type="button" class="rb-sheet-ghost" data-edit="revert" disabled={!canRevert()} onClick={revert}>
          <Icon name="reset" />
          Revenir à l'origine
        </button>
        <div class="rb-sheet-foot-end">
          <Show when={unchanged()}>
            <span class="rb-saved" data-edit="saved">
              <Icon name="check" />
              Enregistré sur cet appareil
            </span>
          </Show>
          <button type="button" class="rb-sheet-solid" data-edit="save" disabled={!named()} onClick={() => props.save(draft())}>
            Enregistrer
          </button>
        </div>
      </footer>
    </aside>
  );
}
