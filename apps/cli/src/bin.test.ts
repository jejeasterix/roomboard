// `bin.ts` (cli-lot3, T8) : sans `await` de premier niveau (T7), une promesse de `main` jamais réglée laissait le
// processus sortir en 0 sans rien dire ; le filet la fait sortir en 13 avec une ligne `{"error":…}` sur stderr.
// `bin.ts` est importé tel quel, `main` remplacé ; les écouteurs `exit`, `uncaughtException` et `unhandledRejection` sont
// relevés sans être branchés sur le processus (cli-lot4, D77 : sinon ils captureraient les erreurs de Vitest).
import { afterEach, expect, it, vi } from "vitest";

type ExitListener = (code: number) => void;

const initialExitCode = process.exitCode;
afterEach(() => {
  process.exitCode = initialExitCode; // `bin.ts` pose `process.exitCode` : jamais laissé au processus de test
  vi.doUnmock("./main");
  vi.resetModules();
});

type Listener = (...a: unknown[]) => void;
const CAUGHT = new Set(["exit", "uncaughtException", "unhandledRejection"]);

/** Importe `bin.ts` avec `main` remplacé ; rend les écouteurs `exit`, `uncaughtException`, `unhandledRejection` qu'il
 *  pose (jamais branchés sur le processus de test) ; les autres `process.on` passent. */
async function loadListeners(main: () => Promise<number>): Promise<Map<string, Listener>> {
  vi.resetModules();
  vi.doMock("./main", () => ({ main }));
  const caught = new Map<string, Listener>();
  const on = process.on.bind(process);
  const spy = vi.spyOn(process, "on").mockImplementation(((event: string | symbol, l: Listener) => {
    if (typeof event === "string" && CAUGHT.has(event)) caught.set(event, l);
    else on(event as never, l as never);
    return process;
  }) as never);
  try {
    await import("./bin");
  } finally {
    spy.mockRestore();
  }
  await new Promise((r) => setImmediate(r)); // une promesse réglée l'est avant la sortie : son `.then` est passé
  return caught;
}

async function loadBin(main: () => Promise<number>): Promise<ExitListener> {
  const listener = (await loadListeners(main)).get("exit");
  if (listener === undefined) throw new Error("bin.ts n'a posé aucun écouteur exit");
  return listener as ExitListener;
}

/** Joue l'écouteur `exit` avec `code` ; rend le code de sortie posé et les lignes écrites sur stderr. */
function atExit(listener: ExitListener, code: number): { exitCode: number | string | null | undefined; stderr: string[] } {
  const stderr: string[] = [];
  const write = vi.spyOn(process.stderr, "write").mockImplementation(((chunk: string | Uint8Array) => {
    stderr.push(String(chunk));
    return true;
  }) as never);
  try {
    process.exitCode = code;
    listener(code);
    return { exitCode: process.exitCode, stderr };
  } finally {
    write.mockRestore();
  }
}

it("promesse de main jamais réglée : code 13 et une ligne {\"error\":…} sur stderr, au lieu d'un 0 muet", async () => {
  const listener = await loadBin(() => new Promise<number>(() => {}));
  const { exitCode, stderr } = atExit(listener, 0);
  expect(exitCode).toBe(13);
  expect(stderr).toHaveLength(1);
  expect(stderr[0]!.endsWith("\n")).toBe(true);
  const line = JSON.parse(stderr[0]!) as { error: { code: string; message: string } };
  expect(Object.keys(line)).toEqual(["error"]);
  expect(line.error.code).toBe("command");
  expect(line.error.message).not.toBe("");
});

it("promesse réglée : son code reste, rien sur stderr (0 comme 2)", async () => {
  for (const code of [0, 2]) {
    const listener = await loadBin(async () => code);
    expect(atExit(listener, code)).toEqual({ exitCode: code, stderr: [] });
  }
});

it("D77 — uncaughtException et unhandledRejection : une ligne {\"error\":{code:command, message:erreur interne : …}}, code 1, aucune pile", async () => {
  for (const event of ["uncaughtException", "unhandledRejection"]) {
    const listener = (await loadListeners(() => new Promise<number>(() => {}))).get(event);
    expect(listener, event).toBeDefined();
    const stderr: string[] = [];
    const write = vi.spyOn(process.stderr, "write").mockImplementation(((chunk: string | Uint8Array) => {
      stderr.push(String(chunk));
      return true;
    }) as never);
    const exit = vi.spyOn(process, "exit").mockImplementation((() => undefined) as never);
    try {
      listener!(new Error("boum"));
      expect(exit).toHaveBeenCalledWith(1);
    } finally {
      write.mockRestore();
      exit.mockRestore();
    }
    expect(stderr.map((l) => JSON.parse(l) as unknown)).toEqual([{ error: { code: "command", message: "erreur interne : boum" } }]);
    expect(stderr.join("")).not.toMatch(/\n\s+at /);
  }
});
