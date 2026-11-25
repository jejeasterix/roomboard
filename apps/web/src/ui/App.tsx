/**
 * Application SolidJS (lot 5b, T95) : onglets, barres du profil actif placées selon leur `dock`, scène dans la case
 * centrale, barre des pages, panneau des réglages, panneau de la grille (C9 éditeur), menu des profils, ligne d'état `#etat`. Remplace la barre DOM du
 * lot 3-4, dont les barres en `position: absolute` recouvraient le haut de la scène : ici la grille
 * (`layoutFor`) réserve la case de chaque barre et la scène (`main.rb-stages`, conteneur des sessions) n'occupe que la
 * sienne ; seule une barre `floating` et les menus passagers (réglages, profils) se superposent (CL5b-10).
 */
import { createEffect, createMemo, createSignal, For, on, onCleanup, Show, type JSX } from "solid-js";
import { render } from "solid-js/web";
import { specOf, type BoardSession } from "../app/board-session";
import type { ImageData } from "../core/api";
import type { DeviceSettings } from "../device-settings";
import { createProfileActions } from "../app/profile-actions";
import { createLocalToolbarHost, type ToolbarHost } from "../app/toolbar-host";
import type { AnnotationControl, AnnotationState, PointerMode } from "../platform/annotation-port";
import type { TabSession, Workspace } from "../app/workspace";
import type { EngineState } from "../engine/engine";
import type { SettingsStore } from "../engine/settings";
import type { ShellPort } from "../platform/files";
import type { ProfileFiles } from "../platform/profile-files";
import { originOf } from "../profile-edit";
import type { ProfileStore } from "../profile-store";
import { ANNOTATION_ROLE, annotationBarOf, resolveStartMode, visibleItems, type Profile, type StartMode, type Toolbar as Bar } from "../toolbar";
import { BUILTIN_PROFILES } from "../toolbar-profiles";
import type { ActiveProfile } from "./active-profile";
import { layoutFor } from "./layout";
import { MediaBar, type MediaControls } from "./MediaBar";
import { Model3dBar, type Model3dControls } from "./Model3dBar";
import { NO_WEBGL_MESSAGE } from "../platform/model3d-import";
import { MODEL3D_FAILED_MESSAGE } from "../platform/model-sessions";
import { PagesBar } from "./PagesBar";
import { ProfileEditor } from "./ProfileEditor";
import { ProfileMenu } from "./ProfileMenu";
import { GridPanel } from "./GridPanel";
import { ImagePanel } from "./ImagePanel";
import { LibraryPanel, type SharedFolder } from "./LibraryPanel";
import type { ResourceLibrary } from "../app/library";
import type { TypedFiles } from "../platform/typed-files";
import { SettingsPanel } from "./SettingsPanel";
import { TabsBar, type TabView } from "./TabsBar";
import type { ToolbarView } from "./item-state";
import { Toolbar } from "./Toolbar";
import { Toasts } from "./Toasts";
import { clearToast } from "./toast";
import "./rb.css";

/** C11a (P21) : annotation de bureau ; absente (web, tests anciens) : tableau seul. */
export interface AnnotationUi {
  readonly control: AnnotationControl;
  /** Hôte de barre en annotation (commandes vers `annotate`), bâti sur l'hôte local. */
  remote(local: ToolbarHost): ToolbarHost;
  /** Vue de barre publiée par `annotate`. */
  onView(cb: (v: ToolbarView) => void): () => void;
}

