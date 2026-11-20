/**
 * Application SolidJS (lot 5b, T95) : onglets, barres du profil actif placées selon leur `dock`, scène dans la case
 * centrale, barre des pages, panneau des réglages, menu des profils, ligne d'état `#etat`. Remplace la barre DOM du
 * lot 3-4, dont les barres en `position: absolute` recouvraient le haut de la scène : ici la grille
 * (`layoutFor`) réserve la case de chaque barre et la scène (`main.rb-stages`, conteneur des sessions) n'occupe que la
 * sienne ; seule une barre `floating` et les menus passagers (réglages, profils) se superposent (CL5b-10).
 */
import { createMemo, createSignal, For, onCleanup, Show, type JSX } from "solid-js";
import { render } from "solid-js/web";
import { createLocalToolbarHost } from "../app/toolbar-host";
import type { TabSession, Workspace } from "../app/workspace";
import type { EngineState } from "../engine/engine";
import type { SettingsStore } from "../engine/settings";
import type { ShellPort } from "../platform/files";
import type { ProfileStore } from "../profile-store";
import { visibleItems, type Toolbar as Bar } from "../toolbar";
import type { ActiveProfile } from "./active-profile";
import { layoutFor } from "./layout";
import { PagesBar } from "./PagesBar";
import { ProfileMenu } from "./ProfileMenu";
import { SettingsPanel } from "./SettingsPanel";
import { TabsBar, type TabView } from "./TabsBar";
import { Toolbar } from "./Toolbar";
import "./rb.css";

export interface AppProps {
  readonly workspace: Workspace;
  readonly active: ActiveProfile;
  readonly store: ProfileStore;
  readonly settings: SettingsStore;
  readonly notes: readonly string[];
  readonly shell: ShellPort;
  /** Conteneur des scènes (`<main class="rb-stages">`), créé par l'amorce avant le premier onglet : les sessions y
   *  posent leur scène et leur zone de texte (`SessionShared.container`) ; l'application le place dans la case `stage`. */
  readonly stages: HTMLElement;
  navigate(search: string): void;
}

type Panel = "settings" | "profiles";

