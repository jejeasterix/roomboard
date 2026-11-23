// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import { clock, MEDIA_FAILED_LABEL, MediaBar, type MediaBarMedia, type MediaBarStatus, type MediaControls, type MediaSettings } from "./MediaBar";

afterEach(cleanup);

const media = (over: Partial<MediaBarMedia> = {}): MediaBarMedia => ({ mediaType: "video", duration: 90, trimStart: 0, trimEnd: null, loop: false, volume: 1, ...over });

function setup(m: MediaBarMedia = media(), o: { status?: MediaBarStatus; time?: number; refuse?: string } = {}) {
  const set = vi.fn<(s: MediaSettings) => string | null>(() => o.refuse ?? null);
  const seek = vi.fn<(t: number) => void>();
  const toggle = vi.fn<() => void>();
  const controls: MediaControls = { status: () => o.status ?? "poster", time: () => o.time ?? 0, toggle, seek, set };
  const r = render(() => <MediaBar media={m} controls={controls} />);
  const q = <T extends Element>(k: string): T => {
    const el = r.container.querySelector<T>(`[data-media="${k}"]`);
    if (el === null) throw new Error(`absent : ${k}`);
    return el;
  };
  return { ...r, set, seek, toggle, q };
}

describe("MediaBar (C14, M22)", () => {
  it("rôle et libellé ; Lecture/Pause selon l'état ; temps 0:12 / 1:30", () => {
    const a = setup(media(), { status: "poster", time: 12.4 });
    const root = a.container.querySelector("[data-media-bar]")!;
    expect([root.getAttribute("role"), root.getAttribute("aria-label")]).toEqual(["group", "Commandes du média"]);
    expect(a.q("toggle").textContent).toBe("Lecture");
    expect(a.q("time").textContent).toBe("0:12 / 1:30");
    cleanup();
    const b = setup(media(), { status: "lecture" });
    expect(b.q("toggle").textContent).toBe("Pause");
    fireEvent.click(b.q("toggle"));
    expect(b.toggle).toHaveBeenCalledTimes(1);
  });

  it("Début ici, Fin ici, Tout garder : un set chacun, position arrondie à la ms", () => {
    const { q, set } = setup(media({ trimStart: 5, trimEnd: 80, loop: true, volume: 0.5 }), { time: 12.34567 });
    fireEvent.click(q("start"));
    expect(set).toHaveBeenCalledTimes(1);
    expect(set).toHaveBeenLastCalledWith({ trimStart: 12.346, trimEnd: 80, loop: true, volume: 0.5 });
    fireEvent.click(q("end"));
    expect(set).toHaveBeenCalledTimes(2);
    expect(set).toHaveBeenLastCalledWith({ trimStart: 12.346, trimEnd: 12.346, loop: true, volume: 0.5 });
    fireEvent.click(q("keep"));
    expect(set).toHaveBeenCalledTimes(3);
    expect(set).toHaveBeenLastCalledWith({ trimStart: 0, trimEnd: null, loop: true, volume: 0.5 });
    expect([q("start").textContent, q("end").textContent, q("keep").textContent]).toEqual(["Début ici", "Fin ici", "Tout garder"]);
  });

  it("Position : aria-valuetext lit le temps (« 0:12 sur 1:30 »), pas un nombre de secondes", () => {
    const { q } = setup(media(), { time: 12.4 });
    expect(q("position").getAttribute("aria-valuetext")).toBe("0:12 sur 1:30");
  });

  it("Boucle : aria-pressed, bascule", () => {
    const { q, set } = setup();
    expect(q("loop").getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(q("loop"));
    expect(set).toHaveBeenLastCalledWith({ trimStart: 0, trimEnd: null, loop: true, volume: 1 });
    expect(q("loop").getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(q("loop"));
    expect(set).toHaveBeenLastCalledWith({ trimStart: 0, trimEnd: null, loop: false, volume: 1 });
    expect(q("loop").getAttribute("aria-pressed")).toBe("false");
  });

  it("Volume : écrit au relâché (change), jamais à input (M23)", () => {
    const { q, set } = setup();
    const v = q<HTMLInputElement>("volume");
    v.value = "40";
    fireEvent.input(v);
    expect(set).not.toHaveBeenCalled();
    fireEvent.change(v);
    expect(set).toHaveBeenCalledTimes(1);
    expect(set).toHaveBeenLastCalledWith({ trimStart: 0, trimEnd: null, loop: false, volume: 0.4 });
  });

  it("position : input → seek, aucun set", () => {
    const { q, seek, set } = setup();
    const p = q<HTMLInputElement>("position");
    p.value = "33.5";
    fireEvent.input(p);
    expect(seek).toHaveBeenCalledWith(33.5);
    expect(set).not.toHaveBeenCalled();
  });

  it("refus du cœur : message affiché (Review Focus 5)", () => {
    const { q, container } = setup(media(), { refuse: "Fin avant le début" });
    expect(container.querySelector('[data-media="error"]')).toBeNull();
    fireEvent.click(q("end"));
    expect(q("error").textContent).toBe("Fin avant le début");
    expect(q("error").getAttribute("role")).toBe("status");
  });

  it("le refus affiché disparaît quand le média sélectionné change (A puis B)", async () => {
    const { createSignal } = await import("solid-js");
    const [m, setM] = createSignal(media());
    const controls: MediaControls = { status: () => "poster", time: () => 0, toggle: vi.fn(), seek: vi.fn(), set: () => "Fin avant le début" };
    const r = render(() => <MediaBar media={m()} controls={controls} />);
    fireEvent.click(r.container.querySelector('[data-media="end"]')!);
    expect(r.container.querySelector('[data-media="error"]')).not.toBeNull();
    setM(media({ duration: 30 }));
    expect(r.container.querySelector('[data-media="error"]')).toBeNull();
  });

  it("echec : Lecture désactivée, « lecture impossible sur ce poste »", () => {
    const { q } = setup(media(), { status: "echec" });
    expect(q<HTMLButtonElement>("toggle").disabled).toBe(true);
    expect(q("failed").textContent).toBe(MEDIA_FAILED_LABEL);
    expect(MEDIA_FAILED_LABEL).toBe("lecture impossible sur ce poste");
  });

  it("zone rognée : --rb-trim-start 10 %, --rb-trim-end 50 %", () => {
    const { q } = setup(media({ trimStart: 9, trimEnd: 45 }));
    const p = q<HTMLInputElement>("position");
    expect(p.style.getPropertyValue("--rb-trim-start")).toBe("10%");
    expect(p.style.getPropertyValue("--rb-trim-end")).toBe("50%");
    expect(p.max).toBe("90");
    expect(p.step).toBe("0.1");
  });

  it("clock : m:ss, non fini ou négatif → 0:00", () => {
    expect(clock(90)).toBe("1:30");
    expect(clock(12.9)).toBe("0:12");
    expect(clock(-1)).toBe("0:00");
    expect(clock(Number.NaN)).toBe("0:00");
    expect(clock(Infinity)).toBe("0:00");
  });
});
