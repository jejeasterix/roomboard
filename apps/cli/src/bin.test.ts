// `bin.ts` (cli-lot3, T8) : sans `await` de premier niveau (T7), une promesse de `main` jamais réglée laissait le
// processus sortir en 0 sans rien dire ; le filet la fait sortir en 13 avec une ligne `{"error":…}` sur stderr.
// `bin.ts` est importé tel quel, `main` remplacé ; l'écouteur `exit` est relevé sans être branché sur le processus.
import { afterEach, expect, it, vi } from "vitest";

type ExitListener = (code: number) => void;

const initialExitCode = process.exitCode;
afterEach(() => {
  process.exitCode = initialExitCode; // `bin.ts` pose `process.exitCode` : jamais laissé au processus de test
  vi.doUnmock("./main");
  vi.resetModules();
});

/** Importe `bin.ts` avec `main` remplacé ; rend l'écouteur `exit` qu'il pose, les autres `process.on` passent. */
async function loadBin(main: () => Promise<number>): Promise<ExitListener> {
  vi.resetModules();
  vi.doMock("./main", () => ({ main }));
  let listener: ExitListener | null = null;
  const on = process.on.bind(process);
  const spy = vi.spyOn(process, "on").mockImplementation(((event: string | symbol, l: (...a: unknown[]) => void) => {
    if (event === "exit") listener = l as ExitListener;
    else on(event as never, l as never);
    return process;
  }) as never);
  try {
    await import("./bin");
  } finally {
    spy.mockRestore();
  }
  await new Promise((r) => setImmediate(r)); // une promesse réglée l'est avant la sortie : son `.then` est passé
  if (listener === null) throw new Error("bin.ts n'a posé aucun écouteur exit");
  return listener;
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
