// Fausse liaison en TS pur (D36) : même contrat que le vrai module, géométrie grossière, pour les tests du moteur.
// Contrat commun joué sur les deux fabriques : `wasm-core.contract.test.ts` (`describe.each`).
//
// Écart assumé, exclu du contrat commun : la gomme partielle (`Erase`, `mode: "partial"`) ne coupe pas. Elle retire
// en entier chaque trait touché (comme la gomme d'objet) et rend `ids: []`, là où le cœur remplace le trait par ses
// morceaux restants (`ids` = les morceaux, `removed` = le trait coupé). Le test de « touché » est lui aussi grossier :
// distance des seuls points du trait au chemin, sans contour ni pression.
import type { Bounds, Change, Command, CoreDocument, CoreFactory, ElementView, StrokeBuilderApi, StrokeStyle } from "./api";

interface FakeStroke { readonly id: string; readonly x0: number; readonly y0: number; readonly local: Float32Array; readonly style: StrokeStyle }
interface FakePage { readonly id: string; readonly elements: FakeStroke[] }
interface State { readonly pages: FakePage[] }

let counter = 0;
const newId = (): string => `fake-${++counter}`;
const finitePath = (path: Float32Array): boolean =>
  path.length >= 2 && path.length % 2 === 0 && path.every((v) => Number.isFinite(v));
const positive = (v: number): boolean => Number.isFinite(v) && v > 0;
const clone = (s: State): State => ({ pages: s.pages.map((p) => ({ id: p.id, elements: [...p.elements] })) });

function toLocal(points: Float32Array): { x0: number; y0: number; local: Float32Array } {
  const x0 = points[0] ?? 0;
  const y0 = points[1] ?? 0;
  const local = new Float32Array(points.length);
  for (let i = 0; i + 2 < points.length; i += 3) {
    local[i] = (points[i] ?? 0) - x0;
    local[i + 1] = (points[i + 1] ?? 0) - y0;
    local[i + 2] = points[i + 2] ?? 0;
  }
  return { x0, y0, local };
}

function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const u = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  return Math.hypot(px - (ax + u * dx), py - (ay + u * dy));
}

function strokeTouches(s: FakeStroke, path: Float32Array, radius: number): boolean {
  for (let i = 0; i + 2 < s.local.length; i += 3) {
    const x = (s.local[i] ?? 0) + s.x0;
    const y = (s.local[i + 1] ?? 0) + s.y0;
    const reach = radius + s.style.width / 2;
    for (let j = 0; j + 1 < path.length; j += 2) {
      const ax = path[j] ?? 0;
      const ay = path[j + 1] ?? 0;
      const bx = j + 3 < path.length ? (path[j + 2] ?? 0) : ax;
      const by = j + 3 < path.length ? (path[j + 3] ?? 0) : ay;
      if (distToSegment(x, y, ax, ay, bx, by) <= reach) return true;
    }
  }
  return false;
}

function polyOutline(points: Float32Array, dx: number, dy: number): Float32Array {
  const out: number[] = [];
  for (let i = 0; i + 2 < points.length; i += 3) out.push((points[i] ?? 0) + dx, (points[i + 1] ?? 0) + dy);
  return new Float32Array(out);
}

class FakeDocument implements CoreDocument {
  private state: State;
  private undoStack: State[] = [];
  private redoStack: State[] = [];
  private ver = 0;

  constructor(state: State) {
    this.state = state;
  }

  private page(id: string): FakePage {
    const p = this.state.pages.find((q) => q.id === id);
    if (!p) throw new Error(`page inconnue : ${id}`);
    return p;
  }

  private stroke(id: string): FakeStroke | undefined {
    for (const p of this.state.pages) {
      const s = p.elements.find((e) => e.id === id);
      if (s) return s;
    }
    return undefined;
  }

