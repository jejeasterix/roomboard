// Entrée du binaire `roomboard` (D3) : branche le processus sur `main` ; les `.wasm` sont à côté du fichier construit.
// cli-lot3 (D34) : `quiet` d'abord, avant que le fichier construit n'évalue pdf.js (trois avertissements de chargement).
import "./quiet";
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
// Pas d'`await` de premier niveau : sous `inlineDynamicImports`, les modules des `import()` (pdf.js, pdf-lib) sont
// placés après ce code dans le fichier construit ; un `await` ici suspendrait son évaluation avant eux, et le premier
// `import()` de `main` lirait une liaison non initialisée (« Cannot access 'pdf_worker' before initialization »).
// Le code de sortie passe toujours par `process.exitCode` : Node vide stdout et stderr avant de quitter.
void main(process.argv.slice(2), io).then((code) => {
  process.exitCode = code;
});
