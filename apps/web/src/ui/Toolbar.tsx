import { For, Show, createMemo, onCleanup, onMount, type Accessor, type JSX } from "solid-js";
import { listenWebDrop } from "../platform/drop-web";
import type { ToolbarHost } from "../app/toolbar-host";
import {
  ACTION_TABLE,
  ANNOTATION_ROLE,
  FILL_NONE_LABEL,
  fillChoices,
  presetsOf,
  TABLE_ACTIONS,
  TABLE_FILLS,
  TOOL_TABLE,
  itemsForMode,
  type ActionId,
  type StartMode,
  type ButtonSize,
  type Preset,
  type RuntimeCapabilities,
  type Toolbar as Bar,
  type ToolId,
  type ToolItem,
} from "../toolbar";
import { DEFAULT_FILL_TOLERANCE } from "../engine/engine";
import { FormatRow } from "./FormatRow";
import { SelectionRow } from "./SelectionRow";
import { Icon, IconButton, TipBubble, tipPointerHandlers } from "./IconButton";
import { iconFor } from "./icons";
import { itemState, pagesLabel, type ToolbarView } from "./item-state";
import { padToPixel } from "./Island";
import { PointerSwitch } from "./PointerSwitch";
import { buttonShortcut } from "./shortcuts";
import { createTip } from "./tooltip";

/** Libellé du curseur du pot (C6b, B10). */
const FILL_TOLERANCE_LABEL = "Tolérance";

/** Préréglages d'un profil, par outil (`Profile["presets"]`). */
export type PresetTable = Readonly<Record<ToolId, readonly Preset[]>>;

export interface ToolbarProps {
  readonly bar: Bar;
  readonly caps: Accessor<RuntimeCapabilities>;
  readonly view: Accessor<ToolbarView>;
  readonly size: Accessor<ButtonSize>;
  readonly host: ToolbarHost;
  /** Préréglages du profil : une barre de rôle `tools` ou `annotation` montre ceux de l'outil actif en fin de barre
   *  (C1, P18 ; design-l4, L4-4). */
  readonly presets?: Accessor<PresetTable>;
  /** C11a (P7, P19) : mode de la fenêtre ; absent : tableau. */
  readonly mode?: Accessor<StartMode>;
  /** design-l2 (L2-8) : barre repliée dans son îlot (poignée et Déplier seuls) ; absent : dépliée. */
  readonly collapsed?: Accessor<boolean>;
}

interface Ctx { readonly view: Accessor<ToolbarView>; readonly host: ToolbarHost }

/** design-l4 (L4-10) : actions rendues en boutons pleins (fond violet, icône blanche), accolées quand elles se suivent. */
const PRIMARY_ACTIONS: ReadonlySet<ActionId> = new Set(["annotation-send", "annotation-send-new"]);
/** design-l4 (L4-11) : icône de la zone de dépôt (Lucide file-down). */
const DROP_ICON = "drop";

function Button(props: { item: ToolItem; ctx: Ctx; onPress: () => void }): JSX.Element {
  const st = createMemo(() => itemState(props.item, props.ctx.view()));
  const primary = props.item.kind === "action" && PRIMARY_ACTIONS.has(props.item.action ?? "");
  const keys = props.item.kind === "action" ? buttonShortcut(props.item.action) : null;
  return (
    <IconButton
      icon={iconFor(props.item, st().icon)}
      label={st().label}
      pressed={st().pressed}
      disabled={st().disabled}
      shortcut={keys}
      attrs={primary ? { "data-item": props.item.id, class: "rb-primary" } : { "data-item": props.item.id }}
      onPress={() => props.onPress()}
    />
  );
}

/** Zone de dépôt (design-l4, L4-11) : icône, libellé en `rb-sr` (le `textContent` reste le libellé), infobulle de L1. */
function Drop(props: { item: ToolItem; ctx: Ctx }): JSX.Element {
  let el: HTMLDivElement | undefined;
  const tip = createTip();
  onMount(() => {
    const off = listenWebDrop(el ?? null, (files, at) => props.ctx.host.dropFiles(files, at), { stopPropagation: true });
    onCleanup(off);
  });
  return (
    <>
      <div
        class="rb-drop"
        data-item={props.item.id}
        ref={el}
        {...tipPointerHandlers(tip)}
      >
        <Icon name={DROP_ICON} />
        <span class="rb-sr">{props.item.label}</span>
      </div>
      <TipBubble tip={tip} label={props.item.label} anchor={() => el!} />
    </>
  );
}

