import { EventEmitter } from "node:events";
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { exitAfterWrites, lineWriter, type OutStream } from "./contract";
import { main } from "./main";
import { describeWasm, memoryIO, tmpDir, warmModules } from "./testing";

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

/** Flux dont chaque écriture échoue (`>/dev/full`) ; l'erreur arrive après coup, comme sur un flux de Node. */
class FullDisk extends EventEmitter {
  writes = 0;
  write(): boolean {
    this.writes++;
    process.nextTick(() => this.emit("error", Object.assign(new Error("write ENOSPC"), { code: "ENOSPC" })));
    return false;
  }
}

/** Flux qui garde ses lignes (stderr d'un essai). */
const keeper = (): OutStream & { readonly lines: string[] } => {
  const lines: string[] = [];
  return { lines, write: (chunk: string) => lines.push(chunk), on: () => undefined };
};

const tick = (): Promise<void> => new Promise((r) => setImmediate(r));

describe("sortie du processus (bin.ts) : écriture impossible", () => {
  // Discrimine le patron écarté : ignorer toute erreur du flux rendrait 0 sans rien écrire (`version >/dev/full`).
  it("ENOSPC sur stdout : erreur retenue, code 1 pour une commande réussie, ligne io sur stderr", async () => {
    const full = new FullDisk();
    const stderr = keeper();
    const out = lineWriter(full);
    const err = lineWriter(stderr);
    expect(() => out('{"cli":"0.1.0"}')).not.toThrow();
    await tick();
    expect(out.failure()).toMatchObject({ code: "ENOSPC" });
    expect(exitAfterWrites(0, out, err)).toBe(1);
    expect(stderr.lines.map((l) => JSON.parse(l))).toEqual([{ error: { code: "io", message: expect.stringContaining("ENOSPC") } }]);
  });
  it("ENOSPC : un code d'échec de la commande reste le sien", async () => {
    const out = lineWriter(new FullDisk());
    out("x");
    await tick();
    expect(exitAfterWrites(2, out, lineWriter(keeper()))).toBe(2);
  });
  it("ENOSPC sur stderr seul : code 1, rien de plus écrit", async () => {
    const full = new FullDisk();
    const err = lineWriter(full);
    err("x");
    await tick();
    expect(exitAfterWrites(0, lineWriter(keeper()), err)).toBe(1);
    expect(full.writes).toBe(1);
  });
  it("EPIPE n'est pas un échec : code inchangé, rien sur stderr", () => {
    const stderr = keeper();
    const out = lineWriter(new ClosedPipe(0));
    out("a");
    expect(out.failure()).toBeNull();
    expect(exitAfterWrites(0, out, lineWriter(stderr))).toBe(0);
    expect(stderr.lines).toEqual([]);
  });
});

describeWasm("sortie du processus (bin.ts) : le travail se termine malgré un tube fermé", () => {
  beforeAll(warmModules); // D11 (cli-partage) : cœur et formats chargés hors du délai du premier test
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
