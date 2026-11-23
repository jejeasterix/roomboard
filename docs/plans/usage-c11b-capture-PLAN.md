# C11b — annotation : capture du bureau et envoi au tableau : plan d'exécution

> Exécution : étage 3 de nouvelle-feature — l'orchestrateur lit la table, une tâche = sa section.

| id | titre | dépend de | fichiers touchés | worktree | subagent | preuve | scénario | section |
|----|-------|-----------|------------------|----------|----------|--------|----------|---------|
| T1 | Géométrie partagée `placement` et règle `transparency` (`roomboard_shell::annotation`) | — | crates/roomboard-shell/src/annotation.rs, crates/roomboard-shell/tests/annotation.rs | isolé | implementeur-tdd | `cargo test -p roomboard-shell --test annotation` : `test result: ok. N passed`, N ≥ 22, `placement_reprend_pick_screen_physical_et_split` présent ; fmt et clippy verts | S4 | #tache-t1 |
| T2 | Module `roomboard_shell::capture` (découpe, BGRX → RGBA, PNG, fichier accordé, purge, adaptateurs par plateforme) et dépendances | — | crates/roomboard-shell/src/capture.rs, crates/roomboard-shell/src/lib.rs, crates/roomboard-shell/Cargo.toml, Cargo.lock, crates/roomboard-shell/tests/capture.rs | isolé | implementeur-tdd | `cargo test -p roomboard-shell --test capture` : `test result: ok. N passed; 0 failed; 1 ignored`, N ≥ 17, `fichier_accorde_lisible_puis_retire` présent ; clippy vert ; licences `OK` ; 0 ligne `-version` dans `git diff Cargo.lock` | S4 | #tache-t2 |
| T3 | Coque : `annotation_capture`, `release_capture`, `annotation_support.transparent`, `annotation_enter` par `placement`, purge au lancement | T1, T2 | apps/desktop/src-tauri/src/main.rs, apps/desktop/src-tauri/Cargo.lock, crates/roomboard-shell/tests/coque_c11b.rs | isolé | implementeur-tdd | `cargo test -p roomboard-shell --test coque_c11b` : N ≥ 4, `capture_hides_then_shows_windows_after_the_blocking_capture` présent ; `coque_c16` vert ; `cargo check` et `cargo clippy -D warnings` de src-tauri : `Finished` ; licences `OK` | S4, S5 | #tache-t3 |
| T4 | Port des fenêtres et hôtes : `capture`, `load`, `opaque`, `view`, `transparent`, `sendTarget`, avis | — | apps/web/src/platform/annotation-port.ts, apps/web/src/platform/annotation-port.test.ts, apps/web/src/platform/annotation-fake.ts, apps/web/src/platform/annotation-fake.test.ts, apps/web/src/platform/annotation-tauri.ts, apps/web/src/platform/annotation-tauri.test.ts | isolé | implementeur-tdd | Vitest 3 fichiers : `Tests  N passed`, N ≥ 30, `lecture du fichier en échec : failed, et release_capture appelé quand même` présent ; tsc 0 | S2, S3 | #tache-t4 |
| T5 | Page `annotate` opaque (bureau figé) et vue rendue à la collecte | T4 | apps/web/src/app/annotation-page.ts, apps/web/src/app/annotation-page.test.ts, apps/web/src/annotate-start.ts | isolé | implementeur-tdd | Vitest `annotation-page.test.ts` : `Tests  N passed`, N ≥ 1, `opaque : session opaque, aucun sondage en Sélection` présent ; tsc 0 | S3 | #tache-t5 |
| T6 | Page envoyée `app/desktop-page.ts` (`capturePage`) | — | apps/web/src/app/desktop-page.ts, apps/web/src/app/desktop-page.test.ts | isolé | implementeur-tdd | Vitest `desktop-page.test.ts` : `Tests  N passed`, N ≥ 11, 0 skipped (vrai cœur présent), `vrai cœur` présent ; tsc 0 | S1, S4 | #tache-t6 |
| T7 | Contrôleur : figer, envoyer, repli figé, réentrée figée, pointeur en figé | T4, T6 | apps/web/src/platform/annotation-port.ts, apps/web/src/app/annotation.ts, apps/web/src/app/annotation.test.ts, apps/web/src/ui/App.test.tsx | isolé | concepteur-critique | Vitest 2 fichiers : `Tests  N passed`, N ≥ 1, `Envoyer au tableau (vivant) : capture avant la collecte` et `double clic sur « Envoyer au tableau »` présents ; tsc 0 | S1, S2, S3 | #tache-t7 |
| T8 | Espace de travail : `sendCapture`, `setAnnotationBackdrop`, `annotationBackdrop` ; compatibilité | T4, T6 | apps/web/src/app/workspace.ts, apps/web/src/app/workspace.test.ts | isolé | concepteur-critique | Vitest `workspace.test.ts` : `Tests  N passed`, N ≥ 1, 0 skipped dans le bloc C11b, `compatibilité : socle-v1.roomboard` présent ; tsc 0 | S1, S4 | #tache-t8 |
| T9 | Barre : trois actions, masquées au tableau, état des boutons, hôte local | T4 | apps/web/src/toolbar.ts, apps/web/src/toolbar.test.ts, apps/web/src/toolbar-profiles.ts, apps/web/src/toolbar-profiles.test.ts, apps/web/src/ui/item-state.ts, apps/web/src/ui/item-state.test.ts, apps/web/src/app/toolbar-host.ts, apps/web/src/app/toolbar-host.test.ts | isolé | implementeur-tdd | Vitest 4 fichiers + `Toolbar.test.tsx` : `Tests  N passed`, N ≥ 1, `C11b : figer et envoyer (P5, P29)` présent ; tsc 0 | S3, S4 | #tache-t9 |
| T10 | Branchement `main.ts` et `App.tsx`, essai Playwright `c11b-capture-navigateur.mjs` dans `verifier.sh --e2e` | T3, T5, T7, T8, T9 | apps/web/src/main.ts, apps/web/src/ui/App.tsx, scripts/essais/c11b-capture-navigateur.mjs, scripts/verifier.sh, scripts/tests/verifier-e2e.test.sh | isolé | implementeur-tdd | `node scripts/essais/c11b-capture-navigateur.mjs` : `C11b : OK`, ≥ 40 lignes `ok —`, `S1 : avis « envoyé au tableau : page 2 »` présent ; c11a, c1, c10a, c4, c15 `OK` ; `verifier.sh --e2e` : `verifier.sh : e2e OK`, `module Wasm : 1374398 octets`, `module formats : 2794511 octets` | S1, S2, S3 | #tache-t10 |
| T11 | Fiche d'essais réels en coque `docs/essais/c11b-coque.md` | — | docs/essais/c11b-coque.md, docs/essais/c11a-coque.md | isolé | implementeur-tdd | `grep -c '^- \[ \]' docs/essais/c11b-coque.md` ≥ 30 ; `grep -c 'c11b-coque.md' docs/essais/c11a-coque.md` = 1 | S5 | #tache-t11 |

Vagues : 1 = T1, T2, T4, T6, T11 · 2 = T3, T5, T7, T8, T9 · 3 = T10. Aucune tâche d'une vague ne recoupe une autre de sa
vague (`annotation-port.ts` : T4 en vague 1, T7 en vague 2 ; `ui/App.test.tsx` : T7 ; `ui/App.tsx` : T10). Seule T3
compile `apps/desktop/src-tauri` (un seul build Tauri à la fois, profil).

**Goal :** en coque, « Figer le bureau » pose une capture de l'écran (sans nos fenêtres) en fond d'une fenêtre
d'annotation opaque, aussi en repli automatique sans transparence, et « Envoyer au tableau » ajoute en une étape une page
après la page montrée, capture en fond et encre en objets ; sans capture, fond blanc et avis.

**Architecture :** la capture vit dans `roomboard_shell::capture` (fonctions pures testées par `cargo test`, adaptateurs
`xcap` sous Windows et macOS, Xlib par `x11-dl` sous Linux X11, Wayland refusé) ; `main.rs` n'a que deux commandes
minces qui écrivent un PNG dans un dossier privé et l'accordent à la page (DA1, DA2). Côté page, l'encre ne quitte
jamais la page : le contrôleur (`app/annotation.ts`) capture, sort par l'aller-retour C11a, puis l'espace de travail
construit la page par `capturePage` (`extract`, `insertFragment`, `SetBackdrop`, `Transform`) et l'insère par
`engine.insertPages` (une étape). Le bureau figé est un fond du document d'annotation, renvoyé à `annotate` par
l'aller-retour existant avec `opaque` (DA3) ; les trois issues de Q2 sont trois actions de barre (DA4).

**Tech Stack :** Rust (crate `roomboard-shell` : `png` 0.18.1, `x11-dl` 2.21.0, `xcap` 0.9.10, `objc2-core-graphics`
0.3.2 ; Tauri 2 hors workspace), TypeScript, SolidJS, Vitest (happy-dom, vrai cœur Wasm chargé en Node), Playwright
(Chromium de la VM).

**Spec :** `docs/plans/usage-c11b-capture-cadrage.md` (fait foi ; décisions P1 à P36, DA1 à DA4, scénarios S1 à S5,
carte d'impact § 3, interfaces § 3.8, modules à réutiliser § « Modules à réutiliser ou à étendre »).

## Global Constraints

- GC1 — Le chemin de l'encre ne traverse jamais la frontière page ↔ Rust natif ; seule la capture passe par un fichier accordé (U24).
- GC2 — Capture dans `crates/roomboard-shell` (testable hors Tauri), commandes Tauri minces dans `apps/desktop/src-tauri`. `xcap` seulement sous `cfg(any(windows, target_os="macos"))` ; Linux par `x11-dl` + `png`. Aucun paquet système installé. Licence vérifiée de chaque nouvelle dépendance (aucune AGPL/GPL/LGPL liée ; outil du dépôt `controle-licences.mjs`).
- GC3 — Coque : aucun `tauri build`, aucun bundle ; `nice -n 10 cargo check|test|clippy -j 4` seulement. `CARGO_TARGET_DIR` : ne pas le partager entre worktrees (chaque worktree de tâche garde son `target/`, ou le dire explicitement). Dans ce plan : `unset CARGO_TARGET_DIR` avant toute commande cargo, chaque worktree garde son `target/` (racine) et `apps/desktop/src-tauri/target/`.
- GC4 — Builds et tests en `nice -n 10`. Un test qui échoue sur un délai est rejoué une fois ; aucun délai relevé, aucun test désactivé ou sauté, aucun seuil changé.
- GC5 — Tailles Wasm : module principal 1 374 398 o (plafond 1 572 864), `formats` 2 794 511 o (plafond 3 145 728), aucun plafond ne bouge. Le chantier ne touche ni `roomboard-core`, ni `roomboard-wasm`, ni `roomboard-formats`, ni `roomboard-formats-wasm` (P32).
- GC6 — La scène ne passe pas sous 640 px ; l'essai Playwright le mesure.
- GC7 — Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, messages en anglais, terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers ajoutés un par un (jamais `git add -A`/`.`/`commit -a`). Forme : `git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "<message>" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.
- GC8 — `PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` pour cargo et pnpm.
- GC9 — Suites lourdes (`cargo test --workspace`, src-tauri, suite web complète, `verifier.sh`) sous le jeton de la chaîne : `node ~/.claude/scripts/chaine/jeton.cjs --nom tests --proprietaire usage-c11b-capture/T<n> --places-par-sujet 3 --commande "<commande, sortie redirigée vers un fichier>"`, puis lecture bornée du fichier (`tail`, `grep`).

## Review Focus

- RF1 — Double clic sur « Envoyer au tableau » (deux envois en file) : une seule capture, une seule page, aucun rejet. Cadrage P3 (« une transaction, une étape »), P7, file `serial` de C11a. Test : T7 `Review : double clic sur « Envoyer au tableau »`.
- RF2 — Onglet d'origine fermé pendant l'annotation : la page part dans un nouvel onglet, rien ne se perd. Cadrage P6 (« si l'origine est absente … "new" »). Test : T8 `Review : onglet d'origine fermé pendant l'annotation`.
- RF3 — 12 onglets ouverts et cible « nouvel onglet » : avis « 12 onglets au plus ; fermez-en un », aucune page, l'encre reste dans l'onglet d'annotation. Cadrage P8, P9 ; plafond C11a P3. Test : T8 `Review : 12 onglets et cible nouvel onglet`.
- RF4 — Écran à échelle fractionnaire (150 %) ou zone qui déborde de l'image : découpe bornée à l'image, jamais de panique. Cadrage P23 (« échelle largeur image / largeur écran »), HC11b-11. Test : T2 `zone_echelle_fractionnaire_bornee_a_l_image`.
- RF5 — Vue illisible rendue par `annotate` (page négative, matrice à 5 nombres, `NaN` devenu `null` dans le JSON) : ignorée, identité et page 0. Cadrage P13 (« Absent … : page 0, identité »). Tests : T4 `isViewport` et `collect : vue lisible rendue ; vue illisible ignorée`.

## Carte des fichiers

| fichier | rôle | tâche |
|---|---|---|
| `crates/roomboard-shell/src/annotation.rs` | `Placement`, `placement`, `transparency` | T1 |
| `crates/roomboard-shell/src/capture.rs` (nouveau) | capture pure + adaptateurs `#[cfg]` | T2 |
| `crates/roomboard-shell/src/lib.rs` | `pub mod capture;` | T2 |
| `crates/roomboard-shell/Cargo.toml`, `Cargo.lock` | `png`, `x11-dl`, `xcap`, `objc2-core-graphics` | T2 |
| `crates/roomboard-shell/tests/annotation.rs`, `tests/capture.rs` (nouveau) | tests de la logique pure | T1, T2 |
| `apps/desktop/src-tauri/src/main.rs`, `apps/desktop/src-tauri/Cargo.lock` | commandes minces de capture | T3 |
| `crates/roomboard-shell/tests/coque_c11b.rs` (nouveau) | garde-fou de `main.rs` par lecture | T3 |
| `apps/web/src/platform/annotation-port.ts` | types de capture, vue, cible, avis (T4) ; état et contrôle (T7) | T4, T7 |
| `apps/web/src/platform/annotation-fake.ts`, `annotation-tauri.ts` | hôtes : `capture`, `load`, `opaque`, `view`, `transparent` | T4 |
| `apps/web/src/app/annotation-page.ts`, `apps/web/src/annotate-start.ts` | `annotate` opaque, `view` | T5 |
| `apps/web/src/app/desktop-page.ts` (nouveau) | `capturePage`, `PageBackdrop`, `IDENTITY_MATRIX` | T6 |
| `apps/web/src/app/annotation.ts` | `freeze`, `send`, repli, réentrée figée | T7 |
| `apps/web/src/ui/App.test.tsx` | faux contrôle complété (`freeze`, `send`) | T7 |
| `apps/web/src/app/workspace.ts` | `sendCapture`, `setAnnotationBackdrop`, `annotationBackdrop` | T8 |
| `apps/web/src/toolbar.ts`, `toolbar-profiles.ts`, `ui/item-state.ts`, `app/toolbar-host.ts` | trois actions | T9 |
| `apps/web/src/main.ts`, `apps/web/src/ui/App.tsx` | branchement, faux hôte par l'adresse, vue de barre | T10 |
| `scripts/essais/c11b-capture-navigateur.mjs` (nouveau), `scripts/verifier.sh`, `scripts/tests/verifier-e2e.test.sh` | essai S1 à S3 | T10 |
| `docs/essais/c11b-coque.md` (nouveau), `docs/essais/c11a-coque.md` | essais réels (S5) | T11 |

Non touchés (carte d'impact « non ») : `tauri.conf.json`, `capabilities/*.json`, `src-tauri/Cargo.toml`, `build.rs`,
les crates du cœur et du Wasm, le format `.roomboard`, `PROFILE_MINOR`, `board-session.ts`, `canvas2d.ts`,
`fragments.ts`, `engine.ts`, `core/api.ts`, `asset-store.ts`, `host-tauri.ts`, `ui/Toolbar.tsx`, `ui/rb.css`.
Écart à la carte d'impact : `ui/App.tsx` (carte : « non ») est touché par T10 (vue de barre, l. 344, qui recopie les
champs de l'état un par un) et `ui/App.test.tsx` par T7 (faux `AnnotationControl` typé).

## Préparation commune d'un worktree (recopiée dans chaque section)

`WT` est le worktree que l'orchestrateur donne à la tâche (isolé : `/home/adminjd/projets/roomboard-wt/usage-c11b-capture--T<n>`).
`SRC=/home/adminjd/projets/roomboard-wt/usage-c11b-capture` est le worktree du chantier. Les modules Wasm
(`apps/web/src/wasm`, `apps/web/src/wasm-formats`) et `apps/web/dist` sont ignorés par git : un worktree neuf les copie
depuis `SRC` (le cœur ne change pas, P32 : les modules de `SRC` sont ceux de la référence à l'octet).

---
### Tâche T1 — Géométrie partagée `placement` et règle `transparency` (`roomboard_shell::annotation`)
<a id="tache-t1"></a>

**Objectif.** Une seule fonction pure pour la géométrie de l'écran de l'annotation (écran retenu, bande de la barre,
zone d'annotation, rectangle de l'écran), appelée plus tard par `annotation_enter` et `annotation_capture` (P22, P23),
et la règle pure de la transparence peinte (P18). Aucun changement de comportement de `split`, `pick_screen`, `physical`.

**Fichiers.**
- Modifier : `crates/roomboard-shell/src/annotation.rs` (ajouts après `pick_screen`, l. 147-160)
- Test : `crates/roomboard-shell/tests/annotation.rs` (ajouts en fin de fichier ; ligne `use` l. 2-5 complétée)

**Interfaces.**
- Consomme : `annotation::{Rect, Session, Side, split, physical, pick_screen, side_of}` (existants, inchangés).
- Produit (utilisé par T3, `main.rs`) :
  - `#[derive(Clone, Copy, Debug, PartialEq, Eq)] pub struct Placement { pub index: usize, pub bar: Rect, pub area: Rect, pub monitor: Rect }`
  - `pub fn placement(screens: &[(Rect, f64)], wanted: Option<usize>, main_center: (i32, i32), dock: &str, thickness_css: f64) -> Placement`
  - `pub fn transparency(session: Session, composited: Option<bool>) -> bool`
- Réutilise : `crates/roomboard-shell/src/annotation.rs:75, :128, :147` (`split`, `physical`, `pick_screen`) — `placement(…)` les appelle tels quels ; module étendu (sinon la géométrie serait recopiée dans deux commandes).

**Test et commande bornée.**
```bash
export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH; unset CARGO_TARGET_DIR
cd "$WT" && nice -n 10 cargo test -p roomboard-shell --test annotation -j 4 2>&1 | tail -30
```
Preuve attendue : `test result: ok. N passed; 0 failed`, N ≥ 22 (17 tests C11a gardés verts + 5 nouveaux), lignes
`test placement_reprend_pick_screen_physical_et_split ... ok` et `test transparency_x11_sans_compositeur_seulement ... ok`.
Effet de bord (cadrage § « Effets de bord ») : les 17 tests existants de `tests/annotation.rs` (cas de `split` repris par
`placement`) restent `ok`.

**Preuve visuelle.** Aucune (pas d'interface).

**Contraintes (recopiées de Global Constraints).**
- GC2 — Capture dans `crates/roomboard-shell` (testable hors Tauri), commandes Tauri minces dans `apps/desktop/src-tauri`. `xcap` seulement sous `cfg(any(windows, target_os="macos"))` ; Linux par `x11-dl` + `png`. Aucun paquet système installé. Licence vérifiée de chaque nouvelle dépendance (aucune AGPL/GPL/LGPL liée ; outil du dépôt `controle-licences.mjs`).
- GC3 — Coque : aucun `tauri build`, aucun bundle ; `nice -n 10 cargo check|test|clippy -j 4` seulement. `CARGO_TARGET_DIR` : ne pas le partager entre worktrees (chaque worktree de tâche garde son `target/`, ou le dire explicitement). Dans ce plan : `unset CARGO_TARGET_DIR` avant toute commande cargo.
- GC4 — Builds et tests en `nice -n 10`. Un test qui échoue sur un délai est rejoué une fois ; aucun délai relevé, aucun test désactivé ou sauté, aucun seuil changé.
- GC5 — Le chantier ne touche ni `roomboard-core`, ni `roomboard-wasm`, ni `roomboard-formats`, ni `roomboard-formats-wasm` (P32).
- GC7 — Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, messages en anglais, terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers ajoutés un par un (jamais `git add -A`/`.`/`commit -a`).
- GC8 — `PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` pour cargo et pnpm.
- GC9 — Suites lourdes sous le jeton : `node ~/.claude/scripts/chaine/jeton.cjs --nom tests --proprietaire usage-c11b-capture/T1 --places-par-sujet 3 --commande "<commande, sortie redirigée vers un fichier>"`.

**Interdits.** Aucune dépendance ajoutée (c'est T2) ; ne pas modifier `split`, `physical`, `pick_screen`, `side_of` ; ne
pas toucher `apps/desktop/src-tauri` (c'est T3) ni `lib.rs`.

**Critère « terminé ».** Les 5 tests nouveaux et les 17 anciens passent ; `cargo fmt -p roomboard-shell --check` et
`cargo clippy -p roomboard-shell --all-targets -- -D warnings` verts ; `cargo test --workspace` sans échec ; un commit.
Le rapport porte la ligne `Réutilisation : appelé crates/roomboard-shell/src/annotation.rs (split, physical, pick_screen)`
ou `Réutilisation : écart — <pourquoi>`.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree.**
```bash
export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH; unset CARGO_TARGET_DIR
cd "$WT" && git status --short | head -5
```
Attendu : rien de modifié.

- [ ] **Étape 2 : écrire les tests rouges.** Dans `crates/roomboard-shell/tests/annotation.rs`, remplacer la ligne `use`
de tête par :
```rust
use roomboard_shell::annotation::{
    compat_env, cursor_in, detect_session, physical, pick_screen, placement, relaunch, relaunch_args,
    restore_steps, side_of, split, supported, transparency, Placement, Rect, RestoreStep, Session, Side,
    Unsupported,
};
```
puis ajouter en fin de fichier :
```rust
#[test]
fn placement_reprend_pick_screen_physical_et_split() {
    let screens = [(r(0, 0, 1920, 1080), 1.0), (r(1920, 0, 3840, 2160), 2.0)];
    let p = placement(&screens, None, (2500, 400), "top", 48.0);
    assert_eq!(p.index, 1);
    assert_eq!(p.monitor, r(1920, 0, 3840, 2160));
    let (bar, area) = split(r(1920, 0, 3840, 2160), Side::Top, physical(48.0, 2.0));
    assert_eq!((p.bar, p.area), (bar, area));
    assert_eq!(p.bar.h, 96);
}

#[test]
fn placement_ecran_demande_et_cote() {
    let screens = [(r(0, 0, 1920, 1080), 1.0), (r(1920, 0, 1920, 1080), 1.5)];
    let p = placement(&screens, Some(0), (2500, 400), "left", 40.0);
    assert_eq!(p.index, 0);
    assert_eq!(p.bar, r(0, 0, 40, 1080));
    assert_eq!(p.area, r(40, 0, 1880, 1080));
    assert!(disjoint(p.bar, p.area));
}

#[test]
fn placement_quatre_cotes_comme_split() {
    let screens = [(r(-1280, 0, 1280, 1024), 1.25)];
    for dock in ["top", "bottom", "left", "right", "floating"] {
        let p = placement(&screens, None, (0, 0), dock, 64.0);
        let want = split(r(-1280, 0, 1280, 1024), side_of(dock), physical(64.0, 1.25));
        assert_eq!((p.bar, p.area), want, "{dock}");
    }
}

#[test]
fn placement_sans_ecran_tout_a_zero() {
    let z = r(0, 0, 0, 0);
    assert_eq!(
        placement(&[], None, (0, 0), "top", 48.0),
        Placement { index: 0, bar: z, area: z, monitor: z }
    );
}

#[test]
fn transparency_x11_sans_compositeur_seulement() {
    assert!(!transparency(Session::X11, Some(false)));
    assert!(transparency(Session::X11, Some(true)));
    assert!(transparency(Session::X11, None));
    assert!(!transparency(Session::XWayland, Some(false)));
    assert!(transparency(Session::WaylandNative, Some(false)));
    assert!(transparency(Session::Other, None));
}
```
Si le compilateur signale un nom importé inutilisé de la ligne `use` (selon la liste réelle du fichier), garder
exactement les noms déjà importés plus `placement`, `transparency`, `Placement`.

- [ ] **Étape 3 : vérifier le rouge.**
```bash
cd "$WT" && nice -n 10 cargo test -p roomboard-shell --test annotation -j 4 2>&1 | grep -E "error\[|cannot find" | head -5
```
Attendu : `error[E0432]` ou `cannot find function \`placement\``.

- [ ] **Étape 4 : implémenter.** Dans `crates/roomboard-shell/src/annotation.rs`, après la fonction `pick_screen` :
```rust
/// C11b (P22, P23) : écran retenu, bande de la barre et zone d'annotation (px physiques), rectangle de l'écran.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Placement {
    pub index: usize,
    pub bar: Rect,
    pub area: Rect,
    pub monitor: Rect,
}

/// C11b (P22) : géométrie de l'entrée C11a (`pick_screen`, `physical`, `split`) en une fonction, partagée par
/// `annotation_enter` et `annotation_capture`. `screens` : rectangle et facteur d'échelle de chaque écran. Liste vide :
/// tout à zéro (l'appelant refuse « aucun écran » avant).
pub fn placement(
    screens: &[(Rect, f64)],
    wanted: Option<usize>,
    main_center: (i32, i32),
    dock: &str,
    thickness_css: f64,
) -> Placement {
    let rects: Vec<Rect> = screens.iter().map(|(r, _)| *r).collect();
    let index = pick_screen(&rects, wanted, main_center);
    let Some(&(monitor, scale)) = screens.get(index) else {
        let zero = Rect { x: 0, y: 0, w: 0, h: 0 };
        return Placement { index: 0, bar: zero, area: zero, monitor: zero };
    };
    let (bar, area) = split(monitor, side_of(dock), physical(thickness_css, scale));
    Placement { index, bar, area, monitor }
}

/// C11b (P18) : la transparence de `annotate` se peint-elle ? Session X11 (XWayland compris) : non seulement quand la
/// sonde dit qu'aucun compositeur ne tient `_NET_WM_CM_S<écran>` (`Some(false)`) ; sonde en échec (`None`) : oui.
/// Wayland natif (annotation refusée), Windows et macOS : oui.
pub fn transparency(session: Session, composited: Option<bool>) -> bool {
    match session {
        Session::X11 | Session::XWayland => composited != Some(false),
        Session::WaylandNative | Session::Other => true,
    }
}
```

- [ ] **Étape 5 : vérifier le vert, puis fmt, clippy et le workspace.**
```bash
cd "$WT" && nice -n 10 cargo fmt -p roomboard-shell && nice -n 10 cargo test -p roomboard-shell --test annotation -j 4 2>&1 | tail -30
cd "$WT" && nice -n 10 cargo fmt -p roomboard-shell --check && nice -n 10 cargo clippy -p roomboard-shell --all-targets -j 4 -- -D warnings 2>&1 | tail -5
node ~/.claude/scripts/chaine/jeton.cjs --nom tests --proprietaire usage-c11b-capture/T1 --places-par-sujet 3 --commande "cd $WT && nice -n 10 cargo test --workspace -j 4 > /tmp/c11b-T1-ws.log 2>&1"; grep -c "test result: ok" /tmp/c11b-T1-ws.log; grep -E "test result: FAILED|error\[" /tmp/c11b-T1-ws.log | head
```
Attendu : `test result: ok. 22 passed` (ou plus) ; fmt et clippy sans sortie d'erreur ni `warning` ; aucune ligne
d'échec dans le journal du workspace.

- [ ] **Étape 6 : commit.**
```bash
cd "$WT" && git add crates/roomboard-shell/src/annotation.rs && git add crates/roomboard-shell/tests/annotation.rs
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "feat(shell): shared annotation placement and transparency rule" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche T2 — Module `roomboard_shell::capture` et dépendances
<a id="tache-t2"></a>

**Objectif.** Toute la logique de la capture hors Tauri (P19, P21 à P26, DA1) : refus de Wayland sans essai, zone
d'annotation à l'échelle de l'image, découpe, BGRX → RGBA, PNG RGBA 8 bits en compression rapide, fichier temporaire
dans un dossier privé accordé puis retiré, purge des restes, sonde du compositeur X11, et les adaptateurs par plateforme
(`x11-dl` sous Linux, `xcap` + autorisation sous Windows et macOS). Un test X11 réel en `#[ignore]` (P26).

**Fichiers.**
- Créer : `crates/roomboard-shell/src/capture.rs`
- Modifier : `crates/roomboard-shell/src/lib.rs` (l. 11-13 : `pub mod capture;` entre `annotation` et `office`)
- Modifier : `crates/roomboard-shell/Cargo.toml` (dépendances), `Cargo.lock` (racine, régénéré par cargo)
- Test : `crates/roomboard-shell/tests/capture.rs` (nouveau)

**Interfaces.**
- Consomme : `crate::annotation::{Rect, Session}` (existants) ; `crate::GrantedPaths` (`grant`, `revoke`) ;
  `crate::office::ensure_private_dir(p: &Path) -> Result<(), ConvertError>` (`ConvertError: Display`).
- Produit (utilisé par T3) :
  - `pub const CAPTURES_DIR: &str = "captures"`, `pub const HIDDEN_SETTLE_MS: u64 = 250`, `pub const PURGE_AGE: Duration` (60 s)
  - `#[derive(Clone, Debug, PartialEq, Eq)] pub struct Frame { pub width: u32, pub height: u32, pub rgba: Vec<u8> }`
  - `#[derive(Clone, Debug, PartialEq, Eq)] pub enum CaptureError { Denied, Wayland, Failed(String) }` ; `pub fn code(&self) -> &'static str` (`"denied" | "wayland" | "failed"`) ; `impl Display`
  - `#[derive(Clone, Debug, PartialEq, Eq)] pub struct Captured { pub id: String, pub path: PathBuf, pub size: u64, pub width: u32, pub height: u32 }`
  - `pub fn allowed(session: Session) -> Result<(), CaptureError>`
  - `pub fn area_in_frame(frame_w: u32, frame_h: u32, monitor: Rect, area: Rect) -> Option<Rect>`
  - `pub fn crop(frame: &Frame, r: Rect) -> Frame`
  - `pub fn bgrx_to_rgba(src: &[u8], width: u32, height: u32, stride: usize) -> Vec<u8>`
  - `pub fn encode_png(frame: &Frame) -> Result<Vec<u8>, CaptureError>`
  - `pub fn save_granted(g: &GrantedPaths, root: &Path, png: &[u8], width: u32, height: u32) -> Result<Captured, CaptureError>`
  - `pub fn release(g: &GrantedPaths, root: &Path, id: &str)`
  - `pub fn purge(root: &Path)` ; `pub fn purge_older(root: &Path, age: Duration)`
  - `pub fn nearest(corners: &[(i64, i64)], at: (i32, i32)) -> Option<usize>`
  - `pub fn inside_root(root_w: u32, root_h: u32, r: Rect) -> bool`
  - `pub fn capture_monitor(session: Session, monitor: Rect) -> Result<Frame, CaptureError>`
  - `pub fn capture_area(g: &GrantedPaths, root: &Path, session: Session, monitor: Rect, area: Rect) -> Result<Captured, CaptureError>`
  - `pub fn composited() -> Option<bool>` (Linux : `_NET_WM_CM_S<n>` tenue ; ailleurs `None`)
- Réutilise : `crates/roomboard-shell/src/lib.rs:53-90` (`GrantedPaths`) — `g.grant([path])` à l'écriture, `g.revoke(&path)` au retrait.
- Réutilise : `crates/roomboard-shell/src/office.rs:273, :616, :645` — `ensure_private_dir(p)` appelée telle quelle pour `<root>` et `<root>/captures` ; patron `release_conversion` / `purge_conversions` repris pour `capture::release` / `capture::purge` (identifiant `<pid>-<n>` contrôlé, aucun chemin forgé).
- Réutilise : aucun module existant pour la capture d'écran (cadrage : aucune capture dans le dépôt) — nouveau module `roomboard_shell::capture` (3.8 du cadrage), logique pure testable, adaptateurs sous `#[cfg]`.
- Réutilise : `scripts/controle-licences.mjs` — inchangé, joué sur le `cargo metadata` du workspace (`--cargo-json`).

**Test et commande bornée.**
```bash
export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH; unset CARGO_TARGET_DIR
cd "$WT" && nice -n 10 cargo test -p roomboard-shell --test capture -j 4 2>&1 | tail -30
```
Preuve attendue : `test result: ok. N passed; 0 failed; 1 ignored`, N ≥ 17, lignes `test fichier_accorde_lisible_puis_retire ... ok`,
`test zone_echelle_fractionnaire_bornee_a_l_image ... ok` (RF4) et `test capture_x11_reelle ... ignored`.
Puis licences et verrou :
```bash
cd "$WT" && nice -n 10 cargo fetch > /tmp/c11b-T2-fetch.log 2>&1; tail -2 /tmp/c11b-T2-fetch.log
cd "$WT" && cargo metadata --format-version 1 --locked --offline > /tmp/c11b-T2-meta.json && node scripts/controle-licences.mjs --cargo-json /tmp/c11b-T2-meta.json 2>&1 | tail -5
cd "$WT" && git diff Cargo.lock | grep -c '^-version'; git diff --stat Cargo.lock
```
Attendu : la sortie de `controle-licences.mjs` se termine par une ligne d'accord (code 0, aucune ligne d'écart) ; `0`
ligne `-version` (aucune version existante changée, P20) ; le verrou gagne des paquets (environ 148 selon le cadrage,
nombre exact au rapport). `scripts/tests/controle-licences.test.sh` reste vert : `bash scripts/tests/controle-licences.test.sh 2>&1 | tail -3`.

**Preuve visuelle.** Aucune.

**Contraintes (recopiées de Global Constraints).**
- GC1 — Le chemin de l'encre ne traverse jamais la frontière page ↔ Rust natif ; seule la capture passe par un fichier accordé (U24).
- GC2 — Capture dans `crates/roomboard-shell` (testable hors Tauri), commandes Tauri minces dans `apps/desktop/src-tauri`. `xcap` seulement sous `cfg(any(windows, target_os="macos"))` ; Linux par `x11-dl` + `png`. Aucun paquet système installé. Licence vérifiée de chaque nouvelle dépendance (aucune AGPL/GPL/LGPL liée ; outil du dépôt `controle-licences.mjs`).
- GC3 — Coque : aucun `tauri build`, aucun bundle ; `nice -n 10 cargo check|test|clippy -j 4` seulement. `CARGO_TARGET_DIR` : ne pas le partager entre worktrees (chaque worktree de tâche garde son `target/`, ou le dire explicitement). Dans ce plan : `unset CARGO_TARGET_DIR` avant toute commande cargo.
- GC4 — Builds et tests en `nice -n 10`. Un test qui échoue sur un délai est rejoué une fois ; aucun délai relevé, aucun test désactivé ou sauté, aucun seuil changé. (Le test `capture_x11_reelle` est en `#[ignore]` par décision du cadrage, P26 : écran réel, joué à la main.)
- GC5 — Tailles Wasm : module principal 1 374 398 o (plafond 1 572 864), `formats` 2 794 511 o (plafond 3 145 728), aucun plafond ne bouge. Le chantier ne touche aucune crate du cœur ni du Wasm (P32) : les nouvelles dépendances ne vont que dans `roomboard-shell`.
- GC7 — Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, messages en anglais, terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers ajoutés un par un (jamais `git add -A`/`.`/`commit -a`).
- GC8 — `PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` pour cargo et pnpm.
- GC9 — Suites lourdes sous le jeton : `node ~/.claude/scripts/chaine/jeton.cjs --nom tests --proprietaire usage-c11b-capture/T2 --places-par-sujet 3 --commande "<commande, sortie redirigée vers un fichier>"`.

**Interdits.** Aucun PipeWire, aucun portail, aucun `xdg-desktop-portal` ; `xcap` jamais sous Linux ; aucun
`std::process::Command` ; ne pas installer de paquet système ; ne pas changer `XSetErrorHandler` (la racine est
contrôlée par `inside_root` avant `XGetImage`) ; ne pas toucher `office.rs`, `annotation.rs` (T1), `main.rs` (T3),
`apps/desktop/src-tauri/Cargo.lock` (T3) ; ne pas lancer `node scripts/controle-licences.mjs` sans `--cargo-json` (le
verrou de src-tauri n'est mis à jour qu'en T3).

**Critère « terminé ».** Tests du module verts (1 ignoré) ; `cargo fmt -p roomboard-shell --check` et
`cargo clippy -p roomboard-shell --all-targets -- -D warnings` verts ; `cargo test --workspace` sans échec ; licences OK
sur le graphe du workspace ; 0 version existante changée ; un commit. Le rapport porte les lignes
`Réutilisation : appelé crates/roomboard-shell/src/lib.rs (GrantedPaths)`, `Réutilisation : appelé crates/roomboard-shell/src/office.rs (ensure_private_dir)`,
`Réutilisation : appelé scripts/controle-licences.mjs` (ou `Réutilisation : écart — <pourquoi>`), le nombre de paquets
ajoutés au verrou et la sortie de `controle-licences.mjs`.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree.**
```bash
export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH; unset CARGO_TARGET_DIR
SRC=/home/adminjd/projets/roomboard-wt/usage-c11b-capture
cd "$WT" && git status --short | head -5 && pnpm install --frozen-lockfile > /tmp/c11b-T2-install.log 2>&1; tail -2 /tmp/c11b-T2-install.log
```
Attendu : rien de modifié ; `pnpm install` fini (le contrôle des licences lit aussi `node_modules/.pnpm`).

- [ ] **Étape 2 : écrire les tests rouges** dans `crates/roomboard-shell/tests/capture.rs` :
```rust
//! C11b (P19, P21 à P26) : capture d'écran, découpe, PNG, fichier accordé, purge.
use roomboard_shell::annotation::{Rect, Session};
use roomboard_shell::capture::{
    allowed, area_in_frame, bgrx_to_rgba, capture_area, capture_monitor, crop, encode_png, inside_root,
    nearest, purge, purge_older, release, save_granted, CaptureError, Frame, CAPTURES_DIR,
    HIDDEN_SETTLE_MS, PURGE_AGE,
};
use roomboard_shell::{read_granted, GrantedPaths, MAX_CHUNK};
use std::fs;
use std::path::PathBuf;
use std::time::{Duration, SystemTime};

fn r(x: i32, y: i32, w: u32, h: u32) -> Rect {
    Rect { x, y, w, h }
}

fn dir(name: &str) -> PathBuf {
    let d = std::env::temp_dir().join(format!("rb-capture-{}-{name}", std::process::id()));
    let _ = fs::remove_dir_all(&d);
    fs::create_dir_all(&d).unwrap();
    d
}

/// Image w × h dont chaque pixel vaut (rang, rang, rang, 255), rang = y * w + x (mod 256).
fn ramp(w: u32, h: u32) -> Frame {
    let mut rgba = Vec::new();
    for i in 0..w * h {
        let v = (i % 256) as u8;
        rgba.extend_from_slice(&[v, v, v, 255]);
    }
    Frame { width: w, height: h, rgba }
}

#[test]
fn constantes_du_cadrage() {
    assert_eq!(HIDDEN_SETTLE_MS, 250);
    assert_eq!(CAPTURES_DIR, "captures");
    assert_eq!(PURGE_AGE, Duration::from_secs(60));
    assert_eq!(CaptureError::Denied.code(), "denied");
    assert_eq!(CaptureError::Wayland.code(), "wayland");
    assert_eq!(CaptureError::Failed("x".into()).code(), "failed");
}

#[test]
fn zone_a_l_echelle_1() {
    let m = r(0, 0, 1920, 1080);
    assert_eq!(area_in_frame(1920, 1080, m, r(0, 64, 1920, 1016)), Some(r(0, 64, 1920, 1016)));
}

#[test]
fn zone_a_l_echelle_2_points_macos() {
    // Écran décrit en points (1440 × 900), image en pixels (2880 × 1800).
    let m = r(0, 0, 1440, 900);
    assert_eq!(area_in_frame(2880, 1800, m, r(0, 0, 1380, 900)), Some(r(0, 0, 2760, 1800)));
}

#[test]
fn zone_sur_le_second_ecran() {
    let m = r(1920, 0, 2560, 1440);
    assert_eq!(area_in_frame(2560, 1440, m, r(1920, 48, 2560, 1392)), Some(r(0, 48, 2560, 1392)));
}

#[test]
fn zone_echelle_fractionnaire_bornee_a_l_image() {
    // RF4 (P23) : 150 %, arrondis ; la zone ne dépasse jamais l'image.
    let m = r(0, 0, 1707, 960);
    let z = area_in_frame(2560, 1440, m, r(0, 43, 1707, 917)).unwrap();
    assert!(z.x >= 0 && z.y >= 0);
    assert!(z.x as u32 + z.w <= 2560 && z.y as u32 + z.h <= 1440);
    assert_eq!((z.x, z.y, z.w, z.h), (0, 65, 2560, 1375));
}

#[test]
fn zone_hors_image_ou_vide() {
    let m = r(0, 0, 100, 100);
    assert_eq!(area_in_frame(100, 100, m, r(200, 200, 50, 50)), None);
    assert_eq!(area_in_frame(100, 100, m, r(0, 0, 0, 10)), None);
    assert_eq!(area_in_frame(0, 100, m, r(0, 0, 10, 10)), None);
    assert_eq!(area_in_frame(100, 100, r(0, 0, 0, 0), r(0, 0, 10, 10)), None);
    assert_eq!(area_in_frame(100, 100, m, r(90, 90, 50, 50)), Some(r(90, 90, 10, 10)));
}

#[test]
fn decoupe_d_une_zone() {
    let c = crop(&ramp(4, 3), r(1, 1, 2, 2));
    assert_eq!((c.width, c.height), (2, 2));
    let firsts: Vec<u8> = c.rgba.chunks_exact(4).map(|p| p[0]).collect();
    assert_eq!(firsts, vec![5, 6, 9, 10]);
}

#[test]
fn decoupe_bornee_a_l_image() {
    let c = crop(&ramp(4, 3), r(3, 2, 10, 10));
    assert_eq!((c.width, c.height, c.rgba.len()), (1, 1, 4));
}

#[test]
fn bgrx_vers_rgba_avec_remplissage_de_ligne() {
    // 2 × 2, 12 octets par ligne (4 de remplissage).
    let src = [
        1, 2, 3, 0, 4, 5, 6, 0, 9, 9, 9, 9, 7, 8, 9, 0, 10, 11, 12, 0, 9, 9, 9, 9,
    ];
    assert_eq!(
        bgrx_to_rgba(&src, 2, 2, 12),
        vec![3, 2, 1, 255, 6, 5, 4, 255, 9, 8, 7, 255, 12, 11, 10, 255]
    );
    // Source tronquée : les lignes complètes seulement.
    assert_eq!(bgrx_to_rgba(&src[..12], 2, 2, 12).len(), 8);
}

#[test]
fn png_relu_a_l_identique() {
    let f = ramp(7, 5);
    let png = encode_png(&f).unwrap();
    assert_eq!(&png[..8], &[137, 80, 78, 71, 13, 10, 26, 10]);
    let mut reader = png::Decoder::new(std::io::Cursor::new(&png)).read_info().unwrap();
    let mut buf = vec![0; reader.output_buffer_size().unwrap()];
    let info = reader.next_frame(&mut buf).unwrap();
    assert_eq!((info.width, info.height, info.color_type), (7, 5, png::ColorType::Rgba));
    assert_eq!(&buf[..info.buffer_size()], &f.rgba[..]);
}

#[test]
fn png_refuse_une_image_vide_ou_tronquee() {
    let vide = Frame { width: 0, height: 0, rgba: vec![] };
    assert!(matches!(encode_png(&vide), Err(CaptureError::Failed(_))));
    let tronquee = Frame { width: 2, height: 2, rgba: vec![0; 15] };
    assert!(matches!(encode_png(&tronquee), Err(CaptureError::Failed(_))));
}

#[test]
fn fichier_accorde_lisible_puis_retire() {
    let root = dir("accorde");
    let g = GrantedPaths::default();
    let png = encode_png(&ramp(3, 2)).unwrap();
    let c = save_granted(&g, &root, &png, 3, 2).unwrap();
    assert_eq!((c.size, c.width, c.height), (png.len() as u64, 3, 2));
    assert!(c.path.starts_with(root.canonicalize().unwrap().join(CAPTURES_DIR)));
    assert_eq!(read_granted(&g, &c.path, 0, MAX_CHUNK).unwrap(), png);
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        assert_eq!(fs::metadata(&c.path).unwrap().permissions().mode() & 0o777, 0o600);
        let d = fs::metadata(root.join(CAPTURES_DIR)).unwrap();
        assert_eq!(d.permissions().mode() & 0o777, 0o700);
    }
    release(&g, &root, &c.id);
    assert!(g.granted_path(&c.path).is_none());
    assert!(!c.path.exists());
    let _ = fs::remove_dir_all(&root);
}

#[test]
fn deux_captures_deux_fichiers() {
    let root = dir("deux");
    let g = GrantedPaths::default();
    let a = save_granted(&g, &root, b"a", 1, 1).unwrap();
    let b = save_granted(&g, &root, b"b", 1, 1).unwrap();
    assert_ne!(a.id, b.id);
    assert_ne!(a.path, b.path);
    let _ = fs::remove_dir_all(&root);
}

#[test]
fn release_ignore_un_identifiant_forge() {
    let root = dir("forge");
    let g = GrantedPaths::default();
    let c = save_granted(&g, &root, b"x", 1, 1).unwrap();
    let nested = format!("{}/x", c.id);
    for bad in ["../../etc/passwd", "", "1", "1-2-3", "a-1", nested.as_str()] {
        release(&g, &root, bad);
    }
    assert!(c.path.exists());
    assert!(g.granted_path(&c.path).is_some());
    let _ = fs::remove_dir_all(&root);
}

#[test]
fn purge_des_restes_d_une_autre_instance() {
    let root = dir("purge");
    purge(&root.join("absent")); // aucun dossier : rien, aucune panique
    let caps = root.join(CAPTURES_DIR);
    fs::create_dir_all(&caps).unwrap();
    let old = caps.join("1-1.png");
    let young = caps.join("2-1.png");
    let mine = caps.join(format!("{}-7.png", std::process::id()));
    let other = caps.join("notes.txt");
    for p in [&old, &young, &mine, &other] {
        fs::write(p, b"x").unwrap();
    }
    let past = SystemTime::now() - Duration::from_secs(3600);
    for p in [&old, &mine] {
        fs::File::options().write(true).open(p).unwrap().set_modified(past).unwrap();
    }
    purge_older(&root, PURGE_AGE);
    assert!(!old.exists(), "reste d'un plantage supprimé");
    assert!(young.exists(), "capture récente d'une autre instance gardée");
    assert!(mine.exists(), "capture de ce processus gardée");
    assert!(other.exists(), "fichier étranger gardé");
    purge_older(&root, Duration::ZERO);
    assert!(!young.exists());
    assert!(mine.exists());
    let _ = fs::remove_dir_all(&root);
}

#[test]
fn wayland_refuse_sans_essai() {
    for s in [Session::XWayland, Session::WaylandNative] {
        assert_eq!(allowed(s), Err(CaptureError::Wayland));
        assert_eq!(capture_monitor(s, r(0, 0, 10, 10)), Err(CaptureError::Wayland));
        let root = dir("wayland");
        let g = GrantedPaths::default();
        assert_eq!(
            capture_area(&g, &root, s, r(0, 0, 10, 10), r(0, 0, 10, 10)),
            Err(CaptureError::Wayland)
        );
        assert!(!root.join(CAPTURES_DIR).exists(), "aucun fichier écrit");
        let _ = fs::remove_dir_all(&root);
    }
    assert_eq!(allowed(Session::X11), Ok(()));
    assert_eq!(allowed(Session::Other), Ok(()));
}

#[test]
fn ecran_le_plus_proche_et_racine_x11() {
    assert_eq!(nearest(&[(0, 0), (1920, 0)], (1920, 0)), Some(1));
    assert_eq!(nearest(&[(0, 0), (2880, 0)], (2879, 3)), Some(1));
    assert_eq!(nearest(&[], (0, 0)), None);
    assert!(inside_root(3840, 1080, r(1920, 0, 1920, 1080)));
    assert!(!inside_root(1920, 1080, r(1920, 0, 1920, 1080)));
    assert!(!inside_root(1920, 1080, r(-10, 0, 100, 100)));
    assert!(!inside_root(1920, 1080, r(0, 0, 0, 100)));
}

#[test]
#[ignore = "écran X11 réel : DISPLAY=:0 cargo test -p roomboard-shell --test capture -- --ignored"]
fn capture_x11_reelle() {
    let f = capture_monitor(Session::X11, r(0, 0, 64, 64)).expect("capture X11");
    assert_eq!((f.width, f.height, f.rgba.len()), (64, 64, 64 * 64 * 4));
    assert!(f.rgba.chunks_exact(4).all(|p| p[3] == 255));
}
```

- [ ] **Étape 3 : vérifier le rouge.**
```bash
cd "$WT" && nice -n 10 cargo test -p roomboard-shell --test capture -j 4 2>&1 | grep -E "error\[" | head -3
```
Attendu : `error[E0432]: unresolved import \`roomboard_shell::capture\``.

- [ ] **Étape 4 : dépendances.** Dans `crates/roomboard-shell/Cargo.toml`, ajouter sous `[dependencies]`, après la ligne
`open = …` :
```toml
# C11b (P19, P25) : encodage PNG de la capture (MIT OU Apache-2.0), même version que le verrou du workspace.
png = "0.18.1"
```
puis, après le bloc `[target.'cfg(windows)'.dependencies]` existant (avant `[dev-dependencies]`) :
```toml
[target.'cfg(any(windows, target_os = "macos"))'.dependencies]
# C11b (P19) : capture d'un écran (Apache-2.0). Linux exclu : PipeWire y est obligatoire (essai du 2026-11-23).
xcap = { version = "0.9.10", default-features = false }

[target.'cfg(target_os = "macos")'.dependencies]
# C11b (P10, P19) : autorisation « Enregistrement de l'écran » (Zlib OU Apache-2.0 OU MIT) ; xcap ne la vérifie pas.
objc2-core-graphics = { version = "0.3.2", default-features = false, features = ["std", "CGWindow"] }

[target.'cfg(target_os = "linux")'.dependencies]
# C11b (P18, P19) : XGetImage sur la racine et sélection du compositeur, Xlib chargée à l'exécution (MIT) ; déjà dans
# l'arbre de tao.
x11-dl = "2.21.0"
```
Dans `crates/roomboard-shell/src/lib.rs`, la liste des modules devient :
```rust
pub mod annotation;
pub mod capture;
pub mod office;
pub mod originals;
```

- [ ] **Étape 5 : implémenter `crates/roomboard-shell/src/capture.rs`.**
```rust
//! C11b (P19, P21 à P26, DA1, DA2) : capture d'un écran sans nos fenêtres, découpe de la zone d'annotation, PNG RGBA,
//! fichier temporaire écrit dans un dossier privé, accordé à la page, puis retiré. Logique pure testable sans Tauri ;
//! adaptateurs par plateforme sous `#[cfg]` : `xcap` sous Windows et macOS, Xlib (`x11-dl`, chargée à l'exécution) sous
//! Linux X11, Wayland refusé sans essai. Aucun point d'encre ne passe ici.
use std::fmt;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::Duration;

use crate::annotation::{Rect, Session};
use crate::office::ensure_private_dir;
use crate::GrantedPaths;

/// Sous-dossier des captures dans la racine privée de la coque (cache de l'application, P24).
pub const CAPTURES_DIR: &str = "captures";
/// P22 : délai entre le masquage de nos fenêtres et la capture (ActCraft, `kHiddenWindowsSettleMs`).
pub const HIDDEN_SETTLE_MS: u64 = 250;
/// P24 : au lancement, un reste d'une autre instance plus vieux que ce délai est supprimé (une capture vit quelques ms).
pub const PURGE_AGE: Duration = Duration::from_secs(60);

static NEXT_CAPTURE: AtomicU64 = AtomicU64::new(1);

/// Image RGBA 8 bits, lignes contiguës (`width * 4` octets par ligne).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Frame {
    pub width: u32,
    pub height: u32,
    pub rgba: Vec<u8>,
}

/// Échec d'une capture ; `code()` est le rejet rendu à la page (P27).
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum CaptureError {
    Denied,
    Wayland,
    Failed(String),
}

impl CaptureError {
    pub fn code(&self) -> &'static str {
        match self {
            CaptureError::Denied => "denied",
            CaptureError::Wayland => "wayland",
            CaptureError::Failed(_) => "failed",
        }
    }
}

impl fmt::Display for CaptureError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            CaptureError::Failed(d) => write!(f, "failed : {d}"),
            other => f.write_str(other.code()),
        }
    }
}

