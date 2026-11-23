# Profil de chantier — RoomBoard

## Dépôt et chemins
- Branche principale : `main`
- Dossier des worktrees : `~/projets/roomboard-wt/` (`<sujet>` et `<sujet>--T<n>`)
- Fichier d'état : `docs/sessions/<sujet>-etat.md`
- Cadrage : `docs/plans/<sujet>-cadrage.md` · Plans : `docs/plans/<sujet>-PLAN.md`
- Fichiers locaux à copier : aucun
- Installation d'un worktree neuf : `pnpm install --frozen-lockfile` (à la racine)
- Parallélisme : écriture du code en parallèle ; **un seul build Tauri à la fois** (7,5 Go de RAM mesurés sur la VM).
  Aucun build Android tant que KVM manque.

## Build et tests
- Build : `cargo build --workspace` puis `pnpm -r build` (le build web inclut la compilation Wasm)
- Tests rapides : `cargo test --workspace 2>&1 | tail -20` · `pnpm -r test 2>&1 | tail -20`
- Tests complets : `scripts/verifier.sh` (fmt, clippy `-D warnings`, cargo test, wasm, tests de l'interface, build web)
- Motif d'échec : `test result: FAILED`, `error[`, `FAIL `, code de sortie non nul
- Build Tauri Linux (lourd, un seul à la fois) : `pnpm --filter @roomboard/desktop tauri build`

## Preuve visuelle
Aucune automatique pour l'instant. Essais manuels : ENI avec Jérôme, Mac, PC (file d'attente du PC).

## Sources du cadrage
- `docs/plans/socle-cadrage.md` une fois écrit ; décisions de Jérôme citées dans le brief OC26.
- Coffre : `~/SecondBrain/06_MOC/actcraft.md` (prédécesseur, pièges stylet).

## Interdits
```interdits
toujours :: \bgit\s+push\b.*(--force|-f\b) :: jamais de push forcé
toujours :: \bgit\s+add\s+(-A|--all|\.)(\s|$) :: ajouter les fichiers un par un
toujours :: \bgit\s+commit\b.*\s-a\b :: pas de commit -a
toujours :: \bgh\s+repo\s+edit\b.*--visibility :: le dépôt reste privé
toujours :: \bgit\s+tag\b :: aucun tag sans go
toujours :: \bgh\s+release\b :: aucune release sans go
```
Workflows GitHub Actions : seulement `runs-on: [self-hosted, linux, vm]`, jamais une machine de GitHub.

## Action finale irréversible
```action-finale
\bgh\s+release\s+create\b :: publication d'une release
```
Go requis : oui
Porte avant merge : non
CI couverte par la suite complète : non

## CLI
- La CLI `apps/cli` (`node apps/cli/dist/roomboard.mjs`) s'essaie en écriture sur des fichiers temporaires (`new`, `run --save`, `import`, `export`), jamais sur un fichier de Jérôme ; l'essai type est `node scripts/essais/cli-essai.mjs` (affiche `CLI : OK`), joué par `scripts/verifier.sh` hors `--e2e`.
- Construction : `pnpm install --frozen-lockfile`, les modules Wasm construits comme `scripts/verifier.sh`, puis `pnpm --filter @roomboard/cli build`.
- Règle : chaque chantier qui ajoute ou change une fonction ou un format tient la CLI à jour : commande ou opération, ligne de `FORMAT_LOTS`, test, et essai `cli-essai.mjs` si le parcours change (D15).
- Lots restants (formats non livrés, code de sortie 3) : `docs/plans/cli-cadrage.md`.

## Règles propres au projet
- Trois couches testables seules : `crates/` (cœur Rust, sans dépendance au navigateur), `apps/web` (interface TS), `apps/desktop` (coque Tauri).
- Le chemin de l'encre ne traverse jamais la frontière page ↔ Rust natif (le cœur tourne en Wasm dans la page).
- Essais de plateforme (Windows, macOS, Android) séparés des tests automatiques de la VM.
