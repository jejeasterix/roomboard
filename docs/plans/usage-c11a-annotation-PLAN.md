# C11a — annotation de bureau (fenêtre, bascule, zone de dépôt) : plan d'exécution

> Exécution : étage 3 de nouvelle-feature — l'orchestrateur lit la table, une tâche = sa section.

| id | titre | dépend de | fichiers touchés | worktree | subagent | preuve | scénario | section |
|----|-------|-----------|------------------|----------|----------|--------|----------|---------|
| T1 | Crate `roomboard_shell::annotation` (session, géométrie, écran, curseur, relance) | — | crates/roomboard-shell/src/lib.rs, crates/roomboard-shell/src/annotation.rs, crates/roomboard-shell/tests/annotation.rs | isolé | implementeur-tdd | `cargo test -p roomboard-shell --test annotation` : `test result: ok. N passed`, N ≥ 12, `relance_memes_arguments_et_gdk_x11` présent ; clippy et fmt verts | S4 | #tache-t1 |
| T2 | Barre : capacité corrigée, trois actions, profils livrés, `itemsForMode`, état des boutons | — | apps/web/src/runtime-capabilities.ts, apps/web/src/runtime-capabilities.test.ts, apps/web/src/toolbar.ts, apps/web/src/toolbar.test.ts, apps/web/src/toolbar-profiles.ts, apps/web/src/toolbar-profiles.test.ts, apps/web/src/ui/item-state.ts, apps/web/src/ui/item-state.test.ts | isolé | implementeur-tdd | Vitest 5 fichiers : `Tests  N passed`, N ≥ 1, `itemsForMode (C11a, P7, P19)` présent ; `Toolbar.test.tsx` vert ; tsc 0 | S1, S4 | #tache-t2 |
| T3 | Ports : contrat `annotation-port`, onglet `annotation` et `replace`, contrôleur `dirty`/`target()`, `guardClose` détourné, `emitTo` | — | apps/web/src/platform/annotation-port.ts, apps/web/src/platform/annotation-port.test.ts, apps/web/src/app/tabs.ts, apps/web/src/app/tabs.test.ts, apps/web/src/platform/controller.ts, apps/web/src/platform/controller.test.ts, apps/web/src/platform/files.ts, apps/web/src/platform/shell-web.ts, apps/web/src/platform/shell-web.test.ts, apps/web/src/platform/host-tauri.ts, apps/web/src/platform/host-tauri.test.ts | isolé | implementeur-tdd | Vitest 6 fichiers : `Tests  N passed`, N ≥ 1, `replace : même place, même id, même actif` présent ; tsc 0 | S4 | #tache-t3 |
| T4 | Contrôleur d'annotation, hôte de barre distant, faux hôte au canal JSON | T2, T3 | apps/web/src/app/annotation.ts, apps/web/src/app/annotation.test.ts, apps/web/src/platform/annotation-fake.ts, apps/web/src/platform/annotation-fake.test.ts | isolé | concepteur-critique | Vitest 2 fichiers : `Tests  N passed`, N ≥ 15, `faux hôte muet : sortie après 5 s` et `un Uint8Array brut devient` présents ; tsc 0 | S2, S4 | #tache-t4 |
| T5 | Coque Tauri : commandes `annotation_*`, événements de fenêtre, `annotate.json`, hôte de fenêtres TS, fiche d'essais en coque | T1, T3 | apps/desktop/src-tauri/src/main.rs, apps/desktop/src-tauri/capabilities/annotate.json, apps/web/src/platform/annotation-tauri.ts, apps/web/src/platform/annotation-tauri.test.ts, docs/essais/c11a-coque.md | isolé | implementeur-tdd | Vitest `annotation-tauri.test.ts` : `Tests  N passed`, N ≥ 8, `réponse d'un autre id ignorée` présent ; `cargo check` de src-tauri : `Finished` (sinon preuve par lecture, dite) | S5 | #tache-t5 |
| T6 | Page `annotate` : rendu transparent, session, rejeu des commandes, aller-retour base64, sondage du curseur | T3 | apps/web/src/engine/render/canvas2d.ts, apps/web/src/engine/render/canvas2d.test.ts, apps/web/src/engine/render/select.ts, apps/web/src/engine/render/select.test.ts, apps/web/src/app/board-session.ts, apps/web/src/app/annotation-page.ts, apps/web/src/app/annotation-page.test.ts | isolé | implementeur-tdd | Vitest 4 fichiers : `Tests  N passed`, N ≥ 1, `mode souris : sondage toutes les 30 ms` et `transparent : clearRect` présents ; tsc 0 | S4 | #tache-t6 |
| T7 | Espace de travail : onglet d'annotation, remplacement, fermeture détournée, dépôt routé | T3 | apps/web/src/app/workspace.ts, apps/web/src/app/workspace.test.ts | isolé | concepteur-critique | Vitest `workspace.test.ts` : `Tests  N passed`, N ≥ 1, `replaceAnnotation : même place, même cible, modifié` présent ; tsc 0 | S4 | #tache-t7 |
| T8 | Interface : hôte local à trois actions, barre selon le mode, onglet « Annotation », App en barre seule | T2, T3 | apps/web/src/app/toolbar-host.ts, apps/web/src/app/toolbar-host.test.ts, apps/web/src/ui/Toolbar.tsx, apps/web/src/ui/Toolbar.test.tsx, apps/web/src/ui/TabsBar.tsx, apps/web/src/ui/TabsBar.test.tsx, apps/web/src/ui/App.tsx, apps/web/src/ui/App.test.tsx, apps/web/src/ui/rb.css | isolé | implementeur-tdd | Vitest 4 fichiers : `Tests  N passed`, N ≥ 1, `C11a : en annotation, barre seule` présent ; tsc 0 | S2 | #tache-t8 |
| T9 | Amorces (`main.ts`, `annotate-start.ts`) et essai Playwright `c11a-annotation-navigateur.mjs` branché dans `verifier.sh` | T4, T5, T6, T7, T8 | apps/web/src/main.ts, apps/web/src/annotate-start.ts, scripts/essais/c11a-annotation-navigateur.mjs, scripts/verifier.sh, scripts/tests/verifier-e2e.test.sh | isolé | implementeur-tdd | `node scripts/essais/c11a-annotation-navigateur.mjs` : `C11a : OK`, ≥ 20 lignes `ok —`, `S3 : avis « ajouté à la page 1 »` présent ; `verifier-e2e.test.sh : OK` ; c1, c10a, c4, c15 : `OK` | S1, S2, S3 | #tache-t9 |
| T10 | Aller-retour bout à bout (Vitest) : tracer, sortir, enregistrer, rouvrir ; Ctrl+S ; fermeture ; faux hôte muet | T4, T7 | apps/web/src/app/workspace.test.ts | isolé | implementeur-tdd | Vitest `workspace.test.ts` : `Tests  N passed`, N ≥ 1, `S4 aller-retour : le trait est là après réouverture` présent | S4 | #tache-t10 |

Vagues : 1 = T1, T2, T3 · 2 = T4, T5, T6, T7, T8 · 3 = T9, T10. Aucune tâche d'une vague ne recoupe une autre de sa vague
(T7 puis T10 touchent `workspace.test.ts`, dans deux vagues différentes).

**Goal :** en coque (Windows, macOS, Linux X11), annoter par-dessus le bureau vivant dans une fenêtre `annotate`
transparente, la fenêtre principale réduite à sa barre, avec bascule dessin / souris, démarrage en annotation par le
profil et zone de dépôt ; capacité absente et dite sous Wayland natif, entrée masquée ailleurs.

**Architecture :** l'onglet d'annotation est une `TabSession` ordinaire de la fenêtre principale ; à l'entrée son
`.roomboard` part en base64 vers `annotate`, qui dessine localement dans son propre moteur, et revient en base64 à la
sortie (DA1). Entre les pages ne passent que des commandes de barre, la vue de barre et ce document (DA2). La coque règle
les fenêtres par des commandes minces appuyées sur des fonctions pures de `roomboard_shell::annotation` (DA3, DA4) ; tout
l'état vit dans le contrôleur TS `app/annotation.ts`, testé avec un faux hôte dont le canal fait
`JSON.parse(JSON.stringify(m))`.

**Tech Stack :** Rust (crate `roomboard-shell`, Tauri 2.12.5 hors workspace), TypeScript, SolidJS, Vitest (happy-dom),
Playwright (Chromium de la VM).

**Spec :** `docs/plans/usage-c11a-annotation-cadrage.md` (fait foi ; décisions P1 à P30, DA1 à DA5, scénarios S1 à S5).

## Global Constraints

- GC1 — Le chemin de l'encre ne traverse jamais la frontière page ↔ Rust natif ; entre fenêtres ne passent que des commandes de barre, l'état des boutons et le document entier en base64.
- GC2 — Logique testable hors Tauri ; commandes Tauri minces. `apps/desktop/src-tauri` est hors workspace Cargo : `cd apps/desktop/src-tauri && nice -n 10 cargo check -j 4` et `cargo test -j 4` permis s'ils compilent (sinon preuve par lecture, dite) ; aucun `tauri build`, aucun bundle.
- GC3 — Builds et tests en `nice -n 10` ; `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`. Attention au `CARGO_TARGET_DIR` partagé entre worktrees : ne le pose pas, chaque worktree garde son `target/`.
- GC4 — Suites sous le jeton : `node ~/.claude/scripts/chaine/jeton.cjs --nom tests --proprietaire usage-c11a-annotation/T<n> --places-par-sujet 3 --commande "<commande bornée, sortie redirigée vers un fichier>"`.
- GC5 — Tests rapides du profil : `cargo test --workspace 2>&1 | tail -20` · `pnpm -r test 2>&1 | tail -20` ; complet : `scripts/verifier.sh --e2e`.
- GC6 — Compatibilité : un fichier `.roomboard` et un profil d'avant C11a s'ouvrent toujours (test).
- GC7 — Tailles Wasm : module principal ≤ 1 572 864 o (aujourd'hui 1 374 398), formats ≤ 3 145 728 o (aujourd'hui 2 794 511) ; aucun seuil baissé ni relevé.
- GC8 — La scène ne passe pas sous 640 px (mesurée par l'essai Playwright).
- GC9 — Aucun test désactivé ou sauté, aucun seuil changé. Pas de `git add -A`/`.`, pas de `commit -a`, pas de `--force`. Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>` (via `git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit`), messages en anglais terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- GC10 — Aucune dépendance en AGPL/GPL/LGPL ; aucun paquet système installé ; aucun workflow GitHub.

## Review Focus

- RF1 — Réponse de `annotate` arrivée après le délai de 5 s, ou d'une séance précédente, pendant une nouvelle sortie : elle est ignorée (identifiant de demande). Cadrage P4 (« Sans réponse sous 5 s »). Test : T5 `collect : réponse d'un autre id ignorée`.
- RF2 — Double clic sur « Annotation du bureau », ou Échap pendant l'entrée : une seule entrée, transitions en série. Cadrage P6, P24. Test : T4 `double clic : une seule entrée`.
- RF3 — Charge base64 illisible reçue par `annotate` : ignorée, aucune session créée, aucun plantage. Cadrage P4. Test : T6 `base64 illisible : ignoré`.
- RF4 — Fichier refusé déposé sur la zone : l'annotation est quittée, aucun avis « ajouté à la page N ». Cadrage P17. Test : T4 `dépôt refusé : sortie faite, aucun avis d'ajout`.
- RF5 — Profil changé pendant l'annotation : `annotate` reçoit le nouveau profil (préréglages à jour). Cadrage P21. Test : T8 `profil changé en annotation : renvoyé à annotate`.

## Carte des fichiers

| fichier | rôle | tâche |
|---|---|---|
| `crates/roomboard-shell/src/annotation.rs` (nouveau) | fonctions pures : session, découpe barre / zone, écran, curseur relatif, relance | T1 |
| `crates/roomboard-shell/src/lib.rs` | `pub mod annotation;` | T1 |
| `crates/roomboard-shell/tests/annotation.rs` (nouveau) | tests du module | T1 |
| `apps/web/src/runtime-capabilities.ts` | `annotationSupported`, `forceAnnotation` | T2 |
| `apps/web/src/toolbar.ts` | trois actions, ensembles d'actions, `isAnnotationZone`, `itemsForMode` | T2 |
| `apps/web/src/toolbar-profiles.ts` | éléments C11a dans `defaut`, `annotation`, `simple` | T2 |
| `apps/web/src/ui/item-state.ts` | `AnnotationView`, état des trois boutons, grisé en annotation | T2 |
| `apps/web/src/platform/annotation-port.ts` (nouveau) | contrat entre fenêtres : événements, charges, `AnnotationWindows`, `AnnotationControl` | T3 |
| `apps/web/src/app/tabs.ts` | `"annotation"` accepté (un seul), `replace` | T3 |
| `apps/web/src/platform/controller.ts` | `dirty`, `target()` | T3 |
| `apps/web/src/platform/files.ts`, `shell-web.ts`, `host-tauri.ts` | `guardClose(…, divert?)`, `TauriIpc.emitTo?` | T3 |
| `apps/web/src/app/annotation.ts` (nouveau) | contrôleur, hôte de barre distant, offre de relance | T4 |
| `apps/web/src/platform/annotation-fake.ts` (nouveau) | faux hôte (tests, `?annotation=faux`), canal JSON | T4 |
| `apps/desktop/src-tauri/src/main.rs` | commandes `annotation_*`, `relaunch_compat`, événements de fenêtre | T5 |
| `apps/desktop/src-tauri/capabilities/annotate.json` (nouveau) | `windows: ["annotate"]`, `core:default` | T5 |
| `apps/web/src/platform/annotation-tauri.ts` (nouveau) | hôte de fenêtres de la coque | T5 |
| `docs/essais/c11a-coque.md` (nouveau) | fiches d'essai en coque (S5) | T5 |
| `apps/web/src/engine/render/canvas2d.ts`, `select.ts`, `app/board-session.ts` | option `transparent` | T6 |
| `apps/web/src/app/annotation-page.ts` (nouveau) | page `annotate` | T6 |
| `apps/web/src/app/workspace.ts` | onglet d'annotation, remplacement, garde détournée, dépôt routé | T7 |
| `apps/web/src/app/toolbar-host.ts`, `ui/Toolbar.tsx`, `ui/TabsBar.tsx`, `ui/App.tsx`, `ui/rb.css` | interface en annotation | T8 |
| `apps/web/src/main.ts`, `apps/web/src/annotate-start.ts` (nouveau) | amorces des deux fenêtres | T9 |
| `scripts/essais/c11a-annotation-navigateur.mjs` (nouveau), `scripts/verifier.sh`, `scripts/tests/verifier-e2e.test.sh` | essai S1 à S3 | T9 |

Non touchés (cadrage, carte d'impact « non ») : `tauri.conf.json`, `capabilities/default.json`, `src-tauri/Cargo.toml`,
`build.rs`, `crates/roomboard-core`, les crates Wasm, le format `.roomboard`, le schéma de profil (`PROFILE_MINOR` reste 1).

## Préparation commune d'un worktree (recopiée dans chaque section)

`WT` est le worktree que l'orchestrateur donne à la tâche (isolé : `/home/adminjd/projets/roomboard-wt/usage-c11a-annotation--T<n>` ;
sinon `/home/adminjd/projets/roomboard-wt/usage-c11a-annotation`). Les modules Wasm et `apps/web/dist` sont ignorés par git :
un worktree neuf les copie depuis celui du chantier.

---

### Tâche T1 — Crate `roomboard_shell::annotation` (session, géométrie, écran, curseur, relance)
<a id="tache-t1"></a>

**Objectif.** Toute la logique native de C11a en fonctions pures, testées par `cargo test` : détection de Wayland natif
(P16), découpe de l'écran en bande de barre et zone d'annotation disjointes (P10, DA4), épaisseur physique, choix de
l'écran (P15), curseur relatif à la fenêtre (P9, DA5), environnement et arguments de relance (P16). Ni machine d'états
ni sondage (P28).

**Fichiers.**
- Créer : `crates/roomboard-shell/src/annotation.rs`
- Modifier : `crates/roomboard-shell/src/lib.rs` (ligne `pub mod originals;`, l. 12)
- Test : `crates/roomboard-shell/tests/annotation.rs` (nouveau)

**Interfaces.**
- Consomme : rien (std seule ; `Cargo.toml` de la crate inchangé).
- Produit (utilisé par T5, `main.rs`) :
  - `pub enum Session { X11, XWayland, WaylandNative, Other }` (`Clone, Copy, Debug, PartialEq, Eq`)
  - `pub enum Unsupported { Wayland }`
  - `pub struct Rect { pub x: i32, pub y: i32, pub w: u32, pub h: u32 }` (`Clone, Copy, Debug, PartialEq, Eq`)
  - `pub enum Side { Top, Bottom, Left, Right }`
  - `pub fn detect_session(os: &str, env: impl Fn(&str) -> Option<String>) -> Session`
  - `pub fn supported(s: Session) -> Result<(), Unsupported>`
  - `pub fn side_of(dock: &str) -> Side`
  - `pub fn split(screen: Rect, side: Side, thickness: u32) -> (Rect, Rect)` (barre, annotation)
  - `pub fn physical(css: f64, scale: f64) -> u32`
  - `pub fn pick_screen(screens: &[Rect], wanted: Option<usize>, main_center: (i32, i32)) -> usize`
  - `pub fn cursor_in(cursor: (f64, f64), window: Rect, scale: f64) -> Option<(f64, f64)>`
  - `pub fn compat_env() -> [(&'static str, &'static str); 1]`
  - `pub fn relaunch_args(args: impl Iterator<Item = OsString>) -> Vec<OsString>`
- Réutilise : `crates/roomboard-shell` (C16) — nouveau module `annotation` à côté de `office` et `originals`, patron « logique de la coque testable sans Tauri » (`crates/roomboard-shell/src/lib.rs:1-3`).
- Réutilise : `crates/roomboard-shell/src/lib.rs:48` (`GrantedPaths`) et `apps/desktop/src-tauri/src/main.rs:247` (`grant_and_emit`) — inchangés (aucune ligne ici ne les touche).
- Réutilise : `crates/roomboard-core/src/capabilities.rs:21` — `capabilities(platform)` inchangée ; son test `desktop_annotation_only_on_desktops` (`:35`) reste vert.

**Test et commande bornée.**
```bash
export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH
node ~/.claude/scripts/chaine/jeton.cjs --nom tests --proprietaire usage-c11a-annotation/T1 --places-par-sujet 3 --commande "cd $WT && nice -n 10 cargo test -p roomboard-shell --test annotation > /tmp/c11a-T1-test.log 2>&1"; tail -20 /tmp/c11a-T1-test.log
```
Preuve attendue : `test result: ok. N passed; 0 failed`, N ≥ 12, et la ligne `test relance_memes_arguments_et_gdk_x11 ... ok`.
Puis, sans régression : `cd $WT && nice -n 10 cargo fmt --all --check && nice -n 10 cargo clippy -p roomboard-shell --all-targets -- -D warnings 2>&1 | tail -5` (aucun `error`, aucun `warning`), et
`node ~/.claude/scripts/chaine/jeton.cjs --nom tests --proprietaire usage-c11a-annotation/T1 --places-par-sujet 3 --commande "cd $WT && nice -n 10 cargo test --workspace > /tmp/c11a-T1-ws.log 2>&1"; grep -c "test result: ok" /tmp/c11a-T1-ws.log; grep -E "FAILED|error\[" /tmp/c11a-T1-ws.log | head` (aucune ligne d'échec ; `desktop_annotation_only_on_desktops` reste `ok`).

**Preuve visuelle.** Aucune (pas d'interface).

**Contraintes (recopiées de Global Constraints).**
- GC2 — Logique testable hors Tauri ; commandes Tauri minces. `apps/desktop/src-tauri` est hors workspace Cargo : `cd apps/desktop/src-tauri && nice -n 10 cargo check -j 4` et `cargo test -j 4` permis s'ils compilent (sinon preuve par lecture, dite) ; aucun `tauri build`, aucun bundle.
- GC3 — Builds et tests en `nice -n 10` ; `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`. Attention au `CARGO_TARGET_DIR` partagé entre worktrees : ne le pose pas, chaque worktree garde son `target/`.
- GC4 — Suites sous le jeton : `node ~/.claude/scripts/chaine/jeton.cjs --nom tests --proprietaire usage-c11a-annotation/T<n> --places-par-sujet 3 --commande "<commande bornée, sortie redirigée vers un fichier>"`.
- GC5 — Tests rapides du profil : `cargo test --workspace 2>&1 | tail -20` · `pnpm -r test 2>&1 | tail -20` ; complet : `scripts/verifier.sh --e2e`.
- GC7 — Tailles Wasm : module principal ≤ 1 572 864 o (aujourd'hui 1 374 398), formats ≤ 3 145 728 o (aujourd'hui 2 794 511) ; aucun seuil baissé ni relevé. (Ici : aucune crate Wasm touchée.)
- GC9 — Aucun test désactivé ou sauté, aucun seuil changé. Pas de `git add -A`/`.`, pas de `commit -a`, pas de `--force`. Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>` (via `git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit`), messages en anglais terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- GC10 — Aucune dépendance en AGPL/GPL/LGPL ; aucun paquet système installé ; aucun workflow GitHub.

**Interdits.** Aucune dépendance ajoutée à `crates/roomboard-shell/Cargo.toml` ; aucune machine d'états, aucun fil, aucun
sondage dans la crate ; ne pas toucher `apps/desktop/src-tauri` (c'est T5) ; aucune crate Wasm touchée.

**Critère « terminé ».** Les 13 tests ci-dessous passent ; `cargo fmt --all --check` et `cargo clippy -p roomboard-shell
--all-targets -- -D warnings` sont verts ; `cargo test --workspace` sans échec ; un commit. Le rapport porte la ligne
`Réutilisation : appelé crates/roomboard-shell (module annotation ajouté)` ou `Réutilisation : écart — <pourquoi>`.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree.**
```bash
export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH
SRC=/home/adminjd/projets/roomboard-wt/usage-c11a-annotation
cd "$WT" && git status --short | head
```
Attendu : rien de modifié.

- [ ] **Étape 2 : écrire les tests rouges** dans `crates/roomboard-shell/tests/annotation.rs`.
```rust
//! C11a (P9, P10, P11, P15, P16) : logique pure de l'annotation de bureau.
use roomboard_shell::annotation::{
    compat_env, cursor_in, detect_session, physical, pick_screen, relaunch_args, side_of, split, supported, Rect,
    Session, Side, Unsupported,
};
use std::collections::HashMap;
use std::ffi::OsString;

fn env(pairs: &[(&str, &str)]) -> impl Fn(&str) -> Option<String> {
    let m: HashMap<String, String> = pairs.iter().map(|(k, v)| ((*k).to_string(), (*v).to_string())).collect();
    move |k| m.get(k).cloned()
}

fn r(x: i32, y: i32, w: u32, h: u32) -> Rect {
    Rect { x, y, w, h }
}

fn disjoint(a: Rect, b: Rect) -> bool {
    let (ax1, ay1) = (i64::from(a.x) + i64::from(a.w), i64::from(a.y) + i64::from(a.h));
    let (bx1, by1) = (i64::from(b.x) + i64::from(b.w), i64::from(b.y) + i64::from(b.h));
    ax1 <= i64::from(b.x) || bx1 <= i64::from(a.x) || ay1 <= i64::from(b.y) || by1 <= i64::from(a.y)
}

#[test]
fn wayland_natif_sans_gdk_x11() {
    assert_eq!(detect_session("linux", env(&[("WAYLAND_DISPLAY", "wayland-0")])), Session::WaylandNative);
    assert_eq!(detect_session("linux", env(&[("XDG_SESSION_TYPE", "wayland")])), Session::WaylandNative);
    assert_eq!(supported(Session::WaylandNative), Err(Unsupported::Wayland));
}

#[test]
fn xwayland_quand_gdk_backend_x11() {
    let s = detect_session("linux", env(&[("WAYLAND_DISPLAY", "wayland-0"), ("GDK_BACKEND", "x11")]));
    assert_eq!(s, Session::XWayland);
    assert_eq!(supported(s), Ok(()));
    let liste = detect_session("linux", env(&[("XDG_SESSION_TYPE", "wayland"), ("GDK_BACKEND", "x11,wayland")]));
    assert_eq!(liste, Session::XWayland);
}

#[test]
fn x11_sans_wayland() {
    let s = detect_session("linux", env(&[("DISPLAY", ":0"), ("XDG_SESSION_TYPE", "x11")]));
    assert_eq!(s, Session::X11);
    assert_eq!(supported(s), Ok(()));
}

#[test]
fn wayland_display_vide_ne_compte_pas() {
    assert_eq!(detect_session("linux", env(&[("WAYLAND_DISPLAY", "")])), Session::X11);
}

#[test]
fn windows_et_macos_hors_linux() {
    for os in ["windows", "macos"] {
        let s = detect_session(os, env(&[("WAYLAND_DISPLAY", "wayland-0")]));
        assert_eq!(s, Session::Other);
        assert_eq!(supported(s), Ok(()));
    }
}

#[test]
fn split_quatre_cotes_disjoints() {
    let screen = r(0, 0, 1920, 1080);
    let cases = [
        (Side::Top, r(0, 0, 1920, 64), r(0, 64, 1920, 1016)),
        (Side::Bottom, r(0, 1016, 1920, 64), r(0, 0, 1920, 1016)),
        (Side::Left, r(0, 0, 64, 1080), r(64, 0, 1856, 1080)),
        (Side::Right, r(1856, 0, 64, 1080), r(0, 0, 1856, 1080)),
    ];
    for (side, bar, area) in cases {
        assert_eq!(split(screen, side, 64), (bar, area), "{side:?}");
        assert!(disjoint(bar, area), "{side:?}");
        let total = u64::from(bar.w) * u64::from(bar.h) + u64::from(area.w) * u64::from(area.h);
        assert_eq!(total, 1920 * 1080, "{side:?}");
    }
}

#[test]
fn split_deux_ecrans_echelles_differentes() {
    let second = r(1920, 0, 3840, 2160);
    let t = physical(48.0, 2.0);
    assert_eq!(t, 96);
    assert_eq!(split(second, Side::Top, t), (r(1920, 0, 3840, 96), r(1920, 96, 3840, 2064)));
    // 48,4 px CSS à 125 % = 60,5 px : arrondi au-dessus, la barre n'est jamais rognée.
    assert_eq!(physical(48.4, 1.25), 61);
    assert_eq!(physical(-3.0, 2.0), 0);
}

#[test]
fn split_epaisseur_plus_grande_que_l_ecran() {
    let (bar, area) = split(r(0, 0, 800, 600), Side::Top, 900);
    assert_eq!((bar.h, area.h), (600, 0));
    let (bar, area) = split(r(0, 0, 800, 600), Side::Right, 900);
    assert_eq!((bar.w, area.w), (800, 0));
}

#[test]
fn side_of_dock() {
    assert_eq!(side_of("top"), Side::Top);
    assert_eq!(side_of("bottom"), Side::Bottom);
    assert_eq!(side_of("left"), Side::Left);
    assert_eq!(side_of("right"), Side::Right);
    assert_eq!(side_of("floating"), Side::Top);
    assert_eq!(side_of("inconnu"), Side::Top);
}

#[test]
fn pick_screen_ecran_de_la_principale_ou_demande() {
    let screens = [r(0, 0, 1920, 1080), r(1920, 0, 3840, 2160)];
    assert_eq!(pick_screen(&screens, None, (2500, 400)), 1);
    assert_eq!(pick_screen(&screens, None, (100, 100)), 0);
    assert_eq!(pick_screen(&screens, Some(1), (100, 100)), 1);
    assert_eq!(pick_screen(&screens, Some(5), (2500, 400)), 1);
    assert_eq!(pick_screen(&screens, None, (-500, 100)), 0);
    assert_eq!(pick_screen(&[], None, (0, 0)), 0);
}

#[test]
fn cursor_in_relatif_a_la_fenetre() {
    let w = r(1920, 96, 3840, 2064);
    assert_eq!(cursor_in((2020.0, 296.0), w, 2.0), Some((50.0, 100.0)));
    assert_eq!(cursor_in((1919.0, 296.0), w, 2.0), None);
    assert_eq!(cursor_in((2020.0, 50.0), w, 2.0), None);
    assert_eq!(cursor_in((5760.0, 296.0), w, 2.0), None);
    assert_eq!(cursor_in((2020.0, 296.0), w, 0.0), None);
}

#[test]
fn relance_memes_arguments_et_gdk_x11() {
    let args = ["roomboard-desktop", "/tmp/a b.roomboard", "--x"].map(OsString::from);
    assert_eq!(
        relaunch_args(args.into_iter()),
        vec![OsString::from("/tmp/a b.roomboard"), OsString::from("--x")]
    );
    assert_eq!(compat_env(), [("GDK_BACKEND", "x11")]);
}

#[cfg(unix)]
#[test]
fn relance_garde_un_argument_non_utf8() {
    use std::os::unix::ffi::OsStringExt;
    let raw = OsString::from_vec(vec![0x66, 0xff, 0x6f]);
    assert_eq!(relaunch_args([OsString::from("rb"), raw.clone()].into_iter()), vec![raw]);
}
```

- [ ] **Étape 3 : vérifier l'échec.** `cd $WT && nice -n 10 cargo test -p roomboard-shell --test annotation 2>&1 | tail -5`.
Attendu : `error[E0432]: unresolved import roomboard_shell::annotation`.

- [ ] **Étape 4 : écrire le module** `crates/roomboard-shell/src/annotation.rs`.
```rust
//! C11a (P9, P10, P11, P15, P16, DA3, DA4) : logique pure de l'annotation de bureau, testable sans Tauri : session
//! graphique, découpe de l'écran en bande de barre et zone d'annotation disjointes, épaisseur physique, choix de l'écran,
//! curseur relatif à la fenêtre, relance en mode compatibilité. Ni machine d'états ni sondage : l'état vit dans la page.
use std::ffi::OsString;

/// Session graphique du poste (P16). `XWayland` : session Wayland avec `GDK_BACKEND=x11` (mode compatibilité).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Session {
    X11,
    XWayland,
    WaylandNative,
    Other,
}

/// Raison d'une annotation indisponible.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Unsupported {
    Wayland,
}

/// Rectangle en pixels physiques du bureau.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Rect {
    pub x: i32,
    pub y: i32,
    pub w: u32,
    pub h: u32,
}

/// Côté de l'écran où se place la bande de la barre (P10).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Side {
    Top,
    Bottom,
    Left,
    Right,
}

/// Wayland natif : `WAYLAND_DISPLAY` non vide ou `XDG_SESSION_TYPE=wayland`, sans `GDK_BACKEND` commençant par `x11`.
/// Hors Linux : `Other` (Windows et macOS ont l'annotation).
pub fn detect_session(os: &str, env: impl Fn(&str) -> Option<String>) -> Session {
    if os != "linux" {
        return Session::Other;
    }
    let wayland = env("WAYLAND_DISPLAY").is_some_and(|v| !v.is_empty())
        || env("XDG_SESSION_TYPE").is_some_and(|v| v.eq_ignore_ascii_case("wayland"));
    let forced_x11 = env("GDK_BACKEND").is_some_and(|v| v.split(',').next().is_some_and(|b| b.trim() == "x11"));
    match (wayland, forced_x11) {
        (true, true) => Session::XWayland,
        (true, false) => Session::WaylandNative,
        (false, _) => Session::X11,
    }
}

/// Seul Wayland natif refuse l'annotation (aucun code `layer-shell`, P16).
pub fn supported(s: Session) -> Result<(), Unsupported> {
    match s {
        Session::WaylandNative => Err(Unsupported::Wayland),
        _ => Ok(()),
    }
}

/// `dock` de la première barre `tools` ; `floating` et toute valeur inconnue : haut (P10).
pub fn side_of(dock: &str) -> Side {
    match dock {
        "bottom" => Side::Bottom,
        "left" => Side::Left,
        "right" => Side::Right,
        _ => Side::Top,
    }
}

/// (barre, annotation) : deux rectangles disjoints qui couvrent l'écran ; l'épaisseur est bornée par l'écran (DA4).
pub fn split(screen: Rect, side: Side, thickness: u32) -> (Rect, Rect) {
    let Rect { x, y, w, h } = screen;
    match side {
        Side::Top | Side::Bottom => {
            let t = thickness.min(h);
            let rest = h - t;
            let (bar_y, area_y) = if side == Side::Top { (y, y + t as i32) } else { (y + rest as i32, y) };
            (Rect { x, y: bar_y, w, h: t }, Rect { x, y: area_y, w, h: rest })
        }
        Side::Left | Side::Right => {
            let t = thickness.min(w);
            let rest = w - t;
            let (bar_x, area_x) = if side == Side::Left { (x, x + t as i32) } else { (x + rest as i32, x) };
            (Rect { x: bar_x, y, w: t, h }, Rect { x: area_x, y, w: rest, h })
        }
    }
}

/// Épaisseur mesurée dans la page (px CSS) en pixels physiques du moniteur, arrondie au-dessus.
pub fn physical(css: f64, scale: f64) -> u32 {
    (css.max(0.0) * scale).ceil() as u32
}

fn contains(r: &Rect, x: i32, y: i32) -> bool {
    let (x, y) = (i64::from(x), i64::from(y));
    x >= i64::from(r.x)
        && y >= i64::from(r.y)
        && x < i64::from(r.x) + i64::from(r.w)
        && y < i64::from(r.y) + i64::from(r.h)
}

fn dist2(r: &Rect, x: i32, y: i32) -> i64 {
    let cx = i64::from(r.x) + i64::from(r.w) / 2;
    let cy = i64::from(r.y) + i64::from(r.h) / 2;
    (cx - i64::from(x)).pow(2) + (cy - i64::from(y)).pow(2)
}

/// Écran demandé s'il existe, sinon celui qui contient le centre de la fenêtre principale, sinon le plus proche (P15).
pub fn pick_screen(screens: &[Rect], wanted: Option<usize>, main_center: (i32, i32)) -> usize {
    if let Some(i) = wanted.filter(|&i| i < screens.len()) {
        return i;
    }
    let (cx, cy) = main_center;
    if let Some(i) = screens.iter().position(|r| contains(r, cx, cy)) {
        return i;
    }
    screens
        .iter()
        .enumerate()
        .min_by_key(|(_, r)| dist2(r, cx, cy))
        .map_or(0, |(i, _)| i)
}

/// Curseur du bureau (px physiques) en px CSS relatifs au coin de la fenêtre ; `None` hors de la fenêtre (P9).
pub fn cursor_in(cursor: (f64, f64), window: Rect, scale: f64) -> Option<(f64, f64)> {
    let dx = cursor.0 - f64::from(window.x);
    let dy = cursor.1 - f64::from(window.y);
    if scale <= 0.0 || dx < 0.0 || dy < 0.0 || dx >= f64::from(window.w) || dy >= f64::from(window.h) {
        return None;
    }
    Some((dx / scale, dy / scale))
}

