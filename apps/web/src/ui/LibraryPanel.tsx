/**
 * Panneau « Bibliothèque » (C4) : « Mes ressources » et « Ressources partagées » en dossiers (D10), recherche sur nom,
 * mots-clés et description (D11), cartes avec vignette ou pastille (D12, H2-4), ajout de la sélection ou de la grille
 * de la page (D1, D2), glisser vers la scène par Pointer Events, double-clic ou Entrée = centre de la vue (D13), export
 * et import de paquets (D17 à D19). Index relu à l'ouverture et au retour du focus (H2-6).
 */
import { createResource, createSignal, For, onCleanup, onMount, Show, type JSX } from "solid-js";
import { ROOT_LABELS, type CapturedResource, type ResourceEntry, type ResourceLibrary } from "../app/library";
import type { Point } from "../platform/files";
import type { LibraryRoot } from "../platform/library-files";
import type { TypedFiles } from "../platform/typed-files";
import { startResourceDrag } from "./resource-drag";

export interface SharedFolder {
  readonly desktop: boolean;
  chosen(): boolean;
  choose(): Promise<boolean>;
}
export interface LibraryPanelProps {
  readonly library: ResourceLibrary;
  readonly shared: SharedFolder;
  readonly packs: TypedFiles;
  capture(what: "selection" | "grid"): Promise<CapturedResource | null>;
  place(entry: ResourceEntry, at: Point | null): Promise<void>;
  confirm(message: string): Promise<boolean>;
  say(message: string): Promise<void>;
  close(): void;
}

const messageOf = (e: unknown): string => (e instanceof Error ? e.message : String(e));
const keywordsOf = (s: string): string[] => s.split(",").map((k) => k.trim()).filter((k) => k !== "");

function Card(props: { entry: ResourceEntry; library: ResourceLibrary; version: () => number; place: LibraryPanelProps["place"]; remove(entry: ResourceEntry): void; showFolder?: boolean }): JSX.Element {
  const [url] = createResource(
    () => ({ e: props.entry, v: props.version() }),
    async ({ e }) => {
      const b = await props.library.thumbnail(e).catch(() => null);
      return b === null ? null : URL.createObjectURL(b);
    },
  );
  onCleanup(() => {
    const u = url();
    if (u) URL.revokeObjectURL(u);
  });
  return (
    <div
      class="rb-resource"
      tabindex="0"
      role="button"
      data-resource={props.entry.path}
      data-root={props.entry.root}
      title={props.entry.description || props.entry.name}
      onPointerDown={(e) => startResourceDrag(e, (at) => void props.place(props.entry, at), { label: props.entry.name, thumbnail: url() ?? null })}
      onDblClick={() => void props.place(props.entry, null)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          void props.place(props.entry, null);
        }
      }}
    >
      <Show when={url()} fallback={<span class="rb-badge">{props.entry.kind === "grid" ? "Grille" : "Objets"}</span>}>
        {(u) => <img class="rb-thumb" src={u()} alt="" draggable={false} />}
      </Show>
      <span class="rb-resource-name">{props.entry.name}</span>
      <Show when={props.showFolder && props.entry.folder !== ""}>
        <span class="rb-resource-folder">{props.entry.folder}</span>
      </Show>
      <button type="button" data-lib="remove" aria-label={`Supprimer ${props.entry.name}`} onPointerDown={(e) => e.stopPropagation()} onClick={() => props.remove(props.entry)}>
        ×
      </button>
    </div>
  );
}

