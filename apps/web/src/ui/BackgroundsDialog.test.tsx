// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createSignal } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MyBackground } from "../app/my-backgrounds";
import type { PackBackground } from "../backgrounds/catalog";
import { createBackgroundSearch } from "../backgrounds/search";
import { BackgroundsDialog, searchDocsOf, type BackgroundCard } from "./BackgroundsDialog";

afterEach(cleanup);

const pb = (id: string, section: PackBackground["section"], theme: string, label: string, keywords: string[], kind: PackBackground["kind"] = "color"): PackBackground =>
  ({ id, section, theme, label, keywords, kind, color: "#ffffff", grid: null, photo: null });
const PACK: readonly PackBackground[] = [
  pb("blanc", "colors", "claires", "Blanc (aucun fond)", ["blanc"]),
  pb("creme", "colors", "claires", "Crème", ["crème"]),
  pb("ardoise", "colors", "sombres", "Ardoise", ["ardoise", "tableau noir"]),
  pb("seyes-8mm", "lines", "seyes", "Seyès 8 mm", ["seyès", "cahier"], "grid"),
  pb("portees-moyennes", "lines", "portees", "Portées moyennes", ["portée", "musique"], "grid"),
  pb("venn", "lessons", "reflexion", "Diagramme de Venn", ["venn"], "svg"),
];
const MINE: readonly MyBackground[] = [{ file: "page-1.json", name: "Page 1 — 27/11 10:00", created: "2026-11-27T10:00:00.000Z", origin: "page", color: "#ffffff", grid: null, image: { file: "page-1.png", mime: "image/png", w: 3840, h: 2160 } }];
const TRACES = ["polyhaven", "poly haven", "wikimedia", "commons", "openverse", "flickr", "unsplash", "pixabay", "pexels", "http", "www."];

function setup(over: Partial<{ mine: readonly MyBackground[]; notice: string | null; thumb: Blob | string | null }> = {}) {
  const apply = vi.fn<(c: BackgroundCard, all: boolean) => void>();
  const close = vi.fn();
  const importImage = vi.fn();
  const addPage = vi.fn();
  const remove = vi.fn();
  const thumbOf = vi.fn(async () => over.thumb ?? null);
  const mine = over.mine ?? [];
  const r = render(() => (
    <BackgroundsDialog pack={PACK} mine={mine} search={createBackgroundSearch(searchDocsOf(PACK, mine))} notice={over.notice ?? null}
      thumbOf={thumbOf} apply={apply} importImage={importImage} addPage={addPage} remove={remove} close={close} />
  ));
  const q = <T extends Element>(sel: string): T => {
    const el = r.container.querySelector<T>(sel);
    if (el === null) throw new Error(`absent : ${sel}`);
    return el;
  };
  const cards = (): string[] => [...r.container.querySelectorAll<HTMLElement>("button[data-fond]")].map((b) => b.dataset["fond"]!);
  return { ...r, q, cards, apply, close, importImage, addPage, remove, thumbOf };
}
const flush = (): Promise<void> => new Promise((ok) => setTimeout(ok, 0));
const typeIn = (el: HTMLInputElement, v: string): void => {
  el.value = v;
  fireEvent.input(el);
};