fn failed(e: impl fmt::Display) -> CaptureError {
    CaptureError::Failed(e.to_string())
}

/// PNG accordé : `id` pour `release`, chemin canonique accordé, taille en octets, dimensions de l'image.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Captured {
    pub id: String,
    pub path: PathBuf,
    pub size: u64,
    pub width: u32,
    pub height: u32,
}

/// P21 : XWayland et Wayland natif refusés sans essai (la racine X d'XWayland ne voit pas les fenêtres Wayland).
pub fn allowed(session: Session) -> Result<(), CaptureError> {
    match session {
        Session::XWayland | Session::WaylandNative => Err(CaptureError::Wayland),
        Session::X11 | Session::Other => Ok(()),
    }
}

/// P23 : rectangle de `area` (px physiques du bureau) dans l'image de l'écran `monitor`, à l'échelle
/// `largeur image / largeur écran` (points macOS ou pixels physiques) ; borné à l'image ; vide : `None`.
pub fn area_in_frame(frame_w: u32, frame_h: u32, monitor: Rect, area: Rect) -> Option<Rect> {
    if monitor.w == 0 || monitor.h == 0 || frame_w == 0 || frame_h == 0 {
        return None;
    }
    let sx = f64::from(frame_w) / f64::from(monitor.w);
    let sy = f64::from(frame_h) / f64::from(monitor.h);
    let dx = f64::from(area.x) - f64::from(monitor.x);
    let dy = f64::from(area.y) - f64::from(monitor.y);
    let (fw, fh) = (f64::from(frame_w), f64::from(frame_h));
    let x0 = (dx * sx).round().clamp(0.0, fw);
    let y0 = (dy * sy).round().clamp(0.0, fh);
    let x1 = ((dx + f64::from(area.w)) * sx).round().clamp(0.0, fw);
    let y1 = ((dy + f64::from(area.h)) * sy).round().clamp(0.0, fh);
    if x1 <= x0 || y1 <= y0 {
        return None;
    }
    Some(Rect {
        x: x0 as i32,
        y: y0 as i32,
        w: (x1 - x0) as u32,
        h: (y1 - y0) as u32,
    })
}

/// Découpe de `r` dans `frame`, bornée à l'image (une image tronquée rend les lignes présentes).
pub fn crop(frame: &Frame, r: Rect) -> Frame {
    let x0 = u32::try_from(r.x.max(0)).unwrap_or(0).min(frame.width);
    let y0 = u32::try_from(r.y.max(0)).unwrap_or(0).min(frame.height);
    let w = r.w.min(frame.width - x0);
    let h = r.h.min(frame.height - y0);
    let stride = frame.width as usize * 4;
    let line = w as usize * 4;
    let mut rgba = Vec::with_capacity(line * h as usize);
    let mut rows = 0;
    for row in y0..y0 + h {
        let start = row as usize * stride + x0 as usize * 4;
        match frame.rgba.get(start..start + line) {
            Some(px) => {
                rgba.extend_from_slice(px);
                rows += 1;
            }
            None => break,
        }
    }
    Frame {
        width: w,
        height: if w == 0 { 0 } else { rows },
        rgba,
    }
}

/// Xlib (ZPixmap 32 bits, octets B, G, R, X) → RGBA opaque ; `stride` : octets par ligne de la source.
pub fn bgrx_to_rgba(src: &[u8], width: u32, height: u32, stride: usize) -> Vec<u8> {
    let (w, h) = (width as usize, height as usize);
    let mut out = Vec::with_capacity(w * h * 4);
    for y in 0..h {
        let Some(row) = src.get(y * stride..y * stride + w * 4) else {
            break;
        };
        for px in row.chunks_exact(4) {
            out.extend_from_slice(&[px[2], px[1], px[0], 255]);
        }
    }
    out
}

/// P25 : PNG RGBA 8 bits, compression rapide.
pub fn encode_png(frame: &Frame) -> Result<Vec<u8>, CaptureError> {
    let expected = frame.width as usize * frame.height as usize * 4;
    if frame.width == 0 || frame.height == 0 || frame.rgba.len() != expected {
        return Err(CaptureError::Failed("image vide ou tronquée".into()));
    }
    let mut out = Vec::new();
    {
        let mut enc = png::Encoder::new(&mut out, frame.width, frame.height);
        enc.set_color(png::ColorType::Rgba);
        enc.set_depth(png::BitDepth::Eight);
        enc.set_compression(png::Compression::Fast);
        let mut w = enc.write_header().map_err(failed)?;
        w.write_image_data(&frame.rgba).map_err(failed)?;
        w.finish().map_err(failed)?;
    }
    Ok(out)
}

fn is_capture_id(id: &str) -> bool {
    let digits = |s: &str| !s.is_empty() && s.bytes().all(|b| b.is_ascii_digit());
    let mut parts = id.split('-');
    matches!((parts.next(), parts.next(), parts.next()), (Some(a), Some(b), None) if digits(a) && digits(b))
}

fn capture_path(root: &Path, id: &str) -> PathBuf {
    root.join(CAPTURES_DIR).join(format!("{id}.png"))
}

fn write_new(path: &Path, bytes: &[u8]) -> Result<(), CaptureError> {
    let mut o = fs::OpenOptions::new();
    o.write(true).create_new(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        o.mode(0o600);
    }
    let mut f = o.open(path).map_err(failed)?;
    f.write_all(bytes).map_err(failed)
}

/// P24 : PNG écrit sous `<root>/captures/<pid>-<n>.png` (dossiers privés, fichier neuf en 0600), puis accordé à la page.
pub fn save_granted(
    g: &GrantedPaths,
    root: &Path,
    png: &[u8],
    width: u32,
    height: u32,
) -> Result<Captured, CaptureError> {
    if let Some(parent) = root.parent() {
        fs::create_dir_all(parent).map_err(failed)?;
    }
    ensure_private_dir(root).map_err(failed)?;
    ensure_private_dir(&root.join(CAPTURES_DIR)).map_err(failed)?;
    let id = format!(
        "{}-{}",
        std::process::id(),
        NEXT_CAPTURE.fetch_add(1, Ordering::Relaxed)
    );
    let path = capture_path(root, &id);
    write_new(&path, png)?;
    let Some(granted) = g.grant([path.clone()]).into_iter().next() else {
        let _ = fs::remove_file(&path);
        return Err(CaptureError::Failed("capture non accordée".into()));
    };
    Ok(Captured {
        id,
        path: granted,
        size: png.len() as u64,
        width,
        height,
    })
}

/// P24 : accord retiré et fichier supprimé ; un identifiant qui n'est pas `<pid>-<n>` est ignoré (aucun chemin forgé).
pub fn release(g: &GrantedPaths, root: &Path, id: &str) {
    if !is_capture_id(id) {
        return;
    }
    let path = capture_path(root, id);
    g.revoke(&path);
    let _ = fs::remove_file(&path);
}

/// P24 : au lancement, restes d'un plantage supprimés (`PURGE_AGE`).
pub fn purge(root: &Path) {
    purge_older(root, PURGE_AGE);
}

/// Supprime de `<root>/captures/` les `<pid>-<n>.png` d'un autre processus plus vieux que `age` ; garde ceux de ce
/// processus, les fichiers récents d'une autre instance et tout fichier étranger.
pub fn purge_older(root: &Path, age: Duration) {
    let dir = root.join(CAPTURES_DIR);
    if !fs::symlink_metadata(&dir).is_ok_and(|m| m.is_dir()) {
        return;
    }
    let Ok(rd) = fs::read_dir(&dir) else {
        return;
    };
    let me = std::process::id().to_string();
    for e in rd.flatten() {
        let name = e.file_name();
        let Some(id) = name.to_str().and_then(|n| n.strip_suffix(".png")) else {
            continue;
        };
        if !is_capture_id(id) || id.split('-').next() == Some(me.as_str()) {
            continue;
        }
        let old = e
            .metadata()
            .ok()
            .and_then(|m| m.modified().ok())
            .and_then(|t| t.elapsed().ok())
            .is_none_or(|a| a >= age);
        if old {
            let _ = fs::remove_file(e.path());
        }
    }
}

/// Rang du coin le plus proche de `at` (distance au carré) ; vide : `None`. Retrouve l'écran `xcap` (points sous macOS,
/// mis à l'échelle) qui correspond à l'écran de Tauri (pixels physiques), HC11b-16.
pub fn nearest(corners: &[(i64, i64)], at: (i32, i32)) -> Option<usize> {
    let (ax, ay) = (i64::from(at.0), i64::from(at.1));
    corners
        .iter()
        .enumerate()
        .min_by_key(|(_, c)| (c.0 - ax).pow(2) + (c.1 - ay).pow(2))
        .map(|(i, _)| i)
}

/// Linux X11 : rectangle non vide entièrement dans la racine (sinon `XGetImage` lèverait `BadMatch`, et le gestionnaire
/// d'erreurs Xlib par défaut terminerait le processus).
pub fn inside_root(root_w: u32, root_h: u32, r: Rect) -> bool {
    r.x >= 0
        && r.y >= 0
        && r.w > 0
        && r.h > 0
        && u64::from(r.x as u32) + u64::from(r.w) <= u64::from(root_w)
        && u64::from(r.y as u32) + u64::from(r.h) <= u64::from(root_h)
}

/// Capture de l'écran `monitor` (px physiques) ; Wayland refusé avant tout essai.
pub fn capture_monitor(session: Session, monitor: Rect) -> Result<Frame, CaptureError> {
    allowed(session)?;
    platform::capture(monitor)
}

/// P22, P23 : capture de l'écran `monitor`, découpe de `area`, PNG, fichier accordé.
pub fn capture_area(
    g: &GrantedPaths,
    root: &Path,
    session: Session,
    monitor: Rect,
    area: Rect,
) -> Result<Captured, CaptureError> {
    let frame = capture_monitor(session, monitor)?;
    let zone = area_in_frame(frame.width, frame.height, monitor, area)
        .ok_or_else(|| CaptureError::Failed("zone d'annotation hors de l'image".into()))?;
    let cut = crop(&frame, zone);
    let png = encode_png(&cut)?;
    save_granted(g, root, &png, cut.width, cut.height)
}

/// P18 : Linux, un compositeur tient-il `_NET_WM_CM_S<écran>` ? Sonde en échec ou autre plateforme : `None`.
pub fn composited() -> Option<bool> {
    platform::composited()
}

#[cfg(target_os = "linux")]
mod platform {
    use super::{bgrx_to_rgba, failed, inside_root, CaptureError, Frame};
    use crate::annotation::Rect;
    use std::ffi::CString;
    use x11_dl::xlib::{self, Xlib};

    /// Connexion X propre à la capture, fermée au `Drop`.
    struct Conn<'a> {
        x: &'a Xlib,
        d: *mut xlib::Display,
    }

    impl Drop for Conn<'_> {
        fn drop(&mut self) {
            // SAFETY : `d` vient de `XOpenDisplay`, non nul, fermé une seule fois.
            unsafe { (self.x.XCloseDisplay)(self.d) };
        }
    }

    fn open(x: &Xlib) -> Option<Conn<'_>> {
        // SAFETY : pointeur nul = `$DISPLAY` ; le résultat est vérifié.
        let d = unsafe { (x.XOpenDisplay)(std::ptr::null()) };
        (!d.is_null()).then_some(Conn { x, d })
    }

    pub fn capture(monitor: Rect) -> Result<Frame, CaptureError> {
        let x = Xlib::open().map_err(failed)?;
        let c = open(&x).ok_or_else(|| CaptureError::Failed("affichage X11 introuvable".into()))?;
        // SAFETY : connexion ouverte ; écran par défaut.
        let (root, rw, rh) = unsafe {
            let s = (x.XDefaultScreen)(c.d);
            (
                (x.XDefaultRootWindow)(c.d),
                (x.XDisplayWidth)(c.d, s),
                (x.XDisplayHeight)(c.d, s),
            )
        };
        let (rw, rh) = (u32::try_from(rw).unwrap_or(0), u32::try_from(rh).unwrap_or(0));
        if !inside_root(rw, rh, monitor) {
            return Err(CaptureError::Failed(format!(
                "écran hors de la racine X11 ({rw} × {rh})"
            )));
        }
        // SAFETY : rectangle dans la racine (vérifié) ; l'image rendue est détruite ci-dessous.
        let img = unsafe {
            (x.XGetImage)(
                c.d,
                root,
                monitor.x,
                monitor.y,
                monitor.w,
                monitor.h,
                (x.XAllPlanes)(),
                xlib::ZPixmap,
            )
        };
        if img.is_null() {
            return Err(CaptureError::Failed("XGetImage a échoué".into()));
        }
        // SAFETY : `img` non nul, lu pendant sa vie, puis détruit une seule fois par `XDestroyImage`.
        unsafe {
            let i = &*img;
            let ok = i.bits_per_pixel == 32
                && i.byte_order == xlib::LSBFirst
                && i.red_mask == 0x00ff_0000
                && i.green_mask == 0x0000_ff00
                && i.blue_mask == 0x0000_00ff
                && i.width > 0
                && i.height > 0
                && i.bytes_per_line >= i.width * 4
                && !i.data.is_null();
            let out = if ok {
                let (w, h, stride) = (i.width as u32, i.height as u32, i.bytes_per_line as usize);
                let src = std::slice::from_raw_parts(i.data as *const u8, stride * h as usize);
                Ok(Frame {
                    width: w,
                    height: h,
                    rgba: bgrx_to_rgba(src, w, h, stride),
                })
            } else {
                Err(CaptureError::Failed(format!(
                    "format X11 non pris en charge ({} bits par pixel)",
                    i.bits_per_pixel
                )))
            };
            (x.XDestroyImage)(img);
            out
        }
    }

    pub fn composited() -> Option<bool> {
        let x = Xlib::open().ok()?;
        let c = open(&x)?;
        // SAFETY : connexion ouverte ; nom d'atome terminé par NUL, gardé vivant pendant l'appel.
        unsafe {
            let s = (x.XDefaultScreen)(c.d);
            let name = CString::new(format!("_NET_WM_CM_S{s}")).ok()?;
            let atom = (x.XInternAtom)(c.d, name.as_ptr(), 0);
            if atom == 0 {
                return None;
            }
            Some((x.XGetSelectionOwner)(c.d, atom) != 0)
        }
    }
}

#[cfg(any(windows, target_os = "macos"))]
mod platform {
    use super::{failed, nearest, CaptureError, Frame};
    use crate::annotation::Rect;

    /// Coordonnées `xcap` → pixels physiques de Tauri : points sous macOS (× échelle), pixels sous Windows.
    fn corner(m: &xcap::Monitor) -> (i64, i64) {
        let s = if cfg!(target_os = "macos") {
            f64::from(m.scale_factor().unwrap_or(1.0))
        } else {
            1.0
        };
        let x = (f64::from(m.x().unwrap_or(0)) * s).round() as i64;
        let y = (f64::from(m.y().unwrap_or(0)) * s).round() as i64;
        (x, y)
    }

    pub fn capture(monitor: Rect) -> Result<Frame, CaptureError> {
        #[cfg(target_os = "macos")]
        authorize()?;
        let all = xcap::Monitor::all().map_err(failed)?;
        let corners: Vec<(i64, i64)> = all.iter().map(corner).collect();
        let m = nearest(&corners, (monitor.x, monitor.y))
            .and_then(|i| all.get(i))
            .ok_or_else(|| CaptureError::Failed("aucun écran".into()))?;
        let img = m.capture_image().map_err(failed)?;
        let (width, height) = (img.width(), img.height());
        Ok(Frame {
            width,
            height,
            rgba: img.into_raw(),
        })
    }

    /// P10, HC11b-7 : `xcap` ne vérifie pas l'autorisation (sans elle, l'image ne montre que le fond d'écran). Première
    /// demande : invite du système, refus rendu ; l'octroi ne vaut qu'après une relance.
    #[cfg(target_os = "macos")]
    fn authorize() -> Result<(), CaptureError> {
        if objc2_core_graphics::CGPreflightScreenCaptureAccess() {
            return Ok(());
        }
        let _ = objc2_core_graphics::CGRequestScreenCaptureAccess();
        Err(CaptureError::Denied)
    }