/** personnalisation-1a (T6, décisions 25, 27) : compteur « 2 / 5 » de la barre d'outils, bouton à icône qui ouvre la barre
 *  latérale. Il porte `#pages` (unique tant que PagesBar existe : elle ne rend plus le sien sans Précédente/Suivante) ;
 *  son nom accessible est le compteur, l'infobulle garde le libellé de l'action. */
function PageCounter(props: { item: ToolItem; ctx: Ctx }): JSX.Element {
  const st = createMemo(() => itemState(props.item, props.ctx.view()));
  const text = createMemo(() => pagesLabel(props.ctx.view()));
  const tip = createTip();
  const keys = buttonShortcut(props.item.action);
  let button: HTMLButtonElement | undefined;
  return (
    <>
      <button
        id="pages"
        ref={button}
        type="button"
        class="rb-pages-count"
        data-item={props.item.id}
        aria-label={text()}
        aria-pressed={st().pressed ?? undefined}
        aria-keyshortcuts={keys?.aria ?? undefined}
        disabled={st().disabled}
        onClick={() => props.ctx.host.runAction(props.item.action ?? "")}
        {...tipPointerHandlers(tip)}
        onBlur={() => tip.blur(document.hasFocus())}
      >
        <Icon name={iconFor(props.item, st().icon) ?? ""} />
        <span ref={(el) => onCleanup(padToPixel(el))}>{text()}</span>
      </button>
      <TipBubble tip={tip} label={st().label} anchor={() => button!} keys={keys?.text} />
    </>
  );
}

/** design-l4 (L4-8) : rendu propre à une action (table indexée par l'action, jamais un test sur l'identifiant) ;
 *  absente : bouton. */
const ACTION_RENDER: Readonly<Record<ActionId, (item: ToolItem, ctx: Ctx) => JSX.Element>> = {
  "annotation-pointer": (item, ctx) => <PointerSwitch item={item} view={ctx.view} host={ctx.host} />,
  "page-number": (item, ctx) => <PageCounter item={item} ctx={ctx} />,
};

/** Rendu par sorte d'élément (table, jamais un branchement sur l'identifiant). */
const RENDER: Readonly<Record<ToolItem["kind"], (item: ToolItem, ctx: Ctx) => JSX.Element>> = {
  tool: (item, ctx) => {
    const preset = typeof item.options?.preset === "string" ? item.options.preset : undefined;
    return (
      <Button
        item={item}
        ctx={ctx}
        onPress={() => (preset === undefined ? ctx.host.setTool(item.tool ?? "") : ctx.host.setTool(item.tool ?? "", preset))}
      />
    );
  },
  action: (item, ctx) => {
    const own = item.action !== undefined && Object.hasOwn(ACTION_RENDER, item.action) ? ACTION_RENDER[item.action] : undefined;
    return own !== undefined ? own(item, ctx) : <Button item={item} ctx={ctx} onPress={() => ctx.host.runAction(item.action ?? "")} />;
  },
  dropzone: (item, ctx) => <Drop item={item} ctx={ctx} />,
  separator: () => <span class="rb-sep" role="separator" />,
};

/** Outil du profil dont le moteur publie le choix `choice` (lu dans `TOOL_TABLE`) ; null si aucun. */
function toolOf(choice: string): ToolId | null {
  return Object.keys(TOOL_TABLE).find((id) => TOOL_TABLE[id]!.choice === choice) ?? null;
}

/** Rangée contextuelle (C1, P18, P19) : un bouton `data-preset` par préréglage de l'outil actif, sans état enfoncé.
 * Pot actif (C6a, D16) : ses couleurs (`fillChoices`), puis « Aucune » (`data-fill-none`).
 * C6b (B10) : puis le curseur de tolérance (`data-fill-tolerance`). */