/// Environnement de la relance en mode compatibilité (XWayland, P16).
pub fn compat_env() -> [(&'static str, &'static str); 1] {
    [("GDK_BACKEND", "x11")]
}

/// Mêmes arguments que le lancement, sans le nom du programme (le fichier passé au lancement est repris, P16).
pub fn relaunch_args(args: impl Iterator<Item = OsString>) -> Vec<OsString> {
    args.skip(1).collect()
}
```
Dans `crates/roomboard-shell/src/lib.rs`, ajouter avant `pub mod office;` (l. 11) : `pub mod annotation;`.

- [ ] **Étape 5 : vérifier le vert** (commande bornée de la section « Test et commande bornée »). Attendu : `test result: ok. 13 passed` sous Linux.
Si clippy signale un cast, garder le cast `as` borné par `min` (déjà borné) et ajouter `#[allow(clippy::cast_possible_wrap)]` seulement si clippy l'exige par défaut (il ne l'exige pas).

- [ ] **Étape 6 : fmt, clippy, workspace** (commandes de la section « Test et commande bornée »).

- [ ] **Étape 7 : commit.**
```bash
cd $WT && git add crates/roomboard-shell/src/annotation.rs crates/roomboard-shell/src/lib.rs crates/roomboard-shell/tests/annotation.rs
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "feat(shell): pure desktop-annotation logic (session, split, screen, cursor, relaunch)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche T2 — Barre : capacité corrigée, trois actions, profils livrés, `itemsForMode`, état des boutons
<a id="tache-t2"></a>

**Objectif.** Côté barre, sans fenêtre : `desktopAnnotation` vaut « statique ∧ détecté » en coque et peut être forcée
hors coque par `?annotation=faux` (P16, P29) ; trois actions `desktop-annotation`, `annotation-pointer`,
`annotation-screen` (P6, P8, P15) ; éléments ajoutés aux profils livrés (P6, P19) ; `itemsForMode` (P7, P19) ; état des
boutons et grisé des actions non transmises en annotation (P20).

**Fichiers.**
- Modifier : `apps/web/src/runtime-capabilities.ts:14-24`, `apps/web/src/toolbar.ts:97-130` (`ACTION_TABLE`) et près de `:618` (`visibleItems`), `apps/web/src/toolbar-profiles.ts:56-67` (`defaultToolbars`) et `:83-104` (`simple`), `apps/web/src/ui/item-state.ts:5-30` (`ToolbarView`), `:39-59` (`ACTION_STATE`), `:77-79` (`itemState`)
- Test : `apps/web/src/runtime-capabilities.test.ts`, `apps/web/src/toolbar.test.ts`, `apps/web/src/toolbar-profiles.test.ts`, `apps/web/src/ui/item-state.test.ts`

**Interfaces.**
- Consomme : rien des autres tâches.
- Produit :
  - `runtimeCapabilities(staticCaps: unknown, env: { readonly tauri: boolean; readonly officeConverter?: boolean; readonly annotationSupported?: boolean; readonly forceAnnotation?: boolean }): RuntimeCapabilities`
  - `toolbar.ts` : `ANNOTATION_EXIT_ACTION = "desktop-annotation"`, `ANNOTATION_POINTER_ACTION = "annotation-pointer"`, `ANNOTATION_SCREEN_ACTION = "annotation-screen"`, `ANNOTATION_REMOTE_ACTIONS: ReadonlySet<ActionId>` (= `undo`, `redo`, `eraser-mode`), `ANNOTATION_MAIN_ACTIONS: ReadonlySet<ActionId>` (= les trois actions), `isAnnotationZone(it: ToolItem): boolean`, `itemsForMode(bar: Toolbar, caps: RuntimeCapabilities, mode: StartMode): ToolItem[]`
  - `item-state.ts` : `interface AnnotationView { readonly active: boolean; readonly pointer: "draw" | "mouse"; readonly screens: number }` ; `ToolbarView.annotation?: AnnotationView`
  - identifiants d'éléments livrés : `desktop-annotation`, `annotation-pointer`, `annotation-screen` (actions, `requires: ["desktopAnnotation"]`), `depot-annotation` (dropzone « Déposer ici », `requires: ["desktopAnnotation"]`)
- Réutilise : `apps/web/src/runtime-capabilities.ts:15` — `runtimeCapabilities(staticCaps, env: { tauri; officeConverter?; annotationSupported?: boolean })` (étendue de `annotationSupported` et `forceAnnotation`).
- Réutilise : `apps/web/src/toolbar.ts:618` — `visibleItems(bar, caps)` (appelée telle quelle par `itemsForMode`).
- Réutilise : `apps/web/src/toolbar.ts:618` (voisin) — `itemsForMode(bar: Toolbar, caps: RuntimeCapabilities, mode: StartMode): ToolItem[]` (fonction ajoutée à côté, sur `visibleItems`).
- Réutilise : `apps/web/src/toolbar.ts:466` (`ensureProfilesAccess`) — patron repris dans `itemsForMode` (ajout au rendu, profil non réécrit).
- Réutilise : `apps/web/src/ui/item-state.ts:39` (`ACTION_STATE`) ; `ToolbarView` `:5` — `ToolbarView.annotation?: { active: boolean; pointer: "draw" | "mouse"; screens: number }`.
- Réutilise : `apps/web/src/ui/ProfileEditor.tsx:60` — `START_LABELS` inchangé (« Annotation du bureau » existe déjà).

**Test et commande bornée.**
```bash
node ~/.claude/scripts/chaine/jeton.cjs --nom tests --proprietaire usage-c11a-annotation/T2 --places-par-sujet 3 --commande "cd $WT/apps/web && nice -n 10 pnpm exec vitest run src/runtime-capabilities.test.ts src/toolbar.test.ts src/toolbar-profiles.test.ts src/ui/item-state.test.ts src/ui/Toolbar.test.tsx > /tmp/c11a-T2-vitest.log 2>&1"; tail -20 /tmp/c11a-T2-vitest.log
```
Preuve attendue : `Test Files  5 passed (5)`, `Tests  N passed`, N ≥ 1 ; `grep -c "itemsForMode (C11a, P7, P19)" $WT/apps/web/src/toolbar.test.ts` ≥ 1.
`Toolbar.test.tsx` (zones `requires: ["dropPaths"]`, `:55, 116, 150`) et `toolbar.test.ts:135, 304` restent verts.
Puis `cd $WT/apps/web && nice -n 10 pnpm exec tsc --noEmit > /tmp/c11a-T2-tsc.log 2>&1; echo "tsc=$?"; tail -5 /tmp/c11a-T2-tsc.log` (attendu `tsc=0`), et la suite rapide :
`node ~/.claude/scripts/chaine/jeton.cjs --nom tests --proprietaire usage-c11a-annotation/T2 --places-par-sujet 3 --commande "cd $WT && nice -n 10 pnpm -r test > /tmp/c11a-T2-all.log 2>&1"; tail -20 /tmp/c11a-T2-all.log` (aucun `FAIL `).

**Preuve visuelle.** Aucune ici (S1 est mesuré par l'essai de T9).

**Contraintes (recopiées de Global Constraints).**
- GC3 — Builds et tests en `nice -n 10` ; `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`. Attention au `CARGO_TARGET_DIR` partagé entre worktrees : ne le pose pas, chaque worktree garde son `target/`.
- GC4 — Suites sous le jeton : `node ~/.claude/scripts/chaine/jeton.cjs --nom tests --proprietaire usage-c11a-annotation/T<n> --places-par-sujet 3 --commande "<commande bornée, sortie redirigée vers un fichier>"`.
- GC5 — Tests rapides du profil : `cargo test --workspace 2>&1 | tail -20` · `pnpm -r test 2>&1 | tail -20` ; complet : `scripts/verifier.sh --e2e`.
- GC6 — Compatibilité : un fichier `.roomboard` et un profil d'avant C11a s'ouvrent toujours (test).
- GC8 — La scène ne passe pas sous 640 px (mesurée par l'essai Playwright). (Ici : sur le web les éléments ajoutés sont masqués, la barre ne change pas.)
- GC9 — Aucun test désactivé ou sauté, aucun seuil changé. Pas de `git add -A`/`.`, pas de `commit -a`, pas de `--force`. Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>` (via `git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit`), messages en anglais terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- GC10 — Aucune dépendance en AGPL/GPL/LGPL ; aucun paquet système installé ; aucun workflow GitHub.

