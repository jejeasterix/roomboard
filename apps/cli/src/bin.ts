// Entrée du binaire `roomboard` (D3) : branche le processus sur `main` ; les `.wasm` sont à côté du fichier construit.
// cli-lot3 (D34) : `quiet` d'abord, avant que le fichier construit n'évalue pdf.js (trois avertissements de chargement).
import "./quiet";
import { CliError, exitAfterWrites, lineWriter, streamLines, type CliIO } from "./contract";
import { main } from "./main";
import { messageOf } from "../../web/src/platform/controller";

/** Code de Node pour un `await` de premier niveau jamais réglé : celui que donnait l'ancienne entrée dans ce cas. */
const UNSETTLED_EXIT = 13;

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
// Filet de l'ancien `await` de premier niveau : une promesse de `main` jamais réglée (boucle d'événements vidée avant
// sa fin) ne sort pas en 0 sans rien dire, mais en 13 avec une ligne `{"error":…}` sur stderr.
let settled = false;
// cli-lot4 (D77) : une erreur jamais rattrapée (three, pdf.js, un écouteur) sort en une ligne `{"error":…}`, code 1,
// jamais en pile Node (D9) ; l'écriture atomique (D3) garantit qu'aucun fichier n'est à moitié écrit.
const fatal = (e: unknown): void => {
  settled = true;
  err(JSON.stringify({ error: new CliError("command", `erreur interne : ${messageOf(e)}`) }));
  process.exitCode = 1;
  process.exit(1);
};
process.on("uncaughtException", fatal);
process.on("unhandledRejection", fatal);
process.on("exit", (code) => {
  if (!settled && code === 0) {
    err(JSON.stringify({ error: new CliError("command", "commande inachevée : le processus s'est arrêté avant la fin de la commande") }));
    process.exitCode = UNSETTLED_EXIT;
    return;
  }
  process.exitCode = exitAfterWrites(code, out, err);
});
// Pas d'`await` de premier niveau : sous `inlineDynamicImports`, les modules des `import()` (pdf.js, pdf-lib) sont
// placés après ce code dans le fichier construit ; un `await` ici suspendrait son évaluation avant eux, et le premier
// `import()` de `main` lirait une liaison non initialisée (« Cannot access 'pdf_worker' before initialization »).
// Le code de sortie passe toujours par `process.exitCode` : Node vide stdout et stderr avant de quitter.
void main(process.argv.slice(2), io).then((code) => {
  settled = true;
  process.exitCode = code;
});