export function App(props: AppProps): JSX.Element {
  const ws = props.workspace;
  // Onglets et fichiers ne sont pas réactifs : une impulsion relit la liste à chaque changement signalé.
  const [tick, bump] = createSignal(undefined, { equals: false });
  const [state, setState] = createSignal<EngineState>(ws.active().board.engine.state());
  const [panel, setPanel] = createSignal<Panel | null>(null);

  /** Saisie de texte en cours dans la scène : le blur la fait valider par l'outil (CL4-3) et cache la zone. */
  const leaveEditing = (): void => {
    const focused = props.stages.ownerDocument.activeElement;
    if (focused instanceof HTMLElement && props.stages.contains(focused)) focused.blur();
  };

  let shown: TabSession | null = null;
  let stopState: (() => void) | null = null;
  const filesWatch = new Map<TabSession, () => void>();
  const follow = (): void => {
    const next = ws.tabs.active()?.session ?? null;
    if (next !== shown) {
      // Onglet changé hors de la barre des onglets (Nouveau, Ouvrir, dépôt, fermeture) : la zone quittée est validée.
      if (shown !== null) leaveEditing();
      stopState?.();
      shown = next;
      stopState = next === null ? null : next.board.engine.onState(setState);
      if (next !== null) setState(next.board.engine.state());
    }
    const alive = new Set(ws.tabs.list().map((t) => t.session));
    for (const [s, off] of filesWatch) {
      if (!alive.has(s)) {
        off();
        filesWatch.delete(s);
      }
    }
    for (const s of alive) if (!filesWatch.has(s)) filesWatch.set(s, s.files.onChange(() => bump()));
    bump();
  };
  follow();
  const stopTabs = ws.tabs.onChange(follow);
  onCleanup(() => {
    stopTabs();
    stopState?.();
    for (const off of filesWatch.values()) off();
    filesWatch.clear();
  });

  const tabs = (): readonly TabView[] => {
    tick();
    return ws.tabs.list().map((t) => ({ id: t.id, title: t.session.files.name(), dirty: t.session.files.isDirty(), kind: t.kind }));
  };
  const activeId = (): string | null => {
    tick();
    return ws.tabs.active()?.id ?? null;
  };
  const board = () => {
    tick();
    state();
    return ws.active().board;
  };

  const host = createLocalToolbarHost(
    {
      engine: () => ws.active().board.engine,
      runFile: (cmd) => void ws.active().files.run(cmd),
      importFiles: (files, at) => void ws.importFiles(files, at),
      toggle: (p) => setPanel((cur) => (cur === p ? null : p)),
    },
    () => props.active.profile(),
  );

  const profile = () => props.active.profile();
  const size = () => profile().interface.buttonSize;
  const docked = createMemo(() => profile().toolbars.filter((b) => b.dock !== "floating"));
  const floating = createMemo(() => profile().toolbars.filter((b) => b.dock === "floating"));
  const grid = createMemo(() => layoutFor(docked()));

  const toolbarOf = (bar: Bar): JSX.Element => (
    <Toolbar bar={bar} caps={props.active.capabilities} view={state} size={size} host={host} />
  );
  /** Rendu d'une barre selon son rôle (table) ; tout autre rôle est une barre d'outils. */
  const BY_ROLE: Readonly<Record<string, (bar: Bar) => JSX.Element>> = {
    pages: (bar) => (
      <PagesBar
        bar={bar}
        items={() => visibleItems(bar, props.active.capabilities())}
        view={state}
        size={size}
        runAction={(id) => host.runAction(id)}
        goTo={(index) => {
          const b = ws.active().board;
          const id = b.doc.pageIds()[index];
          if (id !== undefined) b.engine.showPage(id);
        }}
      />
    ),
  };
  const barOf = (bar: Bar): JSX.Element => (Object.hasOwn(BY_ROLE, bar.role) ? BY_ROLE[bar.role]! : toolbarOf)(bar);

  return (
    <div
      class="rb-layout"
      style={{ "grid-template-areas": grid().areas, "grid-template-columns": grid().columns, "grid-template-rows": grid().rows }}
    >
      <div class="rb-slot rb-head" style={{ "grid-area": "tabs" }}>
        <TabsBar
          tabs={tabs}
          active={activeId}
          activate={(id) => {
            leaveEditing(); // avant : la zone de l'onglet quitté ne reste ni visible ni ouverte à la frappe
            ws.tabs.activate(id);
          }}
          close={(id) => void ws.close(id)}
          newTab={() => void ws.newBlank()}
        />
        <p id="etat" role="status">{state().error ?? ""}</p>
      </div>
      <For each={docked()}>{(bar) => <div class="rb-slot" style={{ "grid-area": bar.id }}>{barOf(bar)}</div>}</For>
      {props.stages}
      <Show when={floating().length > 0}>
        <div class="rb-floating">
          <For each={floating()}>{(bar) => barOf(bar)}</For>
        </div>
      </Show>
      <Show when={panel() === "settings"}>
        <div class="rb-popover">
          <SettingsPanel
            store={props.settings}
            effective={() => board().effective()}
            notes={props.notes}
            diagnostics={() => board().choice.diagnostics()}
            search={() => props.stages.ownerDocument.defaultView?.location.search ?? ""}
            navigate={(search) => props.navigate(search)}
            anyDirty={() => ws.anyDirty()}
            confirm={(m) => props.shell.confirm(m)}
          />
        </div>
      </Show>
      <Show when={panel() === "profiles"}>
        <div class="rb-popover">
          <ProfileMenu
            profiles={() => props.store.list()}
            activeId={() => profile().id}
            canResetCurrent={() => false}
            canRemove={() => false}
            edit={() => undefined}
            importFile={() => undefined}
            exportActive={() => undefined}
            resetCurrent={() => undefined}
            remove={() => undefined}
            resetAll={() => undefined}
            choose={(id) => {
              props.active.choose(id);
              setPanel(null);
            }}
          />
        </div>
      </Show>
    </div>
  );
}

/** Monte l'application dans `root` (SolidJS reste dans `ui/`, D21) ; rend le démontage. */
export function mountApp(root: HTMLElement, props: AppProps): () => void {
  return render(() => <App {...props} />, root);
}

/**
 * Échec du démarrage : l'application n'est peut-être pas montée, donc `#etat` peut manquer ; il est alors créé dans
 * `body`. `body[data-erreur]` garde le message (lu par les essais).
 */
export function showStartError(d: Document, e: unknown): void {
  const message = e instanceof Error ? e.message : String(e);
  d.body.dataset["erreur"] = message;
  let etat = d.getElementById("etat");
  if (etat === null) {
    etat = d.createElement("p");
    etat.id = "etat";
    etat.setAttribute("role", "status");
    d.body.append(etat);
  }
  etat.textContent = `RoomBoard n'a pas pu démarrer : ${message}`;
}
