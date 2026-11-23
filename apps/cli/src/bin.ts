// Entrée du binaire `roomboard` (D3) : branche le processus sur `main` ; les `.wasm` sont à côté du fichier construit.
import { exitAfterWrites, lineWriter, streamLines, type CliIO } from "./contract";
import { main } from "./main";

const out = lineWriter(process.stdout);
const err = lineWriter(process.stderr);
const io: CliIO = {
  out,
  err,
  lines: () => streamLines(process.stdin),
  env: process.env,
  wasmDir: new URL("./", import.meta.url),
};

// Une erreur d'écriture arrive par un événement du flux, parfois après la fin de `main` : relevée à la sortie, où Node
// relit `process.exitCode` après les écouteurs de `exit`.
process.on("exit", (code) => {
  process.exitCode = exitAfterWrites(code, out, err);
});
process.exitCode = await main(process.argv.slice(2), io);
