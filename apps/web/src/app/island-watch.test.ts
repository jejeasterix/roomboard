// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { ISLANDS_RESIZED, watchIslands } from "./island-watch";

function setup() {
  const root = document.createElement("div");
  document.body.append(root);
  const island = document.createElement("div");
  island.className = "rb-island";
  island.dataset["island"] = "outils";
  const button = document.createElement("button");
  island.append(button);
  root.append(island);
  const frames: (() => void)[] = [];
  const onChange = vi.fn();
  const stop = watchIslands(
    root,
    onChange,
    (cb) => frames.push(cb),
    (id) => {
      frames[id - 1] = () => undefined;
    },
  );
  const flush = async (): Promise<void> => {
    await Promise.resolve();
    for (const f of frames.splice(0)) f();
  };
  return { root, island, button, onChange, stop, flush, frames };
}

describe("watchIslands (OG27)", () => {
  it("îlot déplacé (style top) : un appel à la prochaine image, même pour plusieurs changements", async () => {
    const { island, onChange, flush } = setup();
    island.style.top = "80px";
    island.style.left = "12px";
    await flush();
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("îlot ajouté ou retiré : un appel", async () => {
    const { root, island, onChange, flush } = setup();
    const other = document.createElement("div");
    other.className = "rb-island";
    other.dataset["island"] = "pages";
    root.append(other);
    await flush();
    island.remove();
    await flush();
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("intérieur d'un îlot, élément hors îlot ou popover : rien", async () => {
    const { root, island, button, onChange, flush } = setup();
    island.dataset["camera"] = "1,0,0"; // attribut hors de la liste des mouvements
    button.setAttribute("aria-pressed", "true");
    button.append(document.createElement("span"));
    const plain = document.createElement("div");
    root.append(plain);
    plain.style.top = "4px";
    // Popover de lien : habillé en îlot, sans `data-island` ; il suit la sélection, la page ne saute pas.
    const pop = document.createElement("div");
    pop.className = "rb-island rb-link-pop";
    root.append(pop);
    pop.style.top = "120px";
    await flush();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("OG30 : taille d'un îlot changée sans attribut (ISLANDS_RESIZED d'IslandLayer) : un appel par image, avec les mouvements", async () => {
    const { island, button, onChange, flush } = setup();
    button.dispatchEvent(new Event(ISLANDS_RESIZED, { bubbles: true }));
    island.style.top = "80px";
    island.dispatchEvent(new Event(ISLANDS_RESIZED, { bubbles: true }));
    await flush();
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("arrêt : plus aucun appel, image en attente annulée", async () => {
    const { island, onChange, flush, stop } = setup();
    island.style.top = "80px";
    await Promise.resolve();
    stop();
    await flush();
    island.style.top = "90px";
    island.dispatchEvent(new Event(ISLANDS_RESIZED, { bubbles: true }));
    await flush();
    expect(onChange).not.toHaveBeenCalled();
  });
});