**Interdits.** Ne pas toucher `PROFILE_SCHEMA`, `PROFILE_MINOR` (reste 1), `parseProfile`, `ensureProfilesAccess`,
`resolveStartMode`, `visibleItems` ; ne pas réécrire un profil utilisateur à la lecture (HC11-17) ; ne pas toucher
`Toolbar.tsx` (c'est T8).

**Critère « terminé ».** Les tests nommés ci-dessous passent, tsc rend 0, `pnpm -r test` sans `FAIL ` ; un commit.
Rapport : `Réutilisation : appelé apps/web/src/toolbar.ts:visibleItems, runtime-capabilities.ts:runtimeCapabilities (étendue), item-state.ts:ACTION_STATE (étendue)` ou `Réutilisation : écart — <pourquoi>`.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree.**
```bash
export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH
SRC=/home/adminjd/projets/roomboard-wt/usage-c11a-annotation
cd "$WT" && { [ -d node_modules ] || nice -n 10 pnpm install --frozen-lockfile; }
for d in apps/web/src/wasm apps/web/src/wasm-formats apps/web/dist; do [ -e "$WT/$d" ] || cp -r "$SRC/$d" "$WT/$d"; done
```

- [ ] **Étape 2 : tests rouges.** Ajouter à `apps/web/src/runtime-capabilities.test.ts` (imports : `visibleItems` de `./toolbar`, `builtinProfile` de `./toolbar-profiles`) :
```ts
describe("annotation de bureau à l'exécution (C11a, P16, P29)", () => {
  it("coque : statique ∧ détecté ; champ absent : statique gardé", () => {
    expect(runtimeCapabilities({ desktopAnnotation: true }, { tauri: true, annotationSupported: true }).desktopAnnotation).toBe(true);
    expect(runtimeCapabilities({ desktopAnnotation: true }, { tauri: true, annotationSupported: false }).desktopAnnotation).toBe(false);
    expect(runtimeCapabilities({ desktopAnnotation: true }, { tauri: true }).desktopAnnotation).toBe(true);
    expect(runtimeCapabilities({ desktopAnnotation: false }, { tauri: true, annotationSupported: true }).desktopAnnotation).toBe(false);
  });
  it("Wayland natif (support faux) : entrée masquée par visibleItems", () => {
    const caps = runtimeCapabilities({ desktopAnnotation: true }, { tauri: true, annotationSupported: false });
    const bar = builtinProfile("defaut")!.toolbars[0]!;
    expect(visibleItems(bar, caps).some((it) => it.action === "desktop-annotation")).toBe(false);
  });
  it("X11 et XWayland (support vrai) : entrée visible", () => {
    const caps = runtimeCapabilities({ desktopAnnotation: true }, { tauri: true, annotationSupported: true });
    expect(visibleItems(builtinProfile("defaut")!.toolbars[0]!, caps).some((it) => it.action === "desktop-annotation")).toBe(true);
  });
  it("forceAnnotation (?annotation=faux) : vrai hors coque seulement", () => {
    expect(runtimeCapabilities({}, { tauri: false, forceAnnotation: true }).desktopAnnotation).toBe(true);
    expect(runtimeCapabilities({}, { tauri: false }).desktopAnnotation).toBe(false);
    expect(runtimeCapabilities({ desktopAnnotation: true }, { tauri: true, annotationSupported: false, forceAnnotation: true }).desktopAnnotation).toBe(false);
  });
});
```
Ajouter à `apps/web/src/toolbar.test.ts` (imports : `itemsForMode`, `isAnnotationZone`, `parseProfile` de `./toolbar`, `builtinProfile`, `DEFAULT_PROFILE_JSON` de `./toolbar-profiles`) :
```ts
describe("itemsForMode (C11a, P7, P19)", () => {
  const caps = { desktopAnnotation: true, multiWindow: false, dropPaths: true, officeConverter: false };
  const NEW = ["desktop-annotation", "annotation-pointer", "annotation-screen", "depot-annotation"];
  /** Copie de `defaut` faite avant C11a : aucun élément C11a. */
  const oldDefault = () => {
    const json = structuredClone(DEFAULT_PROFILE_JSON) as { toolbars: { groups: { items: { id: string }[] }[] }[] };
    for (const b of json.toolbars) for (const g of b.groups) g.items = g.items.filter((i) => !NEW.includes(i.id));
    const r = parseProfile({ ...json, id: "ma-copie", label: "Ma copie" });
    if ("errors" in r) throw new Error(r.errors.join("; "));
    return r;
  };
  it("tableau : zone d'annotation masquée, entrée visible", () => {
    const items = itemsForMode(builtinProfile("defaut")!.toolbars[0]!, caps, "board");
    expect(items.some((it) => it.id === "depot-annotation")).toBe(false);
    expect(items.some((it) => it.action === "desktop-annotation")).toBe(true);
  });
  it("annotation : zone visible ; sortie et bascule déjà là, pas de doublon", () => {
    const items = itemsForMode(builtinProfile("defaut")!.toolbars[0]!, caps, "desktop-annotation");
    expect(items.some((it) => it.id === "depot-annotation")).toBe(true);
    expect(items.filter((it) => it.action === "desktop-annotation")).toHaveLength(1);
    expect(items.filter((it) => it.action === "annotation-pointer")).toHaveLength(1);
  });
  it("profil d'avant C11a : il s'ouvre sans avertissement ; en annotation, sortie et bascule ajoutées au rendu, profil inchangé", () => {
    const old = oldDefault();
    expect(old.warnings).toEqual([]);
    const bar = old.profile.toolbars[0]!;
    const before = JSON.stringify(bar);
    const items = itemsForMode(bar, caps, "desktop-annotation");
    expect(items.filter((it) => it.action === "desktop-annotation").map((it) => it.label)).toEqual(["Annotation du bureau"]);
    expect(items.some((it) => it.action === "annotation-pointer")).toBe(true);
    expect(itemsForMode(bar, caps, "board").some((it) => it.action === "desktop-annotation")).toBe(false);
    expect(JSON.stringify(bar)).toBe(before);
  });
  it("entrée masquée par l'utilisateur : rendue en annotation (jamais enfermé)", () => {
    const bar = builtinProfile("defaut")!.toolbars[0]!;
    const hidden = { ...bar, groups: bar.groups.map((g) => ({ ...g, items: g.items.map((it) => (it.action === "desktop-annotation" ? { ...it, hidden: true } : it)) })) };
    expect(itemsForMode(hidden, caps, "desktop-annotation").some((it) => it.action === "desktop-annotation")).toBe(true);
  });
  it("une dropzone sans desktopAnnotation garde son comportement", () => {
    const zone = { id: "drop", kind: "dropzone" as const, label: "Déposer", requires: ["dropPaths" as const], rest: {} };
    expect(isAnnotationZone(zone)).toBe(false);
    const bar = { id: "b", role: "tools", dock: "top" as const, collapsed: false, groups: [{ id: "g", items: [zone], rest: {} }], rest: {} };
    expect(itemsForMode(bar, caps, "board").map((it) => it.id)).toEqual(["drop"]);
  });
});
```
Ajouter à `apps/web/src/toolbar-profiles.test.ts` :
```ts
describe("C11a : éléments livrés (P6, P19)", () => {
  const NEW = ["desktop-annotation", "annotation-pointer", "annotation-screen", "depot-annotation"];
  const items = (id: string) => builtinProfile(id)!.toolbars.flatMap((b) => b.groups.flatMap((g) => g.items));
  it("defaut et annotation : entrée, bascule, écran suivant et zone ; simple : sans zone", () => {
    for (const id of ["defaut", "annotation"]) expect(ids(id)).toEqual(expect.arrayContaining(NEW));
    expect(ids("simple")).toEqual(expect.arrayContaining(["desktop-annotation", "annotation-pointer", "annotation-screen"]));
    expect(ids("simple")).not.toContain("depot-annotation");
  });
  it("chaque élément C11a exige desktopAnnotation ; la zone est une dropzone « Déposer ici »", () => {
    for (const id of ["defaut", "simple", "annotation"]) {
      for (const it of items(id).filter((i) => NEW.includes(i.id))) expect(it.requires).toContain("desktopAnnotation");
    }
    const zone = items("defaut").find((i) => i.id === "depot-annotation")!;
    expect(zone).toMatchObject({ kind: "dropzone", label: "Déposer ici" });
  });
  it("web (capacité fausse) : la barre de defaut ne change pas", () => {
    const web = { desktopAnnotation: false, multiWindow: false, dropPaths: false, officeConverter: false };
    expect(visibleItems(builtinProfile("defaut")!.toolbars[0]!, web).some((it) => NEW.includes(it.id))).toBe(false);
  });
});
```
Ajouter à `apps/web/src/ui/item-state.test.ts` (imports : `ACTION_TABLE`, `type ToolItem` de `../toolbar`) :
```ts
describe("annotation (C11a, P6, P8, P15, P20)", () => {
  const base: ToolbarView = { tool: "pen", eraserMode: "partial", canUndo: true, canRedo: true, pageIndex: 0, pageCount: 1 };
  const act = (action: string): ToolItem => ({ id: action, kind: "action", action, label: ACTION_TABLE[action]?.label ?? action, requires: [], rest: {} });
  const on = (pointer: "draw" | "mouse" = "draw", screens = 2): ToolbarView => ({ ...base, annotation: { active: true, pointer, screens } });
  it("desktop-annotation : « Annotation du bureau » au tableau, « Quitter l'annotation » enfoncé en annotation", () => {
    expect(itemState(act("desktop-annotation"), base)).toMatchObject({ pressed: false, label: "Annotation du bureau", disabled: false });
    expect(itemState(act("desktop-annotation"), on())).toMatchObject({ pressed: true, label: "Quitter l'annotation", disabled: false });
  });
  it("annotation-pointer : « Souris » en dessin, « Dessin » enfoncé en souris ; grisé hors annotation", () => {
    expect(itemState(act("annotation-pointer"), on("draw"))).toMatchObject({ pressed: false, label: "Souris", disabled: false });
    expect(itemState(act("annotation-pointer"), on("mouse"))).toMatchObject({ pressed: true, label: "Dessin" });
    expect(itemState(act("annotation-pointer"), base).disabled).toBe(true);
  });
  it("annotation-screen : grisé à un écran ou hors annotation", () => {
    expect(itemState(act("annotation-screen"), on("draw", 2)).disabled).toBe(false);
    expect(itemState(act("annotation-screen"), on("draw", 1)).disabled).toBe(true);
    expect(itemState(act("annotation-screen"), base).disabled).toBe(true);
  });
  it("en annotation : action non transmise grisée (file-save), transmise active (undo)", () => {
    expect(itemState(act("file-save"), on()).disabled).toBe(true);
    expect(itemState(act("undo"), on()).disabled).toBe(false);
  });
  it("sans champ annotation : rien ne change (file-save actif)", () => {
    expect(itemState(act("file-save"), base).disabled).toBe(false);
  });
});
```

- [ ] **Étape 3 : vérifier l'échec** (commande bornée). Attendu : échecs sur `itemsForMode is not a function`, `desktop-annotation` absent, libellés.

- [ ] **Étape 4 : `runtime-capabilities.ts`.** Remplacer la fonction :
```ts
/**
 * Capacités du poste (U10, DAU8) ; C11a (P16, P29) : `annotationSupported` (commande `annotation_support`) abaisse
 * `desktopAnnotation` (statique ∧ détecté ; absent : statique gardé) ; `forceAnnotation` (`?annotation=faux`) la rend
 * vraie hors coque seulement, jamais sans ce paramètre.
 */
export function runtimeCapabilities(
  staticCaps: unknown,
  env: { readonly tauri: boolean; readonly officeConverter?: boolean; readonly annotationSupported?: boolean; readonly forceAnnotation?: boolean },
): RuntimeCapabilities {
  const s = typeof staticCaps === "object" && staticCaps !== null ? (staticCaps as Record<string, unknown>) : {};
  const flag = (k: string): boolean => env.tauri && s[k] === true;
  const caps = {
    desktopAnnotation: (!env.tauri && env.forceAnnotation === true) || (flag("desktopAnnotation") && env.annotationSupported !== false),
    multiWindow: flag("multiWindow"),
    dropPaths: env.tauri,
    officeConverter: env.tauri && env.officeConverter === true,
  };
  return Object.fromEntries(CAPABILITY_KEYS.map((k) => [k, caps[k]])) as RuntimeCapabilities;
}
```

- [ ] **Étape 5 : `toolbar.ts`.** Dans `ACTION_TABLE`, après `library` :
```ts
  "desktop-annotation": { label: "Annotation du bureau" },
  "annotation-pointer": { label: "Souris" },
  "annotation-screen": { label: "Écran suivant" },
```
Juste après `visibleItems` :
```ts
/** C11a (P6, P8, P15) : entrée et sortie, bascule dessin / souris, écran suivant. */
export const ANNOTATION_EXIT_ACTION: ActionId = "desktop-annotation";
export const ANNOTATION_POINTER_ACTION: ActionId = "annotation-pointer";
export const ANNOTATION_SCREEN_ACTION: ActionId = "annotation-screen";
/** C11a (P20) : actions rejouées dans `annotate` (outils, préréglages, pot et format y vont par leurs méthodes de l'hôte). */
export const ANNOTATION_REMOTE_ACTIONS: ReadonlySet<ActionId> = new Set(["undo", "redo", "eraser-mode"]);
/** C11a (P20) : actions de la fenêtre principale en annotation ; toute autre action y est grisée. */
export const ANNOTATION_MAIN_ACTIONS: ReadonlySet<ActionId> = new Set([ANNOTATION_EXIT_ACTION, ANNOTATION_POINTER_ACTION, ANNOTATION_SCREEN_ACTION]);

/** Zone de dépôt d'annotation (P19) : `dropzone` qui exige `desktopAnnotation` ; toute autre zone garde son comportement. */
export function isAnnotationZone(it: ToolItem): boolean {
  return it.kind === "dropzone" && it.requires.includes("desktopAnnotation");
}

/**
 * Éléments selon le mode (C11a, P7, P19) : tableau = `visibleItems` sans zone d'annotation ; annotation = `visibleItems`,
 * plus « Annotation du bureau » (sortie) et « Souris » en fin s'ils manquent (masqués ou absents d'un profil d'avant
 * C11a). Ajout au rendu, comme `ensureProfilesAccess` : le profil n'est pas réécrit.
 */
export function itemsForMode(bar: Toolbar, caps: RuntimeCapabilities, mode: StartMode): ToolItem[] {
  const shown = visibleItems(bar, caps);
  if (mode === "board") return shown.filter((it) => !isAnnotationZone(it));
  const out = [...shown];
  for (const action of [ANNOTATION_EXIT_ACTION, ANNOTATION_POINTER_ACTION]) {
    if (out.some((it) => it.kind === "action" && it.action === action)) continue;
    out.push({ id: `${action}-ajout`, kind: "action", action, label: ACTION_TABLE[action]!.label, requires: [], rest: {} });
  }
  return out;
}
```

- [ ] **Étape 6 : `toolbar-profiles.ts`.** Ajouter près de `tool`, `action`, `sep` :
```ts
/** C11a (P6, P19) : éléments qui exigent la capacité (masqués sur le web, l'iPad et Android). */
const needs = <T extends object>(item: T) => ({ ...item, requires: ["desktopAnnotation"] });
const annotationItems = () => [
  needs(action("desktop-annotation", "Annotation du bureau")),
  needs(action("annotation-pointer", "Souris")),
  needs(action("annotation-screen", "Écran suivant")),
];
const annotationZone = () => needs({ id: "depot-annotation", kind: "dropzone", label: "Déposer ici" });
```
Dans `defaultToolbars`, groupe `vue` : ajouter `...annotationItems(), annotationZone()` après `action("settings", "Réglages")`.
Dans `SIMPLE_PROFILE_JSON`, groupe `vue` : ajouter `...annotationItems()` après `action("settings", "Réglages")`.
(`annotation` partage `defaultToolbars` : le test « annotation : barres et préréglages de defaut » reste vert.)

- [ ] **Étape 7 : `ui/item-state.ts`.** Ajouter l'interface et le champ :
```ts
/** C11a : état de l'annotation vu par la barre de la fenêtre principale. */
export interface AnnotationView {
  readonly active: boolean;
  readonly pointer: "draw" | "mouse";
  readonly screens: number;
}
```
dans `ToolbarView` : `/** C11a (P6, P8, P15) : absent (tests, coque sans annotation) : tableau. */ readonly annotation?: AnnotationView;`.
Dans `ACTION_STATE` :
```ts
  "desktop-annotation": (v) => {
    const on = v.annotation?.active === true;
    return { pressed: on, label: on ? "Quitter l'annotation" : "Annotation du bureau" };
  },
  "annotation-pointer": (v) => {
    const mouse = v.annotation?.pointer === "mouse";
    return { pressed: mouse, label: mouse ? "Dessin" : "Souris", disabled: v.annotation?.active !== true };
  },
  "annotation-screen": (v) => ({ disabled: v.annotation?.active !== true || v.annotation.screens <= 1 }),
```
Remplacer `itemState` :
```ts
/** C11a (P20) : en annotation, une action ni transmise à `annotate` ni propre à la fenêtre principale est grisée. */
const offInAnnotation = (item: ToolItem, v: ToolbarView): boolean =>
  v.annotation?.active === true &&
  item.kind === "action" &&
  !ANNOTATION_REMOTE_ACTIONS.has(item.action ?? "") &&
  !ANNOTATION_MAIN_ACTIONS.has(item.action ?? "");

export function itemState(item: ToolItem, v: ToolbarView): ItemState {
  const st: ItemState = { pressed: null, disabled: false, label: item.label, ...BY_KIND[item.kind](item, v) };
  return offInAnnotation(item, v) ? { ...st, disabled: true } : st;
}
```
(import : `ANNOTATION_MAIN_ACTIONS`, `ANNOTATION_REMOTE_ACTIONS` depuis `../toolbar`.)

- [ ] **Étape 8 : vérifier le vert**, tsc et `pnpm -r test` (commandes de la section « Test et commande bornée »).
Si un test existant compte les éléments de `defaut` ou de `simple` (liste exacte d'ids), le mettre à jour avec les
nouveaux ids : c'est l'effet de bord prévu par le cadrage (« Les barres livrées … gagnent des éléments »), jamais une
désactivation.

- [ ] **Étape 9 : commit.**
```bash
cd $WT && git add apps/web/src/runtime-capabilities.ts apps/web/src/runtime-capabilities.test.ts apps/web/src/toolbar.ts apps/web/src/toolbar.test.ts apps/web/src/toolbar-profiles.ts apps/web/src/toolbar-profiles.test.ts apps/web/src/ui/item-state.ts apps/web/src/ui/item-state.test.ts
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "feat(toolbar): desktop-annotation actions, items by mode, runtime capability" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche T3 — Ports : contrat `annotation-port`, onglet `annotation` et `replace`, contrôleur `dirty`/`target()`, `guardClose` détourné, `emitTo`
<a id="tache-t3"></a>

**Objectif.** Poser les contrats que les tâches de la vague 2 consomment en parallèle : le contrat entre fenêtres
(`platform/annotation-port.ts`, DA2), l'onglet `kind: "annotation"` et `Tabs.replace` (P3, P4), `FileControllerDeps.dirty`
et `FileController.target()` (P4), le troisième paramètre `divert` de `ShellPort.guardClose` (P25) et `TauriIpc.emitTo` (P21).

**Fichiers.**
- Créer : `apps/web/src/platform/annotation-port.ts`, `apps/web/src/platform/annotation-port.test.ts`
- Modifier : `apps/web/src/app/tabs.ts:6-9, 21, 41-42`, `apps/web/src/platform/controller.ts:34-95` (deps, interface, `createFileController`), `apps/web/src/platform/files.ts:123` (`ShellPort.guardClose`), `apps/web/src/platform/shell-web.ts:26`, `apps/web/src/platform/host-tauri.ts:62-66` (`TauriIpc`), `:247` (`guardClose`), `:320-323` (`ipc` de `loadTauriPorts`)
- Test : `apps/web/src/app/tabs.test.ts` (cas `ANNOTATION_NOT_YET` réécrit), `apps/web/src/platform/controller.test.ts`, `apps/web/src/platform/shell-web.test.ts`, `apps/web/src/platform/host-tauri.test.ts`

**Interfaces.**
- Consomme : `Dock`, `Profile` (`toolbar.ts`), `ToolbarView` (`ui/item-state.ts`, existant), `FormatAction` (`engine/rich-edit.ts`), `DroppedFile`, `Point` (`platform/files.ts`).
- Produit (`platform/annotation-port.ts`, code complet à l'étape 4) : `ANNOTATE_LABEL`, `MAIN_LABEL`, `ANNOTATION_EVENTS`, `EXIT_TIMEOUT_MS = 5000`, `READY_TIMEOUT_MS = 10000`, `CURSOR_POLL_MS = 30`, `INK_LOST_MESSAGE`, `addedToPageMessage(n)`, `PointerMode`, `AnnotationCommand`, `DocumentPayload`, `CollectPayload`, `ReturnedPayload`, `AnnotationSupport`, `AnnotationPlace`, `Returned`, `AnnotationWindows`, `AnnotationState`, `AnnotationControl`.
- Produit (`app/tabs.ts`) : `ONE_ANNOTATION_TAB` ; `Tabs.add("annotation", …)` accepté, un seul ; `Tabs.replace(id: string, session: S): TabEntry<S> | null` (même id, même sorte, même place, actif inchangé, `onChange` émis). `ANNOTATION_NOT_YET` est retiré.
- Produit (`platform/controller.ts`) : `FileControllerDeps.dirty?: boolean` ; `FileController.target(): SaveTarget | null`.
- Produit (`platform/files.ts`) : `ShellPort.guardClose(isDirty: () => boolean, message: string, divert?: () => boolean): () => void`.
- Produit (`platform/host-tauri.ts`) : `TauriIpc.emitTo?<T>(target: string, event: string, payload: T): Promise<void>` (facultatif : les faux `TauriIpc` des tests existants restent valides).
- Réutilise : `apps/web/src/app/tabs.ts:40` (`add(kind, session)`) — `tabs.add("annotation", tab)` (étendu : garde retirée).
- Réutilise : `apps/web/src/app/tabs.ts:40` ; `platform/controller.ts:87` — `Tabs.replace(id: string, session: S): TabEntry<S> | null` ; `FileControllerDeps.dirty?: boolean` ; `FileController.target(): SaveTarget | null` (étendus).
- Réutilise : `apps/web/src/platform/files.ts:123` (`ShellPort.guardClose`) — `guardClose(isDirty, message, divert?: () => boolean): () => void` (étendu ; le branchement dans `workspace.ts:761, 822` est T7).
- Réutilise : `apps/web/src/platform/host-tauri.ts:62` (`TauriIpc`) — `emitTo<T>(target: string, event: string, payload: T): Promise<void>` (étendu).

**Test et commande bornée.**
```bash
node ~/.claude/scripts/chaine/jeton.cjs --nom tests --proprietaire usage-c11a-annotation/T3 --places-par-sujet 3 --commande "cd $WT/apps/web && nice -n 10 pnpm exec vitest run src/platform/annotation-port.test.ts src/app/tabs.test.ts src/platform/controller.test.ts src/platform/shell-web.test.ts src/platform/host-tauri.test.ts src/platform/host-tauri-ports.test.ts > /tmp/c11a-T3-vitest.log 2>&1"; tail -20 /tmp/c11a-T3-vitest.log
```
Preuve attendue : `Test Files  6 passed (6)`, `Tests  N passed`, N ≥ 1 ; `grep -c "replace : même place, même id, même actif" $WT/apps/web/src/app/tabs.test.ts` = 1.
Puis tsc (`cd $WT/apps/web && nice -n 10 pnpm exec tsc --noEmit > /tmp/c11a-T3-tsc.log 2>&1; echo "tsc=$?"`, attendu `tsc=0`) et
`node ~/.claude/scripts/chaine/jeton.cjs --nom tests --proprietaire usage-c11a-annotation/T3 --places-par-sujet 3 --commande "cd $WT && nice -n 10 pnpm -r test > /tmp/c11a-T3-all.log 2>&1"; tail -20 /tmp/c11a-T3-all.log` (aucun `FAIL `).

**Preuve visuelle.** Aucune.

**Contraintes (recopiées de Global Constraints).**
- GC1 — Le chemin de l'encre ne traverse jamais la frontière page ↔ Rust natif ; entre fenêtres ne passent que des commandes de barre, l'état des boutons et le document entier en base64.
- GC3 — Builds et tests en `nice -n 10` ; `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`. Attention au `CARGO_TARGET_DIR` partagé entre worktrees : ne le pose pas, chaque worktree garde son `target/`.
- GC4 — Suites sous le jeton : `node ~/.claude/scripts/chaine/jeton.cjs --nom tests --proprietaire usage-c11a-annotation/T<n> --places-par-sujet 3 --commande "<commande bornée, sortie redirigée vers un fichier>"`.
- GC5 — Tests rapides du profil : `cargo test --workspace 2>&1 | tail -20` · `pnpm -r test 2>&1 | tail -20` ; complet : `scripts/verifier.sh --e2e`.
- GC9 — Aucun test désactivé ou sauté, aucun seuil changé. Pas de `git add -A`/`.`, pas de `commit -a`, pas de `--force`. Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>` (via `git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit`), messages en anglais terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- GC10 — Aucune dépendance en AGPL/GPL/LGPL ; aucun paquet système installé ; aucun workflow GitHub.

**Interdits.** Aucun `Uint8Array` dans un type de charge d'événement (`*Payload`) ; ne pas toucher `workspace.ts`
(c'est T7) ; `MAX_TABS` et `TOO_MANY_TABS` inchangés ; le test `ANNOTATION_NOT_YET` est **réécrit** (« annotation
acceptée »), pas supprimé sans remplaçant.

**Critère « terminé ».** Tests nommés verts, tsc 0, `pnpm -r test` sans `FAIL ` ; un commit. Rapport :
`Réutilisation : appelé app/tabs.ts:add (étendu), platform/controller.ts:createFileController (étendu), platform/files.ts:ShellPort.guardClose (étendu), platform/host-tauri.ts:TauriIpc (étendu)` ou `Réutilisation : écart — <pourquoi>`.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree** (même bloc que T2, étape 1).

- [ ] **Étape 2 : tests rouges.**
`apps/web/src/app/tabs.test.ts` : remplacer le cas `it("annotation : lève ANNOTATION_NOT_YET", …)` et son import par :
```ts
  it("annotation : acceptée, une seule à la fois (C11a, P3)", () => {
    let n = 0;
    const tabs = createTabs<string>(() => `t${++n}`);
    tabs.add("board", "A");
    const a = tabs.add("annotation", "X", false);
    expect(a.kind).toBe("annotation");
    expect(tabs.active()?.session).toBe("A");
    expect(() => tabs.add("annotation", "Y")).toThrow(ONE_ANNOTATION_TAB);
  });
  it("replace : même place, même id, même actif (C11a, P4)", () => {
    let n = 0;
    const tabs = createTabs<string>(() => `t${++n}`);
    tabs.add("board", "A");
    const x = tabs.add("annotation", "X", false);
    tabs.add("board", "B");
    const seen: number[] = [];
    tabs.onChange(() => seen.push(1));
    const r = tabs.replace(x.id, "X2");
    expect(r).toEqual({ id: x.id, kind: "annotation", session: "X2" });
    expect(tabs.list().map((t) => t.session)).toEqual(["A", "X2", "B"]);
    expect(tabs.active()?.session).toBe("B");
    expect(seen).toHaveLength(1);
    expect(tabs.replace("absent", "Z")).toBeNull();
  });
```
(import : `ONE_ANNOTATION_TAB` à la place de `ANNOTATION_NOT_YET`.)
`apps/web/src/platform/controller.test.ts` : ajouter `readonly dirty?: boolean` à `SetupOptions`, passer
`...(o.dirty ? { dirty: true } : {})` dans `setup`, puis :
```ts
describe("C11a : onglet remplacé (P4)", () => {
  it("dirty : modifié d'emblée, puis propre après Enregistrer", async () => {
    const { ctl } = setup({ dirty: true, opened: { name: "x.roomboard", target: { kind: "download", name: "x.roomboard" } } });
    expect(ctl.isDirty()).toBe(true);
    expect(await ctl.run("save")).toBe(true);
    expect(ctl.isDirty()).toBe(false);
  });
  it("target() : cible d'ouverture, puis celle de l'enregistrement", async () => {
    const t: SaveTarget = { kind: "download", name: "x.roomboard" };
    const { ctl } = setup({ opened: { name: "x.roomboard", target: t } });
    expect(ctl.target()).toEqual(t);
    const fresh = setup();
    expect(fresh.ctl.target()).toBeNull();
    await fresh.ctl.run("saveAs");
    expect(fresh.ctl.target()).not.toBeNull();
  });
  it("sans dirty : état initial « non modifié » (rien ne change)", () => {
    expect(setup().ctl.isDirty()).toBe(false);
  });
});
```
`apps/web/src/platform/shell-web.test.ts` :
```ts
  it("C11a : divert vrai → beforeunload retenu même sans modification (P25)", () => {
    const f = fakeWindow();
    let annotating = true;
    createWebShell(f.w).guardClose(() => false, "message", () => annotating);
    expect(f.unload().prevented).toBe(true);
    annotating = false;
    expect(f.unload().prevented).toBe(false);
  });
```
`apps/web/src/platform/host-tauri.test.ts` (fabrique `fakes()` existante) :
```ts
  it("C11a : divert vrai → fermeture empêchée sans question (P25)", async () => {
    const f = fakes({ answer: true });
    let calls = 0;
    createTauriShell(f.dialog, f.win).guardClose(() => true, "Abandonner ?", () => { calls += 1; return true; });
    await f.tick();
    expect(await f.close()).toBe(true);
    expect(f.calls.ask).toEqual([]);
    expect(calls).toBe(1);
  });
  it("C11a : divert faux → garde ordinaire", async () => {
    const f = fakes({ answer: false });
    createTauriShell(f.dialog, f.win).guardClose(() => true, "Abandonner ?", () => false);
    await f.tick();
    expect(await f.close()).toBe(true);
    expect(f.calls.ask).toEqual([["Abandonner ?", "warning"]]);
  });
```
`apps/web/src/platform/annotation-port.test.ts` :
```ts
import { describe, expect, it } from "vitest";
import { addedToPageMessage, ANNOTATION_EVENTS, CURSOR_POLL_MS, EXIT_TIMEOUT_MS } from "./annotation-port";

describe("contrat entre fenêtres (C11a, DA2)", () => {
  it("événements distincts, préfixés roomboard://annotation-", () => {
    const names = Object.values(ANNOTATION_EVENTS);
    expect(new Set(names).size).toBe(names.length);
    for (const n of names) expect(n.startsWith("roomboard://annotation-")).toBe(true);
  });
  it("valeurs du cadrage : 5 s, 30 ms, « ajouté à la page N »", () => {
    expect(EXIT_TIMEOUT_MS).toBe(5000);
    expect(CURSOR_POLL_MS).toBe(30);
    expect(addedToPageMessage(1)).toBe("ajouté à la page 1");
  });
});
```

- [ ] **Étape 3 : vérifier l'échec** (commande bornée). Attendu : `ONE_ANNOTATION_TAB` absent, `target is not a function`, module `annotation-port` introuvable.

- [ ] **Étape 4 : écrire `platform/annotation-port.ts`.**
```ts
/**
 * Contrat entre la fenêtre principale et `annotate` (C11a, DA2, P4, P21). Liste fermée d'événements `emitTo`, charges
 * JSON : les octets voyagent en base64, jamais en `Uint8Array` (un événement Tauri est sérialisé en JSON, un
 * `Uint8Array` y devient `{"0": …}`). Aucun point d'encre n'y passe : seulement des commandes de barre, la vue de barre
 * et le document entier, une fois à l'entrée et une fois à la sortie. Deux noms distincts pour l'aller et le retour du
 * document : `listen` de Tauri 2 écoute toutes les cibles, une fenêtre entendrait sinon son propre envoi.
 */
import type { FormatAction } from "../engine/rich-edit";
import type { Dock, Profile } from "../toolbar";
import type { ToolbarView } from "../ui/item-state";
import type { DroppedFile, Point } from "./files";

export const ANNOTATE_LABEL = "annotate";
export const MAIN_LABEL = "main";
export const ANNOTATION_EVENTS = Object.freeze({
  /** principale → annotate : appel `ToolbarHost` (`AnnotationCommand`). */
  command: "roomboard://annotation-command",
  /** principale → annotate : profil actif (`Profile`), à l'entrée et à chaque changement. */
  profile: "roomboard://annotation-profile",
  /** principale → annotate : document de l'onglet d'annotation (`DocumentPayload`). */
  document: "roomboard://annotation-document",
  /** principale → annotate : demande du document (`CollectPayload`). */
  collect: "roomboard://annotation-collect",
  /** annotate → principale : écoute posée (charge vide). */
  ready: "roomboard://annotation-ready",
  /** annotate → principale : vue de barre (`ToolbarView`). */
  view: "roomboard://annotation-view",
  /** annotate → principale : document rendu (`ReturnedPayload`). */
  returned: "roomboard://annotation-returned",
  /** annotate (Échap) ou coque (`CloseRequested` de `annotate`) → principale : quitter l'annotation. */
  exitRequest: "roomboard://annotation-exit-request",
});

/** P4 : sans réponse de `annotate`, la sortie se fait quand même. */
export const EXIT_TIMEOUT_MS = 5000;
/** `annotate` créée : délai de son `ready`. */
export const READY_TIMEOUT_MS = 10000;
/** P9 : sondage du curseur en mode souris. */
export const CURSOR_POLL_MS = 30;
export const INK_LOST_MESSAGE = "encre de l'annotation non récupérée";
/** P17 : objet déposé sur la zone, inséré sur la page montrée de l'onglet d'origine. */
export const addedToPageMessage = (n: number): string => `ajouté à la page ${n}`;

export type PointerMode = "draw" | "mouse";

/** Appels `ToolbarHost` rejoués dans `annotate` (P20). */
export type AnnotationCommand =
  | { readonly kind: "setTool"; readonly tool: string; readonly preset?: string }
  | { readonly kind: "runAction"; readonly id: string }
  | { readonly kind: "fillColor"; readonly color: string | null }
  | { readonly kind: "fillTolerance"; readonly value: number }
  | { readonly kind: "textFormat"; readonly action: FormatAction };

export interface DocumentPayload {
  readonly base64: string;
}
export interface CollectPayload {
  readonly id: number;
}
/** `changed` : version du moteur différente de celle du chargement. */
export interface ReturnedPayload {
  readonly id: number;
  readonly base64: string;
  readonly changed: boolean;
}

export interface AnnotationSupport {
  readonly supported: boolean;
  readonly reason: "wayland" | null;
  readonly screens: number;
}
/** `screen` null : écran de la fenêtre principale (P15) ; `thickness` en px CSS (convertie par la coque). */
export interface AnnotationPlace {
  readonly screen: number | null;
  readonly dock: Dock;
  readonly thickness: number;
}
export interface Returned {
  readonly bytes: Uint8Array;
  readonly changed: boolean;
}

/** Hôte des fenêtres : coque (`annotation-tauri.ts`) ou faux (`annotation-fake.ts`). */
export interface AnnotationWindows {
  support(): Promise<AnnotationSupport>;
  /** Crée ou montre `annotate`, place les deux fenêtres, attend `ready`, envoie le profil puis le document ; rend l'écran retenu. */
  enter(o: AnnotationPlace & { readonly document: Uint8Array; readonly profile: Profile }): Promise<number>;
  /** Replace les deux fenêtres (écran suivant) sans renvoyer le document ; rend l'écran retenu. */
  place(o: AnnotationPlace): Promise<number>;
  /** Demande le document à `annotate` ; null si sa réponse est illisible. Peut ne jamais se résoudre (délai : contrôleur). */
  collect(): Promise<Returned | null>;
  /** Cache `annotate`, rend la géométrie de la principale. */
  leave(): Promise<void>;
  /** Détruit `annotate` (onglet d'annotation fermé). */
  close(): Promise<void>;
  pointer(mode: PointerMode): Promise<void>;
  sendProfile(p: Profile): void;
  send(m: AnnotationCommand): void;
  onView(cb: (v: ToolbarView) => void): () => void;
  onExitRequest(cb: () => void): () => void;
  relaunchCompat(): Promise<void>;
}

export interface AnnotationState {
  readonly active: boolean;
  readonly pointer: PointerMode;
  /** Écran retenu (null avant la première entrée). */
  readonly screen: number | null;
  readonly screens: number;
}

/** Contrôleur de la fenêtre principale (`app/annotation.ts`). */
export interface AnnotationControl {
  state(): AnnotationState;
  enter(): Promise<void>;
  exit(): Promise<void>;
  /** Onglet d'annotation fermé : sortie si active, puis `annotate` détruite. */
  close(): Promise<boolean>;
  /** Bascule dessin / souris (P8). */
  toggle(): Promise<void>;
  nextScreen(): Promise<void>;
  onTool(tool: string): void;
  /** Commande de barre envoyée à `annotate` (suit l'outil pour la bascule). */
  command(m: AnnotationCommand): void;
  sendProfile(p: Profile): void;
  dropOnZone(files: readonly DroppedFile[], at: Point | null): Promise<void>;
  onChange(cb: () => void): () => void;
}
```

- [ ] **Étape 5 : `app/tabs.ts`.** Retirer `ANNOTATION_NOT_YET` ; ajouter `export const ONE_ANNOTATION_TAB = "un seul onglet d'annotation à la fois";` ;
doc de `add` : « Lève ONE_ANNOTATION_TAB pour un second "annotation", et TOO_MANY_TABS au-delà de MAX_TABS. » ; dans l'interface :
```ts
  /** C11a (P4) : remplace la session de l'onglet `id` (même id, même sorte, même place, actif inchangé). */
  replace(id: string, session: S): TabEntry<S> | null;
```
Dans `add`, remplacer la ligne `if (kind === "annotation") throw …` par :
```ts
      if (kind === "annotation" && entries.some((t) => t.kind === "annotation")) throw new Error(ONE_ANNOTATION_TAB);
```
Ajouter la méthode :
```ts
    replace(id, session) {
      const i = entries.findIndex((t) => t.id === id);
      if (i < 0) return null;
      const entry: TabEntry<S> = { id, kind: entries[i]!.kind, session };
      entries[i] = entry;
      changed();
      return entry;
    },
```

- [ ] **Étape 6 : `platform/controller.ts`.** Dans `FileControllerDeps` :
```ts
  /** C11a (P4) : document remplacé au retour de l'annotation, « modifié » d'emblée ; absent : non modifié. */
  readonly dirty?: boolean;
```
dans `FileController` : `/** C11a (P4) : cible d'enregistrement actuelle, gardée au remplacement du document. */ target(): SaveTarget | null;`.
Dans `createFileController`, remplacer `let savedVersion = d.versions.state().version;` par
`let savedVersion = d.dirty === true ? -1 : d.versions.state().version; // versions ≥ 0 : -1 n'est jamais égal`,
et ajouter `target: () => target,` à l'objet rendu.

- [ ] **Étape 7 : `files.ts`, `shell-web.ts`, `host-tauri.ts`.**
`files.ts`, `ShellPort` :
```ts
  /**
   * Garde la fermeture tant que `isDirty()` ; rend la fonction qui retire la garde. C11a (P25) : `divert()` vrai (en
   * annotation) refuse la fermeture sans question ; l'appelant lance la sortie puis relance la fermeture.
   */
  guardClose(isDirty: () => boolean, message: string, divert?: () => boolean): () => void;
```
`shell-web.ts` : `guardClose(isDirty, _message, divert) {` et dans `onBeforeUnload` : `if (divert?.() !== true && !isDirty()) return;`.
`host-tauri.ts`, `createTauriShell(...).guardClose(isDirty, message, divert)` : première ligne du gestionnaire
`onCloseRequested` : `if (divert?.() === true) { e.preventDefault(); return; }`.
`TauriIpc` :
```ts
  /** C11a (P21) : événement vers une seule fenêtre ; charge JSON (octets en base64). Absent (faux des tests) : pas d'annotation. */
  emitTo?<T>(target: string, event: string, payload: T): Promise<void>;
```
`loadTauriPorts`, objet `ipc` : `emitTo: (target, event, payload) => ev.emitTo(target, event, payload),`.

- [ ] **Étape 8 : vérifier le vert**, tsc, `pnpm -r test` (section « Test et commande bornée »).

- [ ] **Étape 9 : commit.**
```bash
cd $WT && git add apps/web/src/platform/annotation-port.ts apps/web/src/platform/annotation-port.test.ts apps/web/src/app/tabs.ts apps/web/src/app/tabs.test.ts apps/web/src/platform/controller.ts apps/web/src/platform/controller.test.ts apps/web/src/platform/files.ts apps/web/src/platform/shell-web.ts apps/web/src/platform/shell-web.test.ts apps/web/src/platform/host-tauri.ts apps/web/src/platform/host-tauri.test.ts
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "feat(platform): annotation window contract, annotation tab, diverted close guard" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche T4 — Contrôleur d'annotation, hôte de barre distant, faux hôte au canal JSON
<a id="tache-t4"></a>

**Objectif.** Le cœur de C11a côté fenêtre principale : `createAnnotationController` (entrée, sortie avec délai de 5 s,
bascule dessin / souris, écran suivant, routage du dépôt, fermeture, demande de sortie), `createRemoteToolbarHost`
(P21), `offerCompatRelaunch` (P16), et le faux hôte `createFakeAnnotationWindows` dont le canal fait
`JSON.parse(JSON.stringify(m))` sur chaque message (P28, P29).

**Fichiers.**
- Créer : `apps/web/src/app/annotation.ts`, `apps/web/src/app/annotation.test.ts`, `apps/web/src/platform/annotation-fake.ts`, `apps/web/src/platform/annotation-fake.test.ts`

**Interfaces.**
- Consomme (T3, `platform/annotation-port.ts`) : `AnnotationWindows`, `AnnotationControl`, `AnnotationState`, `AnnotationCommand`, `AnnotationSupport`, `PointerMode`, `Returned`, `EXIT_TIMEOUT_MS`, `INK_LOST_MESSAGE`, `addedToPageMessage`.
- Consomme (T2, `toolbar.ts`) : `ANNOTATION_MAIN_ACTIONS`, `ANNOTATION_REMOTE_ACTIONS`, `TOOL_TABLE`, `type Dock`, `type Profile`, `type StartMode`.
- Produit (`app/annotation.ts`) :
  - `interface AnnotationDeps<T> { readonly windows: AnnotationWindows; annotationTab(): Promise<T | null>; encodeTab(tab: T): Promise<Uint8Array>; replaceAnnotation(bytes: Uint8Array): Promise<boolean>; activeTabId(): string | null; showTab(id: string): void; importFiles(files: readonly DroppedFile[], at: Point | null): Promise<ImportReport>; pageNumber(): number; say(message: string): Promise<void>; bar(): { readonly dock: Dock; readonly thickness: number }; profile(): Profile; readonly screens?: number; readonly timeoutMs?: number }`
  - `function createAnnotationController<T>(d: AnnotationDeps<T>): AnnotationControl`
  - `function createRemoteToolbarHost(send: (m: AnnotationCommand) => void, local: ToolbarHost, remoteActions: ReadonlySet<string>): ToolbarHost`
  - `const RELAUNCH_QUESTION = "Annotation du bureau indisponible sous Wayland. Relancer en mode compatibilité ?"`
  - `function offerCompatRelaunch(support: AnnotationSupport, startMode: StartMode, ask: (m: string) => Promise<boolean>, relaunch: () => Promise<void>): Promise<boolean>`
  - `const annotationFailedMessage = (why: string): string => \`Annotation impossible : ${why}\``
- Produit (`platform/annotation-fake.ts`) :
  - `function jsonChannel<T>(m: T): T`
  - `interface FakeAnnotationOptions { readonly screens?: number; readonly supported?: boolean; readonly reason?: "wayland" | null; readonly draw?: (bytes: Uint8Array) => Promise<Uint8Array>; readonly mute?: boolean; readonly dataset?: Record<string, string | undefined> }`
  - `interface FakeAnnotationWindows extends AnnotationWindows { readonly log: string[]; readonly sent: AnnotationCommand[]; received(): Uint8Array | null; profiles(): number; requestExit(): void; emitView(v: ToolbarView): void }`
  - `function createFakeAnnotationWindows(o?: FakeAnnotationOptions): FakeAnnotationWindows`
- Réutilise : aucun module existant (termes `emitTo`, `remote`, `ToolbarHost` distant) — nouveau `app/annotation.ts` : `createRemoteToolbarHost(send: (m: AnnotationCommand) => void, local: ToolbarHost, remoteActions: ReadonlySet<string>): ToolbarHost` (nouveau module : rien n'envoie de commandes entre fenêtres).
- Réutilise : aucun module existant (termes `annotation`, `setMode`, `pointer`, `ignore`) — `createAnnotationController(deps)` avec `AnnotationControl { state; enter; exit; close; toggle; nextScreen; onTool; dropOnZone; onChange }` (nouveau module, même fichier). La règle pure `passThrough(hit, holding)` est posée par T6 dans `app/annotation-page.ts`, où elle sert.
- Réutilise : aucun module existant (termes `WebviewWindow`, `set_ignore`, `annotate`) — `AnnotationWindows` (contrat de T3), implémentation fausse `platform/annotation-fake.ts` (tests, `?annotation=faux`) ; la coque est T5.
- Réutilise : `apps/web/src/app/toolbar-host.ts:9-26` (`ToolbarHost`) — interface gardée, le distant l'implémente.
- Réutilise : `apps/web/src/app/workspace.ts:650` (`importFiles`) — appelée par `deps.importFiles(files, null)` ; avis lu dans `ImportReport.inserted` (`platform/import.ts:36`).
- Réutilise : `apps/web/src/platform/clipboard.ts:23, 29` — `toBase64(bytes)`, `fromBase64(text): Uint8Array | null` (faux hôte).

**Test et commande bornée.**
```bash
node ~/.claude/scripts/chaine/jeton.cjs --nom tests --proprietaire usage-c11a-annotation/T4 --places-par-sujet 3 --commande "cd $WT/apps/web && nice -n 10 pnpm exec vitest run src/app/annotation.test.ts src/platform/annotation-fake.test.ts > /tmp/c11a-T4-vitest.log 2>&1"; tail -20 /tmp/c11a-T4-vitest.log
```
Preuve attendue : `Test Files  2 passed (2)`, `Tests  N passed`, N ≥ 15 ; `grep -c "faux hôte muet : sortie après 5 s" $WT/apps/web/src/app/annotation.test.ts` = 1 ; `grep -c "un Uint8Array brut devient" $WT/apps/web/src/platform/annotation-fake.test.ts` = 1.
Puis tsc (`tsc=0`) et `pnpm -r test` sous le jeton (`/tmp/c11a-T4-all.log`, aucun `FAIL `).

**Preuve visuelle.** Aucune.

**Contraintes (recopiées de Global Constraints).**
- GC1 — Le chemin de l'encre ne traverse jamais la frontière page ↔ Rust natif ; entre fenêtres ne passent que des commandes de barre, l'état des boutons et le document entier en base64.
- GC2 — Logique testable hors Tauri ; commandes Tauri minces. `apps/desktop/src-tauri` est hors workspace Cargo : `cd apps/desktop/src-tauri && nice -n 10 cargo check -j 4` et `cargo test -j 4` permis s'ils compilent (sinon preuve par lecture, dite) ; aucun `tauri build`, aucun bundle.
- GC3 — Builds et tests en `nice -n 10` ; `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`. Attention au `CARGO_TARGET_DIR` partagé entre worktrees : ne le pose pas, chaque worktree garde son `target/`.
- GC4 — Suites sous le jeton : `node ~/.claude/scripts/chaine/jeton.cjs --nom tests --proprietaire usage-c11a-annotation/T<n> --places-par-sujet 3 --commande "<commande bornée, sortie redirigée vers un fichier>"`.
- GC5 — Tests rapides du profil : `cargo test --workspace 2>&1 | tail -20` · `pnpm -r test 2>&1 | tail -20` ; complet : `scripts/verifier.sh --e2e`.
- GC9 — Aucun test désactivé ou sauté, aucun seuil changé. Pas de `git add -A`/`.`, pas de `commit -a`, pas de `--force`. Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>` (via `git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit`), messages en anglais terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- GC10 — Aucune dépendance en AGPL/GPL/LGPL ; aucun paquet système installé ; aucun workflow GitHub.

**Patron à ne pas reprendre (concepteur-critique).**
- Passer le document en `Uint8Array` dans la charge (`emitTo("annotate", …, { bytes })`) : la coque sérialise en JSON et
  l'octet devient `{"0": …}` (contre-relecture tour 1, `tauri-2.12.5/src/event/plugin.rs:43`). Le faux hôte doit le prouver :
  chaque message passe par `jsonChannel`. Chemin de référence : `apps/web/src/platform/clipboard.ts:23-37` (`toBase64`,
  `fromBase64`), et l'enveloppe JSON qui l'utilise déjà `clipboard.ts:42-44`.
- Une machine d'états à drapeaux libres (`entering`, `exiting`) qui laisse deux entrées se chevaucher : les transitions
  passent par **une file unique** (`serial`), comme `busy` de `platform/controller.ts:97-101, 186-208` mais en file, pas en refus.
- Le délai de 5 s posé dans l'hôte des fenêtres : il est dans le contrôleur (un seul endroit, testé aux faux minuteurs) ;
  l'hôte rend une promesse qui peut ne jamais se résoudre.

**Interdits.** Aucun `Uint8Array` dans un message du faux canal ; aucune dépendance à `workspace.ts` (le contrôleur est
générique en `T`) ; aucun accès DOM dans `app/annotation.ts` ; aucun minuteur autre que celui du délai de sortie.

**Critère « terminé ».** Tests nommés verts (dont RF2 et RF4), tsc 0, `pnpm -r test` sans `FAIL ` ; un commit. Rapport :
`Réutilisation : appelé app/toolbar-host.ts:ToolbarHost, platform/clipboard.ts:toBase64/fromBase64, ImportReport.inserted` ou `Réutilisation : écart — <pourquoi>`.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree** (même bloc que T2, étape 1).

- [ ] **Étape 2 : tests rouges du faux hôte** `apps/web/src/platform/annotation-fake.test.ts`.
```ts
import { describe, expect, it } from "vitest";
import { createFakeAnnotationWindows, jsonChannel } from "./annotation-fake";
import { fromBase64, toBase64 } from "./clipboard";
import { BUILTIN_PROFILES } from "../toolbar-profiles";

const place = { screen: null, dock: "top" as const, thickness: 48 };

describe("faux hôte des fenêtres (C11a, P28, P29)", () => {
  it("canal JSON : un Uint8Array brut devient {\"0\": …}, jamais un Uint8Array", () => {
    const out = jsonChannel({ doc: new Uint8Array([7, 8]) }) as unknown as { doc: unknown };
    expect(out.doc).not.toBeInstanceOf(Uint8Array);
    expect(out.doc).toEqual({ "0": 7, "1": 8 });
  });
  it("en base64, le document revient à l'octet près", () => {
    const bytes = new Uint8Array([0, 255, 80, 75, 3, 4]);
    expect(fromBase64(jsonChannel({ base64: toBase64(bytes) }).base64)).toEqual(bytes);
  });
  it("entrée puis sortie : document reçu et rendu identiques, changed faux sans draw", async () => {
    const f = createFakeAnnotationWindows();
    const bytes = new Uint8Array([1, 2, 3]);
    expect(await f.enter({ ...place, document: bytes, profile: BUILTIN_PROFILES[0]! })).toBe(0);
    expect(f.received()).toEqual(bytes);
    expect(f.profiles()).toBe(1);
    expect(await f.collect()).toEqual({ bytes, changed: false });
  });
  it("draw : octets transformés, changed vrai", async () => {
    const f = createFakeAnnotationWindows({ draw: async (b) => new Uint8Array([...b, 9]) });
    await f.enter({ ...place, document: new Uint8Array([1]), profile: BUILTIN_PROFILES[0]! });
    expect(await f.collect()).toEqual({ bytes: new Uint8Array([1, 9]), changed: true });
  });
  it("dataset publié : annotation, pointeur, annotationRecu, annotationRendu, annotationEntrees", async () => {
    const ds: Record<string, string | undefined> = {};
    const f = createFakeAnnotationWindows({ dataset: ds });
    await f.enter({ ...place, document: new Uint8Array([1, 2]), profile: BUILTIN_PROFILES[0]! });
    expect(ds).toMatchObject({ annotation: "1", pointeur: "draw", annotationRecu: "2", annotationEntrees: "1" });
    await f.pointer("mouse");
    expect(ds["pointeur"]).toBe("mouse");
    await f.collect();
    await f.leave();
    expect(ds).toMatchObject({ annotation: "0", annotationRendu: "2" });
  });
  it("setTool : vue publiée avec l'outil du moteur, après le canal JSON", () => {
    const f = createFakeAnnotationWindows();
    const views: string[] = [];
    f.onView((v) => views.push(v.tool));
    f.send({ kind: "setTool", tool: "select" });
    expect(f.sent).toEqual([{ kind: "setTool", tool: "select" }]);
    expect(views).toEqual(["select"]);
  });
});
```

- [ ] **Étape 3 : tests rouges du contrôleur** `apps/web/src/app/annotation.test.ts`.
```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { createFakeAnnotationWindows, type FakeAnnotationOptions } from "../platform/annotation-fake";
import { addedToPageMessage, INK_LOST_MESSAGE, type AnnotationCommand } from "../platform/annotation-port";
import type { DroppedFile } from "../platform/files";
import type { ImportReport } from "../platform/import";
import { ANNOTATION_REMOTE_ACTIONS } from "../toolbar";
import { BUILTIN_PROFILES } from "../toolbar-profiles";
import { createAnnotationController, createRemoteToolbarHost, offerCompatRelaunch, RELAUNCH_QUESTION, type AnnotationDeps } from "./annotation";
import type { ToolbarHost } from "./toolbar-host";

const report = (o: Partial<ImportReport> = {}): ImportReport => ({ opened: [], inserted: [], refused: [], failed: [], ...o });
const png: DroppedFile = { name: "carre.png", size: 10, mime: "image/png" };

function setup(o: FakeAnnotationOptions & { tab?: string | null; screens?: number; report?: ImportReport } = {}) {
  const windows = createFakeAnnotationWindows(o);
  const log: string[] = [];
  let active = "t1";
  const deps: AnnotationDeps<string> = {
    windows,
    annotationTab: vi.fn(async () => (o.tab === undefined ? "ANN" : o.tab)),
    encodeTab: vi.fn(async () => new Uint8Array([5, 6, 7])),
    replaceAnnotation: vi.fn(async (b: Uint8Array) => {
      log.push(`replace ${b.length}`);
      return true;
    }),
    activeTabId: () => active,
    showTab: vi.fn((id: string) => {
      active = id;
      log.push(`show ${id}`);
    }),
    importFiles: vi.fn(async (f: readonly DroppedFile[]) => {
      log.push(`import ${f.map((x) => x.name).join(",")}`);
      return o.report ?? report();
    }),
    pageNumber: () => 1,
    say: vi.fn(async (m: string) => {
      log.push(`say ${m}`);
    }),
    bar: () => ({ dock: "top", thickness: 48 }),
    profile: () => BUILTIN_PROFILES[0]!,
    screens: o.screens ?? 1,
  };
  const ctl = createAnnotationController(deps);
  return { ctl, windows, deps, log, setActive: (id: string) => { active = id; } };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("contrôleur d'annotation (C11a)", () => {
  it("entrée : onglet encodé, document reçu en base64 par le canal JSON, actif en dessin, Stylo envoyé", async () => {
    const { ctl, windows } = setup();
    await ctl.enter();
    expect(ctl.state()).toMatchObject({ active: true, pointer: "draw", screen: 0 });
    expect(windows.received()).toEqual(new Uint8Array([5, 6, 7]));
    expect(windows.sent[0]).toEqual({ kind: "setTool", tool: "pen" });
    expect(windows.log).toEqual(expect.arrayContaining(["enter 0", "pointer draw"]));
  });
  it("plafond : annotationTab null → pas d'entrée", async () => {
    const { ctl, windows } = setup({ tab: null });
    await ctl.enter();
    expect(ctl.state().active).toBe(false);
    expect(windows.log.some((l) => l.startsWith("enter"))).toBe(false);
  });
  it("double clic : une seule entrée (RF2, P6)", async () => {
    const { ctl, windows } = setup();
    await Promise.all([ctl.enter(), ctl.enter()]);
    expect(windows.log.filter((l) => l.startsWith("enter"))).toHaveLength(1);
  });
  it("sortie, document changé : replaceAnnotation(octets rendus), puis onglet d'origine montré", async () => {
    const { ctl, log, setActive } = setup({ draw: async (b) => new Uint8Array([...b, 1]) });
    await ctl.enter();
    setActive("autre");
    await ctl.exit();
    expect(ctl.state().active).toBe(false);
    expect(log).toEqual(["replace 4", "show t1"]);
  });
  it("sortie sans changement : replaceAnnotation non appelé", async () => {
    const { ctl, deps } = setup();
    await ctl.enter();
    await ctl.exit();
    expect(deps.replaceAnnotation).not.toHaveBeenCalled();
  });
  it("faux hôte muet : sortie après 5 s, avis, onglet inchangé (P4)", async () => {
    vi.useFakeTimers();
    const { ctl, deps, windows } = setup({ mute: true });
    await ctl.enter();
    const done = ctl.exit();
    await vi.advanceTimersByTimeAsync(4999);
    expect(ctl.state().active).toBe(true);
    await vi.advanceTimersByTimeAsync(1);
    await done;
    expect(ctl.state().active).toBe(false);
    expect(deps.say).toHaveBeenCalledWith(INK_LOST_MESSAGE);
    expect(deps.replaceAnnotation).not.toHaveBeenCalled();
    expect(windows.log).toContain("leave");
  });
  it("bascule : Sélection → souris, autre outil → dessin ; toggle revient au dernier outil de dessin (P8)", async () => {
    const { ctl, windows } = setup();
    await ctl.enter();
    ctl.command({ kind: "setTool", tool: "rect" });
    ctl.command({ kind: "setTool", tool: "select" });
    await Promise.resolve();
    expect(ctl.state().pointer).toBe("mouse");
    await ctl.toggle();
    expect(ctl.state().pointer).toBe("draw");
    expect(windows.sent.at(-1)).toEqual({ kind: "setTool", tool: "rect" });
    await ctl.toggle();
    expect(windows.sent.at(-1)).toEqual({ kind: "setTool", tool: "select" });
    expect(windows.log).toEqual(expect.arrayContaining(["pointer mouse", "pointer draw"]));
  });
  it("demande de sortie (Échap, CloseRequested simulé) : sortie", async () => {
    const { ctl, windows } = setup();
    await ctl.enter();
    windows.requestExit();
    await vi.waitFor(() => expect(ctl.state().active).toBe(false));
  });
  it("dépôt sur la zone : sortie d'abord, puis importFiles(files, null) ; objet inséré → « ajouté à la page N » (P17)", async () => {
    const { ctl, deps, log } = setup({ report: report({ inserted: ["carre.png"] }) });
    await ctl.enter();
    await ctl.dropOnZone([png], { x: 3, y: 4 });
    expect(log).toEqual(["show t1", "import carre.png", `say ${addedToPageMessage(1)}`]);
    expect(deps.importFiles).toHaveBeenCalledWith([png], null);
  });
  it("dépôt d'un document : nouvel onglet par importFiles, aucun avis d'ajout", async () => {
    const { ctl, log } = setup({ report: report({ opened: ["x.roomboard"] }) });
    await ctl.enter();
    await ctl.dropOnZone([{ name: "x.roomboard", size: 3, mime: "" }], null);
    expect(log.some((l) => l.startsWith("say"))).toBe(false);
  });
  it("dépôt refusé : sortie faite, aucun avis d'ajout (RF4)", async () => {
    const { ctl, log } = setup({ report: report({ refused: ["x.exe"] }) });
    await ctl.enter();
    await ctl.dropOnZone([{ name: "x.exe", size: 3, mime: "" }], null);
    expect(ctl.state().active).toBe(false);
    expect(log.some((l) => l.startsWith("say"))).toBe(false);
  });
  it("écran suivant : place sur l'écran suivant ; rien à un écran", async () => {
    const two = setup({ screens: 2 });
    await two.ctl.enter();
    await two.ctl.nextScreen();
    expect(two.ctl.state().screen).toBe(1);
    expect(two.windows.log).toContain("place 1");
    const one = setup({ screens: 1 });
    await one.ctl.enter();
    await one.ctl.nextScreen();
    expect(one.windows.log.some((l) => l.startsWith("place"))).toBe(false);
  });
  it("échec de l'entrée : état rendu inactif, avis « Annotation impossible »", async () => {
    const { ctl, windows, deps } = setup();
    windows.enter = async () => {
      throw new Error("pas d'écran");
    };
    await ctl.enter();
    expect(ctl.state().active).toBe(false);
    expect(deps.say).toHaveBeenCalledWith("Annotation impossible : pas d'écran");
  });
  it("close : sortie si active, puis annotate détruite", async () => {
    const { ctl, windows } = setup();
    await ctl.enter();
    expect(await ctl.close()).toBe(true);
    expect(windows.log.slice(-2)).toEqual(["leave", "close"]);
  });
  it("onChange : prévenu à l'entrée et à la sortie", async () => {
    const { ctl } = setup();
    const seen: boolean[] = [];
    ctl.onChange(() => seen.push(ctl.state().active));
    await ctl.enter();
    await ctl.exit();
    expect(seen).toContain(true);
    expect(seen.at(-1)).toBe(false);
  });
});

describe("hôte de barre distant (P21)", () => {
  const local = (): ToolbarHost & { calls: string[] } => {
    const calls: string[] = [];
    const rec = (n: string) => (...a: unknown[]) => void calls.push(`${n} ${JSON.stringify(a)}`);
    return { calls, setTool: rec("setTool"), runAction: rec("runAction"), dropFiles: rec("dropFiles"), setMode: rec("setMode"), tableFill: rec("tableFill"), fillColor: rec("fillColor"), fillTolerance: rec("fillTolerance"), textFormat: rec("textFormat"), selection: rec("selection"), imagePanel: rec("imagePanel") };
  };
  it("outils, préréglages, pot, format et actions transmises → send ; actions de la principale → local ; autres ignorées", () => {
    const sent: AnnotationCommand[] = [];
    const l = local();
    const h = createRemoteToolbarHost((m) => sent.push(m), l, ANNOTATION_REMOTE_ACTIONS);
    h.setTool("pen", "rouge");
    h.setTool("select");
    h.fillColor(null);
    h.fillTolerance(12);
    h.textFormat({ type: "bold" });
    h.runAction("undo");
    h.runAction("desktop-annotation");
    h.runAction("file-save");
    h.dropFiles([png], null);
    h.selection("copy");
    expect(sent).toEqual([
      { kind: "setTool", tool: "pen", preset: "rouge" },
      { kind: "setTool", tool: "select" },
      { kind: "fillColor", color: null },
      { kind: "fillTolerance", value: 12 },
      { kind: "textFormat", action: { type: "bold" } },
      { kind: "runAction", id: "undo" },
    ]);
    expect(l.calls).toEqual([`runAction ["desktop-annotation"]`, `dropFiles [[${JSON.stringify(png)}],null]`]);
  });
});

describe("relance en mode compatibilité (P16)", () => {
  it("Wayland et profil « Annotation au démarrage » : question ; oui → relaunch", async () => {
    const ask = vi.fn(async () => true);
    const relaunch = vi.fn(async () => undefined);
    expect(await offerCompatRelaunch({ supported: false, reason: "wayland", screens: 1 }, "desktop-annotation", ask, relaunch)).toBe(true);
    expect(ask).toHaveBeenCalledWith(RELAUNCH_QUESTION);
    expect(relaunch).toHaveBeenCalledTimes(1);
  });
  it("non → pas de relance ; tableau ou capacité présente → aucune question", async () => {
    const relaunch = vi.fn(async () => undefined);
    expect(await offerCompatRelaunch({ supported: false, reason: "wayland", screens: 1 }, "desktop-annotation", async () => false, relaunch)).toBe(false);
    const ask = vi.fn(async () => true);
    await offerCompatRelaunch({ supported: false, reason: "wayland", screens: 1 }, "board", ask, relaunch);
    await offerCompatRelaunch({ supported: true, reason: null, screens: 1 }, "desktop-annotation", ask, relaunch);
    expect(ask).not.toHaveBeenCalled();
    expect(relaunch).not.toHaveBeenCalled();
  });
});
```

- [ ] **Étape 4 : vérifier l'échec** (commande bornée). Attendu : modules `./annotation` et `../platform/annotation-fake` introuvables.

- [ ] **Étape 5 : écrire `platform/annotation-fake.ts`.**
```ts
/**
 * Faux hôte des fenêtres d'annotation (C11a, P28, P29) : tests, et `?annotation=faux` hors coque. Chaque message passe
 * par `jsonChannel` (JSON aller-retour), comme un événement de la coque : un `Uint8Array` y casserait. Il n'y a pas de
 * seconde page : le document reçu est gardé, et rendu tel quel à la sortie (ou transformé par `draw` dans les tests).
 * L'état est publié sur `dataset` (`document.body.dataset` pour l'essai Playwright).
 */
import type { ToolbarView } from "../ui/item-state";
import { TOOL_TABLE, type Profile } from "../toolbar";
import type { AnnotationCommand, AnnotationPlace, AnnotationWindows, DocumentPayload, PointerMode, ReturnedPayload } from "./annotation-port";
import { fromBase64, toBase64 } from "./clipboard";

export const jsonChannel = <T>(m: T): T => JSON.parse(JSON.stringify(m)) as T;

export interface FakeAnnotationOptions {
  readonly screens?: number;
  readonly supported?: boolean;
  readonly reason?: "wayland" | null;
  /** Ce que `annotate` aurait tracé (tests) ; absent : document rendu tel quel, `changed: false`. */
  readonly draw?: (bytes: Uint8Array) => Promise<Uint8Array>;
  /** `collect` ne répond jamais (délai de sortie). */
  readonly mute?: boolean;
  readonly dataset?: Record<string, string | undefined>;
}

export interface FakeAnnotationWindows extends AnnotationWindows {
  readonly log: string[];
  readonly sent: AnnotationCommand[];
  received(): Uint8Array | null;
  profiles(): number;
  /** Échap dans `annotate`, ou `CloseRequested` de la coque. */
  requestExit(): void;
  emitView(v: ToolbarView): void;
}

export function createFakeAnnotationWindows(o: FakeAnnotationOptions = {}): FakeAnnotationWindows {
  const screens = Math.max(1, o.screens ?? 1);
  const ds = o.dataset ?? {};
  const log: string[] = [];
  const sent: AnnotationCommand[] = [];
  const views = new Set<(v: ToolbarView) => void>();
  const exits = new Set<() => void>();
  let received: Uint8Array | null = null;
  let profiles = 0;
  let entries = 0;
  let view: ToolbarView = { tool: "pen", eraserMode: "partial", canUndo: false, canRedo: false, pageIndex: 0, pageCount: 1 };
  const clamp = (s: number | null): number => (s === null || s < 0 || s >= screens ? 0 : s);
  const publish = (v: ToolbarView): void => {
    view = jsonChannel(v);
    for (const cb of [...views]) cb(view);
  };
  const w: FakeAnnotationWindows = {
    log,
    sent,
    received: () => received,
    profiles: () => profiles,
    async support() {
      return jsonChannel({ supported: o.supported ?? true, reason: o.reason ?? null, screens });
    },
    async enter(p) {
      const screen = clamp(p.screen);
      log.push(`enter ${screen}`);
      jsonChannel<Profile>(p.profile);
      profiles += 1;
      const payload = jsonChannel<DocumentPayload>({ base64: toBase64(p.document) });
      received = fromBase64(payload.base64);
      entries += 1;
      Object.assign(ds, { annotation: "1", pointeur: "draw", annotationRecu: String(received?.length ?? 0), annotationEntrees: String(entries) });
      return screen;
    },
    async place(p: AnnotationPlace) {
      const screen = clamp(p.screen);
      log.push(`place ${screen}`);
      return screen;
    },
    collect() {
      log.push("collect");
      if (o.mute === true) return new Promise(() => undefined);
      return (async () => {
        const doc = received ?? new Uint8Array(0);
        const bytes = o.draw === undefined ? doc : await o.draw(doc);
        const r = jsonChannel<ReturnedPayload>({ id: 0, base64: toBase64(bytes), changed: o.draw !== undefined });
        const back = fromBase64(r.base64);
        if (back === null) return null;
        ds["annotationRendu"] = String(back.length);
        return { bytes: back, changed: r.changed };
      })();
    },
    async leave() {
      log.push("leave");
      ds["annotation"] = "0";
    },
    async close() {
      log.push("close");
      received = null;
      ds["annotation"] = "0";
    },
    async pointer(mode: PointerMode) {
      log.push(`pointer ${mode}`);
      ds["pointeur"] = mode;
    },
    sendProfile(p) {
      jsonChannel(p);
      profiles += 1;
    },
    send(m) {
      const msg = jsonChannel(m);
      sent.push(msg);
      if (msg.kind === "setTool" && Object.hasOwn(TOOL_TABLE, msg.tool)) publish({ ...view, tool: TOOL_TABLE[msg.tool]!.choice });
    },
    onView(cb) {
      views.add(cb);
      return () => {
        views.delete(cb);
      };
    },
    onExitRequest(cb) {
      exits.add(cb);
      return () => {
        exits.delete(cb);
      };
    },
    async relaunchCompat() {
      log.push("relaunch");
    },
    requestExit() {
      for (const cb of [...exits]) cb();
    },
    emitView: publish,
  };
  return w;
}
```

- [ ] **Étape 6 : écrire `app/annotation.ts`.**
```ts
/**
 * Contrôleur de l'annotation de bureau (C11a, DA1, DA2, P3 à P9, P15 à P17, P21) dans la fenêtre principale : entrée
 * (document de l'onglet d'annotation envoyé une fois, en base64 par l'hôte), sortie (document demandé, délai de 5 s,
 * remplacement s'il a changé, onglet d'origine montré), bascule dessin / souris liée à l'outil, écran suivant, dépôt
 * sur la zone (sortie d'abord, puis l'import ordinaire). Les transitions passent par une file : jamais deux entrées.
 * Générique en `T` (la session d'onglet) : aucune dépendance à l'espace de travail ni au DOM.
 */
import type { DroppedFile, Point } from "../platform/files";
import type { ImportReport } from "../platform/import";
import { messageOf } from "../platform/controller";
import {
  addedToPageMessage,
  EXIT_TIMEOUT_MS,
  INK_LOST_MESSAGE,
  type AnnotationCommand,
  type AnnotationControl,
  type AnnotationState,
  type AnnotationSupport,
  type AnnotationWindows,
  type PointerMode,
  type Returned,
} from "../platform/annotation-port";
import { ANNOTATION_MAIN_ACTIONS, type Dock, type Profile, type StartMode } from "../toolbar";
import type { ToolbarHost } from "./toolbar-host";

export const RELAUNCH_QUESTION = "Annotation du bureau indisponible sous Wayland. Relancer en mode compatibilité ?";
export const annotationFailedMessage = (why: string): string => `Annotation impossible : ${why}`;

export interface AnnotationDeps<T> {
  readonly windows: AnnotationWindows;
  /** Onglet d'annotation existant, ou créé vierge et non montré ; null : 12 onglets (avis déjà dit). */
  annotationTab(): Promise<T | null>;
  encodeTab(tab: T): Promise<Uint8Array>;
  replaceAnnotation(bytes: Uint8Array): Promise<boolean>;
  activeTabId(): string | null;
  showTab(id: string): void;
  importFiles(files: readonly DroppedFile[], at: Point | null): Promise<ImportReport>;
  /** Rang (1 = première) de la page montrée de l'onglet actif. */
  pageNumber(): number;
  say(message: string): Promise<void>;
  /** Côté et épaisseur (px CSS) de la première barre `tools`, mesurés dans la page. */
  bar(): { readonly dock: Dock; readonly thickness: number };
  profile(): Profile;
  readonly screens?: number;
  readonly timeoutMs?: number;
}

/** Réponse ou null après `ms` (minuteur toujours retiré). */
function within(p: Promise<Returned | null>, ms: number): Promise<Returned | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), ms);
  });
  return Promise.race([p.catch(() => null), late]).finally(() => clearTimeout(timer));
}