describe("personnalisation-1b : fenêtre des fonds (Q25 à Q29)", () => {
  it("ouverture : section Couleurs, focus dans la recherche, rail et puces en radiogroup, modale", async () => {
    const { q, cards } = setup();
    await flush();
    const dialog = q<HTMLElement>('[role="dialog"]');
    expect([dialog.getAttribute("aria-modal"), dialog.dataset["panel"]]).toEqual(["true", "backgrounds"]);
    expect(q('[data-edit="fonds-section"] [data-choice="colors"]').getAttribute("aria-checked")).toBe("true");
    expect(document.activeElement).toBe(q('input[data-fonds="search"]'));
    expect(q('[data-edit="fonds-theme"]').getAttribute("role")).toBe("radiogroup");
    expect(cards()).toEqual(["blanc", "creme", "ardoise"]);
    fireEvent.click(q('[data-edit="fonds-theme"] [data-choice="sombres"]'));
    expect(cards()).toEqual(["ardoise"]);
    fireEvent.click(q('[data-edit="fonds-section"] [data-choice="lines"]'));
    expect(cards()).toEqual(["seyes-8mm", "portees-moyennes"]);
  });

  it("toucher une carte applique à la page montrée, une seule fois (double toucher, Review Focus)", () => {
    const { q, apply } = setup();
    const card = q('button[data-fond="ardoise"]');
    fireEvent.pointerDown(card, { clientX: 10, clientY: 10 });
    fireEvent.click(card);
    fireEvent.click(card);
    expect(apply).toHaveBeenCalledTimes(1);
    expect(apply.mock.calls[0]![0]).toMatchObject({ kind: "pack", key: "ardoise" });
    expect(apply.mock.calls[0]![1]).toBe(false);
  });

  it("« Toutes les pages » (interrupteur) : le toucher applique à toutes", () => {
    const { q, apply } = setup();
    const sw = q('button[role="switch"][data-fonds="all"]');
    expect(sw.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(sw);
    expect(sw.getAttribute("aria-checked")).toBe("true");
    fireEvent.click(q('button[data-fond="creme"]'));
    expect(apply.mock.calls[0]![1]).toBe(true);
  });

  it("un toucher qui a défilé n'applique pas (Review Focus, Q27)", () => {
    const { q, apply } = setup();
    const card = q('button[data-fond="creme"]');
    fireEvent.pointerDown(card, { clientX: 100, clientY: 100 });
    fireEvent.pointerMove(card, { clientX: 100, clientY: 140 });
    fireEvent.click(card);
    expect(apply).not.toHaveBeenCalled();
    fireEvent.pointerDown(card, { clientX: 100, clientY: 100 });
    fireEvent.pointerMove(card, { clientX: 104, clientY: 103 });
    fireEvent.click(card);
    expect(apply).toHaveBeenCalledTimes(1);
  });

  it("Entrée applique à la page, Maj+Entrée à toutes ; flèches, Début, Fin déplacent le focus", async () => {
    const a = setup();
    const first = a.q<HTMLButtonElement>('button[data-fond="blanc"]');
    expect(first.tabIndex).toBe(0);
    first.focus();
    fireEvent.keyDown(first, { key: "ArrowRight" });
    await flush();
    expect(document.activeElement).toBe(a.q('button[data-fond="creme"]'));
    fireEvent.keyDown(document.activeElement!, { key: "End" });
    await flush();
    expect(document.activeElement).toBe(a.q('button[data-fond="ardoise"]'));
    fireEvent.keyDown(document.activeElement!, { key: "Home" });
    await flush();
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(first, { key: "Enter", shiftKey: true });
    expect(a.apply.mock.calls[0]![1]).toBe(true);
    cleanup();
    const b = setup();
    fireEvent.keyDown(b.q('button[data-fond="creme"]'), { key: "Enter" });
    expect(b.apply.mock.calls[0]).toEqual([expect.objectContaining({ key: "creme" }), false]);
  });

  it("Suppr, Retour arrière, Espace et Échap ne remontent pas ; Ctrl+Z remonte ; Échap ferme", () => {
    const { q, close } = setup();
    const seen: string[] = [];
    const listen = (e: KeyboardEvent): void => void seen.push(`${e.ctrlKey ? "Ctrl+" : ""}${e.key}`);
    window.addEventListener("keydown", listen);
    try {
      const input = q('input[data-fonds="search"]');
      for (const key of ["Delete", "Backspace", " "]) fireEvent.keyDown(input, { key, bubbles: true });
      fireEvent.keyDown(input, { key: "z", ctrlKey: true, bubbles: true });
      expect(seen).toEqual(["Ctrl+z"]);
      expect(close).not.toHaveBeenCalled();
      fireEvent.keyDown(q('button[data-fond="creme"]'), { key: "Escape", bubbles: true });
      expect(seen).toEqual(["Ctrl+z"]);
      expect(close).toHaveBeenCalledTimes(1);
    } finally {
      window.removeEventListener("keydown", listen);
    }
  });

  it("recherche : « Résultats » remplace la section ; aucun résultat : message et suggestion ; champ vidé : retour", () => {
    const { q, cards, container } = setup();
    const input = q<HTMLInputElement>('input[data-fonds="search"]');
    typeIn(input, "tableau noir");
    expect(container.textContent).toContain("Résultats");
    expect(cards()[0]).toBe("ardoise");
    expect(container.querySelector('[data-edit="fonds-theme"]')).toBeNull();
    typeIn(input, "musiqe");
    expect(cards()).toEqual(["portees-moyennes"]);
    typeIn(input, "zzzzzzzz");
    expect(cards()).toEqual([]);
    expect(q('[data-fonds="empty"]').textContent).toContain("Aucun fond ne correspond");
    typeIn(input, "solfeje zzzzzzzz");
    expect(q('[data-fonds="empty"]').textContent).toContain("« solfège »");
    typeIn(input, "");
    expect(cards()).toEqual(["blanc", "creme", "ardoise"]);
  });

  it("Mes fonds : trois actions, cartes avec × de 44 px, retirer et actions appellent leurs rappels", () => {
    const { q, cards, importImage, addPage, remove } = setup({ mine: MINE });
    fireEvent.click(q('[data-edit="fonds-section"] [data-choice="mine"]'));
    expect(cards()).toEqual(["mine:page-1.json"]);
    expect(q('[data-fonds="drop"]').textContent).toBe("Déposez une image ici");
    fireEvent.click(q('button[data-fonds="import"]'));
    fireEvent.click(q('button[data-fonds="page"]'));
    fireEvent.click(q('button[data-fonds-remove="page-1.json"]'));
    expect([importImage.mock.calls.length, addPage.mock.calls.length]).toEqual([1, 1]);
    expect(remove).toHaveBeenCalledWith(MINE[0]);
    expect(q('button[data-fonds-remove="page-1.json"]').getAttribute("aria-label")).toBe("Retirer Page 1 — 27/11 10:00");
  });

  it("avis montré dans la fenêtre ; Fermer et le voile ferment", () => {
    const { q, close } = setup({ notice: "seules les images deviennent des fonds" });
    expect(q('[data-fonds="notice"]').textContent).toBe("seules les images deviennent des fonds");
    fireEvent.click(q('button[data-fonds="close"]'));
    fireEvent.pointerDown(q(".rb-bg-veil"));
    expect(close).toHaveBeenCalledTimes(2);
  });

  it("miniatures : couleur sans miniature ; Blob en URL d'objet révoquée au démontage ; chaîne telle quelle", async () => {
    const created: string[] = [];
    const revoked: string[] = [];
    const make = vi.spyOn(URL, "createObjectURL").mockImplementation(() => { const u = `blob:essai-${created.length}`; created.push(u); return u; });
    const drop = vi.spyOn(URL, "revokeObjectURL").mockImplementation((u) => void revoked.push(u));
    try {
      const { q, thumbOf, unmount } = setup({ thumb: new Blob([new Uint8Array([1])], { type: "image/png" }) });
      await flush();
      expect(thumbOf).not.toHaveBeenCalled();
      fireEvent.click(q('[data-edit="fonds-section"] [data-choice="lines"]'));
      await flush();
      expect(thumbOf).toHaveBeenCalledTimes(2);
      expect(q<HTMLImageElement>('button[data-fond="seyes-8mm"] img').getAttribute("src")).toMatch(/^blob:essai-/);
      unmount();
      expect(revoked.sort()).toEqual(created.sort());
    } finally {
      make.mockRestore();
      drop.mockRestore();
    }
  });

  it("aucune trace d'un service extérieur dans le texte visible ni dans le fichier du composant (Q33)", () => {
    const { container } = setup({ mine: MINE });
    const text = (container.textContent ?? "").toLowerCase();
    const source = readFileSync(join(__dirname, "BackgroundsDialog.tsx"), "utf8").toLowerCase();
    for (const t of TRACES) {
      expect(text, t).not.toContain(t);
      expect(source, t).not.toContain(t);
    }
  });
});

const mineN = (n: number): readonly MyBackground[] =>
  Array.from({ length: n }, (_, i) => ({ file: `f${i}.json`, name: `Fond ${i}`, created: `2026-11-27T10:00:0${i}.000Z`, origin: "grid" as const, color: "#ffffff", grid: null, image: null }));
const openMine = (r: ReturnType<typeof setup>): void => void fireEvent.click(r.q('[data-edit="fonds-section"] [data-choice="mine"]'));

describe("T13 : clavier, focus et lecture d'écran de la fenêtre des fonds", () => {
  it("le conteneur prend le focus (tabindex -1) : un clic sur le titre ou un vide ne l'envoie pas sur le body ; Retour arrière y reste", async () => {
    const r = setup();
    await flush();
    const dialog = r.q<HTMLElement>(".rb-bg-dialog");
    expect(dialog.getAttribute("tabindex")).toBe("-1");
    fireEvent.pointerDown(r.q("#rb-bg-title"));
    expect(document.activeElement).toBe(dialog);
    const seen: string[] = [];
    const listen = (e: KeyboardEvent): void => void seen.push(e.key);
    window.addEventListener("keydown", listen);
    try {
      fireEvent.keyDown(dialog, { key: "Backspace", bubbles: true });
      expect(seen).toEqual([]);
      fireEvent.keyDown(dialog, { key: "Escape", bubbles: true });
      expect(r.close).toHaveBeenCalledTimes(1);
    } finally {
      window.removeEventListener("keydown", listen);
    }
    r.q<HTMLElement>('input[data-fonds="search"]').focus();
    fireEvent.pointerDown(r.q('input[data-fonds="search"]'));
    expect(document.activeElement).toBe(r.q('input[data-fonds="search"]'));
  });

  it("Tab après « Fermer » revient à la recherche ; Maj+Tab depuis la recherche va à « Fermer » (piège de focus)", async () => {
    const r = setup();
    await flush();
    const close = r.q<HTMLElement>('button[data-fonds="close"]');
    const search = r.q<HTMLElement>('input[data-fonds="search"]');
    close.focus();
    expect(fireEvent.keyDown(close, { key: "Tab" })).toBe(false);
    expect(document.activeElement).toBe(search);
    expect(fireEvent.keyDown(search, { key: "Tab", shiftKey: true })).toBe(false);
    expect(document.activeElement).toBe(close);
    const mid = r.q<HTMLElement>('button[data-fonds="all"]');
    mid.focus();
    expect(fireEvent.keyDown(mid, { key: "Tab" })).toBe(true);
    expect(document.activeElement).toBe(mid);
  });

  it("retirer une carte : le focus passe à la carte voisine, ou à la recherche s'il n'en reste aucune", async () => {
    const [mine, setMine] = createSignal<readonly MyBackground[]>(mineN(2));
    const remove = vi.fn(async (e: MyBackground) => {
      setMine((m) => m.filter((x) => x.file !== e.file));
    });
    const r = render(() => (
      <BackgroundsDialog pack={PACK} mine={mine()} search={createBackgroundSearch(searchDocsOf(PACK, mine()))} notice={null}
        thumbOf={async () => null} apply={vi.fn()} importImage={vi.fn()} addPage={vi.fn()} remove={remove} close={vi.fn()} />
    ));
    await flush();
    fireEvent.click(r.container.querySelector('[data-edit="fonds-section"] [data-choice="mine"]')!);
    const btn = r.container.querySelector<HTMLElement>('[data-fonds-remove="f1.json"]')!;
    btn.focus();
    fireEvent.click(btn);
    await flush();
    await flush();
    expect(document.activeElement).toBe(r.container.querySelector('button[data-fond="mine:f0.json"]'));
    const last = r.container.querySelector<HTMLElement>('[data-fonds-remove="f0.json"]')!;
    last.focus();
    fireEvent.click(last);
    await flush();
    await flush();
    expect(document.activeElement).toBe(r.container.querySelector('input[data-fonds="search"]'));
  });

  it("colonnes : lues dans gridTemplateColumns ; repli sur la largeur avec l'écart de 16 px", async () => {
    const r = setup({ mine: mineN(6) });
    await flush();
    openMine(r);
    const grid = r.q<HTMLElement>(".rb-bg-grid");
    const first = r.q<HTMLElement>('button[data-fond="mine:f0.json"]');
    first.focus();
    // Repli : 600 px = 2 colonnes (3 x 192 + 2 x 16 = 608 > 600), floor(600 / 192) en aurait compté 3.
    Object.defineProperty(grid, "clientWidth", { value: 600, configurable: true });
    fireEvent.keyDown(first, { key: "ArrowDown" });
    await flush();
    expect(document.activeElement).toBe(r.q('button[data-fond="mine:f2.json"]'));
    // Mesure : quatre pistes déclarées par la feuille de style.
    const spy = vi.spyOn(window, "getComputedStyle").mockReturnValue({ gridTemplateColumns: "192px 192px 192px 192px" } as CSSStyleDeclaration);
    try {
      fireEvent.keyDown(document.activeElement!, { key: "Home" });
      await flush();
      fireEvent.keyDown(document.activeElement!, { key: "ArrowDown" });
      await flush();
      expect(document.activeElement).toBe(r.q('button[data-fond="mine:f4.json"]'));
    } finally {
      spy.mockRestore();
    }
  });

  it("pointercancel : un clic clavier qui suit applique (moved remis à zéro)", () => {
    const { q, apply } = setup();
    const card = q('button[data-fond="ardoise"]');
    fireEvent.pointerDown(card, { clientX: 1, clientY: 1 });
    fireEvent.pointerCancel(q(".rb-bg-grid"));
    fireEvent.click(card);
    expect(apply).toHaveBeenCalledTimes(1);
  });

  it("la région role=status est montée en permanence, vide sans avis", () => {
    const { q } = setup();
    const s = q<HTMLElement>('[data-fonds="notice"]');
    expect([s.getAttribute("role"), s.textContent]).toEqual(["status", ""]);
  });

  it("les « × » de Mes fonds ne sont arrêts de tabulation que pour la carte focalisée", async () => {
    const r = setup({ mine: mineN(2) });
    await flush();
    openMine(r);
    const tabs = [...r.container.querySelectorAll<HTMLElement>("[data-fonds-remove]")].map((b) => b.getAttribute("tabindex"));
    expect(tabs).toEqual(["0", "-1"]);
  });
});
