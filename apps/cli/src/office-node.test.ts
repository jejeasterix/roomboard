import { spawn } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { OfficeConvertError } from "../../web/src/platform/office-import";
import { CliError } from "./contract";
import { BINARY_MISSING, checkOffice, convertOfficeFile, killLeftovers, NO_SOFFICE, officeBinary, officeReady, parsePs, processCommands } from "./office-node";
import { tmpDir } from "./testing";

/** Faux binaire `sh` : `--check` rend `check` (code, et la racine `root` sur stdout si 0) ; une conversion rend `convert`. */
function fakeBinary(dir: string, o: { check: number; convert?: string; log?: string }): string {
  const bin = join(dir, "faux-office");
  const log = o.log === undefined ? "" : `echo "$1" >> '${o.log}'\n`;
  const check = o.check === 0 ? `echo "convertisseur : /faux/soffice"; echo "racine : ${join(dir, "racine")}"; exit 0` : `echo "no-program : installez LibreOffice ou Microsoft Office" >&2; exit ${o.check}`;
  writeFileSync(bin, `#!/bin/sh\n${log}if [ "$1" = "--check" ]; then ${check}; fi\n${o.convert ?? "exit 1"}\n`);
  chmodSync(bin, 0o755);
  return bin;
}

describe("officeBinary (cli-lot4, D55, H41)", () => {
  it("officeBinary — ROOMBOARD_OFFICE présent : ce chemin ; absent du disque : null", () => {
    const dir = tmpDir();
    const bin = fakeBinary(dir, { check: 0 });
    expect(officeBinary({ ROOMBOARD_OFFICE: bin })).toBe(bin);
    expect(officeBinary({ ROOMBOARD_OFFICE: join(dir, "absent") })).toBeNull();
  });
  it("officeBinary — sans variable : target/debug/roomboard-office du dépôt (construit à l'étape 1)", () => {
    const found = officeBinary({});
    expect(found).not.toBeNull();
    expect(found!.endsWith(join("target", "debug", "roomboard-office"))).toBe(true);
    expect(existsSync(found!)).toBe(true);
  });
});

describe("officeReady et checkOffice (cli-lot4, D56, DA17)", () => {
  it("officeReady — binaire qui rend 0 : racine lue sur --check ; lancé une seule fois par processus", async () => {
    const dir = tmpDir();
    const log = join(dir, "appels.log");
    const env = { ROOMBOARD_OFFICE: fakeBinary(dir, { check: 0, log }) };
    expect(await officeReady(env)).toEqual({ root: join(dir, "racine") });
    expect(await officeReady(env)).toEqual({ root: join(dir, "racine") });
    expect(readFileSync(log, "utf8")).toBe("--check\n");
  });
  it("officeReady — binaire qui rend 3 : LibreOffice introuvable ; binaire absent : convertisseur introuvable", async () => {
    const dir = tmpDir();
    expect(await officeReady({ ROOMBOARD_OFFICE: fakeBinary(dir, { check: 3 }) })).toEqual({ reason: NO_SOFFICE });
    expect(await officeReady({ ROOMBOARD_OFFICE: join(dir, "absent") })).toEqual({ reason: BINARY_MISSING });
  });
  it("S2 — checkOffice : .docx sans binaire → CliError unsupported (code 3), message de DA17", async () => {
    const env = { ROOMBOARD_OFFICE: join(tmpDir(), "absent") };
    const e = await checkOffice(["/x/a.png", "/x/cours.docx"], env).catch((x: unknown) => x);
    expect(e).toBeInstanceOf(CliError);
    expect(e).toMatchObject({ code: "unsupported", exit: 3, message: `cours.docx : conversion Office indisponible : ${BINARY_MISSING}` });
  });
  it("D58 — checkOffice : aucune source Office (.xlsx compris) → rien lancé, aucune erreur", async () => {
    const env = { ROOMBOARD_OFFICE: join(tmpDir(), "absent") };
    await expect(checkOffice(["/x/a.png", "/x/valeurs.xlsx", "/x/b.xlsm"], env)).resolves.toBeUndefined();
  });
});

