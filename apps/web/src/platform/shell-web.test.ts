import { describe, expect, it } from "vitest";
import { createWebShell, type BeforeUnloadEventLike, type WebShellWindow } from "./shell-web";

function fakeWindow(answer = true) {
  const listeners = new Set<(e: BeforeUnloadEventLike) => void>();
  const alerts: string[] = [];
  const confirms: string[] = [];
  const w: WebShellWindow = {
    confirm: (m) => { confirms.push(m); return answer; },
    alert: (m) => { alerts.push(m); },
    addEventListener: (_t, cb) => { listeners.add(cb); },
    removeEventListener: (_t, cb) => { listeners.delete(cb); },
    document: { title: "" },
  };
  const unload = () => {
    const e = { prevented: false, returnValue: undefined as unknown, preventDefault() { this.prevented = true; } };
    for (const cb of listeners) cb(e);
    return e;
  };
  return { w, listeners, alerts, confirms, unload };
}

describe("coquille du navigateur", () => {
  it("beforeunload : retenu seulement si modifié", () => {
    const f = fakeWindow();
    let dirty = false;
    createWebShell(f.w).guardClose(() => dirty, "message");
    expect(f.unload().prevented).toBe(false);
    dirty = true;
    const e = f.unload();
    expect(e.prevented).toBe(true);
    expect(e.returnValue).toBe("");
  });

  it("guardClose rendu : l'écouteur est retiré", () => {
    const f = fakeWindow();
    const stop = createWebShell(f.w).guardClose(() => true, "message");
    expect(f.listeners.size).toBe(1);
    stop();
    expect(f.listeners.size).toBe(0);
  });

  it("confirm, notify et setTitle passent par la fenêtre", async () => {
    const f = fakeWindow(false);
    const shell = createWebShell(f.w);
    expect(await shell.confirm("Abandonner ?")).toBe(false);
    await shell.notify("Ouverture impossible");
    shell.setTitle("• cours.roomboard — RoomBoard");
    expect(f.confirms).toEqual(["Abandonner ?"]);
    expect(f.alerts).toEqual(["Ouverture impossible"]);
    expect(f.w.document.title).toBe("• cours.roomboard — RoomBoard");
  });
});
