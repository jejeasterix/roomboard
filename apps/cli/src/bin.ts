// Entrée du binaire `roomboard` (D3) : branche le processus sur `main` ; les `.wasm` sont à côté du fichier construit.
import { lineWriter, streamLines, type CliIO } from "./contract";
import { main } from "./main";

const io: CliIO = {
  out: lineWriter(process.stdout),
  err: lineWriter(process.stderr),
  lines: () => streamLines(process.stdin),
  env: process.env,
  wasmDir: new URL("./", import.meta.url),
};

process.exitCode = await main(process.argv.slice(2), io);
