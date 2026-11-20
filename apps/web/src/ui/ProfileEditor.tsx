/**
 * Éditeur de profil (C1, P20) : panneau passager à trois sections (Général, Barres, Préréglages) sur un brouillon. Rien
 * ne change dans les barres avant « Enregistrer » ou « Enregistrer comme nouveau » ; fermer abandonne le brouillon. Chaque
 * geste appelle une opération pure de `profile-edit.ts` ; le composant n'écrit aucun stockage.
 */
import { createEffect, createSignal, For, Index, Show, type Accessor, type JSX } from "solid-js";
import {
  addItem,
  addPreset,
  canHide,
  catalog,
  moveItem,
  presetFields,
  PRESET_TOOLS,
  removePreset,
  resetAllPresets,
  resetToolbars,
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
  BUTTON_SIZES,
  DOCKS,
  isKnownItem,
  presetsOf,
  START_MODES,
  TOOL_TABLE,
  type ButtonSize,
  type Dock,
  type Preset,
  type Profile,
  type StartMode,
  type Toolbar,
  type ToolItem,
} from "../toolbar";

export interface ProfileEditorProps {
  /** Profil de départ ; le brouillon en est une copie prise à l'ouverture. */
  readonly profile: Profile;
  /** Profil livré d'origine (`originOf`) : source de « Rétablir les barres » et « Rétablir les préréglages ». */
  readonly origin: Profile;
  save(draft: Profile): void;
  saveAsNew(draft: Profile, label: string): void;
  close(): void;
}

type Edit = (f: (p: Profile) => Profile) => void;
/** Rend le focus après un geste : la barre touchée est redessinée (nouvel objet), l'élément focalisé a disparu. */
type Refocus = (find: (root: HTMLElement) => HTMLElement | undefined) => void;

const DOCK_LABELS: Readonly<Record<Dock, string>> = { top: "En haut", bottom: "En bas", left: "À gauche", right: "À droite", floating: "Flottante" };
const SIZE_LABELS: Readonly<Record<ButtonSize, string>> = { s: "Petits", m: "Moyens", l: "Grands" };
const START_LABELS: Readonly<Record<StartMode, string>> = { board: "Tableau", "desktop-annotation": "Annotation du bureau" };
const ROLE_LABELS: Readonly<Record<string, string>> = { tools: "Barre d'outils", pages: "Barre des pages" };
const UNKNOWN = "inconnu (version plus récente)";
/** Champ de préréglage → modification (table : couleur en texte, épaisseur en nombre). */
const PATCH: Readonly<Record<PresetField["key"], (raw: string) => PresetPatch>> = {
  color: (raw) => ({ color: raw }),
  width: (raw) => ({ width: Number(raw) }),
};

/** Fixe la valeur d'un `select` une fois ses options posées, puis à chaque changement (fiable, contrairement à `selected`). */
const syncValue = (el: HTMLSelectElement, value: () => string): void => {
  createEffect(() => {
    el.value = value();
  });
};
const pick = <T extends string>(list: readonly T[], v: string): T | undefined => list.find((x) => x === v);
const roleLabel = (bar: Toolbar): string => (Object.hasOwn(ROLE_LABELS, bar.role) ? ROLE_LABELS[bar.role]! : `Barre ${bar.id}`);
const itemName = (it: ToolItem): string => (it.kind === "separator" ? "Séparateur" : it.label || it.id);
const toolName = (tool: string): string => (Object.hasOwn(TOOL_TABLE, tool) ? TOOL_TABLE[tool]!.label : tool);
const entryKey = (e: CatalogEntry): string => `${e.kind}:${e.ref}`;
const byData = (root: HTMLElement, attr: string, key: string, value: string): HTMLElement | undefined =>
  [...root.querySelectorAll<HTMLElement>(`[${attr}]`)].find((el) => el.dataset[key] === value);
