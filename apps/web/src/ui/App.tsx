/**
 * Application SolidJS (lot 5b, T95 ; design-l2) : barres du profil actif placées selon leur `dock` — une barre ancrée a
 * sa case dans la grille (`layoutFor`), une barre `floating` est un îlot du calque `IslandLayer`, posé sur la case de la
 * scène avec l'îlot des onglets et `#etat` (L2-5, L2-14) ; la scène (`main.rb-stages`) n'occupe que sa case. Panneaux
 * passagers (réglages, grille, image, bibliothèque, profils) au-dessus des îlots.
 */
import { createComputed, createEffect, createMemo, createSignal, For, on, onCleanup, onMount, Show, type Accessor, type JSX } from "solid-js";
import { render } from "solid-js/web";
import { specOf, type BoardSession } from "../app/board-session";
import { PDF_PAGE_KIND, type GridView, type ImageData, type PageLayout } from "../core/api";
import { stampOf } from "../app/my-backgrounds";
import { appShortcut, gridKey } from "../engine/input/keys";
import { draftOf, GRID_KIND_LABELS, toGrid, withKind } from "../grid-edit";
import { BackgroundsWindow, GRID_SAVED_MESSAGE, type BackgroundsUi } from "./BackgroundsWindow";
import { createDeviceSettings, type DeviceSettings } from "../device-settings";
import { createProfileActions } from "../app/profile-actions";
import { createLocalToolbarHost, type ToolbarHost } from "../app/toolbar-host";
import type { AnnotationControl, AnnotationState, PointerMode } from "../platform/annotation-port";
import type { TabSession, Workspace } from "../app/workspace";
import type { EngineState } from "../engine/engine";
import type { SettingsStore } from "../engine/settings";
import type { ShellPort } from "../platform/files";
import type { ProfileFiles } from "../platform/profile-files";
import { leaveDraft, originOf } from "../profile-edit";
import type { ProfileStore } from "../profile-store";
import { ANNOTATION_ROLE, MENU_ROLE, annotationBarOf, itemsForMode, resolveStartMode, type Profile, type StartMode, type Toolbar as Bar } from "../toolbar";
import { BUILTIN_PROFILES } from "../toolbar-profiles";
import type { ActiveProfile } from "./active-profile";
import { IslandLayer } from "./Island";
import { OptionsPanel } from "./OptionsPanel";
import { layoutFor } from "./layout";
import { MediaBar, type MediaControls } from "./MediaBar";
import { MenuBar } from "./MenuBar";
import { Model3dBar, type Model3dControls } from "./Model3dBar";
import { NO_WEBGL_MESSAGE } from "../platform/model3d-import";
import { MODEL3D_FAILED_MESSAGE } from "../platform/model-sessions";
import { dropTarget, layerRows } from "../app/layer-list";
import { SideBar, type LayersPort, type PagesPort } from "./SideBar";
import { createPageThumbs, type PageThumbs } from "./page-thumbs";
import { ProfileEditor } from "./ProfileEditor";
import { ProfileMenu } from "./ProfileMenu";
import { GridPanel } from "./GridPanel";
import { HelpPanel } from "./HelpPanel";
import { isHelpKey } from "./shortcuts";
import { ImagePanel } from "./ImagePanel";
import { LibraryPanel, type SharedFolder } from "./LibraryPanel";
import type { ResourceLibrary } from "../app/library";
import type { TypedFiles } from "../platform/typed-files";
import { PALM_ERASER_LABELS, SettingsPanel } from "./SettingsPanel";
import { TabsBar, type TabView } from "./TabsBar";
import type { ToolbarView } from "./item-state";
import { Toolbar } from "./Toolbar";
import { Toasts } from "./Toasts";
import { clearToast, showToast } from "./toast";
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
  /** personnalisation-1b : fenêtre des fonds et « Mes fonds » ; absente (tests anciens) : le bouton « Fonds » n'ouvre rien. */
  readonly backgrounds?: BackgroundsUi;
  /** design-l4 (L4-14) : réglages de l'appareil ; donnés au panneau Réglages seulement avec la capacité d'annotation
   *  (H10) ; absents (tests anciens) : aucun bouton du cadre. */
  readonly device?: DeviceSettings;
  /** personnalisation-1a (décision 25) : l'application y pose `toggle` ; l'amorce le branche sur Ctrl+Maj+P (`pageShortcut`). */
  readonly sidebar?: { toggle?: (tab: "pages" | "calques") => void };
}

