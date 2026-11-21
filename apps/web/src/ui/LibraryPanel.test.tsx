// @vitest-environment happy-dom
import { cleanup, fireEvent, render, waitFor } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createResourceLibrary, fileNameOf } from "../app/library";
import { createMemoryLibraryFiles } from "../platform/library-files";
import { LibraryPanel, type LibraryPanelProps } from "./LibraryPanel";

afterEach(cleanup);
URL.createObjectURL ??= () => "blob:x";
URL.revokeObjectURL ??= () => undefined;

const enc = (s: string) => new TextEncoder().encode(s);
function setup(over: Partial<LibraryPanelProps> = {}) {
  const library = createResourceLibrary({
    files: [createMemoryLibraryFiles("mine")],
    zip: { unzip: async () => [], zip: async () => enc("PK") },
    now: () => "n",
    appVersion: "c4",
  });
  const placed: [string, unknown][] = [];
  const props: LibraryPanelProps = {
    library,
    shared: { desktop: false, chosen: () => false, choose: async () => false },
    packs: { pick: vi.fn(async () => null), save: vi.fn(async () => true) },
    capture: vi.fn(async (what) => ({ bytes: enc(what), kind: what === "grid" ? ("grid" as const) : ("fragment" as const), thumbnail: new Blob([enc("png")], { type: "image/png" }) })),
    place: vi.fn(async (e, at) => void placed.push([e.name, at])),
    confirm: vi.fn(async () => true),
    say: vi.fn(async () => undefined),
    close: vi.fn(),
    ...over,
  };
  const r = render(() => <LibraryPanel {...props} />);
  const q = <T extends Element>(sel: string): T => {
    const el = r.container.querySelector<T>(sel);
    if (el === null) throw new Error(`absent : ${sel}`);
    return el;
  };
  return { ...r, props, library, placed, q };
}
async function addSelection(s: ReturnType<typeof setup>, name: string, keywords = "") {
  fireEvent.click(s.q('[data-lib="add-selection"]'));
  fireEvent.input(s.q<HTMLInputElement>('[data-lib="name"]'), { target: { value: name } });
  fireEvent.input(s.q<HTMLInputElement>('[data-lib="keywords"]'), { target: { value: keywords } });
  fireEvent.click(s.q('[data-lib="submit"]'));
  await waitFor(() => s.q(`.rb-resource[data-resource="${fileNameOf(name)}.rbitem"]`));
}

