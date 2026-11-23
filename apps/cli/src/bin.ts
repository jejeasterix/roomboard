// Entrée du binaire `roomboard` (D3) : branche le processus sur `main` ; les `.wasm` sont à côté du fichier construit.
import { streamLines, type CliIO } from "./contract";
import { main } from "./main";

const io: CliIO = {
  out: (line) => {
    process.stdout.write(`${line}\n`);
  },
  err: (line) => {
    process.stderr.write(`${line}\n`);
  },
  lines: () => streamLines(process.stdin),
  env: process.env,
  wasmDir: new URL("./", import.meta.url),
};

process.exitCode = await main(process.argv.slice(2), io);
