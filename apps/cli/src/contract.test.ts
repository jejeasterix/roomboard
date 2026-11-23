import { EventEmitter } from "node:events";
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { lineWriter } from "./contract";
import { main } from "./main";
import { describeWasm, memoryIO, tmpDir } from "./testing";

/** Tube dont le lecteur s'est arrêté après `accepted` écritures (`| head -1`) : les suivantes émettent EPIPE. */
class ClosedPipe extends EventEmitter {
  writes = 0;
  readonly lines: string[] = [];
  constructor(private readonly accepted: number) {
    super();
  }
  write(chunk: string): boolean {
    this.writes++;
    if (this.writes <= this.accepted) {
      this.lines.push(chunk);
      return true;
    }
    // Émis sans écouteur, l'événement « error » lève : c'est la pile qui tuait le binaire avant tout enregistrement.
    this.emit("error", Object.assign(new Error("write EPIPE"), { code: "EPIPE" }));
    return false;
  }
}

describe("sortie du processus (bin.ts) : tube fermé", () => {
  it("EPIPE : aucune exception, les lignes suivantes ne sont plus écrites", () => {
    const pipe = new ClosedPipe(0);
    const out = lineWriter(pipe);
    expect(() => out("a")).not.toThrow();
    expect(() => out("b")).not.toThrow();
    expect(pipe.writes).toBe(1);
  });
});

describeWasm("sortie du processus (bin.ts) : le travail se termine malgré un tube fermé", () => {
  it("run a --ops x.jsonl --out c | head -1 : c écrit, code 0, aucune erreur", async () => {
    const dir = tmpDir();
    const a = join(dir, "a.roomboard");
    const c = join(dir, "c.roomboard");
    const ops = join(dir, "x.jsonl");
    expect(await main(["new", a], memoryIO())).toBe(0);
    writeFileSync(ops, ['{"op":"tab.list"}', '{"op":"tab.list"}', '{"op":"tab.list"}'].join("\n"));
    const pipe = new ClosedPipe(1);
    const io = { ...memoryIO(), out: lineWriter(pipe) };
    expect(await main(["run", a, "--ops", ops, "--out", c], io)).toBe(0);
    expect(io.stderr).toEqual([]);
    expect(pipe.lines).toHaveLength(1);
    expect(existsSync(c)).toBe(true);
  });
});
