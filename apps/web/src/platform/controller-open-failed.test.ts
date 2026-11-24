import { describe, expect, it, vi } from "vitest";
import { createFileController } from "./controller";
import type { FileHost, Notify, ShellPort } from "./files";

/** Ouverture réussie dans la boîte, puis `openInTab` qui lève « quota dépassé » (controller.ts:166). */
function setup(notify: Notify) {
  const shell: ShellPort = { confirm: async () => true, notify, guardClose: () => () => undefined, setTitle: () => undefined };
  const host = {
    kind: "repli",
    open: async () => ({ name: "a.roomboard", bytes: new Uint8Array(), target: { kind: "ask", name: "a.roomboard" } }),
    pick: async () => [],
    save: async () => null,
  } as unknown as FileHost;
  return createFileController({
    versions: { state: () => ({ version: 0 }), onState: () => () => undefined },
    host,
    shell,
    opened: null,
    openInTab: async () => {
      throw new Error("quota dépassé");
    },
    newTab: async () => undefined,
    now: () => "2026-11-24T00:00:00Z",
    appVersion: "0.1.0",
    encode: async () => new Uint8Array(),
    importFiles: async () => undefined,
  });
}

describe("échec d'ouverture dans un nouvel onglet (OF13, D9 : fail coupé en say + fail)", () => {
  it("le texte dit est « Ouverture impossible (a.roomboard) : quota dépassé »", async () => {
    const notes: string[] = [];
    const ctl = setup(async (m) => {
      notes.push(m);
    });
    expect(await ctl.run("open")).toBe(false);
    expect(notes).toEqual(["Ouverture impossible (a.roomboard) : quota dépassé"]);
  });

  it("boîte en échec : console.warn reçoit le texte d'origine, puis l'abandon de la commande", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const ctl = setup(async () => {
        throw new Error("boîte fermée");
      });
      expect(await ctl.run("open")).toBe(false);
      expect(warn.mock.calls.map((c) => c.join(" "))).toEqual([
        "RoomBoard : Ouverture impossible (a.roomboard) : quota dépassé",
        "RoomBoard : commande de fichier abandonnée (boîte fermée)",
      ]);
    } finally {
      warn.mockRestore();
    }
  });
});