type Panel = "settings" | "profiles" | "editor" | "grid" | "image" | "library" | "backgrounds" | "help";

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
  /** design-l3 (L3-32) : quitter l'éditeur pour un autre panneau ; brouillon différent du profil enregistré : après un Oui.
   *  Même règle et même question que l'éditeur (`leaveDraft`) ; sans question, dans le même tour. */
  const leaveEditor = (go: () => void): void => {
    const draft = previewProfile();
    if (panel() !== "editor" || draft === null) return go();
    leaveDraft(draft, props.active.profile(), (m) => props.shell.confirm(m), go);
  };

  /** Saisie de texte en cours dans la scène : le blur la fait valider par l'outil (CL4-3) et cache la zone. */
  const leaveEditing = (): void => {
    const focused = props.stages.ownerDocument.activeElement;
    if (focused instanceof HTMLElement && props.stages.contains(focused)) focused.blur();
  };

  /** Miniatures de page, un cache par onglet (DA7) ; libéré avec l'onglet. */
  const thumbsOf = new Map<TabSession, PageThumbs>();
  const thumbsFor = (t: TabSession): PageThumbs => {
    let c = thumbsOf.get(t);
    if (c === undefined) {
      c = createPageThumbs((id, w) => ws.pageThumb(t, id, w));
      thumbsOf.set(t, c);
    }
    return c;
  };
  onCleanup(() => {
    for (const c of thumbsOf.values()) c.dispose();
    thumbsOf.clear();
  });
  /** Barre latérale ouverte (décision 25) : lue par `page-number` ; posée par le rendu de la barre `pages`. */
  const [sidebarOpen, setSidebarOpen] = createSignal(false);

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
    for (const [s, thumbs] of thumbsOf) {
      if (!alive.has(s)) {
        thumbs.dispose();
        thumbsOf.delete(s);
      }
    }
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
  // « ? » ouvre l'Aide (hors champ, sans Ctrl ni Alt, hors composition) ; l'écoute est ici : le panneau est à l'état de la page.
  const helpKey = (e: KeyboardEvent): void => {
    if (!isHelpKey(e) || annotating()) return;
    e.preventDefault();
    leaveEditor(() => setPanel((cur) => (cur === "help" ? null : "help")));
  };
  const helpDoc = props.stages.ownerDocument;
  helpDoc.addEventListener("keydown", helpKey);
  // T39 : Échap ferme l'Aide même si le focus n'est pas dans le panneau, et s'arrête là (la page ne désélectionne pas en plus).
  // T41 : une couche posée par-dessus (menu ☰, sélecteur de couleur, éditeur de lien) garde son Échap : l'Aide attend le suivant.
  const helpEscape = (e: KeyboardEvent): void => {
    if (e.key !== "Escape" || panel() !== "help" || e.isComposing) return;
    if (e.target instanceof Element && e.target.closest("[data-menu-list], [data-color-picker], [data-link-popover]") !== null) return;
    e.preventDefault();
    e.stopPropagation();
    setPanel(null);
  };
  helpDoc.addEventListener("keydown", helpEscape, true);
  onCleanup(() => {
    helpDoc.removeEventListener("keydown", helpKey);
    helpDoc.removeEventListener("keydown", helpEscape, true);
  });
  // T39 : l'élément qui a ouvert l'Aide (le bouton ☰ pour une ligne du menu ; rien pour « ? ») la retrouve à la fermeture ;
  // sans lui, la scène : le focus ne tombe jamais sur le corps de la page. `createComputed` : avant que le panneau ne prenne le focus.
  // OG69 (G1) : même règle pour le panneau de la grille (bouton Grille, ☰, ou la scène après Ctrl+Maj+').
  const RETURNS_FOCUS: ReadonlySet<Panel> = new Set<Panel>(["help", "grid"]);
  let helpOpener: HTMLElement | null = null;
  /** OG69 (relecture) : panneau fermé par un changement d'onglet, de page ou de version (E8) : le focus reste où il est
   *  (sur la scène qui vient d'écrire), il ne saute pas au bouton ouvreur. */
  let closedBySession = false;
  createComputed(
    on(
      panel,
      (p, prev) => {
        if (p === null || !RETURNS_FOCUS.has(p) || prev === p) return;
        const a = helpDoc.activeElement;
        const menu = a instanceof HTMLElement ? a.closest('[data-toolbar="menu"]') : null;
        helpOpener = menu !== null ? menu.querySelector<HTMLElement>("[data-menu-toggle]") : a instanceof HTMLElement && a !== helpDoc.body ? a : null;
      },
      { defer: true },
    ),
  );
  createEffect(
    on(
      panel,
      (p, prev) => {
        if (prev === null || prev === undefined || !RETURNS_FOCUS.has(prev) || p !== null) return;
        if (closedBySession) {
          closedBySession = false;
          helpOpener = null;
          return;
        }
        const back = helpOpener !== null && helpOpener.isConnected ? helpOpener : props.stages;
        helpOpener = null;
        if (!back.hasAttribute("tabindex") && back === props.stages) back.tabIndex = -1;
        back.focus();
      },
      { defer: true },
    ),
  );
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
  /** Repli du panneau d'options : réglages d'appareil, ou mémoire seule quand l'hôte n'en fournit pas. */
  const optionSettings = props.device ?? createDeviceSettings(null);
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

  /** personnalisation-1b (Q21) : grille du brouillon et couleur de la page montrée vers « Mes fonds » ; rien dans le document. */
  const saveGridAsBackground = async (b: BoardSession, grid: GridView): Promise<void> => {
    const ui = props.backgrounds;
    if (ui === undefined) return;
    const kind = grid.levels[0]?.kind ?? "";
    const label = Object.hasOwn(GRID_KIND_LABELS, kind) ? GRID_KIND_LABELS[kind as keyof typeof GRID_KIND_LABELS] : "personnalisée";
    const color = b.doc.page(b.engine.state().page)?.background ?? "#ffffff";
    try {
      await ui.mine.addSource({ color, grid, image: null }, `Grille ${label} — ${stampOf(ui.now())}`, "grid");
      await ws.say(GRID_SAVED_MESSAGE, "info");
    } catch (e) {
      await ws.say(e instanceof Error ? e.message : String(e));
    }
  };

  /** OG69 (G4) : dernière grille utilisée (appliquée, ou retirée par le bouton Grille), rendue par un toucher ; au départ,
   *  la grille neuve du Créateur (carreaux de 40, aimantés). Mémoire de la fenêtre, commune aux onglets. */
  let lastGrid = toGrid(withKind(draftOf(null), "squares")) as GridView;
  const toggleGrid = (): void => {
    const b = ws.active().board;
    const page = b.engine.state().page;
    const cur = b.doc.page(page)?.grid ?? null;
    if (cur !== null) lastGrid = cur;
    b.engine.run({ type: "SetGrid", page, grid: cur === null ? lastGrid : null });
  };
  /** Séance de la grille (E8, CR3) : moteur `b` figé à l'ouverture (jamais `ws.active()` au rappel : chaque onglet a son
   *  moteur) ; le démontage de `GridPanel` coupe l'aperçu sur ce moteur-là. */
  const gridPanelFor = (b: BoardSession): JSX.Element => (
    <GridPanel
      initial={b.doc.page(b.engine.state().page)?.grid ?? null}
      preview={(g) => b.engine.previewGrid(g)}
      endPreview={() => b.engine.endGridPreview()}
      apply={(grid) => {
        const page = b.engine.state().page;
        const before = b.doc.page(page)?.grid ?? null;
        // Refus du cœur : message dans #etat et rendu au panneau, resté ouvert, aperçu gardé (PC1, CR6).
        if (b.engine.run({ type: "SetGrid", page, grid }) === null) {
          return b.engine.state().error ?? "grille refusée";
        }
        lastGrid = grid ?? before ?? lastGrid;
        setPanel(null);
        return null;
      }}
      tooFine={(g) => b.engine.gridTooFine(g)}
      onView={(cb) => b.engine.onCamera((c) => cb(c.zoom))}
      cancel={() => setPanel(null)}
      saveAsBackground={props.backgrounds === undefined ? undefined : (grid) => void saveGridAsBackground(b, grid)}
    />
  );
  /** Onglet, page ou version qui change pendant la séance (annuler, rétablir, autre écriture) : panneau fermé (E8). */
  const sessionKey = createMemo(() => `${activeId() ?? ""}|${state().page}|${state().version}`);
  createEffect(
    on(
      sessionKey,
      () => {
        if (panel() !== "grid") return;
        closedBySession = true;
        setPanel(null);
      },
      { defer: true },
    ),
  );
  /** Panneau de l'image (C5, I25, I31) : l'image sélectionnée seule à l'ouverture ; fermé si l'onglet, la page ou la
   *  sélection changent, ou si l'image disparaît ; une écriture ne le ferme pas (au contraire de la grille). */
  const [imageTarget, setImageTarget] = createSignal<string | null>(null);
  /** OG23 (T13) : départ demandé par la section Image du panneau d'options (rognage, baguette) ; remis à null à la fermeture. */
  const [imageStart, setImageStart] = createSignal<"crop" | "background" | null>(null);
  const openImage = (start: "crop" | "background" | null): void => {
    setImageStart(start);
    setPanel("image");
  };
  createEffect(on(panel, (p) => { if (p !== "image") setImageStart(null); }, { defer: true }));
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
    return <ImagePanel image={image} version={() => state().version} tick={state} edit={edit} {...(imageStart() !== null ? { start: imageStart()! } : {})} close={() => setPanel(null)} />;
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

  /** Ctrl+Maj+P, `page-number` (Pages) et Ctrl+Maj+L (Calques) : déplie la barre latérale sur l'onglet voulu, change
   *  d'onglet si elle est dépliée sur l'autre, ou la replie si l'onglet est déjà montré. Barre absente du profil montré
   *  (ou ancrée, sans repli) : sans effet. */
  const toggleSidebar = (tab: "pages" | "calques"): void => {
    const island = props.stages.ownerDocument.querySelector<HTMLElement>('[data-island="pages"]');
    if (island === null) return;
    const wasFolded = island.dataset["collapsed"] === "1";
    const tabEl = island.querySelector<HTMLElement>(`[data-side-tab="${tab}"]`);
    const onOther = !wasFolded && tabEl?.getAttribute("aria-selected") === "false";
    if (tabEl === null && tab === "calques") return;
    if (onOther) {
      tabEl?.click();
      return;
    }
    // Barre repliée : toucher l'onglet la déplie (SideBar `openTab`) ; sans onglet, le bouton Déplier.
    if (wasFolded && tabEl !== null) tabEl.click();
    else island.querySelector<HTMLElement>("[data-island-collapse]")?.click();
    if (wasFolded) (tab === "pages" ? island.querySelector<HTMLElement>('.rb-pages-list [aria-current="page"]') : tabEl)?.focus();
  };
  if (props.sidebar !== undefined) props.sidebar.toggle = toggleSidebar;

  const local = createLocalToolbarHost(
    {
      engine: () => ws.active().board.engine,
      runFile: (cmd) => void ws.active().files.run(cmd),
      // P17 : un dépôt HTML5 sur la zone en annotation va au contrôleur (sortie d'abord) ; sinon l'import ordinaire.
      importFiles: (files, at) => void (ann !== undefined && annotating() ? ann.control.dropOnZone(files, at ?? null) : ws.importFiles(files, at)),
      insertPages: () => void ws.insertPages(),
      exportPdf: () => void ws.exportPdf(),
      pageElementIds: () => ws.active().board.doc.elementIds(ws.active().board.engine.state().page),
      confirm: (m) => props.shell.confirm(m),
      exportBoard: (format) => void ws.exportBoard(format),
      editOriginal: () => void ws.editOriginal(),
      selection: (a) => ws.selection(a),
      toggle: (p) => leaveEditor(() => setPanel((cur) => (cur === p ? null : p))),
      toggleGrid,
      toggleSidebar,
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
  // personnalisation-1b (Q28) : Ctrl+Maj+F (Cmd+Maj+F sous macOS) ouvre ou ferme la fenêtre des fonds, hors champ de
  // saisie et hors annotation ; OG25 (déc. 27) : Ctrl+Maj+H coupe ou rallume la gomme automatique à la paume, avec un
  // avis. Écoutés ici, jamais par le moteur.
  onMount(() => {
    const onShortcut = (e: KeyboardEvent): void => {
      const key = { key: e.key, code: e.code, ctrlKey: e.ctrlKey, metaKey: e.metaKey, shiftKey: e.shiftKey, altKey: e.altKey, isComposing: e.isComposing, target: e.target instanceof HTMLElement ? e.target : null };
      // OG69 (G4, G5 ; HE5 levée) : Ctrl+' bascule la grille, Ctrl+Maj+' ouvre le Créateur, Alt+G bascule l'aimant.
      const grid = annotating() ? null : gridKey(key);
      // Créateur ouvert : la grille du document ne change pas sous le brouillon (Ctrl+', Alt+G sans effet ; Ctrl+Maj+' le ferme).
      if (grid !== null) {
        e.preventDefault();
        // Les actions de la barre (`ACTIONS`) ; Créateur ouvert, seul Ctrl+Maj+' agit (il le ferme).
        if (!e.repeat && (panel() !== "grid" || grid === "grid")) host.runAction(grid);
        return;
      }
      const action = annotating() ? null : appShortcut(key);
      if (action === "palm-eraser") {
        e.preventDefault();
        if (e.repeat) return;
        const on = !optionSettings.palmEraser();
        optionSettings.setPalmEraser(on);
        showToast({ text: on ? PALM_ERASER_LABELS.on : PALM_ERASER_LABELS.off });
        return;
      }
      if (props.backgrounds === undefined || action !== "backgrounds") return;
      e.preventDefault();
      leaveEditor(() => setPanel((cur) => (cur === "backgrounds" ? null : "backgrounds")));
    };
    window.addEventListener("keydown", onShortcut);
    onCleanup(() => window.removeEventListener("keydown", onShortcut));
  });

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
    const base: ToolbarView = a.active ? (remoteView() ?? { ...state(), canPaste: false }) : { ...state(), canPaste: ws.canPaste(), sidebarOpen: sidebarOpen() };
    return ann === undefined
      ? base
      : {
          ...base,
          annotation: { active: a.active, pointer: a.pointer, screens: a.screens, frozen: a.frozen === true, live: a.live !== false, sendTarget: a.sendTarget ?? "origin" },
        };
  };

  /** C1 (P18), design-l4 (L4-4) : préréglages dans la barre montrée en annotation, dans la première barre `tools` au tableau. */
  const presetsBarId = createMemo(() => (annotating() ? annotationBar()?.id : firstToolsBar()?.id));
  const toolbarOf = (bar: Bar, collapsed?: Accessor<boolean>): JSX.Element => (
    <Toolbar
      bar={bar}
      caps={props.active.capabilities}
      view={view}
      size={size}
      host={host}
      presets={bar.id === presetsBarId() ? () => profile().presets : undefined}
      mode={mode}
      {...(collapsed !== undefined ? { collapsed } : {})}
    />
  );
  /** Rendu d'une barre selon son rôle (table) ; tout autre rôle est une barre d'outils. design-l2 (L2-6) : `menu`. */
  /** Page montrée de l'onglet actif, branchée sur le moteur ; « Retirer » montre d'abord la page visée (le moteur retire la montrée). */
  const pagesPort: PagesPort = {
    ids: () => {
      tick();
      state();
      return ws.active().board.doc.pageIds();
    },
    shown: () => state().page,
    layout: () => state().pageLayout ?? "landscape",
    fixedByBackdrop: () => {
      state();
      return ws.active().board.doc.page(state().page)?.backdrop?.kind === PDF_PAGE_KIND;
    },
    show: (id) => void ws.active().board.engine.showPage(id),
    move: (id, to) => void ws.active().board.engine.movePage(id, to),
    duplicate: (id) => void ws.active().board.engine.duplicatePage(id),
    remove: (id) => {
      const e = ws.active().board.engine;
      if (e.showPage(id)) e.removePage();
    },
    addAfter: (id) => void ws.active().board.engine.addPage(id),
    setLayout: (m: PageLayout) => void ws.active().board.engine.setPageMode(m),
    // Le mode de la page montrée change son cadre : sa miniature gardée est refaite, même sans version neuve.
    thumb: async (id, width) => thumbsFor(ws.active()).get(id, width, id === state().page ? (state().pageLayout ?? "landscape") : undefined),
  };
  /** Onglet Calques : lignes de la page montrée, sélection et glisser branchés sur le moteur. */
  const layersPort: LayersPort = {
    rows: () => {
      tick();
      state();
      return layerRows(ws.active().board.doc, state().page);
    },
    selected: () => state().selection ?? [],
    select: (ids) => ws.active().board.engine.select(ids),
    drop: (key, slot) => {
      const b = ws.active().board;
      const t = dropTarget(b.doc, state().page, key, slot);
      if (t !== null) b.engine.restack(t.ids, t.to);
    },
  };
  /** DA7 : une écriture sur la page montrée refait sa miniature (les autres restent gardées). */
  createEffect(
    on(
      () => state().version,
      () => thumbsFor(ws.active()).invalidate([state().page]),
      { defer: true },
    ),
  );
  const BY_ROLE: Readonly<Record<string, (bar: Bar, collapsed?: Accessor<boolean>, expand?: () => void) => JSX.Element>> = {
    pages: (bar, collapsed, expand) => {
      createEffect(() => setSidebarOpen(collapsed === undefined || !collapsed()));
      onCleanup(() => setSidebarOpen(false));
      return (
        <SideBar
          bar={bar}
          collapsed={collapsed ?? (() => false)}
          caps={props.active.capabilities}
          {...(expand !== undefined ? { expand } : {})}
          view={view}
          host={host}
          pages={pagesPort}
          layers={layersPort}
          size={size}
          {...(props.device !== undefined ? { store: props.device } : {})}
        />
      );
    },
    [MENU_ROLE]: (bar) => <MenuBar bar={bar} items={() => itemsForMode(bar, props.active.capabilities(), mode())} view={view} size={size} host={host} />,
  };
  const barOf = (bar: Bar, collapsed?: Accessor<boolean>, expand?: () => void): JSX.Element =>
    Object.hasOwn(BY_ROLE, bar.role) ? BY_ROLE[bar.role]!(bar, collapsed, expand) : toolbarOf(bar, collapsed);
  /** design-l2 : ce qui change la largeur d'un îlot centré (pages) ou sa rangée contextuelle (outil) : remesure. */
  /** T16 (design-l4) : haut des panneaux passagers (`--rb-pop-top` de rb.css), sous l'îlot d'outils descendu. */
  const [popTop, setPopTop] = createSignal(88);
  const islandWatch = createMemo(() => `${state().pageCount}|${state().tool}|${state().pageLayout}`);

  return (
    <div
      class="rb-layout"
      data-mode={annotating() ? "annotation" : "board"}
      data-panneau={panel() === "editor" ? "profils" : undefined}
      style={{ "grid-template-areas": grid().areas, "grid-template-columns": grid().columns, "grid-template-rows": grid().rows, "--rb-pop-top": `${popTop()}px` }}
    >
      <For each={shownDocked()}>{(bar) => <div class="rb-slot" style={{ "grid-area": bar.id }}>{barOf(bar)}</div>}</For>
      {props.stages}
      <IslandLayer
        bars={shownFloating}
        render={(bar, collapsed, expand) => barOf(bar, collapsed, expand)}
        head={
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
        }
        status={<p id="etat" role="status">{state().error ?? ""}</p>}
        profileId={() => profile().id}
        {...(props.device !== undefined ? { store: props.device } : {})}
        size={size}
        sheetOpen={() => panel() === "editor"}
        watch={islandWatch}
        extra={(sideStart, above) => (
          <OptionsPanel
            engine={() => board().engine}
            state={state}
            element={(id) => ws.active().board.doc.element(id)}
            presets={() => profile().presets}
            size={size}
            profileId={() => profile().id}
            settings={optionSettings}
            annotating={annotating}
            sideStart={sideStart}
            above={above}
            hidden={() => panel() !== null}
            openLink={(url) => props.shell.openLink?.(url)}
            openImage={openImage}
            media={() => <Show when={selectedMedia()}>{(m) => <MediaBar media={m().media} controls={mediaControls} />}</Show>}
            model3d={() => (
              <Show when={selectedModel3d()}>
                {(m) => <Model3dBar name={ws.active().board.doc.asset(m().model3d.asset)?.name ?? "Objet 3D"} controls={model3dControls} />}
              </Show>
            )}
          />
        )}
        onTopFree={setPopTop}
      />
      <Toasts />
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
            palmEraser={optionSettings}
          />
        </div>
      </Show>
      <Show when={panel() === "profiles"}>
        <div class="rb-popover" data-panel="menu-profils">
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
                importFile={() => {
                  // Import réussi : le profil importé remonte l'éditeur (pendant la promesse) ; sinon rien ne prend le drapeau.
                  profileFocus = true;
                  void actions.importFile().finally(() => {
                    profileFocus = false;
                  });
                }}
                exportProfile={(draft) => void actions.exportProfile(draft)}
                resetCurrent={() => {
                  profileFocus = true;
                  actions.resetCurrent();
                  profileFocus = false;
                }}
                confirm={(m) => props.shell.confirm(m)}
              />
            </div>
          );
        }}
      </Show>
      <Show when={panel() === "help"}>
        <div class="rb-popover rb-help">
          <HelpPanel close={() => setPanel(null)} />
        </div>
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
      <Show when={panel() === "backgrounds" ? props.backgrounds : undefined}>
        {(ui) => <BackgroundsWindow ui={ui()} host={ws} close={() => setPanel(null)} />}
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