/** Commande `control` de la ligne `itemId` ; grisée (ligne en tête ou en fin) : le premier bouton actif de la ligne. */
const rowControl = (itemId: string, control: string) => (root: HTMLElement): HTMLElement | undefined => {
  const row = byData(root, "data-edit-item", "editItem", itemId);
  if (row === undefined) return undefined;
  const wanted = row.querySelector<HTMLButtonElement | HTMLInputElement>(`[data-edit="${control}"]`);
  if (wanted !== null && !wanted.disabled) return wanted;
  return row.querySelector<HTMLElement>("button:not([disabled])") ?? undefined;
};
/** Sélecteur d'emplacement de la barre `barId`. */
const dockControl = (barId: string) => (root: HTMLElement): HTMLElement | undefined =>
  byData(root, "data-edit-bar", "editBar", barId)?.querySelector<HTMLElement>('select[data-edit="dock"]') ?? undefined;

function ItemRow(props: { barId: string; item: ToolItem; index: number; last: number; edit: Edit; refocus: Refocus }): JSX.Element {
  const known = isKnownItem(props.item);
  const name = itemName(props.item);
  return (
    <li data-edit-item={props.item.id} data-unknown={known ? undefined : ""} aria-disabled={known ? undefined : "true"}>
      <label>
        <input
          type="checkbox"
          data-edit="shown"
          checked={props.item.hidden !== true}
          disabled={!canHide(props.item)}
          onChange={(e) => {
            const on = e.currentTarget.checked;
            props.edit((p) => setHidden(p, props.item.id, !on));
            props.refocus(rowControl(props.item.id, "shown"));
          }}
        />
        <span>{known ? name : `${name} — ${UNKNOWN}`}</span>
      </label>
      <button type="button" data-edit="up" aria-label={`Monter ${name}`} disabled={props.index === 0} onClick={() => { props.edit((p) => moveItem(p, props.barId, props.item.id, -1)); props.refocus(rowControl(props.item.id, "up")); }}>
        Monter
      </button>
      <button type="button" data-edit="down" aria-label={`Descendre ${name}`} disabled={props.index === props.last} onClick={() => { props.edit((p) => moveItem(p, props.barId, props.item.id, 1)); props.refocus(rowControl(props.item.id, "down")); }}>
        Descendre
      </button>
    </li>
  );
}

function BarFieldset(props: { bar: Toolbar; draft: Accessor<Profile>; edit: Edit; refocus: Refocus }): JSX.Element {
  const items = (): readonly ToolItem[] => props.bar.groups.flatMap((g) => g.items);
  const choices = (): readonly CatalogEntry[] => catalog(props.draft(), props.bar.id);
  const [picked, setChoice] = createSignal("");
  /** Choix affiché et agissant : celui de la liste, ou vide si l'entrée n'y est plus (même valeur pour le sélecteur et le bouton). */
  const choice = (): string => (choices().some((e) => entryKey(e) === picked()) ? picked() : "");
  const add = (): void => {
    const entry = choices().find((e) => entryKey(e) === choice());
    if (entry === undefined) return;
    props.edit((p) => addItem(p, props.bar.id, entry));
    setChoice("");
  };
  return (
    <fieldset data-edit-bar={props.bar.id}>
      <legend>{roleLabel(props.bar)}</legend>
      <label>
        Emplacement{" "}
        <select
          data-edit="dock"
          ref={(el) => syncValue(el, () => props.bar.dock)}
          onChange={(e) => {
            const dock = pick(DOCKS, e.currentTarget.value);
            if (dock === undefined) return;
            props.edit((p) => setDock(p, props.bar.id, dock));
            props.refocus(dockControl(props.bar.id));
          }}
        >
          <For each={DOCKS}>{(d) => <option value={d}>{DOCK_LABELS[d]}</option>}</For>
        </select>
      </label>
      <ul>
        <For each={items()}>
          {(it, i) => <ItemRow barId={props.bar.id} item={it} index={i()} last={items().length - 1} edit={props.edit} refocus={props.refocus} />}
        </For>
      </ul>
      <Show when={choices().length > 0}>
        <label>
          Ajouter{" "}
          <select data-edit="add-choice" ref={(el) => syncValue(el, choice)} onChange={(e) => setChoice(e.currentTarget.value)}>
            <option value="">Choisir…</option>
            <Index each={choices()}>{(c) => <option value={entryKey(c())}>{c().kind === "tool" ? `Outil : ${c().label}` : c().label}</option>}</Index>
          </select>
        </label>
        <button type="button" data-edit="add" disabled={choice() === ""} onClick={add}>
          Ajouter
        </button>
      </Show>
    </fieldset>
  );
}