export function createAnnotationController<T>(d: AnnotationDeps<T>): AnnotationControl {
  const timeout = d.timeoutMs ?? EXIT_TIMEOUT_MS;
  let st: AnnotationState = { active: false, pointer: "draw", screen: null, screens: Math.max(1, d.screens ?? 1) };
  let origin: string | null = null;
  let lastDraw = "pen";
  let queue: Promise<void> = Promise.resolve();
  const listeners = new Set<() => void>();
  const set = (next: Partial<AnnotationState>): void => {
    st = { ...st, ...next };
    for (const cb of [...listeners]) cb();
  };
  /** File unique des transitions : une erreur n'arrête pas la file. */
  const serial = (f: () => Promise<void>): Promise<void> => {
    const run = queue.then(f);
    queue = run.catch(() => undefined);
    return run;
  };
  const setPointer = async (mode: PointerMode): Promise<void> => {
    if (st.pointer === mode) return;
    set({ pointer: mode });
    if (st.active) await d.windows.pointer(mode);
  };

  async function doEnter(): Promise<void> {
    if (st.active) return;
    const tab = await d.annotationTab();
    if (tab === null) return;
    const document = await d.encodeTab(tab);
    origin = d.activeTabId();
    set({ active: true, pointer: "draw" });
    try {
      const bar = d.bar(); // mesurée après le passage en barre seule
      const screen = await d.windows.enter({ screen: st.screen, dock: bar.dock, thickness: bar.thickness, document, profile: d.profile() });
      set({ screen });
      d.windows.send({ kind: "setTool", tool: lastDraw });
      await d.windows.pointer("draw");
    } catch (e) {
      set({ active: false });
      try {
        await d.windows.leave();
      } catch {
        // la fenêtre n'a peut-être jamais été montrée
      }
      await d.say(annotationFailedMessage(messageOf(e)));
    }
  }

  async function doExit(): Promise<void> {
    if (!st.active) return;
    const got = await within(d.windows.collect(), timeout);
    try {
      await d.windows.leave();
    } catch (e) {
      console.warn(`RoomBoard : fenêtre d'annotation non cachée (${messageOf(e)})`);
    }
    set({ active: false, pointer: "draw" });
    if (got === null) await d.say(INK_LOST_MESSAGE);
    else if (got.changed) await d.replaceAnnotation(got.bytes);
    if (origin !== null) d.showTab(origin);
    origin = null;
  }

  const ctl: AnnotationControl = {
    state: () => st,
    enter: () => serial(doEnter),
    exit: () => serial(doExit),
    close: async () => {
      await serial(async () => {
        await doExit();
        await d.windows.close();
      });
      return true;
    },
    toggle: () =>
      serial(async () => {
        if (!st.active) return;
        ctl.command({ kind: "setTool", tool: st.pointer === "draw" ? "select" : lastDraw });
      }),
    nextScreen: () =>
      serial(async () => {
        if (!st.active || st.screens <= 1) return;
        const bar = d.bar();
        const screen = await d.windows.place({ screen: ((st.screen ?? 0) + 1) % st.screens, dock: bar.dock, thickness: bar.thickness });
        set({ screen });
      }),
    onTool(tool) {
      if (tool !== "select") lastDraw = tool;
      void setPointer(tool === "select" ? "mouse" : "draw").catch((e: unknown) => {
        console.warn(`RoomBoard : bascule non appliquée (${messageOf(e)})`);
      });
    },
    command(m: AnnotationCommand) {
      d.windows.send(m);
      if (m.kind === "setTool") ctl.onTool(m.tool);
    },
    sendProfile(p) {
      if (st.active) d.windows.sendProfile(p);
    },
    dropOnZone: (files, at) =>
      serial(async () => {
        if (!st.active) {
          await d.importFiles(files, at);
          return;
        }
        await doExit();
        const r = await d.importFiles(files, null);
        if (r.inserted.length > 0) await d.say(addedToPageMessage(d.pageNumber()));
      }),
    onChange(cb) {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
  };
  d.windows.onExitRequest(() => {
    void ctl.exit().catch((e: unknown) => console.warn(`RoomBoard : sortie de l'annotation abandonnée (${messageOf(e)})`));
  });
  return ctl;
}

/**
 * Hôte de barre en annotation (P21) : outils, préréglages, pot, format et actions de `remoteActions` partent vers
 * `annotate` ; les actions de la fenêtre principale (`ANNOTATION_MAIN_ACTIONS`), le dépôt et le mode restent locaux ;
 * le reste (grisé dans la barre) est ignoré.
 */
export function createRemoteToolbarHost(send: (m: AnnotationCommand) => void, local: ToolbarHost, remoteActions: ReadonlySet<string>): ToolbarHost {
  return {
    setTool: (tool, preset) => send(preset === undefined ? { kind: "setTool", tool } : { kind: "setTool", tool, preset }),
    runAction(id) {
      if (remoteActions.has(id)) send({ kind: "runAction", id });
      else if (ANNOTATION_MAIN_ACTIONS.has(id)) local.runAction(id);
    },
    fillColor: (color) => send({ kind: "fillColor", color }),
    fillTolerance: (value) => send({ kind: "fillTolerance", value }),
    textFormat: (action) => send({ kind: "textFormat", action }),
    dropFiles: (files, at) => local.dropFiles(files, at),
    setMode: (mode) => local.setMode(mode),
    tableFill: () => undefined,
    selection: () => undefined,
    imagePanel: () => undefined,
  };
}

/** P16 : sous Wayland natif, si le profil demandait l'annotation, propose la relance en XWayland ; vrai si relancé. */
export async function offerCompatRelaunch(
  support: AnnotationSupport,
  startMode: StartMode,
  ask: (m: string) => Promise<boolean>,
  relaunch: () => Promise<void>,
): Promise<boolean> {
  if (support.supported || support.reason !== "wayland" || startMode !== "desktop-annotation") return false;
  if (!(await ask(RELAUNCH_QUESTION))) return false;
  await relaunch();
  return true;
}
```

- [ ] **Étape 7 : vérifier le vert**, tsc, `pnpm -r test` (section « Test et commande bornée »). Le test « bascule » attend
une micro-tâche après `command` (la bascule est lancée sans attendre) : si `pointer mouse` n'est pas encore au journal,
remplacer `await Promise.resolve()` par `await vi.waitFor(() => expect(ctl.state().pointer).toBe("mouse"))`.

- [ ] **Étape 8 : commit.**
```bash
cd $WT && git add apps/web/src/app/annotation.ts apps/web/src/app/annotation.test.ts apps/web/src/platform/annotation-fake.ts apps/web/src/platform/annotation-fake.test.ts
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "feat(annotation): controller, remote toolbar host, JSON-channel fake host" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche T5 — Coque Tauri : commandes `annotation_*`, événements de fenêtre, `annotate.json`, hôte de fenêtres TS, fiche d'essais en coque
<a id="tache-t5"></a>

**Objectif.** Les commandes Rust minces (DA3, P12, P13) qui appellent la crate de T1, la capacité `annotate.json`, les
événements de fenêtre (P13, P18), l'hôte de fenêtres TS de la coque `createTauriAnnotationWindows` (testé avec un faux
ipc), et la fiche des essais en coque `docs/essais/c11a-coque.md` (S5, séances de Jérôme).

**Fichiers.**
- Modifier : `apps/desktop/src-tauri/src/main.rs` (imports l. 1-16, nouvelles commandes après `reimport_original` l. 238, `.manage` l. 300-303, `invoke_handler` l. 321-333, `on_window_event` l. 334-342)
- Créer : `apps/desktop/src-tauri/capabilities/annotate.json`, `apps/web/src/platform/annotation-tauri.ts`, `apps/web/src/platform/annotation-tauri.test.ts`, `docs/essais/c11a-coque.md`

**Interfaces.**
- Consomme (T1) : `roomboard_shell::annotation::{detect_session, supported, Unsupported, Rect, side_of, split, physical, pick_screen, cursor_in, compat_env, relaunch_args}`.
- Consomme (T3) : `AnnotationWindows`, `AnnotationSupport`, `AnnotationPlace`, `Returned`, `DocumentPayload`, `CollectPayload`, `ReturnedPayload`, `ANNOTATION_EVENTS`, `ANNOTATE_LABEL`, `READY_TIMEOUT_MS` (`platform/annotation-port.ts`) ; `TauriIpc.emitTo?` (`platform/host-tauri.ts`).
- Produit (Rust, `main.rs`) : commandes `annotation_support() -> Support { supported: bool, reason: Option<&str>, screens: usize }`, `async annotation_enter(screen: Option<usize>, dock: String, thickness: f64) -> Result<usize, String>`, `annotation_exit() -> Result<(), String>`, `annotation_close() -> Result<(), String>`, `annotation_ignore(ignore: bool) -> Result<(), String>`, `annotation_cursor() -> Option<(f64, f64)>`, `relaunch_compat() -> Result<(), String>`.
- Produit (TS) : `interface AnnotationIpc { invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T>; listen<T>(event: string, cb: (e: { readonly payload: T }) => void): Promise<() => void>; emitTo<T>(target: string, event: string, payload: T): Promise<void> }` ; `function createTauriAnnotationWindows(ipc: AnnotationIpc, readyTimeoutMs?: number): AnnotationWindows`.
- Réutilise : `crates/roomboard-shell` (C16) — module `annotation` de T1 : `detect_session`, `supported`, `split`, `pick_screen`, `compat_env`, `relaunch_args` (appelés par les commandes).
- Réutilise : `apps/desktop/src-tauri/src/main.rs:247` (`grant_and_emit`) ; `crates/roomboard-shell/src/lib.rs:48` (`GrantedPaths`) — inchangés ; seuls les dépôts de `window.label() == "main"` y vont (P18).
- Réutilise : aucun module existant (termes `WebviewWindow`, `set_ignore`, `annotate`) — implémentation coque `platform/annotation-tauri.ts` du contrat `AnnotationWindows` (nouveau module).
- Réutilise : `apps/web/src/platform/host-tauri.ts:62` (`TauriIpc`) — `emitTo<T>(target, event, payload)` (posé par T3) ; `platform/clipboard.ts:23, 29` — `toBase64`, `fromBase64`.

**Test et commande bornée.**
```bash
node ~/.claude/scripts/chaine/jeton.cjs --nom tests --proprietaire usage-c11a-annotation/T5 --places-par-sujet 3 --commande "cd $WT/apps/web && nice -n 10 pnpm exec vitest run src/platform/annotation-tauri.test.ts > /tmp/c11a-T5-vitest.log 2>&1"; tail -20 /tmp/c11a-T5-vitest.log
```
Preuve attendue : `Tests  N passed`, N ≥ 8 ; `grep -c "réponse d'un autre id ignorée" $WT/apps/web/src/platform/annotation-tauri.test.ts` = 1.
Coque (GC2) :
```bash
node ~/.claude/scripts/chaine/jeton.cjs --nom tests --proprietaire usage-c11a-annotation/T5 --places-par-sujet 3 --duree-max-minutes 30 --commande "cd $WT/apps/desktop/src-tauri && nice -n 10 cargo check -j 4 > /tmp/c11a-T5-check.log 2>&1"; tail -8 /tmp/c11a-T5-check.log
```
Attendu : `Finished` et aucun `error[`. Si l'échec vient de l'environnement (dépendance non téléchargeable, `frontendDist`
absent malgré la copie de l'étape 1), le dire dans le rapport et prouver par lecture : chaque appel Tauri cité existe
dans `~/.cargo/registry/src/*/tauri-2.12.5/src/window/mod.rs` (`set_ignore_cursor_events` l. 2357, `cursor_position`
l. 1845, `set_decorations` l. 2116, `set_always_on_top` l. 2191, `set_size` l. 1924, `set_position` l. 1963) et
`webview/webview_window.rs` (`transparent` l. 1146, `skip_taskbar` l. 641, `drag_and_drop` l. 781 sous `cfg(windows)`).
Puis tsc (`tsc=0`), `bash $WT/scripts/tests/coque-csp.test.sh` (vert, CSP inchangée) et `pnpm -r test` sous le jeton (aucun `FAIL `).

**Preuve visuelle.** Aucune sur la VM (aucun `tauri build`) ; la fiche `docs/essais/c11a-coque.md` décrit les essais à l'écran.

**Contraintes (recopiées de Global Constraints).**
- GC1 — Le chemin de l'encre ne traverse jamais la frontière page ↔ Rust natif ; entre fenêtres ne passent que des commandes de barre, l'état des boutons et le document entier en base64.
- GC2 — Logique testable hors Tauri ; commandes Tauri minces. `apps/desktop/src-tauri` est hors workspace Cargo : `cd apps/desktop/src-tauri && nice -n 10 cargo check -j 4` et `cargo test -j 4` permis s'ils compilent (sinon preuve par lecture, dite) ; aucun `tauri build`, aucun bundle.
- GC3 — Builds et tests en `nice -n 10` ; `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`. Attention au `CARGO_TARGET_DIR` partagé entre worktrees : ne le pose pas, chaque worktree garde son `target/`.
- GC4 — Suites sous le jeton : `node ~/.claude/scripts/chaine/jeton.cjs --nom tests --proprietaire usage-c11a-annotation/T<n> --places-par-sujet 3 --commande "<commande bornée, sortie redirigée vers un fichier>"`.
- GC5 — Tests rapides du profil : `cargo test --workspace 2>&1 | tail -20` · `pnpm -r test 2>&1 | tail -20` ; complet : `scripts/verifier.sh --e2e`.
- GC9 — Aucun test désactivé ou sauté, aucun seuil changé. Pas de `git add -A`/`.`, pas de `commit -a`, pas de `--force`. Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>` (via `git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit`), messages en anglais terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- GC10 — Aucune dépendance en AGPL/GPL/LGPL ; aucun paquet système installé ; aucun workflow GitHub.

**Interdits.** Ne pas modifier `tauri.conf.json`, `capabilities/default.json`, `src-tauri/Cargo.toml`, `build.rs`
(cadrage, carte d'impact « non ») ; aucune permission `core:window:allow-*` ; aucun fil de sondage en Rust ; aucun
`fullscreen: true` (P11) ; aucun `tauri build` ; ne jamais compiler `src-tauri` en même temps qu'un autre build Tauri
(profil : un seul build Tauri à la fois — le jeton s'en charge).

**Critère « terminé ».** Tests nommés verts (dont RF1), `cargo check` vert ou preuve par lecture dite, tsc 0,
`coque-csp.test.sh` vert, `pnpm -r test` sans `FAIL `, fiche écrite ; un commit. Rapport :
`Réutilisation : appelé crates/roomboard-shell/src/annotation.rs (7 fonctions), main.rs:grant_and_emit (inchangé)` ou `Réutilisation : écart — <pourquoi>`.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree** (bloc de T2, étape 1 ; la copie de `apps/web/dist` sert à `generate_context!`).

- [ ] **Étape 2 : tests rouges** `apps/web/src/platform/annotation-tauri.test.ts`.
```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { ANNOTATION_EVENTS } from "./annotation-port";
import { createTauriAnnotationWindows, type AnnotationIpc } from "./annotation-tauri";
import { toBase64 } from "./clipboard";
import { BUILTIN_PROFILES } from "../toolbar-profiles";

function fakeIpc(o: { autoReady?: boolean } = {}) {
  const listeners = new Map<string, Set<(e: { payload: unknown }) => void>>();
  const invokes: [string, unknown][] = [];
  const emitted: { target: string; event: string; payload: unknown }[] = [];
  const fire = (event: string, payload: unknown): void => {
    for (const cb of listeners.get(event) ?? []) cb({ payload: JSON.parse(JSON.stringify(payload ?? null)) });
  };
  const ipc: AnnotationIpc = {
    async invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
      invokes.push([cmd, args]);
      if (cmd === "annotation_enter") {
        if (o.autoReady !== false) queueMicrotask(() => fire(ANNOTATION_EVENTS.ready, {}));
        return 0 as T;
      }
      if (cmd === "annotation_support") return { supported: true, reason: null, screens: 2 } as T;
      return undefined as T;
    },
    async listen<T>(event: string, cb: (e: { readonly payload: T }) => void) {
      const set = listeners.get(event) ?? new Set();
      set.add(cb as (e: { payload: unknown }) => void);
      listeners.set(event, set);
      return () => set.delete(cb as (e: { payload: unknown }) => void);
    },
    async emitTo<T>(target: string, event: string, payload: T) {
      emitted.push({ target, event, payload: JSON.parse(JSON.stringify(payload)) });
    },
  };
  return { ipc, invokes, emitted, fire };
}
const place = { screen: null, dock: "top" as const, thickness: 48 };
const doc = new Uint8Array([80, 75, 3, 4, 255]);

afterEach(() => vi.useRealTimers());

describe("hôte des fenêtres de la coque (C11a, P13, P21)", () => {
  it("enter : annotation_enter, attend ready, puis profil puis document en base64 (charge JSON sans Uint8Array)", async () => {
    const f = fakeIpc();
    const w = createTauriAnnotationWindows(f.ipc);
    expect(await w.enter({ ...place, document: doc, profile: BUILTIN_PROFILES[0]! })).toBe(0);
    expect(f.invokes[0]).toEqual(["annotation_enter", { screen: null, dock: "top", thickness: 48 }]);
    expect(f.emitted.map((e) => [e.target, e.event])).toEqual([
      ["annotate", ANNOTATION_EVENTS.profile],
      ["annotate", ANNOTATION_EVENTS.document],
    ]);
    expect(f.emitted[1]!.payload).toEqual({ base64: toBase64(doc) });
  });
  it("réentrée sans recréation : pas d'attente d'un nouveau ready", async () => {
    const f = fakeIpc();
    const w = createTauriAnnotationWindows(f.ipc);
    await w.enter({ ...place, document: doc, profile: BUILTIN_PROFILES[0]! });
    const g = fakeIpc({ autoReady: false });
    f.ipc.invoke = g.ipc.invoke; // plus aucun ready ne viendra
    await expect(w.enter({ ...place, document: doc, profile: BUILTIN_PROFILES[0]! })).resolves.toBe(0);
  });
  it("close : annotation_close, puis la prochaine entrée attend ready (muette → rejet)", async () => {
    vi.useFakeTimers();
    const f = fakeIpc();
    const w = createTauriAnnotationWindows(f.ipc, 1000);
    await w.enter({ ...place, document: doc, profile: BUILTIN_PROFILES[0]! });
    await w.close();
    expect(f.invokes.at(-1)).toEqual(["annotation_close", undefined]);
    f.ipc.invoke = fakeIpc({ autoReady: false }).ipc.invoke;
    const p = w.enter({ ...place, document: doc, profile: BUILTIN_PROFILES[0]! });
    const caught = p.catch((e: unknown) => (e as Error).message);
    await vi.advanceTimersByTimeAsync(1000);
    expect(await caught).toBe("fenêtre d'annotation muette");
  });
  it("collect : réponse d'id égal rendue ; réponse d'un autre id ignorée (RF1, P4)", async () => {
    const f = fakeIpc();
    const w = createTauriAnnotationWindows(f.ipc);
    const p = w.collect();
    await vi.waitFor(() => expect(f.emitted.at(-1)?.event).toBe(ANNOTATION_EVENTS.collect));
    const asked = f.emitted.at(-1)!;
    expect(asked.event).toBe(ANNOTATION_EVENTS.collect);
    const id = (asked.payload as { id: number }).id;
    f.fire(ANNOTATION_EVENTS.returned, { id: id - 1, base64: toBase64(new Uint8Array([9])), changed: true });
    f.fire(ANNOTATION_EVENTS.returned, { id, base64: toBase64(doc), changed: true });
    expect(await p).toEqual({ bytes: doc, changed: true });
  });
  it("collect : base64 illisible → null", async () => {
    const f = fakeIpc();
    const w = createTauriAnnotationWindows(f.ipc);
    const p = w.collect();
    await vi.waitFor(() => expect(f.emitted.at(-1)?.event).toBe(ANNOTATION_EVENTS.collect));
    const id = (f.emitted.at(-1)!.payload as { id: number }).id;
    f.fire(ANNOTATION_EVENTS.returned, { id, base64: "@@@", changed: true });
    expect(await p).toBeNull();
  });
  it("pointer : annotation_ignore { ignore } ; leave : annotation_exit ; place : annotation_enter sans document", async () => {
    const f = fakeIpc();
    const w = createTauriAnnotationWindows(f.ipc);
    await w.pointer("mouse");
    await w.pointer("draw");
    await w.leave();
    await w.place({ screen: 1, dock: "left", thickness: 60 });
    expect(f.invokes).toEqual([
      ["annotation_ignore", { ignore: true }],
      ["annotation_ignore", { ignore: false }],
      ["annotation_exit", undefined],
      ["annotation_enter", { screen: 1, dock: "left", thickness: 60 }],
    ]);
  });
  it("onView et onExitRequest relayés ; send et sendProfile émis vers annotate", async () => {
    const f = fakeIpc();
    const w = createTauriAnnotationWindows(f.ipc);
    const views: string[] = [];
    let exits = 0;
    w.onView((v) => views.push(v.tool));
    w.onExitRequest(() => (exits += 1));
    await w.support();
    f.fire(ANNOTATION_EVENTS.view, { tool: "select", eraserMode: "partial", canUndo: false, canRedo: false, pageIndex: 0, pageCount: 1 });
    f.fire(ANNOTATION_EVENTS.exitRequest, {});
    w.send({ kind: "runAction", id: "undo" });
    w.sendProfile(BUILTIN_PROFILES[0]!);
    await Promise.resolve();
    expect(views).toEqual(["select"]);
    expect(exits).toBe(1);
    expect(f.emitted.map((e) => e.event)).toEqual([ANNOTATION_EVENTS.command, ANNOTATION_EVENTS.profile]);
  });
  it("support relayé ; relaunchCompat → relaunch_compat", async () => {
    const f = fakeIpc();
    const w = createTauriAnnotationWindows(f.ipc);
    expect(await w.support()).toEqual({ supported: true, reason: null, screens: 2 });
    await w.relaunchCompat();
    expect(f.invokes.at(-1)).toEqual(["relaunch_compat", undefined]);
  });
});
```

- [ ] **Étape 3 : vérifier l'échec** (commande Vitest bornée). Attendu : module `./annotation-tauri` introuvable.

- [ ] **Étape 4 : écrire `platform/annotation-tauri.ts`.**
```ts
/**
 * Hôte des fenêtres d'annotation dans la coque (C11a, DA2, DA3, P13, P21) : commandes `annotation_*` et événements
 * `emitTo` / `listen`. Les écoutes sont posées une fois, avant la première commande (sinon `ready` se perdrait). Le
 * document part en base64 ; une demande de document porte un identifiant, une réponse d'une autre demande est ignorée.
 */
import type { ToolbarView } from "../ui/item-state";
import {
  ANNOTATE_LABEL,
  ANNOTATION_EVENTS,
  READY_TIMEOUT_MS,
  type AnnotationSupport,
  type AnnotationWindows,
  type CollectPayload,
  type DocumentPayload,
  type Returned,
  type ReturnedPayload,
} from "./annotation-port";
import { fromBase64, toBase64 } from "./clipboard";