describe("convertOfficeFile (cli-lot4, D57)", () => {
  it("convertOfficeFile — échec du binaire : OfficeConvertError avec le premier mot de stderr", async () => {
    const dir = tmpDir();
    const env = { ROOMBOARD_OFFICE: fakeBinary(dir, { check: 0, convert: `echo "timeout" >&2; exit 1` }) };
    await expect(convertOfficeFile(join(dir, "x.docx"), env)).rejects.toEqual(new OfficeConvertError("timeout"));
    const env2 = { ROOMBOARD_OFFICE: fakeBinary(tmpDir(), { check: 0, convert: `echo "failed : boum" >&2; exit 1` }) };
    await expect(convertOfficeFile(join(dir, "x.docx"), env2)).rejects.toMatchObject({ code: "failed" });
  });
  it("convertOfficeFile — succès : le PDF écrit par le binaire, en Blob application/pdf", async () => {
    const dir = tmpDir();
    const env = { ROOMBOARD_OFFICE: fakeBinary(dir, { check: 0, convert: `printf '%%PDF-1.7 faux' > "$2"; exit 0` }) };
    const pdf = await convertOfficeFile(join(dir, "x.docx"), env);
    expect(pdf.type).toBe("application/pdf");
    expect(new TextDecoder().decode(await pdf.arrayBuffer())).toBe("%PDF-1.7 faux");
  });
  it("convertOfficeFile — binaire qui rend 3 à la conversion : OfficeConvertError no-program (H49)", async () => {
    const dir = tmpDir();
    const env = { ROOMBOARD_OFFICE: fakeBinary(dir, { check: 0, convert: `echo "no-program : installez LibreOffice ou Microsoft Office" >&2; exit 3` }) };
    await expect(convertOfficeFile(join(dir, "x.docx"), env)).rejects.toMatchObject({ code: "no-program" });
  });
});

describe("officeReady, clé du cache (cli-lot4, D79)", () => {
  // Patron écarté : un cache par binaire seul rendrait la racine de `a` pour `b`, et `killLeftovers` chercherait les
  // restes de LibreOffice sous une racine périmée.
  it("officeReady — même binaire, autre XDG_CACHE_HOME : --check relancé, racine de cet environnement", async () => {
    const dir = tmpDir();
    const log = join(dir, "appels.log");
    const bin = join(dir, "faux-office");
    writeFileSync(bin, `#!/bin/sh\necho "$1" >> '${log}'\necho "racine : $XDG_CACHE_HOME/roomboard-office"\nexit 0\n`);
    chmodSync(bin, 0o755);
    const a = await officeReady({ ROOMBOARD_OFFICE: bin, XDG_CACHE_HOME: join(dir, "a") });
    const b = await officeReady({ ROOMBOARD_OFFICE: bin, XDG_CACHE_HOME: join(dir, "b") });
    expect([a, b]).toEqual([{ root: join(dir, "a", "roomboard-office") }, { root: join(dir, "b", "roomboard-office") }]);
    expect(readFileSync(log, "utf8")).toBe("--check\n--check\n");
  });
});

describe("Ctrl-C, faux binaire (cli-lot4, D79)", () => {
  // Patron écarté : un `process.exit` dans la promesse de conversion saute le `finally` qui retire le dossier `mkdtemp`.
  // `onInterrupt` relève donc ce dossier au moment même où il est appelé : il doit déjà être retiré.
  it("D79 — SIGINT transmis : onInterrupt(SIGINT, 130) après le retrait du dossier mkdtemp", async () => {
    const dir = tmpDir();
    const mark = join(dir, "lance");
    const bin = fakeBinary(dir, { check: 0, convert: `echo go > '${mark}'\nexec sleep 30` });
    const temp = (): string[] => readdirSync(tmpdir()).filter((n) => n.startsWith("roomboard-office-"));
    const before = new Set(temp());
    const leftAtCall: string[][] = [];
    const onInterrupt = vi.fn(() => {
      leftAtCall.push(temp().filter((n) => !before.has(n)));
    });
    const pending = convertOfficeFile(join(dir, "x.docx"), { ROOMBOARD_OFFICE: bin }, onInterrupt).catch((e: unknown) => e);
    for (let i = 0; i < 100 && !existsSync(mark); i++) await new Promise((r) => setTimeout(r, 50));
    expect(existsSync(mark), "faux binaire jamais lancé").toBe(true);
    process.emit("SIGINT");
    expect(await pending).toEqual(new OfficeConvertError("interrupted"));
    expect(onInterrupt).toHaveBeenCalledWith("SIGINT", 130);
    expect(leftAtCall).toEqual([[]]);
    expect(temp().filter((n) => !before.has(n))).toEqual([]);
  });
});

