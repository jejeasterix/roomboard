import { describe, expect, it } from "vitest";
import {
  addedToPageMessage,
  ANNOTATION_EVENTS,
  captureFailedMessage,
  captureFailureOf,
  CURSOR_POLL_MS,
  EXIT_TIMEOUT_MS,
  isViewport,
  NOTHING_TO_SEND_MESSAGE,
  SENT_TO_BOARD,
  sendTarget,
  sentToBoardMessage,
  sentToBoardToast,
} from "./annotation-port";

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

describe("contrat C11b (P6, P10 à P13)", () => {
  it("sendTarget : nouvel onglet si demandé, en « Annotation au démarrage », ou sans origine de tableau", () => {
    expect(sendTarget("origin", "board", "board")).toBe("origin");
    expect(sendTarget("new", "board", "board")).toBe("new");
    expect(sendTarget("origin", "desktop-annotation", "board")).toBe("new");
    expect(sendTarget("origin", "board", "annotation")).toBe("new");
    expect(sendTarget("origin", "board", null)).toBe("new");
  });
  it("avis du cadrage, mot pour mot (P10, P11, P12)", () => {
    expect(captureFailedMessage("denied")).toBe(
      "capture du bureau impossible (autorisation “Enregistrement de l'écran” refusée : l'accorder dans Réglages Système › Confidentialité et sécurité, puis relancer RoomBoard) : page à fond blanc",
    );
    expect(captureFailedMessage("wayland")).toBe("capture du bureau impossible (Wayland) : page à fond blanc");
    expect(captureFailedMessage("failed")).toBe("capture du bureau impossible (échec de la capture) : page à fond blanc");
    expect(NOTHING_TO_SEND_MESSAGE).toBe("rien à envoyer");
    expect(sentToBoardMessage(2)).toBe("envoyé au tableau : page 2");
  });
  it("captureFailureOf : denied et wayland gardés, tout autre rejet → failed", () => {
    expect(captureFailureOf("denied")).toBe("denied");
    expect(captureFailureOf("wayland")).toBe("wayland");
    expect(captureFailureOf("io")).toBe("failed");
    expect(captureFailureOf(new Error("x"))).toBe("failed");
  });
  it("isViewport : page entière ≥ 0 et six nombres finis ; sinon rejetée (RF5, P13)", () => {
    expect(isViewport({ page: 0, matrix: [1, 0, 0, 1, 0, 0] })).toBe(true);
    expect(isViewport({ page: 3, matrix: [2, 0, 0, 2, -5, 7.5] })).toBe(true);
    for (const bad of [
      null,
      {},
      { page: -1, matrix: [1, 0, 0, 1, 0, 0] },
      { page: 0.5, matrix: [1, 0, 0, 1, 0, 0] },
      { page: 0, matrix: [1, 0, 0, 1, 0] },
      { page: 0, matrix: [1, 0, 0, 1, 0, null] },
      { page: 0, matrix: "x" },
    ]) {
      expect(isViewport(bad)).toBe(false);
    }
  });
});

describe("avis d'envoi (C11b P12, design-l4 L4-16)", () => {
  it("avis d'envoi : une seule source ; boîte inchangée à l'octet ; bandeau « Envoyé au tableau : » + « page N »", () => {
    expect(SENT_TO_BOARD).toBe("envoyé au tableau");
    expect(sentToBoardMessage(2)).toBe("envoyé au tableau : page 2");
    expect(sentToBoardToast(2)).toEqual({ text: "Envoyé au tableau :", strong: "page 2" });
    const t = sentToBoardToast(12);
    expect(`${t.text} ${t.strong}`.toLowerCase()).toBe(sentToBoardMessage(12));
  });
});
