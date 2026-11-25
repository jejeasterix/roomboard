import { afterEach, describe, expect, it, vi } from "vitest";
import { clearToast, currentToast, showToast, TOAST_MS } from "./toast";

afterEach(() => {
  clearToast();
  vi.useRealTimers();
});

describe("bandeau (toast.ts, design-l4, L4-16)", () => {
  it("bandeau (toast.ts) : montré 4 s par défaut, puis effacé", () => {
    vi.useFakeTimers();
    expect(TOAST_MS).toBe(4000);
    showToast({ text: "Envoyé au tableau :", strong: "page 2" });
    expect(currentToast()).toEqual({ text: "Envoyé au tableau :", strong: "page 2" });
    vi.advanceTimersByTime(TOAST_MS - 1);
    expect(currentToast()).not.toBeNull();
    vi.advanceTimersByTime(1);
    expect(currentToast()).toBeNull();
  });
  it("bandeau (toast.ts) : un seul à la fois ; le suivant remplace le premier et repart pour sa durée", () => {
    vi.useFakeTimers();
    showToast({ text: "a" });
    vi.advanceTimersByTime(3000);
    showToast({ text: "b" }, 1000);
    expect(currentToast()).toEqual({ text: "b" });
    vi.advanceTimersByTime(999);
    expect(currentToast()).toEqual({ text: "b" });
    vi.advanceTimersByTime(1);
    expect(currentToast()).toBeNull();
  });
  it("bandeau (toast.ts) : clearToast efface tout de suite ; le minuteur effacé ne touche pas l'avis suivant", () => {
    vi.useFakeTimers();
    showToast({ text: "a" });
    clearToast();
    expect(currentToast()).toBeNull();
    showToast({ text: "b" }, 10000);
    vi.advanceTimersByTime(TOAST_MS);
    expect(currentToast()).toEqual({ text: "b" });
  });
});