export interface AppProps {
  /** C11a : annotation de bureau ; absente : tableau seul. */
  readonly annotation?: AnnotationUi;
  readonly workspace: Workspace;
  readonly active: ActiveProfile;
  readonly store: ProfileStore;
  readonly settings: SettingsStore;
  readonly notes: readonly string[];
  readonly shell: ShellPort;
  /** Choix et écriture des fichiers `.rbprofile` (C1, P25) : boîtes natives dans la coque, repli web ailleurs. */
  readonly profileFiles: ProfileFiles;
  /** Conteneur des scènes (`<main class="rb-stages">`), créé par l'amorce avant le premier onglet : les sessions y
   *  posent leur scène et leur zone de texte (`SessionShared.container`) ; l'application le place dans la case `stage`. */
  readonly stages: HTMLElement;
  navigate(search: string): void;
  /** C4 : bibliothèque ; absente (tests anciens) : le bouton n'ouvre rien. */
  readonly library?: { readonly library: ResourceLibrary; readonly shared: SharedFolder; readonly packs: TypedFiles };
  /** design-l4 (L4-14) : réglages de l'appareil ; donnés au panneau Réglages seulement avec la capacité d'annotation
   *  (H10) ; absents (tests anciens) : aucun bouton du cadre. */
  readonly device?: DeviceSettings;
}

type Panel = "settings" | "profiles" | "editor" | "grid" | "image" | "library";

