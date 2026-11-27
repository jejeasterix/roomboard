/**
 * Enveloppe de la fenêtre des fonds (personnalisation-1b, Q14, Q20, Q22, Q26, Q29, Q35, Q36) : charge le pack à la
 * première ouverture (import dynamique), liste « Mes fonds » (relue à chaque changement), bâtit la recherche, rend les
 * miniatures (grilles rendues à la demande et gardées pour la session), dérive les dépôts de fichiers vers « Mes fonds »
 * tant qu'elle est montée, applique un fond à l'onglet actif en une commande, puis se ferme ; au démontage, le focus
 * revient au bouton « Fonds ».
 */
import { createMemo, createResource, createSignal, onCleanup, onMount, Show, type JSX } from "solid-js";
import {
  appliedMessage, applyBackground, OUTSIDE_FRAME_MESSAGE, outsideFrame, PACK_BASE, pdfKeptMessage, pdfPagesAmong, resolvePack,
  sourceThumbnail, type PackFiles,
} from "../app/backgrounds-apply";
import type { BoardSession } from "../app/board-session";
import { NOT_AN_IMAGE_MESSAGE, stampOf, type MyBackground, type MyBackgrounds } from "../app/my-backgrounds";
import { PAGE_IMAGE_SCALE, renderPageImage, type ThumbDeps } from "../app/thumbnail";
import { loadPack, type PackBackground } from "../backgrounds/catalog";
import { createBackgroundSearch } from "../backgrounds/search";
import { svgOf } from "../backgrounds/svg";
import type { CoreFactory } from "../core/api";
import type { AssetStore } from "../core/asset-store";
import type { DroppedFile, Notify } from "../platform/files";
import { HEAD_BYTES, sniffImage } from "../platform/image-import";
import { BackgroundsDialog, searchDocsOf, type BackgroundCard } from "./BackgroundsDialog";

export const GRID_SAVED_MESSAGE = "Grille enregistrée dans Mes fonds";
export const BACKGROUNDS_BUTTON = 'button[data-item="backgrounds"]';
const removeQuestion = (name: string): string => `Retirer « ${name} » de Mes fonds ?`;
const messageOf = (e: unknown): string => (e instanceof Error ? e.message : String(e));
const stemOf = (name: string): string => name.replace(/\.[^./\\]*$/, "") || name;

export interface BackgroundsUi {
  readonly mine: MyBackgrounds;
  readonly thumbs: ThumbDeps;
  readonly core: Pick<CoreFactory, "blank">;
  makeAssets(): AssetStore;
  readonly files: PackFiles;
  now(): Date;
  /** Catalogue imposé (tests) ; absent : `loadPack`, import dynamique. */
  loadPack?(): Promise<readonly PackBackground[]>;
}
export interface BackgroundsHost {
  active(): { readonly board: Pick<BoardSession, "doc" | "engine">; readonly assets: AssetStore };
  setDropDiverter(h: ((files: readonly DroppedFile[]) => Promise<void>) | null): void;
  pickFiles(): Promise<readonly DroppedFile[]>;
  say: Notify;
  ask(message: string): Promise<boolean>;
}

/** Miniatures rendues des grilles, gardées pour la session (Q29, H2-7). */
const rendered = new Map<string, Promise<Blob | null>>();

