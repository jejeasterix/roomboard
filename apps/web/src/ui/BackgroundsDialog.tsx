/**
 * Fenêtre des fonds (personnalisation-1b, Q16, Q25 à Q29, Q33, Q36, DA6) : modale centrée, rail des sections, recherche,
 * puces des thèmes, grille de cartes 16:9, interrupteur « Toutes les pages ». Un toucher applique et ferme (Q26) ; un
 * toucher qui a défilé n'applique pas (Q27) ; un double toucher n'applique qu'une fois ; Entrée : cette page,
 * Maj+Entrée : toutes les pages (Q28). Suppr, Retour arrière, Échap et Espace restent à la fenêtre ; Ctrl ou Méta
 * remontent (Ctrl+Z). Composant pur : pack, « Mes fonds », recherche et miniatures viennent des props.
 */
import { createEffect, createMemo, createSignal, For, on, onCleanup, onMount, Show, type JSX } from "solid-js";
import type { MyBackground } from "../app/my-backgrounds";
import { ENGINE_KEYS } from "../app/table-picker";
import { ALL_THEMES, ALL_THEMES_LABEL, DEFAULT_SECTION, SECTIONS, type PackBackground, type SectionId } from "../backgrounds/catalog";
import type { BackgroundSearch, SearchDoc } from "../backgrounds/search";
import { Icon } from "./IconButton";
import { RadioChoices } from "./RadioChoices";
import "./backgrounds.css";

export type BackgroundCard =
  | { readonly kind: "pack"; readonly key: string; readonly item: PackBackground }
  | { readonly kind: "mine"; readonly key: string; readonly item: MyBackground };

export interface BackgroundsDialogProps {
  readonly pack: readonly PackBackground[];
  readonly mine: readonly MyBackground[];
  readonly search: BackgroundSearch;
  readonly notice: string | null;
  /** Miniature : Blob (URL d'objet révoquée au démontage), chaîne (adresse du pack) ou null (aucune). */
  thumbOf(card: BackgroundCard): Promise<Blob | string | null>;
  apply(card: BackgroundCard, all: boolean): void;
  importImage(): void;
  addPage(): void;
  remove(entry: MyBackground): void;
  close(): void;
}

/** Au-delà de ce déplacement (px CSS), le doigt a fait défiler la grille : le toucher n'applique pas (Q27). */
const MOVE_SLOP = 10;
/** Largeur minimale d'une carte (Q25), pour les flèches haut et bas. */
const CARD_MIN = 192;

export const mineKey = (e: MyBackground): string => `mine:${e.file}`;
export const cardsOf = (pack: readonly PackBackground[], mine: readonly MyBackground[]): readonly BackgroundCard[] => [
  ...mine.map((item): BackgroundCard => ({ kind: "mine", key: mineKey(item), item })),
  ...pack.map((item): BackgroundCard => ({ kind: "pack", key: item.id, item })),
];
export const searchDocsOf = (pack: readonly PackBackground[], mine: readonly MyBackground[]): readonly SearchDoc[] => [
  ...mine.map((e) => ({ id: mineKey(e), label: e.name, keywords: [] })),
  ...pack.map((b) => ({ id: b.id, label: b.label, keywords: b.keywords })),
];
const labelOf = (c: BackgroundCard): string => (c.kind === "pack" ? c.item.label : c.item.name);

function Thumb(props: { readonly card: BackgroundCard; thumbOf(card: BackgroundCard): Promise<Blob | string | null> }): JSX.Element {
  const [src, setSrc] = createSignal<string | null>(null);
  let url: string | null = null;
  let alive = true;
  onCleanup(() => {
    alive = false;
    if (url !== null) URL.revokeObjectURL(url);
  });
  const c = props.card;
  // Couleur : pastille CSS seule (Q29) ; le reste : SVG, rendu de grille, miniature livrée ou enregistrée.
  if (!(c.kind === "pack" && c.item.kind === "color")) {
    void props
      .thumbOf(c)
      .then((t) => {
        if (!alive || t === null) return;
        if (typeof t === "string") setSrc(t);
        else {
          url = URL.createObjectURL(t);
          setSrc(url);
        }
      })
      .catch(() => undefined);
  }
  return (
    <span class="rb-bg-thumb" style={{ "background-color": c.item.color }}>
      <Show when={src()}>{(s) => <img src={s()} alt="" loading="lazy" decoding="async" draggable={false} />}</Show>
    </span>
  );
}

