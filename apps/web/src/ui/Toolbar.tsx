import { For, Show, createMemo, onCleanup, onMount, type Accessor, type JSX } from "solid-js";
import { listenWebDrop } from "../platform/drop-web";
import type { ToolbarHost } from "../app/toolbar-host";
import {
  presetsOf,
  TOOL_TABLE,
  visibleItems,
  type ButtonSize,
  type Preset,
  type RuntimeCapabilities,
  type Toolbar as Bar,
  type ToolId,
  type ToolItem,
} from "../toolbar";
import { itemState, type ToolbarView } from "./item-state";

/** Préréglages d'un profil, par outil (`Profile["presets"]`). */
export type PresetTable = Readonly<Record<ToolId, readonly Preset[]>>;

export interface ToolbarProps {
  readonly bar: Bar;
  readonly caps: Accessor<RuntimeCapabilities>;
  readonly view: Accessor<ToolbarView>;
  readonly size: Accessor<ButtonSize>;
  readonly host: ToolbarHost;
  /** Préréglages du profil : une barre de rôle `tools` montre ceux de l'outil actif en fin de barre (C1, P18). */
  readonly presets?: Accessor<PresetTable>;
}

interface Ctx { readonly view: Accessor<ToolbarView>; readonly host: ToolbarHost }

function Button(props: { item: ToolItem; ctx: Ctx; onPress: () => void }): JSX.Element {
  const st = createMemo(() => itemState(props.item, props.ctx.view()));
  return (
    <button
      type="button"
      data-item={props.item.id}
      aria-pressed={st().pressed ?? undefined}
      disabled={st().disabled}
      onClick={() => props.onPress()}
    >
      {st().label}
    </button>
  );
}

function Drop(props: { item: ToolItem; ctx: Ctx }): JSX.Element {
  let el: HTMLDivElement | undefined;
  onMount(() => {
    const off = listenWebDrop(el ?? null, (files, at) => props.ctx.host.dropFiles(files, at));
    onCleanup(off);
  });
  return <div class="rb-drop" data-item={props.item.id} ref={el}>{props.item.label}</div>;
}

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
  action: (item, ctx) => <Button item={item} ctx={ctx} onPress={() => ctx.host.runAction(item.action ?? "")} />,
  dropzone: (item, ctx) => <Drop item={item} ctx={ctx} />,
  separator: () => <span class="rb-sep" role="separator" />,
};

/** Outil du profil dont le moteur publie le choix `choice` (lu dans `TOOL_TABLE`) ; null si aucun. */
function toolOf(choice: string): ToolId | null {
  return Object.keys(TOOL_TABLE).find((id) => TOOL_TABLE[id]!.choice === choice) ?? null;
}

/** Rangée contextuelle (C1, P18, P19) : un bouton `data-preset` par préréglage de l'outil actif, sans état enfoncé. */
function PresetRow(props: { presets: Accessor<PresetTable>; view: Accessor<ToolbarView>; host: ToolbarHost }): JSX.Element {
  const tool = createMemo(() => toolOf(props.view().tool));
  const list = createMemo((): readonly Preset[] => {
    const t = tool();
    return t === null ? [] : presetsOf(props.presets(), t);
  });
  const press = (presetId: string): void => {
    const t = tool();
    if (t !== null) props.host.setTool(t, presetId);
  };
  return (
    <Show when={list().length > 0}>
      <span class="rb-sep" role="separator" data-presets-sep />
      <For each={list()}>
        {(p) => (
          <button type="button" class="rb-preset" data-preset={p.id} title={p.label} onClick={() => press(p.id)}>
            <span class="rb-swatch" aria-hidden="true" style={{ "background-color": p.color ?? "transparent" }} />
            {p.label}
          </button>
        )}
      </For>
    </Show>
  );
}

export function Toolbar(props: ToolbarProps): JSX.Element {
  const items = createMemo(() => visibleItems(props.bar, props.caps()));
  const ctx: Ctx = { view: props.view, host: props.host };
  return (
    <div
      class="rb-bar"
      data-toolbar={props.bar.id}
      data-role={props.bar.role}
      data-dock={props.bar.dock}
      data-size={props.size()}
      role="toolbar"
      aria-label={props.bar.id}
    >
      <For each={items()}>{(item) => RENDER[item.kind](item, ctx)}</For>
      <Show when={props.bar.role === "tools"}>
        <PresetRow presets={() => props.presets?.() ?? {}} view={props.view} host={props.host} />
      </Show>
    </div>
  );
}
