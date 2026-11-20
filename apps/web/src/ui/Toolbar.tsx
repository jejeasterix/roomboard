import { For, createMemo, onCleanup, onMount, type Accessor, type JSX } from "solid-js";
import { listenWebDrop } from "../platform/drop-web";
import type { ToolbarHost } from "../app/toolbar-host";
import { visibleItems, type ButtonSize, type RuntimeCapabilities, type Toolbar as Bar, type ToolItem } from "../toolbar";
import { itemState, type ToolbarView } from "./item-state";

export interface ToolbarProps {
  readonly bar: Bar;
  readonly caps: Accessor<RuntimeCapabilities>;
  readonly view: Accessor<ToolbarView>;
  readonly size: Accessor<ButtonSize>;
  readonly host: ToolbarHost;
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
    </div>
  );
}