export function BackgroundsDialog(props: BackgroundsDialogProps): JSX.Element {
  let searchField: HTMLInputElement | undefined;
  let grid: HTMLDivElement | undefined;
  const [section, setSection] = createSignal<SectionId>(DEFAULT_SECTION);
  const [theme, setTheme] = createSignal<string>(ALL_THEMES);
  const [query, setQuery] = createSignal("");
  const [all, setAll] = createSignal(false);
  const [focus, setFocus] = createSignal(0);
  let applied = false;
  let down: { readonly x: number; readonly y: number } | null = null;
  let moved = false;

  const searching = (): boolean => query().trim() !== "";
  const cards = createMemo(() => cardsOf(props.pack, props.mine));
  const byKey = createMemo(() => new Map(cards().map((c) => [c.key, c] as const)));
  const shown = createMemo((): readonly BackgroundCard[] => {
    if (searching()) return props.search.search(query()).flatMap((k) => byKey().get(k) ?? []);
    if (section() === "mine") return cards().filter((c) => c.kind === "mine");
    return cards().filter((c) => c.kind === "pack" && c.item.section === section() && (theme() === ALL_THEMES || c.item.theme === theme()));
  });
  const themes = createMemo(() => {
    const s = SECTIONS.find((x) => x.id === section());
    return s === undefined || s.themes.length === 0 ? [] : [{ value: ALL_THEMES, label: ALL_THEMES_LABEL }, ...s.themes.map((t) => ({ value: t.id, label: t.label }))];
  });
  createEffect(on(shown, () => setFocus(0), { defer: true }));
  onMount(() => queueMicrotask(() => searchField?.focus()));

  const choose = (c: BackgroundCard, everyPage: boolean): void => {
    if (applied) return; // un double toucher n'applique qu'une fois (une étape, D38)
    applied = true;
    props.apply(c, everyPage);
  };
  const onKey = (e: KeyboardEvent): void => {
    if (!e.ctrlKey && !e.metaKey && ENGINE_KEYS.has(e.key)) e.stopPropagation();
    if (e.key === "Escape") {
      e.preventDefault();
      props.close();
    }
  };
  const columns = (): number => Math.max(1, Math.floor((grid?.clientWidth ?? 0) / CARD_MIN));
  const moveFocus = (to: number): void => {
    const n = shown().length;
    if (n === 0) return;
    const i = Math.min(n - 1, Math.max(0, to));
    setFocus(i);
    queueMicrotask(() => grid?.querySelectorAll<HTMLElement>("button[data-fond]")[i]?.focus());
  };
  const STEPS: Readonly<Record<string, () => number>> = { ArrowLeft: () => -1, ArrowRight: () => 1, ArrowUp: () => -columns(), ArrowDown: () => columns() };
  const onCardKey = (e: KeyboardEvent, c: BackgroundCard, i: number): void => {
    if (e.key === "Enter") {
      e.preventDefault();
      choose(c, e.shiftKey || all());
      return;
    }
    const step = Object.hasOwn(STEPS, e.key) ? STEPS[e.key] : undefined;
    if (step !== undefined) {
      e.preventDefault();
      moveFocus(i + step());
    } else if (e.key === "Home") {
      e.preventDefault();
      moveFocus(0);
    } else if (e.key === "End") {
      e.preventDefault();
      moveFocus(shown().length - 1);
    }
  };
  const onDown = (e: PointerEvent): void => {
    down = { x: e.clientX, y: e.clientY };
    moved = false;
  };
  const onMove = (e: PointerEvent): void => {
    if (down !== null && Math.hypot(e.clientX - down.x, e.clientY - down.y) > MOVE_SLOP) moved = true;
  };
  const onClick = (c: BackgroundCard): void => {
    const scrolled = moved;
    down = null;
    moved = false;
    if (!scrolled) choose(c, all());
  };

  return (
    <div class="rb-bg-veil" onPointerDown={(e) => { if (e.target === e.currentTarget) props.close(); }}>
      <div class="rb-bg-dialog" role="dialog" aria-modal="true" aria-labelledby="rb-bg-title" data-panel="backgrounds" onKeyDown={onKey}>
        <header class="rb-bg-head">
          <h2 id="rb-bg-title">Fonds</h2>
          <label class="rb-bg-search">
            <Icon name="search" />
            <input ref={searchField} type="search" data-fonds="search" aria-label="Rechercher un fond" placeholder="Rechercher un fond" value={query()} onInput={(e) => setQuery(e.currentTarget.value)} />
          </label>
        </header>
        <div class="rb-bg-body">
          <nav class="rb-bg-rail" aria-label="Sections">
            <RadioChoices
              name="fonds-section"
              label="Sections"
              look="rail"
              options={SECTIONS.map((s) => ({ value: s.id, label: s.label, icon: s.icon }))}
              value={section()}
              choose={(v) => {
                setSection(v);
                setTheme(ALL_THEMES);
                setQuery("");
              }}
            />
          </nav>
          <section class="rb-bg-main" aria-label="Fonds">
            <Show when={!searching() && themes().length > 0}>
              <RadioChoices name="fonds-theme" label="Thèmes" look="chips" options={themes()} value={theme()} choose={(v) => setTheme(v)} />
            </Show>
            <Show when={!searching() && section() === "mine"}>
              <div class="rb-bg-actions">
                <button type="button" data-fonds="import" onClick={() => props.importImage()}>
                  <Icon name="image-plus" />
                  <span>Importer une image…</span>
                </button>
                <button type="button" data-fonds="page" onClick={() => props.addPage()}>
                  <Icon name="file-plus" />
                  <span>Cette page</span>
                </button>
                <div class="rb-bg-drop" data-fonds="drop">Déposez une image ici</div>
              </div>
            </Show>
            <Show when={searching()}>
              <h3 class="rb-bg-results">Résultats</h3>
            </Show>
            <Show when={props.notice}>{(m) => <p class="rb-bg-notice" data-fonds="notice" role="status">{m()}</p>}</Show>
            <Show when={searching() && shown().length === 0}>
              <p class="rb-bg-empty" data-fonds="empty">
                Aucun fond ne correspond
                <Show when={props.search.suggest(query())}>{(s) => <> — essayez « {s()} »</>}</Show>
              </p>
            </Show>
            <div ref={grid} class="rb-bg-grid" onPointerDown={onDown} onPointerMove={onMove} onPointerCancel={() => (moved = true)}>
              <For each={shown()}>
                {(c, i) => (
                  <div class="rb-bg-card">
                    <button type="button" class="rb-bg-pick" data-fond={c.key} aria-label={labelOf(c)} tabIndex={i() === focus() ? 0 : -1}
                      onClick={() => onClick(c)} onKeyDown={(e) => onCardKey(e, c, i())} onFocus={() => setFocus(i())}>
                      <Thumb card={c} thumbOf={(x) => props.thumbOf(x)} />
                      <span class="rb-bg-label">{labelOf(c)}</span>
                    </button>
                    <Show when={c.kind === "mine" ? c.item : null}>
                      {(e) => (
                        <button type="button" class="rb-bg-remove" data-fonds-remove={e().file} aria-label={`Retirer ${e().name}`} onClick={() => props.remove(e())}>
                          <Icon name="close" />
                        </button>
                      )}
                    </Show>
                  </div>
                )}
              </For>
            </div>
          </section>
        </div>
        <footer class="rb-bg-foot">
          <button type="button" role="switch" class="rb-bg-switch" data-fonds="all" aria-checked={all()} onClick={() => setAll(!all())}>
            <span class="rb-bg-knob" aria-hidden="true" />
            <span>Toutes les pages</span>
          </button>
          <span class="rb-bg-hint">Entrée : cette page · Maj+Entrée : toutes les pages · Ctrl+Maj+F : ouvrir ou fermer</span>
        </footer>
        {/* Fermer : en haut à droite (grille CSS), dernier dans l'ordre de tabulation (Q28). */}
        <button type="button" class="rb-bg-close" data-fonds="close" aria-label="Fermer" title="Fermer (Échap)" onClick={() => props.close()}>
          <Icon name="close" />
        </button>
      </div>
    </div>
  );
}
