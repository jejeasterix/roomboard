import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as openExport from "../app/open-export";
import * as controller from "./controller";
import { messageOf, openFailedMessage } from "./messages";

describe("messages (OF13, D9)", () => {
  it("messageOf : message d'une Error, sinon String(e)", () => {
    expect(messageOf(new Error("quota dépassé"))).toBe("quota dépassé");
    expect(messageOf("déjà une chaîne")).toBe("déjà une chaîne");
    expect(messageOf(42)).toBe("42");
  });

  it("openFailedMessage : « Ouverture impossible (<nom>) : <message> »", () => {
    expect(openFailedMessage("a.roomboard", new Error("quota dépassé"))).toBe("Ouverture impossible (a.roomboard) : quota dépassé");
    expect(openFailedMessage("x.pdf", "fichier chiffré")).toBe("Ouverture impossible (x.pdf) : fichier chiffré");
  });

  it("mêmes fonctions réexportées par controller.ts et open-export.ts (H3)", () => {
    expect(controller.messageOf).toBe(messageOf);
    expect(openExport.openFailedMessage).toBe(openFailedMessage);
  });

  it("feuille : aucun import", () => {
    expect(readFileSync(new URL("./messages.ts", import.meta.url), "utf8")).not.toMatch(/^\s*(import|export .* from)\s/m);
  });

  it("gabarit écrit une seule fois : aucun autre module (page, CLI) ne compose « Ouverture impossible (${…}) »", () => {
    const roots = [new URL("../", import.meta.url), new URL("../../../cli/src/", import.meta.url)];
    const found: string[] = [];
    for (const root of roots) {
      for (const entry of readdirSync(root, { recursive: true, encoding: "utf8" })) {
        const rel = entry.replaceAll("\\", "/");
        if (!/\.(m?ts|tsx)$/.test(rel) || /\.test\.|\.d\.ts$/.test(rel)) continue;
        if (readFileSync(new URL(rel, root), "utf8").includes("Ouverture impossible (${")) found.push(rel);
      }
    }
    expect(found).toEqual(["platform/messages.ts"]);
  });
});