function PresetInput(props: { tool: string; preset: Preset; field: PresetField; edit: Edit }): JSX.Element {
  return (
    <label>
      {props.field.label}{" "}
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
  return (
    <fieldset data-edit-presets={props.tool}>
      <legend>{toolName(props.tool)}</legend>
      <ul>
        {/* Index : la ligne et ses champs restent en place quand le préréglage change (le focus ne se perd pas). */}
        <Index each={list()}>
          {(p) => (
            <li data-edit-preset={p().id}>
              <label>
                Nom{" "}
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
              <For each={fields}>{(f) => <PresetInput tool={props.tool} preset={p()} field={f} edit={props.edit} />}</For>
              <button type="button" data-edit="preset-remove" aria-label={`Retirer ${p().label}`} onClick={() => props.edit((d) => removePreset(d, props.tool, p().id))}>
                Retirer
              </button>
            </li>
          )}
        </Index>
      </ul>
      <button type="button" data-edit="preset-add" onClick={() => props.edit((d) => addPreset(d, props.tool))}>
        Ajouter une couleur
      </button>
    </fieldset>
  );
}

export function ProfileEditor(props: ProfileEditorProps): JSX.Element {
  const [draft, setDraft] = createSignal<Profile>(props.profile);
  const [newName, setNewName] = createSignal(`${props.profile.label} (copie)`);
  const edit: Edit = (f) => void setDraft((p) => f(p));
  let root: HTMLDivElement | undefined;
  // Après le redessin (microtâche) : le focus revient sur la commande repérée dans le nouveau DOM.
  const refocus: Refocus = (find) =>
    queueMicrotask(() => {
      if (root !== undefined) find(root)?.focus();
    });
  return (
    <div ref={root} class="rb-editor" data-profile-editor role="dialog" aria-label="Modifier le profil">
      <section data-edit-section="general">
        <h3>Général</h3>
        <label>
          Nom{" "}
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
        <label>
          Démarrage{" "}
          <select
            data-edit="start-mode"
            ref={(el) => syncValue(el, () => draft().behavior.startMode)}
            onChange={(e) => {
              const mode = pick(START_MODES, e.currentTarget.value);
              if (mode !== undefined) edit((p) => setStartMode(p, mode));
            }}
          >
            <For each={START_MODES}>{(m) => <option value={m}>{START_LABELS[m]}</option>}</For>
          </select>
        </label>
        <label>
          Taille des boutons{" "}
          <select
            data-edit="button-size"
            ref={(el) => syncValue(el, () => draft().interface.buttonSize)}
            onChange={(e) => {
              const size = pick(BUTTON_SIZES, e.currentTarget.value);
              if (size !== undefined) edit((p) => setButtonSize(p, size));
            }}
          >
            <For each={BUTTON_SIZES}>{(s) => <option value={s}>{SIZE_LABELS[s]}</option>}</For>
          </select>
        </label>
      </section>
      <section data-edit-section="bars">
        <h3>Barres</h3>
        <For each={draft().toolbars}>{(bar) => <BarFieldset bar={bar} draft={draft} edit={edit} refocus={refocus} />}</For>
        <button type="button" data-edit="reset-bars" onClick={() => edit((p) => resetToolbars(p, props.origin))}>
          Rétablir les barres
        </button>
      </section>
      <section data-edit-section="presets">
        <h3>Préréglages</h3>
        <For each={PRESET_TOOLS}>{(tool) => <PresetList tool={tool} draft={draft} edit={edit} />}</For>
        <button type="button" data-edit="reset-presets" onClick={() => edit((p) => resetAllPresets(p, props.origin))}>
          Rétablir les préréglages
        </button>
      </section>
      <div class="rb-editor-actions">
        <button type="button" data-edit="save" disabled={draft().label.trim() === ""} onClick={() => props.save(draft())}>
          Enregistrer
        </button>
        <label>
          Nom du nouveau profil{" "}
          <input type="text" data-edit="new-name" value={newName()} onInput={(e) => setNewName(e.currentTarget.value)} />
        </label>
        <button type="button" data-edit="save-new" disabled={newName().trim() === ""} onClick={() => props.saveAsNew(draft(), newName().trim())}>
          Enregistrer comme nouveau
        </button>
        <button type="button" data-edit="close" onClick={() => props.close()}>
          Fermer
        </button>
      </div>
    </div>
  );
}