export interface AnnotationIpc {
  invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T>;
  listen<T>(event: string, cb: (e: { readonly payload: T }) => void): Promise<() => void>;
  emitTo<T>(target: string, event: string, payload: T): Promise<void>;
}

export function createTauriAnnotationWindows(ipc: AnnotationIpc, readyTimeoutMs: number = READY_TIMEOUT_MS): AnnotationWindows {
  const views = new Set<(v: ToolbarView) => void>();
  const exits = new Set<() => void>();
  let ready = false;
  let onReady: (() => void) | null = null;
  let nextId = 1;
  let pending: { readonly id: number; readonly resolve: (r: Returned | null) => void } | null = null;
  const subscribed = Promise.all([
    ipc.listen<unknown>(ANNOTATION_EVENTS.ready, () => {
      ready = true;
      onReady?.();
      onReady = null;
    }),
    ipc.listen<ToolbarView>(ANNOTATION_EVENTS.view, (e) => {
      for (const cb of [...views]) cb(e.payload);
    }),
    ipc.listen<ReturnedPayload>(ANNOTATION_EVENTS.returned, (e) => {
      const p = pending;
      if (p === null || e.payload?.id !== p.id) return;
      pending = null;
      const bytes = typeof e.payload.base64 === "string" ? fromBase64(e.payload.base64) : null;
      p.resolve(bytes === null ? null : { bytes, changed: e.payload.changed === true });
    }),
    ipc.listen<unknown>(ANNOTATION_EVENTS.exitRequest, () => {
      for (const cb of [...exits]) cb();
    }),
  ]);
  const waitReady = (): Promise<void> =>
    ready
      ? Promise.resolve()
      : new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => {
            onReady = null;
            reject(new Error("fenêtre d'annotation muette"));
          }, readyTimeoutMs);
          onReady = () => {
            clearTimeout(timer);
            resolve();
          };
        });
  const placeArgs = (o: { screen: number | null; dock: string; thickness: number }) => ({ screen: o.screen, dock: o.dock, thickness: o.thickness });

  return {
    async support() {
      await subscribed;
      return ipc.invoke<AnnotationSupport>("annotation_support");
    },
    async enter(o) {
      await subscribed;
      const screen = await ipc.invoke<number>("annotation_enter", placeArgs(o));
      await waitReady();
      await ipc.emitTo(ANNOTATE_LABEL, ANNOTATION_EVENTS.profile, o.profile);
      await ipc.emitTo<DocumentPayload>(ANNOTATE_LABEL, ANNOTATION_EVENTS.document, { base64: toBase64(o.document) });
      return screen;
    },
    async place(o) {
      await subscribed;
      return ipc.invoke<number>("annotation_enter", placeArgs(o));
    },
    collect() {
      return new Promise<Returned | null>((resolve) => {
        const id = nextId++;
        pending?.resolve(null);
        pending = { id, resolve };
        void subscribed.then(() => ipc.emitTo<CollectPayload>(ANNOTATE_LABEL, ANNOTATION_EVENTS.collect, { id }));
      });
    },
    leave: () => ipc.invoke<void>("annotation_exit"),
    async close() {
      ready = false;
      await ipc.invoke<void>("annotation_close");
    },
    pointer: (mode) => ipc.invoke<void>("annotation_ignore", { ignore: mode === "mouse" }),
    sendProfile(p) {
      void ipc.emitTo(ANNOTATE_LABEL, ANNOTATION_EVENTS.profile, p);
    },
    send(m) {
      void ipc.emitTo(ANNOTATE_LABEL, ANNOTATION_EVENTS.command, m);
    },
    onView(cb) {
      views.add(cb);
      return () => {
        views.delete(cb);
      };
    },
    onExitRequest(cb) {
      exits.add(cb);
      return () => {
        exits.delete(cb);
      };
    },
    relaunchCompat: () => ipc.invoke<void>("relaunch_compat"),
  };
}
```
Note : `invoke("annotation_exit")` sans argument : le test attend `["annotation_exit", undefined]` ; passer `undefined` explicitement n'est pas nécessaire.

- [ ] **Étape 5 : vérifier le vert** (commande Vitest bornée), puis tsc.

- [ ] **Étape 6 : `main.rs`.** Imports, à ajouter :
```rust
use roomboard_shell::annotation::{self as ann, Rect as AnnRect};
use tauri::{PhysicalPosition, PhysicalSize, WebviewUrl, WebviewWindowBuilder};
```
Constantes près de `DROPPED_EVENT` :
```rust
/// C11a (P13) : fenêtre d'annotation, créée à la première entrée.
const ANNOTATE: &str = "annotate";
/// C11a (P13) : `CloseRequested` de `annotate` (Alt+F4, Cmd+W) traité comme Échap.
const EXIT_REQUEST_EVENT: &str = "roomboard://annotation-exit-request";
```
Après `reimport_original` :
```rust
/// C11a (P1) : position et taille de `main` avant l'annotation, rendues à la sortie.
#[derive(Default)]
struct SavedGeometry(Mutex<Option<(PhysicalPosition<i32>, PhysicalSize<u32>)>>);

#[derive(Serialize)]
struct AnnotationSupport {
    supported: bool,
    reason: Option<&'static str>,
    screens: usize,
}

fn err(e: impl std::fmt::Display) -> String {
    e.to_string()
}

fn rect_of(m: &tauri::Monitor) -> AnnRect {
    let (p, s) = (m.position(), m.size());
    AnnRect { x: p.x, y: p.y, w: s.width, h: s.height }
}

/// C11a (P16) : session détectée par l'environnement ; nombre d'écrans pour « Écran suivant » (P15).
#[tauri::command]
fn annotation_support(app: AppHandle) -> AnnotationSupport {
    let session = ann::detect_session(std::env::consts::OS, |k| std::env::var(k).ok());
    let screens = app.available_monitors().map(|m| m.len()).unwrap_or(1).max(1);
    match ann::supported(session) {
        Ok(()) => AnnotationSupport { supported: true, reason: None, screens },
        Err(ann::Unsupported::Wayland) => AnnotationSupport { supported: false, reason: Some("wayland"), screens },
    }
}

/// C11a (P1, P10, P11, P13, P15) : crée ou montre `annotate`, réduit `main` à la bande de la barre ; rend l'écran retenu.
/// `async` : un `WebviewWindowBuilder` dans une commande synchrone interbloque sous Windows (`webview_window.rs:58, 115`).
#[tauri::command]
async fn annotation_enter(
    app: AppHandle,
    saved: State<'_, SavedGeometry>,
    screen: Option<usize>,
    dock: String,
    thickness: f64,
) -> Result<usize, String> {
    let main = app.get_webview_window("main").ok_or("fenêtre principale absente")?;
    let monitors = main.available_monitors().map_err(err)?;
    if monitors.is_empty() {
        return Err("aucun écran".into());
    }
    let rects: Vec<AnnRect> = monitors.iter().map(rect_of).collect();
    let pos = main.outer_position().map_err(err)?;
    let size = main.inner_size().map_err(err)?;
    {
        let mut s = saved.0.lock().unwrap_or_else(|e| e.into_inner());
        if s.is_none() {
            *s = Some((pos, size));
        }
    }
    let center = (pos.x + (size.width / 2) as i32, pos.y + (size.height / 2) as i32);
    let i = ann::pick_screen(&rects, screen, center);
    let px = ann::physical(thickness, monitors[i].scale_factor());
    let (bar, area) = ann::split(rects[i], ann::side_of(&dock), px);
    let annotate = match app.get_webview_window(ANNOTATE) {
        Some(w) => w,
        None => {
            let builder = WebviewWindowBuilder::new(&app, ANNOTATE, WebviewUrl::App("index.html?fenetre=annotation".into()))
                .title("RoomBoard — annotation")
                .transparent(true)
                .decorations(false)
                .always_on_top(true)
                .skip_taskbar(true)
                .focused(false)
                .visible(false);
            #[cfg(windows)]
            let builder = builder.drag_and_drop(false);
            builder.build().map_err(err)?
        }
    };
    main.set_decorations(false).map_err(err)?;
    main.set_always_on_top(true).map_err(err)?;
    main.set_position(PhysicalPosition::new(bar.x, bar.y)).map_err(err)?;
    main.set_size(PhysicalSize::new(bar.w, bar.h)).map_err(err)?;
    annotate.set_position(PhysicalPosition::new(area.x, area.y)).map_err(err)?;
    annotate.set_size(PhysicalSize::new(area.w, area.h)).map_err(err)?;
    annotate.show().map_err(err)?;
    Ok(i)
}

fn restore_main(app: &AppHandle, saved: &SavedGeometry) -> Result<(), String> {
    let Some((pos, size)) = saved.0.lock().unwrap_or_else(|e| e.into_inner()).take() else {
        return Ok(());
    };
    let main = app.get_webview_window("main").ok_or("fenêtre principale absente")?;
    main.set_always_on_top(false).map_err(err)?;
    main.set_decorations(true).map_err(err)?;
    main.set_size(size).map_err(err)?;
    main.set_position(pos).map_err(err)
}

/// C11a (P5) : `annotate` cachée (gardée pour la réentrée), `main` rendue à sa géométrie d'avant.
#[tauri::command]
fn annotation_exit(app: AppHandle, saved: State<'_, SavedGeometry>) -> Result<(), String> {
    if let Some(w) = app.get_webview_window(ANNOTATE) {
        w.set_ignore_cursor_events(false).map_err(err)?;
        w.hide().map_err(err)?;
    }
    restore_main(&app, &saved)
}

/// C11a (P13) : onglet d'annotation fermé : `annotate` détruite (sans `CloseRequested`).
#[tauri::command]
fn annotation_close(app: AppHandle, saved: State<'_, SavedGeometry>) -> Result<(), String> {
    if let Some(w) = app.get_webview_window(ANNOTATE) {
        w.destroy().map_err(err)?;
    }
    restore_main(&app, &saved)
}

/// C11a (P8, P9) : clic à travers `annotate` (tout ou rien par fenêtre).
#[tauri::command]
fn annotation_ignore(app: AppHandle, ignore: bool) -> Result<(), String> {
    match app.get_webview_window(ANNOTATE) {
        Some(w) => w.set_ignore_cursor_events(ignore).map_err(err),
        None => Ok(()),
    }
}

/// C11a (P9, DA5) : curseur en px CSS relatifs à la fenêtre appelante (`annotate`), ou `null` hors d'elle.
#[tauri::command]
fn annotation_cursor(window: tauri::WebviewWindow) -> Option<(f64, f64)> {
    let c = window.cursor_position().ok()?;
    let p = window.inner_position().ok()?;
    let s = window.inner_size().ok()?;
    let scale = window.scale_factor().ok()?;
    ann::cursor_in((c.x, c.y), AnnRect { x: p.x, y: p.y, w: s.width, h: s.height }, scale)
}

/// C11a (P16) : même exécutable, mêmes arguments, `GDK_BACKEND=x11` ; puis sortie (rien n'est modifié au démarrage).
#[tauri::command]
fn relaunch_compat(app: AppHandle) -> Result<(), String> {
    let exe = std::env::current_exe().map_err(err)?;
    let mut cmd = std::process::Command::new(exe);
    cmd.args(ann::relaunch_args(std::env::args_os()));
    for (k, v) in ann::compat_env() {
        cmd.env(k, v);
    }
    cmd.spawn().map_err(|e| format!("relance impossible : {e}"))?;
    app.exit(0);
    Ok(())
}
```
Dans `main()` : `.manage(SavedGeometry::default())` après `.manage(Launch(…))` ; dans `generate_handler!`, ajouter
`annotation_support, annotation_enter, annotation_exit, annotation_close, annotation_ignore, annotation_cursor, relaunch_compat`.
Remplacer `on_window_event` :
```rust
        .on_window_event(|window, event| match event {
            // C11a (P18) : seuls les dépôts de `main` (réduite à la barre en annotation) sont accordés et émis.
            WindowEvent::DragDrop(DragDropEvent::Drop { paths, position }) if window.label() == "main" => {
                let at = Point {
                    x: position.x,
                    y: position.y,
                };
                grant_and_emit(window.app_handle(), paths, Some(at));
            }
            // C11a (P13) : Alt+F4 ou Cmd+W sur `annotate` : comme Échap, la page principale sort de l'annotation.
            WindowEvent::CloseRequested { api, .. } if window.label() == ANNOTATE => {
                api.prevent_close();
                if let Err(e) = window.app_handle().emit_to("main", EXIT_REQUEST_EVENT, ()) {
                    eprintln!("RoomBoard : demande de sortie de l'annotation non transmise ({e})");
                }
            }
            // C11a (P13) : `main` détruite : `annotate` aussi, aucun processus caché ne reste.
            WindowEvent::Destroyed if window.label() == "main" => {
                if let Some(w) = window.app_handle().get_webview_window(ANNOTATE) {
                    let _ = w.destroy();
                }
            }
            _ => {}
        })
```
(`Emitter` est déjà importé : `emit_to` en vient.)

- [ ] **Étape 7 : `capabilities/annotate.json`.**
```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "annotate",
  "description": "Fenêtre d'annotation (C11a, P12) : événements avec la fenêtre principale (emitTo, listen) et commandes de la coque (annotation_cursor, annotation_ignore), appelées depuis Rust. Ni fichiers, ni boîtes, ni réglage de fenêtre par la page.",
  "windows": ["annotate"],
  "permissions": ["core:default"]
}
```

- [ ] **Étape 8 : `cargo check` de la coque** (commande bornée, GC2). Corriger toute erreur de compilation de `main.rs`
(signatures de `Monitor::position()`, `available_monitors()` sur `WebviewWindow` : lire les sources de tauri-2.12.5 au besoin).

- [ ] **Étape 9 : fiche `docs/essais/c11a-coque.md`.**
````markdown
# Essais C11a en coque — annotation de bureau (S5)

Pour : séances de Jérôme (PC, Mac, poste Linux X11, VM en Wayland). Rien de ceci ne se joue sur la VM en automatique.
Construire la coque comme dans `docs/essais/coque-windows.md` (§ 2) ou `coque-macos.md`, sur la branche du chantier.
Cocher chaque ligne ; noter l'écart en une phrase.

## C11a-1 — Démarrage en annotation (Windows 10 22H2, Windows 11, macOS 14, Linux X11)
- [ ] Profil « Annotation au démarrage », relancer : l'écran est couvert par l'annotation transparente, le bureau vivant se voit dessous.
- [ ] La barre seule est au premier plan, en bande du côté de son `dock`, cliquable ; aucune autre fenêtre RoomBoard ne la recouvre.
- [ ] Aucune entrée « annotate » dans la barre des tâches (Windows) ; aucun Space dédié (macOS).

## C11a-2 — Encre et stylet
- [ ] Écrire au stylet sur le bureau : le trait suit sans retard visible.
- [ ] Mesure de pression et de latence avec `proto-stylet.html` ouvert dans la fenêtre transparente (P30) : noter les valeurs.
- [ ] Ctrl+Z, Ctrl+Y dans l'annotation : annulent et rétablissent les traits de la séance.

## C11a-3 — Bascule dessin / souris
- [ ] Sélection : cliquer une icône du bureau à travers la fenêtre ; elle répond.
- [ ] En mode souris, cliquer un trait : il se sélectionne (sondage 30 ms, léger retard au survol accepté, HC11-7).
- [ ] Reprendre le Stylo : l'encre revient ; le bouton « Souris » / « Dessin » fait l'aller-retour.
- [ ] Toucher (doigt, TBI) un objet en mode souris : noter s'il passe au bureau (limite connue HC11-7).

## C11a-4 — Sortie et retour
- [ ] « Quitter l'annotation », puis Échap, puis Alt+F4 (Cmd+W) sur l'annotation : chaque fois le tableau revient, la fenêtre principale reprend sa taille et ses bords.
- [ ] L'onglet « Annotation » est dans les onglets avec les traits de la séance ; Ctrl+S l'enregistre ; le rouvrir montre les traits.
- [ ] Fermer l'onglet « Annotation » puis rentrer en annotation : une fenêtre neuve, vierge.
- [ ] Fermer l'application en annotation : sortie d'abord, puis la question de l'onglet modifié ; aucun processus RoomBoard ne reste (Gestionnaire des tâches, `ps`).

## C11a-5 — Zone de dépôt (comportement de S3)
- [ ] Depuis l'explorateur (Finder, gestionnaire de fichiers), déposer une image sur « Déposer ici » : l'annotation se ferme, l'image est sur la page montrée de l'onglet d'origine, avis « ajouté à la page N ».
- [ ] Rentrer, déposer un `.roomboard` : nouvel onglet ouvert et montré ; onglet d'origine inchangé.
- [ ] Déposer un fichier sur la zone transparente (hors barre) : rien ne se passe.

## C11a-6 — Deux écrans (échelles différentes si possible)
- [ ] L'annotation s'ouvre sur l'écran de la fenêtre principale.
- [ ] « Écran suivant » fait le tour des écrans ; la bande de barre garde sa place et son épaisseur sur chaque écran.
- [ ] Un seul écran : « Écran suivant » est grisé.

## C11a-7 — Wayland natif (VM Ubuntu, session GNOME Wayland)
- [ ] Profil « Annotation au démarrage » : démarrage sur le tableau, question « Annotation du bureau indisponible sous Wayland. Relancer en mode compatibilité ? ».
- [ ] Non : le tableau reste, l'entrée « Annotation du bureau » est absente de la barre.
- [ ] Oui : RoomBoard se relance (même fichier s'il était passé au lancement) ; sous XWayland, l'annotation fonctionne (refaire C11a-1 et C11a-3).
- [ ] Si la transparence n'est pas peinte (WebKitGTK) : le noter ; le repli sur le bureau figé arrive avec C11b (HC11-16).
````

- [ ] **Étape 10 : tsc, `coque-csp.test.sh`, `pnpm -r test`** (section « Test et commande bornée »).

- [ ] **Étape 11 : commit.**
```bash
cd $WT && git add apps/desktop/src-tauri/src/main.rs apps/desktop/src-tauri/capabilities/annotate.json apps/web/src/platform/annotation-tauri.ts apps/web/src/platform/annotation-tauri.test.ts docs/essais/c11a-coque.md
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "feat(desktop): annotate window commands, capability, shell windows host, trial sheet" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche T6 — Page `annotate` : rendu transparent, session, rejeu des commandes, aller-retour base64, sondage du curseur
<a id="tache-t6"></a>

**Objectif.** Le côté `annotate` sans DOM de fenêtre : option `transparent` du rendu Canvas 2D (P14), Canvas 2D forcé
et contexte alpha dans `annotate`, `SessionShared.transparent` ; puis `createAnnotationPage` : reçoit le `.roomboard` en
base64, le lit, dessine localement, rejoue les commandes de barre sur un hôte local, publie sa vue, rend
`{ id, base64, changed }`, Échap → demande de sortie (P24), et en mode souris (outil Sélection) sonde le curseur toutes
les 30 ms et coupe le clic à travers sur un objet ou pendant un geste tenu (P9, DA5) ; règle pure `passThrough`.

**Fichiers.**
- Modifier : `apps/web/src/engine/render/canvas2d.ts:30-47` (`Canvas2DOptions`), `:322-339` (constructeur), `:355-367` (`drawScene`), `:740-749` (`createCanvas2DRenderer`) ; `apps/web/src/engine/render/select.ts:42-63` (`chooseRenderer`) ; `apps/web/src/app/board-session.ts:58-80` (`SessionShared`), `:287-296` (options de `chooseRenderer`)
- Créer : `apps/web/src/app/annotation-page.ts`, `apps/web/src/app/annotation-page.test.ts`
- Test : `apps/web/src/engine/render/canvas2d.test.ts`, `apps/web/src/engine/render/select.test.ts`

**Interfaces.**
- Consomme (T3) : `ANNOTATION_EVENTS`, `CURSOR_POLL_MS`, `AnnotationCommand`, `DocumentPayload`, `CollectPayload`, `ReturnedPayload` (`platform/annotation-port.ts`).
- Produit : `Canvas2DOptions.transparent?: boolean` ; `chooseRenderer(…, opts)` force Canvas 2D quand `opts.transparent` ; `SessionShared.transparent?: boolean` ;
  `app/annotation-page.ts` : `passThrough(hit: boolean, holding: boolean): boolean`, `viewOf(s: EngineState): ToolbarView`,
  `interface PageChannel { emit<T>(event: string, payload: T): Promise<void>; listen<T>(event: string, cb: (payload: T) => void): Promise<() => void> }`,
  `interface AnnotationPageDeps { readonly channel: PageChannel; read(bytes: Uint8Array): Promise<{ readonly doc: CoreDocument; readonly assets: AssetStore } | null>; encode(doc: CoreDocument, assets: AssetStore): Promise<Uint8Array>; makeSession(doc: CoreDocument, assets: AssetStore): Promise<BoardSession>; cursor(): Promise<readonly [number, number] | null>; ignore(on: boolean): Promise<void>; readonly every?: (ms: number, cb: () => void) => () => void }`,
  `interface AnnotationPage { start(): Promise<void>; key(e: KeyLike): boolean; pointerDown(): void; pointerUp(): void; board(): BoardSession | null; dispose(): void }`,
  `function createAnnotationPage(d: AnnotationPageDeps): AnnotationPage`.
- Réutilise : `apps/web/src/app/board-session.ts:135` — `createBoardSession(doc, shared, assets)` avec `SessionShared.transparent?: boolean` (étendu ; appelé par l'amorce de T9 via `deps.makeSession`).
- Réutilise : `apps/web/src/engine/render/canvas2d.ts:355` — option `transparent` de `Canvas2DRenderer` (effacer au lieu de peindre) (étendu).
- Réutilise : `apps/web/src/app/toolbar-host.ts:81` — `createLocalToolbarHost(targets, profile)` sur la session de `annotate` (rejoue les commandes).
- Réutilise : `apps/web/src/engine/engine.ts:522` ; `engine/tools/select.ts:162` — `doc.hitTest(page, x, y, SELECT_TOL_PX / zoom)` après `screenToWorld(camera, x, y)` (`engine/camera.ts:16`).
- Réutilise : `apps/web/src/platform/clipboard.ts:23, 29` — `toBase64`, `fromBase64`.
- Réutilise : `apps/web/src/engine/page.ts:4-8` — constantes lues seulement (aucune modification).
- Règle `passThrough` : posée ici (et non dans `app/annotation.ts`) parce que seule la page `annotate` l'emploie ; T4 n'en dépend pas.

**Test et commande bornée.**
```bash
node ~/.claude/scripts/chaine/jeton.cjs --nom tests --proprietaire usage-c11a-annotation/T6 --places-par-sujet 3 --commande "cd $WT/apps/web && nice -n 10 pnpm exec vitest run src/engine/render/canvas2d.test.ts src/engine/render/select.test.ts src/app/annotation-page.test.ts src/app/board-session.test.ts > /tmp/c11a-T6-vitest.log 2>&1"; tail -20 /tmp/c11a-T6-vitest.log
```
Preuve attendue : `Test Files  4 passed (4)`, `Tests  N passed`, N ≥ 1 ; `grep -c "mode souris : sondage toutes les 30 ms" $WT/apps/web/src/app/annotation-page.test.ts` = 1 ; `grep -c "transparent : clearRect" $WT/apps/web/src/engine/render/canvas2d.test.ts` = 1.
Puis tsc (`tsc=0`) et `pnpm -r test` sous le jeton (`/tmp/c11a-T6-all.log`, aucun `FAIL ` ; le contrat `core/wasm-core.contract.test.ts` reste vert).

**Preuve visuelle.** Aucune automatique (la transparence se voit en coque : fiche C11a-1 de T5).

**Contraintes (recopiées de Global Constraints).**
- GC1 — Le chemin de l'encre ne traverse jamais la frontière page ↔ Rust natif ; entre fenêtres ne passent que des commandes de barre, l'état des boutons et le document entier en base64.
- GC3 — Builds et tests en `nice -n 10` ; `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`. Attention au `CARGO_TARGET_DIR` partagé entre worktrees : ne le pose pas, chaque worktree garde son `target/`.
- GC4 — Suites sous le jeton : `node ~/.claude/scripts/chaine/jeton.cjs --nom tests --proprietaire usage-c11a-annotation/T<n> --places-par-sujet 3 --commande "<commande bornée, sortie redirigée vers un fichier>"`.
- GC5 — Tests rapides du profil : `cargo test --workspace 2>&1 | tail -20` · `pnpm -r test 2>&1 | tail -20` ; complet : `scripts/verifier.sh --e2e`.
- GC7 — Tailles Wasm : module principal ≤ 1 572 864 o (aujourd'hui 1 374 398), formats ≤ 3 145 728 o (aujourd'hui 2 794 511) ; aucun seuil baissé ni relevé. (Ici : le cœur ne change pas, P14.)
- GC9 — Aucun test désactivé ou sauté, aucun seuil changé. Pas de `git add -A`/`.`, pas de `commit -a`, pas de `--force`. Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>` (via `git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit`), messages en anglais terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- GC10 — Aucune dépendance en AGPL/GPL/LGPL ; aucun paquet système installé ; aucun workflow GitHub.

**Interdits.** Aucun point d'encre émis (seules les charges `view`, `returned`, `exitRequest`, `ready`) ; aucun appel à
`annotation_ignore` quand l'état n'a pas changé ; le rendu sans `transparent` doit rester identique (même journal de
`FakeCtx`) ; aucun changement de `crates/`.

**Critère « terminé ».** Tests nommés verts (dont RF3), tsc 0, `pnpm -r test` sans `FAIL ` ; un commit. Rapport :
`Réutilisation : appelé board-session.ts:createBoardSession (étendu), canvas2d.ts:Canvas2DRenderer (étendu), toolbar-host.ts:createLocalToolbarHost, CoreDocument.hitTest, clipboard.ts:toBase64/fromBase64` ou `Réutilisation : écart — <pourquoi>`.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree** (bloc de T2, étape 1).

- [ ] **Étape 2 : tests rouges du rendu.** `canvas2d.test.ts` (fabrique `make` existante ; ajouter une variante) :
```ts
describe("C11a : rendu transparent (P14)", () => {
  const page = { id: "p", background: null, elements: [] } as unknown as Parameters<Canvas2DRenderer["drawScene"]>[0];
  it("transparent : clearRect, ni pourtour ni fond peints", () => {
    const scene = new FakeCtx();
    const r = new Canvas2DRenderer(asCtx(scene), asCtx(new FakeCtx()), { element: () => null, outline: () => null }, { makePath: () => new FakePath() as unknown as Path2D, transparent: true });
    r.resize(800, 600, 1);
    r.drawScene(page, IDENTITY, new Set());
    expect(scene.log).toContain("clearRect");
    expect(scene.log).not.toContain(`fillRect ${SURROUND_COLOR}`);
    expect(scene.log.some((l) => l.startsWith("fillRect") && l.includes(PAGE_BACKGROUND))).toBe(false);
  });
  it("défaut : pourtour puis fond peints, aucun clearRect (rendu inchangé)", () => {
    const scene = new FakeCtx();
    const r = new Canvas2DRenderer(asCtx(scene), asCtx(new FakeCtx()), { element: () => null, outline: () => null }, { makePath: () => new FakePath() as unknown as Path2D });
    r.resize(800, 600, 1);
    r.drawScene(page, IDENTITY, new Set());
    expect(scene.log).toContain(`fillRect ${SURROUND_COLOR}`);
    expect(scene.log).not.toContain("clearRect");
  });
});
```
Si le `PageView` minimal ci-dessus ne suffit pas à `drawScene`, reprendre le `PageView` d'un test voisin de `canvas2d.test.ts`
(même fichier) : seule l'option change entre les deux cas.
Pour le contexte alpha, ajouter à `canvas2d.test.ts` :
```ts
  it("createCanvas2DRenderer : scène alpha seulement si transparent", () => {
    const asked: unknown[] = [];
    const canvas = (ctx: FakeCtx) => ({ getContext: (_k: string, o?: unknown) => { asked.push(o); return asCtx(ctx); } }) as unknown as HTMLCanvasElement;
    createCanvas2DRenderer(canvas(new FakeCtx()), canvas(new FakeCtx()), { element: () => null, outline: () => null }, { transparent: true });
    createCanvas2DRenderer(canvas(new FakeCtx()), canvas(new FakeCtx()), { element: () => null, outline: () => null });
    expect(asked[0]).toEqual({ alpha: true });
    expect(asked[2]).toEqual({ alpha: false });
  });
```
`select.test.ts` :
```ts
  it("C11a : transparent → Canvas 2D même si WebGL2 demandé, WebGL2 jamais demandé", () => {
    const scene = new FakeCanvas({ "2d": ctx2d() });
    const live = new FakeCanvas({ "2d": ctx2d(), webgl2: new FakeGL() });
    const c = chooseRenderer(el(scene), el(live), SRC, true, { transparent: true });
    expect(c.renderer).toBeInstanceOf(Canvas2DRenderer);
    expect(c.webgl).toBe(false);
    expect(live.asked).toEqual(["2d"]);
  });
```

- [ ] **Étape 3 : tests rouges de la page** `apps/web/src/app/annotation-page.test.ts`.
```ts
import { describe, expect, it, vi } from "vitest";
import type { CoreDocument } from "../core/api";
import { createAssetStore, type AssetStore } from "../core/asset-store";
import { fakeCore } from "../core/fake-core";
import type { EngineState } from "../engine/engine";
import { ANNOTATION_EVENTS } from "../platform/annotation-port";
import { toBase64 } from "../platform/clipboard";
import { BUILTIN_PROFILES } from "../toolbar-profiles";
import type { BoardSession } from "./board-session";
import { createAnnotationPage, passThrough, type PageChannel } from "./annotation-page";

function channel() {
  const listeners = new Map<string, (p: unknown) => void>();
  const out: { event: string; payload: unknown }[] = [];
  const ch: PageChannel = {
    async emit(event, payload) {
      out.push({ event, payload: JSON.parse(JSON.stringify(payload ?? null)) });
    },
    async listen(event, cb) {
      listeners.set(event, cb as (p: unknown) => void);
      return () => listeners.delete(event);
    },
  };
  const send = (event: string, payload: unknown) => listeners.get(event)?.(JSON.parse(JSON.stringify(payload)));
  return { ch, out, send };
}

function fakeBoard(doc: CoreDocument) {
  let tool = "pen";
  const cbs = new Set<(s: EngineState) => void>();
  const state = () => ({ tool, eraserMode: "partial", canUndo: false, canRedo: false, page: doc.pageIds()[0] ?? "", pageIndex: 0, pageCount: 1, selection: [], selectionBounds: null, selectionUnits: 0, selectionGrouped: false, tableCell: null, tableMerges: 0, tableShades: 0, textFormat: null, elementCount: 0, version: doc.version(), error: null }) as unknown as EngineState;
  const engine = {
    state,
    onState: (cb: (s: EngineState) => void) => { cbs.add(cb); return () => cbs.delete(cb); },
    camera: () => ({ zoom: 1, tx: 0, ty: 0 }),
    key: vi.fn(() => true),
    setTool: vi.fn((t: string) => { tool = t; for (const cb of cbs) cb(state()); }),
    setPenStyle: vi.fn(), setFillColor: vi.fn(), setFillTolerance: vi.fn(), setEraserMode: vi.fn(), undo: vi.fn(), redo: vi.fn(), textFormat: vi.fn(),
    bump: () => { for (const cb of cbs) cb(state()); },
  };
  const board = { doc, engine, stage: {}, activate: vi.fn(), dispose: vi.fn() } as unknown as BoardSession;
  return { board, engine };
}

function setup(o: { hit?: boolean } = {}) {
  const c = channel();
  const boards: ReturnType<typeof fakeBoard>[] = [];
  const ignores: boolean[] = [];
  let tick: (() => void) | null = null;
  let stops = 0;
  const page = createAnnotationPage({
    channel: c.ch,
    read: async (bytes) => ({ doc: fakeCore.load(bytes), assets: createAssetStore() }),
    encode: async (doc: CoreDocument, _a: AssetStore) => doc.save("2026-11-23T00:00:00Z", "0.1.0"),
    makeSession: async (doc) => {
      const b = fakeBoard(doc);
      if (o.hit !== undefined) (doc as unknown as { hitTest: () => string | null }).hitTest = () => (o.hit ? "e1" : null);
      boards.push(b);
      return b.board;
    },
    cursor: async () => [10, 10] as const,
    ignore: async (on) => {
      ignores.push(on);
    },
    every: (_ms, cb) => {
      tick = cb;
      return () => {
        stops += 1;
        tick = null;
      };
    },
  });
  return { page, c, boards, ignores, tick: async () => { tick?.(); await new Promise((r) => setTimeout(r, 0)); }, stops: () => stops, polling: () => tick !== null };
}
const blank = () => toBase64(fakeCore.blank().save("2026-11-23T00:00:00Z", "0.1.0"));
const flush = () => new Promise((r) => setTimeout(r, 0));

describe("page annotate (C11a, P2, P4, P9, P24)", () => {
  it("passThrough : vrai hors objet, faux sur un objet et pendant un geste tenu", () => {
    expect(passThrough(false, false)).toBe(true);
    expect(passThrough(true, false)).toBe(false);
    expect(passThrough(false, true)).toBe(false);
    expect(passThrough(true, true)).toBe(false);
  });
  it("start : écoute posée puis ready", async () => {
    const { page, c } = setup();
    await page.start();
    expect(c.out.map((m) => m.event)).toEqual([ANNOTATION_EVENTS.ready]);
  });
  it("document : lu depuis le base64, session créée et activée, vue publiée", async () => {
    const { page, c, boards } = setup();
    await page.start();
    c.send(ANNOTATION_EVENTS.document, { base64: blank() });
    await flush();
    expect(boards).toHaveLength(1);
    expect(boards[0]!.board.activate).toHaveBeenCalled();
    expect(c.out.at(-1)!.event).toBe(ANNOTATION_EVENTS.view);
    expect(c.out.at(-1)!.payload).toMatchObject({ tool: "pen", pageCount: 1 });
  });
  it("base64 illisible : ignoré, aucune session (RF3)", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { page, c, boards } = setup();
    await page.start();
    c.send(ANNOTATION_EVENTS.document, { base64: "@@@" });
    await flush();
    expect(boards).toHaveLength(0);
    expect(page.board()).toBeNull();
    warn.mockRestore();
  });
  it("commande setTool rejouée sur l'hôte local, préréglage du profil reçu", async () => {
    const { page, c, boards } = setup();
    await page.start();
    c.send(ANNOTATION_EVENTS.profile, BUILTIN_PROFILES[0]);
    c.send(ANNOTATION_EVENTS.document, { base64: blank() });
    await flush();
    c.send(ANNOTATION_EVENTS.command, { kind: "setTool", tool: "pen", preset: "rouge" });
    expect(boards[0]!.engine.setPenStyle).toHaveBeenCalledWith({ color: "#dc2626", width: 4 });
    expect(boards[0]!.engine.setTool).toHaveBeenCalledWith("pen");
    c.send(ANNOTATION_EVENTS.command, { kind: "runAction", id: "undo" });
    expect(boards[0]!.engine.undo).toHaveBeenCalled();
  });
  it("collect : { id, base64, changed: false } sans trait ; changed vrai après un trait", async () => {
    const { page, c, boards } = setup();
    await page.start();
    c.send(ANNOTATION_EVENTS.document, { base64: blank() });
    await flush();
    c.send(ANNOTATION_EVENTS.collect, { id: 4 });
    await flush();
    expect(c.out.at(-1)).toMatchObject({ event: ANNOTATION_EVENTS.returned, payload: { id: 4, changed: false } });
    const doc = boards[0]!.board.doc;
    doc.apply({ type: "CommitStroke", page: doc.pageIds()[0]!, points: new Float32Array([0, 10, 0.5, 50, 10, 0.5]), style: { color: "#000000", width: 4 } });
    c.send(ANNOTATION_EVENTS.collect, { id: 5 });
    await flush();
    const back = c.out.at(-1)!.payload as { id: number; base64: string; changed: boolean };
    expect(back).toMatchObject({ id: 5, changed: true });
    expect(typeof back.base64).toBe("string");
  });
  it("nouveau document : ancienne session libérée", async () => {
    const { page, c, boards } = setup();
    await page.start();
    c.send(ANNOTATION_EVENTS.document, { base64: blank() });
    await flush();
    c.send(ANNOTATION_EVENTS.document, { base64: blank() });
    await flush();
    expect(boards).toHaveLength(2);
    expect(boards[0]!.board.dispose).toHaveBeenCalled();
  });
  it("Échap → demande de sortie ; Ctrl+Z → engine.key", async () => {
    const { page, c, boards } = setup();
    await page.start();
    c.send(ANNOTATION_EVENTS.document, { base64: blank() });
    await flush();
    const k = (key: string, ctrlKey = false) => ({ key, ctrlKey, metaKey: false, shiftKey: false, altKey: false, isComposing: false, target: null });
    expect(page.key(k("Escape"))).toBe(true);
    await flush();
    expect(c.out.at(-1)!.event).toBe(ANNOTATION_EVENTS.exitRequest);
    page.key(k("z", true));
    expect(boards[0]!.engine.key).toHaveBeenCalled();
  });
  it("mode souris : sondage toutes les 30 ms, objet → clic capté, geste tenu → capté, arrêt en quittant Sélection", async () => {
    const onObject = setup({ hit: true });
    await onObject.page.start();
    onObject.c.send(ANNOTATION_EVENTS.document, { base64: blank() });
    await flush();
    expect(onObject.polling()).toBe(false);
    onObject.c.send(ANNOTATION_EVENTS.command, { kind: "setTool", tool: "select" });
    expect(onObject.polling()).toBe(true);
    await onObject.tick();
    expect(onObject.ignores.at(-1)).toBe(false);
    await onObject.tick();
    expect(onObject.ignores).toHaveLength(1); // état inchangé : aucun appel de plus

    const empty = setup({ hit: false });
    await empty.page.start();
    empty.c.send(ANNOTATION_EVENTS.document, { base64: blank() });
    await flush();
    empty.c.send(ANNOTATION_EVENTS.command, { kind: "setTool", tool: "select" });
    await empty.tick();
    expect(empty.ignores.at(-1)).toBe(true);
    empty.page.pointerDown();
    await empty.tick();
    expect(empty.ignores.at(-1)).toBe(false);
    empty.page.pointerUp();
    empty.c.send(ANNOTATION_EVENTS.command, { kind: "setTool", tool: "pen" });
    await flush();
    expect(empty.polling()).toBe(false);
    expect(empty.stops()).toBe(1);
    expect(empty.ignores.at(-1)).toBe(false);
  });
});
```

- [ ] **Étape 4 : vérifier l'échec** (commande bornée). Attendu : option `transparent` sans effet, module `./annotation-page` introuvable.

- [ ] **Étape 5 : rendu.** `canvas2d.ts` : dans `Canvas2DOptions`,
`/** C11a (P14) : fenêtre d'annotation : pourtour et fond de page effacés au lieu d'être peints ; défaut faux. */ readonly transparent?: boolean;` ;
champ `private readonly transparent: boolean;` initialisé dans le constructeur par `this.transparent = opts.transparent === true;` ;
dans `drawScene`, remplacer les deux peintures :
```ts
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (this.transparent) ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    else {
      ctx.fillStyle = SURROUND_COLOR;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }
    this.setView(ctx, camera);
    ctx.fillStyle = PAGE_BACKGROUND;
    ctx.fillStyle = page.background ?? PAGE_BACKGROUND;
    this.background = String(ctx.fillStyle);
    const rect = visiblePageRect(camera, this.cssHeight);
    if (rect && !this.transparent) ctx.fillRect(rect.x0, rect.y0, rect.x1 - rect.x0, rect.y1 - rect.y0);