export function LibraryPanel(props: LibraryPanelProps): JSX.Element {
  const [version, setVersion] = createSignal(0);
  const bump = (): void => void setVersion((v) => v + 1);
  const [query, setQuery] = createSignal("");
  const [open, setOpen] = createSignal<{ root: LibraryRoot; path: string }>({ root: "mine", path: "" });
  const [form, setForm] = createSignal<null | "selection" | "grid">(null);
  const [draft, setDraft] = createSignal({ name: "", keywords: "", description: "" });
  const [folderForm, setFolderForm] = createSignal(false);
  const [folderName, setFolderName] = createSignal("");

  const act = async (f: () => Promise<void>): Promise<void> => {
    try {
      await f();
    } catch (e) {
      await props.say(`Bibliothèque : ${messageOf(e)}`);
    }
    bump();
  };
  const refresh = (): void => void act(() => props.library.refresh());
  onMount(() => {
    refresh();
    window.addEventListener("focus", refresh);
  });
  onCleanup(() => window.removeEventListener("focus", refresh));

  const hasRoot = (root: LibraryRoot): boolean => (version(), props.library.roots().includes(root));
  const folderOf = (root: LibraryRoot) => {
    version();
    const o = open();
    return props.library.folder(root, o.root === root ? o.path : "");
  };
  const results = () => (version(), props.library.search(query()));

  const submit = (): void =>
    void act(async () => {
      const what = form();
      if (what === null) return;
      const captured = await props.capture(what);
      if (captured === null) return;
      const d = draft();
      const o = open();
      await props.library.add(o.root, o.path, {
        ...captured,
        name: d.name.trim() || (what === "grid" ? "Grille" : "Sélection"),
        keywords: keywordsOf(d.keywords),
        description: d.description.trim(),
      });
      setForm(null);
      setDraft({ name: "", keywords: "", description: "" });
    });
  const remove = (entry: ResourceEntry): void =>
    void act(async () => {
      if (await props.confirm(`Supprimer « ${entry.name} » ?`)) await props.library.remove(entry.root, entry.path);
    });
  const removeFolder = (root: LibraryRoot, path: string): void =>
    void act(async () => {
      if (!(await props.confirm(`Supprimer le dossier « ${path} » et son contenu ?`))) return;
      await props.library.remove(root, path);
      setOpen({ root, path: path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "" });
    });
  const clear = (): void =>
    void act(async () => {
      if (!(await props.confirm(`Vider « ${ROOT_LABELS.mine} » ? Toutes ses ressources seront supprimées.`))) return;
      await props.library.remove("mine", "");
      setOpen({ root: "mine", path: "" });
    });
  const exportPack = (): void =>
    void act(async () => {
      const o = open();
      const pack = await props.library.exportPack(o.root, o.path);
      await props.packs.save(pack.name, pack.bytes);
    });
  const importPack = (): void =>
    void act(async () => {
      const f = await props.packs.pick();
      if (f === null) return;
      const r = await props.library.importPack(f.bytes, f.name);
      setOpen({ root: "mine", path: r.folder });
      await props.say(`${f.name} : ${r.count} ressource${r.count > 1 ? "s" : ""} importée${r.count > 1 ? "s" : ""} dans « ${r.folder} »`);
    });
  const createFolder = (): void =>
    void act(async () => {
      const o = open();
      const path = await props.library.mkdir(o.root, o.path, folderName());
      setFolderForm(false);
      setFolderName("");
      setOpen({ root: o.root, path });
    });

  const chooseShared = (): void =>
    void act(async () => {
      if (await props.shared.choose()) await props.library.refresh();
    });

  const section = (root: LibraryRoot): JSX.Element => (
    <section data-root={root} class="rb-library-root">
      <h3>{ROOT_LABELS[root]}</h3>
      <Show when={root === "shared" && props.shared.desktop}>
        <button type="button" data-lib="choose-shared" onClick={chooseShared}>
          {(version(), props.shared.chosen()) ? "Rouvrir le dossier partagé…" : "Choisir le dossier partagé…"}
        </button>
      </Show>
      <Show when={root === "shared" && !props.shared.desktop && !hasRoot(root)}>
        <p class="rb-library-note">Dossier partagé : application de bureau seulement</p>
      </Show>
      <Show when={hasRoot(root)}>
        <Show when={open().root === root && open().path !== ""}>
          <div class="rb-library-path">
            <button type="button" data-lib="up" onClick={() => setOpen({ root, path: open().path.includes("/") ? open().path.slice(0, open().path.lastIndexOf("/")) : "" })}>
              ← {open().path}
            </button>
            <button type="button" aria-label={`Supprimer le dossier ${open().path}`} onClick={() => removeFolder(root, open().path)}>
              Supprimer
            </button>
          </div>
        </Show>
        <div class="rb-library-folders">
          <For each={folderOf(root).folders}>
            {(f) => (
              <button type="button" data-folder={f} onClick={() => setOpen({ root, path: f })}>
                {f.slice(f.lastIndexOf("/") + 1)}
              </button>
            )}
          </For>
        </div>
        <div class="rb-library-cards">
          <For each={folderOf(root).items}>{(e) => <Card entry={e} library={props.library} version={version} place={props.place} remove={remove} />}</For>
        </div>
      </Show>
    </section>
  );

  return (
    <div id="bibliotheque" class="rb-library" role="dialog" aria-label="Bibliothèque">
      <header class="rb-library-head">
        <h2>Bibliothèque</h2>
        <button type="button" data-lib="close" aria-label="Fermer" onClick={() => props.close()}>
          ×
        </button>
      </header>
      <input type="search" data-lib="search" aria-label="Rechercher dans la bibliothèque" value={query()} onInput={(e) => setQuery(e.currentTarget.value)} />
      <div class="rb-library-actions">
        <button type="button" data-lib="add-selection" onClick={() => setForm("selection")}>Ajouter la sélection</button>
        <button type="button" data-lib="add-grid" onClick={() => setForm("grid")}>Ajouter la grille de la page</button>
        <button type="button" data-lib="new-folder" onClick={() => setFolderForm(true)}>Nouveau dossier</button>
        <button type="button" data-lib="export" onClick={exportPack}>Exporter (.rbpack)</button>
        <button type="button" data-lib="import" onClick={importPack}>Importer un paquet…</button>
        <button type="button" data-lib="clear" onClick={clear}>Vider</button>
      </div>
      <Show when={form() !== null}>
        <div class="rb-library-form">
          <label>Nom <input data-lib="name" value={draft().name} onInput={(e) => setDraft({ ...draft(), name: e.currentTarget.value })} /></label>
          <label>Mots-clés (séparés par des virgules) <input data-lib="keywords" value={draft().keywords} onInput={(e) => setDraft({ ...draft(), keywords: e.currentTarget.value })} /></label>
          <label>Description <input data-lib="description" value={draft().description} onInput={(e) => setDraft({ ...draft(), description: e.currentTarget.value })} /></label>
          <button type="button" data-lib="submit" onClick={submit}>Ajouter</button>
          <button type="button" data-lib="cancel" onClick={() => setForm(null)}>Annuler</button>
        </div>
      </Show>
      <Show when={folderForm()}>
        <div class="rb-library-form">
          <label>Nom du dossier <input data-lib="folder-name" value={folderName()} onInput={(e) => setFolderName(e.currentTarget.value)} /></label>
          <button type="button" data-lib="create-folder" onClick={createFolder}>Créer</button>
          <button type="button" onClick={() => setFolderForm(false)}>Annuler</button>
        </div>
      </Show>
      <Show when={query().trim() !== ""} fallback={<>{section("mine")}{section("shared")}</>}>
        <div data-lib="results" class="rb-library-cards">
          <For each={results()}>{(e) => <Card entry={e} library={props.library} version={version} place={props.place} remove={remove} showFolder />}</For>
        </div>
      </Show>
    </div>
  );
}