    pub fn composited() -> Option<bool> {
        None
    }
}

#[cfg(not(any(windows, target_os = "macos", target_os = "linux")))]
mod platform {
    use super::{CaptureError, Frame};
    use crate::annotation::Rect;

    pub fn capture(_monitor: Rect) -> Result<Frame, CaptureError> {
        Err(CaptureError::Failed(
            "capture non prise en charge sur cette plateforme".into(),
        ))
    }

    pub fn composited() -> Option<bool> {
        None
    }
}
```
Le code Windows et macOS ne se compile pas sur la VM (aucune cible installée, P35) : il reste aux essais de la fiche
`docs/essais/c11b-coque.md` (T11). Le dire au rapport.

- [ ] **Étape 6 : vérifier le vert, fmt, clippy, workspace.**
```bash
cd "$WT" && nice -n 10 cargo fmt -p roomboard-shell && nice -n 10 cargo test -p roomboard-shell --test capture -j 4 2>&1 | tail -30
cd "$WT" && nice -n 10 cargo fmt -p roomboard-shell --check && nice -n 10 cargo clippy -p roomboard-shell --all-targets -j 4 -- -D warnings 2>&1 | tail -5
node ~/.claude/scripts/chaine/jeton.cjs --nom tests --proprietaire usage-c11b-capture/T2 --places-par-sujet 3 --commande "cd $WT && nice -n 10 cargo test --workspace -j 4 > /tmp/c11b-T2-ws.log 2>&1"; grep -c "test result: ok" /tmp/c11b-T2-ws.log; grep -E "test result: FAILED|error\[" /tmp/c11b-T2-ws.log | head
```
Attendu : `test result: ok. 17 passed; 0 failed; 1 ignored` (ou plus) ; fmt et clippy sans erreur ni avertissement ;
`coque_c16` et `annotation` restent `ok` dans le journal du workspace.

- [ ] **Étape 7 : licences et verrou.** Jouer les trois commandes de « Test et commande bornée » (fetch, metadata +
`controle-licences.mjs --cargo-json`, diff du verrou) et `bash scripts/tests/controle-licences.test.sh 2>&1 | tail -3`.
Attendu : licences conformes (code 0) ; `0` ligne `-version` ; test des licences vert. Une licence refusée : s'arrêter,
rapport `bloquée` avec le paquet et sa licence (aucune exception ajoutée à `scripts/licences-acceptees.json`).

- [ ] **Étape 8 : commit.**
```bash
cd "$WT" && git add crates/roomboard-shell/src/capture.rs && git add crates/roomboard-shell/src/lib.rs && git add crates/roomboard-shell/Cargo.toml && git add Cargo.lock && git add crates/roomboard-shell/tests/capture.rs
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "feat(shell): desktop capture module (crop, PNG, granted temp file)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Tâche T3 — Coque : commandes de capture, transparence, géométrie partagée, purge
<a id="tache-t3"></a>

**Objectif.** Deux commandes Tauri minces (P22, P24, P27) : `annotation_capture(screen, dock, thickness)` cache nos
fenêtres, attend 250 ms, capture hors du fil principal, remontre les fenêtres, et rend `{ id, path, size, width, height }`
ou un rejet `denied` / `wayland` / `failed` ; `release_capture(id)` retire l'accord et le fichier. `annotation_support`
rend `transparent` (P18) ; `annotation_enter` passe par `ann::placement` (même géométrie) ; les restes de captures sont
purgés au lancement. Garde-fou par lecture `tests/coque_c11b.rs` (P26). `cargo check`, `clippy`, `test` de src-tauri (P35).

**Fichiers.**
- Modifier : `apps/desktop/src-tauri/src/main.rs` (imports l. 15-17 ; `AnnotationSupport` l. 322-327 ; `annotation_support`
  l. 333-342 ; `annotation_enter` l. 346-402 ; nouvelles commandes après `relaunch_compat` ; `setup` l. 486-498 ;
  `invoke_handler` l. 499-517)
- Modifier : `apps/desktop/src-tauri/Cargo.lock` (régénéré par `cargo check`)
- Test : `crates/roomboard-shell/tests/coque_c11b.rs` (nouveau)

**Interfaces.**
- Consomme (T1) : `ann::Placement { index, bar, area, monitor }`, `ann::placement(&[(Rect, f64)], Option<usize>, (i32, i32), &str, f64) -> Placement`, `ann::transparency(Session, Option<bool>) -> bool`.
- Consomme (T2) : `capture::allowed(Session) -> Result<(), CaptureError>`, `capture::capture_area(&GrantedPaths, &Path, Session, Rect, Rect) -> Result<Captured, CaptureError>`, `capture::release(&GrantedPaths, &Path, &str)`, `capture::purge(&Path)`, `capture::composited() -> Option<bool>`, `capture::HIDDEN_SETTLE_MS`, `CaptureError::code()`.
- Produit (utilisé par T4, `annotation-tauri.ts`) :
  - commande `annotation_capture { screen: number | null, dock: string, thickness: number }` → `{ id: string, path: string, size: number, width: number, height: number }` ; rejet (chaîne) `"denied" | "wayland" | "failed"`
  - commande `release_capture { id: string }` → `null`
  - `annotation_support` → `{ supported, reason, screens, transparent: boolean }`
- Réutilise : `crates/roomboard-shell/src/annotation.rs:41` (`detect_session`) — `ann::detect_session(std::env::consts::OS, |k| std::env::var(k).ok())`, appelée telle quelle dans `annotation_capture` et `annotation_support`.
- Réutilise : `crates/roomboard-shell/tests/coque_c16.rs:4, :124` (`MAIN_RS`, `undeclared_roots`) — même lecture en texte de `main.rs` dans `coque_c11b.rs` (patron) ; `coque_c16.rs` reste inchangé et vert.

**Test et commande bornée.**
```bash
export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH; unset CARGO_TARGET_DIR
cd "$WT" && nice -n 10 cargo test -p roomboard-shell --test coque_c11b --test coque_c16 -j 4 2>&1 | grep -E "^test |test result" | tail -20
```
Preuve attendue : deux lignes `test result: ok.` ; `coque_c11b` : N ≥ 4 dont `test capture_hides_then_shows_windows_after_the_blocking_capture ... ok` ;
`coque_c16` : `test main_rs_paths_use_only_declared_crates ... ok` et `test office_commands_are_registered_and_thin ... ok` (à garder verts).
Puis src-tauri (un seul build Tauri à la fois : sous le jeton) :
```bash
node ~/.claude/scripts/chaine/jeton.cjs --nom tests --proprietaire usage-c11b-capture/T3 --places-par-sujet 3 --commande "cd $WT/apps/desktop/src-tauri && nice -n 10 cargo check -j 4 > /tmp/c11b-T3-check.log 2>&1 && nice -n 10 cargo clippy -j 4 --all-targets -- -D warnings > /tmp/c11b-T3-clippy.log 2>&1 && nice -n 10 cargo test -j 4 > /tmp/c11b-T3-test.log 2>&1"; echo "code=$?"; tail -3 /tmp/c11b-T3-check.log; tail -3 /tmp/c11b-T3-clippy.log; grep -E "test result|error\[" /tmp/c11b-T3-test.log | tail -3
```
Attendu : `code=0` ; `Finished` dans les journaux de check et de clippy, aucun `warning:` ni `error[` ; `test result: ok`
dans le journal de test. Verrou : `cd "$WT" && git diff apps/desktop/src-tauri/Cargo.lock | grep -c '^-version'` → `0`
(environ 93 paquets ajoutés selon le cadrage, nombre exact au rapport). Licences sur les deux graphes (R22) :
```bash
cd "$WT" && nice -n 10 cargo fetch --manifest-path apps/desktop/src-tauri/Cargo.toml > /tmp/c11b-T3-fetch.log 2>&1; node scripts/controle-licences.mjs 2>&1 | tail -5
```
Attendu : code 0, aucune ligne d'écart.

**Preuve visuelle.** Aucune sur la VM (aucun `tauri build`) : la capture réelle est à la fiche `docs/essais/c11b-coque.md` (T11, S5).

**Contraintes (recopiées de Global Constraints).**
- GC1 — Le chemin de l'encre ne traverse jamais la frontière page ↔ Rust natif ; seule la capture passe par un fichier accordé (U24).
- GC2 — Capture dans `crates/roomboard-shell` (testable hors Tauri), commandes Tauri minces dans `apps/desktop/src-tauri`. `xcap` seulement sous `cfg(any(windows, target_os="macos"))` ; Linux par `x11-dl` + `png`. Aucun paquet système installé. Licence vérifiée de chaque nouvelle dépendance (aucune AGPL/GPL/LGPL liée ; outil du dépôt `controle-licences.mjs`).
- GC3 — Coque : aucun `tauri build`, aucun bundle ; `nice -n 10 cargo check|test|clippy -j 4` seulement. `CARGO_TARGET_DIR` : ne pas le partager entre worktrees (chaque worktree de tâche garde son `target/`, ou le dire explicitement). Dans ce plan : `unset CARGO_TARGET_DIR` ; src-tauri garde `apps/desktop/src-tauri/target/` de ce worktree.
- GC4 — Builds et tests en `nice -n 10`. Un test qui échoue sur un délai est rejoué une fois ; aucun délai relevé, aucun test désactivé ou sauté, aucun seuil changé.
- GC5 — Le chantier ne touche aucune crate du cœur ni du Wasm (P32).
- GC7 — Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, messages en anglais, terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers ajoutés un par un (jamais `git add -A`/`.`/`commit -a`).
- GC8 — `PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` pour cargo et pnpm.
- GC9 — Suites lourdes sous le jeton : `node ~/.claude/scripts/chaine/jeton.cjs --nom tests --proprietaire usage-c11b-capture/T3 --places-par-sujet 3 --commande "<commande, sortie redirigée vers un fichier>"`.

**Interdits.** Aucun `xcap::`, `x11_dl::`, `png::`, `objc2`, `Command::new` dans `main.rs` ; aucune dépendance ajoutée à
`apps/desktop/src-tauri/Cargo.toml` ; aucune permission ni capacité nouvelle (`capabilities/*.json` inchangés, P27) ;
`tauri.conf.json` et `build.rs` inchangés ; ne pas reformater `main.rs` par `cargo fmt` (src-tauri n'est pas formaté par
`verifier.sh` : seules les lignes écrites ici changent) ; ne pas toucher `crates/roomboard-shell/src/*` (T1, T2).
Un avertissement clippy dans du code d'avant C11b : ne pas le corriger, le citer au rapport (`fichier:ligne`) et
rendre la tâche `bloquée` si `-D warnings` échoue à cause de lui seul.

**Critère « terminé ».** `coque_c11b` (4 tests) et `coque_c16` verts ; `cargo check`, `cargo clippy -D warnings`,
`cargo test` de src-tauri verts ; 0 version existante changée dans `apps/desktop/src-tauri/Cargo.lock` ; licences OK
sur les deux graphes ; un commit. Le rapport porte `Réutilisation : appelé crates/roomboard-shell/src/annotation.rs (detect_session)`
et `Réutilisation : appelé crates/roomboard-shell/tests/coque_c16.rs (patron MAIN_RS)` (ou `Réutilisation : écart — <pourquoi>`).

**Étapes.**

- [ ] **Étape 1 : préparer le worktree** (src-tauri exige `apps/web/dist` pour `generate_context!`).
```bash
export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH; unset CARGO_TARGET_DIR
SRC=/home/adminjd/projets/roomboard-wt/usage-c11b-capture
cd "$WT" && git status --short | head -5
[ -f "$WT/apps/web/dist/index.html" ] || { mkdir -p "$WT/apps/web/dist" && cp -r "$SRC/apps/web/dist/." "$WT/apps/web/dist/"; }
cd "$WT" && pnpm install --frozen-lockfile > /tmp/c11b-T3-install.log 2>&1; tail -2 /tmp/c11b-T3-install.log
grep -n "pub fn placement\|pub fn transparency" crates/roomboard-shell/src/annotation.rs; grep -n "pub fn capture_area" crates/roomboard-shell/src/capture.rs
```
Attendu : rien de modifié ; `index.html` présent ; les trois fonctions de T1 et T2 trouvées (sinon : dépendance non
fusionnée, rapport `bloquée`).

- [ ] **Étape 2 : écrire le garde-fou rouge** `crates/roomboard-shell/tests/coque_c11b.rs` :
```rust
//! Coque C11b (P22, P26, P27) : src-tauri est hors du workspace ; sa configuration est prouvée par lecture : commandes
//! de capture enregistrées et minces, géométrie partagée avec `annotation_enter`, fenêtres remontrées après la capture,
//! aucune bibliothèque de capture appelée depuis `main.rs`.
const MAIN_RS: &str = include_str!("../../../apps/desktop/src-tauri/src/main.rs");
const COMMANDS: [&str; 2] = ["annotation_capture", "release_capture"];

/// Corps de `fn name(` jusqu'à la première accolade fermante en colonne 0.
fn body_of(name: &str) -> &'static str {
    MAIN_RS
        .split(format!("fn {name}(").as_str())
        .nth(1)
        .and_then(|s| s.split("\n}\n").next())
        .unwrap_or_else(|| panic!("fonction {name} absente de main.rs"))
}

#[test]
fn capture_commands_are_registered_and_thin() {
    let handler = MAIN_RS
        .split("generate_handler![")
        .nth(1)
        .and_then(|s| s.split(']').next())
        .expect("generate_handler!");
    for c in COMMANDS {
        assert!(
            handler.split(',').any(|x| x.trim() == c),
            "{c} absente de generate_handler!"
        );
        assert!(MAIN_RS.contains(&format!("fn {c}(")), "fonction {c} absente");
    }
    for needle in [
        "capture::allowed(",
        "capture::capture_area(",
        "capture::release(",
        "capture::purge(",
        "capture::composited()",
        "capture::HIDDEN_SETTLE_MS",
        "ann::transparency(",
    ] {
        assert!(MAIN_RS.contains(needle), "{needle} absent de main.rs");
    }
    for forbidden in ["xcap::", "x11_dl::", "XGetImage", "png::", "objc2", "Command::new"] {
        assert!(
            !MAIN_RS.contains(forbidden),
            "{forbidden} dans main.rs (la capture vit dans roomboard_shell::capture)"
        );
    }
}

#[test]
fn enter_and_capture_share_placement() {
    for f in ["annotation_enter", "annotation_capture"] {
        let body = body_of(f);
        assert!(body.contains("ann::placement("), "{f} doit passer par ann::placement");
        assert!(
            !body.contains("ann::split(") && !body.contains("ann::pick_screen("),
            "{f} recalcule la géométrie"
        );
    }
}

#[test]
fn capture_hides_then_shows_windows_after_the_blocking_capture() {
    let body = body_of("annotation_capture");
    let allowed = body.find("capture::allowed(").expect("capture::allowed(");
    let hide = body.find("main.hide()").expect("main.hide()");
    let blocking = body.find("spawn_blocking").expect("spawn_blocking");
    let show = body.find("main.show()").expect("main.show()");
    assert!(allowed < hide, "Wayland refusé avant de cacher les fenêtres");
    assert!(
        hide < blocking && blocking < show,
        "ordre attendu : cacher, capturer hors du fil principal, remontrer"
    );
}

#[test]
fn support_reports_transparency() {
    let s = MAIN_RS
        .split("struct AnnotationSupport")
        .nth(1)
        .and_then(|s| s.split('}').next())
        .expect("struct AnnotationSupport");
    assert!(s.contains("transparent: bool"), "annotation_support doit rendre transparent (P18)");
}
```

- [ ] **Étape 3 : vérifier le rouge.**
```bash
cd "$WT" && nice -n 10 cargo test -p roomboard-shell --test coque_c11b -j 4 2>&1 | grep -E "^test |panicked" | head -8
```
Attendu : les 4 tests `FAILED` (`fonction annotation_capture absente`, `transparent`, …).

- [ ] **Étape 4 : imports et `annotation_support`.** Dans `main.rs`, après la ligne
`use roomboard_shell::annotation::{self as ann, Rect as AnnRect, RestoreStep};`, ajouter :
```rust
use roomboard_shell::capture;
```
Remplacer la structure `AnnotationSupport` et la commande `annotation_support` par :
```rust
#[derive(Serialize)]
struct AnnotationSupport {
    supported: bool,
    reason: Option<&'static str>,
    screens: usize,
    transparent: bool,
}
```
```rust
/// C11a (P16) : session détectée par l'environnement ; nombre d'écrans pour « Écran suivant » (P15). C11b (P18) :
/// transparence peinte ou non (compositeur X11 sondé par `capture::composited`).
#[tauri::command]
fn annotation_support(app: AppHandle) -> AnnotationSupport {
    let session = ann::detect_session(std::env::consts::OS, |k| std::env::var(k).ok());
    let screens = app.available_monitors().map(|m| m.len()).unwrap_or(1).max(1);
    let transparent = ann::transparency(session, capture::composited());
    match ann::supported(session) {
        Ok(()) => AnnotationSupport { supported: true, reason: None, screens, transparent },
        Err(ann::Unsupported::Wayland) => AnnotationSupport { supported: false, reason: Some("wayland"), screens, transparent },
    }
}
```

- [ ] **Étape 5 : `annotation_enter` par `placement`.** Dans `annotation_enter`, remplacer
```rust
    let rects: Vec<AnnRect> = monitors.iter().map(rect_of).collect();
```
par
```rust
    let screens: Vec<(AnnRect, f64)> = monitors.iter().map(|m| (rect_of(m), m.scale_factor())).collect();
```
et remplacer les trois lignes
```rust
    let i = ann::pick_screen(&rects, screen, center);
    let px = ann::physical(thickness, monitors[i].scale_factor());
    let (bar, area) = ann::split(rects[i], ann::side_of(&dock), px);
```
par
```rust
    // C11b (P22) : même géométrie que `annotation_capture`, par la fonction pure partagée.
    let ann::Placement { index: i, bar, area, .. } = ann::placement(&screens, screen, center, &dock, thickness);
```
Rien d'autre ne change dans la commande (effet de bord du cadrage : même géométrie qu'avant ; preuve : tests T1 et
`cargo check`).

- [ ] **Étape 6 : les deux commandes.** Après la commande `relaunch_compat`, ajouter :
```rust
/// C11b (P27) : PNG accordé à la page, lu par `read_granted_file` puis libéré par `release_capture`.
#[derive(Serialize)]
struct CapturedPayload {
    id: String,
    path: String,
    size: u64,
    width: u32,
    height: u32,
}

/// C11b : échec technique (fenêtre, écran, fil) : journalisé, rendu à la page sous le code stable `failed`.
fn capture_failed(e: impl std::fmt::Display) -> String {
    eprintln!("annotation_capture : {e}");
    "failed".to_string()
}

/// C11b (P21 à P24, P27) : capture de l'écran de l'annotation (même géométrie que `annotation_enter`) sans nos
/// fenêtres : Wayland refusé avant tout, `annotate` (si montrée) et `main` cachées, 250 ms puis capture hors du fil
/// principal, fenêtres remontrées quoi qu'il arrive ; zone découpée, PNG écrit et accordé. Rejet : `denied`, `wayland`
/// ou `failed`. La logique vit dans `roomboard_shell::capture`.
#[tauri::command]
async fn annotation_capture(
    app: AppHandle,
    screen: Option<usize>,
    dock: String,
    thickness: f64,
) -> Result<CapturedPayload, String> {
    let session = ann::detect_session(std::env::consts::OS, |k| std::env::var(k).ok());
    capture::allowed(session).map_err(|e| e.code().to_string())?;
    let main = main_window(&app).map_err(capture_failed)?;
    let monitors = main.available_monitors().map_err(capture_failed)?;
    if monitors.is_empty() {
        return Err(capture_failed("aucun écran"));
    }
    let screens: Vec<(AnnRect, f64)> = monitors.iter().map(|m| (rect_of(m), m.scale_factor())).collect();
    let pos = main.outer_position().map_err(capture_failed)?;
    let size = main.inner_size().map_err(capture_failed)?;
    let center = (pos.x + (size.width / 2) as i32, pos.y + (size.height / 2) as i32);
    let place = ann::placement(&screens, screen, center, &dock, thickness);
    let annotate = app
        .get_webview_window(ANNOTATE)
        .filter(|w| w.is_visible().unwrap_or(false));
    if let Some(w) = &annotate {
        w.hide().map_err(capture_failed)?;
    }
    main.hide().map_err(capture_failed)?;
    let handle = app.clone();
    let done = tauri::async_runtime::spawn_blocking(move || {
        std::thread::sleep(Duration::from_millis(capture::HIDDEN_SETTLE_MS));
        let office = handle.state::<Office>();
        let granted = handle.state::<GrantedPaths>();
        capture::capture_area(&granted, &office.root, session, place.monitor, place.area)
    })
    .await;
    // Remontrées quoi qu'il arrive : la principale (barre), puis l'annotation.
    let shown = main.show().and_then(|()| annotate.as_ref().map_or(Ok(()), |w| w.show()));
    if let Err(e) = shown {
        eprintln!("annotation_capture : fenêtres non remontrées ({e})");
    }
    let captured = done.map_err(capture_failed)?.map_err(|e| {
        eprintln!("annotation_capture : {e}");
        e.code().to_string()
    })?;
    Ok(CapturedPayload {
        id: captured.id,
        path: captured.path.to_string_lossy().into_owned(),
        size: captured.size,
        width: captured.width,
        height: captured.height,
    })
}

/// C11b (P24) : accord du PNG retiré et fichier supprimé, que la lecture ait réussi ou non.
#[tauri::command]
fn release_capture(office: State<'_, Office>, granted: State<'_, GrantedPaths>, id: String) {
    capture::release(&granted, &office.root, &id);
}
```
Dans `setup`, après `office::purge_conversions(&root);`, ajouter :
```rust
            // C11b (P24) : restes de captures d'un plantage, dans la même racine privée.
            capture::purge(&root);
```
Dans `generate_handler![…]`, ajouter `annotation_capture,` et `release_capture,` après `annotation_cursor,` (avant
`relaunch_compat`).

- [ ] **Étape 7 : vérifier le vert** (commande de « Test et commande bornée », d'abord `coque_c11b` et `coque_c16`, puis
src-tauri sous le jeton). Si `cargo check` signale un type (ex. `scale_factor` en `f64`) ou une méthode (`is_visible`)
différents de ce qui est écrit, corriger la ligne C11b fautive seulement, puis rejouer.

- [ ] **Étape 8 : licences et verrou de src-tauri** (commandes de « Test et commande bornée »).