export function App(props: AppProps): JSX.Element {
  const ws = props.workspace;
  // Onglets et fichiers ne sont pas réactifs : une impulsion relit la liste à chaque changement signalé.
  const [tick, bump] = createSignal(undefined, { equals: false });
  const [state, setState] = createSignal<EngineState>(ws.active().board.engine.state());
  const [panel, setPanel] = createSignal<Panel | null>(null);
  /** design-l3 (L3-3, DA-L3-3) : brouillon de l'éditeur montré par la page ; null : le profil enregistré. Rien n'est écrit :
   *  `main.ts`, le magasin et l'annotation lisent toujours le profil actif. */
  const [previewProfile, setPreviewProfile] = createSignal<Profile | null>(null);
  /** Profil montré (barres, taille, préréglages, hôte local) : le brouillon pendant l'édition, sinon le profil actif. */
  const shownProfile = (): Profile => previewProfile() ?? props.active.profile();
  /** L3-4 : vrai entre un choix fait dans le sélecteur du panneau et le montage suivant de l'éditeur (focus au sélecteur). */
  let profileFocus = false;
  const takeProfileFocus = (): boolean => {
    const f = profileFocus;
    profileFocus = false;
    return f;
  };

  /** Saisie de texte en cours dans la scène : le blur la fait valider par l'outil (CL4-3) et cache la zone. */
  const leaveEditing = (): void => {
    const focused = props.stages.ownerDocument.activeElement;
    if (focused instanceof HTMLElement && props.stages.contains(focused)) focused.blur();
  };

  // Lecteurs de l'onglet montré (C14) : leurs changements relisent l'état de la barre du média.
  const [mediaTick, bumpMedia] = createSignal(undefined, { equals: false });
  let shown: TabSession | null = null;
  let stopState: (() => void) | null = null;
  let stopMedia: (() => void) | null = null;
  const filesWatch = new Map<TabSession, () => void>();
  const follow = (): void => {
    const next = ws.tabs.active()?.session ?? null;
    if (next !== shown) {
      // Onglet changé hors de la barre des onglets (Nouveau, Ouvrir, dépôt, fermeture) : la zone quittée est validée.
      if (shown !== null) leaveEditing();
      stopState?.();
      stopMedia?.();
      shown = next;
      stopState = next === null ? null : next.board.engine.onState(setState);
      stopMedia = next === null ? null : next.board.media.onChange(() => bumpMedia());
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
  const stopClipboard = ws.onClipboard(() => bump());
  onCleanup(() => {
    stopClipboard();
    stopTabs();
    stopState?.();
    stopMedia?.();
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

  /** Média seul sélectionné de l'onglet actif (C14) ; relu à chaque état du moteur et du changement d'onglet. */
  const selectedMedia = () => {
    tick();
    state();
    return ws.active().board.selectedMedia();
  };
  /** Objet 3D seul sélectionné de l'onglet actif (C15, X24) ; relu à chaque état du moteur et changement d'onglet. */
  const selectedModel3d = () => {
    tick();
    state();
    return ws.active().board.selectedModel3d();
  };
  /** Commandes de la barre 3D : toujours sur la session active et l'objet sélectionné au moment du geste. */
  const model3dControls: Model3dControls = {
    status: () => {
      const b = ws.active().board;
      const m = b.selectedModel3d();
      return m === null ? "instantane" : b.modelState(m.id);
    },
    message: () => {
      const s = model3dControls.status();
      return s === "sans-webgl" ? NO_WEBGL_MESSAGE : s === "echec" ? MODEL3D_FAILED_MESSAGE : null;
    },
    toggle: () => void ws.active().board.toggleOrbit(),
    reset: () => void ws.active().board.resetModelView(),
  };
  /** Commandes de la barre du média (C14, M22) : toujours sur la session active et le média sélectionné au moment du geste. */
  const mediaControls: MediaControls = {
    status: () => {
      mediaTick();
      const m = selectedMedia();
      return m === null ? "poster" : (ws.active().board.mediaState(m.id)?.status ?? "poster");
    },
    time: () => {
      mediaTick();
      const m = selectedMedia();
      return m === null ? 0 : (ws.active().board.mediaState(m.id)?.time ?? 0);
    },
    toggle: () => {
      const m = selectedMedia();
      if (m !== null) void ws.active().board.media.toggle(m.id, specOf(m.media));
    },
    seek: (t) => {
      const m = selectedMedia();
      if (m !== null) void ws.active().board.media.seek(m.id, t, specOf(m.media));
    },
    set: (settings) => {
      const m = selectedMedia();
      if (m === null) return "aucun média sélectionné";
      const b = ws.active().board;
      return b.engine.run({ type: "SetMedia", id: m.id, ...settings }) === null ? (b.engine.state().error ?? "réglage refusé") : null;
    },
  };

  /** Séance de la grille (E8, CR3) : moteur `b` figé à l'ouverture (jamais `ws.active()` au rappel : chaque onglet a son
   *  moteur) ; le démontage de `GridPanel` coupe l'aperçu sur ce moteur-là. */
  const gridPanelFor = (b: BoardSession): JSX.Element => (
    <GridPanel
      initial={b.doc.page(b.engine.state().page)?.grid ?? null}
      preview={(g) => b.engine.previewGrid(g)}
      endPreview={() => b.engine.endGridPreview()}
      apply={(grid) => {
        // Refus du cœur : message dans #etat et rendu au panneau, resté ouvert, aperçu gardé (PC1, CR6).
        if (b.engine.run({ type: "SetGrid", page: b.engine.state().page, grid }) === null) {
          return b.engine.state().error ?? "grille refusée";
        }
        setPanel(null);
        return null;
      }}
      cancel={() => setPanel(null)}
    />
  );
  /** Onglet, page ou version qui change pendant la séance (annuler, rétablir, autre écriture) : panneau fermé (E8). */
  const sessionKey = createMemo(() => `${activeId() ?? ""}|${state().page}|${state().version}`);
  createEffect(
    on(
      sessionKey,
      () => {
        if (panel() === "grid") setPanel(null);
      },
      { defer: true },
    ),
  );
  /** Panneau de l'image (C5, I25, I31) : l'image sélectionnée seule à l'ouverture ; fermé si l'onglet, la page ou la
   *  sélection changent, ou si l'image disparaît ; une écriture ne le ferme pas (au contraire de la grille). */
  const [imageTarget, setImageTarget] = createSignal<string | null>(null);
  createEffect(
    on(panel, (p) => {
      if (p !== "image") return;
      const id = state().selectionImage ?? null;
      setImageTarget(id);
      if (id === null) setPanel(null);
    }),
  );
  const imageKey = createMemo(() => `${activeId() ?? ""}|${state().page}|${state().selectionImage ?? ""}`);
  createEffect(
    on(
      imageKey,
      () => {
        if (panel() === "image") setPanel(null);
      },
      { defer: true },
    ),
  );
  /** Séance de retouche du moteur `b` (figé à l'ouverture, comme la grille) ; démontée : séance fermée. */
  const imagePanelFor = (b: BoardSession, id: string): JSX.Element => {
    const edit = b.engine.editImage(id);
    if (edit === null) return null;
    const image = (): ImageData | null => {
      state();
      const el = b.doc.element(id);
      return el?.kind === "image" ? el.image : null;
    };
    return <ImagePanel image={image} version={() => state().version} tick={state} edit={edit} close={() => setPanel(null)} />;
  };

  // C11a : état de l'annotation et vue de barre venue de `annotate`.
  const ann = props.annotation;
  const [annState, setAnnState] = createSignal<AnnotationState>(ann?.control.state() ?? { active: false, pointer: "draw", screen: null, screens: 1 });
  const [remoteView, setRemoteView] = createSignal<ToolbarView | null>(null);
  if (ann !== undefined) {
    const offChange = ann.control.onChange(() => setAnnState(ann.control.state()));
    const offView = ann.onView(setRemoteView);
    onCleanup(() => {
      offChange();
      offView();
    });
  }
  const annotating = (): boolean => annState().active;
  // La vue de `annotate` est périmée dès la sortie : à la réentrée, elle attend sa première publication.
  createEffect(on(annotating, (a) => { if (!a) setRemoteView(null); }));
  const mode = (): StartMode => (annotating() ? "desktop-annotation" : "board");

  const local = createLocalToolbarHost(
    {
      engine: () => ws.active().board.engine,
      runFile: (cmd) => void ws.active().files.run(cmd),
      // P17 : un dépôt HTML5 sur la zone en annotation va au contrôleur (sortie d'abord) ; sinon l'import ordinaire.
      importFiles: (files, at) => void (ann !== undefined && annotating() ? ann.control.dropOnZone(files, at ?? null) : ws.importFiles(files, at)),
      insertPages: () => void ws.insertPages(),
      exportPdf: () => void ws.exportPdf(),
      exportBoard: (format) => void ws.exportBoard(format),
      editOriginal: () => void ws.editOriginal(),
      selection: (a) => ws.selection(a),
      toggle: (p) => setPanel((cur) => (cur === p ? null : p)),
      ...(ann === undefined ? {} : { annotation: ann.control }),
    },
    shownProfile,
  );
  const remote = ann === undefined ? local : ann.remote(local);
  /** P21 : en annotation, la barre parle à `annotate` ; sinon au moteur local. */
  const pick = (): ToolbarHost => (annotating() ? remote : local);
  const host: ToolbarHost = {
    setTool: (tool, preset) => pick().setTool(tool, preset),
    runAction: (id) => pick().runAction(id),
    dropFiles: (files, at) => pick().dropFiles(files, at),
    setMode: (m) => pick().setMode(m),
    tableFill: (f) => pick().tableFill(f),
    fillColor: (c) => pick().fillColor(c),
    fillTolerance: (v) => pick().fillTolerance(v),
    textFormat: (a) => pick().textFormat(a),
    selection: (a) => pick().selection(a),
    imagePanel: () => pick().imagePanel(),
    // Seulement si le contrôleur actif l'a : sinon le segment inactif rejoue l'action (repli de PointerSwitch).
    get pointer() {
      const p = pick().pointer;
      return p === undefined ? undefined : (m: PointerMode) => p(m);
    },
  };
  // Panneau fermé à l'entrée ; profil renvoyé à `annotate` s'il change pendant l'annotation (RF5).
  createEffect(
    on(
      annotating,
      (a) => {
        if (!a) return;
        setPanel(null);
        clearToast();
      },
      { defer: true },
    ),
  );
  createEffect(on(() => props.active.profile(), (p) => { if (annotating()) ann?.control.sendProfile(p); }, { defer: true }));

  // Mode de démarrage (U14, C1 P10) : une seule fois, au montage ; changer de profil ensuite ne le rejoue pas (P11).
  host.setMode(resolveStartMode(props.active.profile(), props.active.capabilities()).mode);
  const actions = createProfileActions({
    store: props.store,
    active: props.active,
    files: props.profileFiles,
    shell: props.shell,
    builtins: BUILTIN_PROFILES,
    warn: (m) => console.warn(m),
  });

  /** design-l3 (L3-3) : la page dessine le profil montré ; le mode de démarrage et l'envoi à `annotate` gardent le profil actif. */
  const profile = shownProfile;
  const size = () => profile().interface.buttonSize;
  /** design-l4 (L4-3) : une barre de rôle `annotation` n'est jamais montrée au tableau, ni ancrée ni flottante. */
  const boardBars = createMemo(() => profile().toolbars.filter((b) => b.role !== ANNOTATION_ROLE));
  const docked = createMemo(() => boardBars().filter((b) => b.dock !== "floating"));
  const floating = createMemo(() => boardBars().filter((b) => b.dock === "floating"));
  const firstToolsBar = createMemo(() => profile().toolbars.find((x) => x.role === "tools"));
  /** C11a (P20), design-l4 (L4-2) : en annotation, la seule barre montrée est `annotationBarOf` (barre d'annotation, sinon
   *  première barre `tools`, flottante posée en haut) : la même que `main.ts` mesure pour la bande de la coque. */
  const annotationBar = createMemo((): Bar | null => annotationBarOf(profile()));
  const shownDocked = createMemo((): readonly Bar[] => {
    if (!annotating()) return docked();
    const b = annotationBar();
    return b === null ? [] : [b];
  });
  const shownFloating = createMemo((): readonly Bar[] => (annotating() ? [] : floating()));
  const grid = createMemo(() => layoutFor(shownDocked()));

  /** Vue de la barre (C3) ; C11a : en annotation, celle de `annotate`, avec l'état de l'annotation. */
  const view = (): ToolbarView => {
    tick();
    const a = annState();
    const base: ToolbarView = a.active ? (remoteView() ?? { ...state(), canPaste: false }) : { ...state(), canPaste: ws.canPaste() };
    return ann === undefined
      ? base
      : {
          ...base,
          annotation: { active: a.active, pointer: a.pointer, screens: a.screens, frozen: a.frozen === true, live: a.live !== false, sendTarget: a.sendTarget ?? "origin" },
        };
  };

  /** C1 (P18), design-l4 (L4-4) : préréglages dans la barre montrée en annotation, dans la première barre `tools` au tableau. */
  const presetsBarId = createMemo(() => (annotating() ? annotationBar()?.id : firstToolsBar()?.id));
  const toolbarOf = (bar: Bar): JSX.Element => (
    <Toolbar bar={bar} caps={props.active.capabilities} view={view} size={size} host={host} presets={bar.id === presetsBarId() ? () => profile().presets : undefined} mode={mode} />
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
      data-mode={annotating() ? "annotation" : "board"}
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
      <For each={shownDocked()}>{(bar) => <div class="rb-slot" style={{ "grid-area": bar.id }}>{barOf(bar)}</div>}</For>
      {props.stages}
      <Toasts />
      <Show when={shownFloating().length > 0}>
        <div class="rb-floating">
          <For each={shownFloating()}>{(bar) => barOf(bar)}</For>
        </div>
      </Show>
      <Show when={selectedMedia()}>
        {(m) => (
          <div class="rb-popover rb-media-bar">
            <MediaBar media={m().media} controls={mediaControls} />
          </div>
        )}
      </Show>
      <Show when={selectedModel3d()}>
        {(m) => (
          <div class="rb-popover rb-media-bar">
            <Model3dBar name={ws.active().board.doc.asset(m().model3d.asset)?.name ?? "Objet 3D"} controls={model3dControls} />
          </div>
        )}
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
            {...(props.device !== undefined && props.active.capabilities().desktopAnnotation ? { device: props.device } : {})}
          />
        </div>
      </Show>
      <Show when={panel() === "profiles"}>
        <div class="rb-popover">
          <ProfileMenu
            profiles={props.active.profiles}
            activeId={() => profile().id}
            canResetCurrent={() => actions.canResetCurrent()}
            canRemove={() => actions.canRemove()}
            choose={(id) => {
              actions.choose(id);
              setPanel(null);
            }}
            edit={() => setPanel("editor")}
            importFile={() => {
              setPanel(null);
              void actions.importFile();
            }}
            exportActive={() => {
              setPanel(null);
              void actions.exportActive();
            }}
            resetCurrent={() => {
              actions.resetCurrent();
              setPanel(null);
            }}
            remove={() => {
              setPanel(null);
              void actions.remove();
            }}
            resetAll={() => {
              setPanel(null);
              void actions.resetAll();
            }}
          />
        </div>
      </Show>
      {/* design-l3 (L3-1, L3-4) : panneau latéral, remonté sur un brouillon neuf à chaque profil actif neuf (choix,
          import, remise à l'origine). */}
      <Show when={panel() === "editor" ? props.active.profile() : null} keyed>
        {(saved) => {
          const focus = takeProfileFocus();
          return (
            <div class="rb-popover" data-panel="profils">
              <ProfileEditor
                profile={saved}
                origin={originOf(saved, BUILTIN_PROFILES)}
                profiles={props.active.profiles}
                canRemove={() => actions.canRemove()}
                canResetCurrent={() => actions.canResetCurrent()}
                focusProfile={focus}
                preview={(draft) => setPreviewProfile(draft)}
                endPreview={() => setPreviewProfile(null)}
                save={(draft) => {
                  if (actions.save(draft)) setPanel(null);
                }}
                saveAsNew={(draft, label) => {
                  if (actions.saveAsNew(draft, label) !== null) setPanel(null);
                }}
                close={() => setPanel(null)}
                choose={(id) => {
                  profileFocus = true;
                  actions.choose(id);
                  // Profil changé : l'éditeur remonté (synchrone, dans choose) a déjà pris le drapeau ; profil inchangé
                  // (id inconnu, choix refusé) : rien ne le prendra. Dans les deux cas il retombe ici.
                  profileFocus = false;
                }}
                importFile={() => void actions.importFile()}
                exportProfile={(draft) => void actions.exportProfile(draft)}
                resetCurrent={() => actions.resetCurrent()}
                confirm={(m) => props.shell.confirm(m)}
              />
            </div>
          );
        }}
      </Show>
      <Show when={panel() === "grid"}>
        <div class="rb-popover">{gridPanelFor(ws.active().board)}</div>
      </Show>
      <Show when={panel() === "image" ? imageTarget() : null}>
        {(id) => (
          <div class="rb-popover" data-panel="image">
            {imagePanelFor(ws.active().board, id())}
          </div>
        )}
      </Show>
      <Show when={panel() === "library" ? props.library : undefined}>
        {(lib) => (
          <div class="rb-popover" data-panel="library">
            <LibraryPanel
              library={lib().library}
              shared={lib().shared}
              packs={lib().packs}
              capture={(what) => ws.captureResource(what)}
              place={async (entry, at) => {
                try {
                  await ws.insertResource(await lib().library.read(entry), entry.name, at);
                } catch (e) {
                  await ws.say(`${entry.name} : ${e instanceof Error ? e.message : String(e)}`);
                }
              }}
              confirm={(m) => ws.ask(m)}
              say={(m) => ws.say(m)}
              close={() => setPanel(null)}
            />
          </div>
        )}
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