export function BackgroundsWindow(props: { readonly ui: BackgroundsUi; readonly host: BackgroundsHost; close(): void }): JSX.Element {
  const ui = props.ui;
  const [pack] = createResource(() => (ui.loadPack ?? loadPack)());
  const [mine, setMine] = createSignal<readonly MyBackground[]>([]);
  const [notice, setNotice] = createSignal<string | null>(null);
  const refresh = async (): Promise<void> => {
    setMine(await ui.mine.list());
  };
  const search = createMemo(() => createBackgroundSearch(searchDocsOf(pack() ?? [], mine())));

  const addFiles = async (files: readonly DroppedFile[]): Promise<void> => {
    for (const f of files) {
      if (sniffImage(await f.head(HEAD_BYTES), f.name) === null) {
        setNotice(NOT_AN_IMAGE_MESSAGE);
        continue;
      }
      try {
        await ui.mine.addImage(await f.blob(), stemOf(f.name));
        setNotice(null);
      } catch (e) {
        setNotice(messageOf(e));
      }
    }
    await refresh();
  };
  onMount(() => {
    props.host.setDropDiverter(addFiles);
    const off = ui.mine.onChange(() => void refresh());
    onCleanup(off);
    void refresh();
  });
  onCleanup(() => {
    props.host.setDropDiverter(null);
    queueMicrotask(() => document.querySelector<HTMLElement>(BACKGROUNDS_BUTTON)?.focus());
  });

  const thumbOf = async (c: BackgroundCard): Promise<Blob | string | null> => {
    if (c.kind === "mine") return ui.mine.thumbnail(c.item);
    const b = c.item;
    if (b.kind === "photo") return b.photo === null ? null : `${PACK_BASE}${b.photo.thumb}`;
    if (b.kind === "svg") return new Blob([svgOf(b.id)], { type: "image/svg+xml" });
    if (b.kind === "grid") {
      let p = rendered.get(b.id);
      if (p === undefined) {
        p = sourceThumbnail(ui.core, { color: b.color, grid: b.grid, image: null }, ui.thumbs, () => ui.makeAssets()).catch(() => null);
        rendered.set(b.id, p);
      }
      return p;
    }
    return null;
  };

  const apply = async (c: BackgroundCard, all: boolean): Promise<void> => {
    const tab = props.host.active();
    const board = tab.board;
    const current = board.engine.state().page;
    const pages = all ? board.doc.pageIds() : [current];
    try {
      const src = c.kind === "pack" ? await resolvePack(c.item, ui.files) : await ui.mine.read(c.item);
      const pdf = pdfPagesAmong(board.doc, pages);
      const target = { run: (cmd: Parameters<typeof board.engine.run>[0]) => board.engine.run(cmd), assets: tab.assets, pageIds: () => board.doc.pageIds() };
      if (!(await applyBackground(target, src, all ? "all" : "current", current))) {
        await props.host.say(board.engine.state().error ?? "fond refusé");
        return;
      }
      if (pages.length > 1) await props.host.say(appliedMessage(pages.length), "info");
      if (pdf > 0) await props.host.say(pdfKeptMessage(pdf), "info");
    } catch (e) {
      await props.host.say(messageOf(e));
    } finally {
      props.close();
    }
  };

  const addPage = async (): Promise<void> => {
    const tab = props.host.active();
    const board = tab.board;
    const page = board.engine.state().page;
    const view = board.doc.page(page);
    if (view === null) return;
    const blob = await renderPageImage(board.doc, tab.assets, page, PAGE_IMAGE_SCALE, ui.thumbs);
    if (blob === null) return;
    const name = `Page ${board.doc.pageIds().indexOf(page) + 1} — ${stampOf(ui.now())}`;
    const w = Math.round(view.width * PAGE_IMAGE_SCALE);
    const h = Math.round(view.height * PAGE_IMAGE_SCALE);
    try {
      await ui.mine.addSource({ color: view.background, grid: null, image: { blob, name: "page.png", mime: "image/png", w, h } }, name, "page");
      setNotice(outsideFrame(board.doc, page) ? OUTSIDE_FRAME_MESSAGE : null);
    } catch (e) {
      setNotice(messageOf(e));
    }
    await refresh();
  };

  const remove = async (e: MyBackground): Promise<void> => {
    if (!(await props.host.ask(removeQuestion(e.name)))) return;
    await ui.mine.remove(e);
    await refresh();
  };

  return (
    <Show when={pack()}>
      {(p) => (
        <BackgroundsDialog
          pack={p()}
          mine={mine()}
          search={search()}
          notice={notice()}
          thumbOf={thumbOf}
          apply={(c, all) => void apply(c, all)}
          importImage={() => void props.host.pickFiles().then(addFiles).catch((e: unknown) => setNotice(messageOf(e)))}
          addPage={() => void addPage()}
          remove={(e) => void remove(e)}
          close={() => props.close()}
        />
      )}
    </Show>
  );
}