- [ ] **Étape 9 : commit.**
```bash
cd "$WT" && git add apps/desktop/src-tauri/src/main.rs && git add apps/desktop/src-tauri/Cargo.lock && git add crates/roomboard-shell/tests/coque_c11b.rs
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "feat(desktop): annotation_capture and release_capture commands" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Tâche T4 — Port des fenêtres et hôtes : `capture`, `load`, `opaque`, `view`, `transparent`, `sendTarget`, avis
<a id="tache-t4"></a>

**Objectif.** Le contrat de C11b entre la fenêtre principale et ses hôtes (P6, P10 à P13, P15, P18, P24, P27, P28, P30) :
types de capture, de vue et de cible, règle pure `sendTarget`, contrôle `isViewport`, avis du cadrage mot pour mot ;
l'hôte coque appelle `annotation_capture`, lit le PNG accordé par `grantedFile`, appelle `release_capture` dans un
`finally` ; le faux hôte rend une capture injectée et publie `annotationOpaque` et `annotationCaptures`.

**Fichiers.**
- Modifier : `apps/web/src/platform/annotation-port.ts` (imports l. 8-11 ; après `addedToPageMessage` l. 42 ; `DocumentPayload`, `ReturnedPayload` l. 54-65 ; `AnnotationSupport` l. 67-71 ; `Returned` l. 78-81 ; `AnnotationWindows` l. 84-102)
- Modifier : `apps/web/src/platform/annotation-tauri.ts`, `apps/web/src/platform/annotation-fake.ts`
- Test : `apps/web/src/platform/annotation-port.test.ts`, `annotation-tauri.test.ts`, `annotation-fake.test.ts`

**Interfaces.**
- Consomme : `grantedFile(ipc: TauriIpc, path: string, size: number): DroppedFile` et `READ_CHUNK` (`platform/host-tauri.ts:85`, existants) ; `type Matrix` (`core/api.ts`) ; `type StartMode` (`toolbar.ts`).
- Produit (utilisé par T5, T7, T8, T9, T10), dans `platform/annotation-port.ts` :
  - `export const NOTHING_TO_SEND_MESSAGE = "rien à envoyer"`
  - `export const sentToBoardMessage = (n: number): string` → `envoyé au tableau : page ${n}`
  - `export type CaptureFailure = "denied" | "wayland" | "failed"` ; `export const CAPTURE_REASONS: Readonly<Record<CaptureFailure, string>>`
  - `export const captureFailedMessage = (r: CaptureFailure): string` → `capture du bureau impossible (${CAPTURE_REASONS[r]}) : page à fond blanc`
  - `export const captureFailureOf = (e: unknown): CaptureFailure`
  - `export interface CapturedImage { readonly blob: Blob; readonly width: number; readonly height: number }`
  - `export type CaptureOutcome = { readonly ok: true; readonly image: CapturedImage } | { readonly ok: false; readonly reason: CaptureFailure }`
  - `export interface AnnotationViewport { readonly page: number; readonly matrix: Matrix }`
  - `export type SendTarget = "origin" | "new"`
  - `export interface SendRequest { readonly to: SendTarget; readonly origin: string | null; readonly image: CapturedImage | null; readonly view: AnnotationViewport | null }`
  - `export interface SendResult { readonly to: SendTarget; readonly page: number }`
  - `export function sendTarget(wanted: SendTarget, startMode: StartMode, originKind: "board" | "annotation" | null): SendTarget`
  - `export function isViewport(v: unknown): v is AnnotationViewport`
  - `DocumentPayload { base64; readonly opaque?: boolean }` ; `ReturnedPayload { id; base64; changed; readonly view?: AnnotationViewport }` ; `AnnotationSupport { supported; reason; screens; readonly transparent?: boolean }` (absent : coque d'avant C11b, lu comme vrai) ; `Returned { bytes; changed; readonly view?: AnnotationViewport }`
  - `AnnotationWindows.enter(o: AnnotationPlace & { document; profile; readonly opaque?: boolean }): Promise<number>`
  - `AnnotationWindows.load(o: { readonly document: Uint8Array; readonly opaque: boolean }): Promise<void>` (document seul, fenêtres non replacées)
  - `AnnotationWindows.capture(o: AnnotationPlace): Promise<CaptureOutcome>`
- Produit, dans `platform/annotation-fake.ts` : `FakeAnnotationOptions` gagne `readonly capture?: CaptureOutcome | (() => Promise<CaptureOutcome>)`, `readonly transparent?: boolean`, `readonly view?: unknown` ; `FakeAnnotationWindows` gagne `opaque(): boolean | null` (dernier `enter`/`load`) et `captures(): number` ; `export const FAKE_CAPTURE = { width: 320, height: 180 }`.
- Réutilise : `apps/web/src/platform/annotation-port.ts:84` (`AnnotationWindows`) — étendu par `capture`, `load`, `opaque`, `view`, `transparent` (P28).
- Réutilise : `apps/web/src/platform/annotation-tauri.ts:26` (`createTauriAnnotationWindows`) — étendu : `invoke("annotation_capture", place)`, `grantedFile(ipc, path, size).blob()`, `invoke("release_capture", { id })` dans `finally`.
- Réutilise : `apps/web/src/platform/host-tauri.ts:85` (`grantedFile`) — `grantedFile(ipc, shot.path, shot.size).blob()`, appelée telle quelle (lecture par morceaux `read_granted_file`).
- Réutilise : `apps/web/src/platform/annotation-fake.ts:35` (`createFakeAnnotationWindows`) — étendu : options `capture?`, `transparent?`, `view?` ; `dataset.annotationOpaque`, `annotationCaptures`.

**Test et commande bornée.**
```bash
export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH
cd "$WT/apps/web" && nice -n 10 pnpm exec vitest run src/platform/annotation-port.test.ts src/platform/annotation-tauri.test.ts src/platform/annotation-fake.test.ts 2>&1 | tail -15
cd "$WT/apps/web" && nice -n 10 pnpm exec tsc --noEmit > /tmp/c11b-T4-tsc.log 2>&1; echo "tsc=$?"; tail -10 /tmp/c11b-T4-tsc.log
```
Preuve attendue : `Test Files  3 passed (3)`, `Tests  N passed`, N ≥ 30 ; `tsc=0`. Noms présents (`--reporter=verbose`
si besoin) : `lecture du fichier en échec : failed, et release_capture appelé quand même (P24)`,
`collect : vue lisible rendue ; vue illisible ignorée (RF5)`. Effet de bord : `annotation_support` rend un champ de plus,
un lecteur d'avant C11b l'ignore (test `support : transparent relayé`).
Puis la suite web complète sous le jeton :
```bash
node ~/.claude/scripts/chaine/jeton.cjs --nom tests --proprietaire usage-c11b-capture/T4 --places-par-sujet 3 --commande "cd $WT/apps/web && ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm exec vitest run > /tmp/c11b-T4-web.log 2>&1"; grep -E "Test Files|Tests  " /tmp/c11b-T4-web.log | tail -2; grep -E "FAIL " /tmp/c11b-T4-web.log | head -5
```
Attendu : aucune ligne `FAIL `.

**Preuve visuelle.** Aucune (aucun rendu changé).

**Contraintes (recopiées de Global Constraints).**
- GC1 — Le chemin de l'encre ne traverse jamais la frontière page ↔ Rust natif ; seule la capture passe par un fichier accordé (U24). Ici : la capture arrive par `grantedFile` (fichier accordé), jamais en base64 dans un événement.
- GC4 — Builds et tests en `nice -n 10`. Un test qui échoue sur un délai est rejoué une fois ; aucun délai relevé, aucun test désactivé ou sauté, aucun seuil changé.
- GC7 — Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, messages en anglais, terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers ajoutés un par un (jamais `git add -A`/`.`/`commit -a`).
- GC8 — `PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` pour cargo et pnpm.
- GC9 — Suites lourdes sous le jeton : `node ~/.claude/scripts/chaine/jeton.cjs --nom tests --proprietaire usage-c11b-capture/T4 --places-par-sujet 3 --commande "<commande, sortie redirigée vers un fichier>"`.

**Interdits.** Ne pas toucher `AnnotationState` ni `AnnotationControl` (c'est T7) ; ne pas toucher `host-tauri.ts` ; aucun
octet d'image dans une charge d'événement (`emitTo`) ; aucun nouvel événement dans `ANNOTATION_EVENTS` ; ne pas modifier
`main.ts` (c'est T10).

**Critère « terminé ».** Les trois fichiers de test passent ; tsc 0 ; suite web sans `FAIL ` ; un commit. Le rapport porte
`Réutilisation : appelé apps/web/src/platform/host-tauri.ts (grantedFile)` et les lignes des trois modules étendus
(`Réutilisation : appelé apps/web/src/platform/annotation-port.ts (AnnotationWindows étendu)`, idem `annotation-tauri.ts`,
`annotation-fake.ts`), ou `Réutilisation : écart — <pourquoi>`.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree.**
```bash
export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH
SRC=/home/adminjd/projets/roomboard-wt/usage-c11b-capture
cd "$WT" && git status --short | head -5 && pnpm install --frozen-lockfile > /tmp/c11b-T4-install.log 2>&1; tail -2 /tmp/c11b-T4-install.log
for d in wasm wasm-formats; do [ -d "$WT/apps/web/src/$d" ] || cp -r "$SRC/apps/web/src/$d" "$WT/apps/web/src/"; done
```

- [ ] **Étape 2 : tests rouges du contrat.** Dans `annotation-port.test.ts`, compléter l'import :
```ts
import {
  addedToPageMessage,
  ANNOTATION_EVENTS,
  captureFailedMessage,
  captureFailureOf,
  CURSOR_POLL_MS,
  EXIT_TIMEOUT_MS,
  isViewport,
  NOTHING_TO_SEND_MESSAGE,
  sendTarget,
  sentToBoardMessage,
} from "./annotation-port";
```
et ajouter :
```ts
describe("contrat C11b (P6, P10 à P13)", () => {
  it("sendTarget : nouvel onglet si demandé, en « Annotation au démarrage », ou sans origine de tableau", () => {
    expect(sendTarget("origin", "board", "board")).toBe("origin");
    expect(sendTarget("new", "board", "board")).toBe("new");
    expect(sendTarget("origin", "desktop-annotation", "board")).toBe("new");
    expect(sendTarget("origin", "board", "annotation")).toBe("new");
    expect(sendTarget("origin", "board", null)).toBe("new");
  });
  it("avis du cadrage, mot pour mot (P10, P11, P12)", () => {
    expect(captureFailedMessage("denied")).toBe(
      "capture du bureau impossible (autorisation “Enregistrement de l'écran” refusée : l'accorder dans Réglages Système › Confidentialité et sécurité, puis relancer RoomBoard) : page à fond blanc",
    );
    expect(captureFailedMessage("wayland")).toBe("capture du bureau impossible (Wayland) : page à fond blanc");
    expect(captureFailedMessage("failed")).toBe("capture du bureau impossible (échec de la capture) : page à fond blanc");
    expect(NOTHING_TO_SEND_MESSAGE).toBe("rien à envoyer");
    expect(sentToBoardMessage(2)).toBe("envoyé au tableau : page 2");
  });
  it("captureFailureOf : denied et wayland gardés, tout autre rejet → failed", () => {
    expect(captureFailureOf("denied")).toBe("denied");
    expect(captureFailureOf("wayland")).toBe("wayland");
    expect(captureFailureOf("io")).toBe("failed");
    expect(captureFailureOf(new Error("x"))).toBe("failed");
  });
  it("isViewport : page entière ≥ 0 et six nombres finis ; sinon rejetée (RF5, P13)", () => {
    expect(isViewport({ page: 0, matrix: [1, 0, 0, 1, 0, 0] })).toBe(true);
    expect(isViewport({ page: 3, matrix: [2, 0, 0, 2, -5, 7.5] })).toBe(true);
    for (const bad of [
      null,
      {},
      { page: -1, matrix: [1, 0, 0, 1, 0, 0] },
      { page: 0.5, matrix: [1, 0, 0, 1, 0, 0] },
      { page: 0, matrix: [1, 0, 0, 1, 0] },
      { page: 0, matrix: [1, 0, 0, 1, 0, null] },
      { page: 0, matrix: "x" },
    ]) {
      expect(isViewport(bad)).toBe(false);
    }
  });
});
```

- [ ] **Étape 3 : tests rouges de l'hôte coque.** Dans `annotation-tauri.test.ts` : importer `READ_CHUNK` de
`./host-tauri` ; remplacer la fonction `fakeIpc` par :
```ts
const SHOT = { id: "4242-1", path: "/cache/captures/4242-1.png", size: 3, width: 320, height: 180 };
function fakeIpc(o: { autoReady?: boolean; shot?: typeof SHOT | string; bytes?: Uint8Array | null; transparent?: boolean } = {}) {
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
      if (cmd === "annotation_support") return { supported: true, reason: null, screens: 2, ...(o.transparent === undefined ? {} : { transparent: o.transparent }) } as T;
      if (cmd === "annotation_capture") {
        if (typeof o.shot === "string") throw o.shot;
        return (o.shot ?? SHOT) as T;
      }
      if (cmd === "read_granted_file") {
        if (o.bytes === null) throw "lecture impossible";
        return (o.bytes ?? new Uint8Array([1, 2, 3])).slice().buffer as T;
      }
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
```
Dans le test existant `enter : annotation_enter, attend ready, …`, l'attendu du document devient
`expect(f.emitted[1]!.payload).toEqual({ base64: toBase64(doc), opaque: false });` (effet de bord du cadrage : « le
message d'entrée est le même qu'en C11a, plus `opaque: false` »). Ajouter :
```ts
describe("hôte des fenêtres de la coque (C11b, P24, P27, P28)", () => {
  it("capture : annotation_capture (écran, côté, épaisseur), lecture du fichier accordé, puis release_capture ; PNG 320 × 180", async () => {
    const f = fakeIpc();
    const w = createTauriAnnotationWindows(f.ipc);
    const r = await w.capture(place);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect([r.image.width, r.image.height, r.image.blob.type, r.image.blob.size]).toEqual([320, 180, "image/png", 3]);
    expect(f.invokes.map(([c]) => c)).toEqual(["annotation_capture", "read_granted_file", "release_capture"]);
    expect(f.invokes[0]![1]).toEqual({ screen: null, dock: "top", thickness: 48 });
    expect(f.invokes[1]![1]).toEqual({ path: SHOT.path, offset: 0, len: READ_CHUNK });
    expect(f.invokes[2]![1]).toEqual({ id: SHOT.id });
  });
  it("capture refusée par la coque : denied, wayland ; tout autre rejet → failed ; aucun release (aucun fichier)", async () => {
    for (const [shot, reason] of [["denied", "denied"], ["wayland", "wayland"], ["io", "failed"]] as const) {
      const f = fakeIpc({ shot });
      expect(await createTauriAnnotationWindows(f.ipc).capture(place)).toEqual({ ok: false, reason });
      expect(f.invokes.some(([c]) => c === "release_capture")).toBe(false);
    }
  });
  it("lecture du fichier en échec : failed, et release_capture appelé quand même (P24)", async () => {
    const f = fakeIpc({ bytes: null });
    expect(await createTauriAnnotationWindows(f.ipc).capture(place)).toEqual({ ok: false, reason: "failed" });
    expect(f.invokes.at(-1)).toEqual(["release_capture", { id: SHOT.id }]);
  });
  it("enter porte opaque (vrai sur demande) ; load renvoie le document sans annotation_enter (P15, P28)", async () => {
    const f = fakeIpc();
    const w = createTauriAnnotationWindows(f.ipc);
    await w.enter({ ...place, document: doc, profile: BUILTIN_PROFILES[0]!, opaque: true });
    expect(f.emitted.at(-1)!.payload).toEqual({ base64: toBase64(doc), opaque: true });
    const enters = f.invokes.filter(([c]) => c === "annotation_enter").length;
    await w.load({ document: new Uint8Array([7]), opaque: false });
    expect(f.emitted.at(-1)).toEqual({ target: "annotate", event: ANNOTATION_EVENTS.document, payload: { base64: toBase64(new Uint8Array([7])), opaque: false } });
    expect(f.invokes.filter(([c]) => c === "annotation_enter").length).toBe(enters);
  });
  it("collect : vue lisible rendue ; vue illisible ignorée (RF5)", async () => {
    const f = fakeIpc();
    const w = createTauriAnnotationWindows(f.ipc);
    const p = w.collect();
    await vi.waitFor(() => expect(f.emitted.at(-1)?.event).toBe(ANNOTATION_EVENTS.collect));
    const id = (f.emitted.at(-1)!.payload as { id: number }).id;
    f.fire(ANNOTATION_EVENTS.returned, { id, base64: toBase64(doc), changed: true, view: { page: 1, matrix: [2, 0, 0, 2, 3, 4] } });
    expect(await p).toEqual({ bytes: doc, changed: true, view: { page: 1, matrix: [2, 0, 0, 2, 3, 4] } });
    const q = w.collect();
    await vi.waitFor(() => expect((f.emitted.at(-1)!.payload as { id: number }).id).toBe(id + 1));
    f.fire(ANNOTATION_EVENTS.returned, { id: id + 1, base64: toBase64(doc), changed: true, view: { page: -1, matrix: [Number.NaN, 0, 0, 1, 0, 0] } });
    const back = await q;
    expect(back).toEqual({ bytes: doc, changed: true });
  });
  it("support : transparent relayé ; absent (coque d'avant C11b) laissé absent", async () => {
    expect((await createTauriAnnotationWindows(fakeIpc({ transparent: false }).ipc).support()).transparent).toBe(false);
    expect((await createTauriAnnotationWindows(fakeIpc().ipc).support()).transparent).toBeUndefined();
  });
});
```

- [ ] **Étape 4 : tests rouges du faux hôte.** Dans `annotation-fake.test.ts`, ajouter :
```ts
describe("faux hôte (C11b, P28, P30)", () => {
  it("support : transparent vrai par défaut, faux sur demande", async () => {
    expect((await createFakeAnnotationWindows().support()).transparent).toBe(true);
    expect((await createFakeAnnotationWindows({ transparent: false }).support()).transparent).toBe(false);
  });
  it("capture : PNG 320 × 180 par défaut ; résultat injecté ou fonction ; compte publié sur dataset", async () => {
    const ds: Record<string, string | undefined> = {};
    const f = createFakeAnnotationWindows({ dataset: ds });
    const a = await f.capture(place);
    expect(a.ok && a.image.width === 320 && a.image.height === 180 && a.image.blob.type === "image/png").toBe(true);
    expect(ds["annotationCaptures"]).toBe("1");
    expect(f.captures()).toBe(1);
    expect(f.log).toContain("capture");
    const refus = createFakeAnnotationWindows({ capture: { ok: false, reason: "denied" } });
    expect(await refus.capture(place)).toEqual({ ok: false, reason: "denied" });
    const fn = createFakeAnnotationWindows({ capture: async () => ({ ok: false, reason: "wayland" }) });
    expect(await fn.capture(place)).toEqual({ ok: false, reason: "wayland" });
  });
  it("enter et load : opaque publié (annotationOpaque), document reçu par le canal JSON ; load ne compte pas d'entrée", async () => {
    const ds: Record<string, string | undefined> = {};
    const f = createFakeAnnotationWindows({ dataset: ds });
    await f.enter({ ...place, document: new Uint8Array([1]), profile: BUILTIN_PROFILES[0]! });
    expect(ds["annotationOpaque"]).toBe("0");
    expect(f.opaque()).toBe(false);
    await f.load({ document: new Uint8Array([1, 2]), opaque: true });
    expect(ds).toMatchObject({ annotationOpaque: "1", annotationEntrees: "1", annotationRecu: "2" });
    expect(f.opaque()).toBe(true);
    expect(Array.from(f.received()!)).toEqual([1, 2]);
    expect(f.log).toContain("load opaque");
    await f.enter({ ...place, document: new Uint8Array([1]), profile: BUILTIN_PROFILES[0]!, opaque: true });
    expect(ds["annotationOpaque"]).toBe("1");
  });
  it("collect : la vue passe le canal JSON ; une vue illisible est ignorée (RF5)", async () => {
    const f = createFakeAnnotationWindows({ view: { page: 1, matrix: [2, 0, 0, 2, 3, 4] } });
    await f.enter({ ...place, document: new Uint8Array([1]), profile: BUILTIN_PROFILES[0]! });
    expect((await f.collect())?.view).toEqual({ page: 1, matrix: [2, 0, 0, 2, 3, 4] });
    const g = createFakeAnnotationWindows({ view: { page: -1, matrix: [Number.NaN, 0, 0, 1, 0, 0] } });
    await g.enter({ ...place, document: new Uint8Array([1]), profile: BUILTIN_PROFILES[0]! });
    const back = await g.collect();
    expect(back).not.toBeNull();
    expect(back!.view).toBeUndefined();
  });
});
```

- [ ] **Étape 5 : vérifier le rouge.**
```bash
cd "$WT/apps/web" && nice -n 10 pnpm exec vitest run src/platform/annotation-port.test.ts src/platform/annotation-tauri.test.ts src/platform/annotation-fake.test.ts 2>&1 | grep -E "FAIL|Tests  " | head -8
```
Attendu : échecs (`sendTarget is not a function`, `w.capture is not a function`, …).

- [ ] **Étape 6 : implémenter le contrat** dans `annotation-port.ts`. Imports :
```ts
import type { Matrix } from "../core/api";
import type { FormatAction } from "../engine/rich-edit";
import type { Dock, Profile, StartMode } from "../toolbar";
```
Après `addedToPageMessage` :
```ts
/** C11b (P11) : ni capture ni élément. */
export const NOTHING_TO_SEND_MESSAGE = "rien à envoyer";
/** C11b (P12) : rang de la page insérée dans l'onglet cible. */
export const sentToBoardMessage = (n: number): string => `envoyé au tableau : page ${n}`;
/** C11b (P10, P27) : rejets de `annotation_capture`. */
export type CaptureFailure = "denied" | "wayland" | "failed";
export const CAPTURE_REASONS: Readonly<Record<CaptureFailure, string>> = Object.freeze({
  denied:
    "autorisation “Enregistrement de l'écran” refusée : l'accorder dans Réglages Système › Confidentialité et sécurité, puis relancer RoomBoard",
  wayland: "Wayland",
  failed: "échec de la capture",
});
export const captureFailedMessage = (r: CaptureFailure): string => `capture du bureau impossible (${CAPTURE_REASONS[r]}) : page à fond blanc`;
/** Rejet de la coque (chaîne) en raison connue ; toute autre valeur : `failed`. */
export const captureFailureOf = (e: unknown): CaptureFailure => (e === "denied" || e === "wayland" ? e : "failed");

/** C11b (P24, P25) : PNG lu du fichier accordé (coque) ou fourni par le faux hôte ; dimensions en pixels. */
export interface CapturedImage {
  readonly blob: Blob;
  readonly width: number;
  readonly height: number;
}
export type CaptureOutcome = { readonly ok: true; readonly image: CapturedImage } | { readonly ok: false; readonly reason: CaptureFailure };
/** C11b (P13) : rang de la page montrée dans `annotate` et matrice de son monde vers la page envoyée. */
export interface AnnotationViewport {
  readonly page: number;
  readonly matrix: Matrix;
}
export type SendTarget = "origin" | "new";
/** C11b (P3, P7) : demande d'envoi à l'espace de travail ; `view` null : page 0, identité. */
export interface SendRequest {
  readonly to: SendTarget;
  readonly origin: string | null;
  readonly image: CapturedImage | null;
  readonly view: AnnotationViewport | null;
}
/** Onglet effectivement servi et rang (1 = première) de la page insérée. */
export interface SendResult {
  readonly to: SendTarget;
  readonly page: number;
}

/** C11b (P6) : nouvel onglet si demandé, si le profil rend « Annotation au démarrage » (Q2), ou si l'origine est absente
 *  ou est l'onglet d'annotation lui-même ; sinon l'onglet d'origine. */
export function sendTarget(wanted: SendTarget, startMode: StartMode, originKind: "board" | "annotation" | null): SendTarget {
  return wanted === "new" || startMode === "desktop-annotation" || originKind !== "board" ? "new" : "origin";
}

/** C11b (P13) : vue lue d'une charge JSON ; page entière ≥ 0, matrice de 6 nombres finis ; sinon rejetée. */
export function isViewport(v: unknown): v is AnnotationViewport {
  if (typeof v !== "object" || v === null) return false;
  const { page, matrix } = v as { readonly page?: unknown; readonly matrix?: unknown };
  return (
    typeof page === "number" &&
    Number.isInteger(page) &&
    page >= 0 &&
    Array.isArray(matrix) &&
    matrix.length === 6 &&
    matrix.every((x) => typeof x === "number" && Number.isFinite(x))
  );
}
```
Charges et hôte :
```ts
export interface DocumentPayload {
  readonly base64: string;
  /** C11b (P15) : fenêtre opaque (bureau figé) ; absent : faux (charge C11a). */
  readonly opaque?: boolean;
}
```
```ts
/** `changed` : version du moteur différente de celle du chargement. C11b (P13) : `view` absent : page 0, identité. */
export interface ReturnedPayload {
  readonly id: number;
  readonly base64: string;
  readonly changed: boolean;
  readonly view?: AnnotationViewport;
}
```
```ts
export interface AnnotationSupport {
  readonly supported: boolean;
  readonly reason: "wayland" | null;
  readonly screens: number;
  /** C11b (P18) : transparence peinte ; absent (coque d'avant C11b) : vrai. */
  readonly transparent?: boolean;
}
```
```ts
export interface Returned {
  readonly bytes: Uint8Array;
  readonly changed: boolean;
  /** C11b (P13) : vue d'`annotate` lue et contrôlée (`isViewport`). */
  readonly view?: AnnotationViewport;
}
```
Dans `AnnotationWindows`, remplacer la ligne `enter(…)` et ajouter deux méthodes :
```ts
  /** Crée ou montre `annotate`, place les deux fenêtres, attend `ready`, envoie le profil puis le document ; rend l'écran retenu.
   *  C11b (P15) : `opaque` vrai : bureau figé (absent : transparent). */
  enter(o: AnnotationPlace & { readonly document: Uint8Array; readonly profile: Profile; readonly opaque?: boolean }): Promise<number>;
  /** C11b (P14, P28) : renvoie le document seul (bascule figé / vivant), sans replacer les fenêtres. */
  load(o: { readonly document: Uint8Array; readonly opaque: boolean }): Promise<void>;
  /** C11b (P22, P27) : capture de l'écran de l'annotation sans nos fenêtres ; refus en raison connue, jamais de rejet. */
  capture(o: AnnotationPlace): Promise<CaptureOutcome>;
```

- [ ] **Étape 7 : implémenter l'hôte coque** dans `annotation-tauri.ts`. Imports :
```ts
import type { ToolbarView } from "../ui/item-state";
import {
  ANNOTATE_LABEL,
  ANNOTATION_EVENTS,
  captureFailureOf,
  isViewport,
  READY_TIMEOUT_MS,
  type AnnotationSupport,
  type AnnotationWindows,
  type CollectPayload,
  type DocumentPayload,
  type Returned,
  type ReturnedPayload,
} from "./annotation-port";
import { fromBase64, toBase64 } from "./clipboard";
import { grantedFile } from "./host-tauri";
```
L'écoute `returned` devient :
```ts
    ipc.listen<ReturnedPayload>(ANNOTATION_EVENTS.returned, (e) => {
      const p = pending;
      if (p === null || e.payload?.id !== p.id) return;
      pending = null;
      const bytes = typeof e.payload.base64 === "string" ? fromBase64(e.payload.base64) : null;
      const view = isViewport(e.payload.view) ? e.payload.view : null;
      p.resolve(bytes === null ? null : { bytes, changed: e.payload.changed === true, ...(view === null ? {} : { view }) });
    }),
```
Dans `enter`, la charge du document devient `{ base64: toBase64(o.document), opaque: o.opaque === true }`. Ajouter après
`place` :
```ts
    async load(o) {
      await subscribed;
      await waitReady();
      await ipc.emitTo<DocumentPayload>(ANNOTATE_LABEL, ANNOTATION_EVENTS.document, { base64: toBase64(o.document), opaque: o.opaque });
    },
    async capture(o) {
      await subscribed;
      type Shot = { readonly id: string; readonly path: string; readonly size: number; readonly width: number; readonly height: number };
      let shot: Shot;
      try {
        shot = await ipc.invoke<Shot>("annotation_capture", placeArgs(o));
      } catch (e) {
        return { ok: false, reason: captureFailureOf(e) };
      }
      try {
        // P24 : le PNG accordé est lu par morceaux (`read_granted_file`), puis toujours libéré.
        const raw = await grantedFile(ipc, shot.path, shot.size).blob();
        return { ok: true, image: { blob: new Blob([raw], { type: "image/png" }), width: shot.width, height: shot.height } };
      } catch {
        return { ok: false, reason: "failed" };
      } finally {
        await ipc.invoke<void>("release_capture", { id: shot.id }).catch(() => undefined);
      }
    },
```
`AnnotationIpc` est passé à `grantedFile` (qui attend `TauriIpc`) : les méthodes sont compatibles (bivariance des
paramètres de méthode) ; si tsc refuse, passer `{ invoke: (c, a) => ipc.invoke(c, a as Record<string, unknown> | undefined), listen: (e, cb) => ipc.listen(e, cb) }`.

- [ ] **Étape 8 : implémenter le faux hôte** dans `annotation-fake.ts`. Imports :
```ts
import type { ToolbarView } from "../ui/item-state";
import { TOOL_TABLE, type Profile } from "../toolbar";
import {
  isViewport,
  type AnnotationCommand,
  type AnnotationPlace,
  type AnnotationViewport,
  type AnnotationWindows,
  type CaptureOutcome,
  type DocumentPayload,
  type PointerMode,
  type ReturnedPayload,
} from "./annotation-port";
import { fromBase64, toBase64 } from "./clipboard";
```
Options et interface :
```ts
export interface FakeAnnotationOptions {
  readonly screens?: number;
  readonly supported?: boolean;
  readonly reason?: "wayland" | null;
  /** Ce que `annotate` aurait tracé (tests) ; absent : document rendu tel quel, `changed: false`. */
  readonly draw?: (bytes: Uint8Array) => Promise<Uint8Array>;
  /** `collect` ne répond jamais (délai de sortie). */
  readonly mute?: boolean;
  readonly dataset?: Record<string, string | undefined>;
  /** C11b (P30) : résultat de `capture` ; absent : `FAKE_CAPTURE` (PNG 320 × 180 annoncé). */
  readonly capture?: CaptureOutcome | (() => Promise<CaptureOutcome>);
  /** C11b (P18) : `support().transparent` ; absent : vrai. */
  readonly transparent?: boolean;
  /** C11b (P13) : vue rendue par `annotate` à la collecte (tests) ; illisible : ignorée comme par la coque. */
  readonly view?: unknown;
}

export interface FakeAnnotationWindows extends AnnotationWindows {
  readonly log: string[];
  readonly sent: AnnotationCommand[];
  received(): Uint8Array | null;
  profiles(): number;
  /** Échap dans `annotate`, ou `CloseRequested` de la coque. */
  requestExit(): void;
  emitView(v: ToolbarView): void;
  /** C11b : `opaque` du dernier `enter` ou `load` ; null avant. */
  opaque(): boolean | null;
  /** C11b : nombre de captures demandées. */
  captures(): number;
}

/** C11b (P30) : capture par défaut du faux hôte (tests) : 8 octets d'en-tête PNG, 320 × 180 annoncés. */
export const FAKE_CAPTURE = Object.freeze({ width: 320, height: 180 });
const defaultCapture = (): CaptureOutcome => ({
  ok: true,
  image: { blob: new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], { type: "image/png" }), width: FAKE_CAPTURE.width, height: FAKE_CAPTURE.height },
});
```
Dans `createFakeAnnotationWindows` : déclarer `let lastOpaque: boolean | null = null;` et `let captures = 0;` à côté de
`let entries = 0;` ; `support()` rend `jsonChannel({ supported: o.supported ?? true, reason: o.reason ?? null, screens, transparent: o.transparent ?? true })` ;
`enter` devient :
```ts
    async enter(p) {
      const screen = clamp(p.screen);
      log.push(`enter ${screen}`);
      jsonChannel<Profile>(p.profile);
      profiles += 1;
      const payload = jsonChannel<DocumentPayload>({ base64: toBase64(p.document), opaque: p.opaque === true });
      received = fromBase64(payload.base64);
      lastOpaque = payload.opaque === true;
      entries += 1;
      Object.assign(ds, {
        annotation: "1",
        pointeur: "draw",
        annotationRecu: String(received?.length ?? 0),
        annotationEntrees: String(entries),
        annotationOpaque: lastOpaque ? "1" : "0",
      });
      return screen;
    },
    async load(p) {
      log.push(`load ${p.opaque ? "opaque" : "transparent"}`);
      const payload = jsonChannel<DocumentPayload>({ base64: toBase64(p.document), opaque: p.opaque });
      received = fromBase64(payload.base64);
      lastOpaque = payload.opaque === true;
      Object.assign(ds, { annotationRecu: String(received?.length ?? 0), annotationOpaque: lastOpaque ? "1" : "0" });
    },
    async capture() {
      log.push("capture");
      captures += 1;
      ds["annotationCaptures"] = String(captures);
      const c = o.capture;
      return c === undefined ? defaultCapture() : typeof c === "function" ? c() : c;
    },
```
Dans `collect`, la charge et le retour deviennent :
```ts
        const r = jsonChannel<ReturnedPayload>({
          id: 0,
          base64: toBase64(bytes),
          changed: o.draw !== undefined,
          ...(o.view === undefined ? {} : { view: o.view as AnnotationViewport }),
        });
        const back = fromBase64(r.base64);
        if (back === null) return null;
        ds["annotationRendu"] = String(back.length);
        return { bytes: back, changed: r.changed, ...(isViewport(r.view) ? { view: r.view } : {}) };
```
Ajouter à l'objet rendu : `opaque: () => lastOpaque,` et `captures: () => captures,`.

- [ ] **Étape 9 : vérifier le vert** (commandes de « Test et commande bornée » : 3 fichiers, tsc, suite web sous le jeton).

- [ ] **Étape 10 : commit.**
```bash
cd "$WT" && for f in annotation-port.ts annotation-port.test.ts annotation-fake.ts annotation-fake.test.ts annotation-tauri.ts annotation-tauri.test.ts; do git add "apps/web/src/platform/$f"; done
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "feat(annotation): capture, load and view in the window port and hosts" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Tâche T5 — Page `annotate` opaque (bureau figé) et vue rendue à la collecte
<a id="tache-t5"></a>