describe("Ctrl-C, restes de LibreOffice (cli-lot4, D79)", () => {
  const waitFor = async (mark: string): Promise<void> => {
    for (let i = 0; i < 100 && !existsSync(mark); i++) await new Promise((r) => setTimeout(r, 50));
    expect(existsSync(mark), "faux binaire jamais lancé").toBe(true);
  };
  it("D79 — SIGINT transmis : killLeftovers(racine, pid du binaire) est appelé", async () => {
    const dir = tmpDir();
    const mark = join(dir, "lance");
    const bin = fakeBinary(dir, { check: 0, convert: `echo go > '${mark}'\nexec sleep 30` });
    const leftovers = vi.fn(() => []);
    const pending = convertOfficeFile(join(dir, "x.docx"), { ROOMBOARD_OFFICE: bin }, vi.fn(), leftovers).catch((e: unknown) => e);
    await waitFor(mark);
    process.emit("SIGINT");
    expect(await pending).toEqual(new OfficeConvertError("interrupted"));
    expect(leftovers).toHaveBeenCalledTimes(1);
    expect(leftovers).toHaveBeenCalledWith(join(dir, "racine"), expect.any(Number));
  });
  it("D79 — Ctrl-C de groupe : binaire tué par SIGINT sans relais reçu : restes tués, onInterrupt(SIGINT, 130)", async () => {
    const dir = tmpDir();
    const bin = fakeBinary(dir, { check: 0, convert: "kill -INT $$\nsleep 5" });
    const leftovers = vi.fn(() => []);
    const onInterrupt = vi.fn();
    const e = await convertOfficeFile(join(dir, "x.docx"), { ROOMBOARD_OFFICE: bin }, onInterrupt, leftovers).catch((x: unknown) => x);
    expect(e).toEqual(new OfficeConvertError("interrupted"));
    expect(onInterrupt).toHaveBeenCalledWith("SIGINT", 130);
    expect(leftovers).toHaveBeenCalledTimes(1);
  });
  it("D79 — binaire tué par SIGTERM : 143", async () => {
    const dir = tmpDir();
    const bin = fakeBinary(dir, { check: 0, convert: "kill -TERM $$\nsleep 5" });
    const onInterrupt = vi.fn();
    await convertOfficeFile(join(dir, "x.docx"), { ROOMBOARD_OFFICE: bin }, onInterrupt, vi.fn(() => [])).catch(() => undefined);
    expect(onInterrupt).toHaveBeenCalledWith("SIGTERM", 143);
  });
});

describe("killLeftovers (cli-lot4, D79, G4)", () => {
  it("D79 — seuls les processus qui citent <racine>/conversions/<pid>- sont tués (groupe d'abord)", () => {
    const proc = tmpDir();
    const root = join(tmpDir(), "racine");
    const cmd = (pid: string, line: string): void => {
      mkdirSync(join(proc, pid));
      writeFileSync(join(proc, pid, "cmdline"), line.replaceAll(" ", "\0"));
    };
    cmd("100", `soffice --headless -env:UserInstallation=file://${root}/conversions/77-1/profile ${root}/conversions/77-1/source.docx`);
    cmd("101", `soffice --headless ${root}/conversions/78-1/source.docx`);
    cmd("102", "glycin-svg --sandbox");
    mkdirSync(join(proc, "self"));
    const calls: Array<[number, string]> = [];
    const kill = (p: number, s: NodeJS.Signals): void => {
      calls.push([p, s]);
    };
    expect(killLeftovers(root, 77, proc, kill)).toEqual([100]);
    expect(calls).toEqual([[-100, "SIGKILL"]]);
  });
  it("D79 — racine accentuée : cmdline lue en UTF-8, le processus est tué (HOME ou XDG_CACHE_HOME accentué)", () => {
    const proc = tmpDir();
    const root = join(tmpDir(), "caché-é");
    mkdirSync(join(proc, "100"));
    writeFileSync(join(proc, "100", "cmdline"), `soffice\0${root}/conversions/77-1/source.docx\0`, "utf8");
    const calls: number[] = [];
    expect(killLeftovers(root, 77, proc, (p) => void calls.push(p))).toEqual([100]);
    expect(calls).toEqual([-100]);
  });
  it("D79 — pas de /proc (macOS) : ps lu, aucun processus ne cite la racine, rien tué", () =>
    expect(killLeftovers(join(tmpDir(), "racine"), 1, join(tmpDir(), "absent"), () => undefined)).toEqual([]));
  it("OG45 — pas de /proc : un vrai processus qui cite la racine est trouvé par ps et lui seul est visé", async () => {
    const root = join(tmpDir(), "racine é");
    const child = spawn("/bin/sh", ["-c", "sleep 30; :", `${root}/conversions/77-1/source.docx`], { stdio: "ignore" });
    try {
      await new Promise((r) => setTimeout(r, 200));
      const calls: number[] = [];
      expect(killLeftovers(root, 77, join(tmpDir(), "absent"), (p) => void calls.push(p))).toEqual([child.pid]);
      expect(calls).toEqual([-child.pid!]);
    } finally {
      child.kill("SIGKILL");
    }
  });
  it("OG45 — pas de /proc : ps liste les processus vivants, le processus courant compris", () => {
    const self = processCommands(join(tmpDir(), "absent")).find((p) => p.pid === process.pid);
    expect(self?.cmd).toMatch(/node|vitest/);
  });
  it("OG45 — sortie de ps : pid et ligne de commande, espaces et accents gardés", () =>
    expect(parsePs("  100 soffice --headless /r/caché é/conversions/77-1/x.docx\n 7 /bin/zsh\n\n")).toEqual([
      { pid: 100, cmd: "soffice --headless /r/caché é/conversions/77-1/x.docx" },
      { pid: 7, cmd: "/bin/zsh" },
    ]));
});
