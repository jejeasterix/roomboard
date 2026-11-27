// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { watchIslands } from "./island-watch";

function setup() {
  const root = document.createElement("div");
  document.body.append(root);
  const island = document.createElement("div");
  island.className = "rb-island";
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
    root.append(other);
    await flush();
    island.remove();
    await flush();
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("intérieur d'un îlot ou élément hors îlot : rien", async () => {
    const { root, button, onChange, flush } = setup();
    button.setAttribute("aria-pressed", "true");
    button.append(document.createElement("span"));
    const plain = document.createElement("div");
    root.append(plain);
    plain.style.top = "4px";
    await flush();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("arrêt : plus aucun appel, image en attente annulée", async () => {
    const { island, onChange, flush, stop } = setup();
    island.style.top = "80px";
    await Promise.resolve();
    stop();
    await flush();
    island.style.top = "90px";
    await flush();
    expect(onChange).not.toHaveBeenCalled();
  });
});