**Objectif.** Dans la fenêtre `annotate` : un document reçu avec `opaque: true` crée une session non transparente (fond
de page et pourtour peints) et coupe pour de bon le clic à travers (jamais de sondage du curseur, `ignore(false)` posé à
l'installation) ; sans `opaque` (charge C11a), rien ne change (P15). À la collecte, la réponse porte
`view: { page, matrix }` : rang de la page montrée et matrice du monde d'`annotate` vers la page envoyée (P13).

**Fichiers.**
- Modifier : `apps/web/src/app/annotation-page.ts` (imports l. 8-10 ; `AnnotationPageDeps` l. 54-65 ; `follow` l. 138-153 ; `load` l. 170-198 ; `install` l. 200-212 ; `collect` l. 214-227)
- Modifier : `apps/web/src/annotate-start.ts` (l. 58, `makeSession`)
- Test : `apps/web/src/app/annotation-page.test.ts` (fonction `setup` l. 45-90 complétée ; nouveaux tests en fin de fichier)

**Interfaces.**
- Consomme (T4) : `DocumentPayload.opaque?: boolean`, `ReturnedPayload.view?: AnnotationViewport` (`platform/annotation-port.ts`) ; `PAGE_WIDTH`, `type Matrix` (`core/api.ts`) ; `type Camera` (`engine/camera.ts`).
- Produit :
  - `export function viewMatrix(cam: Camera, viewWidth: number): Matrix` — `s = PAGE_WIDTH / viewWidth` ; `[s·zoom, 0, 0, s·zoom, s·tx, s·ty]` ; largeur ≤ 0 ou non finie : `[1, 0, 0, 1, 0, 0]`.
  - `AnnotationPageDeps.makeSession(doc: CoreDocument, assets: AssetStore, opaque: boolean): Promise<BoardSession>`
  - `AnnotationPageDeps.viewWidth?: () => number` (largeur de la vue en px CSS ; absente : `window.innerWidth`)
- Réutilise : `apps/web/src/app/annotation-page.ts:84` ; `apps/web/src/annotate-start.ts:58` ; `apps/web/src/app/board-session.ts:81` — `makeSession(doc, assets, opaque)` → `createBoardSession(doc, { ...shared, transparent: !opaque }, assets)` ; `SessionShared.transparent` réutilisé tel quel (`board-session.ts` inchangé).
- Réutilise : `apps/web/src/engine/camera.ts` (`screenToWorld`, `annotation-page.ts:132`) — la caméra `b.engine.camera()` (`{ zoom, tx, ty }`, écran = monde × zoom + t) donne `view = { page: state.pageIndex, matrix: viewMatrix(caméra, largeur) }` dans `collect`.

**Test et commande bornée.**
```bash
export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH
cd "$WT/apps/web" && nice -n 10 pnpm exec vitest run src/app/annotation-page.test.ts --reporter=verbose 2>&1 | grep -E "✓|×|Tests  " | tail -30
cd "$WT/apps/web" && nice -n 10 pnpm exec tsc --noEmit > /tmp/c11b-T5-tsc.log 2>&1; echo "tsc=$?"; tail -10 /tmp/c11b-T5-tsc.log
```
Preuve attendue : `Tests  N passed`, N ≥ 20 (15 C11a gardés verts + 5 nouveaux), ligne
`opaque : session opaque, aucun sondage en Sélection, clic à travers coupé (P15)` ; `tsc=0`. Effets de bord du cadrage :
« une page `annotate` qui ne connaît pas les champs reste transparente et rend l'identité » (test `sans opaque (charge
d'avant C11b)`) ; « aucun `ignore(true)` en `opaque` » (test `opaque : …`). Suite web complète sous le jeton :
```bash
node ~/.claude/scripts/chaine/jeton.cjs --nom tests --proprietaire usage-c11b-capture/T5 --places-par-sujet 3 --commande "cd $WT/apps/web && ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm exec vitest run > /tmp/c11b-T5-web.log 2>&1"; grep -E "Test Files|Tests  " /tmp/c11b-T5-web.log | tail -2; grep -E "FAIL " /tmp/c11b-T5-web.log | head -5
```

**Preuve visuelle.** Aucune sur la VM (la fenêtre `annotate` n'existe qu'en coque) ; fiche T11, C11b-3.

**Contraintes (recopiées de Global Constraints).**
- GC1 — Le chemin de l'encre ne traverse jamais la frontière page ↔ Rust natif ; seule la capture passe par un fichier accordé (U24). Ici : `view` ne porte qu'un rang et six nombres, jamais un point d'encre.
- GC4 — Builds et tests en `nice -n 10`. Un test qui échoue sur un délai est rejoué une fois ; aucun délai relevé, aucun test désactivé ou sauté, aucun seuil changé.
- GC7 — Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, messages en anglais, terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers ajoutés un par un (jamais `git add -A`/`.`/`commit -a`).
- GC8 — `PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` pour cargo et pnpm.
- GC9 — Suites lourdes sous le jeton : `node ~/.claude/scripts/chaine/jeton.cjs --nom tests --proprietaire usage-c11b-capture/T5 --places-par-sujet 3 --commande "<commande, sortie redirigée vers un fichier>"`.

**Interdits.** Ne pas toucher `board-session.ts`, `canvas2d.ts` (le `backdrop` est déjà peint, transparent ou non) ni
`annotation-port.ts` ; ne pas changer `CURSOR_POLL_MS` ; aucun nouvel événement.

**Critère « terminé ».** Tests de la page verts (C11a compris) ; tsc 0 ; suite web sans `FAIL ` ; un commit. Le rapport
porte `Réutilisation : appelé apps/web/src/app/board-session.ts (SessionShared.transparent)` et
`Réutilisation : appelé apps/web/src/engine/camera.ts (caméra de la session)`, ou `Réutilisation : écart — <pourquoi>`.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree.**
```bash
export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH
SRC=/home/adminjd/projets/roomboard-wt/usage-c11b-capture
cd "$WT" && git status --short | head -5 && pnpm install --frozen-lockfile > /tmp/c11b-T5-install.log 2>&1; tail -2 /tmp/c11b-T5-install.log
for d in wasm wasm-formats; do [ -d "$WT/apps/web/src/$d" ] || cp -r "$SRC/apps/web/src/$d" "$WT/apps/web/src/"; done
grep -n "opaque?: boolean\|view?: AnnotationViewport" apps/web/src/platform/annotation-port.ts
```
Attendu : les deux champs de T4 présents (sinon T4 non fusionnée : `bloquée`).

- [ ] **Étape 2 : tests rouges.** Dans `annotation-page.test.ts`, importer `viewMatrix` avec `createAnnotationPage` ; dans
`setup`, ajouter l'option `viewWidth?: number`, un tableau `const opaques: boolean[] = [];`, remplacer
`makeSession: async (doc) => {` par `makeSession: async (doc, _assets, opaque) => {` avec `opaques.push(opaque);` en
première ligne, ajouter `viewWidth: () => o.viewWidth ?? 960,` aux dépendances, et rendre `opaques` dans l'objet de
`setup`. Ajouter en fin de fichier :
```ts
describe("page annotate (C11b, P13, P15, P16)", () => {
  it("viewMatrix : monde → page envoyée (PAGE_WIDTH / largeur de vue) ; largeur nulle : identité", () => {
    expect(viewMatrix({ zoom: 0.5, tx: 30, ty: 16 }, 960)).toEqual([1, 0, 0, 1, 60, 32]);
    expect(viewMatrix({ zoom: 1, tx: 0, ty: 0 }, 1920)).toEqual([1, 0, 0, 1, 0, 0]);
    expect(viewMatrix({ zoom: 2, tx: 5, ty: 5 }, 0)).toEqual([1, 0, 0, 1, 0, 0]);
    expect(viewMatrix({ zoom: 2, tx: 5, ty: 5 }, Number.NaN)).toEqual([1, 0, 0, 1, 0, 0]);
  });
  it("opaque : session opaque, aucun sondage en Sélection, clic à travers coupé (P15)", async () => {
    const { page, c, boards, ignores, opaques, polling } = setup({ hit: false });
    await page.start();
    c.send(ANNOTATION_EVENTS.document, { base64: blank(), opaque: true });
    await flush();
    expect(opaques).toEqual([true]);
    expect(ignores).toEqual([false]);
    boards[0]!.engine.setTool("select");
    await flush();
    expect(polling()).toBe(false);
    expect(ignores.includes(true)).toBe(false);
  });
  it("sans opaque (charge d'avant C11b) : session transparente, Sélection sonde comme en C11a", async () => {
    const { page, c, boards, opaques, polling } = setup({ hit: false });
    await page.start();
    c.send(ANNOTATION_EVENTS.document, { base64: blank() });
    await flush();
    expect(opaques).toEqual([false]);
    boards[0]!.engine.setTool("select");
    await flush();
    expect(polling()).toBe(true);
  });
  it("figé puis vivant (P16) : un nouveau document sans opaque rend le sondage en Sélection", async () => {
    const { page, c, boards, opaques, polling } = setup({ hit: false });
    await page.start();
    c.send(ANNOTATION_EVENTS.document, { base64: blank(), opaque: true });
    await flush();
    c.send(ANNOTATION_EVENTS.document, { base64: blank(), opaque: false });
    await flush();
    expect(opaques).toEqual([true, false]);
    boards.at(-1)!.engine.setTool("select");
    await flush();
    expect(polling()).toBe(true);
  });
  it("collect rend la vue (P13) : page montrée 0, matrice PAGE_WIDTH / largeur de vue", async () => {
    const { page, c } = setup({ viewWidth: 960 });
    await page.start();
    c.send(ANNOTATION_EVENTS.document, { base64: blank() });
    await flush();
    c.send(ANNOTATION_EVENTS.collect, { id: 9 });
    await flush();
    expect(c.out.at(-1)).toMatchObject({
      event: ANNOTATION_EVENTS.returned,
      payload: { id: 9, view: { page: 0, matrix: [2, 0, 0, 2, 0, 0] } },
    });
  });
});
```
(La caméra du faux tableau est l'identité ; 1920 / 960 = 2.)

- [ ] **Étape 3 : vérifier le rouge.**
```bash
cd "$WT/apps/web" && nice -n 10 pnpm exec vitest run src/app/annotation-page.test.ts 2>&1 | grep -E "FAIL|Tests  " | head -6
```
Attendu : échecs (`viewMatrix is not a function`, `opaques` vide ou `[undefined]`).

- [ ] **Étape 4 : implémenter** dans `annotation-page.ts`. Imports :
```ts
import { PAGE_WIDTH, type CoreDocument, type Matrix } from "../core/api";
import type { AssetStore } from "../core/asset-store";
import { screenToWorld, type Camera } from "../engine/camera";
```
Après `passThrough` :
```ts
/** C11b (P13) : matrice du monde d'`annotate` vers la page envoyée : écran = monde × zoom + (tx, ty) (px CSS), puis
 *  × PAGE_WIDTH / largeur de la vue (la capture couvre la vue et se pose ajustée à la largeur de la page). Largeur
 *  nulle ou non finie : identité. */
export function viewMatrix(cam: Camera, viewWidth: number): Matrix {
  if (!Number.isFinite(viewWidth) || viewWidth <= 0) return [1, 0, 0, 1, 0, 0];
  const s = PAGE_WIDTH / viewWidth;
  return [s * cam.zoom, 0, 0, s * cam.zoom, s * cam.tx, s * cam.ty];
}
```
Dans `AnnotationPageDeps`, remplacer `makeSession(…)` et ajouter `viewWidth` :
```ts
  /** C11b (P15) : `opaque` vrai : session non transparente (bureau figé). */
  makeSession(doc: CoreDocument, assets: AssetStore, opaque: boolean): Promise<BoardSession>;
  /** C11b (P13) : largeur de la vue en px CSS ; absente : `window.innerWidth`. */
  readonly viewWidth?: () => number;
```
Dans `createAnnotationPage`, après `const every = …` : `const viewWidth = d.viewWidth ?? (() => window.innerWidth);` ;
après `let busy = false;` : `/** C11b (P15) : fenêtre opaque : jamais de clic à travers. */ let opaque = false;`.
`follow` : la première ligne devient
```ts
    // C11b (P15) : fenêtre opaque (bureau figé) : jamais de sondage, jamais de clic à travers.
    const mouse = tool === "select" && !stopped && !opaque;
```
`load` : après le contrôle du base64, `const wantOpaque = p?.opaque === true;` ; l'appel devient
`const b = await d.makeSession(read.doc, read.assets, wantOpaque);` et `install(b, read.assets, wantOpaque);`.
`install` :
```ts
  function install(b: BoardSession, a: AssetStore, o: boolean): void {
    stopped = false;
    opaque = o;
    board = b;
    assets = a;
    b.activate();
    loaded = b.engine.state().version;
    if (opaque) {
      // Un clic à travers laissé par la séance d'avant (mode souris, puis « Figer ») est coupé tout de suite.
      through = null;
      void setThrough(false).catch(() => undefined);
    }
    stopState = b.engine.onState((s) => {
      follow(s.tool);
      publish(s);
    });
    follow(b.engine.state().tool);
    publish(b.engine.state());
  }
```
`collect` : la charge non vide devient
```ts
        : {
            id: r.id,
            base64: toBase64(await d.encode(b.doc, a)),
            changed: b.engine.state().version !== loaded,
            view: { page: b.engine.state().pageIndex, matrix: viewMatrix(b.engine.camera(), viewWidth()) },
          };
```
Dans `annotate-start.ts`, la ligne `makeSession` devient :
```ts
    // C11b (P15) : bureau figé : session opaque (fond de page et pourtour peints) ; sinon transparente (C11a).
    makeSession: (doc, assets, opaque) => createBoardSession(doc, { ...shared, transparent: !opaque }, assets),
```

- [ ] **Étape 5 : vérifier le vert** (commandes de « Test et commande bornée »).

- [ ] **Étape 6 : commit.**
```bash
cd "$WT" && git add apps/web/src/app/annotation-page.ts && git add apps/web/src/app/annotation-page.test.ts && git add apps/web/src/annotate-start.ts
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "feat(annotation): opaque annotate page and returned view" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche T6 — Page envoyée `app/desktop-page.ts` (`capturePage`)
<a id="tache-t6"></a>

**Objectif.** Construire, dans la page et sans octets, le document temporaire d'une page envoyée au tableau (P2, P3,
P10, P11, P13) : `core.blank()`, fond `SetBackdrop` (capture, `fit: "width"`) ou blanc, toute l'encre de la page montrée
du document d'annotation recopiée par `extract` puis `insertFragment(F, page, 0, 0)`, placée par `Transform` (matrice de
vue) ; ni fond ni élément : `null`. Le cœur ne change pas. Testé sur le faux cœur et sur le vrai cœur Wasm.

**Fichiers.**
- Créer : `apps/web/src/app/desktop-page.ts`
- Test : `apps/web/src/app/desktop-page.test.ts` (nouveau)

**Interfaces.**
- Consomme : `CoreFactory.blank()`, `CoreDocument.{pageIds, elementIds, extract, insertFragment, apply, free}`, `type AssetRef`, `type Matrix` (`core/api.ts`, existants) ; `isIdentity(m: Matrix): boolean` (`core/shapes.ts:9`).
- Produit (utilisé par T7, T8) :
  - `export interface PageBackdrop { readonly ref: AssetRef; readonly w: number; readonly h: number }`
  - `export const IDENTITY_MATRIX: Matrix` (`[1, 0, 0, 1, 0, 0]`)
  - `export function capturePage(core: Pick<CoreFactory, "blank">, ink: { readonly doc: CoreDocument; readonly page: string } | null, backdrop: PageBackdrop | null, matrix: Matrix): CoreDocument | null` — document neuf d'une page, à libérer par l'appelant ; `ink.doc` intact.
- Réutilise : `apps/web/src/core/api.ts:381` (`extract`) — `ink.doc.extract(ink.page, ink.doc.elementIds(ink.page)): CoreDocument`.
- Réutilise : `apps/web/src/core/api.ts:383` (`insertFragment`), `:83` (`Transform`) — `T.insertFragment(F, page, 0, 0)` ; `T.apply({ type: "Transform", ids: change.ids, matrix })`.
- Réutilise : `apps/web/src/core/api.ts:121` (`SetBackdrop`), `:31` (`BackdropInput`) — `{ type: "SetBackdrop", page, backdrop: { asset, w, h, fit: "width" } }`.
- Réutilise : aucun module existant ne construit une page avec fond dans l'application (cadrage : seuls `fromPdfPages` du cœur et les lecteurs de fichiers) — nouveau module `app/desktop-page.ts` : `capturePage(core, ink, backdrop, matrix): CoreDocument | null` (3.8 du cadrage).

**Test et commande bornée.**
```bash
export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH
cd "$WT/apps/web" && ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm exec vitest run src/app/desktop-page.test.ts --reporter=verbose 2>&1 | grep -E "✓|×|↓|Tests  " | tail -20
cd "$WT/apps/web" && nice -n 10 pnpm exec tsc --noEmit > /tmp/c11b-T6-tsc.log 2>&1; echo "tsc=$?"; tail -10 /tmp/c11b-T6-tsc.log
```
Preuve attendue : `Tests  11 passed` (1 de présence + 5 × 2 cœurs), aucun `skipped` ni `↓`, lignes contenant
`vrai cœur` ; `tsc=0`. `src/core/wasm-core.contract.test.ts` reste vert (contrat inchangé) : il passe dans la suite web
complète, sous le jeton :
```bash
node ~/.claude/scripts/chaine/jeton.cjs --nom tests --proprietaire usage-c11b-capture/T6 --places-par-sujet 3 --commande "cd $WT/apps/web && ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm exec vitest run > /tmp/c11b-T6-web.log 2>&1"; grep -E "Test Files|Tests  " /tmp/c11b-T6-web.log | tail -2; grep -E "FAIL " /tmp/c11b-T6-web.log | head -5
```

**Preuve visuelle.** Aucune (module sans rendu).

**Contraintes (recopiées de Global Constraints).**
- GC1 — Le chemin de l'encre ne traverse jamais la frontière page ↔ Rust natif ; seule la capture passe par un fichier accordé (U24). Ici : le fragment se fait par `extract` dans la page, sans `.rbitem` ni octets (P2).
- GC4 — Builds et tests en `nice -n 10`. Un test qui échoue sur un délai est rejoué une fois ; aucun délai relevé, aucun test désactivé ou sauté, aucun seuil changé.
- GC5 — Tailles Wasm : module principal 1 374 398 o (plafond 1 572 864), `formats` 2 794 511 o (plafond 3 145 728), aucun plafond ne bouge ; le cœur et `core/api.ts` ne changent pas (P32).
- GC7 — Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, messages en anglais, terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers ajoutés un par un (jamais `git add -A`/`.`/`commit -a`).
- GC8 — `PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` pour cargo et pnpm.
- GC9 — Suites lourdes sous le jeton : `node ~/.claude/scripts/chaine/jeton.cjs --nom tests --proprietaire usage-c11b-capture/T6 --places-par-sujet 3 --commande "<commande, sortie redirigée vers un fichier>"`.

**Interdits.** Ne pas toucher `core/api.ts`, `fake-core.ts`, `wasm-core.ts` ni aucune crate ; pas de `fit: "contain"`
(refusé par le cœur, K6) ; pas de `saveFragment` / `.rbitem` (P2) ; ne pas libérer `ink.doc`.

**Critère « terminé ».** 11 tests verts sans saut (le vrai cœur est présent : `apps/web/src/wasm` copié à l'étape 1) ;
tsc 0 ; suite web sans `FAIL ` ; un commit. Le rapport porte `Réutilisation : appelé apps/web/src/core/api.ts (extract, insertFragment, Transform, SetBackdrop)`
ou `Réutilisation : écart — <pourquoi>`.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree.**
```bash
export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH
SRC=/home/adminjd/projets/roomboard-wt/usage-c11b-capture
cd "$WT" && git status --short | head -5 && pnpm install --frozen-lockfile > /tmp/c11b-T6-install.log 2>&1; tail -2 /tmp/c11b-T6-install.log
for d in wasm wasm-formats; do [ -d "$WT/apps/web/src/$d" ] || cp -r "$SRC/apps/web/src/$d" "$WT/apps/web/src/"; done
ls -l "$WT/apps/web/src/wasm/roomboard_wasm_bg.wasm"
```

- [ ] **Étape 2 : tests rouges** `apps/web/src/app/desktop-page.test.ts` :
```ts
// C11b (P2, P3, P10, P11, P13) : page envoyée au tableau, sur le faux cœur et sur le vrai module Wasm (chargé en Node
// comme `workspace.test.ts`).
import { describe, expect, it } from "vitest";
import type { AssetRef, CoreDocument, CoreFactory, Matrix } from "../core/api";
import { fakeCore } from "../core/fake-core";
import { createWasmCore, type WasmModule } from "../core/wasm-core";
import { capturePage, IDENTITY_MATRIX, type PageBackdrop } from "./desktop-page";

interface NodeFs { existsSync(p: string): boolean; readFileSync(p: string): Uint8Array }
const nodeFs = (await import(/* @vite-ignore */ `node:${"fs"}`)) as NodeFs;
const proc = (globalThis as { process?: { env: Record<string, string | undefined>; cwd(): string } }).process;
const webRoot = proc?.cwd() ?? "."; // vitest tourne depuis `apps/web`
const wasmPath = `${webRoot}/src/wasm/roomboard_wasm_bg.wasm`;
const present = nodeFs.existsSync(wasmPath);
async function loadReal(): Promise<CoreFactory> {
  const mod = (await import(/* @vite-ignore */ `file://${webRoot}/src/wasm/roomboard_wasm.js`)) as WasmModule & { initSync(o: { module: Uint8Array }): unknown };
  mod.initSync({ module: nodeFs.readFileSync(wasmPath) });
  return createWasmCore(mod);
}
const real: CoreFactory | null = present ? await loadReal() : null;

it("C11b : le vrai cœur est présent quand il est exigé", () => {
  if (proc?.env["ROOMBOARD_WASM_REQUIRED"] === "1") expect(present).toBe(true);
});

const REF: AssetRef = { id: "ab".repeat(32), name: "capture-du-bureau.png", mime: "image/png", size: 100 };
const FOND: PageBackdrop = { ref: REF, w: 320, h: 180 };
/** Trait du faux hôte (P30) : de (200, 200) à (600, 200), épaisseur 8. */
function inked(core: CoreFactory): { doc: CoreDocument; page: string } {
  const doc = core.blank();
  const page = doc.pageIds()[0]!;
  const points = new Float32Array([200, 200, 0.5, 400, 200, 0.5, 600, 200, 0.5]);
  doc.apply({ type: "CommitStroke", page, points, style: { color: "#000000", width: 8 } });
  return { doc, page };
}
const only = (d: CoreDocument): string => {
  expect(d.pageIds()).toHaveLength(1);
  return d.pageIds()[0]!;
};
const centre = (d: CoreDocument): [number, number] => {
  const p = only(d);
  const b = d.bounds(d.elementIds(p))!;
  return [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2];
};
const near = (got: [number, number], want: [number, number]): void => {
  expect(Math.abs(got[0] - want[0])).toBeLessThan(3);
  expect(Math.abs(got[1] - want[1])).toBeLessThan(3);
};

const cores: ReadonlyArray<readonly [string, CoreFactory | null]> = [
  ["faux cœur", fakeCore],
  ["vrai cœur", real],
];
for (const [name, core] of cores) {
  describe.skipIf(core === null)(`capturePage (C11b, P2, P3, P11, P13) — ${name}`, () => {
    const c = core!;
    it(`${name} : fond et trait : une page, fond image fit width 320 × 180, trait recopié, source intacte`, () => {
      const ink = inked(c);
      const doc = capturePage(c, ink, FOND, IDENTITY_MATRIX)!;
      const p = only(doc);
      expect(doc.page(p)!.backdrop).toMatchObject({ asset: REF.id, kind: "image", w: 320, h: 180, fit: "width" });
      expect(doc.elementIds(p)).toHaveLength(1);
      expect(doc.element(doc.elementIds(p)[0]!)!.kind).toBe("stroke");
      near(centre(doc), [400, 200]);
      expect(ink.doc.elementIds(ink.page)).toHaveLength(1);
      expect(ink.doc.page(ink.page)!.backdrop).toBeNull();
      doc.free();
      ink.doc.free();
    });
    it(`${name} : matrice de vue : le trait est placé (P13)`, () => {
      const ink = inked(c);
      const m: Matrix = [0.5, 0, 0, 0.5, 10, 20];
      const doc = capturePage(c, ink, FOND, m)!;
      near(centre(doc), [210, 120]);
      doc.free();
      ink.doc.free();
    });
    it(`${name} : sans fond (capture impossible) : page à fond blanc avec le trait (P10)`, () => {
      const ink = inked(c);
      const doc = capturePage(c, ink, null, IDENTITY_MATRIX)!;
      const p = only(doc);
      expect(doc.page(p)!.backdrop).toBeNull();
      expect(doc.elementIds(p)).toHaveLength(1);
      doc.free();
      ink.doc.free();
    });
    it(`${name} : capture sans encre : la page porte le fond seul (P11)`, () => {
      const empty = c.blank();
      const doc = capturePage(c, { doc: empty, page: empty.pageIds()[0]! }, FOND, IDENTITY_MATRIX)!;
      const p = only(doc);
      expect(doc.page(p)!.backdrop).toMatchObject({ asset: REF.id });
      expect(doc.elementIds(p)).toHaveLength(0);
      doc.free();
      empty.free();
      const alone = capturePage(c, null, FOND, IDENTITY_MATRIX)!;
      expect(alone.elementIds(only(alone))).toHaveLength(0);
      alone.free();
    });
    it(`${name} : rien à envoyer : ni fond ni élément → null (P11)`, () => {
      const empty = c.blank();
      expect(capturePage(c, { doc: empty, page: empty.pageIds()[0]! }, null, IDENTITY_MATRIX)).toBeNull();
      expect(capturePage(c, null, null, IDENTITY_MATRIX)).toBeNull();
      empty.free();
    });
  });
}
```

- [ ] **Étape 3 : vérifier le rouge.**
```bash
cd "$WT/apps/web" && nice -n 10 pnpm exec vitest run src/app/desktop-page.test.ts 2>&1 | grep -E "FAIL|Error" | head -3
```
Attendu : `Failed to resolve import "./desktop-page"`.

- [ ] **Étape 4 : implémenter** `apps/web/src/app/desktop-page.ts` :
```ts
/**
 * Page envoyée au tableau (C11b, P2, P3, P10, P11, P13, DA2) : document temporaire d'une page, construit dans la page,
 * sans octets ni frontière : fond (capture du bureau, `fit: "width"`) ou blanc, puis l'encre de la page montrée du
 * document d'annotation recopiée par `extract` / `insertFragment` et placée par la matrice de vue. Le cœur ne change pas.
 */
import type { AssetRef, CoreDocument, CoreFactory, Matrix } from "../core/api";
import { isIdentity } from "../core/shapes";

/** Fond de la page envoyée : asset déjà dans le magasin de l'onglet cible ; taille de l'image en pixels. */
export interface PageBackdrop {
  readonly ref: AssetRef;
  readonly w: number;
  readonly h: number;
}

export const IDENTITY_MATRIX: Matrix = [1, 0, 0, 1, 0, 0];

/** Document temporaire d'une page : fond (ou blanc), encre de `ink.page` recopiée puis transformée par `matrix` ;
 *  null : ni fond ni élément. Le document rendu appartient à l'appelant (free) ; `ink.doc` n'est pas modifié. */
export function capturePage(
  core: Pick<CoreFactory, "blank">,
  ink: { readonly doc: CoreDocument; readonly page: string } | null,
  backdrop: PageBackdrop | null,
  matrix: Matrix,
): CoreDocument | null {
  const ids = ink === null ? [] : ink.doc.elementIds(ink.page);
  if (backdrop === null && ids.length === 0) return null;
  const doc = core.blank();
  try {
    const page = doc.pageIds()[0];
    if (page === undefined) throw new Error("document vierge sans page");
    if (backdrop !== null) {
      doc.apply({ type: "SetBackdrop", page, backdrop: { asset: backdrop.ref, w: backdrop.w, h: backdrop.h, fit: "width" } });
    }
    if (ink !== null && ids.length > 0) {
      const fragment = ink.doc.extract(ink.page, ids);
      try {
        const change = doc.insertFragment(fragment, page, 0, 0);
        if (change.ids.length > 0 && !isIdentity(matrix)) doc.apply({ type: "Transform", ids: change.ids, matrix });
      } finally {
        fragment.free();
      }
    }
    return doc;
  } catch (e) {
    doc.free();
    throw e;
  }
}
```
Si le vrai cœur place le fragment inséré autrement qu'à sa position d'origine avec `(dx, dy) = (0, 0)` (test
« identité » rouge sur le vrai cœur seulement), le dire au rapport et s'arrêter (`bloquée`) : ne pas compenser par une
translation devinée.

- [ ] **Étape 5 : vérifier le vert** (commandes de « Test et commande bornée »).

- [ ] **Étape 6 : commit.**
```bash
cd "$WT" && git add apps/web/src/app/desktop-page.ts && git add apps/web/src/app/desktop-page.test.ts
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "feat(annotation): build the sent page from capture and ink" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Tâche T7 — Contrôleur : figer, envoyer, repli figé, réentrée figée, pointeur en figé
<a id="tache-t7"></a>

**Objectif.** Le contrôleur de la fenêtre principale tient les décisions P5 à P18 : « Figer le bureau » (capture, collecte,
fond posé dans le document d'annotation, document renvoyé `opaque`) et « Bureau vivant » (fond retiré, renvoyé
transparent) ; repli figé à l'entrée sans transparence (« Recapturer le bureau ») ; réentrée figée si la page d'annotation
a un fond ; en figé, jamais `pointer("mouse")` ; « Envoyer » = capture (si vivant) **avant** la sortie, sortie par
`doExit`, puis `sendCapture` et avis ; cible par la règle `sendTarget`. L'ordre d'entrée change (effet de bord du
cadrage) : barre seule, mesure, capture éventuelle, encodage, entrée.

**Fichiers.**
- Modifier : `apps/web/src/platform/annotation-port.ts` (`AnnotationState` l. 104-110, `AnnotationControl` l. 113-128 seulement)
- Modifier : `apps/web/src/app/annotation.ts` (en-tête, imports, `AnnotationDeps`, `createAnnotationController` ; `createRemoteToolbarHost` et `offerCompatRelaunch` inchangés)
- Test : `apps/web/src/app/annotation.test.ts` (`setup` complété ; nouveaux tests en fin de fichier)
- Modifier : `apps/web/src/ui/App.test.tsx` (faux `AnnotationControl` de `fakeAnnotationUi`, l. 263-281 : `freeze`, `send`)

**Interfaces.**
- Consomme (T4) : `captureFailedMessage`, `sentToBoardMessage`, `sendTarget`, `type CapturedImage`, `type CaptureFailure`, `type AnnotationViewport`, `type SendRequest`, `type SendResult`, `type SendTarget`, `AnnotationWindows.capture(place): Promise<CaptureOutcome>`, `AnnotationWindows.load({ document, opaque }): Promise<void>`, `enter({ …, opaque })`, `Returned.view?`.
- Consomme (T6) : `IDENTITY_MATRIX: Matrix`, `type PageBackdrop` (`app/desktop-page.ts`).
- Produit (utilisé par T9 via `HostTargets`, T10 via `main.ts` et `App.tsx`), dans `annotation-port.ts` :
  - `AnnotationState` gagne `readonly frozen?: boolean` (fenêtre opaque, fond capturé), `readonly live?: boolean` (bureau vivant offert ; faux : repli, « Recapturer le bureau »), `readonly sendTarget?: SendTarget` (cible de « Envoyer au tableau ») — facultatifs (absents : faux, vrai, `"origin"`), toujours rendus par le contrôleur.
  - `AnnotationControl` gagne `freeze(): Promise<void>` et `send(to: SendTarget): Promise<void>`.
- Produit, dans `app/annotation.ts` : `AnnotationDeps<T>` gagne, facultatifs (absents : tests C11a, aucun envoi) :
  - `annotationBackdrop?(): PageBackdrop | null`
  - `setAnnotationBackdrop?(image: CapturedImage | null, page?: number): Promise<boolean>`
  - `sendCapture?(o: SendRequest): Promise<SendResult | null>`
  - `startMode?(): StartMode`
  - `originKind?(id: string | null): "board" | "annotation" | null`
  - `readonly transparent?: boolean`
- Réutilise : `apps/web/src/app/annotation.ts:57` (`createAnnotationController`) — étendu : `AnnotationDeps` gagne `sendCapture`, `setAnnotationBackdrop`, `annotationBackdrop`, `startMode()`, `originKind()` ; `AnnotationControl` gagne `freeze()`, `send(to)` ; règle pure `sendTarget` (T4) appelée.

**Patron à ne pas reprendre (concepteur-critique).**
- `apps/web/src/app/annotation.ts:179-188` (`dropOnZone` : `doExit()` d'abord, puis l'action) : pour « Envoyer », la
  capture doit précéder la sortie ; capturer après `doExit` photographierait la fenêtre principale rendue à sa taille,
  pas le bureau annoté (P7, S4 « la capture vient avant la collecte »).
- `apps/web/src/app/annotation.ts:74-78` (`setPointer` écrit `pointer(mode)` sans condition) : en figé, `pointer("mouse")`
  n'est jamais appelé (P15 ; constat `main.rs:322`, deux écrivains du clic à travers : chacun tient la règle).
- `apps/web/src/app/annotation.ts:80-108` (`doEnter` encode avant de passer en barre seule) : le nouvel ordre est barre
  seule, mesure, capture éventuelle, encodage, entrée ; l'encodage suit la pose du fond (sinon `annotate` reçoit un
  document sans la capture du repli).
- Chemin de référence de la file : `apps/web/src/app/annotation.ts:69-73` (`serial`) — toute transition nouvelle
  (`freeze`, `send`) passe par elle (RF1).

**Test et commande bornée.**
```bash
export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH
cd "$WT/apps/web" && nice -n 10 pnpm exec vitest run src/app/annotation.test.ts src/ui/App.test.tsx --reporter=verbose 2>&1 | grep -E "✓|×|Tests  " | tail -45
cd "$WT/apps/web" && nice -n 10 pnpm exec tsc --noEmit > /tmp/c11b-T7-tsc.log 2>&1; echo "tsc=$?"; tail -10 /tmp/c11b-T7-tsc.log
```
Preuve attendue : `Test Files  2 passed`, `Tests  N passed`, N ≥ 1 ; lignes `Envoyer au tableau (vivant) : capture avant la collecte`
et `Review : double clic sur « Envoyer au tableau »` ; les 22 tests C11a de `annotation.test.ts` restent `✓` (effet de
bord : « `doEnter` change d'ordre … Tests : `annotation.test.ts` (cas C11a gardés) ») ; `tsc=0`. Suite web sous le jeton :
```bash
node ~/.claude/scripts/chaine/jeton.cjs --nom tests --proprietaire usage-c11b-capture/T7 --places-par-sujet 3 --commande "cd $WT/apps/web && ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm exec vitest run > /tmp/c11b-T7-web.log 2>&1"; grep -E "Test Files|Tests  " /tmp/c11b-T7-web.log | tail -2; grep -E "FAIL " /tmp/c11b-T7-web.log | head -5
```

**Preuve visuelle.** Aucune (contrôleur sans rendu ; le geste est dans l'essai de T10).

**Contraintes (recopiées de Global Constraints).**
- GC1 — Le chemin de l'encre ne traverse jamais la frontière page ↔ Rust natif ; seule la capture passe par un fichier accordé (U24). Ici : l'encre revient par l'aller-retour C11a (`collect`), jamais par la capture.
- GC4 — Builds et tests en `nice -n 10`. Un test qui échoue sur un délai est rejoué une fois ; aucun délai relevé, aucun test désactivé ou sauté, aucun seuil changé (`EXIT_TIMEOUT_MS` reste 5000).
- GC7 — Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, messages en anglais, terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers ajoutés un par un (jamais `git add -A`/`.`/`commit -a`).
- GC8 — `PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` pour cargo et pnpm.
- GC9 — Suites lourdes sous le jeton : `node ~/.claude/scripts/chaine/jeton.cjs --nom tests --proprietaire usage-c11b-capture/T7 --places-par-sujet 3 --commande "<commande, sortie redirigée vers un fichier>"`.

**Interdits.** Ne toucher dans `annotation-port.ts` que `AnnotationState` et `AnnotationControl` (le reste est à T4) ;
ne pas toucher `workspace.ts` (T8), `main.ts`, `ui/App.tsx` (T10), `toolbar*.ts`, `item-state.ts`, `toolbar-host.ts` (T9) ;
aucune boîte de dialogue posée au retour (HC11b-1) ; aucun envoi sans sortie (P7).

**Critère « terminé ».** Tests C11a et C11b verts, `App.test.tsx` vert ; tsc 0 ; suite web sans `FAIL ` ; un commit. Le
rapport porte `Réutilisation : appelé apps/web/src/app/annotation.ts (createAnnotationController étendu)` ou
`Réutilisation : écart — <pourquoi>`.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree.**
```bash
export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH
SRC=/home/adminjd/projets/roomboard-wt/usage-c11b-capture
cd "$WT" && git status --short | head -5 && pnpm install --frozen-lockfile > /tmp/c11b-T7-install.log 2>&1; tail -2 /tmp/c11b-T7-install.log
for d in wasm wasm-formats; do [ -d "$WT/apps/web/src/$d" ] || cp -r "$SRC/apps/web/src/$d" "$WT/apps/web/src/"; done
grep -n "export function sendTarget\|capture(o: AnnotationPlace)" apps/web/src/platform/annotation-port.ts; grep -n "export function capturePage" apps/web/src/app/desktop-page.ts
```
Attendu : T4 et T6 présentes (sinon `bloquée`).

- [ ] **Étape 2 : tests rouges.** Dans `annotation.test.ts`, compléter les imports :
```ts
import { createFakeAnnotationWindows, type FakeAnnotationOptions } from "../platform/annotation-fake";
import { addedToPageMessage, INK_LOST_MESSAGE, type AnnotationCommand, type CapturedImage, type CaptureOutcome, type SendRequest, type SendResult } from "../platform/annotation-port";
import type { StartMode } from "../toolbar";
```
La fonction `setup` devient (les dépendances C11a sont gardées telles quelles) :
```ts
function setup(
  o: FakeAnnotationOptions & {
    tab?: string | null;
    screens?: number;
    report?: ImportReport;
    backdrop?: boolean;
    startMode?: StartMode;
    originKind?: "board" | "annotation" | null;
    sent?: SendResult | null;
  } = {},
) {
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
    annotationBackdrop: vi.fn(() =>
      o.backdrop === true ? { ref: { id: "ab".repeat(32), name: "capture-du-bureau.png", mime: "image/png", size: 8 }, w: 320, h: 180 } : null,
    ),
    setAnnotationBackdrop: vi.fn(async (img: CapturedImage | null, page?: number) => {
      log.push(`backdrop ${img === null ? "null" : `${img.width}x${img.height}`} ${page ?? "-"}`);
      return true;
    }),
    sendCapture: vi.fn(async (r: SendRequest) => {
      log.push(`send ${r.to} ${r.origin} ${r.image === null ? "blanc" : "image"}`);
      return o.sent === undefined ? { to: r.to, page: 2 } : o.sent;
    }),
    startMode: () => o.startMode ?? "board",
    originKind: (id: string | null) => (o.originKind === undefined ? (id === null ? null : "board") : o.originKind),
    ...(o.transparent === undefined ? {} : { transparent: o.transparent }),
  };
  const ctl = createAnnotationController(deps);
  return { ctl, windows, deps, log, setActive: (id: string) => { active = id; } };
}
```
Ajouter en fin de fichier :
```ts
describe("contrôleur d'annotation (C11b : figer, envoyer)", () => {
  const shot: CaptureOutcome = { ok: true, image: { blob: new Blob([new Uint8Array([1])], { type: "image/png" }), width: 640, height: 360 } };
  const flush = () => new Promise((r) => setTimeout(r, 0));
  it("entrée vivante, document sans fond : document reçu comme en C11a, opaque faux, aucune capture", async () => {
    const { ctl, windows } = setup();
    await ctl.enter();
    expect(windows.opaque()).toBe(false);
    expect(windows.captures()).toBe(0);
    expect(windows.received()).toEqual(new Uint8Array([5, 6, 7]));
    expect(ctl.state()).toMatchObject({ active: true, frozen: false, live: true, sendTarget: "origin" });
  });
  it("Envoyer au tableau (vivant) : capture avant la collecte, sortie, sendCapture vers l'origine, avis « envoyé au tableau : page 2 » (P7, P12)", async () => {
    const view = { page: 0, matrix: [2, 0, 0, 2, 0, 0] as const };
    const { ctl, windows, deps, log } = setup({ capture: shot, view });
    await ctl.enter();
    await ctl.send("origin");
    expect(windows.log.indexOf("capture")).toBeGreaterThan(-1);
    expect(windows.log.indexOf("capture")).toBeLessThan(windows.log.indexOf("collect"));
    expect(deps.sendCapture).toHaveBeenCalledTimes(1);
    expect(deps.sendCapture).toHaveBeenCalledWith({ to: "origin", origin: "t1", image: shot.ok ? shot.image : null, view });
    expect(ctl.state().active).toBe(false);
    expect(log.indexOf("show t1")).toBeLessThan(log.indexOf("send origin t1 image"));
    expect(log.at(-1)).toBe("say envoyé au tableau : page 2");
  });
  it("Envoyer dans un nouvel onglet : cible « new » (P5)", async () => {
    const { ctl, deps } = setup({ capture: shot });
    await ctl.enter();
    await ctl.send("new");
    expect(deps.sendCapture).toHaveBeenCalledWith(expect.objectContaining({ to: "new" }));
  });
  it("profil « Annotation au démarrage » : « Envoyer au tableau » va dans un nouvel onglet ; sendTarget « new » (P6, Q2)", async () => {
    const { ctl, deps } = setup({ capture: shot, startMode: "desktop-annotation" });
    await ctl.enter();
    expect(ctl.state().sendTarget).toBe("new");
    await ctl.send("origin");
    expect(deps.sendCapture).toHaveBeenCalledWith(expect.objectContaining({ to: "new" }));
  });
  it("origine = onglet d'annotation : nouvel onglet (P6)", async () => {
    const { ctl, deps } = setup({ capture: shot, originKind: "annotation" });
    await ctl.enter();
    expect(ctl.state().sendTarget).toBe("new");
    await ctl.send("origin");
    expect(deps.sendCapture).toHaveBeenCalledWith(expect.objectContaining({ to: "new" }));
  });
  it("capture refusée : page blanche (image null), avis de refus puis avis d'envoi (P10)", async () => {
    const { ctl, deps, log } = setup({ capture: { ok: false, reason: "denied" } });
    await ctl.enter();
    await ctl.send("origin");
    expect(deps.sendCapture).toHaveBeenCalledWith(expect.objectContaining({ image: null }));
    const says = log.filter((l) => l.startsWith("say "));
    expect(says).toEqual([
      "say capture du bureau impossible (autorisation “Enregistrement de l'écran” refusée : l'accorder dans Réglages Système › Confidentialité et sécurité, puis relancer RoomBoard) : page à fond blanc",
      "say envoyé au tableau : page 2",
    ]);
  });
  it("rien à envoyer : sendCapture rend null → ni avis de capture ni avis d'envoi (P11)", async () => {
    const { ctl, log } = setup({ capture: { ok: false, reason: "wayland" }, sent: null });
    await ctl.enter();
    await ctl.send("origin");
    expect(log.some((l) => l.startsWith("say capture") || l.startsWith("say envoyé"))).toBe(false);
    expect(ctl.state().active).toBe(false);
  });
  it("Figer le bureau : capture, collecte, fond posé sur la page rendue, document rechargé opaque ; état figé (P14, P16)", async () => {
    const { ctl, windows, log } = setup({ capture: shot, view: { page: 1, matrix: [1, 0, 0, 1, 0, 0] } });
    await ctl.enter();
    await ctl.freeze();
    const w = windows.log;
    expect(w.indexOf("capture")).toBeLessThan(w.indexOf("collect"));
    expect(w.indexOf("collect")).toBeLessThan(w.indexOf("load opaque"));
    expect(log).toContain("backdrop 640x360 1");
    expect(ctl.state()).toMatchObject({ active: true, frozen: true });
    expect(windows.opaque()).toBe(true);
  });
  it("figé : Sélection ne coupe jamais le clic, aucun pointer mouse (P15)", async () => {
    const { ctl, windows } = setup({ capture: shot });
    await ctl.enter();
    await ctl.freeze();
    ctl.command({ kind: "setTool", tool: "select" });
    await flush();
    expect(ctl.state().pointer).toBe("mouse");
    expect(windows.log.filter((l) => l === "pointer mouse")).toHaveLength(0);
  });
  it("Bureau vivant : fond retiré, document rechargé transparent, pointeur rendu ; aucune nouvelle capture (P16)", async () => {
    const { ctl, windows, log } = setup({ capture: shot });
    await ctl.enter();
    await ctl.freeze();
    ctl.command({ kind: "setTool", tool: "select" });
    await flush();
    await ctl.freeze();
    expect(windows.captures()).toBe(1);
    expect(log.some((l) => l.startsWith("backdrop null"))).toBe(true);
    expect(windows.log).toContain("load transparent");
    expect(windows.log.at(-1)).toBe("pointer mouse");
    expect(ctl.state().frozen).toBe(false);
  });
  it("Figer en échec (vivant) : avis, reste vivant, aucune collecte (P16)", async () => {
    const { ctl, windows, log } = setup({ capture: { ok: false, reason: "failed" } });
    await ctl.enter();
    await ctl.freeze();
    expect(windows.log).not.toContain("collect");
    expect(ctl.state().frozen).toBe(false);
    expect(log).toContain("say capture du bureau impossible (échec de la capture) : page à fond blanc");
  });
  it("figé, Envoyer : aucune nouvelle capture, vue identité sur la page rendue, fond de l'annotation (P13)", async () => {
    const { ctl, windows, deps } = setup({ capture: shot, view: { page: 1, matrix: [2, 0, 0, 2, 5, 5] } });
    await ctl.enter();
    await ctl.freeze();
    await ctl.send("origin");
    expect(windows.captures()).toBe(1);
    expect(deps.sendCapture).toHaveBeenCalledWith({ to: "origin", origin: "t1", image: null, view: { page: 1, matrix: [1, 0, 0, 1, 0, 0] } });
  });
  it("réentrée figée quand la page d'annotation a un fond (P17)", async () => {
    const { ctl, windows } = setup({ backdrop: true });
    await ctl.enter();
    expect(windows.opaque()).toBe(true);
    expect(windows.captures()).toBe(0);
    expect(ctl.state().frozen).toBe(true);
  });
  it("repli sans transparence : l'entrée capture, pose le fond, entre opaque ; live faux ; « Recapturer » recapture (P18)", async () => {
    const { ctl, windows, log } = setup({ capture: shot, transparent: false });
    await ctl.enter();
    expect(windows.captures()).toBe(1);
    expect(log).toContain("backdrop 640x360 -");
    expect(windows.opaque()).toBe(true);
    expect(ctl.state()).toMatchObject({ live: false, frozen: true });
    await ctl.freeze();
    expect(windows.captures()).toBe(2);
    expect(windows.log.at(-2)).toBe("load opaque");
    expect(ctl.state().frozen).toBe(true);
  });
  it("repli, capture en échec : entrée figée blanche, avis, aucun fond posé (P18)", async () => {
    const { ctl, windows, log } = setup({ capture: { ok: false, reason: "failed" }, transparent: false });
    await ctl.enter();
    expect(windows.opaque()).toBe(true);
    expect(log.some((l) => l.startsWith("backdrop"))).toBe(false);
    expect(log).toContain("say capture du bureau impossible (échec de la capture) : page à fond blanc");
  });
  it("Review : double clic sur « Envoyer au tableau » : une seule capture, une seule page, aucun rejet (RF1, P3, P7)", async () => {
    const { ctl, windows, deps } = setup({ capture: shot });
    await ctl.enter();
    await expect(Promise.all([ctl.send("origin"), ctl.send("origin")])).resolves.toBeDefined();
    expect(windows.captures()).toBe(1);
    expect(deps.sendCapture).toHaveBeenCalledTimes(1);
  });
});
```
Dans `apps/web/src/ui/App.test.tsx`, l'objet `control: AnnotationControl` de `fakeAnnotationUi` gagne, après
`nextScreen` :
```ts
    freeze: vi.fn(async () => undefined),
    send: vi.fn(async () => undefined),
```

- [ ] **Étape 3 : vérifier le rouge.**
```bash
cd "$WT/apps/web" && nice -n 10 pnpm exec vitest run src/app/annotation.test.ts 2>&1 | grep -E "FAIL|Tests  " | head -6
```
Attendu : échecs (`ctl.send is not a function`, `ctl.freeze is not a function`, …).

- [ ] **Étape 4 : état et contrôle** dans `annotation-port.ts` :
```ts
export interface AnnotationState {
  readonly active: boolean;
  readonly pointer: PointerMode;
  /** Écran retenu (null avant la première entrée). */
  readonly screen: number | null;
  readonly screens: number;
  /** C11b (P14 à P17) : fenêtre opaque, fond capturé ; absent : faux. */
  readonly frozen?: boolean;
  /** C11b (P18) : bureau vivant offert (transparence peinte) ; faux : repli, « Recapturer le bureau » ; absent : vrai. */
  readonly live?: boolean;
  /** C11b (P6) : cible de « Envoyer au tableau » ; "new" grise « Envoyer dans un nouvel onglet » ; absent : "origin". */
  readonly sendTarget?: SendTarget;
}
```
et dans `AnnotationControl`, après `nextScreen(): Promise<void>;` :
```ts
  /** C11b (P16, P18) : « Figer le bureau » / « Bureau vivant » / « Recapturer le bureau ». */
  freeze(): Promise<void>;
  /** C11b (P5, P7) : « Envoyer au tableau » (`origin`) ou « … dans un nouvel onglet » (`new`) : capture, sortie, page. */
  send(to: SendTarget): Promise<void>;
```

- [ ] **Étape 5 : contrôleur.** Remplacer dans `apps/web/src/app/annotation.ts` tout ce qui précède
`export function createRemoteToolbarHost` par :
```ts
/**
 * Contrôleur de l'annotation de bureau (C11a, DA1, DA2, P3 à P9, P15 à P17, P21) dans la fenêtre principale : entrée
 * (document de l'onglet d'annotation envoyé une fois, en base64 par l'hôte), sortie (document demandé, délai de 5 s,
 * remplacement s'il a changé, onglet d'origine montré), bascule dessin / souris liée à l'outil, écran suivant, dépôt
 * sur la zone (sortie d'abord, puis l'import ordinaire). Les transitions passent par une file : jamais deux entrées.
 * C11b (P5 à P18, DA3, DA4) : bureau figé (capture en fond du document d'annotation, fenêtre opaque, jamais de clic à
 * travers), repli figé sans transparence, réentrée figée sur une page à fond, envoi au tableau (capture d'abord, puis
 * sortie, puis page insérée par l'espace de travail). Générique en `T` : aucune dépendance à l'espace de travail ni au DOM.
 */
import type { DroppedFile, Point } from "../platform/files";
import type { ImportReport } from "../platform/import";
import { messageOf } from "../platform/controller";
import {
  addedToPageMessage,
  captureFailedMessage,
  EXIT_TIMEOUT_MS,
  INK_LOST_MESSAGE,
  sendTarget,
  sentToBoardMessage,
  type AnnotationCommand,
  type AnnotationControl,
  type AnnotationPlace,
  type AnnotationState,
  type AnnotationSupport,
  type AnnotationViewport,
  type AnnotationWindows,
  type CapturedImage,
  type CaptureFailure,
  type PointerMode,
  type Returned,
  type SendRequest,
  type SendResult,
  type SendTarget,
} from "../platform/annotation-port";
import { ANNOTATION_MAIN_ACTIONS, type Dock, type Profile, type StartMode } from "../toolbar";
import { IDENTITY_MATRIX, type PageBackdrop } from "./desktop-page";
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
  /** C11b (P17) : fond de la page montrée du document d'annotation ; null : aucun (entrée vivante). */
  annotationBackdrop?(): PageBackdrop | null;
  /** C11b (P14) : pose (image) ou retire (null) le fond de la page `page` (rang ; absent : page montrée) du document
   *  d'annotation. */
  setAnnotationBackdrop?(image: CapturedImage | null, page?: number): Promise<boolean>;
  /** C11b (P3, P6 à P12) : page envoyée ; null : rien inséré (avis déjà dit). Absent (tests C11a) : aucun envoi. */
  sendCapture?(o: SendRequest): Promise<SendResult | null>;
  /** C11b (P6) : mode rendu par `resolveStartMode` pour le profil actif ; absent : "board". */
  startMode?(): StartMode;
  /** C11b (P6) : sorte de l'onglet `id` ; absent : "board" (null pour un id null). */
  originKind?(id: string | null): "board" | "annotation" | null;
  /** C11b (P18) : `annotation_support.transparent` ; absent : vrai. */
  readonly transparent?: boolean;
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
  let st: AnnotationState = {
    active: false,
    pointer: "draw",
    screen: null,
    screens: Math.max(1, d.screens ?? 1),
    frozen: false,
    live: d.transparent ?? true,
    sendTarget: "origin",
  };
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
  const startMode = (): StartMode => d.startMode?.() ?? "board";
  const originKind = (id: string | null): "board" | "annotation" | null =>
    d.originKind ? d.originKind(id) : id === null ? null : "board";
  /** P6 : cible de l'envoi pour l'origine de la séance. */
  const targetOf = (wanted: SendTarget): SendTarget => sendTarget(wanted, startMode(), originKind(origin));
  /** Côté et épaisseur de la barre mesurés maintenant, écran retenu. */
  const placeNow = (): AnnotationPlace => {
    const bar = d.bar();
    return { screen: st.screen, dock: bar.dock, thickness: bar.thickness };
  };
  const setPointer = async (mode: PointerMode): Promise<void> => {
    if (st.pointer === mode) return;
    set({ pointer: mode });
    // C11b (P15) : en figé, la fenêtre opaque ne laisse jamais passer le clic ; Sélection y sélectionne des objets.
    if (st.active && !(st.frozen === true && mode === "mouse")) await d.windows.pointer(mode);
  };

  async function doEnter(): Promise<void> {
    if (st.active) return;
    let tab: T | null;
    try {
      tab = await d.annotationTab();
    } catch (e) {
      await d.say(annotationFailedMessage(messageOf(e)));
      return;
    }
    if (tab === null) return;
    origin = d.activeTabId();
    set({ active: true, pointer: "draw", sendTarget: targetOf("origin") });
    try {
      const place = placeNow(); // mesurée après le passage en barre seule
      // P17 : réentrée figée si la page montrée du document d'annotation a déjà un fond.
      let frozen = (d.annotationBackdrop?.() ?? null) !== null;
      if (st.live === false) {
        // P18 : sans transparence, l'entrée capture d'abord et entre figée (blanche si la capture échoue).
        const shot = await d.windows.capture(place);
        if (shot.ok) await d.setAnnotationBackdrop?.(shot.image);
        else await d.say(captureFailedMessage(shot.reason));
        frozen = true;
      }
      const document = await d.encodeTab(tab);
      const screen = await d.windows.enter({ ...place, document, profile: d.profile(), opaque: frozen });
      set({ screen, frozen });
      d.windows.send({ kind: "setTool", tool: lastDraw });
      await d.windows.pointer("draw");
    } catch (e) {
      set({ active: false, frozen: false });
      try {
        await d.windows.leave();
      } catch {
        // la fenêtre n'a peut-être jamais été montrée
      }
      await d.say(annotationFailedMessage(messageOf(e)));
    }
  }

  /** Sortie C11a ; rend la vue d'`annotate` (P13), null si absente ou sans réponse. */
  async function doExit(): Promise<AnnotationViewport | null> {
    if (!st.active) return null;
    const got = await within(d.windows.collect(), timeout);
    try {
      await d.windows.leave();
    } catch (e) {
      console.warn(`RoomBoard : fenêtre d'annotation non cachée (${messageOf(e)})`);
    }
    set({ active: false, pointer: "draw", frozen: false });
    if (got === null) await d.say(INK_LOST_MESSAGE);
    else if (got.changed) {
      try {
        await d.replaceAnnotation(got.bytes);
      } catch (e) {
        await d.say(annotationFailedMessage(messageOf(e)));
      }
    }
    if (origin !== null) d.showTab(origin);
    origin = null;
    return got?.view ?? null;
  }

  const ctl: AnnotationControl = {
    state: () => st,
    enter: () => serial(doEnter),
    exit: () =>
      serial(async () => {
        if (!st.active) {
          // Sortie demandée par `annotate` alors que la principale n'est plus en annotation : la cacher quand même.
          try {
            await d.windows.leave();
          } catch {
            // fenêtre jamais montrée
          }
          return;
        }
        await doExit();
      }),
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
    freeze: () =>
      serial(async () => {
        if (!st.active) return;
        // P16 : figé → vivant si la transparence est offerte ; sinon capture : vivant → figé, ou « Recapturer » (P18).
        const toLive = st.frozen === true && st.live !== false;
        let image: CapturedImage | null = null;
        if (!toLive) {
          const shot = await d.windows.capture(placeNow());
          if (!shot.ok) {
            await d.say(captureFailedMessage(shot.reason));
            return; // vivant reste vivant ; un figé garde son fond
          }
          image = shot.image;
        }
        // P14 : le fond va dans le document d'annotation, renvoyé par l'aller-retour existant.
        const got = await within(d.windows.collect(), timeout);
        if (got === null) {
          await d.say(INK_LOST_MESSAGE);
          return;
        }
        try {
          if (got.changed) await d.replaceAnnotation(got.bytes);
          await d.setAnnotationBackdrop?.(image, got.view?.page);
          const tab = await d.annotationTab();
          if (tab === null) return;
          await d.windows.load({ document: await d.encodeTab(tab), opaque: !toLive });
          set({ frozen: !toLive });
          await d.windows.pointer(toLive ? st.pointer : "draw");
        } catch (e) {
          await d.say(annotationFailedMessage(messageOf(e)));
        }
      }),
    send: (wanted) =>
      serial(async () => {
        if (!st.active) return;
        const to = targetOf(wanted);
        const frozen = st.frozen === true;
        let image: CapturedImage | null = null;
        let failure: CaptureFailure | null = null;
        if (!frozen) {
          // P7 : la capture vient avant la sortie (l'encre est sur le bureau ; la coque cache nos fenêtres).
          const shot = await d.windows.capture(placeNow());
          if (shot.ok) image = shot.image;
          else failure = shot.reason;
        }
        const from = origin;
        const view = await doExit();
        const request: SendRequest = {
          to,
          origin: from,
          image,
          // P13 : en figé, l'encre et le fond sont déjà dans le même repère.
          view: frozen ? { page: view?.page ?? 0, matrix: IDENTITY_MATRIX } : view,
        };
        const r = d.sendCapture === undefined ? null : await d.sendCapture(request);
        if (r === null) return; // rien inséré : l'avis est déjà dit (rien à envoyer, 12 onglets)
        if (failure !== null) await d.say(captureFailedMessage(failure));
        await d.say(sentToBoardMessage(r.page));
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
```
Si `AnnotationSupport` n'est plus utilisé dans le fichier hors de `offerCompatRelaunch`, l'import reste (il y sert).

- [ ] **Étape 6 : vérifier le vert** (commandes de « Test et commande bornée »). Dans le test « Bureau vivant », la
dernière entrée du journal de la fenêtre est `pointer mouse` (le pointeur suivi en figé est rendu au retour au vivant).

- [ ] **Étape 7 : commit.**
```bash
cd "$WT" && git add apps/web/src/platform/annotation-port.ts && git add apps/web/src/app/annotation.ts && git add apps/web/src/app/annotation.test.ts && git add apps/web/src/ui/App.test.tsx
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "feat(annotation): freeze the desktop and send to the board" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Tâche T8 — Espace de travail : `sendCapture`, `setAnnotationBackdrop`, `annotationBackdrop` ; compatibilité
<a id="tache-t8"></a>

**Objectif.** L'espace de travail reçoit la demande d'envoi (P3, P6, P8 à P11, P14, P17, P25, P31) : il choisit l'onglet
cible (origine montrée ou nouvel onglet « Capture du bureau »), met la capture au magasin d'assets (ou recopie le fond
figé de la page d'annotation), construit la page par `capturePage`, l'insère par `engine.insertPages` (une étape, page
montrée ensuite) ou en fait un nouvel onglet sans historique, et rend le rang de la page. Il pose et retire le fond figé
du document d'annotation. Compatibilité : un fichier d'avant C11b (`socle-v1.roomboard`, document C11a) s'ouvre, et un
document d'annotation sans fond donne une entrée vivante.

**Fichiers.**
- Modifier : `apps/web/src/app/workspace.ts` (imports l. 9-11 ; constantes après `exportPdfName` l. 59-60 ; interface `Workspace` après `replaceAnnotation` l. 210 ; aides avant `const ws` l. 457 ; méthodes après `replaceAnnotation` l. 709)
- Test : `apps/web/src/app/workspace.test.ts` (`SetupOptions` : `realHash` ; `setupWorkspace` : `makeAssets` ; nouveau `describe` en fin de fichier, après la définition de `real`)

**Interfaces.**
- Consomme (T4) : `NOTHING_TO_SEND_MESSAGE`, `type CapturedImage`, `type SendRequest`, `type SendResult`, `type SendTarget` (`platform/annotation-port.ts`).
- Consomme (T6) : `capturePage(core, ink, backdrop, matrix): CoreDocument | null`, `IDENTITY_MATRIX`, `type PageBackdrop` (`app/desktop-page.ts`).
- Consomme (existants) : `typed(blob, mime)` (`app/container-io.ts:74`), `TOO_MANY_TABS`, `MAX_TABS` (`app/tabs.ts`), `addTab` (local), `full()` (local), `APP_VERSION`.
- Produit (utilisé par T10, `main.ts`) :
  - `export const CAPTURE_TAB_NAME = "Capture du bureau"`, `export const CAPTURE_ASSET_NAME = "capture-du-bureau.png"`, `export const CAPTURE_MIME = "image/png"`
  - `Workspace.setAnnotationBackdrop(image: CapturedImage | null, page?: number): Promise<boolean>` — page `page` (rang ; absent : page montrée) de l'onglet d'annotation ; faux sans onglet d'annotation.
  - `Workspace.annotationBackdrop(): PageBackdrop | null` — fond image de la page montrée de l'onglet d'annotation.
  - `Workspace.sendCapture(o: SendRequest): Promise<SendResult | null>` — null : rien inséré, avis dit (`rien à envoyer`, `12 onglets au plus ; fermez-en un`, `Envoi impossible : …`).
- Réutilise : `apps/web/src/engine/engine.ts:597` (`insertPages`) — `tab.board.engine.insertPages(T): Change | null` (une étape, page insérée montrée).
- Réutilise : `apps/web/src/core/asset-store.ts:17-26` — `put(blob)` pour la capture, `get(id)` + `adopt(id, blob)` pour le fond figé recopié.
- Réutilise : `apps/web/src/app/workspace.ts:350` (`addTab`) — `addTab(fresh, { name: "Capture du bureau", target: null }, assets, false, new Map(), { dirty: true })`.
- Réutilise : `apps/web/src/app/workspace.ts:684-709` (`annotationTab`, `replaceAnnotation`) — étendu à côté par `setAnnotationBackdrop`, `annotationBackdrop`, `sendCapture` (3.8 du cadrage).

**Patron à ne pas reprendre (concepteur-critique).**
- `apps/web/src/app/fragments.ts:184-193` (`insertPages` d'un fichier : lire, accepter, adopter, `engine.insertPages`) :
  le patron « adopter puis insérer » est repris, pas l'appel ; la source est un document en mémoire, sans lecture ni
  avis d'acceptation.
- Donner à `addTab` le document temporaire tel quel pour le nouvel onglet : son historique porte `SetBackdrop`,
  l'insertion et `Transform`, et Ctrl+Z y retirerait le fond. Chemin de référence de la copie sans historique :
  `apps/web/src/app/workspace.ts:663-668` (`exportBoard` : `saveParts` puis `core.loadParts`).
- Rang de la page par `engine.state().pageIndex` de l'onglet cible : l'onglet peut ne pas être montré, et la session
  des tests n'a pas `pageIndex`. Le rang se lit par différence des `pageIds()` avant et après l'insertion.

**Test et commande bornée.**
```bash
export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH
cd "$WT/apps/web" && ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm exec vitest run src/app/workspace.test.ts -t "C11b" --reporter=verbose 2>&1 | grep -E "✓|×|↓|Tests  " | tail -20
cd "$WT/apps/web" && ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm exec vitest run src/app/workspace.test.ts 2>&1 | grep -E "Tests  |FAIL" | tail -5
cd "$WT/apps/web" && nice -n 10 pnpm exec tsc --noEmit > /tmp/c11b-T8-tsc.log 2>&1; echo "tsc=$?"; tail -10 /tmp/c11b-T8-tsc.log
```
Preuve attendue : dans le bloc C11b, 12 tests `✓`, aucun `↓` (le vrai cœur est présent) ; lignes `compatibilité : socle-v1.roomboard`
et `Review : 12 onglets et cible nouvel onglet` ; `workspace.test.ts` entier : `Tests  N passed`, N ≥ 166 (154 avant +
12), aucun `FAIL` ; `tsc=0`. Suite web sous le jeton :
```bash
node ~/.claude/scripts/chaine/jeton.cjs --nom tests --proprietaire usage-c11b-capture/T8 --places-par-sujet 3 --commande "cd $WT/apps/web && ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm exec vitest run > /tmp/c11b-T8-web.log 2>&1"; grep -E "Test Files|Tests  " /tmp/c11b-T8-web.log | tail -2; grep -E "FAIL " /tmp/c11b-T8-web.log | head -5
```

**Preuve visuelle.** Aucune ici (le rendu de la page envoyée est mesuré par l'essai de T10).

**Contraintes (recopiées de Global Constraints).**
- GC1 — Le chemin de l'encre ne traverse jamais la frontière page ↔ Rust natif ; seule la capture passe par un fichier accordé (U24). Ici : l'encre vient du document de l'onglet d'annotation (en mémoire), l'image du `Blob` lu par l'hôte.
- GC4 — Builds et tests en `nice -n 10`. Un test qui échoue sur un délai est rejoué une fois ; aucun délai relevé, aucun test désactivé ou sauté, aucun seuil changé.
- GC5 — Le cœur et le format `.roomboard` ne changent pas (P31, P32) : la page envoyée est un `backdrop` image et des éléments, déjà lus et écrits (C2).
- GC7 — Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, messages en anglais, terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers ajoutés un par un (jamais `git add -A`/`.`/`commit -a`).
- GC8 — `PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` pour cargo et pnpm.
- GC9 — Suites lourdes sous le jeton : `node ~/.claude/scripts/chaine/jeton.cjs --nom tests --proprietaire usage-c11b-capture/T8 --places-par-sujet 3 --commande "<commande, sortie redirigée vers un fichier>"`.

**Interdits.** Ne pas toucher `fragments.ts`, `engine.ts`, `tabs.ts`, `container-io.ts`, `core/*` ; ne pas modifier le
contrôleur ni le wiring `wire()` des tests C11a (le contrôleur gagne des dépendances facultatives en T7) ; ne pas vider
ni fermer l'onglet d'annotation après l'envoi (P8).

**Critère « terminé ».** Les 12 tests C11b passent sans saut, les tests C11a et antérieurs de `workspace.test.ts` restent
verts ; tsc 0 ; suite web sans `FAIL ` ; un commit. Le rapport porte les lignes
`Réutilisation : appelé apps/web/src/engine/engine.ts (insertPages)`, `Réutilisation : appelé apps/web/src/core/asset-store.ts (put, get, adopt)`,
`Réutilisation : appelé apps/web/src/app/workspace.ts (addTab)`, `Réutilisation : appelé apps/web/src/app/workspace.ts (annotationTab, replaceAnnotation étendus)`,
ou `Réutilisation : écart — <pourquoi>`.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree.**
```bash
export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH
SRC=/home/adminjd/projets/roomboard-wt/usage-c11b-capture
cd "$WT" && git status --short | head -5 && pnpm install --frozen-lockfile > /tmp/c11b-T8-install.log 2>&1; tail -2 /tmp/c11b-T8-install.log
for d in wasm wasm-formats; do [ -d "$WT/apps/web/src/$d" ] || cp -r "$SRC/apps/web/src/$d" "$WT/apps/web/src/"; done
grep -n "export interface SendRequest" apps/web/src/platform/annotation-port.ts; grep -n "export function capturePage" apps/web/src/app/desktop-page.ts
```

- [ ] **Étape 2 : tests rouges.** Dans `workspace.test.ts` : ajouter `readonly realHash?: boolean;` à `SetupOptions` ;
dans `setupWorkspace`, `makeAssets: () => createAssetStore(fakeHasher),` devient
`makeAssets: () => (o.realHash === true ? createAssetStore() : createAssetStore(fakeHasher)),` ; importer
`type CapturedImage` de `../platform/annotation-port` (à l'import existant) et `missingOf` de `./container-io` (à côté de
`linkedMissingMessage`). Ajouter en fin de fichier :
```ts
describe("C11b : envoi au tableau et fond figé (P3, P6 à P14, P17, P31)", () => {
  const IMG: CapturedImage = { blob: new Blob([new Uint8Array([137, 80, 78, 71, 1, 2, 3])], { type: "image/png" }), width: 320, height: 180 };
  const pages = (t: TabSession): string[] => t.board.doc.pageIds();
  /** Onglet d'origine de deux pages (page 1 montrée) ; onglet d'annotation avec un trait (`drawOn`). */
  async function twoPagesAndInk(o: SetupOptions = {}) {
    const ws = await setupWorkspace(o);
    const origin = ws.active();
    const originId = ws.tabs.active()!.id;
    origin.board.doc.apply({ type: "AddPage", after: pages(origin)[0]! });
    const ann = (await ws.annotationTab())!;
    drawOn(ann);
    return { ws, origin, originId, ann };
  }
  const centre = (t: TabSession, page: string): [number, number] => {
    const b = t.board.doc.bounds(t.board.doc.elementIds(page))!;
    return [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2];
  };

  it("C11b setAnnotationBackdrop : fond image fit width sur la page montrée, asset au magasin ; null le retire (P14, P17)", async () => {
    const ws = await setupWorkspace();
    const ann = (await ws.annotationTab())!;
    expect(ws.annotationBackdrop()).toBeNull();
    expect(await ws.setAnnotationBackdrop(IMG)).toBe(true);
    const b = ann.board.doc.page(pages(ann)[0]!)!.backdrop!;
    expect(b).toMatchObject({ kind: "image", w: 320, h: 180, fit: "width" });
    expect(ann.assets.get(b.asset)).toBeDefined();
    expect(ws.annotationBackdrop()).toMatchObject({ ref: { id: b.asset, name: "capture-du-bureau.png", mime: "image/png" }, w: 320, h: 180 });
    expect(await ws.setAnnotationBackdrop(null)).toBe(true);
    expect(ann.board.doc.page(pages(ann)[0]!)!.backdrop).toBeNull();
    expect(ws.annotationBackdrop()).toBeNull();
  });
  it("C11b setAnnotationBackdrop sans onglet d'annotation : faux", async () => {
    const ws = await setupWorkspace();
    expect(await ws.setAnnotationBackdrop(IMG)).toBe(false);
  });
  it("C11b origine : page insérée après la page montrée, fond et trait, onglet montré, une étape (P3, P4, P12)", async () => {
    const { ws, origin, originId, ann } = await twoPagesAndInk();
    expect(await ws.sendCapture({ to: "origin", origin: originId, image: IMG, view: null })).toEqual({ to: "origin", page: 2 });
    expect(pages(origin)).toHaveLength(3);
    const sent = pages(origin)[1]!;
    const b = origin.board.doc.page(sent)!.backdrop!;
    expect(b).toMatchObject({ kind: "image", w: 320, h: 180, fit: "width" });
    expect(origin.assets.get(b.asset)).toBeDefined();
    expect(origin.board.doc.elementIds(sent)).toHaveLength(1);
    expect(ws.active()).toBe(origin);
    expect(strokes(ann)).toBe(1); // P8 : l'onglet d'annotation garde son encre
    origin.board.doc.undo();
    expect(pages(origin)).toHaveLength(2);
    origin.board.doc.redo();
    expect(pages(origin)).toHaveLength(3);
  });
  it("C11b nouvel onglet : « Capture du bureau », une page, montré, modifié, sans historique ; origine inchangée (P9)", async () => {
    const { ws, origin, ann } = await twoPagesAndInk();
    const before = ws.tabs.list().length;
    expect(await ws.sendCapture({ to: "new", origin: null, image: IMG, view: null })).toEqual({ to: "new", page: 1 });
    expect(ws.tabs.list()).toHaveLength(before + 1);
    const shown = ws.active();
    expect(shown).not.toBe(origin);
    expect(shown.files.name()).toBe("Capture du bureau");
    expect(shown.files.isDirty()).toBe(true);
    const p = pages(shown);
    expect(p).toHaveLength(1);
    expect(shown.board.doc.page(p[0]!)!.backdrop).toMatchObject({ kind: "image", w: 320, h: 180 });
    expect(shown.assets.get(shown.board.doc.page(p[0]!)!.backdrop!.asset)).toBeDefined();
    expect(shown.board.doc.elementIds(p[0]!)).toHaveLength(1);
    expect(shown.board.doc.canUndo()).toBe(false);
    expect(pages(origin)).toHaveLength(2);
    expect(strokes(ann)).toBe(1);
  });
  it("C11b sans capture : page à fond blanc avec le trait (P10)", async () => {
    const { ws, origin, originId } = await twoPagesAndInk();
    expect(await ws.sendCapture({ to: "origin", origin: originId, image: null, view: null })).toEqual({ to: "origin", page: 2 });
    const sent = pages(origin)[1]!;
    expect(origin.board.doc.page(sent)!.backdrop).toBeNull();
    expect(origin.board.doc.elementIds(sent)).toHaveLength(1);
  });
  it("C11b figé : sans nouvelle image, le fond de la page d'annotation part avec la page, asset adopté (P14)", async () => {
    const { ws, origin, originId, ann } = await twoPagesAndInk();
    await ws.setAnnotationBackdrop(IMG);
    const frozen = ann.board.doc.page(pages(ann)[0]!)!.backdrop!.asset;
    expect(origin.assets.get(frozen)).toBeUndefined();
    await ws.sendCapture({ to: "origin", origin: originId, image: null, view: { page: 0, matrix: [1, 0, 0, 1, 0, 0] } });
    const sent = pages(origin)[1]!;
    expect(origin.board.doc.page(sent)!.backdrop).toMatchObject({ asset: frozen, kind: "image" });
    expect(origin.assets.get(frozen)).toBeDefined();
  });
  it("C11b rien à envoyer : ni fond ni élément → null, avis « rien à envoyer », aucune page (P11)", async () => {
    const ws = await setupWorkspace();
    const origin = ws.active();
    const originId = ws.tabs.active()!.id;
    await ws.annotationTab();
    expect(await ws.sendCapture({ to: "origin", origin: originId, image: null, view: null })).toBeNull();
    expect(shell.notify).toHaveBeenCalledWith("rien à envoyer");
    expect(pages(origin)).toHaveLength(1);
  });
  it("C11b vue : la matrice de la vue place le trait (P13)", async () => {
    const { ws, origin, originId, ann } = await twoPagesAndInk();
    const [x, y] = centre(ann, pages(ann)[0]!);
    await ws.sendCapture({ to: "origin", origin: originId, image: IMG, view: { page: 0, matrix: [0.5, 0, 0, 0.5, 0, 0] } });
    const [sx, sy] = centre(origin, pages(origin)[1]!);
    expect(Math.abs(sx - x / 2)).toBeLessThan(2);
    expect(Math.abs(sy - y / 2)).toBeLessThan(2);
  });
  it("C11b Review : onglet d'origine fermé pendant l'annotation → nouvel onglet, rien ne se perd (RF2, P6)", async () => {
    const { ws } = await twoPagesAndInk();
    const before = ws.tabs.list().length;
    expect(await ws.sendCapture({ to: "origin", origin: "onglet-ferme", image: IMG, view: null })).toEqual({ to: "new", page: 1 });
    expect(ws.tabs.list()).toHaveLength(before + 1);
    expect(ws.active().files.name()).toBe("Capture du bureau");
  });
  it("C11b Review : 12 onglets et cible nouvel onglet → avis « 12 onglets au plus ; fermez-en un », null, aucune page ; l'encre reste (RF3, P8, P9)", async () => {
    const { ws, ann } = await twoPagesAndInk();
    while (ws.tabs.list().length < MAX_TABS) await ws.newBlank();
    expect(await ws.sendCapture({ to: "new", origin: null, image: IMG, view: null })).toBeNull();
    expect(shell.notify).toHaveBeenCalledWith(TOO_MANY_TABS);
    expect(ws.tabs.list()).toHaveLength(MAX_TABS);
    expect(strokes(ann)).toBe(1);
  });
  it.skipIf(real === null)("C11b vrai cœur : enregistrer puis rouvrir rend la page envoyée, fond et trait (S1, P31)", async () => {
    const { ws, origin, originId } = await twoPagesAndInk({ core: real!.core, codec: real!.codec, realHash: true });
    expect(await ws.sendCapture({ to: "origin", origin: originId, image: IMG, view: null })).toEqual({ to: "origin", page: 2 });
    origin.board.doc.undo();
    expect(pages(origin)).toHaveLength(2); // une étape (vrai cœur)
    origin.board.doc.redo();
    expect(await origin.files.run("saveAs")).toBe(true);
    expect(await ws.openDocument({ name: "envoi.roomboard", bytes: saved.at(-1)!, target: null })).toBe(true);
    const back = ws.tabs.list().at(-1)!.session;
    const p = pages(back);
    expect(p).toHaveLength(3);
    expect(back.board.doc.page(p[1]!)!.backdrop).toMatchObject({ kind: "image", w: 320, h: 180, fit: "width" });
    expect(back.board.doc.elementIds(p[1]!)).toHaveLength(1);
    expect(missingOf(back.board.doc, back.assets)).toEqual([]);
  });
  it.skipIf(real === null)("C11b compatibilité : socle-v1.roomboard s'ouvre ; un document C11a sans fond rend une entrée vivante (P31)", async () => {
    const ws = await setupWorkspace({ core: real!.core, codec: real!.codec, realHash: true });
    const socle = nodeFs.readFileSync(`${webRoot}/../../crates/roomboard-core/tests/fixtures/socle-v1.roomboard`);
    expect(await ws.openDocument({ name: "socle-v1.roomboard", bytes: new Uint8Array(socle), target: null })).toBe(true);
    const c11a = real!.core.blank();
    c11a.apply({ type: "CommitStroke", page: c11a.pageIds()[0]!, points: new Float32Array([0, 10, 0.5, 50, 10, 0.5]), style: { color: "#000000", width: 4 } });
    const bytes = c11a.save("2026-11-23T00:00:00Z", APP_VERSION);
    c11a.free();
    await ws.annotationTab();
    expect(await ws.replaceAnnotation(bytes)).toBe(true);
    expect(ws.annotationBackdrop()).toBeNull();
    expect(strokes(ws.tabs.list().find((t) => t.kind === "annotation")!.session)).toBe(1);
  });
});
```
Le motif `-t "C11b"` de la commande bornée retient ces 12 tests (chaque nom commence par `C11b`).

- [ ] **Étape 3 : vérifier le rouge.**
```bash
cd "$WT/apps/web" && nice -n 10 pnpm exec vitest run src/app/workspace.test.ts -t "C11b" 2>&1 | grep -E "FAIL|Tests  " | head -5
```
Attendu : échecs (`ws.sendCapture is not a function`, …).

- [ ] **Étape 4 : implémenter** dans `workspace.ts`. Imports :
```ts
import { NOTHING_TO_SEND_MESSAGE, type AnnotationControl, type CapturedImage, type SendRequest, type SendResult, type SendTarget } from "../platform/annotation-port";
```
(à la place de `import type { AnnotationControl } from "../platform/annotation-port";`) et, à côté de l'import de
`./fragments` :
```ts
import { capturePage, IDENTITY_MATRIX, type PageBackdrop } from "./desktop-page";
```
Constantes, après `exportPdfName` :
```ts
/** C11b (P9) : nom du nouvel onglet d'un envoi. */
export const CAPTURE_TAB_NAME = "Capture du bureau";
/** C11b (P25) : asset de la capture (empreinte SHA-256 par le magasin). */
export const CAPTURE_ASSET_NAME = "capture-du-bureau.png";
export const CAPTURE_MIME = "image/png";
```
Interface `Workspace`, après `replaceAnnotation(…)` :
```ts
  /** C11b (P14) : pose (image) ou retire (null) le fond de la page `page` (rang ; absent : page montrée) de l'onglet
   *  d'annotation ; faux sans onglet d'annotation. */
  setAnnotationBackdrop(image: CapturedImage | null, page?: number): Promise<boolean>;
  /** C11b (P17) : fond image de la page montrée de l'onglet d'annotation ; null : aucun. */
  annotationBackdrop(): PageBackdrop | null;
  /** C11b (P3, P6 à P11) : page envoyée (capture ou fond figé, encre de la page de la vue) après la page montrée de
   *  l'origine, en une étape, ou dans un nouvel onglet ; null : rien inséré (avis dit). */
  sendCapture(o: SendRequest): Promise<SendResult | null>;
```
Aides, juste avant `let exporting = false;` :
```ts
  /** C11b : onglet d'annotation, s'il existe. */
  const annotationEntry = () => tabs.list().find((t) => t.kind === "annotation");
  /** C11b (P14, P17) : fond image d'une page (asset cité, taille lue) ; null : aucun, ou fond d'une autre sorte. */
  const imageBackdropOf = (tab: TabSession, page: string): PageBackdrop | null => {
    const b = tab.board.doc.page(page)?.backdrop ?? null;
    if (b === null || b.kind !== "image" || b.w === null || b.h === null) return null;
    const ref = tab.board.doc.asset(b.asset);
    return ref === null ? null : { ref, w: b.w, h: b.h };
  };
  /** C11b (P25) : capture mise au magasin `assets` (empreinte SHA-256). */
  const putCapture = async (assets: AssetStore, image: CapturedImage): Promise<PageBackdrop> => {
    const blob = typed(image.blob, CAPTURE_MIME);
    const id = await assets.put(blob);
    return { ref: { id, name: CAPTURE_ASSET_NAME, mime: CAPTURE_MIME, size: blob.size }, w: image.width, h: image.height };
  };
```
Méthodes, après `replaceAnnotation` dans l'objet `ws` :
```ts
    async setAnnotationBackdrop(image, page) {
      const tab = annotationEntry()?.session;
      if (tab === undefined) return false;
      const id = (page === undefined ? undefined : tab.board.doc.pageIds()[page]) ?? tab.board.engine.state().page;
      const b = image === null ? null : await putCapture(tab.assets, image);
      const backdrop = b === null ? null : { asset: b.ref, w: b.w, h: b.h, fit: "width" };
      return tab.board.engine.run({ type: "SetBackdrop", page: id, backdrop }) !== null;
    },
    annotationBackdrop() {
      const tab = annotationEntry()?.session;
      return tab === undefined ? null : imageBackdropOf(tab, tab.board.engine.state().page);
    },
    async sendCapture(o) {
      const src = annotationEntry()?.session ?? null;
      const srcPages = src?.board.doc.pageIds() ?? [];
      const inkPage = srcPages[o.view?.page ?? 0] ?? srcPages[0] ?? null;
      const origin = o.to === "origin" ? tabs.list().find((t) => t.id === o.origin && t.kind === "board") : undefined;
      const to: SendTarget = origin === undefined ? "new" : "origin"; // P6 : origine fermée → nouvel onglet
      if (to === "new" && full()) {
        await say(TOO_MANY_TABS);
        return null;
      }
      const assets = origin?.session.assets ?? makeAssets();
      let doc: CoreDocument | null;
      try {
        let backdrop: PageBackdrop | null = null;
        if (o.image !== null) backdrop = await putCapture(assets, o.image);
        else if (src !== null && inkPage !== null) {
          // P14 : bureau figé : le fond de la page d'annotation part avec la page.
          const frozen = imageBackdropOf(src, inkPage);
          const blob = frozen === null ? undefined : src.assets.get(frozen.ref.id);
          if (frozen !== null && blob !== undefined) {
            assets.adopt(frozen.ref.id, blob);
            backdrop = frozen;
          }
        }
        const ink = src === null || inkPage === null ? null : { doc: src.board.doc, page: inkPage };
        doc = capturePage(core, ink, backdrop, o.view?.matrix ?? IDENTITY_MATRIX);
      } catch (e) {
        await say(`Envoi impossible : ${messageOf(e)}`);
        return null;
      }
      if (doc === null) {
        await say(NOTHING_TO_SEND_MESSAGE);
        return null;
      }
      if (origin === undefined) {
        // P9 : nouvel onglet ; copie sans historique (Ctrl+Z n'y retire pas le fond).
        let fresh: CoreDocument;
        try {
          const [manifest, ybin] = doc.saveParts(deps.now(), APP_VERSION);
          fresh = core.loadParts(manifest, ybin);
        } finally {
          doc.free();
        }
        const tab = await addTab(fresh, { name: CAPTURE_TAB_NAME, target: null }, assets, false, new Map(), { dirty: true });
        return tab === null ? null : { to, page: 1 };
      }
      const target = origin.session;
      const before = new Set(target.board.doc.pageIds());
      try {
        // P3 : une transaction, une étape ; la page insérée est montrée.
        if (target.board.engine.insertPages(doc) === null) return null;
      } finally {
        doc.free();
      }
      tabs.activate(origin.id);
      return { to, page: target.board.doc.pageIds().findIndex((p) => !before.has(p)) + 1 };
    },
```
`AssetStore`, `CoreDocument`, `messageOf`, `TOO_MANY_TABS`, `APP_VERSION`, `typed`, `core`, `makeAssets`, `full`,
`addTab`, `say` sont déjà importés ou définis dans le fichier ; ajouter à l'import ceux qui manqueraient.

- [ ] **Étape 5 : vérifier le vert** (commandes de « Test et commande bornée »).

- [ ] **Étape 6 : commit.**
```bash
cd "$WT" && git add apps/web/src/app/workspace.ts && git add apps/web/src/app/workspace.test.ts
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "feat(workspace): send capture as a page and frozen backdrop" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Tâche T9 — Barre : trois actions, masquées au tableau, état des boutons, hôte local
<a id="tache-t9"></a>

**Objectif.** Les trois issues de Q2 en actions de barre (P5, P6, P16, P18, P29, DA4) : `annotation-freeze` (« Figer le
bureau » ; enfoncé « Bureau vivant » ; sans transparence « Recapturer le bureau »), `annotation-send` (« Envoyer au
tableau »), `annotation-send-new` (« Envoyer dans un nouvel onglet », grisé quand la cible est déjà un nouvel onglet).
Entrées dans `ACTION_TABLE`, `ACTION_REQUIRES` (`desktopAnnotation`), `ANNOTATION_MAIN_ACTIONS`, les profils livrés
`defaut`, `annotation`, `simple` ; masquées en mode tableau (la barre du tableau ne s'allonge pas) ; en annotation,
`annotation-send` ajoutée au rendu pour un profil d'avant C11b ; hôte local : `freeze`, `send("origin")`, `send("new")`.

**Fichiers.**
- Modifier : `apps/web/src/toolbar.ts` (`ACTION_TABLE` l. 99-130, `ACTION_REQUIRES` l. 634-640, constantes l. 642-649, `itemsForMode` l. 656-670)
- Modifier : `apps/web/src/toolbar-profiles.ts` (`annotationItems` l. 48-54)
- Modifier : `apps/web/src/ui/item-state.ts` (`AnnotationView` l. 7-11, `ACTION_STATE` l. 50-61)
- Modifier : `apps/web/src/app/toolbar-host.ts` (import l. 5, `HostTargets.annotation` l. 32, `ACTIONS` l. 59-64)
- Test : `apps/web/src/toolbar.test.ts`, `apps/web/src/toolbar-profiles.test.ts`, `apps/web/src/ui/item-state.test.ts`, `apps/web/src/app/toolbar-host.test.ts`

**Interfaces.**
- Consomme (T4) : `type SendTarget` (`platform/annotation-port.ts`).
- Produit (utilisé par T10, `App.tsx` et l'essai) :
  - `ACTION_TABLE["annotation-freeze" | "annotation-send" | "annotation-send-new"]` : libellés « Figer le bureau », « Envoyer au tableau », « Envoyer dans un nouvel onglet »
  - `export const ANNOTATION_ONLY_ACTIONS: ReadonlySet<ActionId>` (les trois ; masquées en mode tableau)
  - `ANNOTATION_MAIN_ACTIONS` contient aussi les trois
  - `AnnotationView` gagne `readonly frozen?: boolean`, `readonly live?: boolean`, `readonly sendTarget?: "origin" | "new"`
  - `HostTargets.annotation?: Pick<AnnotationControl, "state" | "enter" | "exit" | "toggle" | "nextScreen"> & { freeze?(): Promise<void>; send?(to: SendTarget): Promise<void> }`
  - éléments de barre aux identifiants `annotation-freeze`, `annotation-send`, `annotation-send-new` (sélecteurs `button[data-item="…"]`)
- Réutilise : `apps/web/src/toolbar.ts:99, :634, :647-649, :661` ; `apps/web/src/toolbar-profiles.ts:49` ; `apps/web/src/ui/item-state.ts:53` ; `apps/web/src/app/toolbar-host.ts:59` — entrées des trois actions dans ces tables ; `itemsForMode` étendu pour les masquer en mode tableau.

**Test et commande bornée.**
```bash
export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH
cd "$WT/apps/web" && nice -n 10 pnpm exec vitest run src/toolbar.test.ts src/toolbar-profiles.test.ts src/ui/item-state.test.ts src/app/toolbar-host.test.ts src/ui/Toolbar.test.tsx --reporter=verbose 2>&1 | grep -E "C11b|×|Test Files|Tests  " | tail -20
cd "$WT/apps/web" && nice -n 10 pnpm exec tsc --noEmit > /tmp/c11b-T9-tsc.log 2>&1; echo "tsc=$?"; tail -10 /tmp/c11b-T9-tsc.log
```
Preuve attendue : `Test Files  5 passed (5)`, `Tests  N passed`, N ≥ 1, lignes `C11b : figer et envoyer (P5, P29)` (bloc),
`annotation-freeze : « Figer le bureau » en vivant` ; aucun `×` ; `Toolbar.test.tsx` (l. 55, 116, 150) vert ; `tsc=0`.
Effet de bord du cadrage : « la barre en annotation gagne trois boutons ; en tableau, rien ne change » (test `tableau :
les trois masquées`). Suite web sous le jeton :
```bash
node ~/.claude/scripts/chaine/jeton.cjs --nom tests --proprietaire usage-c11b-capture/T9 --places-par-sujet 3 --commande "cd $WT/apps/web && ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm exec vitest run > /tmp/c11b-T9-web.log 2>&1"; grep -E "Test Files|Tests  " /tmp/c11b-T9-web.log | tail -2; grep -E "FAIL " /tmp/c11b-T9-web.log | head -5
```

**Preuve visuelle.** Aucune ici : en mode tableau la barre est inchangée (test) ; les boutons en annotation sont lus par
l'essai de T10 (`aria-pressed`, libellés, `disabled`).

**Contraintes (recopiées de Global Constraints).**
- GC4 — Builds et tests en `nice -n 10`. Un test qui échoue sur un délai est rejoué une fois ; aucun délai relevé, aucun test désactivé ou sauté, aucun seuil changé.
- GC6 — La scène ne passe pas sous 640 px ; l'essai Playwright le mesure. Ici : les trois actions sont masquées en mode tableau (P33).
- GC7 — Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, messages en anglais, terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers ajoutés un par un (jamais `git add -A`/`.`/`commit -a`).
- GC8 — `PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` pour cargo et pnpm.
- GC9 — Suites lourdes sous le jeton : `node ~/.claude/scripts/chaine/jeton.cjs --nom tests --proprietaire usage-c11b-capture/T9 --places-par-sujet 3 --commande "<commande, sortie redirigée vers un fichier>"`.

**Interdits.** `PROFILE_MINOR` inchangé (actions en chaînes ouvertes, U13) ; aucun style nouveau dans `ui/rb.css` ; ne pas
toucher `ui/Toolbar.tsx`, `ui/App.tsx` (T10), `annotation-port.ts` (T4, T7) ; un test existant qui fige une liste
d'actions est complété par les trois actions, jamais supprimé.

**Critère « terminé ».** Les quatre fichiers de test et `Toolbar.test.tsx` passent ; tsc 0 ; suite web sans `FAIL ` ; un
commit. Le rapport porte `Réutilisation : appelé apps/web/src/toolbar.ts, toolbar-profiles.ts, ui/item-state.ts, app/toolbar-host.ts (tables étendues)`
ou `Réutilisation : écart — <pourquoi>`.

**Étapes.**

- [ ] **Étape 1 : préparer le worktree.**
```bash
export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH
SRC=/home/adminjd/projets/roomboard-wt/usage-c11b-capture
cd "$WT" && git status --short | head -5 && pnpm install --frozen-lockfile > /tmp/c11b-T9-install.log 2>&1; tail -2 /tmp/c11b-T9-install.log
for d in wasm wasm-formats; do [ -d "$WT/apps/web/src/$d" ] || cp -r "$SRC/apps/web/src/$d" "$WT/apps/web/src/"; done
grep -n "export type SendTarget" apps/web/src/platform/annotation-port.ts
```

- [ ] **Étape 2 : tests rouges.** `toolbar.test.ts` : ajouter `ACTION_REQUIRES, ANNOTATION_MAIN_ACTIONS, ANNOTATION_ONLY_ACTIONS`
à l'import de `./toolbar`, puis en fin de fichier :
```ts
describe("C11b : figer et envoyer (P5, P29)", () => {
  const caps = { desktopAnnotation: true, multiWindow: false, dropPaths: true, officeConverter: false };
  const C11B = ["annotation-freeze", "annotation-send", "annotation-send-new"];
  it("trois actions connues, libellés du cadrage, exigent desktopAnnotation, actions de la fenêtre principale", () => {
    expect(C11B.map((a) => ACTION_TABLE[a]?.label)).toEqual(["Figer le bureau", "Envoyer au tableau", "Envoyer dans un nouvel onglet"]);
    for (const a of C11B) {
      expect(ACTION_REQUIRES[a]).toEqual(["desktopAnnotation"]);
      expect(ANNOTATION_MAIN_ACTIONS.has(a)).toBe(true);
      expect(ANNOTATION_ONLY_ACTIONS.has(a)).toBe(true);
    }
  });
  it("tableau : les trois masquées (la barre du tableau ne s'allonge pas) ; annotation : visibles, une fois chacune", () => {
    const bar = builtinProfile("defaut")!.toolbars[0]!;
    const board = itemsForMode(bar, caps, "board");
    for (const a of C11B) expect(board.some((it) => it.action === a)).toBe(false);
    expect(board.some((it) => it.action === "desktop-annotation")).toBe(true);
    const ann = itemsForMode(bar, caps, "desktop-annotation");
    for (const a of C11B) expect(ann.filter((it) => it.action === a)).toHaveLength(1);
  });
  it("profil d'avant C11b : en annotation, « Envoyer au tableau » ajoutée au rendu, profil inchangé (HC11b-14)", () => {
    const json = structuredClone(DEFAULT_PROFILE_JSON) as { toolbars: { groups: { items: { id: string }[] }[] }[] };
    for (const b of json.toolbars) for (const g of b.groups) g.items = g.items.filter((i) => !C11B.includes(i.id));
    const r = parseProfile({ ...json, id: "avant-c11b", label: "Avant C11b" });
    if ("errors" in r) throw new Error(r.errors.join("; "));
    expect(r.warnings).toEqual([]);
    const bar = r.profile.toolbars[0]!;
    const before = JSON.stringify(bar);
    const ann = itemsForMode(bar, caps, "desktop-annotation");
    expect(ann.filter((it) => it.action === "annotation-send").map((it) => it.label)).toEqual(["Envoyer au tableau"]);
    expect(ann.some((it) => it.action === "annotation-freeze")).toBe(false);
    expect(itemsForMode(bar, caps, "board").some((it) => it.action === "annotation-send")).toBe(false);
    expect(JSON.stringify(bar)).toBe(before);
  });
});
```
`toolbar-profiles.test.ts`, en fin de fichier :
```ts
describe("C11b : profils livrés (P29)", () => {
  it("defaut, annotation et simple portent figer, envoyer et envoyer dans un nouvel onglet, chacun requires desktopAnnotation", () => {
    for (const id of ["defaut", "annotation", "simple"]) {
      const items = builtinProfile(id)!.toolbars.flatMap((b) => b.groups.flatMap((g) => g.items));
      for (const a of ["annotation-freeze", "annotation-send", "annotation-send-new"]) {
        const it = items.find((x) => x.kind === "action" && x.action === a);
        expect(it, `${id} : ${a}`).toBeDefined();
        expect(it!.requires).toEqual(["desktopAnnotation"]);
      }
    }
  });
});
```
`ui/item-state.test.ts`, en fin de fichier :
```ts
describe("annotation (C11b, P6, P16, P18, P29)", () => {
  const base: ToolbarView = { tool: "pen", eraserMode: "partial", canUndo: true, canRedo: true, pageIndex: 0, pageCount: 1 };
  const act = (a: string): ToolItem => ({ id: a, kind: "action", action: a, label: ACTION_TABLE[a]?.label ?? a, requires: [], rest: {} });
  const on = (o: { frozen?: boolean; live?: boolean; sendTarget?: "origin" | "new" } = {}): ToolbarView => ({
    ...base,
    annotation: { active: true, pointer: "draw", screens: 1, ...o },
  });
  it("annotation-freeze : « Figer le bureau » en vivant, « Bureau vivant » enfoncé en figé, « Recapturer le bureau » sans transparence ; grisé hors annotation", () => {
    expect(itemState(act("annotation-freeze"), on())).toMatchObject({ pressed: false, label: "Figer le bureau", disabled: false });
    expect(itemState(act("annotation-freeze"), on({ frozen: true }))).toMatchObject({ pressed: true, label: "Bureau vivant", disabled: false });
    expect(itemState(act("annotation-freeze"), on({ frozen: true, live: false }))).toMatchObject({ pressed: null, label: "Recapturer le bureau", disabled: false });
    expect(itemState(act("annotation-freeze"), base).disabled).toBe(true);
  });
  it("annotation-send actif en annotation ; annotation-send-new grisé quand la cible est déjà un nouvel onglet (P6)", () => {
    expect(itemState(act("annotation-send"), on()).disabled).toBe(false);
    expect(itemState(act("annotation-send-new"), on()).disabled).toBe(false);
    expect(itemState(act("annotation-send-new"), on({ sendTarget: "new" })).disabled).toBe(true);
    expect(itemState(act("annotation-send"), base).disabled).toBe(true);
    expect(itemState(act("annotation-send-new"), base).disabled).toBe(true);
  });
  it("les trois ne sont pas grisées par la règle d'annotation (actions de la fenêtre principale, P20)", () => {
    for (const a of ["annotation-freeze", "annotation-send", "annotation-send-new"]) expect(itemState(act(a), on()).disabled).toBe(false);
  });
});
```
`app/toolbar-host.test.ts` : dans `setupWithAnnotation`, ajouter à l'objet `annotation` :
```ts
    freeze: vi.fn(async () => undefined),
    send: vi.fn(async (_to: "origin" | "new") => undefined),
```
puis ajouter, dans le `describe` qui contient les tests C11a de l'hôte :
```ts
  it("C11b : annotation-freeze → freeze ; annotation-send → send(origin) ; annotation-send-new → send(new) ; sans contrôleur : rien", () => {
    const on = setupWithAnnotation(true);
    on.host.runAction("annotation-freeze");
    on.host.runAction("annotation-send");
    on.host.runAction("annotation-send-new");
    expect(on.t.annotation!.freeze).toHaveBeenCalledTimes(1);
    expect(on.t.annotation!.send).toHaveBeenNthCalledWith(1, "origin");
    expect(on.t.annotation!.send).toHaveBeenNthCalledWith(2, "new");
    const off = setup();
    expect(() => {
      off.host.runAction("annotation-freeze");
      off.host.runAction("annotation-send");
      off.host.runAction("annotation-send-new");
    }).not.toThrow();
  });
```

- [ ] **Étape 3 : vérifier le rouge.**
```bash
cd "$WT/apps/web" && nice -n 10 pnpm exec vitest run src/toolbar.test.ts src/toolbar-profiles.test.ts src/ui/item-state.test.ts src/app/toolbar-host.test.ts 2>&1 | grep -E "FAIL|Tests  " | head -8
```

- [ ] **Étape 4 : implémenter.** `toolbar.ts` — dans `ACTION_TABLE`, après `"annotation-screen"` :
```ts
  "annotation-freeze": { label: "Figer le bureau" },
  "annotation-send": { label: "Envoyer au tableau" },
  "annotation-send-new": { label: "Envoyer dans un nouvel onglet" },
```
dans `ACTION_REQUIRES`, après `"annotation-screen"` :
```ts
  "annotation-freeze": ["desktopAnnotation"],
  "annotation-send": ["desktopAnnotation"],
  "annotation-send-new": ["desktopAnnotation"],
```
remplacer la ligne `export const ANNOTATION_MAIN_ACTIONS …` par :
```ts
/** C11b (P5, P16, P29) : figer le bureau, envoyer au tableau, envoyer dans un nouvel onglet ; masquées en mode tableau. */
const ANNOTATION_FREEZE_ACTION: ActionId = "annotation-freeze";
const ANNOTATION_SEND_ACTION: ActionId = "annotation-send";
const ANNOTATION_SEND_NEW_ACTION: ActionId = "annotation-send-new";
export const ANNOTATION_ONLY_ACTIONS: ReadonlySet<ActionId> = new Set([ANNOTATION_FREEZE_ACTION, ANNOTATION_SEND_ACTION, ANNOTATION_SEND_NEW_ACTION]);
/** C11a (P20) : actions de la fenêtre principale en annotation ; toute autre action y est grisée. C11b : les trois en plus. */
export const ANNOTATION_MAIN_ACTIONS: ReadonlySet<ActionId> = new Set([ANNOTATION_ACTION, ANNOTATION_POINTER_ACTION, ANNOTATION_SCREEN_ACTION, ...ANNOTATION_ONLY_ACTIONS]);
```
et `itemsForMode` devient :
```ts
/**
 * Éléments selon le mode (C11a, P7, P19 ; C11b, P29) : tableau = `visibleItems` sans zone d'annotation ni actions propres
 * à l'annotation (figer, envoyer) ; annotation = `visibleItems`, plus « Annotation du bureau » (sortie), « Souris » et
 * « Envoyer au tableau » en fin s'ils manquent (masqués ou absents d'un profil plus ancien). Ajout au rendu, comme
 * `ensureProfilesAccess` : le profil n'est pas réécrit.
 */
export function itemsForMode(bar: Toolbar, caps: RuntimeCapabilities, mode: StartMode): ToolItem[] {
  const shown = visibleItems(bar, caps);
  if (mode === "board") {
    return shown.filter((it) => !isAnnotationZone(it) && !(it.kind === "action" && ANNOTATION_ONLY_ACTIONS.has(it.action ?? "")));
  }
  const out = [...shown];
  for (const action of [ANNOTATION_ACTION, ANNOTATION_POINTER_ACTION, ANNOTATION_SEND_ACTION]) {
    if (out.some((it) => it.kind === "action" && it.action === action)) continue;
    out.push({ id: `${action}-ajout`, kind: "action", action, label: ACTION_TABLE[action]!.label, requires: [], rest: {} });
  }
  return out;
}
```
`toolbar-profiles.ts` — `annotationItems` devient :
```ts
const annotationItems = () => [
  needs(action("desktop-annotation", "Annotation du bureau")),
  needs(action("annotation-pointer", "Souris")),
  needs(action("annotation-screen", "Écran suivant")),
  // C11b (P29) : figer le bureau, envoyer au tableau, envoyer dans un nouvel onglet.
  needs(action("annotation-freeze", "Figer le bureau")),
  needs(action("annotation-send", "Envoyer au tableau")),
  needs(action("annotation-send-new", "Envoyer dans un nouvel onglet")),
];
```
`ui/item-state.ts` — `AnnotationView` devient :
```ts
/** C11a : état de l'annotation vu par la barre de la fenêtre principale. C11b : figé, vivant offert, cible d'envoi. */
export interface AnnotationView {
  readonly active: boolean;
  readonly pointer: "draw" | "mouse";
  readonly screens: number;
  /** C11b (P16) : bureau figé ; absent : faux. */
  readonly frozen?: boolean;
  /** C11b (P18) : bureau vivant offert ; faux : « Recapturer le bureau » ; absent : vrai. */
  readonly live?: boolean;
  /** C11b (P6) : cible de « Envoyer au tableau » ; "new" grise « Envoyer dans un nouvel onglet ». */
  readonly sendTarget?: "origin" | "new";
}
```
et, dans `ACTION_STATE`, après `"annotation-screen"` :
```ts
  "annotation-freeze": (v) => {
    const a = v.annotation;
    const disabled = a?.active !== true;
    if (a?.live === false) return { pressed: null, label: "Recapturer le bureau", disabled };
    const frozen = a?.frozen === true;
    return { pressed: frozen, label: frozen ? "Bureau vivant" : "Figer le bureau", disabled };
  },
  "annotation-send": (v) => ({ disabled: v.annotation?.active !== true }),
  "annotation-send-new": (v) => ({ disabled: v.annotation?.active !== true || v.annotation.sendTarget === "new" }),
```
`app/toolbar-host.ts` — import : `import type { AnnotationControl, SendTarget } from "../platform/annotation-port";` ;
`HostTargets.annotation` devient :
```ts
  /** C11a (P6, P8, P15, P22) : contrôleur d'annotation ; absent (web sans faux hôte, tests) : sans effet (PC9).
   *  C11b (P5, P16) : `freeze` et `send`, facultatifs ici (un contrôleur d'avant C11b n'en a pas). */
  annotation?: Pick<AnnotationControl, "state" | "enter" | "exit" | "toggle" | "nextScreen"> & {
    freeze?(): Promise<void>;
    send?(to: SendTarget): Promise<void>;
  };
```
et, dans `ACTIONS`, après `"annotation-screen"` :
```ts
  "annotation-freeze": (t) => settle(t.annotation?.freeze?.()),
  "annotation-send": (t) => settle(t.annotation?.send?.("origin")),
  "annotation-send-new": (t) => settle(t.annotation?.send?.("new")),
```

- [ ] **Étape 5 : vérifier le vert** (commandes de « Test et commande bornée »).

- [ ] **Étape 6 : commit.**
```bash
cd "$WT/apps/web/src" && git add toolbar.ts && git add toolbar.test.ts && git add toolbar-profiles.ts && git add toolbar-profiles.test.ts && git add ui/item-state.ts && git add ui/item-state.test.ts && git add app/toolbar-host.ts && git add app/toolbar-host.test.ts
cd "$WT" && git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "feat(toolbar): freeze and send actions in annotation mode" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Tâche T10 — Branchement `main.ts` et `App.tsx`, essai Playwright `c11b-capture-navigateur.mjs`
<a id="tache-t10"></a>

**Objectif.** Brancher C11b dans l'application et le prouver au navigateur (S1, S2, S3, P29, P30, P33, P34) : le
contrôleur reçoit ses nouvelles dépendances (`annotationBackdrop`, `setAnnotationBackdrop`, `sendCapture`, `startMode`,
`originKind`, `transparent`) ; le faux hôte `?annotation=faux` lit `&capture=refus|wayland`, `&transparence=non`,
`&encre=1` et capture par défaut un PNG 320 × 180 uni `#3366cc` peint par un `canvas` ; la vue de barre porte `frozen`,
`live`, `sendTarget`. Le geste Playwright : « Envoyer au tableau » ajoute une page après la page montrée, avec le fond
capturé et l'encre sélectionnable comme objets ; sans capture, fond blanc et avis ; enregistrer puis rouvrir ; hauteur de
scène mesurée ; branché dans `scripts/verifier.sh --e2e`.

**Fichiers.**
- Modifier : `apps/web/src/main.ts` (imports l. 9-12, 21 ; deux fonctions avant `start` l. 66 ; faux hôte l. 186-188 ; dépendances du contrôleur l. 417-430)
- Modifier : `apps/web/src/ui/App.tsx` (vue de barre l. 344)
- Créer : `scripts/essais/c11b-capture-navigateur.mjs`
- Modifier : `scripts/verifier.sh` (bloc `--e2e`, après la ligne `echo "C11a annotation : OK"`), `scripts/tests/verifier-e2e.test.sh` (après la ligne C11a)

**Interfaces.**
- Consomme (T4) : `FakeAnnotationOptions { capture?, transparent?, draw?, dataset }`, `type CapturedImage`, `type CaptureOutcome`, `AnnotationSupport.transparent?`.
- Consomme (T7) : `AnnotationDeps` facultatifs `annotationBackdrop`, `setAnnotationBackdrop`, `sendCapture`, `startMode`, `originKind`, `transparent` ; `AnnotationState.frozen?`, `live?`, `sendTarget?`.
- Consomme (T8) : `workspace.setAnnotationBackdrop(image, page?)`, `workspace.annotationBackdrop()`, `workspace.sendCapture(o)`.
- Consomme (T9) : boutons `button[data-item="annotation-freeze" | "annotation-send" | "annotation-send-new"]` ; `AnnotationView.frozen?`, `live?`, `sendTarget?`.
- Consomme (T5, T3) : rien d'appelé ici directement (la page `annotate` et la coque ne tournent pas au navigateur) ; dépendances pour que `verifier.sh` couvre toute la branche.
- Produit : `dataset` de `document.body` lu par l'essai : `annotation`, `pointeur`, `annotationOpaque`, `annotationCaptures`, `annotationEntrees`, `annotationRecu`, `annotationRendu` ; sortie de l'essai `C11b : OK`.
- Réutilise : `apps/web/src/toolbar.ts:676` (`resolveStartMode`) — `resolveStartMode(active.profile(), active.capabilities()).mode` passé au contrôleur comme `startMode()`.
- Réutilise : `scripts/essais/commun.mjs` (`stageBox`, `item`, `TAB`, `frames`, `inkIn`, `stageMouse`, `serve`, `loadPlaywright`, `VIEWPORT`) et le patron `scripts/essais/c11a-annotation-navigateur.mjs` — inchangés.

**Test et commande bornée.**
```bash
export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH
cd "$WT/apps/web" && nice -n 10 pnpm exec tsc --noEmit > /tmp/c11b-T10-tsc.log 2>&1; echo "tsc=$?"; tail -10 /tmp/c11b-T10-tsc.log
cd "$WT" && nice -n 10 pnpm --filter @roomboard/web build > /tmp/c11b-T10-build.log 2>&1; echo "build=$?"; tail -3 /tmp/c11b-T10-build.log
cd "$WT" && nice -n 10 node scripts/essais/c11b-capture-navigateur.mjs --captures > /tmp/c11b-T10-e2e.log 2>&1; echo "e2e=$?"; grep -c "^ok —" /tmp/c11b-T10-e2e.log; tail -4 /tmp/c11b-T10-e2e.log
```
Preuve attendue : `tsc=0`, `build=0` ; `e2e=0`, au moins 40 lignes `ok —`, dernière ligne `C11b : OK`, lignes
`ok — S1 : avis « envoyé au tableau : page 2 »`, `ok — S2 refus : page à fond blanc`, `ok — S3 : réentrée figée`.
Essais à garder verts (scène ≥ 640 px, barre en annotation allongée de trois boutons, P33) :
```bash
cd "$WT" && for s in c11a-annotation c1-profils c10a-tableau c4-bibliotheque c15-3d; do nice -n 10 node scripts/essais/$s-navigateur.mjs > /tmp/c11b-T10-$s.log 2>&1; echo "$s=$? $(tail -1 /tmp/c11b-T10-$s.log)"; done
cd "$WT" && bash scripts/tests/verifier-e2e.test.sh 2>&1 | tail -2
```
Attendu : cinq codes `=0` suivis de `… : OK` ; `verifier-e2e.test.sh : OK`. Puis la suite complète, sous le jeton :
```bash
node ~/.claude/scripts/chaine/jeton.cjs --nom tests --proprietaire usage-c11b-capture/T10 --places-par-sujet 3 --duree-max-minutes 60 --commande "cd $WT && nice -n 10 scripts/verifier.sh --e2e > /tmp/c11b-T10-verifier.log 2>&1"; echo "code=$?"; grep -E "^module Wasm|^module formats|C11b capture : OK|verifier.sh : e2e OK|verifier.sh : OK" /tmp/c11b-T10-verifier.log; grep -E "test result: FAILED|error\[|FAIL |ÉCHEC" /tmp/c11b-T10-verifier.log | head -5
```
Attendu : `code=0` ; `module Wasm : 1374398 octets`, `module formats : 2794511 octets` (à l'octet, GC5) ;
`C11b capture : OK`, `verifier.sh : e2e OK`, `verifier.sh : OK` ; aucune ligne d'échec. Un essai qui échoue sur un délai
est rejoué une fois (GC4), jamais modifié pour passer.

**Preuve visuelle.** Lectures d'abord (elles prouvent plus que l'image) : l'essai lit `#stage[data-page]` (`2/3`),
`#stage[data-selection]` (`1`), `#stage[data-elements]`, `document.body.dataset.annotationOpaque` (`1` / `0`),
`annotationCaptures`, `aria-pressed` et le libellé de `annotation-freeze`, `disabled` de `annotation-send-new`, et la
couleur au centre de la scène (`#3366cc` ± 8 ou blanc). Puis la capture `/tmp/c11b-capture.png` (prise après l'envoi de
S1, `--captures`) : la décrire au rapport en une phrase (page 2 de 3 à fond bleu uni, trait noir horizontal en haut à
gauche, barre du tableau sans les trois boutons C11b). Capture non commitée.

**Contraintes (recopiées de Global Constraints).**
- GC1 — Le chemin de l'encre ne traverse jamais la frontière page ↔ Rust natif ; seule la capture passe par un fichier accordé (U24). Ici : le faux hôte fournit l'image par un `Blob` en mémoire ; l'encre `&encre=1` est tracée dans le document, dans la page.
- GC4 — Builds et tests en `nice -n 10`. Un test qui échoue sur un délai est rejoué une fois ; aucun délai relevé, aucun test désactivé ou sauté, aucun seuil changé.
- GC5 — Tailles Wasm : module principal 1 374 398 o (plafond 1 572 864), `formats` 2 794 511 o (plafond 3 145 728), aucun plafond ne bouge.
- GC6 — La scène ne passe pas sous 640 px ; l'essai Playwright le mesure.
- GC7 — Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, messages en anglais, terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers ajoutés un par un (jamais `git add -A`/`.`/`commit -a`).
- GC8 — `PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` pour cargo et pnpm.
- GC9 — Suites lourdes sous le jeton : `node ~/.claude/scripts/chaine/jeton.cjs --nom tests --proprietaire usage-c11b-capture/T10 --places-par-sujet 3 --commande "<commande, sortie redirigée vers un fichier>"`.

**Interdits.** Le faux hôte n'est honoré que hors coque (`!tauri`, comme C11a) ; aucune option de capture passée à
l'essai par `verifier.sh` ; aucun plafond de taille changé dans `verifier.sh` ; ne pas modifier `commun.mjs` ni les
autres essais ; ne pas toucher `workspace.ts`, `annotation.ts`, `toolbar*.ts` (tâches précédentes) : un écart découvert
dans leur comportement est rapporté (`bloquée`), pas corrigé ici.

**Critère « terminé ».** tsc 0 ; build web ; `C11b : OK` ; c11a, c1, c10a, c4, c15 `OK` ; `verifier-e2e.test.sh : OK` ;
`verifier.sh --e2e` vert avec les deux tailles à l'octet ; capture décrite ; un commit. Le rapport porte
`Réutilisation : appelé apps/web/src/toolbar.ts (resolveStartMode)` et `Réutilisation : appelé scripts/essais/commun.mjs`
(ou `Réutilisation : écart — <pourquoi>`).

**Étapes.**

- [ ] **Étape 1 : préparer le worktree.**
```bash
export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH; unset CARGO_TARGET_DIR
SRC=/home/adminjd/projets/roomboard-wt/usage-c11b-capture
cd "$WT" && git status --short | head -5 && pnpm install --frozen-lockfile > /tmp/c11b-T10-install.log 2>&1; tail -2 /tmp/c11b-T10-install.log
for d in wasm wasm-formats; do [ -d "$WT/apps/web/src/$d" ] || cp -r "$SRC/apps/web/src/$d" "$WT/apps/web/src/"; done
grep -c "sendCapture\|annotation-send-new\|viewMatrix" apps/web/src/app/workspace.ts apps/web/src/toolbar.ts apps/web/src/app/annotation-page.ts
```
Attendu : chaque compte ≥ 1 (T5, T8, T9 fusionnées ; sinon `bloquée`).

- [ ] **Étape 2 : écrire l'essai (rouge)** `scripts/essais/c11b-capture-navigateur.mjs` :
```js
#!/usr/bin/env node
// Essai C11b au navigateur (capture du bureau et envoi au tableau, faux hôte `?annotation=faux`) : S1 (bureau vivant,
// `&encre=1` : « Envoyer au tableau » insère la page 2 de 3 après la page montrée, fond capturé #3366cc, trait
// sélectionnable, Ctrl+Z / Ctrl+Y, enregistrer puis rouvrir), S2 (`&capture=refus`, `&capture=wayland` : fond blanc et
// avis ; sans encre : « rien à envoyer »), S3 (« Figer le bureau » : fenêtre opaque, pas de clic à travers, « Envoyer
// dans un nouvel onglet », réentrée figée, « Bureau vivant » ; `&transparence=non` : repli figé, « Recapturer le
// bureau » ; profil « Annotation au démarrage » : nouvel onglet, « Envoyer dans un nouvel onglet » grisé). Scène ≥ 640 px
// après chaque retour. Chromium headless de Playwright, `?fichiers=repli`. Code de sortie : 0 réussi, 1 échec, 2 outil
// absent. Hors de verifier.sh sans --e2e.
// Usage : node scripts/essais/c11b-capture-navigateur.mjs [--captures]   (/tmp/c11b-capture.png, non commitée)
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DIST, Echec, TAB, VIEWPORT, frames, gitSha, inkIn, item, loadPlaywright, serve, stageBox, stageMouse } from "./commun.mjs";

const LABEL = "C11b";
const LAYOUT = ".rb-layout";
const BLUE = [0x33, 0x66, 0xcc];
const WHITE = [255, 255, 255];
const DENIED =
  "capture du bureau impossible (autorisation “Enregistrement de l'écran” refusée : l'accorder dans Réglages Système › Confidentialité et sécurité, puis relancer RoomBoard) : page à fond blanc";
const WAYLAND = "capture du bureau impossible (Wayland) : page à fond blanc";
/** Milieu du trait du faux hôte (P30) : de (200, 200) à (600, 200) ; le faux hôte ne rend pas de vue : identité. */
const INK_MID = [400, 200];

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
const stageAttr = (page, name) => page.getAttribute("#stage", name);
/** Attend que l'attribut `name` de #stage vérifie l'expression régulière `source`. */
async function waitStage(page, name, source) {
  await page.waitForFunction(
    ([n, src]) => new RegExp(src).test(document.querySelector("#stage")?.getAttribute(n) ?? ""),
    [name, source],
    { timeout: 15000 },
  );
  await frames(page);
}
async function camera(page) {
  const [zoom, tx, ty] = ((await stageAttr(page, "data-camera")) ?? "").split(",").map(Number);
  return { zoom, tx, ty };
}
/** Fond au centre de la scène : un carré de 9 × 9 px de la couleur `rgb` (± 8), une fois le bitmap décodé. */
async function centerIs(page, rgb) {
  for (let i = 0; i < 40; i++) {
    const b = await stageBox(page);
    const [cx, cy] = [Math.round(b.width / 2), Math.round(b.height / 2)];
    if ((await inkIn(page, [cx - 4, cy - 4, cx + 5, cy + 5], { rgb, tol: 8 })) >= 72) return true;
    await page.waitForTimeout(100);
    await frames(page);
  }
  return false;
}
/** Sélection, puis clic au milieu du trait : un objet sélectionné. */
async function selectInk(page) {
  await page.click(item("select"));
  const cam = await camera(page);
  await stageMouse(page).click(INK_MID[0] * cam.zoom + cam.tx, INK_MID[1] * cam.zoom + cam.ty);
  await waitStage(page, "data-selection", "^1$");
}
async function enterAnnotation(page) {
  await page.click(item("desktop-annotation"));
  await waitMode(page, "annotation");
  await waitBody(page, "annotation", "1");
}
const shownTab = (page) => page.locator(`${TAB}[aria-selected="true"]`);
async function waitTabs(page, n) {
  await page.waitForFunction(([sel, k]) => document.querySelectorAll(sel).length === k, [TAB, n], { timeout: 15000 });
  await frames(page);
}
const noErrors = (w, label) => check(w.errors.length === 0, `${label} : aucune erreur dans la page${w.errors.length ? ` : ${w.errors.join(" | ")}` : ""}`);

async function s1(page, base, tmp, captures) {
  const w = watch(page);
  await page.goto(`${base}/?fichiers=repli&annotation=faux&encre=1`);
  await ready(page);
  await page.click(item("page-add"));
  await waitStage(page, "data-page", "^2/2$");
  await page.click(item("page-prev"));
  await waitStage(page, "data-page", "^1/2$");
  const origin = await shownTab(page).getAttribute("data-tab");
  check((await page.locator(item("annotation-send")).count()) === 0, "S1 tableau : « Envoyer au tableau » masqué (barre du tableau inchangée)");
  await enterAnnotation(page);
  check((await body(page, "annotationOpaque")) === "0", "S1 : entrée en bureau vivant (annotationOpaque=0)");
  check((await text(page, item("annotation-freeze"))) === "Figer le bureau", "S1 : bouton « Figer le bureau »");
  const d0 = w.dialogs.length;
  await page.click(item("annotation-send"));
  await waitMode(page, "board");
  const avis = await waitDialog(w.dialogs, d0);
  check(avis.message === "envoyé au tableau : page 2", `S1 : avis « ${avis.message} »`);
  check((await body(page, "annotationCaptures")) === "1", "S1 : une capture demandée au faux hôte");
  check((await shownTab(page).getAttribute("data-tab")) === origin, "S1 : onglet d'origine montré");
  await waitStage(page, "data-page", "^2/3$");
  check((await stageAttr(page, "data-page")) === "2/3", "S1 : page 2 de 3 (insérée après la page montrée, montrée)");
  check(await centerIs(page, BLUE), "S1 : fond capturé #3366cc au centre de la scène");
  const box = await stageBox(page);
  check(box.height >= 640, `S1 : scène ${box.height} px ≥ 640 après le retour`);
  if (captures) {
    await page.screenshot({ path: "/tmp/c11b-capture.png" });
    console.log("capture : /tmp/c11b-capture.png");
  }
  await selectInk(page);
  check((await stageAttr(page, "data-selection")) === "1", "S1 : le trait est sélectionnable comme objet (data-selection=1)");
  await page.keyboard.press("Escape");
  await page.keyboard.press("Control+z");
  await waitStage(page, "data-page", "/2$");
  check(/\/2$/.test(await stageAttr(page, "data-page")), "S1 : Ctrl+Z retire la page envoyée en une étape (2 pages)");
  await page.keyboard.press("Control+y");
  await waitStage(page, "data-page", "/3$");
  check(/\/3$/.test(await stageAttr(page, "data-page")), "S1 : Ctrl+Y la remet (3 pages)");
  const dl = page.waitForEvent("download");
  await page.keyboard.press("Control+s");
  const file = join(tmp, "c11b-envoi.roomboard");
  await (await dl).saveAs(file);
  const before = await page.locator(TAB).count();
  const chooser = page.waitForEvent("filechooser");
  await page.keyboard.press("Control+o");
  await (await chooser).setFiles(file);
  await waitTabs(page, before + 1);
  await waitStage(page, "data-page", "^1/3$");
  await page.click(item("page-next"));
  await waitStage(page, "data-page", "^2/3$");
  check(Number(await stageAttr(page, "data-elements")) >= 1, "S1 rouvert : le trait est sur la page 2");
  check(await centerIs(page, BLUE), "S1 rouvert : le fond capturé est sur la page 2");
  noErrors(w, "S1");
}

async function s2(browser, base) {
  for (const [param, message, label] of [
    ["refus", DENIED, "refus"],
    ["wayland", WAYLAND, "Wayland"],
  ]) {
    const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const w = watch(page);
    await page.goto(`${base}/?fichiers=repli&annotation=faux&encre=1&capture=${param}`);
    await ready(page);
    await enterAnnotation(page);
    const d0 = w.dialogs.length;
    await page.click(item("annotation-send"));
    await waitMode(page, "board");
    const a = await waitDialog(w.dialogs, d0);
    check(a.message === message, `S2 ${label} : avis « ${a.message} »`);
    const b = await waitDialog(w.dialogs, d0 + 1);
    check(b.message === "envoyé au tableau : page 2", `S2 ${label} : puis « ${b.message} »`);
    await waitStage(page, "data-page", "^2/2$");
    check(await centerIs(page, WHITE), `S2 ${label} : page à fond blanc`);
    check(Number(await stageAttr(page, "data-elements")) === 1, `S2 ${label} : le trait est inséré`);
    await selectInk(page);
    check((await stageAttr(page, "data-selection")) === "1", `S2 ${label} : trait sélectionnable`);
    const box = await stageBox(page);
    check(box.height >= 640, `S2 ${label} : scène ${box.height} px ≥ 640`);
    noErrors(w, `S2 ${label}`);
    await ctx.close();
  }
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const w = watch(page);
  await page.goto(`${base}/?fichiers=repli&annotation=faux&capture=refus`);
  await ready(page);
  await enterAnnotation(page);
  const d0 = w.dialogs.length;
  await page.click(item("annotation-send"));
  await waitMode(page, "board");
  const a = await waitDialog(w.dialogs, d0);
  check(a.message === "rien à envoyer", `S2 sans encre ni capture : avis « ${a.message} »`);
  await page.waitForTimeout(300);
  check(w.dialogs.length === d0 + 1, "S2 sans encre ni capture : un seul avis");
  check((await stageAttr(page, "data-page")) === "1/1", "S2 sans encre ni capture : nombre de pages inchangé");
  noErrors(w, "S2 rien à envoyer");
  await ctx.close();
}

async function s3(browser, base) {
  let ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  let page = await ctx.newPage();
  let w = watch(page);
  await page.goto(`${base}/?fichiers=repli&annotation=faux&encre=1`);
  await ready(page);
  const origin = await shownTab(page).getAttribute("data-tab");
  const tabs0 = await page.locator(TAB).count();
  await enterAnnotation(page);
  await page.click(item("annotation-freeze"));
  await waitBody(page, "annotationOpaque", "1");
  check(
    (await page.getAttribute(item("annotation-freeze"), "aria-pressed")) === "true" && (await text(page, item("annotation-freeze"))) === "Bureau vivant",
    "S3 : « Figer le bureau » → fenêtre opaque (annotationOpaque=1), bouton enfoncé « Bureau vivant »",
  );
  await page.click(item("select"));
  await page.waitForTimeout(300);
  check((await body(page, "pointeur")) === "draw", "S3 : Sélection en figé : data-pointeur reste draw (pas de clic à travers)");
  let d0 = w.dialogs.length;
  await page.click(item("annotation-send-new"));
  await waitMode(page, "board");
  let avis = await waitDialog(w.dialogs, d0);
  check(avis.message === "envoyé au tableau : page 1", `S3 : avis « ${avis.message} »`);
  await waitTabs(page, tabs0 + 2);
  check(((await shownTab(page).textContent()) ?? "").includes("Capture du bureau"), "S3 : nouvel onglet « Capture du bureau » montré");
  await waitStage(page, "data-page", "^1/1$");
  check(await centerIs(page, BLUE), "S3 : fond figé (#3366cc) sur la page du nouvel onglet");
  check(Number(await stageAttr(page, "data-elements")) >= 1, "S3 : le trait est sur la page");
  await page.click(`${TAB}[data-tab="${origin}"]`);
  await waitStage(page, "data-page", "^1/1$");
  check(Number(await stageAttr(page, "data-elements")) === 0, "S3 : onglet d'origine inchangé (une page, aucun objet)");
  check((await stageBox(page)).height >= 640, "S3 : scène ≥ 640 px après le retour");
  await enterAnnotation(page);
  await waitBody(page, "annotationEntrees", "2");
  check((await body(page, "annotationOpaque")) === "1", "S3 : réentrée figée (la page d'annotation a un fond)");
  await page.click(item("annotation-freeze"));
  await waitBody(page, "annotationOpaque", "0");
  check((await text(page, item("annotation-freeze"))) === "Figer le bureau", "S3 : « Bureau vivant » → transparent (annotationOpaque=0), bouton « Figer le bureau »");
  await page.click(item("desktop-annotation"));
  await waitMode(page, "board");
  noErrors(w, "S3 figé");
  await ctx.close();

  ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  page = await ctx.newPage();
  w = watch(page);
  await page.goto(`${base}/?fichiers=repli&annotation=faux&transparence=non`);
  await ready(page);
  await enterAnnotation(page);
  check((await body(page, "annotationOpaque")) === "1", "S3 sans transparence : entrée figée d'emblée");
  check((await body(page, "annotationCaptures")) === "1", "S3 sans transparence : capture faite à l'entrée");
  check((await text(page, item("annotation-freeze"))) === "Recapturer le bureau", "S3 sans transparence : bouton « Recapturer le bureau »");
  await page.click(item("annotation-freeze"));
  await waitBody(page, "annotationCaptures", "2");
  check((await body(page, "annotationOpaque")) === "1", "S3 « Recapturer le bureau » : nouvelle capture, toujours figé");
  await page.click(item("desktop-annotation"));
  await waitMode(page, "board");
  noErrors(w, "S3 sans transparence");
  await ctx.close();

  ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  page = await ctx.newPage();
  w = watch(page);
  await page.goto(`${base}/?fichiers=repli`);
  await ready(page);
  await page.click(item("profiles"));
  await page.waitForSelector("[data-profiles]", { timeout: 15000 });
  await page.click('[data-profile="annotation"]');
  await frames(page);
  await page.goto(`${base}/?fichiers=repli&annotation=faux&encre=1`);
  await waitMode(page, "annotation");
  await waitBody(page, "annotation", "1");
  check(await page.locator(item("annotation-send-new")).isDisabled(), "S3 « Annotation au démarrage » : « Envoyer dans un nouvel onglet » grisé");
  const tabs1 = await page.locator(TAB).count();
  d0 = w.dialogs.length;
  await page.click(item("annotation-send"));
  await waitMode(page, "board");
  avis = await waitDialog(w.dialogs, d0);
  check(avis.message === "envoyé au tableau : page 1", `S3 « Annotation au démarrage » : avis « ${avis.message} »`);
  await waitTabs(page, tabs1 + 1);
  check(((await shownTab(page).textContent()) ?? "").includes("Capture du bureau"), "S3 « Annotation au démarrage » : « Envoyer au tableau » ouvre un nouvel onglet");
  check((await stageBox(page)).height >= 640, "S3 « Annotation au démarrage » : scène ≥ 640 px");
  noErrors(w, "S3 « Annotation au démarrage »");
  await ctx.close();
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
  const tmp = await mkdtemp(join(tmpdir(), "roomboard-c11b-"));
  let browser = null;
  try {
    try {
      browser = await pw.chromium.launch({ args: ["--no-sandbox"] });
    } catch (e) {
      console.error(`${LABEL} : outil absent — Chromium de Playwright : ${e instanceof Error ? e.message.split("\n")[0] : e}`);
      return 2;
    }
    const a = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1, acceptDownloads: true });
    await s1(await a.newPage(), base, tmp, process.argv.includes("--captures"));
    await a.close();
    await s2(browser, base);
    await s3(browser, base);
    console.log(`${LABEL} : OK`);
    return 0;
  } catch (e) {
    console.error(`${LABEL} : ÉCHEC — ${e instanceof Echec ? e.message : e instanceof Error ? e.stack : e}`);
    return 1;
  } finally {
    await browser?.close();
    server.close();
    await rm(tmp, { recursive: true, force: true });
  }
}

process.exitCode = await main();
```
Vérifier le rouge (le build est celui d'avant le branchement) :
```bash
cd "$WT" && nice -n 10 pnpm --filter @roomboard/web build > /tmp/c11b-T10-build0.log 2>&1; nice -n 10 node scripts/essais/c11b-capture-navigateur.mjs 2>&1 | tail -2
```
Attendu : `C11b : ÉCHEC — …` (avis absent, ou bouton qui ne fait rien : le contrôleur n'a pas encore `sendCapture`).

- [ ] **Étape 3 : brancher `main.ts`.** Imports :
```ts
import { createFakeAnnotationWindows, type FakeAnnotationOptions } from "./platform/annotation-fake";
import type { AnnotationControl, AnnotationSupport, AnnotationWindows, CapturedImage, CaptureOutcome } from "./platform/annotation-port";
import { createTauriAnnotationWindows } from "./platform/annotation-tauri";
import { ANNOTATION_REMOTE_ACTIONS, resolveStartMode, type Dock } from "./toolbar";
```
(lignes 9 à 12) ; `import type { CoreDocument, CoreFactory } from "./core/api";` (ligne 21) ; ajouter
`import { createContainerIO } from "./app/container-io";` et `import { createAssetStore } from "./core/asset-store";`
s'ils n'y sont pas. Avant `async function start()` :
```ts
/** C11b (P30) : capture du faux hôte (`?annotation=faux`) : PNG 320 × 180 uni `#3366cc`, peint par un canvas. */
async function fakeDesktopCapture(): Promise<CaptureOutcome> {
  const c = document.createElement("canvas");
  c.width = 320;
  c.height = 180;
  const ctx = c.getContext("2d");
  if (ctx === null) return { ok: false, reason: "failed" };
  ctx.fillStyle = "#3366cc";
  ctx.fillRect(0, 0, 320, 180);
  const blob = await new Promise<Blob | null>((resolve) => c.toBlob(resolve, "image/png"));
  if (blob === null) return { ok: false, reason: "failed" };
  const image: CapturedImage = { blob, width: 320, height: 180 };
  return { ok: true, image };
}

/** C11b (P30) : options du faux hôte lues de l'adresse : `&capture=refus|wayland`, `&transparence=non`, `&encre=1`
 *  (le `draw` du faux trace un trait connu, de (200, 200) à (600, 200), épaisseur 8, sur la première page, à chaque
 *  collecte ; le document passe par le conteneur, assets compris). */
function fakeAnnotationOptions(params: URLSearchParams, core: CoreFactory): FakeAnnotationOptions {
  const shot = params.get("capture");
  const capture: CaptureOutcome | (() => Promise<CaptureOutcome>) =
    shot === "refus" ? { ok: false, reason: "denied" } : shot === "wayland" ? { ok: false, reason: "wayland" } : fakeDesktopCapture;
  const io = createContainerIO({
    core,
    codec: createPageCodec(loadFormatsModule),
    say: async (m) => console.warn(`RoomBoard (faux hôte) : ${m}`),
    makeAssets: () => createAssetStore(),
  });
  const draw = async (bytes: Uint8Array): Promise<Uint8Array> => {
    const read = await io.read("annotation.roomboard", bytes, "document");
    if (read === null) return bytes;
    try {
      const page = read.doc.pageIds()[0];
      if (page !== undefined) {
        const points = new Float32Array([200, 200, 0.5, 400, 200, 0.5, 600, 200, 0.5]);
        read.doc.apply({ type: "CommitStroke", page, points, style: { color: "#000000", width: 8 } });
      }
      return await io.encode(read.doc, read.assets, new Date().toISOString(), APP_VERSION, { kind: "document" });
    } finally {
      read.doc.free();
    }
  };
  return {
    dataset: document.body.dataset as Record<string, string | undefined>,
    transparent: params.get("transparence") !== "non",
    capture,
    ...(params.get("encre") === "1" ? { draw } : {}),
  };
}
```
Dans `start`, la branche du faux hôte devient
`? createFakeAnnotationWindows(fakeAnnotationOptions(params, core))` ; le repli de `support` devient
`.catch((): AnnotationSupport => ({ supported: false, reason: null, screens: 1, transparent: true }))`. Dans
`createAnnotationController({ … })`, après `screens: support?.screens ?? 1,` :
```ts
          // C11b (P6, P14, P17, P18) : fond figé, envoi, cible et repli.
          annotationBackdrop: () => workspace.annotationBackdrop(),
          setAnnotationBackdrop: (image, page) => workspace.setAnnotationBackdrop(image, page),
          sendCapture: (r) => workspace.sendCapture(r),
          startMode: () => resolveStartMode(active.profile(), active.capabilities()).mode,
          originKind: (id) => (id === null ? null : (workspace.tabs.list().find((t) => t.id === id)?.kind ?? null)),
          transparent: support?.transparent ?? true,
```

- [ ] **Étape 4 : vue de barre** dans `ui/App.tsx`, la ligne de retour de `view` (l. 344) devient :
```tsx
    return ann === undefined
      ? base
      : {
          ...base,
          annotation: { active: a.active, pointer: a.pointer, screens: a.screens, frozen: a.frozen === true, live: a.live !== false, sendTarget: a.sendTarget ?? "origin" },
        };
```

- [ ] **Étape 5 : brancher l'essai.** Dans `scripts/verifier.sh`, après `echo "C11a annotation : OK"` :
```bash
  node scripts/essais/c11b-capture-navigateur.mjs
  echo "C11b capture : OK"
```
Dans `scripts/tests/verifier-e2e.test.sh`, après la ligne C11a :
```bash
# C11b : ligne à part, comme C11a.
grep -q "scripts/essais/c11b-capture-navigateur.mjs" scripts/verifier.sh || ko "c11b-capture-navigateur absent de verifier.sh"
```

- [ ] **Étape 6 : vérifier le vert** (toutes les commandes de « Test et commande bornée » : tsc, build, essai C11b avec
`--captures`, essais à garder verts, `verifier-e2e.test.sh`, puis `verifier.sh --e2e` sous le jeton). Décrire
`/tmp/c11b-capture.png` au rapport.

- [ ] **Étape 7 : commit.**
```bash
cd "$WT" && git add apps/web/src/main.ts && git add apps/web/src/ui/App.tsx && git add scripts/essais/c11b-capture-navigateur.mjs && git add scripts/verifier.sh && git add scripts/tests/verifier-e2e.test.sh
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "feat(annotation): wire C11b and browser trial" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Tâche T11 — Fiche d'essais réels en coque `docs/essais/c11b-coque.md`
<a id="tache-t11"></a>

**Objectif.** La fiche des séances de Jérôme (S5, P36), sur le patron de `docs/essais/c11a-coque.md` : Windows 10 et 11,
macOS 14 (autorisation : invite, refus, octroi puis relance), Linux X11 avec et sans compositeur (repli figé), XWayland
(fond blanc et avis), deux écrans d'échelles différentes, écran 4K, nos fenêtres absentes de la capture, fichiers
temporaires supprimés. La ligne « transparence non peinte » de C11a-7 renvoie vers cette fiche.

**Fichiers.**
- Créer : `docs/essais/c11b-coque.md`
- Modifier : `docs/essais/c11a-coque.md` (l. 45, dernière ligne de C11a-7)

**Interfaces.**
- Consomme : libellés et avis du cadrage (P10, P11, P12, P16, P18) ; commandes de la coque (T3, nom seulement) ; chemin du cache `org.roomboard.app` (`tauri.conf.json`).
- Produit : sections `C11b-1` à `C11b-8`, cases `- [ ]` (≥ 30).

**Test et commande bornée.**
```bash
cd "$WT" && grep -c '^- \[ \]' docs/essais/c11b-coque.md; grep -c '^## C11b-' docs/essais/c11b-coque.md; grep -c 'c11b-coque.md' docs/essais/c11a-coque.md
```
Preuve attendue : ≥ 30 cases ; 8 sections ; `1` renvoi dans la fiche C11a.

**Preuve visuelle.** Aucune (document).

**Contraintes (recopiées de Global Constraints).**
- GC2 — Capture dans `crates/roomboard-shell` (testable hors Tauri), commandes Tauri minces dans `apps/desktop/src-tauri`. `xcap` seulement sous `cfg(any(windows, target_os="macos"))` ; Linux par `x11-dl` + `png`. Aucun paquet système installé. (La fiche le rappelle : le code Windows et macOS n'est pas compilé sur la VM.)
- GC3 — Coque : aucun `tauri build`, aucun bundle sur la VM ; la fiche renvoie aux procédures de construction des postes (`coque-windows.md`, `coque-macos.md`).
- GC7 — Commits : auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, messages en anglais, terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; fichiers ajoutés un par un (jamais `git add -A`/`.`/`commit -a`).

**Interdits.** Aucun essai joué ni coché (les cases restent vides) ; aucune autre fiche modifiée ; aucun code.

**Critère « terminé ».** Fiche écrite, renvoi posé, un commit. Pas de module à réutiliser pour cette tâche : le rapport
porte `Réutilisation : écart — document seul, aucun module`.

**Étapes.**

- [ ] **Étape 1 : écrire** `docs/essais/c11b-coque.md` :
```markdown
# Essais C11b en coque — capture du bureau et envoi au tableau (S5)

Pour : séances de Jérôme (PC Windows 10 22H2 et 11, Mac sous macOS 14, poste Linux X11 avec et sans compositeur, VM en
session GNOME Wayland). Rien de ceci ne se joue sur la VM en automatique : le code Windows et macOS (`xcap`, autorisation
« Enregistrement de l'écran ») n'y est pas compilé (cadrage P35). Construire la coque comme dans
`docs/essais/coque-windows.md` (§ 2) ou `coque-macos.md`, sur la branche du chantier. Cocher chaque ligne ; noter l'écart
en une phrase. Les fiches C11a (`c11a-coque.md`) restent à jouer avant celle-ci.

## C11b-1 — Envoyer au tableau, bureau vivant (Windows 10, Windows 11, macOS 14, Linux X11)
- [ ] Ouvrir un tableau de 2 pages, montrer la page 1, « Annotation du bureau », écrire sur le bureau (un mot, un cercle autour d'une icône).
- [ ] « Envoyer au tableau » : l'annotation se ferme ; le tableau montre la page 2 de 3, avec le bureau en fond, ajusté à la largeur de la page.
- [ ] Dans l'image du fond : ni la barre RoomBoard, ni la fenêtre d'annotation, ni l'encre (nos fenêtres sont absentes de la capture).
- [ ] Le trait est par-dessus, au même endroit que sur le bureau (le cercle entoure la même icône) ; Sélection le sélectionne comme objet.
- [ ] Avis « envoyé au tableau : page 2 » ; Ctrl+Z retire la page entière (fond et encre) en une fois ; Ctrl+Y la remet.
- [ ] Clignotement de nos fenêtres pendant la capture (≈ 250 ms, HC11b-9) : noter s'il gêne.
- [ ] Enregistrer, fermer, rouvrir : la page 2 a son fond et son trait.
- [ ] Zoomer ou faire défiler dans l'annotation avant d'écrire, puis envoyer : l'encre reste sur le bureau capturé (P13, HC11b-13).

## C11b-2 — Envoyer dans un nouvel onglet ; profil « Annotation au démarrage »
- [ ] En annotation, « Envoyer dans un nouvel onglet » : un onglet « Capture du bureau » d'une page est montré ; l'onglet d'origine est inchangé.
- [ ] L'onglet « Annotation » garde son encre après l'envoi (P8) ; « Quitter l'annotation » le garde aussi, sans rien envoyer.
- [ ] Profil « Annotation au démarrage », relancer : « Envoyer au tableau » ouvre un nouvel onglet ; « Envoyer dans un nouvel onglet » est grisé.
- [ ] Ni encre ni capture possible : avis « rien à envoyer », aucune page ajoutée.

## C11b-3 — Figer le bureau (Windows 10, Windows 11, macOS 14, Linux X11)
- [ ] « Figer le bureau » : la fenêtre devient opaque ; déplacer une fenêtre sous l'annotation : l'image ne bouge plus.
- [ ] Le bouton est enfoncé et dit « Bureau vivant » ; avec Sélection, cliquer un trait le sélectionne ; aucun clic ne passe au bureau.
- [ ] « Envoyer au tableau » en figé : page avec l'image figée, l'encre au même endroit.
- [ ] Quitter, rentrer : l'entrée est figée (même image) ; « Bureau vivant » : la transparence revient, sans fond ; le clic à travers revient avec Sélection.
- [ ] L'onglet « Annotation » montré sur le tableau affiche le fond figé ; Ctrl+S l'enregistre ; le rouvrir montre fond et encre.

## C11b-4 — Repli figé sans transparence (Linux X11)
- [ ] X11 sans compositeur (Openbox sans picom, ou `xfwm4 --replace --compositor=off`) : l'entrée capture d'abord et entre figée ; le bouton dit « Recapturer le bureau » ; un clic recapture le bureau (nouvelle image).
- [ ] X11 avec compositeur (picom, Mutter, KWin) : l'entrée est vivante et transparente.
- [ ] Transparence non peinte malgré un compositeur (pilote GPU) : le noter ; « Figer le bureau » reste à la main (HC11b-6).

## C11b-5 — Autorisation macOS (macOS 14)
- [ ] Première capture (« Envoyer au tableau » ou « Figer le bureau ») : invite du système « Enregistrement de l'écran ».
- [ ] Sans autorisation : page blanche avec l'encre, avis « capture du bureau impossible (autorisation “Enregistrement de l'écran” refusée : l'accorder dans Réglages Système › Confidentialité et sécurité, puis relancer RoomBoard) : page à fond blanc ».
- [ ] « Figer le bureau » sans autorisation : même avis, l'annotation reste vivante.
- [ ] Accorder dans Réglages Système › Confidentialité et sécurité, relancer RoomBoard : la capture contient le bureau et les fenêtres des autres applications (pas seulement le fond d'écran).
- [ ] Si un Mac sous macOS 15 est disponible : noter le comportement (`CGWindowListCreateImage` marqué obsolète, HC11b-16).

## C11b-6 — XWayland et Wayland (VM Ubuntu, session GNOME Wayland)
- [ ] Relancée en mode compatibilité (XWayland) : « Envoyer au tableau » donne une page blanche avec l'encre et l'avis « capture du bureau impossible (Wayland) : page à fond blanc ».
- [ ] « Figer le bureau » sous XWayland : même avis, l'annotation reste vivante.
- [ ] Wayland natif : l'annotation reste indisponible (C11a-7) ; aucune entrée de capture dans la barre du tableau.

## C11b-7 — Deux écrans, échelles différentes, 4K
- [ ] Deux écrans (100 % et 150 % sous Windows ; Retina et écran externe sous macOS) : sur chaque écran (« Écran suivant »), envoyer : la capture vient de l'écran de l'annotation, sans décalage de l'encre.
- [ ] Barre en bas, à gauche ou à droite (profil) : la capture couvre la zone d'annotation seulement, pas la bande de la barre (HC11b-11).
- [ ] Écran 4K : noter le poids du `.roomboard` après un envoi et le temps entre le clic et la page montrée (HC11b-10).

## C11b-8 — Fichiers temporaires (P24)
- [ ] Après un envoi, le dossier `captures` du cache de l'application est vide (Windows `%LOCALAPPDATA%\org.roomboard.app\captures`, macOS `~/Library/Caches/org.roomboard.app/captures`, Linux `~/.cache/org.roomboard.app/captures`).
- [ ] Tuer RoomBoard pendant une capture (Gestionnaire des tâches, `kill -9`), relancer : un reste de plus d'une minute disparaît au lancement.
```

- [ ] **Étape 2 : renvoi dans la fiche C11a.** Dans `docs/essais/c11a-coque.md`, remplacer la ligne
```markdown
- [ ] Si la transparence n'est pas peinte (WebKitGTK) : le noter ; le repli sur le bureau figé arrive avec C11b (HC11-16).
```
par
```markdown
- [ ] Si la transparence n'est pas peinte (WebKitGTK) : le noter, puis jouer C11b-4 de `c11b-coque.md` (repli figé automatique sans compositeur ; avec compositeur, « Figer le bureau » à la main, HC11b-6).
```

- [ ] **Étape 3 : vérifier** (commande de « Test et commande bornée »).

- [ ] **Étape 4 : commit.**
```bash
cd "$WT" && git add docs/essais/c11b-coque.md && git add docs/essais/c11a-coque.md
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "docs(c11b): shell trial sheet" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