describe("C4 : panneau Bibliothèque", () => {
  it("C4 : coque avec dossier déjà choisi : « Rouvrir le dossier partagé… »", () => {
    const s = setup({ shared: { desktop: true, chosen: () => true, choose: async () => true } });
    expect(s.q('[data-lib="choose-shared"]').textContent).toBe("Rouvrir le dossier partagé…");
  });

  it("C4 : rafraîchissement après import de paquet : le dossier importé s'ouvre et se liste", async () => {
    const s = setup({ packs: { pick: vi.fn(async () => ({ name: "Paquet.rbpack", bytes: enc("x") })), save: vi.fn(async () => true) } });
    s.library.importPack = async () => {
      await s.library.mkdir("mine", "", "Paquet");
      await s.library.add("mine", "Paquet", { bytes: enc("a"), kind: "fragment", thumbnail: null, name: "Dedans", keywords: [], description: "" });
      return { folder: "Paquet", count: 1 };
    };
    fireEvent.click(s.q('[data-lib="import"]'));
    await waitFor(() => s.q('.rb-resource[data-resource="Paquet/dedans.rbitem"]'));
    expect(s.q('[data-lib="up"]').textContent).toContain("Paquet");
    expect(s.props.say).toHaveBeenCalledWith("Paquet.rbpack : 1 ressource importée dans « Paquet »");
  });

  it("C4 : deux sections ; web : dossier partagé application de bureau seulement", () => {
    const s = setup();
    expect(s.q('section[data-root="mine"]').textContent).toContain("Mes ressources");
    expect(s.q('section[data-root="shared"]').textContent).toContain("Dossier partagé : application de bureau seulement");
  });

  it("C4 : coque sans dossier choisi : « Choisir le dossier partagé… »", () => {
    const choose = vi.fn(async () => true);
    const s = setup({ shared: { desktop: true, chosen: () => false, choose } });
    fireEvent.click(s.q('[data-lib="choose-shared"]'));
    expect(choose).toHaveBeenCalled();
  });

  it("C4 : Ajouter la sélection : capture, carte avec vignette", async () => {
    const s = setup();
    await addSelection(s, "Moitié", "fraction, moitié");
    expect(s.props.capture).toHaveBeenCalledWith("selection");
    expect(s.q('.rb-resource[data-resource="moitie.rbitem"] img.rb-thumb')).toBeTruthy();
    expect(s.library.search("frac").map((e) => e.keywords)).toEqual([["fraction", "moitié"]]);
  });

  it("C4 : Ajouter la grille de la page : capture « grid »", async () => {
    const s = setup();
    fireEvent.click(s.q('[data-lib="add-grid"]'));
    fireEvent.input(s.q<HTMLInputElement>('[data-lib="name"]'), { target: { value: "Seyès" } });
    fireEvent.click(s.q('[data-lib="submit"]'));
    await waitFor(() => s.q('.rb-resource[data-resource="seyes.rbitem"]'));
    expect(s.props.capture).toHaveBeenCalledWith("grid");
  });

  it("C4 : recherche « frac » : seule la ressource au mot-clé reste", async () => {
    const s = setup();
    await addSelection(s, "Moitié", "fraction");
    await addSelection(s, "Carré");
    fireEvent.input(s.q<HTMLInputElement>('[data-lib="search"]'), { target: { value: "frac" } });
    await waitFor(() => expect(s.q('[data-lib="results"]').querySelectorAll(".rb-resource")).toHaveLength(1));
    expect(s.q('[data-lib="results"] .rb-resource').getAttribute("data-resource")).toBe("moitie.rbitem");
  });

  it("C4 : double-clic et Entrée posent au centre (at = null)", async () => {
    const s = setup();
    await addSelection(s, "Moitié");
    const card = s.q<HTMLElement>('.rb-resource[data-resource="moitie.rbitem"]');
    fireEvent.dblClick(card);
    fireEvent.keyDown(card, { key: "Enter" });
    await waitFor(() => expect(s.placed).toEqual([["Moitié", null], ["Moitié", null]]));
  });

  it("C4 : Nouveau dossier, puis ouvert ; ajout dans le dossier ouvert", async () => {
    const s = setup();
    fireEvent.click(s.q('[data-lib="new-folder"]'));
    fireEvent.input(s.q<HTMLInputElement>('[data-lib="folder-name"]'), { target: { value: "Fractions" } });
    fireEvent.click(s.q('[data-lib="create-folder"]'));
    await waitFor(() => expect(s.q('[data-lib="up"]').textContent).toContain("Fractions"));
    fireEvent.click(s.q('[data-lib="add-selection"]'));
    fireEvent.input(s.q<HTMLInputElement>('[data-lib="name"]'), { target: { value: "Moitié" } });
    fireEvent.click(s.q('[data-lib="submit"]'));
    await waitFor(() => s.q('.rb-resource[data-resource="Fractions/moitie.rbitem"]'));
  });

  it("C4 : Vider après confirmation ; refus : rien", async () => {
    const s = setup();
    await addSelection(s, "Moitié");
    (s.props.confirm as ReturnType<typeof vi.fn>).mockResolvedValueOnce(false);
    fireEvent.click(s.q('[data-lib="clear"]'));
    await Promise.resolve();
    expect(s.library.folder("mine", "").items).toHaveLength(1);
    fireEvent.click(s.q('[data-lib="clear"]'));
    await waitFor(() => expect(s.library.folder("mine", "").items).toHaveLength(0));
    expect(s.props.confirm).toHaveBeenLastCalledWith("Vider « Mes ressources » ? Toutes ses ressources seront supprimées.");
  });

  it("C4 : Exporter (.rbpack) enregistre le paquet du dossier ouvert", async () => {
    const s = setup();
    await addSelection(s, "Moitié");
    fireEvent.click(s.q('[data-lib="export"]'));
    await waitFor(() => expect(s.props.packs.save).toHaveBeenCalledWith("Mes ressources.rbpack", enc("PK")));
  });
});