function PresetRow(props: { presets: Accessor<PresetTable>; view: Accessor<ToolbarView>; host: ToolbarHost }): JSX.Element {
  const tool = createMemo(() => toolOf(props.view().tool));
  const isFill = createMemo(() => tool() === "fill");
  const tolerance = createMemo(() => props.view().fillTolerance ?? DEFAULT_FILL_TOLERANCE);
  const list = createMemo((): readonly { readonly id: string; readonly label: string; readonly color?: string }[] => {
    const t = tool();
    if (t === null) return [];
    return t === "fill" ? fillChoices(props.presets()) : presetsOf(props.presets(), t);
  });
  const press = (presetId: string): void => {
    const t = tool();
    if (t !== null) props.host.setTool(t, presetId);
  };
  return (
    <Show when={list().length > 0 || isFill()}>
      <span class="rb-sep" role="separator" data-presets-sep />
      <For each={list()}>
        {(p) => (
          <IconButton icon={null} label={p.label} attrs={{ class: "rb-preset", "data-preset": p.id }} onPress={() => press(p.id)}>
            <span class="rb-swatch" aria-hidden="true" style={{ "background-color": p.color ?? "transparent" }} />
          </IconButton>
        )}
      </For>
      <Show when={isFill()}>
        <IconButton icon={null} label={FILL_NONE_LABEL} attrs={{ class: "rb-preset", "data-fill-none": "" }} onPress={() => props.host.fillColor(null)}>
          <span class="rb-swatch" aria-hidden="true" style={{ "background-color": "transparent" }} />
        </IconButton>
        <label class="rb-fill-tolerance" title={`${FILL_TOLERANCE_LABEL} ${tolerance()}`}>
          <span class="rb-fill-tolerance-label">{FILL_TOLERANCE_LABEL}</span>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            data-fill-tolerance
            aria-label={FILL_TOLERANCE_LABEL}
            value={tolerance()}
            onInput={(e) => props.host.fillTolerance(Number(e.currentTarget.value))}
          />
          <span data-fill-tolerance-value>{tolerance()}</span>
        </label>
      </Show>
    </Show>
  );
}

/** Action fabriquée pour l'état des boutons du tableau : même table `ACTION_STATE` qu'une action de profil. */
const tableItem = (id: string): ToolItem => ({ id, kind: "action", action: id, label: ACTION_TABLE[id]?.label ?? id, requires: [], rest: {} });

/** Rangée du tableau (C10a, T10, DAC4) : outil Tableau actif, à la place des préréglages ; cinq actions, puis les pastilles. */
function TableActionRow(props: { view: Accessor<ToolbarView>; host: ToolbarHost }): JSX.Element {
  return (
    <Show when={props.view().tool === TOOL_TABLE["table"]?.choice}>
      <span class="rb-sep" role="separator" data-table-sep />
      <For each={TABLE_ACTIONS}>
        {(id) => {
          const item = tableItem(id);
          const st = createMemo(() => itemState(item, props.view()));
          return (
            <IconButton
              icon={iconFor(item, st().icon)}
              label={st().label}
              disabled={st().disabled}
              attrs={{ "data-table-action": id }}
              onPress={() => props.host.runAction(id)}
            />
          );
        }}
      </For>
      <For each={TABLE_FILLS}>
        {(f) => (
          <IconButton
            icon={null}
            label={f.label}
            disabled={!props.view().tableCell}
            attrs={{ class: "rb-preset", "data-table-fill": f.id }}
            onPress={() => props.host.tableFill(f.color)}
          >
            <span class="rb-swatch rb-swatch-square" aria-hidden="true" style={{ "background-color": f.color ?? "transparent" }} />
          </IconButton>
        )}
      </For>
    </Show>
  );
}

/** C1 (P18), design-l4 (L4-4) : rôles qui portent les rangées contextuelles (préréglages, tableau, sélection, format). */
const CONTEXT_ROLES: ReadonlySet<string> = new Set(["tools", ANNOTATION_ROLE]);

export function Toolbar(props: ToolbarProps): JSX.Element {
  const items = createMemo(() => itemsForMode(props.bar, props.caps(), props.mode?.() ?? "board"));
  const ctx: Ctx = { view: props.view, host: props.host };
  /** Rangées contextuelles (C1 P18, C10a, C3, C7b) ; design-l2 (L2-13) : en `floating`, dans un îlot séparé posé sous la
   *  barre par Island.tsx, toujours à l'intérieur de [data-toolbar] ; en bande, inchangées dans la barre. */
  const rows = (): JSX.Element => (
    <>
      <Show when={props.presets !== undefined}>
        <PresetRow presets={() => props.presets?.() ?? {}} view={props.view} host={props.host} />
      </Show>
      <TableActionRow view={props.view} host={props.host} />
      <SelectionRow view={props.view} host={props.host} />
      <FormatRow view={props.view} act={(a) => props.host.textFormat(a)} />
    </>
  );
  return (
    <div
      class="rb-bar"
      data-toolbar={props.bar.id}
      data-role={props.bar.role}
      data-dock={props.bar.dock}
      data-size={props.size()}
      data-collapsed={props.collapsed?.() === true ? "1" : undefined}
      role="toolbar"
      aria-label={props.bar.id}
    >
      <For each={items()}>{(item) => RENDER[item.kind](item, ctx)}</For>
      <Show when={CONTEXT_ROLES.has(props.bar.role)}>
        <Show when={props.bar.dock === "floating"} fallback={rows()}>
          <div class="rb-context" data-island-context>
            {rows()}
          </div>
        </Show>
      </Show>
    </div>
  );
}
