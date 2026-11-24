import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTip, placeTip, TIP_HOLD_MS, TIP_HOVER_MS, TIP_LINGER_MS } from "./tooltip";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("createTip (design-l1, L1-4, H1)", () => {
  it("délais du cadrage : 400, 500, 1 500 ms", () => {
    expect([TIP_HOVER_MS, TIP_HOLD_MS, TIP_LINGER_MS]).toEqual([400, 500, 1500]);
  });
  it("survol : montrée à 400 ms, pas avant ; sortie : cachée", () => {
    const t = createTip();
    t.enter();
    vi.advanceTimersByTime(399);
    expect(t.shown()).toBe(false);
    vi.advanceTimersByTime(1);
    expect(t.shown()).toBe(true);
    t.leave();
    expect(t.shown()).toBe(false);
  });
  it("sortie avant 400 ms : jamais montrée", () => {
    const t = createTip();
    t.enter();
    vi.advanceTimersByTime(200);
    t.leave();
    vi.advanceTimersByTime(1000);
    expect(t.shown()).toBe(false);
  });
  it("focus clavier : montrée tout de suite ; blur : cachée", () => {
    const t = createTip();
    t.focus();
    expect(t.shown()).toBe(true);
    t.blur();
    expect(t.shown()).toBe(false);
  });
  it("focus qui suit un appui (souris, doigt) : pas d'infobulle de focus", () => {
    const t = createTip();
    t.down("mouse");
    t.focus();
    expect(t.shown()).toBe(false);
  });
  it("fenêtre quittée puis retrouvée après un clic : le focus rendu reste sans infobulle", () => {
    const t = createTip();
    t.down("mouse");
    t.focus();
    t.up();
    t.blur(false);
    t.focus();
    expect(t.shown()).toBe(false);
  });
  it("blur dans la page après un clic : le focus clavier suivant montre l'infobulle", () => {
    const t = createTip();
    t.down("mouse");
    t.focus();
    t.up();
    t.blur();
    t.focus();
    expect(t.shown()).toBe(true);
  });
  it("appui de souris : cache l'infobulle du survol", () => {
    const t = createTip();
    t.enter();
    vi.advanceTimersByTime(400);
    t.down("mouse");
    expect(t.shown()).toBe(false);
  });
  it("appui au doigt : montrée à 500 ms ; relâcher : reste 1 500 ms puis cachée", () => {
    const t = createTip();
    t.down("touch");
    vi.advanceTimersByTime(499);
    expect(t.shown()).toBe(false);
    vi.advanceTimersByTime(1);
    expect(t.shown()).toBe(true);
    t.up();
    vi.advanceTimersByTime(1499);
    expect(t.shown()).toBe(true);
    vi.advanceTimersByTime(1);
    expect(t.shown()).toBe(false);
  });
  it("appui court au stylet (< 500 ms) : jamais montrée", () => {
    const t = createTip();
    t.down("pen");
    vi.advanceTimersByTime(300);
    t.up();
    vi.advanceTimersByTime(2000);
    expect(t.shown()).toBe(false);
  });
  it("pendant l'appui long, une sortie ne cache pas", () => {
    const t = createTip();
    t.down("touch");
    vi.advanceTimersByTime(500);
    t.leave();
    expect(t.shown()).toBe(true);
  });
  it("une seule à la fois : la seconde montrée cache la première", () => {
    const a = createTip();
    const b = createTip();
    a.focus();
    b.focus();
    expect([a.shown(), b.shown()]).toEqual([false, true]);
  });
});

describe("placeTip (L1-4 : sous le bouton, au-dessus faute de place, bornée, px entiers)", () => {
  const VIEW = { width: 1920, height: 1080 };
  const TIP = { width: 80, height: 32 };
  it("sous le bouton, centrée", () => {
    expect(placeTip({ left: 100, top: 10, right: 148, bottom: 58 }, TIP, VIEW)).toEqual({ left: 84, top: 66 });
  });
  it("au-dessus quand le bas de la fenêtre manque", () => {
    expect(placeTip({ left: 100, top: 1022, right: 148, bottom: 1070 }, TIP, VIEW)).toEqual({ left: 84, top: 982 });
  });
  it("bornée à gauche et à droite", () => {
    expect(placeTip({ left: 0, top: 10, right: 48, bottom: 58 }, TIP, VIEW).left).toBe(0);
    expect(placeTip({ left: 1872, top: 10, right: 1920, bottom: 58 }, TIP, VIEW).left).toBe(1840);
  });
  it("px entiers depuis une boîte fractionnaire", () => {
    const p = placeTip({ left: 100.25, top: 10, right: 148.25, bottom: 58.5 }, { width: 80.4, height: 32 }, VIEW);
    expect(Number.isInteger(p.left) && Number.isInteger(p.top)).toBe(true);
  });
});
