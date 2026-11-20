import { describe, expect, it } from "vitest";
import { createCommitGate } from "./commit-gate";

function setup(open = true) {
  let commits = 0;
  let isOpen = open;
  const gate = createCommitGate(() => {
    commits++;
  }, () => isOpen);
  return { gate, commits: () => commits, setOpen: (v: boolean) => (isOpen = v) };
}

describe("porte de validation IME (CL4-3, C10a T8)", () => {
  it("hors composition : request valide tout de suite ; saisie fermée : rien", () => {
    const s = setup();
    s.gate.request();
    expect(s.commits()).toBe(1);
    s.setOpen(false);
    s.gate.request();
    expect(s.commits()).toBe(1);
  });

  it("pendant la composition : request attend compositionend, puis valide une fois", () => {
    const s = setup();
    s.gate.compositionStart();
    expect(s.gate.composing()).toBe(true);
    s.gate.request();
    s.gate.request();
    expect(s.commits()).toBe(0);
    s.gate.compositionEnd();
    expect([s.commits(), s.gate.composing()]).toEqual([1, false]);
    s.gate.compositionEnd();
    expect(s.commits()).toBe(1);
  });

  it("compositionStart sans saisie ouverte : ignoré", () => {
    const s = setup(false);
    s.gate.compositionStart();
    expect(s.gate.composing()).toBe(false);
  });

  it("composition finie sans demande : rien n'est validé", () => {
    const s = setup();
    s.gate.compositionStart();
    s.gate.compositionEnd();
    expect(s.commits()).toBe(0);
  });

  it("reset : composition et demande en attente oubliées", () => {
    const s = setup();
    s.gate.compositionStart();
    s.gate.request();
    s.gate.reset();
    expect(s.gate.composing()).toBe(false);
    s.gate.compositionEnd();
    expect(s.commits()).toBe(0);
  });
});