```
`createCanvas2DRenderer` : `scene.getContext("2d", { alpha: opts.transparent === true })`.
`select.ts`, `chooseRenderer` : première ligne `if (!wantWebgl || opts.transparent === true) {` (même retour Canvas 2D qu'aujourd'hui).
`board-session.ts`, `SessionShared` :
`/** C11a (P14) : fenêtre `annotate` : rendu Canvas 2D transparent, jamais WebGL2 ; absent : rendu ordinaire. */ readonly transparent?: boolean;` ;
dans l'appel `chooseRenderer(…, {`, ajouter `...(shared.transparent === true ? { transparent: true } : {}),`.
L'aperçu de la gomme partielle (`canvas2d.ts:730`, HC11-15) n'est pas changé : il reste « à vérifier à l'exécution » (fiche C11a-2).

- [ ] **Étape 6 : écrire `app/annotation-page.ts`.**
```ts
/**
 * Page de la fenêtre `annotate` (C11a, P2, P4, P9, P21, P24, DA5) : reçoit le `.roomboard` en base64 à chaque entrée, le
 * lit et y dessine localement (l'historique repart du document reçu) ; rejoue les commandes de barre sur un hôte local ;
 * publie sa vue de barre ; rend `{ id, base64, changed }` à la demande ; Échap demande la sortie. En mode souris (outil
 * Sélection), sonde le curseur et coupe le clic à travers sur un objet ou pendant un geste tenu. Aucun point d'encre ne
 * sort de la page.
 */
import type { CoreDocument } from "../core/api";
import type { AssetStore } from "../core/asset-store";
import { screenToWorld } from "../engine/camera";
import type { EngineState } from "../engine/engine";
import type { KeyLike } from "../engine/input/keys";
import { SELECT_TOL_PX } from "../engine/tools/select";
import {
  ANNOTATION_EVENTS,
  CURSOR_POLL_MS,
  type AnnotationCommand,
  type CollectPayload,
  type DocumentPayload,
  type ReturnedPayload,
} from "../platform/annotation-port";
import { fromBase64, toBase64 } from "../platform/clipboard";
import type { Profile } from "../toolbar";
import { BUILTIN_PROFILES } from "../toolbar-profiles";
import type { ToolbarView } from "../ui/item-state";
import type { BoardSession } from "./board-session";
import { createLocalToolbarHost, type HostTargets } from "./toolbar-host";

/** P9 : clic à travers seulement hors objet et hors geste tenu. */
export function passThrough(hit: boolean, holding: boolean): boolean {
  return !hit && !holding;
}

/** Vue de barre publiée : les champs de `ToolbarView` que l'état du moteur porte, sans la sélection ni le tableau. */
export function viewOf(s: EngineState): ToolbarView {
  return {
    tool: s.tool,
    eraserMode: s.eraserMode,
    canUndo: s.canUndo,
    canRedo: s.canRedo,
    pageIndex: s.pageIndex,
    pageCount: s.pageCount,
    textFormat: s.textFormat,
    ...(s.fillTolerance === undefined ? {} : { fillTolerance: s.fillTolerance }),
  };
}

export interface PageChannel {
  /** `emitTo("main", …)`. */
  emit<T>(event: string, payload: T): Promise<void>;
  listen<T>(event: string, cb: (payload: T) => void): Promise<() => void>;
}

export interface AnnotationPageDeps {
  readonly channel: PageChannel;
  read(bytes: Uint8Array): Promise<{ readonly doc: CoreDocument; readonly assets: AssetStore } | null>;
  encode(doc: CoreDocument, assets: AssetStore): Promise<Uint8Array>;
  makeSession(doc: CoreDocument, assets: AssetStore): Promise<BoardSession>;
  /** `annotation_cursor` : px CSS relatifs à la fenêtre, ou null hors d'elle. */
  cursor(): Promise<readonly [number, number] | null>;
  /** `annotation_ignore`. */
  ignore(on: boolean): Promise<void>;
  readonly every?: (ms: number, cb: () => void) => () => void;
}

export interface AnnotationPage {
  start(): Promise<void>;
  key(e: KeyLike): boolean;
  pointerDown(): void;
  pointerUp(): void;
  board(): BoardSession | null;
  dispose(): void;
}

const defaultEvery = (ms: number, cb: () => void): (() => void) => {
  const h = setInterval(cb, ms);
  return () => clearInterval(h);
};

export function createAnnotationPage(d: AnnotationPageDeps): AnnotationPage {
  const every = d.every ?? defaultEvery;
  let board: BoardSession | null = null;
  let assets: AssetStore | null = null;
  let loaded = 0;
  let profile: Profile = BUILTIN_PROFILES[0]!;
  let stopState: (() => void) | null = null;
  let stopPoll: (() => void) | null = null;
  let holding = false;
  let through: boolean | null = null;
  const offs: Array<() => void> = [];

  const targets: HostTargets = {
    engine: () => {
      if (board === null) throw new Error("aucun document d'annotation");
      return board.engine;
    },
    runFile: () => undefined,
    importFiles: () => undefined,
    toggle: () => undefined,
    insertPages: () => undefined,
    selection: () => undefined,
  };
  const host = createLocalToolbarHost(targets, () => profile);

  const setThrough = async (v: boolean): Promise<void> => {
    if (through === v) return;
    through = v;
    await d.ignore(v);
  };
  const poll = async (): Promise<void> => {
    const b = board;
    if (b === null) return;
    const at = await d.cursor();
    let hit = false;
    if (at !== null) {
      const cam = b.engine.camera();
      const [x, y] = screenToWorld(cam, at[0], at[1]);
      hit = b.doc.hitTest(b.engine.state().page, x, y, SELECT_TOL_PX / cam.zoom) !== null;
    }
    await setThrough(passThrough(hit, holding));
  };
  /** Sélection = souris (P8) : sondage tant que l'outil est Sélection ; ailleurs, la fenêtre capte tout. */
  const follow = (tool: string): void => {
    const mouse = tool === "select";
    if (mouse && stopPoll === null) {
      through = null;
      stopPoll = every(CURSOR_POLL_MS, () => {
        void poll().catch(() => undefined);
      });
    } else if (!mouse && stopPoll !== null) {
      stopPoll();
      stopPoll = null;
      through = null;
      void setThrough(false).catch(() => undefined);
    }
  };
  const publish = (s: EngineState): void => {
    void d.channel.emit(ANNOTATION_EVENTS.view, viewOf(s));
  };
  const release = (): void => {
    stopState?.();
    stopState = null;
    if (stopPoll !== null) {
      stopPoll();
      stopPoll = null;
    }
    board?.dispose();
    board = null;
    assets = null;
  };

  async function load(p: DocumentPayload): Promise<void> {
    const bytes = typeof p?.base64 === "string" ? fromBase64(p.base64) : null;
    if (bytes === null) {
      console.warn("RoomBoard : document d'annotation illisible (base64)");
      return;
    }
    const read = await d.read(bytes);
    if (read === null) return;
    release();
    const b = await d.makeSession(read.doc, read.assets);
    board = b;
    assets = read.assets;
    b.activate();
    loaded = b.engine.state().version;
    stopState = b.engine.onState((s) => {
      follow(s.tool);
      publish(s);
    });
    follow(b.engine.state().tool);
    publish(b.engine.state());
  }

  async function collect(r: CollectPayload): Promise<void> {
    const b = board;
    const a = assets;
    const payload: ReturnedPayload =
      b === null || a === null
        ? { id: r.id, base64: "", changed: false }
        : { id: r.id, base64: toBase64(await d.encode(b.doc, a)), changed: b.engine.state().version !== loaded };
    await d.channel.emit(ANNOTATION_EVENTS.returned, payload);
  }

  function replay(m: AnnotationCommand): void {
    if (board === null) return;
    if (m.kind === "setTool") host.setTool(m.tool, m.preset);
    else if (m.kind === "runAction") host.runAction(m.id);
    else if (m.kind === "fillColor") host.fillColor(m.color);
    else if (m.kind === "fillTolerance") host.fillTolerance(m.value);
    else host.textFormat(m.action);
  }

  return {
    async start() {
      offs.push(
        await d.channel.listen<AnnotationCommand>(ANNOTATION_EVENTS.command, replay),
        await d.channel.listen<Profile>(ANNOTATION_EVENTS.profile, (p) => {
          profile = p;
        }),
        await d.channel.listen<DocumentPayload>(ANNOTATION_EVENTS.document, (p) => {
          void load(p).catch((e: unknown) => console.warn(`RoomBoard : document d'annotation non chargé (${String(e)})`));
        }),
        await d.channel.listen<CollectPayload>(ANNOTATION_EVENTS.collect, (r) => {
          void collect(r).catch((e: unknown) => console.warn(`RoomBoard : document d'annotation non rendu (${String(e)})`));
        }),
      );
      await d.channel.emit(ANNOTATION_EVENTS.ready, {});
    },
    key(e) {
      if (e.key === "Escape") {
        void d.channel.emit(ANNOTATION_EVENTS.exitRequest, {});
        return true;
      }
      return board?.engine.key(e) ?? false;
    },
    pointerDown() {
      holding = true;
    },
    pointerUp() {
      holding = false;
    },
    board: () => board,
    dispose() {
      for (const off of offs.splice(0)) off();
      release();
    },
  };
}
```
Si `fakeCore.load` n'est pas le nom de la lecture d'un `.roomboard` par le faux cœur, prendre celui que
`app/container-io.ts:76` appelle (`core.load(b)`).

- [ ] **Étape 7 : vérifier le vert**, tsc, `pnpm -r test` (section « Test et commande bornée »).

- [ ] **Étape 8 : commit.**
```bash
cd $WT && git add apps/web/src/engine/render/canvas2d.ts apps/web/src/engine/render/canvas2d.test.ts apps/web/src/engine/render/select.ts apps/web/src/engine/render/select.test.ts apps/web/src/app/board-session.ts apps/web/src/app/annotation-page.ts apps/web/src/app/annotation-page.test.ts
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "feat(annotation): transparent Canvas 2D, annotate page (base64 round trip, cursor polling)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche T7 — Espace de travail : onglet d'annotation, remplacement, fermeture détournée, dépôt routé
<a id="tache-t7"></a>

**Objectif.** Dans `workspace.ts` : l'onglet `kind: "annotation"` créé vierge et non montré, réutilisé s'il existe,
refusé au plafond (P3) ; `encodeTab` ; `replaceAnnotation(bytes)` qui garde la place, l'id, la cible d'enregistrement et
l'état actif, marque « modifié » et libère l'ancienne session (P4) ; la fermeture de l'application détournée en
annotation (P25) ; `quitRequested` qui sort d'abord ; le dépôt natif routé vers le contrôleur en annotation (P17, P18) ;
la fermeture de l'onglet d'annotation qui détruit `annotate` (P13).

**Fichiers.**
- Modifier : `apps/web/src/app/workspace.ts:68-135` (`WorkspaceDeps`), `:136-189` (`Workspace`), `:314-370` (`addTab`), `:760-763` (`quitRequested`), `:832-841` (`closeTab`), `:822-827` (garde et dépôt)
- Test : `apps/web/src/app/workspace.test.ts`

**Interfaces.**
- Consomme (T3) : `AnnotationControl` (`platform/annotation-port.ts`) ; `Tabs.add("annotation", s, false)`, `Tabs.replace(id, s)`, `type TabKind` (`app/tabs.ts`) ; `FileControllerDeps.dirty`, `FileController.target()` ; `ShellPort.guardClose(isDirty, message, divert?)`.
- Produit :
  - `export type AnnotationGate = Pick<AnnotationControl, "state" | "exit" | "dropOnZone" | "close">`
  - `WorkspaceDeps.annotation?(): AnnotationGate | null` (lu à chaque appel) ; `WorkspaceDeps.quit?(): Promise<void>`
  - `Workspace.annotationTab(): Promise<TabSession | null>` ; `Workspace.encodeTab(tab: TabSession): Promise<Uint8Array>` ; `Workspace.replaceAnnotation(bytes: Uint8Array): Promise<boolean>`
- Réutilise : `apps/web/src/app/tabs.ts:40` (`add(kind, session)`) ; `app/workspace.ts:314` (`addTab`) ; `ui/TabsBar.tsx:18` — `tabs.add("annotation", tab)` ; `ws.annotationTab(): TabSession` (crée vierge ou rend l'existant ; ici `Promise<TabSession | null>`, la création étant asynchrone) ; le remplacement est `ws.replaceAnnotation(bytes)` (P4), forme que le tableau des modules écrit `ws.replaceDocument(tab, bytes)` ; `TabEntry.kind` lu par `TabsBar` (T8).
- Réutilise : `apps/web/src/app/tabs.ts:40` ; `platform/controller.ts:87` — `Tabs.replace(id, session)` ; `FileControllerDeps.dirty?: boolean` ; `FileController.target(): SaveTarget | null` (posés par T3, appelés ici).
- Réutilise : `apps/web/src/app/container-io.ts:61, 64` — `io.encode(doc, assets, now, appVersion, { kind: "document" })` ; `io.read(name, bytes, "document")`.
- Réutilise : `apps/web/src/platform/files.ts:123` (`ShellPort.guardClose`) ; `workspace.ts:761, 822` — `guardClose(isDirty, message, divert)` avec `divert = () => { if (!annotation.state().active) return false; void annotation.exit().then(() => ws.quitRequested(quit)); return true; }` ; `quitRequested` sort d'abord.
- Réutilise : `apps/web/src/app/workspace.ts:823` (`host.onDrop`) — gestionnaire routé : `annotation.state().active ? annotation.dropOnZone(f, at) : ws.importFiles(f, at)`.
- Réutilise : `apps/web/src/app/workspace.ts:406` (`anyDirty`) — inchangé : l'onglet d'annotation compte comme un onglet ordinaire.

**Test et commande bornée.**
```bash
node ~/.claude/scripts/chaine/jeton.cjs --nom tests --proprietaire usage-c11a-annotation/T7 --places-par-sujet 3 --commande "cd $WT/apps/web && nice -n 10 pnpm exec vitest run src/app/workspace.test.ts > /tmp/c11a-T7-vitest.log 2>&1"; tail -20 /tmp/c11a-T7-vitest.log
```
Preuve attendue : `Test Files  1 passed (1)`, `Tests  N passed`, N ≥ 1 ; `grep -c "replaceAnnotation : même place, même cible, modifié" $WT/apps/web/src/app/workspace.test.ts` = 1.
Puis tsc (`tsc=0`) et `pnpm -r test` sous le jeton (`/tmp/c11a-T7-all.log`, aucun `FAIL `).

**Preuve visuelle.** Aucune.

**Contraintes (recopiées de Global Constraints).**
- GC3 — Builds et tests en `nice -n 10` ; `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`. Attention au `CARGO_TARGET_DIR` partagé entre worktrees : ne le pose pas, chaque worktree garde son `target/`.
- GC4 — Suites sous le jeton : `node ~/.claude/scripts/chaine/jeton.cjs --nom tests --proprietaire usage-c11a-annotation/T<n> --places-par-sujet 3 --commande "<commande bornée, sortie redirigée vers un fichier>"`.
- GC5 — Tests rapides du profil : `cargo test --workspace 2>&1 | tail -20` · `pnpm -r test 2>&1 | tail -20` ; complet : `scripts/verifier.sh --e2e`.
- GC6 — Compatibilité : un fichier `.roomboard` et un profil d'avant C11a s'ouvrent toujours (test).
- GC9 — Aucun test désactivé ou sauté, aucun seuil changé. Pas de `git add -A`/`.`, pas de `commit -a`, pas de `--force`. Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>` (via `git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit`), messages en anglais terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- GC10 — Aucune dépendance en AGPL/GPL/LGPL ; aucun paquet système installé ; aucun workflow GitHub.

**Patron à ne pas reprendre (concepteur-critique).**
- Remplacer par `ws.close(id)` puis `openDocument(…)` (ou `tabs.remove` + `tabs.add`) : l'onglet change de place et d'id,
  perd sa cible d'enregistrement (Ctrl+S redemanderait un nom) et la fermeture pose la question « modifié ». Chemins de
  référence : `apps/web/src/app/workspace.ts:832-841` (`closeTab`, à ne pas appeler ici) et `:418-433` (`openDocument`,
  à ne pas appeler ici). Le remplacement passe par `addTab(…, { replace: id })` → `tabs.replace(id, tab)` puis
  `release(ancienne)`, après le `show()` déclenché par `tabs.replace` (l'ancienne est désactivée avant d'être libérée).
- Poser une seconde garde de fermeture pour l'annotation : il n'y en a qu'une (`workspace.ts:822`, CL5b-6) ; `divert`
  est son troisième paramètre.
- Lire `deps.annotation` une fois à la création : le contrôleur est créé **après** l'espace de travail (il en dépend) ;
  `deps.annotation?.()` est relu à chaque appel.

**Interdits.** Ne pas écrire le `kind` d'onglet dans le fichier (P26) ; aucun changement de `importFiles`,
`openDocument`, `anyDirty` ; aucune question propre à l'annotation (P25) ; ne pas toucher `tabs.ts`, `controller.ts`.

**Critère « terminé ».** Tests nommés verts, tsc 0, `pnpm -r test` sans `FAIL ` ; un commit. Rapport :
`Réutilisation : appelé tabs.ts:add/replace, controller.ts:target/dirty, container-io.ts:encode/read, files.ts:guardClose(divert), workspace.ts:addTab (étendu)` ou `Réutilisation : écart — <pourquoi>`.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree** (bloc de T2, étape 1).

- [ ] **Étape 2 : adapter la fabrique de test.** Dans `workspace.test.ts` : `let divert: (() => boolean) | null;`
(remis à `null` dans `beforeEach`) ; le faux `shell.guardClose` devient
`vi.fn((isDirty: () => boolean, _message: string, d?: () => boolean) => { guard = isDirty; divert = d ?? null; return () => { guardStops += 1; }; })`
(et son type `ReturnType<typeof vi.fn<(isDirty: () => boolean, message: string, divert?: () => boolean) => () => void>>`) ;
`SetupOptions` gagne `readonly annotation?: WorkspaceDeps["annotation"]; readonly quit?: WorkspaceDeps["quit"];`, passés
par `...(o.annotation ? { annotation: o.annotation } : {}), ...(o.quit ? { quit: o.quit } : {})`. Ajouter :
```ts
function fakeGate(active = true) {
  const log: string[] = [];
  let on = active;
  const g = {
    state: () => ({ active: on, pointer: "draw" as const, screen: null, screens: 1 }),
    exit: vi.fn(async () => {
      log.push("exit");
      on = false;
    }),
    dropOnZone: vi.fn(async () => {
      log.push("drop");
    }),
    close: vi.fn(async () => {
      log.push("close");
      return true;
    }),
  };
  return { g, log };
}
```

- [ ] **Étape 3 : tests rouges.**
```ts
describe("C11a : onglet d'annotation (P3, P4, P13, P17, P25)", () => {
  it("annotationTab : crée un onglet annotation vierge, non montré, puis rend le même", async () => {
    const ws = await setupWorkspace();
    const first = ws.active();
    const a = await ws.annotationTab();
    expect(a).not.toBeNull();
    expect(ws.tabs.list().map((t) => t.kind)).toEqual(["board", "annotation"]);
    expect(ws.active()).toBe(first);
    expect(await ws.annotationTab()).toBe(a);
    expect(ws.tabs.list()).toHaveLength(2);
  });
  it("plafond : 12 onglets sans onglet d'annotation → null, avis, aucun onglet ajouté", async () => {
    const ws = await setupWorkspace();
    while (ws.tabs.list().length < MAX_TABS) await ws.newBlank();
    expect(await ws.annotationTab()).toBeNull();
    expect(shell.notify).toHaveBeenCalledWith(TOO_MANY_TABS);
    expect(ws.tabs.list().some((t) => t.kind === "annotation")).toBe(false);
  });
  it("replaceAnnotation : même place, même cible, modifié ; ancienne session libérée ; onglet actif inchangé", async () => {
    const ws = await setupWorkspace();
    const a = (await ws.annotationTab())!;
    await ws.newBlank();
    const shownBefore = ws.active();
    await a.files.run("saveAs");
    const target = a.files.target();
    const entry = ws.tabs.list().find((t) => t.kind === "annotation")!;
    const doc = fakeCore.blank();
    doc.apply({ type: "CommitStroke", page: doc.pageIds()[0]!, points: new Float32Array([0, 10, 0.5, 50, 10, 0.5]), style: { color: "#000000", width: 4 } });
    expect(await ws.replaceAnnotation(doc.save("2026-11-23T00:00:00Z", APP_VERSION))).toBe(true);
    const after = ws.tabs.list().find((t) => t.kind === "annotation")!;
    expect(after.id).toBe(entry.id);
    expect(ws.tabs.list().indexOf(after)).toBe(1);
    expect(after.session).not.toBe(a);
    expect(after.session.files.isDirty()).toBe(true);
    expect(after.session.files.target()).toEqual(target);
    expect(after.session.board.doc.elementIds(after.session.board.doc.pageIds()[0]!)).toHaveLength(1);
    expect((a.board.dispose as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
    expect(ws.active()).toBe(shownBefore);
  });
  it("replaceAnnotation : octets illisibles → false, onglet gardé", async () => {
    const ws = await setupWorkspace();
    const a = (await ws.annotationTab())!;
    codec.read.mockRejectedValueOnce(new Error("illisible"));
    expect(await ws.replaceAnnotation(new Uint8Array([1, 2, 3]))).toBe(false);
    expect(ws.tabs.list().find((t) => t.kind === "annotation")!.session).toBe(a);
  });
  it("encodeTab : l'onglet d'annotation s'enregistre en document ordinaire (le kind n'est pas écrit) et se rouvre en onglet board", async () => {
    const ws = await setupWorkspace();
    const a = (await ws.annotationTab())!;
    const bytes = await ws.encodeTab(a);
    expect(await ws.openDocument({ name: "x.roomboard", bytes, target: null })).toBe(true);
    expect(ws.tabs.list().at(-1)!.kind).toBe("board");
  });
  it("un .roomboard d'avant C11a s'ouvre toujours (GC6)", async () => {
    const ws = await setupWorkspace();
    const old = fakeCore.blank().save("2026-11-20T00:00:00Z", "0.1.0");
    expect(await ws.openDocument({ name: "ancien.roomboard", bytes: old, target: null })).toBe(true);
  });
  it("fermeture de l'application en annotation : refusée (divert vrai), sortie, puis quitRequested(quit)", async () => {
    const { g, log } = fakeGate(true);
    const quit = vi.fn(async () => {
      log.push("quit");
    });
    await setupWorkspace({ annotation: () => g, quit });
    expect(divert).not.toBeNull();
    expect(divert!()).toBe(true);
    await vi.waitFor(() => expect(quit).toHaveBeenCalled());
    expect(log).toEqual(["exit", "quit"]);
  });
  it("hors annotation (ou sans contrôleur) : divert faux", async () => {
    await setupWorkspace({ annotation: () => fakeGate(false).g });
    expect(divert!()).toBe(false);
    await setupWorkspace();
    expect(divert!()).toBe(false);
  });
  it("quitRequested en annotation : sortie d'abord, puis la garde ordinaire", async () => {
    const { g, log } = fakeGate(true);
    const ws = await setupWorkspace({ annotation: () => g });
    await ws.quitRequested(async () => {
      log.push("quit");
    });
    expect(log).toEqual(["exit", "quit"]);
  });
  it("dépôt natif en annotation → dropOnZone ; hors annotation → importFiles", async () => {
    const { g, log } = fakeGate(true);
    await setupWorkspace({ annotation: () => g });
    dropHandler!([{ name: "a.png", size: 1, mime: "image/png" }], { x: 1, y: 2 });
    await vi.waitFor(() => expect(g.dropOnZone).toHaveBeenCalledWith([{ name: "a.png", size: 1, mime: "image/png" }], { x: 1, y: 2 }));
    expect(log).toEqual(["drop"]);
  });
  it("fermer l'onglet d'annotation : la règle des onglets, puis annotate détruite (close)", async () => {
    const { g } = fakeGate(false);
    const ws = await setupWorkspace({ annotation: () => g });
    await ws.annotationTab();
    const id = ws.tabs.list().find((t) => t.kind === "annotation")!.id;
    expect(await ws.close(id)).toBe(true);
    await vi.waitFor(() => expect(g.close).toHaveBeenCalledTimes(1));
  });
});
```
(imports à compléter : `fakeCore` déjà importé ; `APP_VERSION`, `MAX_TABS`, `TOO_MANY_TABS` déjà importés.)
Si le faux `codec.read` ne se rejette pas sur des octets illisibles dans ce fichier, utiliser `mockRejectedValueOnce`
comme ci-dessus : c'est le chemin « illisible » d'`io.read`, qui rend `null` après un avis.

- [ ] **Étape 4 : vérifier l'échec** (commande bornée). Attendu : `annotationTab is not a function`, `divert` nul.

- [ ] **Étape 5 : implémenter.** Imports : `import type { AnnotationControl } from "../platform/annotation-port";` et `type TabKind` depuis `./tabs`.
Types :
```ts
/** C11a : ce que l'espace de travail demande au contrôleur d'annotation (`app/annotation.ts`). */
export type AnnotationGate = Pick<AnnotationControl, "state" | "exit" | "dropOnZone" | "close">;
/** C11a (P3, P4) : sorte, état « modifié », activation, onglet remplacé. */
interface TabOptions {
  readonly kind?: TabKind;
  readonly dirty?: boolean;
  readonly activate?: boolean;
  readonly replace?: string;
}
```
`WorkspaceDeps` :
```ts
  /** C11a (P17, P18, P25) : contrôleur d'annotation, relu à chaque appel (il est créé après l'espace de travail). */
  annotation?(): AnnotationGate | null;
  /** C11a (P25) : sortie de l'application, relancée après la sortie de l'annotation ; absent (web) : rien n'est relancé. */
  quit?(): Promise<void>;
```
`Workspace` :
```ts
  /** C11a (P3) : l'onglet d'annotation, créé vierge et non montré s'il n'existe pas ; null à 12 onglets (avis dit). */
  annotationTab(): Promise<TabSession | null>;
  /** C11a (P4) : document de l'onglet en `.roomboard`. */
  encodeTab(tab: TabSession): Promise<Uint8Array>;
  /** C11a (P4) : document de l'onglet d'annotation remplacé (même place, même cible, « modifié ») ; false si illisible. */
  replaceAnnotation(bytes: Uint8Array): Promise<boolean>;
```
`addTab` : ajouter le paramètre `opts: TabOptions = {}` en dernier ; dans `createFileController({ … })`, ajouter
`...(opts.dirty === true ? { dirty: true } : {}),` ; remplacer le bloc `try { id = tabs.add("board", tab).id; } catch …` par :
```ts
    let id: string;
    let replaced: TabSession | null = null;
    try {
      if (opts.replace !== undefined) {
        const old = tabs.list().find((t) => t.id === opts.replace);
        if (old === undefined || tabs.replace(opts.replace, tab) === null) throw new Error("onglet d'annotation introuvable");
        replaced = old.session;
        id = opts.replace;
      } else {
        id = tabs.add(opts.kind ?? "board", tab, opts.activate ?? true).id;
      }
    } catch (e) {
      release(tab);
      await say(messageOf(e));
      return null;
    }
    if (replaced !== null) release(replaced); // après le `show()` de `tabs.replace` : désactivée avant d'être libérée
```
Méthodes de `ws` (près de `newBlank`) :
```ts
    async annotationTab() {
      const existing = tabs.list().find((t) => t.kind === "annotation");
      if (existing !== undefined) return existing.session;
      if (full()) {
        await say(TOO_MANY_TABS);
        return null;
      }
      return addTab(core.blank(), null, makeAssets(), false, new Map(), { kind: "annotation", activate: false });
    },
    encodeTab: (tab) => io.encode(tab.board.doc, tab.assets, deps.now(), APP_VERSION, { kind: "document" }),
    async replaceAnnotation(bytes) {
      const entry = tabs.list().find((t) => t.kind === "annotation");
      if (entry === undefined) return false;
      const old = entry.session;
      const read = await io.read(old.files.name(), bytes, "document");
      if (read === null) return false;
      const opened = { name: old.files.name(), target: old.files.target() };
      return (await addTab(read.doc, opened, read.assets, read.unread, new Map(), { kind: "annotation", dirty: true, replace: entry.id })) !== null;
    },
```
`quitRequested` :
```ts
    async quitRequested(quit) {
      const a = gate();
      if (a !== null && a.state().active) await a.exit(); // P25 : sortie d'abord (document récupéré)
      if (anyDirty() && !(await ask(DISCARD_MESSAGE))) return;
      await quit();
    },
```
`closeTab`, après `release(tab);` : `if (entry.kind === "annotation") void gate()?.close().catch(() => undefined);`.
Avant `const stopGuard` : `const gate = (): AnnotationGate | null => deps.annotation?.() ?? null;` (déclarée tôt, avant `ws`, si l'ordre l'exige).
Remplacer `stopGuard` et `stopDrop` :
```ts
  // C11a (P25) : en annotation, fermeture refusée sans question, sortie, puis fermeture relancée (garde ordinaire).
  const stopGuard = shell.guardClose(anyDirty, DISCARD_MESSAGE, () => {
    const a = gate();
    if (a === null || !a.state().active) return false;
    const quit = deps.quit;
    void a
      .exit()
      .then(() => (quit === undefined ? undefined : ws.quitRequested(quit)))
      .catch((e: unknown) => console.warn(`RoomBoard : fermeture abandonnée (${messageOf(e)})`));
    return true;
  });
  // C11a (P17, P18) : en annotation, tout dépôt natif sur la fenêtre principale compte comme un dépôt sur la zone.
  const stopDrop = host.onDrop((files, at) => {
    const a = gate();
    const done = a !== null && a.state().active ? a.dropOnZone(files, at) : ws.importFiles(files, at);
    void done.catch((e: unknown) => {
      console.warn(`RoomBoard : dépôt abandonné (${messageOf(e)})`);
    });
  });
```
Note : dans le test « fermeture … », `quitRequested` appelle de nouveau `gate().exit()` seulement si l'état est encore
actif ; le faux le passe à inactif à la première sortie, d'où le journal `["exit", "quit"]`.

- [ ] **Étape 6 : vérifier le vert**, tsc, `pnpm -r test` (section « Test et commande bornée »). Les tests existants de
`workspace.test.ts` (garde, dépôt, `quitRequested`) restent verts sans option C11a.

- [ ] **Étape 7 : commit.**
```bash
cd $WT && git add apps/web/src/app/workspace.ts apps/web/src/app/workspace.test.ts
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "feat(workspace): annotation tab, in-place replacement, diverted close, routed drop" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche T8 — Interface : hôte local à trois actions, barre selon le mode, onglet « Annotation », App en barre seule
<a id="tache-t8"></a>

**Objectif.** `HostTargets.annotation` et les trois actions, `setMode("desktop-annotation")` qui entre en annotation
(P6, P22) ; `Toolbar` filtre par `itemsForMode` selon le mode (P7, P19) ; l'onglet `annotation` marqué « Annotation » ;
en annotation l'App ne montre que la première barre `tools` (`data-mode="annotation"`, P20), prend l'hôte distant (P21)
et la vue venue de `annotate`, renvoie le profil s'il change (RF5) ; CSS de la page `annotate` transparente (P14).

**Fichiers.**
- Modifier : `apps/web/src/app/toolbar-host.ts:28-45` (`HostTargets`), `:47-79` (`ACTIONS`), `:105-109` (`setMode`) ; `apps/web/src/ui/Toolbar.tsx:30-39` (props), `:178` ; `apps/web/src/ui/TabsBar.tsx:30-48` ; `apps/web/src/ui/App.tsx:44-60` (props), `:246-261` (hôte), `:270-330` (vue, disposition) ; `apps/web/src/ui/rb.css:25-60`
- Test : `apps/web/src/app/toolbar-host.test.ts` (cas `setMode desktop-annotation : aucun effet, message C11a` réécrit), `apps/web/src/ui/Toolbar.test.tsx`, `apps/web/src/ui/TabsBar.test.tsx`, `apps/web/src/ui/App.test.tsx` (cas `S5 : capacité vraie : setMode(desktop-annotation)…` réécrit)

**Interfaces.**
- Consomme (T2) : `itemsForMode`, `type StartMode` (`toolbar.ts`) ; `ToolbarView.annotation` (`ui/item-state.ts`).
- Consomme (T3) : `AnnotationControl`, `AnnotationState` (`platform/annotation-port.ts`) ; `UNTITLED` (`platform/files.ts`, existant).
- Produit :
  - `HostTargets.annotation?: Pick<AnnotationControl, "state" | "enter" | "exit" | "toggle" | "nextScreen">`
  - `ToolbarProps.mode?: Accessor<StartMode>` (absent : `board`)
  - `annotationTabLabel(title: string): string` (`ui/TabsBar.tsx`)
  - `interface AnnotationUi { readonly control: AnnotationControl; remote(local: ToolbarHost): ToolbarHost; onView(cb: (v: ToolbarView) => void): () => void }` ; `AppProps.annotation?: AnnotationUi` (`ui/App.tsx`)
  - attribut `.rb-layout[data-mode="board" | "annotation"]` (lu par l'essai de T9)
- Réutilise : `apps/web/src/app/toolbar-host.ts:47` (`ACTIONS`), `:28` (`HostTargets`) — `ACTIONS["desktop-annotation" | "annotation-pointer" | "annotation-screen"] = (t) => t.annotation?.…` ; `HostTargets.annotation?: AnnotationControl` (étendus).
- Réutilise : `apps/web/src/app/toolbar-host.ts:105-109` (`setMode`) — appelle le contrôleur au lieu du `console.info`.
- Réutilise : `apps/web/src/toolbar.ts:635` ; `ui/App.tsx:261` — `resolveStartMode(p, caps)` ; `host.setMode(mode)` (appel existant gardé, P22).
- Réutilise : `apps/web/src/ui/Toolbar.tsx:58` (`Drop`) ; `platform/drop-web.ts:26` — `listenWebDrop(el, handler, { stopPropagation })` inchangés (dépôt HTML5 sur la zone → `host.dropFiles`).
- Réutilise : `apps/web/src/toolbar.ts:618` (voisin) — `itemsForMode(bar, caps, mode)` (posée par T2) à la place de `visibleItems` dans `Toolbar.tsx:178`.
- Réutilise : `apps/web/src/ui/TabsBar.tsx:18` — `TabEntry.kind` déjà transmis (`data-kind`), libellé ajouté.

**Test et commande bornée.**
```bash
node ~/.claude/scripts/chaine/jeton.cjs --nom tests --proprietaire usage-c11a-annotation/T8 --places-par-sujet 3 --commande "cd $WT/apps/web && nice -n 10 pnpm exec vitest run src/app/toolbar-host.test.ts src/ui/Toolbar.test.tsx src/ui/TabsBar.test.tsx src/ui/App.test.tsx > /tmp/c11a-T8-vitest.log 2>&1"; tail -20 /tmp/c11a-T8-vitest.log
```
Preuve attendue : `Test Files  4 passed (4)`, `Tests  N passed`, N ≥ 1 ; `grep -c "C11a : en annotation, barre seule" $WT/apps/web/src/ui/App.test.tsx` = 1.
`Toolbar.test.tsx:55, 116, 150` (zones sans `desktopAnnotation`) restent verts.
Puis tsc (`tsc=0`) et `pnpm -r test` sous le jeton (`/tmp/c11a-T8-all.log`, aucun `FAIL `).

**Preuve visuelle.** Mesurée par l'essai de T9 (`data-mode`, scène ≥ 640 px).

**Contraintes (recopiées de Global Constraints).**
- GC1 — Le chemin de l'encre ne traverse jamais la frontière page ↔ Rust natif ; entre fenêtres ne passent que des commandes de barre, l'état des boutons et le document entier en base64.
- GC3 — Builds et tests en `nice -n 10` ; `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`. Attention au `CARGO_TARGET_DIR` partagé entre worktrees : ne le pose pas, chaque worktree garde son `target/`.
- GC4 — Suites sous le jeton : `node ~/.claude/scripts/chaine/jeton.cjs --nom tests --proprietaire usage-c11a-annotation/T<n> --places-par-sujet 3 --commande "<commande bornée, sortie redirigée vers un fichier>"`.
- GC5 — Tests rapides du profil : `cargo test --workspace 2>&1 | tail -20` · `pnpm -r test 2>&1 | tail -20` ; complet : `scripts/verifier.sh --e2e`.
- GC8 — La scène ne passe pas sous 640 px (mesurée par l'essai Playwright).
- GC9 — Aucun test désactivé ou sauté, aucun seuil changé. Pas de `git add -A`/`.`, pas de `commit -a`, pas de `--force`. Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>` (via `git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit`), messages en anglais terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- GC10 — Aucune dépendance en AGPL/GPL/LGPL ; aucun paquet système installé ; aucun workflow GitHub.

**Interdits.** Ne pas monter ou démonter le conteneur des scènes (`props.stages`) au changement de mode : une seule
disposition, `data-mode` et CSS ; ne pas appeler `createRemoteToolbarHost` ni importer `app/annotation.ts` (l'App reçoit
`remote` par ses props, T9 le branche) ; aucun changement de `itemState`, `visibleItems`.

**Critère « terminé ».** Tests nommés verts (dont RF5), tsc 0, `pnpm -r test` sans `FAIL ` ; un commit. Rapport :
`Réutilisation : appelé toolbar-host.ts:ACTIONS/HostTargets/setMode (étendus), toolbar.ts:itemsForMode, resolveStartMode, Toolbar.tsx:Drop (inchangé)` ou `Réutilisation : écart — <pourquoi>`.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree** (bloc de T2, étape 1).

- [ ] **Étape 2 : tests rouges.** `toolbar-host.test.ts` : remplacer le cas `setMode desktop-annotation : aucun effet, message C11a` par :
```ts
  it("C11a : setMode desktop-annotation → annotation.enter, aucun message", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const { host, t, engine } = setupWithAnnotation(false);
    host.setMode("desktop-annotation");
    expect(t.annotation!.enter).toHaveBeenCalledTimes(1);
    expect(info).not.toHaveBeenCalled();
    expect(engine.setTool).not.toHaveBeenCalled();
    info.mockRestore();
  });
  it("C11a : setMode desktop-annotation sans contrôleur (web) : rien, aucun message", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const { host } = setup();
    host.setMode("desktop-annotation");
    expect(info).not.toHaveBeenCalled();
    info.mockRestore();
  });
  it("C11a : desktop-annotation entre ou sort selon l'état ; pointer → toggle ; screen → nextScreen", () => {
    const off = setupWithAnnotation(false);
    off.host.runAction("desktop-annotation");
    expect(off.t.annotation!.enter).toHaveBeenCalledTimes(1);
    const on = setupWithAnnotation(true);
    on.host.runAction("desktop-annotation");
    on.host.runAction("annotation-pointer");
    on.host.runAction("annotation-screen");
    expect(on.t.annotation!.exit).toHaveBeenCalledTimes(1);
    expect(on.t.annotation!.toggle).toHaveBeenCalledTimes(1);
    expect(on.t.annotation!.nextScreen).toHaveBeenCalledTimes(1);
  });
```
avec, près de `setup` :
```ts
function setupWithAnnotation(active: boolean) {
  const s = setup();
  const annotation = {
    state: () => ({ active, pointer: "draw" as const, screen: null, screens: 1 }),
    enter: vi.fn(async () => undefined),
    exit: vi.fn(async () => undefined),
    toggle: vi.fn(async () => undefined),
    nextScreen: vi.fn(async () => undefined),
  };
  const t = { ...s.t, annotation } as HostTargets;
  return { ...s, t, host: createLocalToolbarHost(t, () => BUILTIN_PROFILES[0]!) };
}
```
`TabsBar.test.tsx` (fabrique `setup(tabs, active)` et aide `tab(c, id)` du fichier ; import `annotationTabLabel`) :
```tsx
  it("C11a : onglet annotation libellé « Annotation », puis « Annotation — nom » une fois enregistré", () => {
    expect(annotationTabLabel("Sans titre.roomboard")).toBe("Annotation");
    expect(annotationTabLabel("x.roomboard")).toBe("Annotation — x.roomboard");
    const { container } = setup([...TABS, { id: "n", title: "Sans titre.roomboard", dirty: false, kind: "annotation" }]);
    expect(tab(container, "n").getAttribute("data-kind")).toBe("annotation");
    expect(tab(container, "n").textContent).toContain("Annotation");
    expect(tab(container, "n").textContent).not.toContain("Sans titre");
    expect(tab(container, "a").textContent).toContain("Plan");
  });
```
`Toolbar.test.tsx` : ajouter à `setup` un cinquième paramètre `mode?: StartMode` (import `type StartMode` de `../toolbar`),
passé par `mode={mode === undefined ? undefined : () => mode}` (même forme que `presets`), puis :
```tsx
  it("C11a : mode annotation → itemsForMode (zone d'annotation visible, sortie ajoutée) ; sans mode → tableau", () => {
    const zone: ToolItem = { id: "depot-annotation", kind: "dropzone", label: "Déposer ici", requires: ["desktopAnnotation"], rest: {} };
    const bar = mkBar([tool("pen"), zone]);
    const caps = { ...NO_CAPS, desktopAnnotation: true };
    const board = setup(bar, caps);
    expect(board.container.querySelector('[data-item="depot-annotation"]')).toBeNull();
    cleanup();
    const ann = setup(bar, caps, "m", undefined, "desktop-annotation");
    expect(ann.container.querySelector('[data-item="depot-annotation"]')).not.toBeNull();
    expect(ann.container.querySelector('[data-item="desktop-annotation-ajout"]')).not.toBeNull();
    expect(ann.container.querySelector('[data-item="annotation-pointer-ajout"]')).not.toBeNull();
  });
```
`App.test.tsx` : étendre `renderApp(opts)` d'une option `annotation?: AnnotationUi` passée à `AppProps.annotation` ; ajouter :
```ts
function fakeAnnotationUi(start = false) {
  let st: AnnotationState = { active: start, pointer: "draw", screen: null, screens: 1 };
  const cbs = new Set<() => void>();
  const views = new Set<(v: ToolbarView) => void>();
  const remoteCalls: string[] = [];
  const set = (n: Partial<AnnotationState>) => {
    st = { ...st, ...n };
    for (const cb of [...cbs]) cb();
  };
  const control: AnnotationControl = {
    state: () => st,
    enter: vi.fn(async () => set({ active: true })),
    exit: vi.fn(async () => set({ active: false })),
    close: vi.fn(async () => true),
    toggle: vi.fn(async () => undefined),
    nextScreen: vi.fn(async () => undefined),
    onTool: vi.fn(),
    command: vi.fn(),
    sendProfile: vi.fn(),
    dropOnZone: vi.fn(async () => undefined),
    onChange: (cb) => {
      cbs.add(cb);
      return () => {
        cbs.delete(cb);
      };
    },
  };
  const ui: AnnotationUi = {
    control,
    remote: (local) => ({ ...local, setTool: (tool) => void remoteCalls.push(`setTool ${tool}`) }),
    onView: (cb) => {
      views.add(cb);
      return () => {
        views.delete(cb);
      };
    },
  };
  return { ui, control, remoteCalls, view: (v: ToolbarView) => { for (const cb of [...views]) cb(v); } };
}
```
Puis, en remplaçant le cas `S5 : capacité vraie : setMode(desktop-annotation) une fois au montage, pas au changement de profil` :
```ts
  it("C11a : profil annotation et capacité : enter une fois au montage, pas au changement de profil (P22)", () => {
    const a = fakeAnnotationUi();
    const { container } = renderApp({ profile: "annotation", caps: { ...CAPS, desktopAnnotation: true }, annotation: a.ui });
    expect(a.control.enter).toHaveBeenCalledTimes(1);
    openMenu(container);
    click(container.querySelector('[data-profile="defaut"]'));
    openMenu(container);
    click(container.querySelector('[data-profile="annotation"]'));
    expect(a.control.enter).toHaveBeenCalledTimes(1);
  });
  it("C11a : en annotation, barre seule (data-mode), barre des pages absente, outils vers l'hôte distant, vue de annotate", async () => {
    const a = fakeAnnotationUi();
    const { container } = renderApp({ caps: { ...CAPS, desktopAnnotation: true }, annotation: a.ui });
    expect(container.querySelector(".rb-layout")?.getAttribute("data-mode")).toBe("board");
    await a.control.enter();
    expect(container.querySelector(".rb-layout")?.getAttribute("data-mode")).toBe("annotation");
    expect(container.querySelector('[data-toolbar="outils"]')).not.toBeNull();
    expect(container.querySelector('[data-toolbar="pages"]')).toBeNull();
    click(container.querySelector('[data-item="pen"]'));
    expect(a.remoteCalls).toEqual(["setTool pen"]);
    a.view({ tool: "select", eraserMode: "partial", canUndo: false, canRedo: false, pageIndex: 0, pageCount: 1 });
    expect(container.querySelector('[data-item="select"]')?.getAttribute("aria-pressed")).toBe("true");
    const exit = container.querySelector('[data-item="desktop-annotation"]');
    expect(exit?.textContent).toBe("Quitter l'annotation");
    expect(exit?.getAttribute("aria-pressed")).toBe("true");
  });
  it("C11a : profil d'avant C11a en annotation : « Quitter l'annotation » ajouté au rendu (P7)", async () => {
    const a = fakeAnnotationUi();
    const { container, store, active } = renderApp({ caps: { ...CAPS, desktopAnnotation: true }, annotation: a.ui });
    store.save(oldCopy()); // copie de defaut faite avant C11a, id « ma-copie »
    active.choose("ma-copie");
    await a.control.enter();
    expect(container.querySelector('[data-item="desktop-annotation-ajout"]')?.textContent).toBe("Quitter l'annotation");
  });
  it("C11a : profil changé en annotation : renvoyé à annotate (RF5, P21)", async () => {
    const a = fakeAnnotationUi();
    const { active } = renderApp({ caps: { ...CAPS, desktopAnnotation: true }, annotation: a.ui });
    await a.control.enter();
    active.choose("simple");
    expect(a.control.sendProfile).toHaveBeenCalledWith(expect.objectContaining({ id: "simple" }));
  });
```
avec, près de `fakeAnnotationUi` (imports : `DEFAULT_PROFILE_JSON` de `../toolbar-profiles`, `parseProfile`, `type Profile` de `../toolbar`) :
```ts
/** Copie de `defaut` faite avant C11a (aucun élément C11a), id « ma-copie ». */
function oldCopy(): Profile {
  const NEW = ["desktop-annotation", "annotation-pointer", "annotation-screen", "depot-annotation"];
  const json = structuredClone(DEFAULT_PROFILE_JSON) as { toolbars: { groups: { items: { id: string }[] }[] }[] };
  for (const b of json.toolbars) for (const g of b.groups) g.items = g.items.filter((i) => !NEW.includes(i.id));
  const r = parseProfile({ ...json, id: "ma-copie", label: "Ma copie" });
  if ("errors" in r) throw new Error(r.errors.join("; "));
  return r.profile;
}
```
(`renderApp` rend déjà `{ container, workspace, tab, store, active, … }` ; `ActiveProfile.choose` relit le magasin.)

- [ ] **Étape 3 : vérifier l'échec** (commande bornée).

- [ ] **Étape 4 : `toolbar-host.ts`.**
```ts
import type { AnnotationControl } from "../platform/annotation-port";
```
dans `HostTargets` :
```ts
  /** C11a (P6, P8, P15, P22) : contrôleur d'annotation ; absent (web sans faux hôte, tests) : sans effet (PC9). */
  annotation?: Pick<AnnotationControl, "state" | "enter" | "exit" | "toggle" | "nextScreen">;
```
dans `ACTIONS` :
```ts
  "desktop-annotation": (t) => {
    const a = t.annotation;
    if (a !== undefined) void (a.state().active ? a.exit() : a.enter());
  },
  "annotation-pointer": (t) => void t.annotation?.toggle(),
  "annotation-screen": (t) => void t.annotation?.nextScreen(),
```
`setMode` :
```ts
    setMode(mode) {
      // U14, P22 : « Annotation du bureau » entre en annotation ; sans contrôleur, rien (repli silencieux sur le tableau).
      if (mode === "desktop-annotation") void t.annotation?.enter();
    },
```

- [ ] **Étape 5 : `Toolbar.tsx` et `TabsBar.tsx`.** `Toolbar.tsx` : import `itemsForMode`, `type StartMode` ; prop
`/** C11a (P7, P19) : mode de la fenêtre ; absent : tableau. */ readonly mode?: Accessor<StartMode>;` ; ligne 178 :
`const items = createMemo(() => itemsForMode(props.bar, props.caps(), props.mode?.() ?? "board"));` (retirer `visibleItems` de l'import s'il ne sert plus).
`TabsBar.tsx` :
```ts
import { UNTITLED } from "../platform/files";
/** C11a (P3) : l'onglet d'annotation se lit « Annotation », puis « Annotation — nom » une fois enregistré. */
export function annotationTabLabel(title: string): string {
  return title === UNTITLED || title === "" ? "Annotation" : `Annotation — ${title}`;
}
```
et `<span>{t.kind === "annotation" ? annotationTabLabel(t.title) : t.title}</span>`.

- [ ] **Étape 6 : `App.tsx`.** Imports : `type AnnotationControl, type AnnotationState` de `../platform/annotation-port`,
`type ToolbarHost` de `../app/toolbar-host`, `type StartMode` de `../toolbar`. Props :
```ts
/** C11a (P21) : annotation de bureau ; absente (web, tests anciens) : tableau seul. */
export interface AnnotationUi {
  readonly control: AnnotationControl;
  /** Hôte de barre en annotation (commandes vers `annotate`), bâti sur l'hôte local. */
  remote(local: ToolbarHost): ToolbarHost;
  /** Vue de barre publiée par `annotate`. */
  onView(cb: (v: ToolbarView) => void): () => void;
}
```
`AppProps` : `readonly annotation?: AnnotationUi;`.
Remplacer le bloc `const host = createLocalToolbarHost({ … }, () => props.active.profile());` par :
```ts
  // C11a : état de l'annotation et vue de barre venue de `annotate`.
  const ann = props.annotation;
  const [annState, setAnnState] = createSignal<AnnotationState>(ann?.control.state() ?? { active: false, pointer: "draw", screen: null, screens: 1 });
  const [remoteView, setRemoteView] = createSignal<ToolbarView | null>(null);
  if (ann !== undefined) {
    const offChange = ann.control.onChange(() => setAnnState(ann.control.state()));
    const offView = ann.onView(setRemoteView);
    onCleanup(() => {
      offChange();
      offView();
    });
  }
  const annotating = (): boolean => annState().active;
  const mode = (): StartMode => (annotating() ? "desktop-annotation" : "board");

  const local = createLocalToolbarHost(
    {
      engine: () => ws.active().board.engine,
      runFile: (cmd) => void ws.active().files.run(cmd),
      // P17 : un dépôt HTML5 sur la zone en annotation va au contrôleur (sortie d'abord) ; sinon l'import ordinaire.
      importFiles: (files, at) => void (ann !== undefined && annotating() ? ann.control.dropOnZone(files, at ?? null) : ws.importFiles(files, at)),
      insertPages: () => void ws.insertPages(),
      exportPdf: () => void ws.exportPdf(),
      exportBoard: (format) => void ws.exportBoard(format),
      editOriginal: () => void ws.editOriginal(),
      selection: (a) => ws.selection(a),
      toggle: (p) => setPanel((cur) => (cur === p ? null : p)),
      ...(ann === undefined ? {} : { annotation: ann.control }),
    },
    () => props.active.profile(),
  );
  const remote = ann === undefined ? local : ann.remote(local);
  /** P21 : en annotation, la barre parle à `annotate` ; sinon au moteur local. */
  const pick = (): ToolbarHost => (annotating() ? remote : local);
  const host: ToolbarHost = {
    setTool: (tool, preset) => pick().setTool(tool, preset),
    runAction: (id) => pick().runAction(id),
    dropFiles: (files, at) => pick().dropFiles(files, at),
    setMode: (m) => pick().setMode(m),
    tableFill: (f) => pick().tableFill(f),
    fillColor: (c) => pick().fillColor(c),
    fillTolerance: (v) => pick().fillTolerance(v),
    textFormat: (a) => pick().textFormat(a),
    selection: (a) => pick().selection(a),
    imagePanel: () => pick().imagePanel(),
  };
  // Panneau fermé à l'entrée ; profil renvoyé à `annotate` s'il change pendant l'annotation (RF5).
  createEffect(on(annotating, (a) => { if (a) setPanel(null); }, { defer: true }));
  createEffect(on(() => props.active.profile(), (p) => { if (annotating()) ann?.control.sendProfile(p); }, { defer: true }));
```
Remplacer `view` :
```ts
  /** Vue de la barre (C3) ; C11a : en annotation, celle de `annotate`, avec l'état de l'annotation. */
  const view = (): ToolbarView => {
    tick();
    const a = annState();
    const base: ToolbarView = a.active ? (remoteView() ?? { ...state(), canPaste: false }) : { ...state(), canPaste: ws.canPaste() };
    return ann === undefined ? base : { ...base, annotation: { active: a.active, pointer: a.pointer, screens: a.screens } };
  };
```
Disposition : après `floating`, ajouter
```ts
  /** C11a (P20) : en annotation, seule la première barre `tools` (une barre flottante y est posée en haut). */
  const annotationBar = createMemo((): Bar | null => {
    const b = profile().toolbars.find((x) => x.role === "tools");
    if (b === undefined) return null;
    return b.dock === "floating" ? { ...b, dock: "top" } : b;
  });
  const shownDocked = createMemo((): readonly Bar[] => {
    if (!annotating()) return docked();
    const b = annotationBar();
    return b === null ? [] : [b];
  });
  const shownFloating = createMemo((): readonly Bar[] => (annotating() ? [] : floating()));
```
puis `const grid = createMemo(() => layoutFor(shownDocked()));`, `<For each={shownDocked()}>`, `<Show when={shownFloating().length > 0}>` / `<For each={shownFloating()}>`,
`<div class="rb-layout" data-mode={annotating() ? "annotation" : "board"} …>`, et dans `toolbarOf` : `<Toolbar … mode={mode} />`.
L'appel existant `host.setMode(resolveStartMode(props.active.profile(), props.active.capabilities()).mode);` reste tel quel,
après la création de `host`.

- [ ] **Étape 7 : `rb.css`.** Ajouter après `.rb-layout` :
```css
/* C11a (P20) : en annotation, la fenêtre principale n'est que la première barre d'outils. */
.rb-layout[data-mode="annotation"] > .rb-head,
.rb-layout[data-mode="annotation"] > .rb-stages,
.rb-layout[data-mode="annotation"] > .rb-floating,
.rb-layout[data-mode="annotation"] > .rb-popover { display: none; }
/* C11a (P14) : page de la fenêtre `annotate`, transparente sur le bureau, scène sur toute la fenêtre. */
html[data-fenetre="annotation"],
html[data-fenetre="annotation"] body,
html[data-fenetre="annotation"] #app { background: transparent; margin: 0; height: 100%; overflow: hidden; }
html[data-fenetre="annotation"] .rb-stages { position: fixed; inset: 0; background: transparent; }
```

- [ ] **Étape 8 : vérifier le vert**, tsc, `pnpm -r test` (section « Test et commande bornée »).

- [ ] **Étape 9 : commit.**
```bash
cd $WT && git add apps/web/src/app/toolbar-host.ts apps/web/src/app/toolbar-host.test.ts apps/web/src/ui/Toolbar.tsx apps/web/src/ui/Toolbar.test.tsx apps/web/src/ui/TabsBar.tsx apps/web/src/ui/TabsBar.test.tsx apps/web/src/ui/App.tsx apps/web/src/ui/App.test.tsx apps/web/src/ui/rb.css
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "feat(ui): bar-only annotation mode, remote toolbar host, annotation tab label" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche T9 — Amorces (`main.ts`, `annotate-start.ts`) et essai Playwright `c11a-annotation-navigateur.mjs` branché dans `verifier.sh`
<a id="tache-t9"></a>

**Objectif.** Brancher les deux fenêtres : dans la principale, l'hôte des fenêtres (coque ou faux `?annotation=faux`),
`annotation_support` avant les capacités (P22), le contrôleur, l'offre de relance sous Wayland (P16), `annotation` et
`quit` dans l'espace de travail, `AnnotationUi` dans l'App ; dans `annotate` (`?fenetre=annotation`), l'amorce
`startAnnotateWindow`. Puis l'essai Playwright des scénarios S1 à S3, joué par `verifier.sh --e2e`.

**Fichiers.**
- Modifier : `apps/web/src/main.ts:58-75` (début de `start`), `:207-210` (`env`, capacités), `:280-374` (espace de travail, montage) ; `scripts/verifier.sh:126-127` ; `scripts/tests/verifier-e2e.test.sh:16-17`
- Créer : `apps/web/src/annotate-start.ts`, `scripts/essais/c11a-annotation-navigateur.mjs`

**Interfaces.**
- Consomme (T4) : `createAnnotationController`, `createRemoteToolbarHost`, `offerCompatRelaunch` (`app/annotation.ts`) ; `createFakeAnnotationWindows` (`platform/annotation-fake.ts`).
- Consomme (T5) : `createTauriAnnotationWindows`, `type AnnotationIpc` (`platform/annotation-tauri.ts`) ; commandes `annotation_cursor`, `annotation_ignore`.
- Consomme (T6) : `createAnnotationPage` (`app/annotation-page.ts`) ; `SessionShared.transparent`.
- Consomme (T7) : `WorkspaceDeps.annotation`, `WorkspaceDeps.quit`, `Workspace.annotationTab`, `encodeTab`, `replaceAnnotation`.
- Consomme (T8) : `AppProps.annotation: AnnotationUi` ; `.rb-layout[data-mode]` ; libellé d'onglet « Annotation ».
- Consomme (T2, T3) : `runtimeCapabilities(…, { annotationSupported, forceAnnotation })`, `ANNOTATION_REMOTE_ACTIONS`, `type Dock` ; `AnnotationControl`, `AnnotationSupport`, `AnnotationWindows`, `MAIN_LABEL`.
- Produit : `startAnnotateWindow(core: CoreFactory, ipc: TauriIpc, keyOf: (e: KeyboardEvent) => KeyLike): Promise<void>` ; essai `scripts/essais/c11a-annotation-navigateur.mjs` (code de sortie 0, 1, 2 ; dernière ligne `C11a : OK`).
- Réutilise : `apps/web/src/main.ts:57-120` (`start`), patron `?banc` (`main.ts:1-5`) — branche `?fenetre=annotation` et `?annotation=faux`.
- Réutilise : `apps/web/src/app/container-io.ts:61, 64` — `createContainerIO` (`encode`, `read`) dans l'amorce d'`annotate`.
- Réutilise : `apps/web/src/app/board-session.ts:135` — `createBoardSession(doc, shared, assets)` avec `transparent: true`.
- Réutilise : `scripts/essais/avis.mjs`, `commun.mjs` — aides existantes (`serve`, `frames`, `item`, `stageBox`, `dropFile`, `solidPng`, `TAB`, `Echec`, `loadPlaywright`).
- Réutilise : `apps/web/src/ui/ProfileEditor.tsx:60` (`START_LABELS`) — inchangé, le profil « Annotation au démarrage » existant sert à S1.

**Test et commande bornée.**
```bash
node ~/.claude/scripts/chaine/jeton.cjs --nom tests --proprietaire usage-c11a-annotation/T9 --places-par-sujet 3 --duree-max-minutes 20 --commande "cd $WT && nice -n 10 pnpm --filter @roomboard/web build > /tmp/c11a-T9-build.log 2>&1 && nice -n 10 node scripts/essais/c11a-annotation-navigateur.mjs > /tmp/c11a-T9-essai.log 2>&1"; tail -40 /tmp/c11a-T9-essai.log; grep -c "^ok — " /tmp/c11a-T9-essai.log
```
Preuve attendue : dernière ligne `C11a : OK`, au moins 20 lignes `ok — `, dont `ok — S3 : avis « ajouté à la page 1 »` et
`ok — S2 : scène … px ≥ 640` (lectures de valeurs : `data-mode`, `data-annotation`, `data-pointeur`, `data-annotation-recu`).
Puis, sans régression :
```bash
cd $WT && bash scripts/tests/verifier-e2e.test.sh 2>&1 | tail -3
node ~/.claude/scripts/chaine/jeton.cjs --nom tests --proprietaire usage-c11a-annotation/T9 --places-par-sujet 3 --duree-max-minutes 20 --commande "cd $WT && for s in c1-profils c10a-tableau c4-bibliotheque c15-3d; do nice -n 10 node scripts/essais/\$s-navigateur.mjs > /tmp/c11a-T9-\$s.log 2>&1 || echo \"ECHEC \$s\" >> /tmp/c11a-T9-regress.log; done"; tail -1 /tmp/c11a-T9-c1-profils.log /tmp/c11a-T9-c10a-tableau.log /tmp/c11a-T9-c4-bibliotheque.log /tmp/c11a-T9-c15-3d.log; cat /tmp/c11a-T9-regress.log 2>/dev/null
```
Attendu : `verifier-e2e.test.sh : OK` ; `C1 : OK`, `C10a : OK` (ou le libellé de cet essai), `C4 : OK`, `C15 : OK` ; aucun `ECHEC`.
Tailles Wasm (GC7) : `find $WT/apps/web/dist/assets -name 'roomboard_wasm_bg*.wasm' -printf '%s\n'` = `1374398` et
`find $WT/apps/web/dist/assets -name 'roomboard_formats_wasm_bg*.wasm' -printf '%s\n'` = `2794511` (modules copiés, aucune crate Wasm touchée).
Enfin `pnpm -r test` sous le jeton (`/tmp/c11a-T9-all.log`, aucun `FAIL `) et tsc (`tsc=0`).

**Preuve visuelle.** Lectures d'abord (dans l'essai) : `.rb-layout[data-mode="annotation"]`, `body[data-annotation="1"]`,
`body[data-pointeur="draw"|"mouse"]`, `body[data-annotation-recu]` > 0, `[role="tab"][data-kind="annotation"]` dont le
texte contient « Annotation », hauteur de `#stage` ≥ 640 px. Capture à décrire (facultative, non commitée) :
`node scripts/essais/c11a-annotation-navigateur.mjs --captures` écrit `/tmp/c11a-annotation.png` (fenêtre en barre seule) ;
la décrire en une phrase dans le rapport (barre seule visible, aucune scène, bouton « Quitter l'annotation » enfoncé).

**Contraintes (recopiées de Global Constraints).**
- GC1 — Le chemin de l'encre ne traverse jamais la frontière page ↔ Rust natif ; entre fenêtres ne passent que des commandes de barre, l'état des boutons et le document entier en base64.
- GC3 — Builds et tests en `nice -n 10` ; `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`. Attention au `CARGO_TARGET_DIR` partagé entre worktrees : ne le pose pas, chaque worktree garde son `target/`.
- GC4 — Suites sous le jeton : `node ~/.claude/scripts/chaine/jeton.cjs --nom tests --proprietaire usage-c11a-annotation/T<n> --places-par-sujet 3 --commande "<commande bornée, sortie redirigée vers un fichier>"`.
- GC5 — Tests rapides du profil : `cargo test --workspace 2>&1 | tail -20` · `pnpm -r test 2>&1 | tail -20` ; complet : `scripts/verifier.sh --e2e`.
- GC6 — Compatibilité : un fichier `.roomboard` et un profil d'avant C11a s'ouvrent toujours (test). (Ici : S3 dépose `socle-v1.roomboard`, fichier d'avant C11a.)
- GC7 — Tailles Wasm : module principal ≤ 1 572 864 o (aujourd'hui 1 374 398), formats ≤ 3 145 728 o (aujourd'hui 2 794 511) ; aucun seuil baissé ni relevé.
- GC8 — La scène ne passe pas sous 640 px (mesurée par l'essai Playwright).
- GC9 — Aucun test désactivé ou sauté, aucun seuil changé. Pas de `git add -A`/`.`, pas de `commit -a`, pas de `--force`. Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>` (via `git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit`), messages en anglais terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- GC10 — Aucune dépendance en AGPL/GPL/LGPL ; aucun paquet système installé ; aucun workflow GitHub.

**Interdits.** `?annotation=faux` n'est honoré qu'hors coque ; l'essai ne passe aucune option de capture dans
`verifier.sh` ; aucune capture commitée ; ne pas toucher les autres essais ; aucun `tauri build` ; le contrôle
`verifier-e2e.test.sh` garde toutes ses lignes (une ligne ajoutée, comme C16).

**Critère « terminé ».** `C11a : OK` avec ≥ 20 `ok — ` ; `verifier-e2e.test.sh : OK` ; c1, c10a, c4, c15 verts ; tailles
Wasm à l'octet ; `pnpm -r test` sans `FAIL ` ; tsc 0 ; un commit. Rapport :
`Réutilisation : appelé main.ts:start (branches ajoutées), container-io.ts:createContainerIO, board-session.ts:createBoardSession, scripts/essais/commun.mjs` ou `Réutilisation : écart — <pourquoi>`.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree** (bloc de T2, étape 1 ; le build de l'étape 6 refait `apps/web/dist`).

- [ ] **Étape 2 : écrire l'essai (rouge)** `scripts/essais/c11a-annotation-navigateur.mjs`.
```js
#!/usr/bin/env node
// Essai C11a au navigateur (annotation de bureau) : S1 (web : ni « Annotation du bureau » ni « Déposer ici » ;
// « Annotation au démarrage » rechargé : tableau, #etat vide, aucune boîte, scène ≥ 640 px ; puis avec le faux hôte,
// démarrage direct en annotation), S2 (`?annotation=faux` : entrée, barre seule, bascule dessin / souris, sortie,
// onglet « Annotation », document en base64 à l'entrée et à la sortie, réentrée), S3 (dépôt d'une image puis d'un
// .roomboard d'avant C11a sur « Déposer ici »). Chromium headless de Playwright, `?fichiers=repli` (alert et confirm
// du navigateur). Code de sortie : 0 réussi, 1 échec, 2 outil absent. Hors de verifier.sh sans --e2e.
// Usage : node scripts/essais/c11a-annotation-navigateur.mjs [--captures]   (/tmp/c11a-annotation.png, non commitée)
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { DIST, Echec, ROOT, TAB, VIEWPORT, dropFile, frames, gitSha, item, loadPlaywright, serve, solidPng, stageBox } from "./commun.mjs";

const LABEL = "C11a";
const LAYOUT = ".rb-layout";
const ZONE = '[data-item="depot-annotation"]';
const OLD_DOC = join(ROOT, "crates", "roomboard-core", "tests", "fixtures", "socle-v1.roomboard");

const check = (cond, msg) => {
  if (!cond) throw new Echec(msg);
  console.log(`ok — ${msg}`);
};

function watch(page) {
  const errors = [];
  const dialogs = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("dialog", async (d) => {
    dialogs.push({ type: d.type(), message: d.message() });
    await d.accept();
  });
  return { errors, dialogs };
}

async function ready(page) {
  await page.waitForSelector('#stage[data-ready="1"]', { timeout: 15000 });
  await frames(page);
}
const body = (page, key) => page.evaluate((k) => document.body.dataset[k] ?? null, key);
async function waitBody(page, key, value) {
  await page.waitForFunction(([k, v]) => document.body.dataset[k] === v, [key, value], { timeout: 15000 });
  await frames(page);
}
async function waitMode(page, mode) {
  await page.waitForSelector(`${LAYOUT}[data-mode="${mode}"]`, { timeout: 15000 });
  await frames(page);
}
async function waitDialog(dialogs, from) {
  const t0 = Date.now();
  while (dialogs.length <= from) {
    if (Date.now() - t0 > 15000) throw new Echec("aucune boîte reçue");
    await new Promise((r) => setTimeout(r, 50));
  }
  return dialogs[from];
}
const text = async (page, sel) => ((await page.textContent(sel)) ?? "").trim();

async function s1(page, base) {
  const w = watch(page);
  await page.goto(`${base}/?fichiers=repli`);
  await ready(page);
  check((await page.locator(item("desktop-annotation")).count()) === 0, "S1 web : pas d'« Annotation du bureau »");
  check((await page.locator(ZONE).count()) === 0, "S1 web : pas de « Déposer ici »");
  await page.click(item("profiles"));
  await page.waitForSelector("[data-profiles]", { timeout: 15000 });
  await page.click('[data-profile="annotation"]');
  await frames(page);
  const d0 = w.dialogs.length;
  await page.reload();
  await ready(page);
  check((await text(page, "#etat")) === "", "S1 annotation au démarrage, web : #etat vide");
  check((await page.locator(`${LAYOUT}[data-mode="board"]`).count()) === 1, "S1 : tableau ordinaire (data-mode=board)");
  check(w.dialogs.length === d0, "S1 : aucune boîte");
  const box = await stageBox(page);
  check(box.height >= 640, `S1 : scène ${box.height} px ≥ 640`);
  // P22 : même profil, faux hôte : démarrage direct en annotation.
  await page.goto(`${base}/?fichiers=repli&annotation=faux`);
  await page.waitForSelector(`${LAYOUT}[data-mode="annotation"]`, { timeout: 15000 });
  check((await body(page, "annotation")) === "1", "S1 : « Annotation au démarrage » + faux hôte : démarre en annotation");
  await page.click(item("desktop-annotation"));
  await waitMode(page, "board");
  check(w.errors.length === 0, `S1 : aucune erreur dans la page${w.errors.length ? ` : ${w.errors.join(" | ")}` : ""}`);
}

async function s2s3(page, base, captures) {
  const w = watch(page);
  await page.goto(`${base}/?fichiers=repli&annotation=faux`);
  await ready(page);
  // S2
  check((await page.locator(item("desktop-annotation")).count()) === 1, "S2 : « Annotation du bureau » dans la barre (faux hôte)");
  check((await page.locator(ZONE).count()) === 0, "S2 tableau : « Déposer ici » caché");
  await page.click(item("desktop-annotation"));
  await waitMode(page, "annotation");
  await waitBody(page, "annotation", "1");
  check((await body(page, "pointeur")) === "draw", "S2 : annotate ouverte en mode dessin (data-pointeur=draw)");
  check(
    (await page.getAttribute(item("desktop-annotation"), "aria-pressed")) === "true" && (await text(page, item("desktop-annotation"))) === "Quitter l'annotation",
    "S2 : bouton enfoncé « Quitter l'annotation »",
  );
  check(Number(await body(page, "annotationRecu")) > 0, `S2 : .roomboard reçu en base64 à l'entrée (${await body(page, "annotationRecu")} o)`);
  check(!(await page.locator(".rb-head").isVisible()) && !(await page.locator("#stage").isVisible()), "S2 : barre seule (onglets et scène masqués)");
  if (captures) {
    await page.screenshot({ path: "/tmp/c11a-annotation.png" });
    console.log("capture : /tmp/c11a-annotation.png");
  }
  await page.click(item("select"));
  await waitBody(page, "pointeur", "mouse");
  check(true, "S2 : Sélection → data-pointeur=mouse");
  await page.click(item("pen"));
  await waitBody(page, "pointeur", "draw");
  check(true, "S2 : Stylo → data-pointeur=draw");
  await page.click(item("annotation-pointer"));
  await waitBody(page, "pointeur", "mouse");
  check((await text(page, item("annotation-pointer"))) === "Dessin", "S2 : bouton « Souris » → souris, libellé « Dessin »");
  await page.click(item("annotation-pointer"));
  await waitBody(page, "pointeur", "draw");
  check(true, "S2 : bouton « Dessin » → dessin (aller-retour)");
  await page.click(item("desktop-annotation"));
  await waitMode(page, "board");
  await waitBody(page, "annotation", "0");
  check(Number(await body(page, "annotationRendu")) > 0, `S2 : .roomboard rendu en base64 à la sortie (${await body(page, "annotationRendu")} o)`);
  const ann = page.locator(`${TAB}[data-kind="annotation"]`);
  check((await ann.count()) === 1 && (await ann.textContent()).includes("Annotation"), "S2 : onglet « Annotation » gardé dans les onglets");
  check((await page.getAttribute(`${TAB}[aria-selected="true"]`, "data-kind")) === "board", "S2 : onglet d'origine montré");
  const box = await stageBox(page);
  check(box.height >= 640, `S2 : scène ${box.height} px ≥ 640 après le retour`);
  await page.click(item("desktop-annotation"));
  await waitBody(page, "annotationEntrees", "2");
  check(Number(await body(page, "annotationRecu")) > 0, "S2 : réentrée : document de l'onglet d'annotation reçu");
  // S3 (en annotation)
  check((await page.locator(ZONE).count()) === 1, "S3 : « Déposer ici » visible en annotation");
  const d0 = w.dialogs.length;
  await dropFile(page, ZONE, "carre.png", solidPng(40, 40, [220, 30, 30]), "image/png");
  await waitMode(page, "board");
  const avis = await waitDialog(w.dialogs, d0);
  check(avis.message === "ajouté à la page 1", `S3 : avis « ${avis.message} »`);
  check((await page.locator(`${TAB}[data-kind="annotation"]`).count()) === 1, "S3 : onglet d'annotation gardé");
  check((await page.getAttribute(`${TAB}[aria-selected="true"]`, "data-kind")) === "board", "S3 : image sur l'onglet d'origine, montré");
  check((await page.getAttribute("#stage", "data-modifie")) === "1", "S3 : onglet d'origine modifié (image insérée)");
  const before = await page.locator(TAB).count();
  const origin = await page.getAttribute(`${TAB}[aria-selected="true"]`, "data-tab");
  await page.click(item("desktop-annotation"));
  await waitMode(page, "annotation");
  await dropFile(page, ZONE, "socle-v1.roomboard", await readFile(OLD_DOC), "");
  await waitMode(page, "board");
  await page.waitForFunction(([sel, n]) => document.querySelectorAll(sel).length === n, [TAB, before + 1], { timeout: 15000 });
  const shown = page.locator(`${TAB}[aria-selected="true"]`);
  check((await shown.getAttribute("data-tab")) !== origin && (await shown.textContent()).includes("socle-v1"), "S3 : .roomboard d'avant C11a ouvert dans un nouvel onglet montré");
  check((await page.locator(`${TAB}[data-tab="${origin}"]`).count()) === 1, "S3 : onglet d'origine inchangé (toujours là)");
  check(w.errors.length === 0, `S2-S3 : aucune erreur dans la page${w.errors.length ? ` : ${w.errors.join(" | ")}` : ""}`);
}

async function main() {
  console.log(`sha ${gitSha()}`);
  if (!existsSync(join(DIST, "index.html"))) {
    console.error(`${LABEL} : ÉCHEC — apps/web/dist absent : lancer d'abord scripts/verifier.sh (Wasm et application)`);
    return 1;
  }
  const pw = await loadPlaywright();
  if (!pw) {
    console.error(`${LABEL} : outil absent — Playwright introuvable (npx -y playwright@1.65.1 --version, ou PLAYWRIGHT_MODULE=…)`);
    return 2;
  }
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}`;
  let browser = null;
  try {
    try {
      browser = await pw.chromium.launch({ args: ["--no-sandbox"] });
    } catch (e) {
      console.error(`${LABEL} : outil absent — Chromium de Playwright : ${e instanceof Error ? e.message.split("\n")[0] : e}`);
      return 2;
    }
    const a = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
    await s1(await a.newPage(), base);
    await a.close();
    const b = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
    await s2s3(await b.newPage(), base, process.argv.includes("--captures"));
    await b.close();
    console.log(`${LABEL} : OK`);
    return 0;
  } catch (e) {
    console.error(`${LABEL} : ÉCHEC — ${e instanceof Echec ? e.message : e instanceof Error ? e.stack : e}`);
    return 1;
  } finally {
    await browser?.close();
    server.close();
  }
}

process.exitCode = await main();
```
Vérifier l'échec : `cd $WT && nice -n 10 node scripts/essais/c11a-annotation-navigateur.mjs 2>&1 | tail -3` sur le
`dist` copié (sans les amorces) : attendu `C11a : ÉCHEC — S1 : tableau ordinaire (data-mode=board)` (ni `data-mode` ni faux hôte dans le dist copié) ; les deux premiers contrôles `ok — S1 web : …` passent déjà.

- [ ] **Étape 3 : `apps/web/src/annotate-start.ts`.**
```ts
/**
 * Amorce de la fenêtre `annotate` (C11a, P1, P13, P14) : un cœur Wasm à elle, une session de dessin transparente, la
 * page d'annotation branchée sur les événements de la coque. Ni fichier ni boîte : le document arrive en base64 et
 * repart en base64 (DA1) ; aucun point d'encre ne sort de la page (GC1).
 */
import { createAnnotationPage } from "./app/annotation-page";
import { createBoardSession, type SessionShared } from "./app/board-session";
import { createContainerIO } from "./app/container-io";
import type { CoreFactory } from "./core/api";
import { createAssetStore } from "./core/asset-store";
import type { KeyLike } from "./engine/input/keys";
import { detectSupport } from "./engine/input/support";
import { createSettingsStore, parseSettings } from "./engine/settings";
import { measureWith, type Measure } from "./engine/text-layout";
import { MAIN_LABEL } from "./platform/annotation-port";
import { createPageCodec } from "./platform/container";
import { loadFormatsModule } from "./platform/container-load";
import { APP_VERSION } from "./platform/controller";
import type { TauriIpc } from "./platform/host-tauri";

export async function startAnnotateWindow(core: CoreFactory, ipc: TauriIpc, keyOf: (e: KeyboardEvent) => KeyLike): Promise<void> {
  const emitTo = ipc.emitTo;
  if (emitTo === undefined) throw new Error("événements entre fenêtres indisponibles");
  document.documentElement.dataset["fenetre"] = "annotation";
  const root = document.getElementById("app");
  if (root === null) throw new Error("élément absent : #app");
  const stages = document.createElement("main");
  stages.className = "rb-stages";
  root.append(stages);
  const parsed = parseSettings(window.location.search);
  const measureCtx = document.createElement("canvas").getContext("2d");
  const measure: Measure = measureCtx ? measureWith(measureCtx) : (s, size) => s.length * size * 0.6;
  const shared: SessionShared = {
    container: stages,
    settings: createSettingsStore(parsed.settings),
    parsed,
    support: detectSupport(),
    measure,
    coreVersion: core.version(),
    transparent: true,
  };
  const io = createContainerIO({
    core,
    codec: createPageCodec(loadFormatsModule),
    say: async (m) => console.warn(`RoomBoard (annotation) : ${m}`),
    makeAssets: () => createAssetStore(),
  });
  const page = createAnnotationPage({
    channel: {
      emit: <T>(event: string, payload: T) => emitTo<T>(MAIN_LABEL, event, payload),
      listen: <T>(event: string, cb: (payload: T) => void) => ipc.listen<T>(event, (e) => cb(e.payload)),
    },
    read: async (bytes) => {
      const r = await io.read("annotation.roomboard", bytes, "document");
      return r === null ? null : { doc: r.doc, assets: r.assets };
    },
    encode: (doc, assets) => io.encode(doc, assets, new Date().toISOString(), APP_VERSION, { kind: "document" }),
    makeSession: (doc, assets) => createBoardSession(doc, shared, assets),
    cursor: () => ipc.invoke<[number, number] | null>("annotation_cursor"),
    ignore: (on) => ipc.invoke<void>("annotation_ignore", { ignore: on }),
  });
  window.addEventListener("keydown", (e) => {
    if (page.key(keyOf(e))) e.preventDefault();
  });
  window.addEventListener("pointerdown", () => page.pointerDown(), true);
  window.addEventListener("pointerup", () => page.pointerUp(), true);
  window.addEventListener("pointercancel", () => page.pointerUp(), true);
  // P18 : un dépôt sur `annotate` est ignoré.
  for (const type of ["dragover", "drop"] as const) window.addEventListener(type, (e) => e.preventDefault());
  await page.start();
}
```

- [ ] **Étape 4 : `main.ts`.** Imports à ajouter :
```ts
import { createAnnotationController, createRemoteToolbarHost, offerCompatRelaunch } from "./app/annotation";
import { startAnnotateWindow } from "./annotate-start";
import { createFakeAnnotationWindows } from "./platform/annotation-fake";
import type { AnnotationControl, AnnotationSupport, AnnotationWindows } from "./platform/annotation-port";
import { createTauriAnnotationWindows } from "./platform/annotation-tauri";
import { ANNOTATION_REMOTE_ACTIONS, type Dock } from "./toolbar";
```
En tête de `start()`, juste après `const core = createWasmCore(wasm);` :
```ts
  // C11a (P13) : la fenêtre `annotate` n'a ni fichiers, ni profils, ni espace de travail.
  const params = new URLSearchParams(window.location.search);
  if (params.get("fenetre") === "annotation") {
    const p = await loadTauriPorts();
    await startAnnotateWindow(core, p.ipc, keyOf);
    return;
  }
```
Remplacer la ligne `const env = { tauri, userAgent: navigator.userAgent, officeConverter: … };` par :
```ts
  // C11a (P16, P22, P29) : hôte des fenêtres d'annotation (coque, ou faux hôte `?annotation=faux` hors coque seulement),
  // et support lu avant les capacités.
  const fakeAnnotation = !tauri && params.get("annotation") === "faux";
  const emitTo = ipc?.emitTo;
  const windows: AnnotationWindows | null =
    ipc !== null && emitTo !== undefined
      ? createTauriAnnotationWindows({
          invoke: <T>(c: string, a?: Record<string, unknown>) => ipc.invoke<T>(c, a),
          listen: <T>(e: string, cb: (x: { readonly payload: T }) => void) => ipc.listen<T>(e, cb),
          emitTo,
        })
      : fakeAnnotation
        ? createFakeAnnotationWindows({ dataset: document.body.dataset as Record<string, string | undefined> })
        : null;
  const support: AnnotationSupport | null =
    windows === null ? null : await windows.support().catch((): AnnotationSupport => ({ supported: false, reason: null, screens: 1 }));
  const env = {
    tauri,
    userAgent: navigator.userAgent,
    officeConverter: ipc === null ? false : await officeConverter(ipc),
    ...(tauri && support !== null ? { annotationSupported: support.supported } : {}),
    ...(fakeAnnotation ? { forceAnnotation: true } : {}),
  };
```
Avant `const workspace = await createWorkspace({` : `let annotation: AnnotationControl | null = null;` ; dans les deps :
```ts
    // C11a (P17, P18, P25) : contrôleur relu à chaque appel (créé juste après) ; sortie relancée après l'annotation.
    annotation: () => annotation,
    ...(ipc === null ? {} : { quit: () => quitApp(ipc) }),
```
Après `createWorkspace(…)` :
```ts
  // C11a : côté et épaisseur de la première barre `tools`, mesurés dans la page (px CSS).
  const measureBar = (): { readonly dock: Dock; readonly thickness: number } => {
    const bar = active.profile().toolbars.find((b) => b.role === "tools");
    const dock: Dock = bar === undefined || bar.dock === "floating" ? "top" : bar.dock;
    const el = bar === undefined ? null : document.querySelector(`[data-toolbar="${CSS.escape(bar.id)}"]`);
    const r = el?.getBoundingClientRect();
    const thickness = r === undefined ? 64 : Math.ceil(dock === "top" || dock === "bottom" ? r.height : r.width);
    return { dock, thickness };
  };
  const ctl =
    windows === null
      ? null
      : createAnnotationController({
          windows,
          annotationTab: () => workspace.annotationTab(),
          encodeTab: (t) => workspace.encodeTab(t),
          replaceAnnotation: (b) => workspace.replaceAnnotation(b),
          activeTabId: () => workspace.tabs.active()?.id ?? null,
          showTab: (id) => void workspace.tabs.activate(id),
          importFiles: (f, at) => workspace.importFiles(f, at),
          pageNumber: () => workspace.active().board.engine.state().pageIndex + 1,
          say: (m) => workspace.say(m),
          bar: measureBar,
          profile: () => active.profile(),
          screens: support?.screens ?? 1,
        });
  annotation = ctl;
  if (windows !== null && support !== null) {
    void offerCompatRelaunch(support, active.profile().behavior.startMode, (m) => workspace.ask(m), () => windows.relaunchCompat());
  }
```
Dans `mountApp(root, { … })`, ajouter :
```ts
    ...(ctl === null || windows === null
      ? {}
      : { annotation: { control: ctl, remote: (local) => createRemoteToolbarHost((m) => ctl.command(m), local, ANNOTATION_REMOTE_ACTIONS), onView: (cb) => windows.onView(cb) } }),
```
(`active` est déclaré plus haut dans `start()` ; si `measureBar` le précède, déplacer sa déclaration après `active`.)

- [ ] **Étape 5 : `verifier.sh` et son contrôle.** Dans `scripts/verifier.sh`, après `echo "C13 tableaux : OK"` :
```bash
  node scripts/essais/c11a-annotation-navigateur.mjs
  echo "C11a annotation : OK"
```
Dans `scripts/tests/verifier-e2e.test.sh`, après la ligne C16 :
```bash
# C11a : ligne à part, comme C16.
grep -q "scripts/essais/c11a-annotation-navigateur.mjs" scripts/verifier.sh || ko "c11a-annotation-navigateur absent de verifier.sh"
```

- [ ] **Étape 6 : vert.** Build et essai (commande bornée de la section) ; puis `verifier-e2e.test.sh`, les quatre
essais de non-régression, les tailles Wasm, tsc et `pnpm -r test`. Si un test d'App ou de `main` échoue parce que
`document.body.dataset` est absent (happy-dom), le faux hôte n'est construit que sous `?annotation=faux` : aucun test
unitaire n'y passe.

- [ ] **Étape 7 : commit.**
```bash
cd $WT && git add apps/web/src/main.ts apps/web/src/annotate-start.ts scripts/essais/c11a-annotation-navigateur.mjs scripts/verifier.sh scripts/tests/verifier-e2e.test.sh
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "feat(annotation): wire main and annotate windows, add C11a browser trial" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche T10 — Aller-retour bout à bout (Vitest) : tracer, sortir, enregistrer, rouvrir ; Ctrl+S ; fermeture ; faux hôte muet
<a id="tache-t10"></a>

**Objectif.** Prouver S4 de bout en bout sans coque : un vrai espace de travail (fabrique `setupWorkspace` de
`workspace.test.ts`, faux cœur), le vrai contrôleur de T4 et le faux hôte au canal JSON dont `draw` charge le document
reçu dans le cœur et y trace un trait. Entrer, tracer, sortir, enregistrer l'onglet d'annotation, rouvrir : le trait est
là ; enregistré sous `x.roomboard`, rentrer, tracer, sortir : modifié, Ctrl+S réécrit la même cible ; fermeture de
l'application en annotation : refusée, sortie, puis question de l'onglet modifié ; faux hôte muet : sortie après 5 s
avec l'avis.

**Fichiers.**
- Modifier (tests seulement) : `apps/web/src/app/workspace.test.ts` (nouveau `describe` en fin de fichier)

**Interfaces.**
- Consomme (T4) : `createAnnotationController<TabSession>(deps)`, `createFakeAnnotationWindows({ draw, mute })`, `INK_LOST_MESSAGE`.
- Consomme (T7) : `setupWorkspace({ annotation, quit })`, `divert`, `Workspace.annotationTab`, `encodeTab`, `replaceAnnotation`, `WorkspaceDeps.annotation`.
- Produit : aucun code de production.
- Réutilise : `apps/web/src/app/workspace.ts:650` (`importFiles`) et `:314` (`addTab`) par l'espace de travail réel ; `apps/web/src/app/container-io.ts:61, 64` (`encode`, `read`) par `encodeTab` et `replaceAnnotation`.

**Test et commande bornée.**
```bash
node ~/.claude/scripts/chaine/jeton.cjs --nom tests --proprietaire usage-c11a-annotation/T10 --places-par-sujet 3 --commande "cd $WT/apps/web && nice -n 10 pnpm exec vitest run src/app/workspace.test.ts > /tmp/c11a-T10-vitest.log 2>&1"; tail -20 /tmp/c11a-T10-vitest.log
```
Preuve attendue : `Tests  N passed`, N ≥ 1 ; `grep -c "S4 aller-retour : le trait est là après réouverture" $WT/apps/web/src/app/workspace.test.ts` = 1.
Puis `pnpm -r test` sous le jeton (`/tmp/c11a-T10-all.log`, aucun `FAIL `) et tsc (`tsc=0`).

**Preuve visuelle.** Aucune.

**Contraintes (recopiées de Global Constraints).**
- GC1 — Le chemin de l'encre ne traverse jamais la frontière page ↔ Rust natif ; entre fenêtres ne passent que des commandes de barre, l'état des boutons et le document entier en base64.
- GC3 — Builds et tests en `nice -n 10` ; `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH`. Attention au `CARGO_TARGET_DIR` partagé entre worktrees : ne le pose pas, chaque worktree garde son `target/`.
- GC4 — Suites sous le jeton : `node ~/.claude/scripts/chaine/jeton.cjs --nom tests --proprietaire usage-c11a-annotation/T<n> --places-par-sujet 3 --commande "<commande bornée, sortie redirigée vers un fichier>"`.
- GC5 — Tests rapides du profil : `cargo test --workspace 2>&1 | tail -20` · `pnpm -r test 2>&1 | tail -20` ; complet : `scripts/verifier.sh --e2e`.
- GC6 — Compatibilité : un fichier `.roomboard` et un profil d'avant C11a s'ouvrent toujours (test).
- GC9 — Aucun test désactivé ou sauté, aucun seuil changé. Pas de `git add -A`/`.`, pas de `commit -a`, pas de `--force`. Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>` (via `git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit`), messages en anglais terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- GC10 — Aucune dépendance en AGPL/GPL/LGPL ; aucun paquet système installé ; aucun workflow GitHub.

**Interdits.** Aucun changement de code de production : si un test révèle un défaut, le rapporter (fichier, ligne,
scénario) au lieu de corriger hors périmètre ; ne pas modifier les tests de T7 du même fichier.

**Critère « terminé ».** Les quatre tests verts, `pnpm -r test` sans `FAIL ` ; un commit. Rapport :
`Réutilisation : appelé workspace.ts (réel) et app/annotation.ts (réel) avec platform/annotation-fake.ts` ou `Réutilisation : écart — <pourquoi>`.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree** (bloc de T2, étape 1).

- [ ] **Étape 2 : écrire les tests** en fin de `workspace.test.ts` (imports : `createAnnotationController` de `./annotation`,
`createFakeAnnotationWindows` de `../platform/annotation-fake`, `INK_LOST_MESSAGE` de `../platform/annotation-port`,
`BUILTIN_PROFILES` de `../toolbar-profiles`, `type AnnotationControl` de `../platform/annotation-port`).
```ts
describe("C11a — aller-retour bout à bout (S4)", () => {
  /** Ce que `annotate` trace : un trait sur la première page du document reçu (faux cœur). */
  const draw = async (bytes: Uint8Array): Promise<Uint8Array> => {
    const d = fakeCore.load(bytes);
    d.apply({ type: "CommitStroke", page: d.pageIds()[0]!, points: new Float32Array([0, 10, 0.5, 50, 10, 0.5]), style: { color: "#000000", width: 4 } });
    const out = d.save("2026-11-23T00:00:00Z", APP_VERSION);
    d.free();
    return out;
  };
  const strokes = (t: TabSession): number => t.board.doc.elementIds(t.board.doc.pageIds()[0]!).length;
  async function wire(o: { mute?: boolean; quit?: () => Promise<void> } = {}) {
    let ctl: AnnotationControl | null = null;
    const ws = await setupWorkspace({ annotation: () => ctl, ...(o.quit ? { quit: o.quit } : {}) });
    const windows = createFakeAnnotationWindows({ draw, ...(o.mute ? { mute: true } : {}) });
    ctl = createAnnotationController<TabSession>({
      windows,
      annotationTab: () => ws.annotationTab(),
      encodeTab: (t) => ws.encodeTab(t),
      replaceAnnotation: (b) => ws.replaceAnnotation(b),
      activeTabId: () => ws.tabs.active()?.id ?? null,
      showTab: (id) => void ws.tabs.activate(id),
      importFiles: (f, at) => ws.importFiles(f, at),
      pageNumber: () => 1,
      say: (m) => ws.say(m),
      bar: () => ({ dock: "top", thickness: 48 }),
      profile: () => BUILTIN_PROFILES[0]!,
    });
    const annTab = () => ws.tabs.list().find((t) => t.kind === "annotation")!.session;
    return { ws, ctl, windows, annTab };
  }

  it("S4 aller-retour : le trait est là après réouverture", async () => {
    const { ws, ctl, annTab } = await wire();
    const origin = ws.active();
    await ctl.enter();
    await ctl.exit();
    expect(ws.active()).toBe(origin);
    expect(strokes(annTab())).toBe(1);
    expect(annTab().files.isDirty()).toBe(true);
    expect(await annTab().files.run("saveAs")).toBe(true);
    const bytes = saved.at(-1)!;
    expect(await ws.openDocument({ name: "x.roomboard", bytes, target: null })).toBe(true);
    expect(strokes(ws.tabs.list().at(-1)!.session)).toBe(1);
  });
  it("enregistré sous x.roomboard, rentrer, tracer, sortir : modifié, Ctrl+S réécrit la même cible", async () => {
    const { ctl, annTab } = await wire();
    await ctl.enter();
    await ctl.exit();
    await annTab().files.run("saveAs");
    const target = annTab().files.target();
    expect(annTab().files.isDirty()).toBe(false);
    await ctl.enter();
    await ctl.exit();
    expect(annTab().files.isDirty()).toBe(true);
    expect(strokes(annTab())).toBe(2);
    host.save.mockClear();
    expect(annTab().files.key({ key: "s", ctrlKey: true, metaKey: false, shiftKey: false, altKey: false })).toBe(true);
    await vi.waitFor(() => expect(host.save).toHaveBeenCalledTimes(1));
    expect(host.save.mock.calls[0]![1]).toEqual(target);
  });
  it("fermeture de l'application en annotation : refusée, sortie, puis question de l'onglet modifié, puis quit", async () => {
    const quit = vi.fn(async () => undefined);
    const { ctl } = await wire({ quit });
    await ctl.enter();
    answer = true;
    expect(divert!()).toBe(true);
    await vi.waitFor(() => expect(quit).toHaveBeenCalledTimes(1));
    expect(ctl.state().active).toBe(false);
    expect(shell.confirm).toHaveBeenCalledWith(DISCARD_MESSAGE);
  });
  it("faux hôte muet : sortie après 5 s avec l'avis, onglet d'annotation inchangé", async () => {
    vi.useFakeTimers();
    try {
      const { ctl, annTab } = await wire({ mute: true });
      await ctl.enter();
      const before = annTab();
      const done = ctl.exit();
      await vi.advanceTimersByTimeAsync(5000);
      await done;
      expect(ctl.state().active).toBe(false);
      expect(shell.notify).toHaveBeenCalledWith(INK_LOST_MESSAGE);
      expect(annTab()).toBe(before);
    } finally {
      vi.useRealTimers();
    }
  });
});
```
Si `fakeCore.load` ou `doc.free` portent un autre nom dans le faux cœur, prendre ceux qu'appelle `app/container-io.ts:76`
(`core.load`) et que libère `workspace.ts:323-327` (`doc.free()`).

- [ ] **Étape 3 : lancer** (commande bornée). Attendu : vert (le code est livré par T4 et T7). Un rouge ici est un défaut
d'intégration : le décrire au rapport avec le message exact.

- [ ] **Étape 4 : `pnpm -r test`, tsc** (section « Test et commande bornée »).

- [ ] **Étape 5 : commit.**
```bash
cd $WT && git add apps/web/src/app/workspace.test.ts
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "test(annotation): end-to-end round trip through workspace, controller and JSON fake" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Relecture du plan (writing-plans, par moi-même)

- **Couverture du cadrage.** P1 (T5, T8) · P2 (T3, T6, T9) · P3 (T3, T7, T8) · P4 (T3, T4, T6, T7, T10) · P5 (T4, T5) ·
  P6 (T2, T8) · P7 (T2, T8) · P8 (T4, T6) · P9 (T1, T5, T6) · P10 (T1, T5) · P11 (T1, T5) · P12 (T5) · P13 (T5, T7) ·
  P14 (T6, T8) · P15 (T1, T2, T4, T5) · P16 (T1, T2, T4, T5, T9) · P17 (T4, T7, T8, T9) · P18 (T5, T7, T9) · P19 (T2, T8) ·
  P20 (T2, T8) · P21 (T4, T8, T9) · P22 (T8, T9) · P23 (T2) · P24 (T6) · P25 (T3, T7, T10) · P26 (T7, T10) · P27 (T9) ·
  P28 (T1, T4) · P29 (T2, T4, T9) · P30 (T5, fiche). S1 → T9 ; S2 → T4, T8, T9 ; S3 → T9 ; S4 → T1, T2, T3, T4, T6, T7, T10 ; S5 → T5.
- **Effets de bord (carte d'impact).** `setMode` → T8 (`toolbar-host.test.ts`, `App.test.tsx`, cas réécrits) ; barres
  livrées → T2 (`toolbar-profiles.test.ts`) et T9 (c10a, c4, c15, nouvel essai) ; `runtimeCapabilities` → T2 ; dépôts de
  `main` seulement → T5 (fiche C11a-5, `cargo check`) ; `tabs.add("annotation")` → T3 (`tabs.test.ts`) et T7 ; fermeture
  en annotation → T7, T10 ; rendu `transparent` → T6 (`canvas2d.test.ts`, cas « défaut ») ; `guardClose` → T3
  (`shell-web.test.ts`, `host-tauri.test.ts`) ; `FileController` → T3 (`controller.test.ts`) ; destruction d'`annotate`
  → T5 (fiche C11a-4).
- **Tests à garder verts.** `toolbar.test.ts:135, 304`, `Toolbar.test.tsx:55, 116, 150` (T2, T8) ; `wasm-core.contract.test.ts:364-366` (T6, suite) ;
  `capabilities.rs:35` (T1) ; `c1-profils-navigateur.mjs:236-245`, `c10a:67`, `c4:122`, `c15:187` (T9) ; `coque-csp.test.sh` (T5).
- **Noms cohérents.** `AnnotationWindows` (T3) = méthodes de T4 (faux), T5 (coque), T9 (branchement) ; `collect`/`leave`
  remplacent l'`exit()` unique du tableau des modules (le délai de 5 s est dans le contrôleur) ; `annotation-returned`
  remplace le second `annotation-document` de DA2 (écoute globale de Tauri 2) ; `annotationTab()` asynchrone ;
  `passThrough` dans `annotation-page.ts`. Ces quatre précisions ne changent aucune décision.
