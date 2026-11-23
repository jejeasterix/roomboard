import { describe, expect, it } from "vitest";
import { addedToPageMessage, ANNOTATION_EVENTS, CURSOR_POLL_MS, EXIT_TIMEOUT_MS } from "./annotation-port";

describe("contrat entre fenêtres (C11a, DA2)", () => {
  it("événements distincts, préfixés roomboard://annotation-", () => {
    const names = Object.values(ANNOTATION_EVENTS);
    expect(new Set(names).size).toBe(names.length);
    for (const n of names) expect(n.startsWith("roomboard://annotation-")).toBe(true);
  });
  it("valeurs du cadrage : 5 s, 30 ms, « ajouté à la page N »", () => {
    expect(EXIT_TIMEOUT_MS).toBe(5000);
    expect(CURSOR_POLL_MS).toBe(30);
    expect(addedToPageMessage(1)).toBe("ajouté à la page 1");
  });
});