  private step(mutate: (s: State) => Omit<Change, "version" | "full">): Change {
    const next = clone(this.state);
    const partial = mutate(next);
    if (partial.ids.length === 0 && partial.removed.length === 0 && partial.pages.length === 0) {
      return { ...partial, full: false, version: this.ver };
    }
    this.undoStack.push(this.state);
    this.redoStack = [];
    this.state = next;
    return { ...partial, full: false, version: ++this.ver };
  }

  pageIds(): string[] { return this.state.pages.map((p) => p.id); }
  elementIds(page: string): string[] { return this.page(page).elements.map((e) => e.id); }

  apply(cmd: Command): Change {
    switch (cmd.type) {
      case "AddPage": {
        const after = cmd.after;
        if (after !== null) this.page(after);
        return this.step((s) => {
          const id = newId();
          const at = after === null ? s.pages.length : s.pages.findIndex((p) => p.id === after) + 1;
          s.pages.splice(at, 0, { id, elements: [] });
          return { pages: [id], ids: [], removed: [] };
        });
      }
      case "RemovePage": {
        const removed = this.elementIds(cmd.page);
        if (this.state.pages.length <= 1) throw new Error("la dernière page ne se supprime pas");
        return this.step((s) => {
          s.pages.splice(s.pages.findIndex((p) => p.id === cmd.page), 1);
          return { pages: [cmd.page], ids: [], removed };
        });
      }
      case "CommitStroke": {
        if (cmd.points.length < 3 || cmd.points.length % 3 !== 0 || !cmd.points.every((v) => Number.isFinite(v))) {
          throw new Error("points invalides");
        }
        if (!positive(cmd.style.width)) throw new Error("épaisseur de trait invalide (nombre fini > 0 attendu)");
        this.page(cmd.page);
        return this.step((s) => {
          const id = newId();
          const { x0, y0, local } = toLocal(cmd.points);
          s.pages.find((p) => p.id === cmd.page)?.elements.push({ id, x0, y0, local, style: cmd.style });
          return { pages: [cmd.page], ids: [id], removed: [] };
        });
      }
      case "Erase": {
        if (!finitePath(cmd.path)) throw new Error("points invalides");
        if (!positive(cmd.radius)) throw new Error("rayon de gomme invalide (nombre fini > 0 attendu)");
        const hit = this.page(cmd.page).elements.filter((e) => strokeTouches(e, cmd.path, cmd.radius)).map((e) => e.id);
        if (hit.length === 0) return { pages: [], ids: [], removed: [], full: false, version: this.ver };
        return this.step((s) => {
          const p = s.pages.find((q) => q.id === cmd.page);
          if (p) p.elements.splice(0, p.elements.length, ...p.elements.filter((e) => !hit.includes(e.id)));
          return { pages: [cmd.page], ids: [], removed: hit };
        });
      }
      case "Delete": {
        // Comme le cœur : ids inconnus ignorés, doublons fusionnés, `pages` = pages touchées triées ; rien de trouvé =
        // aucune étape (D38).
        const removed = [...new Set(cmd.ids)].filter((id) => this.stroke(id) !== undefined);
        const pages = this.state.pages.filter((p) => p.elements.some((e) => removed.includes(e.id))).map((p) => p.id).sort();
        return this.step((s) => {
          for (const p of s.pages) p.elements.splice(0, p.elements.length, ...p.elements.filter((e) => !removed.includes(e.id)));
          return { pages, ids: [], removed };
        });
      }
    }
  }

  element(id: string): ElementView | null {
    const s = this.stroke(id);
    return s ? { id, kind: "stroke", transform: [1, 0, 0, 1, s.x0, s.y0], style: s.style } : null;
  }
  points(id: string): Float32Array | null { return this.stroke(id)?.local ?? null; }
  outline(id: string): Float32Array | null {
    const s = this.stroke(id);
    return s ? polyOutline(s.local, 0, 0) : null;
  }
  hitTest(page: string, x: number, y: number, tol: number): string | null {
    const els = this.page(page).elements;
    for (let i = els.length - 1; i >= 0; i--) {
      const e = els[i];
      if (e && strokeTouches(e, new Float32Array([x, y]), tol)) return e.id;
    }
    return null;
  }
  hitTestPath(page: string, path: Float32Array, radius: number): string[] {
    return this.page(page).elements.filter((e) => strokeTouches(e, path, radius)).map((e) => e.id);
  }
  idsInRect(page: string, r: Bounds): string[] {
    return this.page(page).elements.filter((e) => {
      const b = this.bounds([e.id]);
      return b !== null && b.x0 >= r.x0 && b.y0 >= r.y0 && b.x1 <= r.x1 && b.y1 <= r.y1;
    }).map((e) => e.id);
  }
  bounds(ids: readonly string[]): Bounds | null {
    let b: Bounds | null = null;
    for (const id of ids) {
      const s = this.stroke(id);
      if (!s) continue;
      for (let i = 0; i + 2 < s.local.length; i += 3) {
        const x = (s.local[i] ?? 0) + s.x0;
        const y = (s.local[i + 1] ?? 0) + s.y0;
        const h = s.style.width / 2;
        b = b === null
          ? { x0: x - h, y0: y - h, x1: x + h, y1: y + h }
          : { x0: Math.min(b.x0, x - h), y0: Math.min(b.y0, y - h), x1: Math.max(b.x1, x + h), y1: Math.max(b.y1, y + h) };
      }
    }
    return b;
  }
  undo(): Change {
    const prev = this.undoStack.pop();
    if (!prev) return { pages: [], ids: [], removed: [], full: false, version: this.ver };
    this.redoStack.push(this.state);
    this.state = prev;
    return { pages: [], ids: [], removed: [], full: true, version: ++this.ver };
  }
  redo(): Change {
    const next = this.redoStack.pop();
    if (!next) return { pages: [], ids: [], removed: [], full: false, version: this.ver };
    this.undoStack.push(this.state);
    this.state = next;
    return { pages: [], ids: [], removed: [], full: true, version: ++this.ver };
  }
  canUndo(): boolean { return this.undoStack.length > 0; }
  canRedo(): boolean { return this.redoStack.length > 0; }
  version(): number { return this.ver; }
  save(now: string, appVersion: string): Uint8Array {
    const json = JSON.stringify({ now, appVersion, pages: this.state.pages.map((p) => ({
      id: p.id,
      elements: p.elements.map((e) => ({ id: e.id, x0: e.x0, y0: e.y0, local: Array.from(e.local), style: e.style })),
    })) });
    return new TextEncoder().encode(json);
  }
  newStrokeBuilder(style: StrokeStyle): StrokeBuilderApi {
    const pts: number[] = [];
    void style;
    return {
      push: (p: Float32Array) => { pts.push(...p); return polyOutline(new Float32Array(pts), 0, 0); },
      finish: () => polyOutline(new Float32Array(pts), 0, 0),
      free: () => undefined,
    };
  }
  free(): void { /* rien à libérer */ }
}

interface SavedStroke { id: string; x0: number; y0: number; local: number[]; style: StrokeStyle }
interface SavedPage { id: string; elements: SavedStroke[] }

export const fakeCore: CoreFactory = {
  blank: () => new FakeDocument({ pages: [{ id: newId(), elements: [] }] }),
  load: (bytes: Uint8Array) => {
    // Même message que le cœur (`FormatError::NotRoomboard`) : le lot 3 l'affiche tel quel.
    const notRoomboard = "ce fichier n'est pas un document RoomBoard";
    let raw: unknown;
    try {
      raw = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      throw new Error(notRoomboard);
    }
    if (typeof raw !== "object" || raw === null || !("pages" in raw) || !Array.isArray(raw.pages)) {
      throw new Error(notRoomboard);
    }
    const pages = (raw.pages as SavedPage[]).map((p) => ({
      id: p.id,
      elements: p.elements.map((e) => ({ id: e.id, x0: e.x0, y0: e.y0, local: new Float32Array(e.local), style: e.style })),
    }));
    return new FakeDocument({ pages });
  },
  version: () => "fake",
};
