# Plan du lot 5b — socle : interface SolidJS, barre en profils, onglets, page infinie, barre des pages

> Exécution : étage 3 de nouvelle-feature — l'orchestrateur lit la table, une tâche = sa section.

**Spec :** `docs/plans/socle-cadrage.md` (D5 et D27 amendées le 2026-11-20, § « Amendements » ; D21, D22, DA1, DA10) et
`docs/plans/usage-cadrage.md` (§ 8 « À prendre dès le lot 5b », en entier ; U10-U16, U23-U25 ; DAU8 ; § 11 tranché).
**Plan maître :** `docs/plans/socle-PLAN.md`, ligne « 5b — Interface ». **Lots précédents :** `socle-lot4-PLAN.md`
(CL4-1 à CL4-15 gardés), `socle-lot5a-PLAN.md`, `socle-lot3b-PLAN.md` (réglages `engine/settings.ts`).
**Tâches :** T82 à T98 (17 ; T98 est la seconde moitié de T93, scindée à la relecture), 7 vagues. Vague = tâches lancées ensemble ; aucune paire d'une même vague ne partage un
fichier.

## Table des tâches

| id | titre | dépend de | fichiers touchés | worktree | subagent | preuve | scénario | section | vague |
|----|-------|-----------|------------------|----------|----------|--------|----------|---------|-------|
| T82 | Dépendances SolidJS et outillage de test | — | `apps/web/package.json`, `pnpm-lock.yaml`, `apps/web/vite.config.ts`, `apps/web/tsconfig.json`, `apps/web/src/ui/solid-socle.test.tsx` (neuf), `apps/web/src/ui/Socle.tsx` (neuf) | isolé | implementeur-tdd | vitest `src/ui/solid-socle.test.tsx` ≥ 2 tests, nom « monte un composant Solid » ; `pnpm -r test` vert | S2 | #tache-t82 | 1 |
| T83 | Profil de barre versionné (`toolbar.ts` étendu) et profils livrés | — | `apps/web/src/toolbar.ts`, `apps/web/src/toolbar.test.ts`, `apps/web/src/toolbar-profiles.ts` (neuf), `apps/web/src/toolbar-profiles.test.ts` (neuf) | isolé | concepteur-critique | vitest `toolbar.test.ts` + `toolbar-profiles.test.ts` ≥ 18 tests, noms « majeure supérieure refusée », « mineure supérieure : clés conservées » | U-S2, S2 | #tache-t83 | 1 |
| T84 | Page infinie en hauteur dans le rendu, « Ajuster la page » par la largeur, diagnostics WebGL2 | — | `apps/web/src/engine/camera.ts`, `apps/web/src/engine/camera.test.ts`, `apps/web/src/engine/page.ts`, `apps/web/src/engine/page.test.ts` (neuf), `apps/web/src/engine/render/canvas2d.ts`, `apps/web/src/engine/render/canvas2d.test.ts`, `apps/web/src/engine/render/webgl2.ts`, `apps/web/src/engine/render/webgl2.test.ts`, `apps/web/src/engine/render/select.ts`, `apps/web/src/engine/render/select.test.ts` | isolé | implementeur-tdd | vitest `camera`, `page`, `canvas2d`, `webgl2`, `select` ≥ 1 test neuf chacun, nom « page dessinée jusqu'au bas de la vue » | S4 | #tache-t84 | 1 |
| T85 | Module commun des scripts d'essai, migration de S2 et de l'essai des fichiers | — | `scripts/essais/commun.mjs`, `scripts/essais/s2-navigateur.mjs`, `scripts/essais/fichiers-navigateur.mjs` | isolé | implementeur-tdd | `S2 lot 3 : OK`, `S2 lot 3b : OK (4 passages)`, `Fichiers lot 5a : OK (3 modes)` sur le build actuel ; `grep -c "function loadPlaywright\|function serve" s2 fichiers` = 0 | S2 | #tache-t85 | 1 |
| T86 | Entrée unique des fichiers : `DroppedFile`, `FileHost.onDrop`, `importFiles`, côté page | — | `apps/web/src/platform/import.ts` (neuf), `apps/web/src/platform/import.test.ts` (neuf), `apps/web/src/platform/drop-web.ts` (neuf), `apps/web/src/platform/drop-web.test.ts` (neuf), `apps/web/src/platform/files.ts`, `apps/web/src/platform/files.test.ts`, `apps/web/src/platform/host-fsa.ts`, `apps/web/src/platform/host-fsa.test.ts`, `apps/web/src/platform/host-repli.ts`, `apps/web/src/platform/host-repli.test.ts`, `apps/web/src/platform/host-tauri.ts`, `apps/web/src/platform/host-tauri.test.ts` | isolé | implementeur-tdd | vitest `src/platform/` ≥ 14 tests neufs, nom « fichier non .roomboard : message, document intact » | U-S4, S2 | #tache-t86 | 1 |
| T87 | Coque : chemins accordés, `read_granted_file`, association `.roomboard`, fichier au lancement, Cmd+Q macOS | — | `Cargo.toml`, `Cargo.lock`, `crates/roomboard-shell/Cargo.toml` (neuf), `crates/roomboard-shell/src/lib.rs` (neuf), `apps/desktop/src-tauri/Cargo.toml`, `apps/desktop/src-tauri/Cargo.lock`, `apps/desktop/src-tauri/src/main.rs`, `apps/desktop/src-tauri/tauri.conf.json`, `apps/desktop/src-tauri/capabilities/default.json`, `scripts/controle-hors-ligne.mjs`, `scripts/tests/controle-hors-ligne.test.sh`, `docs/essais/coque-macos.md`, `docs/essais/coque-windows.md` | isolé | concepteur-critique | `cargo test -p roomboard-shell` ≥ 9 tests, nom `directory_is_never_granted` ; `cargo check` de `src-tauri` sans erreur ; `controle-hors-ligne.test.sh` vert | S5, U-S4 | #tache-t87 | 1 |
| T88 | Module commun `fmt`, export JSON, suivi du devicePixelRatio | — | `apps/web/src/app/mesure-outils.ts` (neuf), `apps/web/src/app/mesure-outils.test.ts` (neuf), `apps/web/src/app/banc.ts`, `apps/web/src/proto/stylet.ts` | isolé | implementeur-tdd | vitest `mesure-outils.test.ts` ≥ 5 tests, `banc.test.ts` vert ; `grep -c "const fmt" banc.ts stylet.ts` = 0 | S2 | #tache-t88 | 1 |
| T89 | `ProfileStore`, `RuntimeCapabilities`, profil actif en signal | T82, T83 | `apps/web/src/profile-store.ts` (neuf), `apps/web/src/profile-store.test.ts` (neuf), `apps/web/src/runtime-capabilities.ts` (neuf), `apps/web/src/runtime-capabilities.test.ts` (neuf), `apps/web/src/ui/active-profile.ts` (neuf), `apps/web/src/ui/active-profile.test.ts` (neuf) | isolé | implementeur-tdd | vitest des trois fichiers ≥ 14 tests, noms « profil defaut en lecture seule », « capacité absente : élément masqué, startMode rabattu » | U-S2, S2 | #tache-t89 | 2 |
| T90 | Moteur : Ajuster la page, style du stylo, caméra publiée, sélection après Suppr + Ctrl+Z, zone de texte qui suit le zoom, `Intl.Segmenter` | T84 | `apps/web/src/engine/engine.ts`, `apps/web/src/engine/engine.test.ts`, `apps/web/src/app/text-editor.ts`, `apps/web/src/app/text-editor.test.ts`, `apps/web/src/engine/text-layout.ts`, `apps/web/src/engine/text-layout.test.ts` | isolé | implementeur-tdd | vitest `engine`, `text-editor`, `text-layout` ≥ 8 tests neufs, noms « Ctrl+Z après Suppr resélectionne », « famille ZWJ jamais coupée » | S3, S4 | #tache-t90 | 2 |
| T91 | Barre des pages et barre des onglets (composants) | T82, T83 | `apps/web/src/ui/PagesBar.tsx` (neuf), `apps/web/src/ui/PagesBar.test.tsx` (neuf), `apps/web/src/ui/TabsBar.tsx` (neuf), `apps/web/src/ui/TabsBar.test.tsx` (neuf) | isolé | implementeur-tdd | vitest des deux fichiers ≥ 10 tests, noms « aller à la page 3 », « onglet modifié marqué » | S3 | #tache-t91 | 2 |
| T92 | Panneau des réglages, choix du profil, diagnostics WebGL2 | T82, T83, T84 | `apps/web/src/ui/SettingsPanel.tsx` (neuf), `apps/web/src/ui/SettingsPanel.test.tsx` (neuf), `apps/web/src/ui/ProfileMenu.tsx` (neuf), `apps/web/src/ui/ProfileMenu.test.tsx` (neuf) | isolé | implementeur-tdd | vitest des deux fichiers ≥ 10 tests, noms « échelon 4 : question si un onglet est modifié », « badColors affichées » | S2 | #tache-t92 | 2 |
| T93 | `BoardSession` : un moteur, un rendu, un document par onglet ; `dispose` libère le contexte WebGL2 ; dépendances du banc | T84, T88, T90 | `apps/web/src/app/board-session.ts` (neuf), `apps/web/src/app/board-session.test.ts` (neuf), `apps/web/src/engine/render/select.ts`, `apps/web/src/engine/render/select.test.ts` | isolé | concepteur-critique | vitest `board-session`, `select` ≥ 14 tests, noms « dispose : contexte WebGL2 perdu, scène retirée, document libéré », « deux sessions : un seul #stage, un seul #texte-edition » | S2, S3 | #tache-t93 | 3 |
| T98 | Espace de travail : onglets, contrôleur de fichiers par onglet, Ouvrir et dépôt = nouvel onglet, marquage `#stage` | T86, T93 | `apps/web/src/app/tabs.ts` (neuf), `apps/web/src/app/tabs.test.ts` (neuf), `apps/web/src/app/workspace.ts` (neuf), `apps/web/src/app/workspace.test.ts` (neuf), `apps/web/src/platform/controller.ts`, `apps/web/src/platform/controller.test.ts`, `apps/web/src/platform/mount.ts`, `apps/web/src/platform/mount.test.ts`, `apps/web/src/platform/host-tauri.ts`, `apps/web/src/platform/host-tauri.test.ts` | isolé | concepteur-critique | vitest `tabs`, `workspace`, `controller`, `mount`, `host-tauri` ≥ 30 tests, noms « ouvrir : nouvel onglet, l'onglet d'origine intact », « fermeture gardée si un onglet est modifié », « lancement : écoute du dépôt posée avant launch_files », « marquage #stage par onglet » ; `tsc --noEmit` sans `error TS` | S2, S3, U-S4 | #tache-t98 | 4 |
| T94 | Barre d'outils SolidJS en profils : `ToolbarHost`, état des éléments par table, dock, taille | T82, T83, T86, T89, T90 | `apps/web/src/ui/Toolbar.tsx` (neuf), `apps/web/src/ui/Toolbar.test.tsx` (neuf), `apps/web/src/ui/item-state.ts` (neuf), `apps/web/src/ui/item-state.test.ts` (neuf), `apps/web/src/ui/layout.ts` (neuf), `apps/web/src/ui/layout.test.ts` (neuf), `apps/web/src/ui/rb.css` (neuf), `apps/web/src/app/toolbar-host.ts` (neuf), `apps/web/src/app/toolbar-host.test.ts` (neuf) | isolé | implementeur-tdd | vitest des cinq fichiers ≥ 20 tests, noms « outil inconnu : bouton absent », « aucun switch sur l'identifiant » (contrôle de source) | S2, S3 | #tache-t94 | 3 |
| T95 | Application SolidJS assemblée : `App.tsx`, `main.ts` réduit, `index.html`, barre DOM retirée, la barre ne recouvre rien | T89, T91, T92, T93, T94, T98 | `apps/web/src/ui/App.tsx` (neuf), `apps/web/src/ui/App.test.tsx` (neuf), `apps/web/src/main.ts`, `apps/web/index.html`, `apps/web/src/app/barre.ts` (retiré), `apps/web/src/app/barre.test.ts` (retiré), `apps/web/src/app/stage-tags.ts` (neuf), `apps/web/src/app/stage-tags.test.ts` (neuf), `apps/web/src/toolbar.ts`, `apps/web/src/toolbar.test.ts`, `apps/web/src/app/board-session.ts` (import), `apps/web/src/ui/PagesBar.tsx`, `apps/web/src/ui/rb.css` | isolé | concepteur-critique | vitest `App.test.tsx` ≥ 9 tests, nom « inventaire : chaque bouton de l'ancienne barre a son élément » ; `scripts/verifier.sh` → `verifier.sh : OK` | S2, S3, S4 | #tache-t95 | 5 |
| T96 | Playwright `--e2e` : S2-S4 et lot 5b par l'interface SolidJS, captures, `verifier.sh --e2e` | T85, T95 | `scripts/verifier.sh`, `scripts/essais/commun.mjs`, `scripts/essais/s2-navigateur.mjs`, `scripts/essais/s34-navigateur.mjs`, `scripts/essais/fichiers-navigateur.mjs`, `scripts/essais/s5b-navigateur.mjs` (neuf), `scripts/tests/verifier-e2e.test.sh` (neuf), `docs/essais/s5b-*.png` (neufs), `docs/essais/s2-lot5b.png`, `docs/essais/s34-lot5b-*.png` (neufs) | isolé | implementeur-tdd | `verifier.sh --e2e` code 0, `grep -E "^(S2\|S3/S4\|Fichiers\|S5b).*: OK\|verifier.sh :\|Echec"` → les cinq motifs `: OK`, `verifier.sh : OK`, aucun `Echec` ; `grep -c "ok —"` ≥ 25 pour S5b ; sans `--e2e` : compte = 0 | S2, S3, S4, U-S4 | #tache-t96 | 6 |
| T97 | Orchestrateur : build Tauri Linux, essai de la coque sous Broadway, capture | T96 | `docs/essais/coque-linux-lot5b.png` (neuf), `docs/sessions/socle-etat.md` (orchestrateur seul) | principal | orchestrateur | build release `.deb` produit ; sous Broadway : trace, barre SolidJS, onglet ; capture | S5 | #tache-t97 | 7 |

Vagues : **1** = T82, T83, T84, T85, T86, T87, T88 (faite) · **2** = T89, T90, T91, T92 · **3** = T93, T94 ·
**4** = T98 · **5** = T95 · **6** = T96 · **7** = T97 (orchestrateur). Au plus 4 sous-agents à la fois si la VM manque de place : dans la vague 1,
T87 (compilation Rust) d'abord, avec T83 et T86.

Scénarios : **S2-S5** = `socle-cadrage.md` § Scénarios ; **U-S2** et **U-S4** = `usage-cadrage.md` § 6 (S2 : profil
d'une version plus récente, logique pure au lot 5b ; S4 amendé : `.roomboard` déposé → nouvel onglet). Porte visuelle
du plan maître : T96 (captures) et T97 (coque).

## Carte des fichiers

```
apps/web/
  package.json, vite.config.ts, tsconfig.json        T82 (solid-js 1.9.20, vite-plugin-solid 2.11.17, happy-dom, testing-library)
  index.html                                          T95 (une racine #app, plus de #barre/#reglages/#edition)
  src/main.ts                                         T95 (amorce : Wasm, réglages, profil, monte <App/>)
  src/toolbar.ts (+test)                              T83 (profil versionné, tables), T95 (retire l'ancien `toolbar`)
  src/toolbar-profiles.ts (+test)                     T83 (profils livrés `defaut`, `simple`)
  src/profile-store.ts, runtime-capabilities.ts       T89
  src/ui/                                             SolidJS seulement ici (D21)
    Socle.tsx (+test)                                 T82
    active-profile.ts (+test)                         T89
    PagesBar.tsx, TabsBar.tsx (+tests)                T91
    SettingsPanel.tsx, ProfileMenu.tsx (+tests)       T92
    Toolbar.tsx, item-state.ts, layout.ts, rb.css     T94 (rb.css : règles de la scène et de la grille ajoutées par T95)
    App.tsx (+test)                                   T95
  src/app/
    mesure-outils.ts (+test), banc.ts                 T88
    text-editor.ts (+test)                            T90
    board-session.ts (+test)                          T93
    tabs.ts, workspace.ts (+tests)                    T98
    toolbar-host.ts (+test)                           T94
    stage-tags.ts (+test) ; barre.ts retiré           T95
  src/engine/
    camera.ts, page.ts, render/{canvas2d,webgl2,select}.ts   T84 (select.ts : `release()` ajouté par T93)
    engine.ts, text-layout.ts                         T90
  src/platform/
    import.ts, drop-web.ts, files.ts, host-*.ts       T86 (host-tauri.ts : `dropListening` ajouté par T98)
    controller.ts, mount.ts                           T98
  src/proto/stylet.ts                                 T88
crates/roomboard-shell/ (neuf, membre du workspace)   T87
apps/desktop/src-tauri/ (main.rs, Cargo.toml, tauri.conf.json, capabilities/default.json)   T87
scripts/essais/{commun,s2-navigateur,fichiers-navigateur}.mjs   T85 puis T96
scripts/essais/{s34-navigateur,s5b-navigateur}.mjs, scripts/verifier.sh   T96
```

## Inventaire de l'ancienne barre (rien ne se perd)

Chaque ligne a un élément dans le profil `defaut` (T83) et un test dans `App.test.tsx` (T95,
« inventaire : chaque bouton de l'ancienne barre a son élément »).

| ancien (barre DOM) | `data-action` / `data-reglage` | élément du profil `defaut` (`data-item`) | barre (`toolbars[].id`) |
|---|---|---|---|
| Stylo | `pen` | `pen` (kind `tool`, tool `pen`) | `outils` |
| Gomme | `eraser` | `eraser` (tool `eraser`) | `outils` |
| Main | `hand` | `hand` (tool `hand`) | `outils` |
| Gomme : partielle / objet | `eraser-mode` | `eraser-mode` (kind `action`) | `outils` |
| Annuler / Rétablir | `undo`, `redo` | `undo`, `redo` (action) | `outils` |
| Sélection, Rectangle, Ellipse, Ligne, Flèche, Texte | `select`, `rect`, `ellipse`, `line`, `arrow`, `text` | mêmes ids (tool) | `outils` |
| Page précédente / suivante / Ajouter / Retirer | `page-prev`, `page-next`, `page-add`, `page-remove` | mêmes ids (action) | `pages` (role `pages`) |
| Compteur `#pages` « 3 / 7 » | `#pages` | rendu par `PagesBar` (garde `id="pages"`) | `pages` |
| État d'erreur `#etat` | `#etat` | ligne d'état de `App` (garde `id="etat"`, `role="status"`) | — |
| Réglages doigt, paume, É2, É3, É4 | `data-reglage="finger|palm|prediction|inkTrail|webgl"` | `SettingsPanel` (garde `data-reglage`), ouvert par l'action `settings` | `outils` |
| Notes des échelons `#echelons-notes` | `#echelons-notes` | `SettingsPanel` (garde l'id) | — |
| Ouvrir, Enregistrer, Enregistrer sous, Nouveau (raccourcis du lot 5a) | Ctrl+O, Ctrl+S, Ctrl+Maj+S, Ctrl+N | `file-open`, `file-save`, `file-save-as`, `file-new` (action) ; raccourcis gardés | `outils` |
| (neuf) Ajuster la page | — | `fit-page` (action) | `outils` |
| (neuf) diagnostics WebGL2 (`badColors`, `lost`) | — | `SettingsPanel` (`#webgl-diagnostic`) et `#stage[data-webgl-perdu]` (posé par la session, T93) | — |

## Choix tranchés

Ce que les cadrages ne tranchent pas, avec la raison. Ce qui se voit et se défait mal est derrière un réglage réversible.

- **CL5b-1 — Un moteur, un rendu et un document par onglet ; un seul module Wasm.** `CoreFactory.blank()` et `load()`
  rendent déjà des `Document` Wasm indépendants (un objet Rust chacun, `crates/roomboard-wasm/src/lib.rs:73`) : le cœur
  tient plusieurs documents par instance. Ce qui ne sait pas changer de document, c'est le **moteur** (`createEngine`
  lie `doc` et `renderer` à sa création ; caméras, outils et cache du rendu en dépendent). Voie retenue : une
  `BoardSession` par onglet (son `<div class="rb-stage">`, ses deux canvas, son moteur, son échantillonneur, sa zone de
  texte), les onglets cachés gardés vivants (`hidden`), aucune API `setDocument` dans le moteur. Raison : aucune ligne du
  moteur testé ne change pour les onglets ; l'isolement des historiques est garanti par construction. Coût : deux canvas
  par onglet ; borne **12 onglets** (au-delà : message « 12 onglets au plus ; fermez-en un »), sous la limite de 16
  contextes WebGL2 de Chromium quand l'échelon 4 est actif.
- **CL5b-2 — Les identifiants `#stage`, `#scene`, `#interaction`, `#texte-edition` suivent l'onglet actif.** Les
  scripts d'essai et les attributs `#stage[data-*]` (S2, S3/S4, fichiers) restent valables : l'onglet activé reçoit ces
  ids, les autres les perdent (`data-tab` reste sur chacun). Le marquage des fichiers (`data-fichiers`, `data-modifie`,
  `data-fichier`, `data-fichier-erreur`) est tenu par onglet (T98).
- **CL5b-3 — Ouvrir ne recharge plus la page.** Ouvrir (boîte, dépôt, lancement) charge le fichier dans un nouvel onglet,
  sans question (D27 amendée, Q1) ; l'attente IndexedDB du lot 5a ne sert plus qu'au démarrage (fichier mis en attente
  par une version précédente), gardée sans écriture neuve. Nouveau (Ctrl+N) ouvre un onglet vierge.
- **CL5b-4 — Un fichier `.roomboard` déposé s'ouvre sans cible d'écriture** (`target: null`, nom repris) : Ctrl+S
  demande où enregistrer. Raison : `scopeDroppedPaths: false` (PR 5) refuse l'écriture au chemin déposé, et c'est voulu.
- **CL5b-5 — Fermer le dernier onglet ouvre un onglet vierge** avant de le retirer (toujours un onglet). Fermer un onglet
  modifié pose la question du lot 5a (`DISCARD_MESSAGE`). Fermer l'onglet montré montre le précédent (le premier si
  c'était le premier) : même règle que retirer une page (CL4-9).
- **CL5b-6 — Une seule garde de fermeture pour la fenêtre** : vraie si un onglet au moins est modifié. Le titre de la
  fenêtre est celui de l'onglet actif.
- **CL5b-7 — Page infinie en hauteur par le rendu seulement.** Le format garde `width`/`height` (1920 × 1080) ; la
  hauteur devient un minimum, sans migration ni changement du cœur. Fond de page de y = 0 jusqu'au bas de la vue. Le
  pourtour reste à gauche, à droite et au-dessus. « Ajuster la page » (`fitWidth`) : largeur × 0,95, centrée, haut de
  page à 16 px du haut de la vue. Une page jamais vue s'ouvre ainsi.
- **CL5b-8 — Barre des pages en liste** (boutons « 1 », « 2 »… plus précédente / suivante / ajouter / retirer, compteur
  `#pages`), pas de vignettes : une vignette exige un rendu hors écran par page, hors du temps du lot. La liste défile
  au-delà de 20 pages.
- **CL5b-9 — Deux profils livrés.** `defaut` (lecture seule) : barre `outils` en haut, taille `m`, barre `pages` en
  bas ; `simple` (lecture seule aussi) : barre `outils` à gauche, taille `l`, Stylo, Gomme, Main, Annuler, Rétablir,
  Ajuster la page, Réglages ; barre `pages` en bas. Le profil choisi est gardé (`ProfileStore`, `localStorage`) et se
  change au menu « Profil » : réversible.
- **CL5b-10 — La barre ne recouvre rien** : mise en page en grille CSS dérivée des `dock` (`layoutFor`), la scène
  occupe la case du centre ; une barre `floating` est la seule superposée (aucune dans les profils livrés). Le panneau
  des réglages et le menu des profils sont des menus passagers, superposés tant qu'ils sont ouverts.
- **CL5b-11 — Les sélecteurs des scripts** : `button[data-item="<id>"]` (ids stables du profil), `[data-toolbar="<id>"]`
  pour une barre, `button[data-reglage]` gardé, `#pages` et `#etat` gardés ; `[data-tab]` pour les onglets.
- **CL5b-12 — Ctrl+Z après Suppr resélectionne les éléments rendus** quand ce sont exactement ceux que Suppr a retirés,
  sur la page montrée ; tout autre geste ou commande oublie ce souvenir.
- **CL5b-13 — Coque : le dépôt passe par la coque Rust.** `on_window_event(DragDrop::Drop)` accorde d'abord les chemins
  (fichiers seulement, chemins canoniques, jamais un dossier), puis émet `roomboard://dropped`. La page n'écoute
  `onDragDropEvent` que pour `enter`/`leave` (surbrillance) : ainsi l'accord précède toujours la lecture.
  `read_granted_file` compare le chemin canonique à l'ensemble accordé (égalité stricte, aucune recherche par préfixe),
  morceaux de 8 Mio au plus.
- **CL5b-14 — Logique de la coque dans un petit crate du workspace** (`crates/roomboard-shell`) : testable par
  `cargo test --workspace` sans compiler Tauri (7,5 Go de RAM) ; `src-tauri` ne fait que l'appeler.
- **CL5b-15 — Cmd+Q seulement sous macOS** (`#[cfg(target_os = "macos")]`) : `ExitRequested { code: None }` est empêché,
  la page demande si un onglet est modifié, puis `quit_app`. Sous Linux et Windows, rien ne change (sinon fermer la
  dernière fenêtre laisserait l'application sans fenêtre). Non jouable sur la VM : fiche macOS.
- **CL5b-16 — `behavior.startMode` inconnu** (valeur d'une version plus récente) : avertissement, `board` ; la valeur
  n'est pas conservée à la réécriture (seules les clés inconnues le sont).
- **CL5b-17 — SolidJS 1.9.20 figé** (D21 dit 1.9 ; la 2.0 est sortie) : `solid-js` 1.9.20, `vite-plugin-solid`
  2.11.17, `@solidjs/testing-library` 0.8.10, `happy-dom` 21.0.4, versions exactes dans `package.json`.
- **CL5b-18 — Changer l'échelon 3 ou 4 recharge la page** comme au lot 3b ; avec des onglets, la question
  « Recharger : les onglets non enregistrés seront perdus. Continuer ? » est posée si un onglet est modifié.
- **CL5b-19 — Le profil arrive au moteur en commandes** : `ToolbarHost.setTool(tool, preset?)` → `engine.setTool` et,
  pour un préréglage, `engine.setPenStyle({ color, width })`. Un changement de profil n'interrompt pas un geste : la
  barre change, l'outil courant reste jusqu'au prochain choix.
- **CL5b-20 — Onglet d'annotation : type seulement.** `TabKind = "board" | "annotation"` ; `add("annotation", …)` lève
  « onglet d'annotation : prévu, livré par C11a » (Q2).

## Hors lot 5b (attribués)

Insertion des pages d'un document (C3) · formats autres que `.roomboard` (C2-C5) · éditeur de profils, export
`.rbprofile` (C1) · annotation de bureau (C11a, Q2) · vignettes de pages · réordonner les éléments de barre (C1 : le
modèle ne s'appuie sur aucun glisser HTML5 ; rien n'est réordonnable au lot 5b) · WebKit Playwright (H2-10, reste
essayé hors chaîne).

## Écarts de la vague 1 (rapports des tâches, intégrés le 2026-11-20)

- **T82** : `apps/web/vite.config.ts` porte `test: { environment: "node" }` (vite-plugin-solid imposait jsdom) ; les tests
  de composants et de DOM posent happy-dom par leur première ligne. `pnpm-workspace.yaml` a reçu
  `minimumReleaseAgeExclude: solid-js@1.9.20`. → contrainte recopiée dans T89-T98.
- **T84** : le rendu Canvas 2D retient la hauteur CSS au `resize` ; `fitWidth` est à côté de `fitPage`. → T93
  (taille CSS de la case passée au rendu).
- **T86** : le faux `FileHost` de `apps/web/src/platform/controller.test.ts:54` n'a pas `onDrop` : `tsc --noEmit` échoue
  (TS2741) jusqu'à T98, qui le corrige en première étape. Aucune tâche des vagues 2 et 3 ne lance `tsc` ; si l'une le
  fait, cette seule erreur est attendue.
- **T87** : le contrôle s'appelle `scripts/controle-hors-ligne.mjs` ; les chemins émis par la coque sous Windows ont la
  forme `\\?\C:\…` (la page n'affiche que le nom de base) ; la page doit écouter `roomboard://dropped` avant
  d'appeler `launch_files`. → T98 (`dropListening`, ordre testé, nom de base testé), T95 (aucun autre appel de
  `launchFiles`).

## Contraintes globales (recopiées dans chaque section)

- Toutes les commandes visent le worktree donné par l'orchestrateur : `cd <worktree> && …` ; avant toute commande
  cargo ou wasm : `export PATH=$HOME/.cargo/bin:$PATH`.
- Worktree neuf : `pnpm install --frozen-lockfile` à la racine ; si `apps/web/src/wasm/` manque (contrat, build web,
  essais), lancer une fois `PATH=$HOME/.cargo/bin:$PATH scripts/verifier.sh 2>&1 | tail -30` au premier plan.
- TDD : le test d'abord, montré rouge (sortie copiée dans le rapport), puis le code, puis vert.
- Aucun test désactivé (`.skip`, `.only`, `#[ignore]` neuf), aucun seuil baissé. Un test qui dépend d'un délai et
  échoue est rejoué une fois ; s'il échoue encore, c'est un échec.
- Commandes longues (verifier.sh, build, essais Playwright) au premier plan avec `timeout: 600000`, jamais en
  `run_in_background`. Sous-agents et relecteurs lancés au premier plan, `run_in_background: false` écrit explicitement.
- Builds Tauri : au plus 2 pour tout le lot sur la VM (le `cargo check` de T87 et le build release de T97), un seul à
  la fois, `CARGO_BUILD_JOBS=2`. Aucune autre tâche ne compile `apps/desktop/src-tauri`. Aucun build Android.
- `git add` fichier par fichier ; jamais `git add -A`, `git add .`, `git commit -a` ; jamais `--force` ; aucun tag,
  aucune release ; `.github/workflows/` non touché.
- Commit : auteur `jejeasterix <jejeasterix@users.noreply.github.com>` (déjà réglé), message en anglais, dernière ligne
  exactement `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (jamais « Sonnet »).
- SolidJS seulement dans `apps/web/src/ui/` (D21) ; `src/engine/` n'importe aucun framework ni `src/ui/`.
- Aucune ressource réseau à l'exécution (D27) : polices et icônes embarquées ; `scripts/controle-hors-ligne.mjs` reste
  vert. Ne jamais retirer `"plugins": { "fs": { "scopeDroppedPaths": false } }` de `tauri.conf.json`.
- Composants de barre : aucun appel à `localStorage` (passer par `ProfileStore`), aucun `switch` ni chaîne de `if` sur
  un identifiant d'outil ou d'action (tables), aucune dimension en pixels (jetons CSS `--rb-btn-s|m|l`), aucun état
  propre au document (tout vient du profil, des capacités et de l'état publié par le moteur), aucun glisser HTML5
  (`draggable`, `dragstart`) dans l'interface.
- Choix du lot 4 gardés (CL4-1 à CL4-15) : aperçus d'édition sur la scène Canvas 2D, `<textarea>` visible, validation
  différée pendant l'IME, retirer la page montrée montre la précédente.
- Réglages `engine/settings.ts` (É2 `prediction`, É3 `inkTrail`, É4 `webgl`, `palm`, `finger`) : défauts et
  adresse `?echelons=`, `?paume=`, `?doigt=` inchangés ; aucun ne se perd dans l'interface neuve.
- Le rapport de la tâche porte, pour chaque ligne `Réutilise :` de sa section, `Réutilisation : appelé <module>` ou
  `Réutilisation : écart — <pourquoi>`.
- (Ajout après la vague 1, T89 et suivantes) Tests DOM et composants : première ligne `// @vitest-environment happy-dom` ;
  `apps/web/vite.config.ts` garde `test: { environment: "node" }` (écart T82), ne pas le changer.

---

<a id="tache-t82"></a>
### Tâche T82 — Dépendances SolidJS et outillage de test

**Objectif.** Poser SolidJS 1.9 (DA1, D21) dans `apps/web` : dépendances figées, plugin Vite, JSX, tests de composants
sous Vitest (`happy-dom`), sans casser le build du prototype ni les 552 tests existants.

**Fichiers.** `apps/web/package.json`, `pnpm-lock.yaml`, `apps/web/vite.config.ts`, `apps/web/tsconfig.json`,
`apps/web/src/ui/Socle.tsx` (neuf), `apps/web/src/ui/solid-socle.test.tsx` (neuf).

**Interfaces.**
- Produit : `export function Socle(props: { readonly label: string }): JSX.Element` (témoin, gardé comme test de fumée).
- Produit : la convention de test des composants : première ligne `// @vitest-environment happy-dom`, `render` et
  `cleanup` de `@solidjs/testing-library`.
- Réutilise : `apps/web/vite.config.ts` — `defineConfig({ base: "./" })`, gardé, plugin ajouté.

**Test et commande bornée.**
`cd <worktree> && pnpm --filter @roomboard/web exec vitest run src/ui/solid-socle.test.tsx 2>&1 | tail -15`
→ `Tests  2 passed`, nom « monte un composant Solid » présent. Puis `pnpm -r test 2>&1 | tail -8` → aucun `FAIL `, nombre
de tests ≥ 552 + 2. Puis `pnpm --filter @roomboard/web build 2>&1 | tail -5` et `pnpm --filter @roomboard/web build:proto
2>&1 | tail -3` sans erreur.

**Contraintes.**
- Toutes les commandes visent le worktree donné par l'orchestrateur : `cd <worktree> && …` ; avant toute commande
  cargo ou wasm : `export PATH=$HOME/.cargo/bin:$PATH`.
- Worktree neuf : `pnpm install --frozen-lockfile` à la racine ; si `apps/web/src/wasm/` manque (contrat, build web,
  essais), lancer une fois `PATH=$HOME/.cargo/bin:$PATH scripts/verifier.sh 2>&1 | tail -30` au premier plan.
- TDD : le test d'abord, montré rouge (sortie copiée dans le rapport), puis le code, puis vert.
- Aucun test désactivé (`.skip`, `.only`, `#[ignore]` neuf), aucun seuil baissé. Un test qui dépend d'un délai et
  échoue est rejoué une fois ; s'il échoue encore, c'est un échec.
- Commandes longues (verifier.sh, build, essais Playwright) au premier plan avec `timeout: 600000`, jamais en
  `run_in_background`. Sous-agents et relecteurs lancés au premier plan, `run_in_background: false` écrit explicitement.
- Builds Tauri : au plus 2 pour tout le lot sur la VM (le `cargo check` de T87 et le build release de T97), un seul à
  la fois, `CARGO_BUILD_JOBS=2`. Aucune autre tâche ne compile `apps/desktop/src-tauri`. Aucun build Android.
- `git add` fichier par fichier ; jamais `git add -A`, `git add .`, `git commit -a` ; jamais `--force` ; aucun tag,
  aucune release ; `.github/workflows/` non touché.
- Commit : auteur `jejeasterix <jejeasterix@users.noreply.github.com>` (déjà réglé), message en anglais, dernière ligne
  exactement `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (jamais « Sonnet »).
- SolidJS seulement dans `apps/web/src/ui/` (D21) ; `src/engine/` n'importe aucun framework ni `src/ui/`.
- Aucune ressource réseau à l'exécution (D27) : polices et icônes embarquées ; `scripts/controle-hors-ligne.mjs` reste
  vert. Ne jamais retirer `"plugins": { "fs": { "scopeDroppedPaths": false } }` de `tauri.conf.json`.
- Composants de barre : aucun appel à `localStorage` (passer par `ProfileStore`), aucun `switch` ni chaîne de `if` sur
  un identifiant d'outil ou d'action (tables), aucune dimension en pixels (jetons CSS `--rb-btn-s|m|l`), aucun état
  propre au document (tout vient du profil, des capacités et de l'état publié par le moteur), aucun glisser HTML5
  (`draggable`, `dragstart`) dans l'interface.
- Choix du lot 4 gardés (CL4-1 à CL4-15) : aperçus d'édition sur la scène Canvas 2D, `<textarea>` visible, validation
  différée pendant l'IME, retirer la page montrée montre la précédente.
- Réglages `engine/settings.ts` (É2 `prediction`, É3 `inkTrail`, É4 `webgl`, `palm`, `finger`) : défauts et
  adresse `?echelons=`, `?paume=`, `?doigt=` inchangés ; aucun ne se perd dans l'interface neuve.
- Le rapport de la tâche porte, pour chaque ligne `Réutilise :` de sa section, `Réutilisation : appelé <module>` ou
  `Réutilisation : écart — <pourquoi>`.

**Interdits.** Aucune autre version que celles écrites ici (`solid-js` 1.9.20 : la 2.x est hors D21). Ne pas toucher
`vite.proto.config.ts` (le prototype reste sans framework). Pas de `@testing-library/jest-dom`.

**Terminé quand** les deux tests passent, la suite complète reste verte, `tsc --noEmit` (dans `build`) accepte le TSX.

**Étapes.**
1. Le test, rouge (module absent) : `apps/web/src/ui/solid-socle.test.tsx`
```tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { afterEach, describe, expect, it } from "vitest";
import { Socle } from "./Socle";

afterEach(cleanup);

describe("socle SolidJS (T82)", () => {
  it("monte un composant Solid", () => {
    const { container } = render(() => <Socle label="Essai" />);
    expect(container.querySelector("button[data-socle]")?.textContent).toBe("Essai 0");
  });

  it("un signal met le bouton à jour au clic", () => {
    const { container } = render(() => <Socle label="Essai" />);
    const b = container.querySelector("button");
    if (!b) throw new Error("bouton absent");
    fireEvent.click(b);
    expect(b.textContent).toBe("Essai 1");
  });
});
```
2. Dépendances (réseau npm vérifié le 2026-11-20 : `solid-js@1.9` → 1.9.20) :
```bash
cd <worktree> && pnpm --filter @roomboard/web add --save-exact solid-js@1.9.20 \
 && pnpm --filter @roomboard/web add -D --save-exact vite-plugin-solid@2.11.17 @solidjs/testing-library@0.8.10 happy-dom@21.0.4 \
 && git diff --stat pnpm-lock.yaml
```
3. `apps/web/vite.config.ts` :
```ts
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

// D27 : chemins relatifs, l'application se sert de n'importe quel dossier (coque, file://, serveur local).
// D21 : SolidJS (JSX compilé par vite-plugin-solid, seulement les fichiers .tsx).
export default defineConfig({ base: "./", plugins: [solid()] });
```
4. `apps/web/tsconfig.json` : ajouter dans `compilerOptions` `"jsx": "preserve"` et `"jsxImportSource": "solid-js"`.
5. `apps/web/src/ui/Socle.tsx` :
```tsx
import { createSignal, type JSX } from "solid-js";

/** Composant témoin du socle SolidJS (T82) : un signal, un bouton ; sert de test de fumée du JSX et des tests. */
export function Socle(props: { readonly label: string }): JSX.Element {
  const [count, setCount] = createSignal(0);
  return (
    <button type="button" data-socle onClick={() => setCount(count() + 1)}>
      {props.label} {count()}
    </button>
  );
}
```
6. Vert : les trois commandes de la preuve. Si `render` lève « Client-only API called on the server side »,
   vérifier que `vite-plugin-solid` est bien dans `plugins` (il pose les conditions `browser` pour Vitest).
7. Commit : `feat(web): add SolidJS 1.9 with component tests`.

<a id="tache-t83"></a>
### Tâche T83 — Profil de barre versionné (`toolbar.ts` étendu) et profils livrés

**Objectif.** Le profil de barre comme donnée (D22, DA10 ; usage § 8 points 1-7, 11, 17 ; U11-U13) : versionné, validé,
clés inconnues gardées à la réécriture, outils et actions en chaînes ouvertes connues par table, barres en liste avec
`dock`, préréglages séparés, jeton de taille ; deux profils livrés en lecture seule.

**Fichiers.** `apps/web/src/toolbar.ts`, `apps/web/src/toolbar.test.ts`, `apps/web/src/toolbar-profiles.ts` (neuf),
`apps/web/src/toolbar-profiles.test.ts` (neuf).

**Interfaces.**
- Réutilise : `apps/web/src/toolbar.ts:1-24` — étendu (DA10) : `ToolDef` et `toolbar` gardés tels quels jusqu'à T95
  (seul `app/barre.ts` les lit) ; `validateToolbar` garde ses deux contrôles (doublon, libellé vide), repris dans
  `parseProfile`.
- Consomme : `type ToolChoice` de `apps/web/src/engine/input/gesture.ts:26` (import de type seulement).
- Produit (toutes dans `toolbar.ts`, signatures exactes) :
```ts
export const PROFILE_FORMAT = "roomboard-profile";
export const PROFILE_SCHEMA = 1;
export const PROFILE_MINOR = 0;
export type Dock = "top" | "bottom" | "left" | "right" | "floating";
export const DOCKS: readonly Dock[];
export type ItemKind = "tool" | "action" | "dropzone" | "separator";
export type ButtonSize = "s" | "m" | "l";
export type StartMode = "board" | "desktop-annotation";
export type ToolId = string;
export type ActionId = string;
export type CapabilityKey = "desktopAnnotation" | "multiWindow" | "dropPaths" | "officeConverter";
export const CAPABILITY_KEYS: readonly CapabilityKey[];
export type RuntimeCapabilities = Readonly<Record<CapabilityKey, boolean>>;
export type Rest = Readonly<Record<string, unknown>>;
export interface ToolItem {
  readonly id: string;
  readonly kind: ItemKind;
  readonly tool?: ToolId;
  readonly action?: ActionId;
  readonly label: string;
  readonly icon?: string;
  readonly options?: Rest;
  readonly requires: readonly CapabilityKey[];
  readonly rest: Rest;
}
export interface ToolbarGroup { readonly id: string; readonly items: readonly ToolItem[]; readonly rest: Rest }
export interface Toolbar {
  readonly id: string;
  readonly role: string;
  readonly dock: Dock;
  readonly collapsed: boolean;
  readonly groups: readonly ToolbarGroup[];
  readonly rest: Rest;
}
export interface Preset {
  readonly id: string;
  readonly label: string;
  readonly color?: string;
  readonly width?: number;
  readonly size?: number;
  readonly rest: Rest;
}
export interface Profile {
  readonly schema: number;
  readonly minor: number;
  readonly id: string;
  readonly label: string;
  readonly interface: { readonly buttonSize: ButtonSize; readonly rest: Rest };
  readonly toolbars: readonly Toolbar[];
  readonly presets: Readonly<Record<ToolId, readonly Preset[]>>;
  readonly behavior: { readonly startMode: StartMode; readonly rest: Rest };
  readonly rest: Rest;
}
export type ParsedProfile = { readonly profile: Profile; readonly warnings: string[] } | { readonly errors: string[] };
export interface ToolEntry { readonly label: string; readonly choice: ToolChoice }
export const TOOL_TABLE: Readonly<Record<ToolId, ToolEntry>>;
export const ACTION_TABLE: Readonly<Record<ActionId, { readonly label: string }>>;
export function isKnownTool(id: string): boolean;
export function isKnownAction(id: string): boolean;
export function parseProfile(json: unknown): ParsedProfile;
export function serializeProfile(p: Profile): Record<string, unknown>;
export function visibleItems(bar: Toolbar, caps: RuntimeCapabilities): ToolItem[];
export function resolveStartMode(p: Profile, caps: RuntimeCapabilities): { readonly mode: "board"; readonly fellBack: boolean };
export function resetItemOptions(p: Profile, itemId: string): Profile;
export function resetPresets(p: Profile, tool: ToolId, from: Profile): Profile;
```
- Produit (dans `toolbar-profiles.ts`) :
```ts
export const DEFAULT_PROFILE_ID = "defaut";
export const SIMPLE_PROFILE_ID = "simple";
export const DEFAULT_PROFILE_JSON: Readonly<Record<string, unknown>>;
export const SIMPLE_PROFILE_JSON: Readonly<Record<string, unknown>>;
/** Profils livrés, en lecture seule (usage § 8 point 7) ; lève au chargement du module si l'un est invalide. */
export const BUILTIN_PROFILES: readonly Profile[];
export function builtinProfile(id: string): Profile | null;
```

**Patron à ne pas reprendre.** Analyser en recopiant seulement les champs connus (`{ id: o.id, label: o.label, … }`) :
les clés inconnues disparaissent à la réécriture (U11, U13, scénario d'usage S2). Chaque objet garde ses clés inconnues
dans `rest`, et `serializeProfile` écrit `{ ...rest, ...champs connus }` à chaque niveau (profil, `interface`, barre,
groupe, élément, préréglage, `behavior`). Chemin de référence du même problème, côté Rust : le style des traits gardé
en champs du Y.Map pour des octets stables (`crates/roomboard-core/src/document.rs:60-75`). Autre patron interdit : un
outil inconnu traité comme une erreur (c'était le contrôle de DA10 ; U13 le remplace par « gardé, masqué, réécrit »).

**Règles de `parseProfile`** (chaque règle a son test) :
1. Pas un objet → `{ errors: ["profil : objet JSON attendu"] }`. `format` différent → erreur.
2. `schema` entier ≥ 1, sinon erreur ; `schema > PROFILE_SCHEMA` → erreur dont le texte contient
   « mettez RoomBoard à jour ». `minor` absent = 0 ; `minor > PROFILE_MINOR` → avertissement « clés inconnues conservées ».
3. `id`, `label` : chaînes non vides. `interface.buttonSize` ∈ `s|m|l`, absent = `m`, autre = erreur.
4. `toolbars` : liste obligatoire ; barre : `id` non vide, `role` chaîne non vide, `dock` ∈ `DOCKS` (sinon erreur),
   `collapsed` booléen (absent = false), `groups` liste ; groupe : `id`, `items` liste.
5. Élément : `id` non vide et **unique dans tout le profil** (« doublon : <id> ») ; `kind` ∈ les quatre (sinon erreur) ;
   `label` non vide pour `tool`, `action`, `dropzone` (« libellé vide : <id> ») ; `tool` exigé pour `kind: "tool"`,
   `action` pour `kind: "action"` ; outil ou action absents des tables → **avertissement** « outil inconnu masqué : <x> »
   ou « action inconnue masquée : <x> », l'élément est gardé ; `requires` : liste de `CapabilityKey` (absent = `[]`,
   clé inconnue = avertissement, l'élément devient alors invisible) ; `options` objet ou absent.
6. `presets` : objet (absent = `{}`) de listes ; préréglage : `id`, `label` non vides, `color` chaîne, `width` et
   `size` nombres finis > 0 si présents.
7. `behavior.startMode` ∈ `START_MODES`, absent = `board`, autre chaîne = avertissement et `board` (CL5b-16).
8. Toutes les erreurs sont rassemblées (pas d'arrêt à la première, sauf règles 1-2).

`visibleItems` : éléments des groupes à plat ; garde `tool` connu, `action` connue, `dropzone` et `separator` ; retire
ceux dont une capacité de `requires` est fausse (ou inconnue) ; puis retire les séparateurs en tête, en fin et doublés.
`resolveStartMode` : toujours `{ mode: "board" }` au lot 5b ; `fellBack` vrai si le profil demande
`desktop-annotation` (capacité absente, ou mode non livré) (U14, usage § 8 point 11).

**Profils livrés** (`toolbar-profiles.ts`) — `DEFAULT_PROFILE_JSON` :
```ts
const tool = (id: string, label: string) => ({ id, kind: "tool", tool: id, label });
const action = (id: string, label: string) => ({ id, kind: "action", action: id, label });
const sep = (id: string) => ({ id, kind: "separator", label: "" });

export const DEFAULT_PROFILE_JSON = Object.freeze({
  format: "roomboard-profile",
  schema: 1,
  id: "defaut",
  label: "Par défaut",
  interface: { buttonSize: "m" },
  toolbars: [
    {
      id: "outils",
      role: "tools",
      dock: "top",
      groups: [
        { id: "dessin", items: [tool("pen", "Stylo"), tool("eraser", "Gomme"), action("eraser-mode", "Gomme : partielle"), tool("hand", "Main")] },
        { id: "edition", items: [sep("sep-1"), tool("select", "Sélection"), tool("rect", "Rectangle"), tool("ellipse", "Ellipse"), tool("line", "Ligne"), tool("arrow", "Flèche"), tool("text", "Texte")] },
        { id: "historique", items: [sep("sep-2"), action("undo", "Annuler"), action("redo", "Rétablir")] },
        { id: "fichier", items: [sep("sep-3"), action("file-new", "Nouveau"), action("file-open", "Ouvrir"), action("file-save", "Enregistrer"), action("file-save-as", "Enregistrer sous")] },
        { id: "vue", items: [sep("sep-4"), action("fit-page", "Ajuster la page"), action("profiles", "Profil"), action("settings", "Réglages")] },
      ],
    },
    {
      id: "pages",
      role: "pages",
      dock: "bottom",
      groups: [{ id: "pages", items: [action("page-prev", "Page précédente"), action("page-next", "Page suivante"), action("page-add", "Ajouter une page"), action("page-remove", "Retirer la page")] }],
    },
  ],
  presets: {
    pen: [
      { id: "noir", label: "Noir", color: "#000000", width: 4 },
      { id: "rouge", label: "Rouge", color: "#dc2626", width: 4 },
      { id: "bleu", label: "Bleu", color: "#1d4ed8", width: 4 },
    ],
  },
  behavior: { startMode: "board" },
});
```
`SIMPLE_PROFILE_JSON` : même forme, `id: "simple"`, `label: "Simple (grands boutons)"`, `buttonSize: "l"`, barre
`outils` en `dock: "left"` avec `pen`, `eraser`, `hand`, `sep-1`, `undo`, `redo`, `sep-2`, `fit-page`, `profiles`,
`settings` ; barre `pages` identique à `defaut` ; `presets` identiques.

**Test et commande bornée.**
`cd <worktree> && pnpm --filter @roomboard/web exec vitest run src/toolbar.test.ts src/toolbar-profiles.test.ts 2>&1 | tail -15`
→ ≥ 18 tests, aucun `FAIL `, noms « majeure supérieure refusée » et « mineure supérieure : clés conservées » présents.
Puis `pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -5` sans erreur. Tests de logique pure de la section 8
servis ici : profil valide ; majeure supérieure refusée ; mineure supérieure ; outil inconnu gardé et masqué ; capacité
absente (élément masqué, `startMode` rabattu).

**Contraintes.**
- Toutes les commandes visent le worktree donné par l'orchestrateur : `cd <worktree> && …` ; avant toute commande
  cargo ou wasm : `export PATH=$HOME/.cargo/bin:$PATH`.
- Worktree neuf : `pnpm install --frozen-lockfile` à la racine ; si `apps/web/src/wasm/` manque (contrat, build web,
  essais), lancer une fois `PATH=$HOME/.cargo/bin:$PATH scripts/verifier.sh 2>&1 | tail -30` au premier plan.
- TDD : le test d'abord, montré rouge (sortie copiée dans le rapport), puis le code, puis vert.
- Aucun test désactivé (`.skip`, `.only`, `#[ignore]` neuf), aucun seuil baissé. Un test qui dépend d'un délai et
  échoue est rejoué une fois ; s'il échoue encore, c'est un échec.
- Commandes longues (verifier.sh, build, essais Playwright) au premier plan avec `timeout: 600000`, jamais en
  `run_in_background`. Sous-agents et relecteurs lancés au premier plan, `run_in_background: false` écrit explicitement.
- Builds Tauri : au plus 2 pour tout le lot sur la VM (le `cargo check` de T87 et le build release de T97), un seul à
  la fois, `CARGO_BUILD_JOBS=2`. Aucune autre tâche ne compile `apps/desktop/src-tauri`. Aucun build Android.
- `git add` fichier par fichier ; jamais `git add -A`, `git add .`, `git commit -a` ; jamais `--force` ; aucun tag,
  aucune release ; `.github/workflows/` non touché.
- Commit : auteur `jejeasterix <jejeasterix@users.noreply.github.com>` (déjà réglé), message en anglais, dernière ligne
  exactement `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (jamais « Sonnet »).
- SolidJS seulement dans `apps/web/src/ui/` (D21) ; `src/engine/` n'importe aucun framework ni `src/ui/`.
- Aucune ressource réseau à l'exécution (D27) : polices et icônes embarquées ; `scripts/controle-hors-ligne.mjs` reste
  vert. Ne jamais retirer `"plugins": { "fs": { "scopeDroppedPaths": false } }` de `tauri.conf.json`.
- Composants de barre : aucun appel à `localStorage` (passer par `ProfileStore`), aucun `switch` ni chaîne de `if` sur
  un identifiant d'outil ou d'action (tables), aucune dimension en pixels (jetons CSS `--rb-btn-s|m|l`), aucun état
  propre au document (tout vient du profil, des capacités et de l'état publié par le moteur), aucun glisser HTML5
  (`draggable`, `dragstart`) dans l'interface.
- Choix du lot 4 gardés (CL4-1 à CL4-15) : aperçus d'édition sur la scène Canvas 2D, `<textarea>` visible, validation
  différée pendant l'IME, retirer la page montrée montre la précédente.
- Réglages `engine/settings.ts` (É2 `prediction`, É3 `inkTrail`, É4 `webgl`, `palm`, `finger`) : défauts et
  adresse `?echelons=`, `?paume=`, `?doigt=` inchangés ; aucun ne se perd dans l'interface neuve.
- Le rapport de la tâche porte, pour chaque ligne `Réutilise :` de sa section, `Réutilisation : appelé <module>` ou
  `Réutilisation : écart — <pourquoi>`.

**Interdits.** Aucun DOM, aucun `localStorage` (T89). Ne pas retirer `ToolDef`, `toolbar`, `validateToolbar` (T95 le
fera). Aucun `switch` sur un identifiant d'outil.

**Terminé quand** les tests ci-dessous passent, les anciens tests de `toolbar.test.ts` aussi, et les deux profils livrés
se chargent.

**Étapes.**
1. Tests, rouges : ajouter à `apps/web/src/toolbar.test.ts` (garder les tests existants) :
```ts
import { describe, expect, it } from "vitest";
import {
  ACTION_TABLE, CAPABILITY_KEYS, parseProfile, resetItemOptions, resetPresets, resolveStartMode, serializeProfile,
  TOOL_TABLE, visibleItems, type Profile, type RuntimeCapabilities,
} from "./toolbar";

const ALL: RuntimeCapabilities = { desktopAnnotation: true, multiWindow: true, dropPaths: true, officeConverter: true };
const NONE: RuntimeCapabilities = { desktopAnnotation: false, multiWindow: false, dropPaths: false, officeConverter: false };

function base(): Record<string, unknown> {
  return {
    format: "roomboard-profile",
    schema: 1,
    id: "essai",
    label: "Essai",
    toolbars: [
      {
        id: "outils",
        role: "tools",
        dock: "top",
        groups: [{ id: "g", items: [{ id: "pen", kind: "tool", tool: "pen", label: "Stylo" }, { id: "undo", kind: "action", action: "undo", label: "Annuler" }] }],
      },
    ],
  };
}
const ok = (json: unknown): { profile: Profile; warnings: string[] } => {
  const r = parseProfile(json);
  if ("errors" in r) throw new Error(r.errors.join(" ; "));
  return r;
};
const errs = (json: unknown): string[] => {
  const r = parseProfile(json);
  return "errors" in r ? r.errors : [];
};

describe("profil de barre (T83, usage § 8)", () => {
  it("profil valide : défauts posés (taille m, board, presets vides, collapsed faux)", () => {
    const { profile, warnings } = ok(base());
    expect(warnings).toEqual([]);
    expect(profile.interface.buttonSize).toBe("m");
    expect(profile.behavior.startMode).toBe("board");
    expect(profile.presets).toEqual({});
    expect(profile.toolbars[0]?.collapsed).toBe(false);
    expect(profile.toolbars[0]?.dock).toBe("top");
  });

  it("majeure supérieure refusée", () => {
    expect(errs({ ...base(), schema: 2 }).join(" ")).toContain("mettez RoomBoard à jour");
  });

  it("mineure supérieure : clés conservées à la réécriture, à chaque niveau", () => {
    const json = base();
    json.minor = 3;
    json.futur = { a: 1 };
    const bar = (json.toolbars as Record<string, unknown>[])[0]!;
    bar.couleur = "bleu";
    const group = (bar.groups as Record<string, unknown>[])[0]!;
    group.repli = true;
    const item = (group.items as Record<string, unknown>[])[0]!;
    item.raccourci = "P";
    json.interface = { buttonSize: "l", theme: "sombre" };
    json.behavior = { startMode: "board", pageDefaut: "seyes" };
    json.presets = { pen: [{ id: "n", label: "Noir", color: "#000", width: 4, opacite: 0.5 }] };
    const { profile, warnings } = ok(json);
    expect(warnings.join(" ")).toContain("clés inconnues conservées");
    const again = serializeProfile(profile) as Record<string, any>;
    expect(again.futur).toEqual({ a: 1 });
    expect(again.minor).toBe(3);
    expect(again.toolbars[0].couleur).toBe("bleu");
    expect(again.toolbars[0].groups[0].repli).toBe(true);
    expect(again.toolbars[0].groups[0].items[0].raccourci).toBe("P");
    expect(again.interface.theme).toBe("sombre");
    expect(again.behavior.pageDefaut).toBe("seyes");
    expect(again.presets.pen[0].opacite).toBe(0.5);
    expect(ok(again).profile).toEqual(profile);
  });

  it("outil inconnu gardé, masqué, réécrit tel quel", () => {
    const json = base();
    const items = ((json.toolbars as any[])[0].groups[0].items as unknown[]);
    items.push({ id: "laser", kind: "tool", tool: "laser", label: "Laser" });
    const { profile, warnings } = ok(json);
    expect(warnings).toContain("outil inconnu masqué : laser");
    expect(profile.toolbars[0]!.groups[0]!.items.map((i) => i.id)).toContain("laser");
    expect(visibleItems(profile.toolbars[0]!, ALL).map((i) => i.id)).toEqual(["pen", "undo"]);
    expect(JSON.stringify(serializeProfile(profile))).toContain('"tool":"laser"');
  });

  it("action inconnue gardée et masquée", () => {
    const json = base();
    ((json.toolbars as any[])[0].groups[0].items as unknown[]).push({ id: "x", kind: "action", action: "teleporter", label: "X" });
    const { profile, warnings } = ok(json);
    expect(warnings).toContain("action inconnue masquée : teleporter");
    expect(visibleItems(profile.toolbars[0]!, ALL).map((i) => i.id)).not.toContain("x");
  });

  it("doublon d'id et libellé vide : erreurs (contrôles de validateToolbar gardés), toutes rassemblées", () => {
    const json = base();
    const items = (json.toolbars as any[])[0].groups[0].items as unknown[];
    items.push({ id: "pen", kind: "tool", tool: "eraser", label: "Gomme" });
    items.push({ id: "redo", kind: "action", action: "redo", label: "  " });
    const e = errs(json);
    expect(e).toContain("doublon : pen");
    expect(e).toContain("libellé vide : redo");
  });

  it("dock, kind et buttonSize invalides : erreurs", () => {
    const json = base();
    (json.toolbars as any[])[0].dock = "haut";
    ((json.toolbars as any[])[0].groups[0].items as any[])[0].kind = "bouton";
    json.interface = { buttonSize: "xl" };
    const e = errs(json).join(" | ");
    expect(e).toContain("dock");
    expect(e).toContain("kind");
    expect(e).toContain("buttonSize");
  });

  it("capacité absente : élément masqué, startMode rabattu sur board", () => {
    const json = base();
    ((json.toolbars as any[])[0].groups[0].items as unknown[]).push({ id: "drop", kind: "dropzone", label: "Déposer", requires: ["dropPaths"] });
    json.behavior = { startMode: "desktop-annotation" };
    const { profile } = ok(json);
    expect(visibleItems(profile.toolbars[0]!, NONE).map((i) => i.id)).toEqual(["pen", "undo"]);
    expect(visibleItems(profile.toolbars[0]!, ALL).map((i) => i.id)).toEqual(["pen", "undo", "drop"]);
    expect(resolveStartMode(profile, NONE)).toEqual({ mode: "board", fellBack: true });
    expect(resolveStartMode(profile, ALL)).toEqual({ mode: "board", fellBack: true }); // seul board est honoré au lot 5b
  });

  it("séparateurs : jamais en tête, en fin, ni doublés", () => {
    const json = base();
    (json.toolbars as any[])[0].groups = [
      { id: "a", items: [{ id: "s0", kind: "separator", label: "" }, { id: "pen", kind: "tool", tool: "pen", label: "Stylo" }] },
      { id: "b", items: [{ id: "s1", kind: "separator", label: "" }, { id: "laser", kind: "tool", tool: "laser", label: "L" }, { id: "s2", kind: "separator", label: "" }] },
      { id: "c", items: [{ id: "undo", kind: "action", action: "undo", label: "Annuler" }, { id: "s3", kind: "separator", label: "" }] },
    ];
    expect(visibleItems(ok(json).profile.toolbars[0]!, ALL).map((i) => i.id)).toEqual(["pen", "s1", "undo"]);
  });

  it("préréglages séparés des options ; deux remises à zéro", () => {
    const json = base();
    ((json.toolbars as any[])[0].groups[0].items as any[])[0].options = { epaisseur: 9 };
    json.presets = { pen: [{ id: "rose", label: "Rose", color: "#f0f", width: 2 }] };
    const p = ok(json).profile;
    const from = ok({ ...base(), presets: { pen: [{ id: "noir", label: "Noir", color: "#000", width: 4 }] } }).profile;
    expect(resetItemOptions(p, "pen").toolbars[0]!.groups[0]!.items[0]!.options).toBeUndefined();
    expect(resetItemOptions(p, "pen").presets).toEqual(p.presets);
    expect(resetPresets(p, "pen", from).presets.pen!.map((x) => x.id)).toEqual(["noir"]);
    expect(resetPresets(p, "pen", from).toolbars).toEqual(p.toolbars);
  });

  it("tables : chaque outil du moteur a son entrée ; actions de l'ancienne barre présentes", () => {
    expect(Object.keys(TOOL_TABLE).sort()).toEqual(["arrow", "ellipse", "eraser", "hand", "line", "pen", "rect", "select", "text"]);
    for (const a of ["eraser-mode", "undo", "redo", "page-prev", "page-next", "page-add", "page-remove", "fit-page", "file-new", "file-open", "file-save", "file-save-as", "settings", "profiles"]) {
      expect(ACTION_TABLE[a], a).toBeDefined();
    }
    expect(CAPABILITY_KEYS).toEqual(["desktopAnnotation", "multiWindow", "dropPaths", "officeConverter"]);
  });

  it("aller-retour : parse(serialize(p)) = p", () => {
    const p = ok(base()).profile;
    expect(ok(serializeProfile(p)).profile).toEqual(p);
  });
});
```
   Et `apps/web/src/toolbar-profiles.test.ts` :
```ts
import { describe, expect, it } from "vitest";
import { BUILTIN_PROFILES, builtinProfile, DEFAULT_PROFILE_JSON, SIMPLE_PROFILE_JSON } from "./toolbar-profiles";
import { parseProfile, visibleItems } from "./toolbar";

const ALL = { desktopAnnotation: true, multiWindow: true, dropPaths: true, officeConverter: true };
const ids = (id: string): string[] =>
  builtinProfile(id)!.toolbars.flatMap((b) => b.groups.flatMap((g) => g.items.map((i) => i.id)));

describe("profils livrés (T83, CL5b-9)", () => {
  it("defaut et simple sont valides, sans avertissement", () => {
    for (const json of [DEFAULT_PROFILE_JSON, SIMPLE_PROFILE_JSON]) {
      const r = parseProfile(json);
      expect("errors" in r ? r.errors : r.warnings).toEqual([]);
    }
    expect(BUILTIN_PROFILES.map((p) => p.id)).toEqual(["defaut", "simple"]);
  });

  it("defaut porte chaque bouton de l'ancienne barre (inventaire du plan)", () => {
    for (const id of ["pen", "eraser", "hand", "eraser-mode", "undo", "redo", "select", "rect", "ellipse", "line", "arrow", "text",
      "page-prev", "page-next", "page-add", "page-remove", "file-new", "file-open", "file-save", "file-save-as", "fit-page", "settings", "profiles"]) {
      expect(ids("defaut"), id).toContain(id);
    }
  });

  it("toolbars en liste : la barre des pages est une entrée (role pages), chacune avec son dock", () => {
    const d = builtinProfile("defaut")!;
    expect(d.toolbars.map((b) => [b.id, b.role, b.dock])).toEqual([["outils", "tools", "top"], ["pages", "pages", "bottom"]]);
    expect(builtinProfile("simple")!.toolbars.map((b) => b.dock)).toEqual(["left", "bottom"]);
    expect(builtinProfile("simple")!.interface.buttonSize).toBe("l");
  });

  it("simple n'a ni formes ni texte (changement de profil visible à l'e2e)", () => {
    const visible = visibleItems(builtinProfile("simple")!.toolbars[0]!, ALL).map((i) => i.id);
    expect(visible).toContain("pen");
    expect(visible).not.toContain("rect");
  });

  it("profils figés ; id inconnu : null", () => {
    expect(Object.isFrozen(DEFAULT_PROFILE_JSON)).toBe(true);
    expect(builtinProfile("inconnu")).toBeNull();
  });
});
```
   `cd <worktree> && pnpm --filter @roomboard/web exec vitest run src/toolbar.test.ts src/toolbar-profiles.test.ts 2>&1 | tail -15`
   → rouges (exports absents).
2. Écrire `toolbar.ts` : types et tables ci-dessus, puis `parseProfile` par petites fonctions (`parseItem`,
   `parseGroup`, `parseBar`, `parsePreset`) qui reçoivent `(raw, path, errors, warnings, seen: Set<string>)` et rendent
   l'objet avec `rest = restOf(raw, KNOWN_KEYS)` ; `serializeProfile` à l'inverse, `{ ...rest, ...connus }`, sans écrire
   les champs absents (`options`, `icon`, `color`…) ni `requires` vide ; `minor` écrit seulement s'il est > 0 ;
   `format` toujours écrit. Le figement des profils livrés : `Object.freeze` récursif dans `toolbar-profiles.ts`.
3. `toolbar-profiles.ts` : JSON ci-dessus, `BUILTIN_PROFILES` par `parseProfile` (lève avec la liste des erreurs si l'un
   est invalide), `builtinProfile(id)`.
4. Vert, puis `tsc --noEmit`. Commit : `feat(web): versioned toolbar profiles with builtin defaut and simple`.

<a id="tache-t84"></a>
### Tâche T84 — Page infinie en hauteur dans le rendu, « Ajuster la page » par la largeur, diagnostics WebGL2

**Objectif.** D5 amendée : la page garde sa largeur (1920), sa hauteur s'étend vers le bas sans limite ; « Ajuster la
page » cadre la largeur (CL5b-7). Le rendu Canvas 2D et WebGL2 dessinent le fond de page de y = 0 jusqu'au bas de la
vue. Constat du lot 3b : `badColors` et `lost` (WebGL2) exposés par `RendererChoice.diagnostics()` pour la barre (T92).

**Fichiers.** `apps/web/src/engine/camera.ts`, `camera.test.ts`, `apps/web/src/engine/page.ts`, `page.test.ts` (neuf),
`apps/web/src/engine/render/canvas2d.ts`, `canvas2d.test.ts`, `render/webgl2.ts`, `webgl2.test.ts`, `render/select.ts`,
`select.test.ts`.

**Interfaces.**
- Réutilise : `apps/web/src/engine/camera.ts:38` — `fitPage` gardé (tests existants), `fitWidth` ajouté à côté.
- Réutilise : `apps/web/src/engine/render/webgl2.ts:266,290` — `badColors`, `lost`, lus tels quels.
- Produit :
```ts
// camera.ts
/** « Ajuster la page » (D5 amendée, CL5b-7) : largeur de page × margin, centrée ; haut de page à `top` px. */
export function fitWidth(viewW: number, viewH: number, pageW: number = PAGE_WIDTH, margin = 0.95, top = 16): Camera;
// page.ts
export interface PageRect { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number }
/** Fond de page visible (monde) : x de 0 à PAGE_WIDTH, y de 0 au bas de la vue ; null si le haut de page est sous la vue. */
export function visiblePageRect(c: Camera, viewH: number): PageRect | null;
// select.ts
export interface RendererDiagnostics {
  readonly webgl: "on" | "off" | "repli";
  readonly lost: boolean;
  readonly badColors: readonly string[];
}
// RendererChoice gagne : diagnostics(): RendererDiagnostics;
```
- `PAGE_HEIGHT` reste exporté (hauteur minimale écrite dans le format, `crates/roomboard-core/src/document.rs:69`) ;
  aucun changement du cœur Rust : `document.rs:453` (`(1920.0, 1080.0)`) reste vert.

**Test et commande bornée.**
`cd <worktree> && pnpm --filter @roomboard/web exec vitest run src/engine/camera.test.ts src/engine/page.test.ts src/engine/render 2>&1 | tail -15`
→ aucun `FAIL `, noms « page dessinée jusqu'au bas de la vue » (canvas2d et webgl2) et « fitWidth cadre la largeur »
présents. Tests à garder verts : tous ceux de `src/engine/render/` et `camera.test.ts` existants.

**Contraintes.**
- Toutes les commandes visent le worktree donné par l'orchestrateur : `cd <worktree> && …` ; avant toute commande
  cargo ou wasm : `export PATH=$HOME/.cargo/bin:$PATH`.
- Worktree neuf : `pnpm install --frozen-lockfile` à la racine ; si `apps/web/src/wasm/` manque (contrat, build web,
  essais), lancer une fois `PATH=$HOME/.cargo/bin:$PATH scripts/verifier.sh 2>&1 | tail -30` au premier plan.
- TDD : le test d'abord, montré rouge (sortie copiée dans le rapport), puis le code, puis vert.
- Aucun test désactivé (`.skip`, `.only`, `#[ignore]` neuf), aucun seuil baissé. Un test qui dépend d'un délai et
  échoue est rejoué une fois ; s'il échoue encore, c'est un échec.
- Commandes longues (verifier.sh, build, essais Playwright) au premier plan avec `timeout: 600000`, jamais en
  `run_in_background`. Sous-agents et relecteurs lancés au premier plan, `run_in_background: false` écrit explicitement.
- Builds Tauri : au plus 2 pour tout le lot sur la VM (le `cargo check` de T87 et le build release de T97), un seul à
  la fois, `CARGO_BUILD_JOBS=2`. Aucune autre tâche ne compile `apps/desktop/src-tauri`. Aucun build Android.
- `git add` fichier par fichier ; jamais `git add -A`, `git add .`, `git commit -a` ; jamais `--force` ; aucun tag,
  aucune release ; `.github/workflows/` non touché.
- Commit : auteur `jejeasterix <jejeasterix@users.noreply.github.com>` (déjà réglé), message en anglais, dernière ligne
  exactement `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (jamais « Sonnet »).
- SolidJS seulement dans `apps/web/src/ui/` (D21) ; `src/engine/` n'importe aucun framework ni `src/ui/`.
- Aucune ressource réseau à l'exécution (D27) : polices et icônes embarquées ; `scripts/controle-hors-ligne.mjs` reste
  vert. Ne jamais retirer `"plugins": { "fs": { "scopeDroppedPaths": false } }` de `tauri.conf.json`.
- Composants de barre : aucun appel à `localStorage` (passer par `ProfileStore`), aucun `switch` ni chaîne de `if` sur
  un identifiant d'outil ou d'action (tables), aucune dimension en pixels (jetons CSS `--rb-btn-s|m|l`), aucun état
  propre au document (tout vient du profil, des capacités et de l'état publié par le moteur), aucun glisser HTML5
  (`draggable`, `dragstart`) dans l'interface.
- Choix du lot 4 gardés (CL4-1 à CL4-15) : aperçus d'édition sur la scène Canvas 2D, `<textarea>` visible, validation
  différée pendant l'IME, retirer la page montrée montre la précédente.
- Réglages `engine/settings.ts` (É2 `prediction`, É3 `inkTrail`, É4 `webgl`, `palm`, `finger`) : défauts et
  adresse `?echelons=`, `?paume=`, `?doigt=` inchangés ; aucun ne se perd dans l'interface neuve.
- Le rapport de la tâche porte, pour chaque ligne `Réutilise :` de sa section, `Réutilisation : appelé <module>` ou
  `Réutilisation : écart — <pourquoi>`.

**Interdits.** Ne pas toucher `engine.ts` (T90 y branche `fitWidth`). Ne pas changer `PAGE_WIDTH`, `PAGE_HEIGHT`, ni le
cœur Rust. Aucune limite basse au défilement.

**Terminé quand** les deux rendus peignent le fond de page jusqu'au bas de la vue quel que soit `ty`, et
`diagnostics()` rend l'état WebGL2 (sur faux contexte).

**Étapes.**
1. Tests rouges. `camera.test.ts` (ajout) :
```ts
import { fitWidth } from "./camera";
it("fitWidth cadre la largeur : 95 % de la vue, centrée, haut de page à 16 px", () => {
  const c = fitWidth(1000, 400);
  expect(c.zoom).toBeCloseTo((1000 / 1920) * 0.95, 10);
  expect(c.tx).toBeCloseTo((1000 - 1920 * c.zoom) / 2, 10);
  expect(c.ty).toBe(16);
});
it("fitWidth ne dépend pas de la hauteur de la vue (page infinie)", () => {
  expect(fitWidth(1000, 400).zoom).toBe(fitWidth(1000, 4000).zoom);
});
it("fitWidth : vue vide → identité", () => {
  expect(fitWidth(0, 300)).toEqual({ zoom: 1, tx: 0, ty: 0 });
});
```
   `page.test.ts` (neuf) :
```ts
import { describe, expect, it } from "vitest";
import { PAGE_WIDTH, visiblePageRect } from "./page";

describe("page infinie en hauteur (D5 amendée)", () => {
  it("le fond va jusqu'au bas de la vue, même loin sous 1080", () => {
    expect(visiblePageRect({ zoom: 1, tx: 0, ty: -5000 }, 600)).toEqual({ x0: 0, y0: 0, x1: PAGE_WIDTH, y1: 5600 });
    expect(visiblePageRect({ zoom: 0.5, tx: 10, ty: 20 }, 600)).toEqual({ x0: 0, y0: 0, x1: PAGE_WIDTH, y1: 1160 });
  });
  it("haut de page sous la vue : rien à peindre", () => {
    expect(visiblePageRect({ zoom: 1, tx: 0, ty: 700 }, 600)).toBeNull();
  });
});
```
   `canvas2d.test.ts` : test « page dessinée jusqu'au bas de la vue » — vue 800 × 600, caméra `{ zoom: 1, tx: 0, ty: -5000 }`,
   `drawScene` : le rectangle de fond de page enregistré par le faux contexte vaut `(0, 0, 1920, 5600)` (et non
   `1080`). Même test pour `webgl2.test.ts` : le ciseau du fond de page va jusqu'au bas du tampon (`bufH`) quand
   `ty < 0`. `select.test.ts` : `diagnostics()` rend `{ webgl: "off", lost: false, badColors: [] }` sans WebGL ;
   `{ webgl: "repli", … }` quand le contexte manque ; avec le faux GL : une couleur invalide tracée apparaît dans
   `badColors`, `webglcontextlost` simulé (`fake-gl.ts:82`) met `lost` à vrai.
2. `camera.ts` :
```ts
export function fitWidth(viewW: number, viewH: number, pageW: number = PAGE_WIDTH, margin = 0.95, top = 16): Camera {
  if (!(viewW > 0) || !(viewH > 0)) return IDENTITY;
  const zoom = clampZoom((viewW / pageW) * margin);
  return { zoom, tx: (viewW - pageW * zoom) / 2, ty: top };
}
```
3. `page.ts` (import de type `Camera` depuis `./camera` : aucun cycle à l'exécution) :
```ts
export function visiblePageRect(c: Camera, viewH: number): PageRect | null {
  const bottom = (viewH - c.ty) / c.zoom;
  if (!(bottom > 0)) return null;
  return { x0: 0, y0: 0, x1: PAGE_WIDTH, y1: bottom };
}
```
4. `canvas2d.ts:133` et `:301-304` : remplacer `PAGE_HEIGHT` par `visiblePageRect(camera, cssHeight)` (hauteur CSS
   retenue par `resize`) ; `null` → pas de fond de page, pourtour seul. `webgl2.ts:77-79` : le bas du ciseau devient
   `bufH` si `visiblePageRect` n'est pas `null`. Mettre à jour le commentaire d'en-tête de `page.ts` (« Cadre de page
   (D5 amendée : largeur fixe, hauteur sans fin) »).
5. `select.ts` : `diagnostics()` dans les trois branches de `chooseRenderer` (la branche WebGL2 lit `badColors` et `lost`
   de l'instance créée).
6. Vert (commande de la preuve). Commit : `feat(engine): infinite page height and width fit, WebGL2 diagnostics`.

<a id="tache-t85"></a>
### Tâche T85 — Module commun des scripts d'essai, migration de S2 et de l'essai des fichiers

**Objectif.** Fermer le constat du lot 4 : `scripts/essais/commun.mjs` devient le seul endroit de `loadPlaywright`,
`serve`, `ink`, `frames` ; `s2-navigateur.mjs` et `fichiers-navigateur.mjs` l'importent au lieu de leurs copies.
Comportement inchangé, prouvé sur le build actuel (avant l'interface SolidJS).

**Fichiers.** `scripts/essais/commun.mjs`, `scripts/essais/s2-navigateur.mjs`, `scripts/essais/fichiers-navigateur.mjs`.

**Interfaces.**
- Réutilise : `scripts/essais/commun.mjs:11-80` — `ROOT`, `DIST`, `Echec`, `loadPlaywright()`, `serve()`, `gitSha()`,
  `frames(page)`, `inkIn(page, box)`.
- Produit : `serve(options?: { headers?: Record<string, string> })` — en-têtes ajoutés à chaque réponse (l'essai des
  fichiers y passe la CSP de la coque, aujourd'hui `fichiers-navigateur.mjs:53-79`) ; sans option, identique à l'actuel.

**Test et commande bornée.** Build d'abord (`apps/web/src/wasm/` présent, sinon verifier.sh une fois) :
`cd <worktree> && pnpm --filter @roomboard/web build 2>&1 | tail -3 && node scripts/essais/s2-navigateur.mjs 2>&1 | tail -3 && node scripts/essais/s2-navigateur.mjs --lot3b 2>&1 | tail -2 && node scripts/essais/fichiers-navigateur.mjs 2>&1 | tail -2`
→ `S2 lot 3 : OK`, `S2 lot 3b : OK (4 passages)`, `Fichiers lot 5a : OK (3 modes)` ; puis
`grep -cE "^(async )?function (loadPlaywright|serve)\b" scripts/essais/s2-navigateur.mjs scripts/essais/fichiers-navigateur.mjs` → `0` et `0`.
Code de sortie 2 (« outil absent ») = échec de la tâche : Playwright est dans `~/.npm/_npx/*/node_modules/playwright`.

**Contraintes.**
- Toutes les commandes visent le worktree donné par l'orchestrateur : `cd <worktree> && …` ; avant toute commande
  cargo ou wasm : `export PATH=$HOME/.cargo/bin:$PATH`.
- Worktree neuf : `pnpm install --frozen-lockfile` à la racine ; si `apps/web/src/wasm/` manque (contrat, build web,
  essais), lancer une fois `PATH=$HOME/.cargo/bin:$PATH scripts/verifier.sh 2>&1 | tail -30` au premier plan.
- TDD : le test d'abord, montré rouge (sortie copiée dans le rapport), puis le code, puis vert.
- Aucun test désactivé (`.skip`, `.only`, `#[ignore]` neuf), aucun seuil baissé. Un test qui dépend d'un délai et
  échoue est rejoué une fois ; s'il échoue encore, c'est un échec.
- Commandes longues (verifier.sh, build, essais Playwright) au premier plan avec `timeout: 600000`, jamais en
  `run_in_background`. Sous-agents et relecteurs lancés au premier plan, `run_in_background: false` écrit explicitement.
- Builds Tauri : au plus 2 pour tout le lot sur la VM (le `cargo check` de T87 et le build release de T97), un seul à
  la fois, `CARGO_BUILD_JOBS=2`. Aucune autre tâche ne compile `apps/desktop/src-tauri`. Aucun build Android.
- `git add` fichier par fichier ; jamais `git add -A`, `git add .`, `git commit -a` ; jamais `--force` ; aucun tag,
  aucune release ; `.github/workflows/` non touché.
- Commit : auteur `jejeasterix <jejeasterix@users.noreply.github.com>` (déjà réglé), message en anglais, dernière ligne
  exactement `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (jamais « Sonnet »).
- SolidJS seulement dans `apps/web/src/ui/` (D21) ; `src/engine/` n'importe aucun framework ni `src/ui/`.
- Aucune ressource réseau à l'exécution (D27) : polices et icônes embarquées ; `scripts/controle-hors-ligne.mjs` reste
  vert. Ne jamais retirer `"plugins": { "fs": { "scopeDroppedPaths": false } }` de `tauri.conf.json`.
- Composants de barre : aucun appel à `localStorage` (passer par `ProfileStore`), aucun `switch` ni chaîne de `if` sur
  un identifiant d'outil ou d'action (tables), aucune dimension en pixels (jetons CSS `--rb-btn-s|m|l`), aucun état
  propre au document (tout vient du profil, des capacités et de l'état publié par le moteur), aucun glisser HTML5
  (`draggable`, `dragstart`) dans l'interface.
- Choix du lot 4 gardés (CL4-1 à CL4-15) : aperçus d'édition sur la scène Canvas 2D, `<textarea>` visible, validation
  différée pendant l'IME, retirer la page montrée montre la précédente.
- Réglages `engine/settings.ts` (É2 `prediction`, É3 `inkTrail`, É4 `webgl`, `palm`, `finger`) : défauts et
  adresse `?echelons=`, `?paume=`, `?doigt=` inchangés ; aucun ne se perd dans l'interface neuve.
- Le rapport de la tâche porte, pour chaque ligne `Réutilise :` de sa section, `Réutilisation : appelé <module>` ou
  `Réutilisation : écart — <pourquoi>`.

**Interdits.** Ne pas toucher `s34-navigateur.mjs` (déjà migré au lot 4 ; T96 le reprend). Ne changer aucun `check(...)`
ni seuil des scénarios.

**Terminé quand** les trois essais disent OK et qu'aucune copie ne reste.

**Étapes.**
1. Rouge de structure : la commande `grep -cE …` ci-dessus rend `1` et `1` (copies présentes).
2. `commun.mjs` : `serve({ headers } = {})` pose `res.setHeader(k, v)` pour chaque en-tête avant le corps ; retirer de
   l'en-tête du fichier la phrase « s2 n'est pas migré (lot 5) ».
3. `s2-navigateur.mjs` : supprimer `loadPlaywright` (l. 49) et `serve` (l. 60) locaux, importer depuis `./commun.mjs`
   (`ROOT`, `DIST`, `loadPlaywright`, `serve`, et `inkIn`/`frames` si leurs équivalents locaux sont identiques — sinon
   les garder et le dire au rapport).
4. `fichiers-navigateur.mjs` : idem (l. 41, l. 59) ; `serve({ headers: { "Content-Security-Policy": coqueCsp() } })`.
5. Rejouer les trois essais (preuve). Commit : `refactor(scripts): share Playwright helpers across browser trials`.

<a id="tache-t86"></a>
### Tâche T86 — Entrée unique des fichiers : `DroppedFile`, `FileHost.onDrop`, `importFiles`, côté page

**Objectif.** Usage § 8 point 12 amendé par Q1 : toute entrée de fichier (dépôt sur la fenêtre web, dépôt dans la coque,
fichier passé au lancement) passe par `importFiles` ; un `.roomboard` s'ouvre dans un **nouvel onglet** (fonction
fournie par l'appelant, T93), tout autre fichier rend « format pris en charge dans une prochaine version », document
intact. Les trois hôtes (`FileHost`) gagnent `onDrop`. Côté coque, la page écoute `roomboard://dropped` (émis par la
coque Rust après l'accord, T87) et lit par `read_granted_file`.

**Fichiers.** `apps/web/src/platform/import.ts` (neuf), `import.test.ts` (neuf), `drop-web.ts` (neuf),
`drop-web.test.ts` (neuf), `files.ts`, `files.test.ts`, `host-fsa.ts`, `host-fsa.test.ts`, `host-repli.ts`,
`host-repli.test.ts`, `host-tauri.ts`, `host-tauri.test.ts` (tous sous `apps/web/src/platform/`).

**Interfaces.**
- Réutilise : `apps/web/src/platform/files.ts:46` — `FileHost` étendu par `onDrop` (usage, « Modules à réutiliser » :
  « ajout `onDrop` à `FileHost`, implémenté par les trois hôtes ») ; `ROOMBOARD_EXTENSION`, `SaveTarget`,
  `OpenedFile` réutilisés.
- Réutilise : `apps/web/src/platform/host-tauri.ts:36` — `baseName(path)`.
- Produit (dans `files.ts`) :
```ts
export interface Point { readonly x: number; readonly y: number }
/** Fichier entrant (U23) : `path` dans la coque seulement ; `blob()` lit par morceaux dans la coque. */
export interface DroppedFile {
  readonly name: string;
  readonly size: number;
  readonly mime: string;
  readonly path?: string;
  blob(): Promise<Blob>;
}
/** `at` en px CSS relatifs à la fenêtre ; null quand le système ne donne pas de point (ouverture par le Finder). */
export type DropHandler = (files: DroppedFile[], at: Point | null) => void;
export interface FileHost {
  readonly kind: HostKind;
  open(): Promise<OpenedFile | null>;
  save(bytes: Uint8Array, target: SaveTarget): Promise<SaveTarget | null>;
  /** Abonne le dépôt de fichiers ; rend le désabonnement. Hôte sans surface de dépôt : no-op. */
  onDrop(handler: DropHandler): () => void;
}
```
- Produit (dans `import.ts`) :
```ts
export const LATER_FORMAT_MESSAGE = "format pris en charge dans une prochaine version";
export interface ImportReport {
  readonly opened: readonly string[];
  readonly refused: readonly string[];
  readonly failed: readonly string[];
}
export interface ImportDeps {
  /** Ouvre le document dans un nouvel onglet (T93) ; false si illisible (le message est déjà dit). */
  openDocument(file: { readonly name: string; readonly bytes: Uint8Array; readonly target: SaveTarget | null }): Promise<boolean>;
  notify(message: string): Promise<void>;
}
export interface Importer {
  importFiles(files: readonly DroppedFile[], at?: Point | null): Promise<ImportReport>;
}
export function isRoomboardName(name: string): boolean;
export function createImporter(deps: ImportDeps): Importer;
```
- Produit (dans `drop-web.ts`) :
```ts
export interface DropTargetLike {
  addEventListener(type: "dragover" | "drop", cb: (e: DragEventLike) => void): void;
  removeEventListener(type: "dragover" | "drop", cb: (e: DragEventLike) => void): void;
}
export interface DragEventLike {
  readonly clientX: number;
  readonly clientY: number;
  readonly dataTransfer: { readonly files: ArrayLike<File>; dropEffect: string } | null;
  preventDefault(): void;
}
export function droppedFromFile(f: File): DroppedFile;
export function listenWebDrop(target: DropTargetLike | null, handler: DropHandler): () => void;
```
- Produit (dans `host-tauri.ts`) :
```ts
export interface TauriIpc {
  invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T>;
  listen<T>(event: string, cb: (e: { readonly payload: T }) => void): Promise<() => void>;
}
export const DROPPED_EVENT = "roomboard://dropped";
export const QUIT_EVENT = "roomboard://quit-requested";
export const READ_CHUNK = 8 * 1024 * 1024;
export interface DropPayload { readonly paths: readonly string[]; readonly position: Point | null }
export function grantedFile(ipc: TauriIpc, path: string, size: number): DroppedFile;
export function launchFiles(ipc: TauriIpc): Promise<DroppedFile[]>;
export function onQuitRequested(ipc: TauriIpc, cb: () => void): Promise<() => void>;
export function quitApp(ipc: TauriIpc): Promise<void>;
// createTauriHost(dialog, fs, ipc: TauriIpc | null = null, dpr: () => number = () => 1) : onDrop par DROPPED_EVENT
// loadTauriPorts() rend en plus `ipc: TauriIpc` (invoke de @tauri-apps/api/core, listen de @tauri-apps/api/event)
```
- Commandes Rust appelées (contrat avec T87, noms et arguments exacts) : `read_granted_file { path, offset, len }` →
  `ArrayBuffer` ; `granted_file_size { path }` → `number` ; `launch_files` → `string[]` ; `quit_app`.
- Hôtes web : `createFsaHost(w, dropTarget: DropTargetLike | null = null)`, `createFallbackHost(deps, dropTarget:
  DropTargetLike | null = null)` ; paramètre optionnel, `mount.ts` compile sans changement (T93 passe `w.document`).

**Test et commande bornée.**
`cd <worktree> && pnpm --filter @roomboard/web exec vitest run src/platform 2>&1 | tail -15` → aucun `FAIL `, ≥ 14
tests neufs, noms « fichier non .roomboard : message, document intact » et « dépôt dans la coque : lecture par
morceaux » présents. Tests à garder verts : tous ceux de `src/platform/` (lot 5a).

**Contraintes.**
- Toutes les commandes visent le worktree donné par l'orchestrateur : `cd <worktree> && …` ; avant toute commande
  cargo ou wasm : `export PATH=$HOME/.cargo/bin:$PATH`.
- Worktree neuf : `pnpm install --frozen-lockfile` à la racine ; si `apps/web/src/wasm/` manque (contrat, build web,
  essais), lancer une fois `PATH=$HOME/.cargo/bin:$PATH scripts/verifier.sh 2>&1 | tail -30` au premier plan.
- TDD : le test d'abord, montré rouge (sortie copiée dans le rapport), puis le code, puis vert.
- Aucun test désactivé (`.skip`, `.only`, `#[ignore]` neuf), aucun seuil baissé. Un test qui dépend d'un délai et
  échoue est rejoué une fois ; s'il échoue encore, c'est un échec.
- Commandes longues (verifier.sh, build, essais Playwright) au premier plan avec `timeout: 600000`, jamais en
  `run_in_background`. Sous-agents et relecteurs lancés au premier plan, `run_in_background: false` écrit explicitement.
- Builds Tauri : au plus 2 pour tout le lot sur la VM (le `cargo check` de T87 et le build release de T97), un seul à
  la fois, `CARGO_BUILD_JOBS=2`. Aucune autre tâche ne compile `apps/desktop/src-tauri`. Aucun build Android.
- `git add` fichier par fichier ; jamais `git add -A`, `git add .`, `git commit -a` ; jamais `--force` ; aucun tag,
  aucune release ; `.github/workflows/` non touché.
- Commit : auteur `jejeasterix <jejeasterix@users.noreply.github.com>` (déjà réglé), message en anglais, dernière ligne
  exactement `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (jamais « Sonnet »).
- SolidJS seulement dans `apps/web/src/ui/` (D21) ; `src/engine/` n'importe aucun framework ni `src/ui/`.
- Aucune ressource réseau à l'exécution (D27) : polices et icônes embarquées ; `scripts/controle-hors-ligne.mjs` reste
  vert. Ne jamais retirer `"plugins": { "fs": { "scopeDroppedPaths": false } }` de `tauri.conf.json`.
- Composants de barre : aucun appel à `localStorage` (passer par `ProfileStore`), aucun `switch` ni chaîne de `if` sur
  un identifiant d'outil ou d'action (tables), aucune dimension en pixels (jetons CSS `--rb-btn-s|m|l`), aucun état
  propre au document (tout vient du profil, des capacités et de l'état publié par le moteur), aucun glisser HTML5
  (`draggable`, `dragstart`) dans l'interface.
- Choix du lot 4 gardés (CL4-1 à CL4-15) : aperçus d'édition sur la scène Canvas 2D, `<textarea>` visible, validation
  différée pendant l'IME, retirer la page montrée montre la précédente.
- Réglages `engine/settings.ts` (É2 `prediction`, É3 `inkTrail`, É4 `webgl`, `palm`, `finger`) : défauts et
  adresse `?echelons=`, `?paume=`, `?doigt=` inchangés ; aucun ne se perd dans l'interface neuve.
- Le rapport de la tâche porte, pour chaque ligne `Réutilise :` de sa section, `Réutilisation : appelé <module>` ou
  `Réutilisation : écart — <pourquoi>`.

**Interdits.** Ne pas toucher `controller.ts`, `mount.ts` (T93). Aucune lecture de fichier par `@tauri-apps/plugin-fs`
pour un dépôt (la portée du plugin ne contient pas les chemins déposés : `scopeDroppedPaths: false`). Aucun
`draggable`/`dragstart` (point 13).

**Terminé quand** `importFiles` ouvre un `.roomboard`, refuse le reste avec le message, et les trois hôtes livrent les
fichiers déposés.

**Étapes.**
1. Tests rouges, `import.test.ts` :
```ts
import { describe, expect, it, vi } from "vitest";
import type { DroppedFile } from "./files";
import { createImporter, isRoomboardName, LATER_FORMAT_MESSAGE } from "./import";

const file = (name: string, bytes = new Uint8Array([80, 75, 3, 4]), path?: string): DroppedFile => ({
  name, size: bytes.length, mime: "", path, blob: async () => new Blob([bytes]),
});

describe("importFiles (T86, usage § 8 point 12, Q1)", () => {
  it("un .roomboard s'ouvre (nouvel onglet), sans cible d'écriture (CL5b-4)", async () => {
    const openDocument = vi.fn(async () => true);
    const notify = vi.fn(async () => undefined);
    const r = await createImporter({ openDocument, notify }).importFiles([file("Cours.roomboard", new Uint8Array([1, 2]))]);
    expect(openDocument).toHaveBeenCalledWith({ name: "Cours.roomboard", bytes: new Uint8Array([1, 2]), target: null });
    expect(r).toEqual({ opened: ["Cours.roomboard"], refused: [], failed: [] });
    expect(notify).not.toHaveBeenCalled();
  });

  it("fichier non .roomboard : message, document intact", async () => {
    const openDocument = vi.fn(async () => true);
    const notify = vi.fn(async () => undefined);
    const r = await createImporter({ openDocument, notify }).importFiles([file("photo.png"), file("cours.flipchart")]);
    expect(openDocument).not.toHaveBeenCalled();
    expect(r.refused).toEqual(["photo.png", "cours.flipchart"]);
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify.mock.calls[0]![0]).toBe(`photo.png, cours.flipchart : ${LATER_FORMAT_MESSAGE}`);
  });

  it("mélange : chaque .roomboard ouvert dans l'ordre, les autres refusés en un seul message", async () => {
    const opened: string[] = [];
    const notify = vi.fn(async () => undefined);
    const r = await createImporter({ openDocument: async (f) => (opened.push(f.name), true), notify })
      .importFiles([file("a.roomboard"), file("b.txt"), file("C.ROOMBOARD")]);
    expect(opened).toEqual(["a.roomboard", "C.ROOMBOARD"]);
    expect(r.refused).toEqual(["b.txt"]);
  });

  it("ouverture refusée ou lecture qui lève : rangé dans failed, les autres continuent", async () => {
    const bad: DroppedFile = { name: "x.roomboard", size: 1, mime: "", blob: async () => { throw new Error("disque"); } };
    const notify = vi.fn(async () => undefined);
    const r = await createImporter({ openDocument: async (f) => f.name !== "y.roomboard", notify })
      .importFiles([bad, file("y.roomboard"), file("z.roomboard")]);
    expect(r).toEqual({ opened: ["z.roomboard"], refused: [], failed: ["x.roomboard", "y.roomboard"] });
    expect(notify).toHaveBeenCalledWith("Ouverture impossible (x.roomboard) : disque");
  });

  it("liste vide : rien", async () => {
    const notify = vi.fn(async () => undefined);
    expect(await createImporter({ openDocument: async () => true, notify }).importFiles([])).toEqual({ opened: [], refused: [], failed: [] });
    expect(notify).not.toHaveBeenCalled();
  });

  it("extension seule, insensible à la casse ; « .roomboard.txt » refusé", () => {
    expect(isRoomboardName("a.RoomBoard")).toBe(true);
    expect(isRoomboardName("a.roomboard.txt")).toBe(false);
    expect(isRoomboardName("roomboard")).toBe(false);
  });
});
```
   `drop-web.test.ts` : faux `DropTargetLike` qui garde ses écouteurs ; `dragover` → `preventDefault` appelé et
   `dropEffect === "copy"` ; `drop` avec deux `File` → `handler` reçoit deux `DroppedFile` (`name`, `size`, `mime` =
   `type`, `blob()` rend le `File`) et `{ x: clientX, y: clientY }` ; `drop` sans fichier → `handler` non appelé ;
   désabonnement → plus rien ; `target` null → no-op. `host-tauri.test.ts` (ajouts, nom « dépôt dans la coque :
   lecture par morceaux ») : faux `TauriIpc` ; `onDrop` écoute `DROPPED_EVENT` ; charge utile
   `{ paths: ["/tmp/a.roomboard"], position: { x: 200, y: 100 } }` avec `dpr = 2` → `handler` reçoit un fichier
   `name: "a.roomboard"`, `path`, `size` (de `granted_file_size`) et `at = { x: 100, y: 50 }` ; `blob()` sur un fichier de
   `READ_CHUNK + 3` octets appelle `read_granted_file` deux fois (`offset` 0 puis `READ_CHUNK`, `len: READ_CHUNK`) et
   rend `READ_CHUNK + 3` octets ; un fichier de exactement `READ_CHUNK` octets fait un troisième appel qui rend 0 octet ;
   `position: null` → `at = null` ; `launchFiles` rend un `DroppedFile` par chemin de `launch_files` ;
   `onQuitRequested` écoute `QUIT_EVENT`. `host-fsa.test.ts` et `host-repli.test.ts` : `onDrop` branché sur la cible
   passée ; sans cible : no-op. `files.test.ts` : le type `FileHost` exige `onDrop` (un objet sans `onDrop` ne compile
   pas : `// @ts-expect-error`).
2. `import.ts` :
```ts
import { ROOMBOARD_EXTENSION, type DroppedFile, type Point, type SaveTarget } from "./files";
import { messageOf } from "./controller";

export function isRoomboardName(name: string): boolean {
  return name.toLowerCase().endsWith(ROOMBOARD_EXTENSION) && name.length > ROOMBOARD_EXTENSION.length;
}

export function createImporter(deps: ImportDeps): Importer {
  return {
    async importFiles(files, _at = null) {
      const opened: string[] = [];
      const refused: string[] = [];
      const failed: string[] = [];
      for (const f of files) {
        if (!isRoomboardName(f.name)) {
          refused.push(f.name);
          continue;
        }
        let bytes: Uint8Array;
        try {
          bytes = new Uint8Array(await (await f.blob()).arrayBuffer());
        } catch (e) {
          failed.push(f.name);
          await deps.notify(`Ouverture impossible (${f.name}) : ${messageOf(e)}`);
          continue;
        }
        if (await deps.openDocument({ name: f.name, bytes, target: null })) opened.push(f.name);
        else failed.push(f.name);
      }
      if (refused.length > 0) await deps.notify(`${refused.join(", ")} : ${LATER_FORMAT_MESSAGE}`);
      return { opened, refused, failed };
    },
  };
}
```
   (`at` est reçu et ignoré au lot 5b : l'insertion au point de dépôt vient avec C2/C3.)
3. `drop-web.ts` :
```ts
export function droppedFromFile(f: File): DroppedFile {
  return { name: f.name, size: f.size, mime: f.type, blob: async () => f };
}

export function listenWebDrop(target: DropTargetLike | null, handler: DropHandler): () => void {
  if (target === null) return () => undefined;
  const over = (e: DragEventLike): void => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
  };
  const drop = (e: DragEventLike): void => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer?.files ?? [], droppedFromFile);
    if (files.length > 0) handler(files, { x: e.clientX, y: e.clientY });
  };
  target.addEventListener("dragover", over);
  target.addEventListener("drop", drop);
  return () => {
    target.removeEventListener("dragover", over);
    target.removeEventListener("drop", drop);
  };
}
```
4. `host-tauri.ts` :
```ts
export function grantedFile(ipc: TauriIpc, path: string, size: number): DroppedFile {
  return {
    name: baseName(path),
    size,
    mime: "",
    path,
    async blob() {
      const parts: Uint8Array[] = [];
      let offset = 0;
      for (;;) {
        const chunk = new Uint8Array(await ipc.invoke<ArrayBuffer>("read_granted_file", { path, offset, len: READ_CHUNK }));
        parts.push(chunk);
        offset += chunk.byteLength;
        if (chunk.byteLength < READ_CHUNK) break;
      }
      return new Blob(parts);
    },
  };
}

async function filesOf(ipc: TauriIpc, paths: readonly string[]): Promise<DroppedFile[]> {
  return Promise.all(paths.map(async (p) => grantedFile(ipc, p, await ipc.invoke<number>("granted_file_size", { path: p }))));
}

export async function launchFiles(ipc: TauriIpc): Promise<DroppedFile[]> {
  return filesOf(ipc, await ipc.invoke<string[]>("launch_files"));
}
export const onQuitRequested = (ipc: TauriIpc, cb: () => void): Promise<() => void> => ipc.listen(QUIT_EVENT, () => cb());
export const quitApp = (ipc: TauriIpc): Promise<void> => ipc.invoke<void>("quit_app");
```
   `createTauriHost(dialog, fs, ipc = null, dpr = () => 1)` : `onDrop(handler)` → si `ipc` null, no-op ; sinon
   `ipc.listen<DropPayload>(DROPPED_EVENT, (e) => void filesOf(ipc, e.payload.paths).then((files) => files.length > 0 &&
   handler(files, e.payload.position && { x: e.payload.position.x / dpr(), y: e.payload.position.y / dpr() })))` ;
   le désabonnement rendu attend la promesse de `listen`. Erreur de `filesOf` : `console.warn`, rien d'autre.
   `loadTauriPorts` importe `invoke` de `@tauri-apps/api/core` et `listen` de `@tauri-apps/api/event` (même version
   2.12.5, déjà en dépendance) et rend `ipc`.
5. `host-fsa.ts`, `host-repli.ts` : `onDrop: (h) => listenWebDrop(dropTarget, h)`.
6. Vert (commande de la preuve). Commit : `feat(platform): single file entry with onDrop and importFiles`.

<a id="tache-t87"></a>
### Tâche T87 — Coque : chemins accordés, `read_granted_file`, association `.roomboard`, fichier au lancement, Cmd+Q macOS

**Objectif.** Usage § 8 points 12, 14, 15, 16 ; plan maître (association `.roomboard`, fichier passé au lancement,
Cmd+Q macOS). La coque accorde à la page les seuls fichiers déposés ou passés au lancement (jamais un dossier),
les lui fait lire par `read_granted_file(path, offset, len)`, associe `.roomboard`, et sous macOS demande avant de
quitter un document modifié. `scopeDroppedPaths: false` reste.

**Fichiers.** `Cargo.toml`, `Cargo.lock`, `crates/roomboard-shell/Cargo.toml` (neuf), `crates/roomboard-shell/src/lib.rs`
(neuf), `apps/desktop/src-tauri/Cargo.toml`, `apps/desktop/src-tauri/Cargo.lock`, `apps/desktop/src-tauri/src/main.rs`,
`apps/desktop/src-tauri/tauri.conf.json`, `apps/desktop/src-tauri/capabilities/default.json`,
`scripts/controle-hors-ligne.mjs`, `scripts/tests/controle-hors-ligne.test.sh`, `docs/essais/coque-macos.md`,
`docs/essais/coque-windows.md`.

**Interfaces.**
- Produit (`crates/roomboard-shell/src/lib.rs`, aucune dépendance) :
```rust
pub const MAX_CHUNK: u64 = 8 * 1024 * 1024;
pub const ASSOCIATED_EXTENSIONS: &[&str] = &["roomboard"];
#[derive(Debug, PartialEq, Eq)]
pub enum ReadError { NotGranted, TooLarge, Io(String) }
#[derive(Default)]
pub struct GrantedPaths { /* Mutex<HashSet<PathBuf>> de chemins canoniques */ }
impl GrantedPaths {
    pub fn grant<I: IntoIterator<Item = PathBuf>>(&self, paths: I) -> Vec<PathBuf>;
    pub fn granted_path(&self, path: &Path) -> Option<PathBuf>;
}
pub fn read_granted(g: &GrantedPaths, path: &Path, offset: u64, len: u64) -> Result<Vec<u8>, ReadError>;
pub fn size_granted(g: &GrantedPaths, path: &Path) -> Result<u64, ReadError>;
pub fn launch_paths<I: IntoIterator<Item = String>>(args: I, extensions: &[&str]) -> Vec<PathBuf>;
```
- Produit (commandes Tauri, contrat avec T86) : `read_granted_file(path: String, offset: u64, len: u64) ->
  Result<tauri::ipc::Response, String>` ; `granted_file_size(path: String) -> Result<u64, String>` ;
  `launch_files() -> Vec<String>` ; `quit_app()`. Événements : `roomboard://dropped`
  (`{ paths: string[], position: { x, y } | null }`, px physiques), `roomboard://quit-requested` (macOS).
- Réutilise : `apps/desktop/src-tauri/src/main.rs:4-8` — le `Builder` et ses deux plugins, gardés.

**Patron à ne pas reprendre.** La portée par préfixe de `tauri-plugin-fs` (`scope_dropped_paths`,
`tauri-plugin-fs-2.7.1/src/lib.rs:629-646`) : un dossier déposé y rend lisible tout son contenu, récursivement. Ici :
égalité stricte de chemins **canoniques** de **fichiers** ; un dossier n'est jamais accordé ; la lecture ouvre le chemin
canonique vérifié (pas le chemin reçu, qu'un lien symbolique pourrait détourner entre la vérification et l'ouverture).
Autre patron interdit : laisser la page lire la liste d'`onDragDropEvent` et appeler la lecture avant que la coque ait
accordé (course) — la coque accorde, puis émet (CL5b-13).

**Test et commande bornée.**
`cd <worktree> && export PATH=$HOME/.cargo/bin:$PATH && cargo test -p roomboard-shell 2>&1 | tail -15` → `test result: ok`,
≥ 9 tests, `directory_is_never_granted ... ok` présent ; `cargo clippy -p roomboard-shell --all-targets -- -D warnings
2>&1 | tail -3` sans avertissement ; `cargo fmt --all --check`. Compilation de la coque (1er des 2 builds Tauri du lot,
au premier plan, `timeout: 600000`) : `cd <worktree>/apps/desktop/src-tauri && CARGO_BUILD_JOBS=2 cargo check 2>&1 | tail -5`
→ `Finished`, aucun `error[` (exige `apps/web/dist` : `pnpm --filter @roomboard/web build` d'abord). Puis
`bash scripts/tests/controle-hors-ligne.test.sh 2>&1 | tail -3` vert (un cas neuf : `dragDropEnabled: false` refusé).

**Contraintes.**
- Toutes les commandes visent le worktree donné par l'orchestrateur : `cd <worktree> && …` ; avant toute commande
  cargo ou wasm : `export PATH=$HOME/.cargo/bin:$PATH`.
- Worktree neuf : `pnpm install --frozen-lockfile` à la racine ; si `apps/web/src/wasm/` manque (contrat, build web,
  essais), lancer une fois `PATH=$HOME/.cargo/bin:$PATH scripts/verifier.sh 2>&1 | tail -30` au premier plan.
- TDD : le test d'abord, montré rouge (sortie copiée dans le rapport), puis le code, puis vert.
- Aucun test désactivé (`.skip`, `.only`, `#[ignore]` neuf), aucun seuil baissé. Un test qui dépend d'un délai et
  échoue est rejoué une fois ; s'il échoue encore, c'est un échec.
- Commandes longues (verifier.sh, build, essais Playwright) au premier plan avec `timeout: 600000`, jamais en
  `run_in_background`. Sous-agents et relecteurs lancés au premier plan, `run_in_background: false` écrit explicitement.
- Builds Tauri : au plus 2 pour tout le lot sur la VM (le `cargo check` de T87 et le build release de T97), un seul à
  la fois, `CARGO_BUILD_JOBS=2`. Aucune autre tâche ne compile `apps/desktop/src-tauri`. Aucun build Android.
- `git add` fichier par fichier ; jamais `git add -A`, `git add .`, `git commit -a` ; jamais `--force` ; aucun tag,
  aucune release ; `.github/workflows/` non touché.
- Commit : auteur `jejeasterix <jejeasterix@users.noreply.github.com>` (déjà réglé), message en anglais, dernière ligne
  exactement `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (jamais « Sonnet »).
- SolidJS seulement dans `apps/web/src/ui/` (D21) ; `src/engine/` n'importe aucun framework ni `src/ui/`.
- Aucune ressource réseau à l'exécution (D27) : polices et icônes embarquées ; `scripts/controle-hors-ligne.mjs` reste
  vert. Ne jamais retirer `"plugins": { "fs": { "scopeDroppedPaths": false } }` de `tauri.conf.json`.
- Composants de barre : aucun appel à `localStorage` (passer par `ProfileStore`), aucun `switch` ni chaîne de `if` sur
  un identifiant d'outil ou d'action (tables), aucune dimension en pixels (jetons CSS `--rb-btn-s|m|l`), aucun état
  propre au document (tout vient du profil, des capacités et de l'état publié par le moteur), aucun glisser HTML5
  (`draggable`, `dragstart`) dans l'interface.
- Choix du lot 4 gardés (CL4-1 à CL4-15) : aperçus d'édition sur la scène Canvas 2D, `<textarea>` visible, validation
  différée pendant l'IME, retirer la page montrée montre la précédente.
- Réglages `engine/settings.ts` (É2 `prediction`, É3 `inkTrail`, É4 `webgl`, `palm`, `finger`) : défauts et
  adresse `?echelons=`, `?paume=`, `?doigt=` inchangés ; aucun ne se perd dans l'interface neuve.
- Le rapport de la tâche porte, pour chaque ligne `Réutilise :` de sa section, `Réutilisation : appelé <module>` ou
  `Réutilisation : écart — <pourquoi>`.

**Interdits.** Ne pas retirer `scopeDroppedPaths: false`. N'ajouter aucune permission `fs:` ni de portée. Ne pas lancer
`tauri build` (T97). `ExitRequested` empêché seulement sous macOS.

**Terminé quand** les tests du crate passent, la coque compile, la configuration associe `.roomboard` et nomme la fenêtre
`main` avec `dragDropEnabled: true`, et les fiches Windows et macOS portent les essais neufs.

**Étapes.**
1. `crates/roomboard-shell/Cargo.toml` (`name = "roomboard-shell"`, `version.workspace = true`, `edition.workspace = true`,
   `license.workspace = true`, aucune dépendance) ; `Cargo.toml` racine : `members` + `"crates/roomboard-shell"`.
2. Tests rouges, en bas de `lib.rs` :
```rust
#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn dir(name: &str) -> PathBuf {
        let d = std::env::temp_dir().join(format!("rb-shell-{}-{name}", std::process::id()));
        let _ = fs::remove_dir_all(&d);
        fs::create_dir_all(&d).unwrap();
        d
    }

    #[test]
    fn granted_file_reads_range() {
        let d = dir("range");
        let f = d.join("a.roomboard");
        fs::write(&f, b"0123456789").unwrap();
        let g = GrantedPaths::default();
        assert_eq!(g.grant([f.clone()]).len(), 1);
        assert_eq!(read_granted(&g, &f, 2, 3).unwrap(), b"234");
        assert_eq!(read_granted(&g, &f, 8, 10).unwrap(), b"89");
    }

    #[test]
    fn ungranted_file_is_refused() {
        let d = dir("refused");
        let f = d.join("b.roomboard");
        fs::write(&f, b"x").unwrap();
        assert_eq!(read_granted(&GrantedPaths::default(), &f, 0, 1), Err(ReadError::NotGranted));
    }

    #[test]
    fn directory_is_never_granted() {
        let d = dir("folder");
        let inner = d.join("c.roomboard");
        fs::write(&inner, b"x").unwrap();
        let g = GrantedPaths::default();
        assert!(g.grant([d.clone()]).is_empty());
        assert_eq!(read_granted(&g, &inner, 0, 1), Err(ReadError::NotGranted));
    }

    #[test]
    fn chunk_over_limit_is_refused() {
        let d = dir("chunk");
        let f = d.join("d.roomboard");
        fs::write(&f, b"x").unwrap();
        let g = GrantedPaths::default();
        g.grant([f.clone()]);
        assert_eq!(read_granted(&g, &f, 0, MAX_CHUNK + 1), Err(ReadError::TooLarge));
    }

    #[test]
    fn offset_past_end_reads_empty() {
        let d = dir("past");
        let f = d.join("e.roomboard");
        fs::write(&f, b"abc").unwrap();
        let g = GrantedPaths::default();
        g.grant([f.clone()]);
        assert!(read_granted(&g, &f, 10, 5).unwrap().is_empty());
    }

    #[test]
    fn dotdot_path_resolves_to_the_granted_file() {
        let d = dir("dotdot");
        fs::create_dir_all(d.join("x")).unwrap();
        let f = d.join("f.roomboard");
        fs::write(&f, b"ok").unwrap();
        let g = GrantedPaths::default();
        g.grant([f.clone()]);
        assert_eq!(read_granted(&g, &d.join("x").join("..").join("f.roomboard"), 0, 2).unwrap(), b"ok");
    }

    #[cfg(unix)]
    #[test]
    fn symlink_to_ungranted_file_is_refused() {
        let d = dir("link");
        let secret = d.join("secret.txt");
        fs::write(&secret, b"s").unwrap();
        let granted = d.join("g.roomboard");
        fs::write(&granted, b"g").unwrap();
        let g = GrantedPaths::default();
        g.grant([granted.clone()]);
        let link = d.join("l.roomboard");
        std::os::unix::fs::symlink(&secret, &link).unwrap();
        assert_eq!(read_granted(&g, &link, 0, 1), Err(ReadError::NotGranted));
    }

    #[test]
    fn size_granted_reports_length() {
        let d = dir("size");
        let f = d.join("g.roomboard");
        fs::write(&f, b"12345").unwrap();
        let g = GrantedPaths::default();
        g.grant([f.clone()]);
        assert_eq!(size_granted(&g, &f), Ok(5));
        assert_eq!(size_granted(&GrantedPaths::default(), &f), Err(ReadError::NotGranted));
    }

    #[test]
    fn launch_paths_keeps_associated_extensions() {
        let args = ["--flag", "/x/Cours.RoomBoard", "/x/photo.png", "/x/b.roomboard"].map(String::from);
        assert_eq!(
            launch_paths(args, ASSOCIATED_EXTENSIONS),
            vec![PathBuf::from("/x/Cours.RoomBoard"), PathBuf::from("/x/b.roomboard")]
        );
    }
}
```
   `cargo test -p roomboard-shell` → rouge (fonctions absentes).
3. Le code :
```rust
//! Logique de la coque testable sans Tauri (lot 5b, CL5b-13, CL5b-14) : fichiers accordés à la page (dépôt,
//! lancement), lecture bornée par morceaux, fichiers passés au lancement. Égalité stricte de chemins canoniques de
//! fichiers : jamais un dossier, jamais une recherche par préfixe (contrairement à la portée de tauri-plugin-fs).
use std::collections::HashSet;
use std::fmt;
use std::fs::File;
use std::io::{Read, Seek, SeekFrom};
use std::path::{Path, PathBuf};
use std::sync::Mutex;

pub const MAX_CHUNK: u64 = 8 * 1024 * 1024;
pub const ASSOCIATED_EXTENSIONS: &[&str] = &["roomboard"];

#[derive(Debug, PartialEq, Eq)]
pub enum ReadError {
    NotGranted,
    TooLarge,
    Io(String),
}

impl fmt::Display for ReadError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ReadError::NotGranted => write!(f, "fichier non accordé"),
            ReadError::TooLarge => write!(f, "lecture trop grande (8 Mio au plus)"),
            ReadError::Io(e) => write!(f, "lecture impossible : {e}"),
        }
    }
}

#[derive(Default)]
pub struct GrantedPaths {
    paths: Mutex<HashSet<PathBuf>>,
}

impl GrantedPaths {
    /// Accorde les fichiers ordinaires de `paths` et rend leurs chemins canoniques ; dossiers et absents ignorés.
    pub fn grant<I: IntoIterator<Item = PathBuf>>(&self, paths: I) -> Vec<PathBuf> {
        let mut set = self.paths.lock().unwrap_or_else(|e| e.into_inner());
        let mut kept = Vec::new();
        for p in paths {
            let Ok(c) = p.canonicalize() else { continue };
            if !c.is_file() {
                continue;
            }
            set.insert(c.clone());
            kept.push(c);
        }
        kept
    }

    /// Chemin canonique de `path` s'il est accordé.
    pub fn granted_path(&self, path: &Path) -> Option<PathBuf> {
        let c = path.canonicalize().ok()?;
        self.paths.lock().unwrap_or_else(|e| e.into_inner()).contains(&c).then_some(c)
    }
}

fn io(e: std::io::Error) -> ReadError {
    ReadError::Io(e.to_string())
}

pub fn read_granted(g: &GrantedPaths, path: &Path, offset: u64, len: u64) -> Result<Vec<u8>, ReadError> {
    if len > MAX_CHUNK {
        return Err(ReadError::TooLarge);
    }
    let c = g.granted_path(path).ok_or(ReadError::NotGranted)?;
    let mut f = File::open(&c).map_err(io)?;
    f.seek(SeekFrom::Start(offset)).map_err(io)?;
    let mut buf = Vec::new();
    f.take(len).read_to_end(&mut buf).map_err(io)?;
    Ok(buf)
}

pub fn size_granted(g: &GrantedPaths, path: &Path) -> Result<u64, ReadError> {
    let c = g.granted_path(path).ok_or(ReadError::NotGranted)?;
    std::fs::metadata(&c).map(|m| m.len()).map_err(io)
}

/// Arguments du lancement (sans le programme) dont l'extension est associée ; options (`-…`) ignorées.
pub fn launch_paths<I: IntoIterator<Item = String>>(args: I, extensions: &[&str]) -> Vec<PathBuf> {
    args.into_iter()
        .filter(|a| !a.starts_with('-'))
        .map(PathBuf::from)
        .filter(|p| {
            p.extension()
                .and_then(|e| e.to_str())
                .is_some_and(|e| extensions.iter().any(|x| x.eq_ignore_ascii_case(e)))
        })
        .collect()
}
```
4. `apps/desktop/src-tauri/Cargo.toml` : `roomboard-shell = { path = "../../../crates/roomboard-shell" }`,
   `serde = { version = "1", features = ["derive"] }`. `main.rs` :
```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::path::PathBuf;
use std::sync::Mutex;

use roomboard_shell::{launch_paths, read_granted, size_granted, GrantedPaths, ASSOCIATED_EXTENSIONS};
use serde::Serialize;
use tauri::{AppHandle, DragDropEvent, Emitter, Manager, Runtime, State, WindowEvent};

#[derive(Clone, Copy, Serialize)]
struct Point {
    x: f64,
    y: f64,
}

#[derive(Clone, Serialize)]
struct DropPayload {
    paths: Vec<String>,
    position: Option<Point>,
}

/// Fichiers du lancement : rendus une fois à la page (`launch_files`) ; après, une ouverture passe par l'événement.
struct Launch(Mutex<(Vec<String>, bool)>);

fn strings(paths: &[PathBuf]) -> Vec<String> {
    paths.iter().map(|p| p.to_string_lossy().into_owned()).collect()
}

#[tauri::command]
fn read_granted_file(
    granted: State<'_, GrantedPaths>,
    path: String,
    offset: u64,
    len: u64,
) -> Result<tauri::ipc::Response, String> {
    read_granted(&granted, &PathBuf::from(path), offset, len)
        .map(tauri::ipc::Response::new)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn granted_file_size(granted: State<'_, GrantedPaths>, path: String) -> Result<u64, String> {
    size_granted(&granted, &PathBuf::from(path)).map_err(|e| e.to_string())
}

#[tauri::command]
fn launch_files(launch: State<'_, Launch>) -> Vec<String> {
    let mut l = launch.0.lock().unwrap_or_else(|e| e.into_inner());
    l.1 = true;
    std::mem::take(&mut l.0)
}

#[tauri::command]
fn quit_app(app: AppHandle) {
    app.exit(0);
}

/// Accorde d'abord, émet ensuite (CL5b-13) : la page ne lit jamais un chemin pas encore accordé.
fn grant_and_emit<R: Runtime>(app: &AppHandle<R>, paths: &[PathBuf], position: Option<Point>) {
    let kept = app.state::<GrantedPaths>().grant(paths.iter().cloned());
    if kept.is_empty() {
        return;
    }
    let payload = DropPayload { paths: strings(&kept), position };
    if let Err(e) = app.emit("roomboard://dropped", payload) {
        eprintln!("RoomBoard : dépôt non transmis ({e})");
    }
}

fn main() {
    let granted = GrantedPaths::default();
    let at_launch = granted.grant(launch_paths(std::env::args().skip(1), ASSOCIATED_EXTENSIONS));
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(granted)
        .manage(Launch(Mutex::new((strings(&at_launch), false))))
        .invoke_handler(tauri::generate_handler![read_granted_file, granted_file_size, launch_files, quit_app])
        .on_window_event(|window, event| {
            if let WindowEvent::DragDrop(DragDropEvent::Drop { paths, position }) = event {
                grant_and_emit(window.app_handle(), paths, Some(Point { x: position.x, y: position.y }));
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building RoomBoard");
    app.run(|_app, _event| {
        #[cfg(target_os = "macos")]
        match _event {
            tauri::RunEvent::Opened { urls } => {
                let paths: Vec<PathBuf> = urls.iter().filter_map(|u| u.to_file_path().ok()).collect();
                let launch = _app.state::<Launch>();
                let mut l = launch.0.lock().unwrap_or_else(|e| e.into_inner());
                if l.1 {
                    drop(l);
                    grant_and_emit(_app, &paths, None);
                } else {
                    let kept = _app.state::<GrantedPaths>().grant(paths);
                    l.0.extend(strings(&kept));
                }
            }
            tauri::RunEvent::ExitRequested { code: None, api, .. } => {
                api.prevent_exit();
                let _ = _app.emit("roomboard://quit-requested", ());
            }
            _ => {}
        }
    });
}
```
   Si `WindowEvent::DragDrop` n'arrive pas pour une fenêtre webview dans Tauri 2.x figé (constaté au `cargo check` ou
   dans la documentation de la version du `Cargo.lock`), utiliser `.on_webview_event(|webview, event|
   if let tauri::WebviewEvent::DragDrop(DragDropEvent::Drop { paths, position }) = event { … })` et le dire au rapport.
5. `tauri.conf.json` : fenêtre `{ "label": "main", "title": "RoomBoard", "width": 1280, "height": 800,
   "dragDropEnabled": true }` ; `bundle.fileAssociations: [{ "ext": ["roomboard"], "name": "Document RoomBoard",
   "description": "Document RoomBoard", "mimeType": "application/x-roomboard", "role": "Editor" }]` ; `plugins.fs`
   inchangé. `capabilities/default.json` : `"windows": ["main"]` gardé, `description` complétée (commandes de la coque
   permises à la seule fenêtre `main`). `controle-hors-ligne.mjs` : refuser une fenêtre `main` avec
   `dragDropEnabled: false` ; cas ajouté dans `controle-hors-ligne.test.sh`.
6. Fiches : `docs/essais/coque-windows.md` et `coque-macos.md`, section « Lot 5b » : (a) déposer un `.roomboard` depuis
   l'explorateur → nouvel onglet, l'onglet d'origine intact ; (b) déposer un dossier → rien ne s'ouvre, aucun fichier
   du dossier lisible ; (c) double-clic sur un `.roomboard` (association) → RoomBoard l'ouvre dans un onglet ;
   (d) macOS : Cmd+Q avec un onglet modifié → question ; « Annuler » garde l'application ; document propre → quitte.
7. Vert (preuves). Commit : `feat(desktop): granted-file reads, .roomboard association, launch files, macOS quit guard`.

<a id="tache-t88"></a>
### Tâche T88 — Module commun `fmt`, export JSON, suivi du devicePixelRatio

**Objectif.** Fermer le constat du lot 3 : `fmt`, le téléchargement du JSON et le suivi du devicePixelRatio, recopiés
dans `app/banc.ts`, `proto/stylet.ts` et `main.ts`, sortent dans `app/mesure-outils.ts`. `main.ts` est migré par T93
(`board-session.ts` appelle `watchDpr`).

**Fichiers.** `apps/web/src/app/mesure-outils.ts` (neuf), `apps/web/src/app/mesure-outils.test.ts` (neuf),
`apps/web/src/app/banc.ts`, `apps/web/src/proto/stylet.ts`.

**Interfaces.**
- Produit :
```ts
/** Nombre lisible ; absent → « — » (repris tel quel de banc.ts:68 et proto/stylet.ts:243). */
export const fmt: (v: number | null | undefined, digits?: number) => string;
export interface DownloadDeps {
  readonly document: Pick<Document, "createElement" | "body">;
  readonly url: Pick<typeof URL, "createObjectURL" | "revokeObjectURL">;
  setTimeout(cb: () => void, ms: number): unknown;
}
/** Télécharge `text` en JSON sous `prefix-<date ISO sans : ni .>.json` ; l'URL est rendue après 1 s. */
export function downloadJson(text: string, prefix: string, now: Date, deps: DownloadDeps): void;
export interface DprWindow {
  readonly devicePixelRatio: number;
  matchMedia(q: string): { addEventListener(t: "change", cb: () => void, o: { once: true }): void };
}
/** Appelle `onChange` à chaque changement du devicePixelRatio (écran, zoom) ; rend l'arrêt. */
export function watchDpr(w: DprWindow, onChange: () => void): () => void;
```
- Réutilise : `apps/web/src/app/banc.ts:68,92-104` et `apps/web/src/proto/stylet.ts:143-155,243,280-292` — le code
  déplacé, pas réécrit.

**Test et commande bornée.**
`cd <worktree> && pnpm --filter @roomboard/web exec vitest run src/app/mesure-outils.test.ts src/app/banc.test.ts 2>&1 | tail -15`
→ aucun `FAIL `, ≥ 5 tests neufs. Puis `grep -c "const fmt" apps/web/src/app/banc.ts apps/web/src/proto/stylet.ts` →
`0` et `0`, et `pnpm --filter @roomboard/web build:proto 2>&1 | tail -3` sans erreur (le prototype reste un fichier unique).

**Contraintes.**
- Toutes les commandes visent le worktree donné par l'orchestrateur : `cd <worktree> && …` ; avant toute commande
  cargo ou wasm : `export PATH=$HOME/.cargo/bin:$PATH`.
- Worktree neuf : `pnpm install --frozen-lockfile` à la racine ; si `apps/web/src/wasm/` manque (contrat, build web,
  essais), lancer une fois `PATH=$HOME/.cargo/bin:$PATH scripts/verifier.sh 2>&1 | tail -30` au premier plan.
- TDD : le test d'abord, montré rouge (sortie copiée dans le rapport), puis le code, puis vert.
- Aucun test désactivé (`.skip`, `.only`, `#[ignore]` neuf), aucun seuil baissé. Un test qui dépend d'un délai et
  échoue est rejoué une fois ; s'il échoue encore, c'est un échec.
- Commandes longues (verifier.sh, build, essais Playwright) au premier plan avec `timeout: 600000`, jamais en
  `run_in_background`. Sous-agents et relecteurs lancés au premier plan, `run_in_background: false` écrit explicitement.
- Builds Tauri : au plus 2 pour tout le lot sur la VM (le `cargo check` de T87 et le build release de T97), un seul à
  la fois, `CARGO_BUILD_JOBS=2`. Aucune autre tâche ne compile `apps/desktop/src-tauri`. Aucun build Android.
- `git add` fichier par fichier ; jamais `git add -A`, `git add .`, `git commit -a` ; jamais `--force` ; aucun tag,
  aucune release ; `.github/workflows/` non touché.
- Commit : auteur `jejeasterix <jejeasterix@users.noreply.github.com>` (déjà réglé), message en anglais, dernière ligne
  exactement `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (jamais « Sonnet »).
- SolidJS seulement dans `apps/web/src/ui/` (D21) ; `src/engine/` n'importe aucun framework ni `src/ui/`.
- Aucune ressource réseau à l'exécution (D27) : polices et icônes embarquées ; `scripts/controle-hors-ligne.mjs` reste
  vert. Ne jamais retirer `"plugins": { "fs": { "scopeDroppedPaths": false } }` de `tauri.conf.json`.
- Composants de barre : aucun appel à `localStorage` (passer par `ProfileStore`), aucun `switch` ni chaîne de `if` sur
  un identifiant d'outil ou d'action (tables), aucune dimension en pixels (jetons CSS `--rb-btn-s|m|l`), aucun état
  propre au document (tout vient du profil, des capacités et de l'état publié par le moteur), aucun glisser HTML5
  (`draggable`, `dragstart`) dans l'interface.
- Choix du lot 4 gardés (CL4-1 à CL4-15) : aperçus d'édition sur la scène Canvas 2D, `<textarea>` visible, validation
  différée pendant l'IME, retirer la page montrée montre la précédente.
- Réglages `engine/settings.ts` (É2 `prediction`, É3 `inkTrail`, É4 `webgl`, `palm`, `finger`) : défauts et
  adresse `?echelons=`, `?paume=`, `?doigt=` inchangés ; aucun ne se perd dans l'interface neuve.
- Le rapport de la tâche porte, pour chaque ligne `Réutilise :` de sa section, `Réutilisation : appelé <module>` ou
  `Réutilisation : écart — <pourquoi>`.

**Interdits.** Ne pas toucher `main.ts` (T95) ni le panneau du banc (textes inchangés).

**Terminé quand** les deux anciens emplacements appellent le module et leurs tests restent verts.

**Étapes.**
1. Tests rouges `mesure-outils.test.ts` : `fmt(null) === "—"`, `fmt(1.26) === "1.3"`, `fmt(0.123, 2) === "0.12"` ;
   `downloadJson` crée un `<a>` dont `download === "banc-2026-11-20T00-00-00-000Z.json"` pour
   `new Date("2026-11-20T00:00:00.000Z")`, clique, retire, et `revokeObjectURL` après le `setTimeout` de 1000 ms ;
   `watchDpr` : faux `matchMedia` qui garde l'écouteur ; un `change` appelle `onChange` une fois et se réabonne avec la
   nouvelle requête `(resolution: 2dppx)` ; après l'arrêt, un `change` n'appelle plus rien.
2. `mesure-outils.ts` :
```ts
export const fmt = (v: number | null | undefined, digits = 1): string =>
  v === null || v === undefined ? "—" : v.toFixed(digits);

export function downloadJson(text: string, prefix: string, now: Date, deps: DownloadDeps): void {
  const url = deps.url.createObjectURL(new Blob([text], { type: "application/json" }));
  const a = deps.document.createElement("a");
  a.href = url;
  a.download = `${prefix}-${now.toISOString().replace(/[:.]/g, "-")}.json`;
  deps.document.body.append(a);
  a.click();
  a.remove();
  deps.setTimeout(() => deps.url.revokeObjectURL(url), 1000);
}

export function watchDpr(w: DprWindow, onChange: () => void): () => void {
  let stopped = false;
  const arm = (): void => {
    w.matchMedia(`(resolution: ${w.devicePixelRatio || 1}dppx)`).addEventListener(
      "change",
      () => {
        if (stopped) return;
        onChange();
        arm();
      },
      { once: true },
    );
  };
  arm();
  return () => {
    stopped = true;
  };
}
```
3. `banc.ts` et `proto/stylet.ts` : importer `fmt`, `downloadJson` (préfixes `roomboard-appli` et `roomboard-stylet`),
   `watchDpr` (stylet : `watchDpr(window, fitCanvases)`). Si `banc.ts` ne révoquait pas l'URL, c'est un correctif à
   dire au rapport.
4. Vert. Commit : `refactor(web): share fmt, JSON download and DPR watch`.

<a id="tache-t89"></a>
### Tâche T89 — `ProfileStore`, `RuntimeCapabilities`, profil actif en signal

**Objectif.** Usage § 8 points 7, 8, 10 ; U10, DAU8. Le choix du profil se garde par une interface (`ProfileStore`,
première implémentation `localStorage`, profil `defaut` utilisable sans stockage) ; les capacités de la plateforme sont
lues du cœur puis corrigées par la détection ; le profil actif est un signal SolidJS.

**Fichiers.** `apps/web/src/profile-store.ts` (neuf), `profile-store.test.ts` (neuf), `apps/web/src/runtime-capabilities.ts`
(neuf), `runtime-capabilities.test.ts` (neuf), `apps/web/src/ui/active-profile.ts` (neuf), `ui/active-profile.test.ts` (neuf).

**Interfaces.**
- Consomme (T83) : `Profile`, `parseProfile`, `serializeProfile`, `RuntimeCapabilities`, `CAPABILITY_KEYS` de
  `toolbar.ts` ; `BUILTIN_PROFILES`, `DEFAULT_PROFILE_ID` de `toolbar-profiles.ts`.
- Réutilise : `crates/roomboard-wasm/src/lib.rs:62` — `capabilities(platform)` du module Wasm, appelée telle quelle ;
  elle rend `{ desktopAnnotation, multiWindow }` (`serde(rename_all = "camelCase")`, `lib.rs:54`) et lève sur une
  plateforme inconnue (`web`, `windows`, `macos`, `linux`, `android`, `ipados`).
- Produit :
```ts
// profile-store.ts
export interface KeyValue {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
export const PROFILES_KEY = "roomboard.profils";
export const ACTIVE_KEY = "roomboard.profil-actif";
export interface ProfileStore {
  list(): readonly Profile[];          // livrés d'abord, puis ceux de l'utilisateur
  get(id: string): Profile | null;
  isReadOnly(id: string): boolean;     // vrai pour les profils livrés
  save(p: Profile): void;              // lève « profil en lecture seule : <id> » pour un livré
  remove(id: string): void;            // lève pour un livré
  activeId(): string;                  // inconnu ou illisible → "defaut"
  setActive(id: string): void;         // lève « profil inconnu : <id> »
  warnings(): readonly string[];       // stockage illisible, profil écarté (erreurs de parseProfile)
}
/** `kv` null (stockage absent ou qui lève) : mémoire seule. */
export function createProfileStore(kv: KeyValue | null, builtins: readonly Profile[]): ProfileStore;
export function browserKeyValue(w: { readonly localStorage?: Storage }): KeyValue | null;
// runtime-capabilities.ts
export type PlatformName = "web" | "windows" | "macos" | "linux" | "android" | "ipados";
export function detectPlatform(env: { readonly tauri: boolean; readonly userAgent: string }): PlatformName;
export function runtimeCapabilities(staticCaps: unknown, env: { readonly tauri: boolean }): RuntimeCapabilities;
// ui/active-profile.ts (SolidJS)
export interface ActiveProfile {
  readonly profile: Accessor<Profile>;
  readonly capabilities: Accessor<RuntimeCapabilities>;
  choose(id: string): void;            // ProfileStore.setActive puis signal
  setCapabilities(c: RuntimeCapabilities): void;
}
export function createActiveProfile(store: ProfileStore, caps: RuntimeCapabilities): ActiveProfile;
```

**Test et commande bornée.**
`cd <worktree> && pnpm --filter @roomboard/web exec vitest run src/profile-store.test.ts src/runtime-capabilities.test.ts src/ui/active-profile.test.ts 2>&1 | tail -15`
→ ≥ 14 tests, aucun `FAIL `, noms « profil defaut en lecture seule » et « capacité absente : élément masqué, startMode
rabattu » présents.

**Contraintes.**
- Toutes les commandes visent le worktree donné par l'orchestrateur : `cd <worktree> && …` ; avant toute commande
  cargo ou wasm : `export PATH=$HOME/.cargo/bin:$PATH`.
- Worktree neuf : `pnpm install --frozen-lockfile` à la racine ; si `apps/web/src/wasm/` manque (contrat, build web,
  essais), lancer une fois `PATH=$HOME/.cargo/bin:$PATH scripts/verifier.sh 2>&1 | tail -30` au premier plan.
- TDD : le test d'abord, montré rouge (sortie copiée dans le rapport), puis le code, puis vert.
- Aucun test désactivé (`.skip`, `.only`, `#[ignore]` neuf), aucun seuil baissé. Un test qui dépend d'un délai et
  échoue est rejoué une fois ; s'il échoue encore, c'est un échec.
- Commandes longues (verifier.sh, build, essais Playwright) au premier plan avec `timeout: 600000`, jamais en
  `run_in_background`. Sous-agents et relecteurs lancés au premier plan, `run_in_background: false` écrit explicitement.
- Builds Tauri : au plus 2 pour tout le lot sur la VM (le `cargo check` de T87 et le build release de T97), un seul à
  la fois, `CARGO_BUILD_JOBS=2`. Aucune autre tâche ne compile `apps/desktop/src-tauri`. Aucun build Android.
- `git add` fichier par fichier ; jamais `git add -A`, `git add .`, `git commit -a` ; jamais `--force` ; aucun tag,
  aucune release ; `.github/workflows/` non touché.
- Commit : auteur `jejeasterix <jejeasterix@users.noreply.github.com>` (déjà réglé), message en anglais, dernière ligne
  exactement `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (jamais « Sonnet »).
- SolidJS seulement dans `apps/web/src/ui/` (D21) ; `src/engine/` n'importe aucun framework ni `src/ui/`.
- Aucune ressource réseau à l'exécution (D27) : polices et icônes embarquées ; `scripts/controle-hors-ligne.mjs` reste
  vert. Ne jamais retirer `"plugins": { "fs": { "scopeDroppedPaths": false } }` de `tauri.conf.json`.
- Composants de barre : aucun appel à `localStorage` (passer par `ProfileStore`), aucun `switch` ni chaîne de `if` sur
  un identifiant d'outil ou d'action (tables), aucune dimension en pixels (jetons CSS `--rb-btn-s|m|l`), aucun état
  propre au document (tout vient du profil, des capacités et de l'état publié par le moteur), aucun glisser HTML5
  (`draggable`, `dragstart`) dans l'interface.
- Choix du lot 4 gardés (CL4-1 à CL4-15) : aperçus d'édition sur la scène Canvas 2D, `<textarea>` visible, validation
  différée pendant l'IME, retirer la page montrée montre la précédente.
- Réglages `engine/settings.ts` (É2 `prediction`, É3 `inkTrail`, É4 `webgl`, `palm`, `finger`) : défauts et
  adresse `?echelons=`, `?paume=`, `?doigt=` inchangés ; aucun ne se perd dans l'interface neuve.
- Le rapport de la tâche porte, pour chaque ligne `Réutilise :` de sa section, `Réutilisation : appelé <module>` ou
  `Réutilisation : écart — <pourquoi>`.
- Tests DOM et composants : première ligne `// @vitest-environment happy-dom` ; `apps/web/vite.config.ts` garde
  `test: { environment: "node" }` (écart T82 : vite-plugin-solid imposait jsdom), ne pas le changer.

**Interdits.** Aucun composant ne lit `localStorage` : seul `browserKeyValue` y touche. Aucune écriture du profil `defaut`.

**Terminé quand** le magasin survit à un stockage absent, illisible ou qui lève, et les capacités suivent la règle
ci-dessous.

**Étapes.**
1. Tests rouges, `profile-store.test.ts` (faux `KeyValue` en `Map`) :
   - « profil defaut en lecture seule » : `save(defaut)` lève `profil en lecture seule : defaut`, `remove("defaut")` lève,
     `isReadOnly("defaut") === true`.
   - « sans stockage : defaut actif, utilisable » : `createProfileStore(null, BUILTIN_PROFILES).activeId() === "defaut"`.
   - « choix gardé » : `setActive("simple")` écrit `ACTIVE_KEY` ; un second magasin sur le même `KeyValue` rend `simple`.
   - « profil utilisateur : enregistré, relu, clés inconnues gardées » : `save(p)` puis nouveau magasin → `get(p.id)`
     égal, et le JSON stocké contient la clé inconnue (`serializeProfile`).
   - « stockage illisible » : `PROFILES_KEY` = `"{pas du json"` → `list()` = les livrés, `warnings()` non vide.
   - « profil stocké d'une majeure supérieure : écarté avec avertissement, les autres gardés ».
   - « actif inconnu » : `ACTIVE_KEY` = `"disparu"` → `activeId() === "defaut"`.
   - « stockage qui lève » (`setItem` lève `QuotaExceededError`) : `setActive` garde le choix en mémoire, avertissement.
   - `setActive("inconnu")` lève `profil inconnu : inconnu`.
   `runtime-capabilities.test.ts` :
```ts
import { describe, expect, it } from "vitest";
import { detectPlatform, runtimeCapabilities } from "./runtime-capabilities";

describe("RuntimeCapabilities (U10, DAU8)", () => {
  it("web : rien de la coque, même si le cœur dit oui", () => {
    expect(runtimeCapabilities({ desktopAnnotation: true, multiWindow: true }, { tauri: false })).toEqual({
      desktopAnnotation: false, multiWindow: false, dropPaths: false, officeConverter: false,
    });
  });
  it("coque : dropPaths vrai ; annotation et fenêtres selon le cœur", () => {
    expect(runtimeCapabilities({ desktopAnnotation: true, multiWindow: true }, { tauri: true })).toEqual({
      desktopAnnotation: true, multiWindow: true, dropPaths: true, officeConverter: false,
    });
  });
  it("table du cœur illisible : tout faux sauf dropPaths en coque", () => {
    expect(runtimeCapabilities(null, { tauri: true }).desktopAnnotation).toBe(false);
    expect(runtimeCapabilities("x", { tauri: true }).dropPaths).toBe(true);
  });
  it("plateforme : web hors coque ; dans la coque d'après l'agent utilisateur", () => {
    expect(detectPlatform({ tauri: false, userAgent: "Mozilla/5.0 (Windows NT 10.0)" })).toBe("web");
    expect(detectPlatform({ tauri: true, userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64)" })).toBe("windows");
    expect(detectPlatform({ tauri: true, userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)" })).toBe("macos");
    expect(detectPlatform({ tauri: true, userAgent: "Mozilla/5.0 (X11; Linux x86_64)" })).toBe("linux");
  });
});
```
   `ui/active-profile.test.ts` (`// @vitest-environment happy-dom`, `createRoot`) : « capacité absente : élément masqué,
   startMode rabattu » — profil avec un élément `requires: ["dropPaths"]` et `startMode: "desktop-annotation"` ;
   `visibleItems(profile().toolbars[0], capabilities())` sans l'élément ; `setCapabilities({ …, dropPaths: true })` →
   l'élément paraît (effet Solid relancé) ; `resolveStartMode(profile(), capabilities()).mode === "board"`. Et
   « choose change le signal et le magasin ».
2. `runtime-capabilities.ts` :
```ts
import { CAPABILITY_KEYS, type RuntimeCapabilities } from "./toolbar";

export function detectPlatform(env: { readonly tauri: boolean; readonly userAgent: string }): PlatformName {
  if (!env.tauri) return "web";
  const ua = env.userAgent;
  if (/Windows/i.test(ua)) return "windows";
  if (/Macintosh|Mac OS X/i.test(ua)) return "macos";
  if (/Android/i.test(ua)) return "android";
  return "linux";
}

export function runtimeCapabilities(staticCaps: unknown, env: { readonly tauri: boolean }): RuntimeCapabilities {
  const s = typeof staticCaps === "object" && staticCaps !== null ? (staticCaps as Record<string, unknown>) : {};
  const flag = (k: string): boolean => env.tauri && s[k] === true;
  const caps = {
    desktopAnnotation: flag("desktopAnnotation"),
    multiWindow: flag("multiWindow"),
    dropPaths: env.tauri,
    officeConverter: false,
  };
  return Object.fromEntries(CAPABILITY_KEYS.map((k) => [k, caps[k]])) as RuntimeCapabilities;
}
```
3. `profile-store.ts` : stockage = tableau JSON de profils sérialisés ; chaque entrée passe par `parseProfile` ; un id
   de profil livré dans le stockage est ignoré (avertissement). `browserKeyValue(w)` : rend `w.localStorage` si l'accès
   ne lève pas, sinon `null`.
4. `ui/active-profile.ts` : `createSignal` pour le profil et les capacités ; `choose(id)` = `store.setActive(id)` (erreur
   avalée en avertissement de console), puis `setProfile(store.get(id) ?? builtin defaut)`.
5. Vert. Commit : `feat(web): profile store, runtime capabilities, active profile signal`.

<a id="tache-t90"></a>
### Tâche T90 — Moteur : Ajuster la page, style du stylo, caméra publiée, sélection après Suppr + Ctrl+Z, zone de texte qui suit le zoom, `Intl.Segmenter`

**Objectif.** Brancher la page infinie dans le moteur (`fitWidth` partout où `fitPage` servait, action « Ajuster la
page ») ; recevoir le préréglage du profil en commande (`setPenStyle`, usage § 8 point 8) ; publier la caméra pour que la
zone de texte suive le zoom (CL4-15) ; fermer les constats du lot 4 : sélection rendue après Suppr puis Ctrl+Z
(CL5b-12), coupe des lignes par graphème (`Intl.Segmenter`).

**Fichiers.** `apps/web/src/engine/engine.ts`, `engine.test.ts`, `apps/web/src/app/text-editor.ts`,
`text-editor.test.ts`, `apps/web/src/engine/text-layout.ts`, `text-layout.test.ts`.

**Interfaces.**
- Consomme (T84) : `fitWidth(viewW, viewH)` de `camera.ts`.
- Réutilise : `apps/web/src/app/text-editor.ts:25` — `cssMatrix(camera, m)` pour le repositionnement ;
  `apps/web/src/engine/engine.ts:115` — `createEngine` étendu, aucune réécriture.
- Produit (ajouts à `interface Engine`) :
```ts
/** « Ajuster la page » (D5 amendée) : largeur cadrée, haut de page en haut de la vue. */
fitPage(): void;
/** Préréglage reçu de la barre : couleur et épaisseur du stylo (et des formes, texte : couleur). Invalide : ignoré. */
setPenStyle(s: StrokeStyle): void;
/** Chaque changement de caméra (pan, zoom, page montrée, ajustement) ; rend le désabonnement. */
onCamera(cb: (c: Camera) => void): () => void;
```
- Produit (`TextEditor`) : `follow(camera: Camera): void` — si une session est ouverte, réapplique
  `transform = cssMatrix(camera, session.matrix)` ; sinon rien.
- Produit (`text-layout.ts`) : `export function graphemes(s: string): string[]` (par `Intl.Segmenter` granularité
  `grapheme`, repli `Array.from` si absent).

**Test et commande bornée.**
`cd <worktree> && pnpm --filter @roomboard/web exec vitest run src/engine/engine.test.ts src/app/text-editor.test.ts src/engine/text-layout.test.ts 2>&1 | tail -15`
→ aucun `FAIL `, ≥ 8 tests neufs, noms « Ctrl+Z après Suppr resélectionne » et « famille ZWJ jamais coupée » présents.
Tests à garder verts : les 34 (et plus) de `engine.test.ts`, dont ceux de la caméra par page (lot 3b) et CL4-9 ; si un
test existant attend `fitPage` (cadre 1920 × 1080), il est mis à jour pour `fitWidth` avec la raison (D5 amendée) dans
le rapport, jamais retiré.

**Contraintes.**
- Toutes les commandes visent le worktree donné par l'orchestrateur : `cd <worktree> && …` ; avant toute commande
  cargo ou wasm : `export PATH=$HOME/.cargo/bin:$PATH`.
- Worktree neuf : `pnpm install --frozen-lockfile` à la racine ; si `apps/web/src/wasm/` manque (contrat, build web,
  essais), lancer une fois `PATH=$HOME/.cargo/bin:$PATH scripts/verifier.sh 2>&1 | tail -30` au premier plan.
- TDD : le test d'abord, montré rouge (sortie copiée dans le rapport), puis le code, puis vert.
- Aucun test désactivé (`.skip`, `.only`, `#[ignore]` neuf), aucun seuil baissé. Un test qui dépend d'un délai et
  échoue est rejoué une fois ; s'il échoue encore, c'est un échec.
- Commandes longues (verifier.sh, build, essais Playwright) au premier plan avec `timeout: 600000`, jamais en
  `run_in_background`. Sous-agents et relecteurs lancés au premier plan, `run_in_background: false` écrit explicitement.
- Builds Tauri : au plus 2 pour tout le lot sur la VM (le `cargo check` de T87 et le build release de T97), un seul à
  la fois, `CARGO_BUILD_JOBS=2`. Aucune autre tâche ne compile `apps/desktop/src-tauri`. Aucun build Android.
- `git add` fichier par fichier ; jamais `git add -A`, `git add .`, `git commit -a` ; jamais `--force` ; aucun tag,
  aucune release ; `.github/workflows/` non touché.
- Commit : auteur `jejeasterix <jejeasterix@users.noreply.github.com>` (déjà réglé), message en anglais, dernière ligne
  exactement `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (jamais « Sonnet »).
- SolidJS seulement dans `apps/web/src/ui/` (D21) ; `src/engine/` n'importe aucun framework ni `src/ui/`.
- Aucune ressource réseau à l'exécution (D27) : polices et icônes embarquées ; `scripts/controle-hors-ligne.mjs` reste
  vert. Ne jamais retirer `"plugins": { "fs": { "scopeDroppedPaths": false } }` de `tauri.conf.json`.
- Composants de barre : aucun appel à `localStorage` (passer par `ProfileStore`), aucun `switch` ni chaîne de `if` sur
  un identifiant d'outil ou d'action (tables), aucune dimension en pixels (jetons CSS `--rb-btn-s|m|l`), aucun état
  propre au document (tout vient du profil, des capacités et de l'état publié par le moteur), aucun glisser HTML5
  (`draggable`, `dragstart`) dans l'interface.
- Choix du lot 4 gardés (CL4-1 à CL4-15) : aperçus d'édition sur la scène Canvas 2D, `<textarea>` visible, validation
  différée pendant l'IME, retirer la page montrée montre la précédente.
- Réglages `engine/settings.ts` (É2 `prediction`, É3 `inkTrail`, É4 `webgl`, `palm`, `finger`) : défauts et
  adresse `?echelons=`, `?paume=`, `?doigt=` inchangés ; aucun ne se perd dans l'interface neuve.
- Le rapport de la tâche porte, pour chaque ligne `Réutilise :` de sa section, `Réutilisation : appelé <module>` ou
  `Réutilisation : écart — <pourquoi>`.
- Tests DOM et composants : première ligne `// @vitest-environment happy-dom` ; `apps/web/vite.config.ts` garde
  `test: { environment: "node" }` (écart T82 : vite-plugin-solid imposait jsdom), ne pas le changer.

**Interdits.** Le moteur n'importe ni `toolbar.ts` ni `src/ui/` (il reçoit des commandes). Pas d'API `setDocument`
(CL5b-1).

**Terminé quand** les comportements ci-dessous sont testés et la suite web reste verte.

**Étapes.**
1. Tests rouges, `engine.test.ts` (même harnais que les tests existants : faux cœur, faux rendu, `frames` manuels) :
   - « page jamais vue : cadrée par la largeur » : `resize(1000, 400, 1)` → `camera()` égale `fitWidth(1000, 400)`.
   - « fitPage recadre après un zoom » : `view.zoomAt(…, 2)` puis `fitPage()` → `camera()` égale `fitWidth(1000, 400)`.
   - « onCamera : pan, zoom, page, ajustement » : un écouteur reçoit 4 caméras pour `panBy`, `zoomAt`, `nextPage`
     (deux pages), `fitPage` ; désabonné : plus rien.
   - « setPenStyle : le trait suivant prend la couleur et l'épaisseur » : `setPenStyle({ color: "#dc2626", width: 6 })`,
     trait au stylo → l'élément créé a ce style ; `setPenStyle({ color: "", width: 6 })` et `width: NaN` → ignorés.
   - « Ctrl+Z après Suppr resélectionne » :
```ts
it("Ctrl+Z après Suppr resélectionne les éléments rendus (CL5b-12)", () => {
  const { engine, core } = setup(); // harnais existant du fichier
  const a = drawStroke(engine);      // helpers existants de engine.test.ts ; sinon commande CommitStroke directe
  const b = drawStroke(engine);
  selectIds(engine, [a, b]);         // outil Sélection, rectangle autour des deux
  expect(engine.key(key("Delete"))).toBe(true);
  expect(engine.state().selection).toEqual([]);
  engine.key(key("z", { ctrlKey: true }));
  expect([...engine.state().selection].sort()).toEqual([a, b].sort());
});
it("Ctrl+Z après Suppr puis un autre geste : pas de resélection", () => { /* Suppr, trait, Ctrl+Z ×2 → sélection vide */ });
```
     (`setup`, `drawStroke`, `selectIds`, `key` : reprendre les aides du fichier ; s'il en manque une, l'écrire en tête
     du `describe`, sans toucher les autres tests.)
   `text-editor.test.ts` : « la zone suit le zoom » — `open(session, { zoom: 1, tx: 0, ty: 0 })` puis
   `follow({ zoom: 2, tx: 10, ty: 20 })` → `element.style.transform === cssMatrix({ zoom: 2, tx: 10, ty: 20 },
   session.matrix)` ; fermée : `follow` ne change rien.
   `text-layout.test.ts` :
```ts
it("famille ZWJ jamais coupée", () => {
  const family = "👨‍👩‍👧‍👦";
  const measure = (s: string): number => graphemes(s).length * 10;
  expect(layoutText(family + family + family, 36, 15, measure)).toEqual([family, family, family]);
});
it("drapeau et teinte de peau restent entiers", () => {
  const measure = (s: string): number => graphemes(s).length * 10;
  expect(layoutText("🇫🇷👍🏽", 36, 15, measure)).toEqual(["🇫🇷", "👍🏽"]);
});
it("graphemes : repli sur les points de code sans Intl.Segmenter", () => {
  const saved = Intl.Segmenter;
  delete (Intl as { Segmenter?: unknown }).Segmenter;
  try {
    expect(graphemes("ab")).toEqual(["a", "b"]);
  } finally {
    (Intl as { Segmenter?: unknown }).Segmenter = saved;
  }
});
```
2. `text-layout.ts` :
```ts
let cache: { readonly ctor: typeof Intl.Segmenter; readonly seg: Intl.Segmenter } | null = null;

/** Graphèmes (emoji ZWJ, drapeaux, teintes entiers) ; repli par points de code sans Intl.Segmenter. */
export function graphemes(s: string): string[] {
  const ctor = (Intl as { Segmenter?: typeof Intl.Segmenter }).Segmenter;
  if (!ctor) return Array.from(s);
  if (cache?.ctor !== ctor) cache = { ctor, seg: new ctor(undefined, { granularity: "grapheme" }) };
  return Array.from(cache.seg.segment(s), (x) => x.segment);
}
```
   et dans `layoutText`, `const points = graphemes(line);` à la place de `Array.from(line)` ; `trimEnd().length > 1`
   devient `graphemes(line.trimEnd()).length > 1`. Commentaire d'en-tête : « coupé par graphème ».
3. `engine.ts` : `fitPage` → `fitWidth` dans `switchTo` (l. 185) et `resize` (l. 413) ; `cameraListeners` +
   `setCamera(c)` appelé partout où `camera =` est écrit, qui notifie ; `fitPage()` ; `let style` au lieu de `const`
   (l. 121), `setPenStyle` valide (`color` non vide, `width` fini > 0) ; `lastDeleted: string[] | null` posé par la
   branche `delete` (l. 352), remis à `null` par `run`, `sink.begin` et `history("redo")` ; dans `history("undo")`,
   si `lastDeleted` et que chacun de ses ids est de nouveau dans `doc.elementIds(pageId)`, `selectTool.setSelection(
   lastDeleted)` avant `emit()`, puis `lastDeleted = null`.
4. `text-editor.ts` : garder la session ouverte (`let current: TextEditSession | null`) ; `follow`.
5. Vert. Commit : `feat(engine): width fit, pen presets, camera events, reselect after delete undo, grapheme wrap`.

<a id="tache-t91"></a>
### Tâche T91 — Barre des pages et barre des onglets (composants)

**Objectif.** La barre des pages du plan maître (aller à, ajouter, retirer, précédente, suivante, compteur), en liste
(CL5b-8) ; la barre des onglets (D27 amendée) : un onglet par document, titre, marque « modifié », fermer, nouvel
onglet. Composants sans état propre au document : tout arrive par propriétés.

**Fichiers.** `apps/web/src/ui/PagesBar.tsx` (neuf), `PagesBar.test.tsx` (neuf), `apps/web/src/ui/TabsBar.tsx` (neuf),
`TabsBar.test.tsx` (neuf).

**Interfaces.**
- Consomme (T83) : `ToolItem`, `Toolbar`, `ButtonSize` de `toolbar.ts` ; (T94, contrat ci-dessous, codé par T94) :
  `ToolbarHost` — ici reçu en propriété, aucun import d'implémentation.
- Produit :
```ts
// PagesBar.tsx
export interface PagesView { readonly pageIndex: number; readonly pageCount: number }
export interface PagesBarProps {
  readonly bar: Toolbar;                 // role "pages" : ses éléments (actions page-*) dans l'ordre du profil
  readonly items: Accessor<readonly ToolItem[]>;  // visibleItems(bar, caps), calculé par l'appelant
  readonly view: Accessor<PagesView>;
  readonly size: Accessor<ButtonSize>;
  runAction(id: string): void;           // ToolbarHost.runAction
  goTo(index: number): void;             // page de rang `index` (0 = première)
}
export function PagesBar(props: PagesBarProps): JSX.Element;
// TabsBar.tsx
export interface TabView {
  readonly id: string;
  readonly title: string;
  readonly dirty: boolean;
  readonly kind: "board" | "annotation";
}
export interface TabsBarProps {
  readonly tabs: Accessor<readonly TabView[]>;
  readonly active: Accessor<string | null>;
  activate(id: string): void;
  close(id: string): void;
  newTab(): void;
}
export function TabsBar(props: TabsBarProps): JSX.Element;
```
- DOM (contrat des scripts, CL5b-11) : `PagesBar` → `<nav data-toolbar={bar.id} data-role="pages" data-dock={bar.dock}
  data-size={size()} aria-label="Pages">`, boutons d'action `button[data-item=<id>]` (pour ne pas dépendre de T94, même vague que lui, `PagesBar` calcule `page-prev` désactivé si `pageIndex <= 0`, `page-next` si dernière,
  `page-remove` si `pageCount <= 1`, par une table locale `PAGE_STATE: Record<string, (v: PagesView) => boolean>` ; T95 la remplace par `itemState` de T94),
  liste `button[data-page=<n>]` (n = 1…N, `aria-current="page"` sur la page montrée), compteur `<span id="pages">` =
  `pagesLabel` (« 3 / 7 »). `TabsBar` → `<div role="tablist" data-tabs>`, chaque onglet `<div role="tab"
  data-tab={id} aria-selected>` avec titre, `•` si modifié (`data-dirty="1"`), bouton `button[data-tab-close={id}]`
  (`aria-label="Fermer <titre>"`), et `button[data-tab-new]` « + ».

**Test et commande bornée.**
`cd <worktree> && pnpm --filter @roomboard/web exec vitest run src/ui/PagesBar.test.tsx src/ui/TabsBar.test.tsx 2>&1 | tail -15`
→ ≥ 10 tests, aucun `FAIL `, noms « aller à la page 3 » et « onglet modifié marqué » présents.

**Contraintes.**
- Toutes les commandes visent le worktree donné par l'orchestrateur : `cd <worktree> && …` ; avant toute commande
  cargo ou wasm : `export PATH=$HOME/.cargo/bin:$PATH`.
- Worktree neuf : `pnpm install --frozen-lockfile` à la racine ; si `apps/web/src/wasm/` manque (contrat, build web,
  essais), lancer une fois `PATH=$HOME/.cargo/bin:$PATH scripts/verifier.sh 2>&1 | tail -30` au premier plan.
- TDD : le test d'abord, montré rouge (sortie copiée dans le rapport), puis le code, puis vert.
- Aucun test désactivé (`.skip`, `.only`, `#[ignore]` neuf), aucun seuil baissé. Un test qui dépend d'un délai et
  échoue est rejoué une fois ; s'il échoue encore, c'est un échec.
- Commandes longues (verifier.sh, build, essais Playwright) au premier plan avec `timeout: 600000`, jamais en
  `run_in_background`. Sous-agents et relecteurs lancés au premier plan, `run_in_background: false` écrit explicitement.
- Builds Tauri : au plus 2 pour tout le lot sur la VM (le `cargo check` de T87 et le build release de T97), un seul à
  la fois, `CARGO_BUILD_JOBS=2`. Aucune autre tâche ne compile `apps/desktop/src-tauri`. Aucun build Android.
- `git add` fichier par fichier ; jamais `git add -A`, `git add .`, `git commit -a` ; jamais `--force` ; aucun tag,
  aucune release ; `.github/workflows/` non touché.
- Commit : auteur `jejeasterix <jejeasterix@users.noreply.github.com>` (déjà réglé), message en anglais, dernière ligne
  exactement `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (jamais « Sonnet »).
- SolidJS seulement dans `apps/web/src/ui/` (D21) ; `src/engine/` n'importe aucun framework ni `src/ui/`.
- Aucune ressource réseau à l'exécution (D27) : polices et icônes embarquées ; `scripts/controle-hors-ligne.mjs` reste
  vert. Ne jamais retirer `"plugins": { "fs": { "scopeDroppedPaths": false } }` de `tauri.conf.json`.
- Composants de barre : aucun appel à `localStorage` (passer par `ProfileStore`), aucun `switch` ni chaîne de `if` sur
  un identifiant d'outil ou d'action (tables), aucune dimension en pixels (jetons CSS `--rb-btn-s|m|l`), aucun état
  propre au document (tout vient du profil, des capacités et de l'état publié par le moteur), aucun glisser HTML5
  (`draggable`, `dragstart`) dans l'interface.
- Choix du lot 4 gardés (CL4-1 à CL4-15) : aperçus d'édition sur la scène Canvas 2D, `<textarea>` visible, validation
  différée pendant l'IME, retirer la page montrée montre la précédente.
- Réglages `engine/settings.ts` (É2 `prediction`, É3 `inkTrail`, É4 `webgl`, `palm`, `finger`) : défauts et
  adresse `?echelons=`, `?paume=`, `?doigt=` inchangés ; aucun ne se perd dans l'interface neuve.
- Le rapport de la tâche porte, pour chaque ligne `Réutilise :` de sa section, `Réutilisation : appelé <module>` ou
  `Réutilisation : écart — <pourquoi>`.
- Tests DOM et composants : première ligne `// @vitest-environment happy-dom` ; `apps/web/vite.config.ts` garde
  `test: { environment: "node" }` (écart T82 : vite-plugin-solid imposait jsdom), ne pas le changer.

**Interdits.** Aucun appel au moteur ni au document : seulement les propriétés. Aucun `switch` sur un id d'action.
Pas de glisser pour réordonner les onglets.

**Terminé quand** les tests passent et les deux composants rendent le DOM du contrat.

**Étapes.**
1. Tests rouges (`// @vitest-environment happy-dom`, `render`, `fireEvent`), `PagesBar.test.tsx` :
   « compteur 3 / 7 », « aller à la page 3 » (clic `button[data-page="3"]` → `goTo(2)`), « page montrée marquée
   aria-current », « précédente désactivée sur la première, retirer désactivé s'il n'en reste qu'une (D37) »,
   « clic Ajouter → runAction("page-add") », « l'ordre suit le profil » (éléments dans un autre ordre → boutons dans cet
   ordre), « data-size suit le jeton ». `TabsBar.test.tsx` : « un onglet par document, actif aria-selected »,
   « onglet modifié marqué » (`data-dirty="1"` et `•`), « fermer appelle close(id) sans activer », « + appelle
   newTab », « clic sur l'onglet appelle activate ».
2. Composants : `For` sur les éléments ; un `PAGE_STATE` local (table) ; `pagesLabel` exporté de `PagesBar.tsx`
   (`(v) => \`${v.pageIndex + 1} / ${v.pageCount}\``), repris par T95 dans `stage-tags.ts`.
3. Vert. Commit : `feat(ui): pages bar and tabs bar`.

<a id="tache-t92"></a>
### Tâche T92 — Panneau des réglages, choix du profil, diagnostics WebGL2

**Objectif.** Les réglages É2-É4, paume, doigt (lot 3b) passent dans l'interface SolidJS sans perte (mêmes libellés,
même cycle, même rechargement pour É3/É4) ; menu de choix du profil (CL5b-9) ; `badColors` et `lost` du WebGL2 enfin
affichés (constat du lot 3b).

**Fichiers.** `apps/web/src/ui/SettingsPanel.tsx` (neuf), `SettingsPanel.test.tsx` (neuf), `apps/web/src/ui/ProfileMenu.tsx`
(neuf), `ProfileMenu.test.tsx` (neuf).

**Interfaces.**
- Réutilise : `apps/web/src/engine/settings.ts` — `SETTING_KEYS`, `cycleSetting`, `settingLabel`, `needsReload`,
  `settingsSearch`, `SettingsStore`, `EffectiveEchelons` (comme `app/barre.ts:96-150`, dont la logique est reprise,
  pas recopiée : le composant appelle ces fonctions).
- Consomme (T84, contrat) : `RendererDiagnostics` de `engine/render/select.ts` (`{ webgl, lost, badColors }`).
- Consomme (T83) : `Profile`.
- Produit :
```ts
// SettingsPanel.tsx
export const RELOAD_DIRTY_MESSAGE = "Recharger : les onglets non enregistrés seront perdus. Continuer ?";
export interface SettingsPanelProps {
  readonly store: SettingsStore;
  readonly effective: Accessor<EffectiveEchelons>;
  readonly notes: readonly string[];
  readonly diagnostics: Accessor<RendererDiagnostics>;
  search(): string;
  navigate(search: string): void;
  anyDirty(): boolean;
  confirm(message: string): Promise<boolean>;
}
export function SettingsPanel(props: SettingsPanelProps): JSX.Element;
// ProfileMenu.tsx
export interface ProfileMenuProps {
  readonly profiles: Accessor<readonly Profile[]>;
  readonly activeId: Accessor<string>;
  choose(id: string): void;
}
export function ProfileMenu(props: ProfileMenuProps): JSX.Element;
```
- DOM : panneau `<div id="reglages" role="group" aria-label="Réglages du moteur">`, boutons `button[data-reglage=<clé>]`
  (titre « Recharge la page : le dessin en cours est perdu » pour É3/É4, comme avant), `<span id="echelons-notes">`,
  `<p id="webgl-diagnostic">` (« WebGL2 : actif | coupé | repli Canvas 2D » + « contexte perdu » si `lost` + « couleurs
  refusées : #… » si `badColors` non vide). Menu : `<div role="menu" data-profiles>` avec
  `button[role="menuitemradio"][data-profile=<id>]`, `aria-checked` sur l'actif.

**Test et commande bornée.**
`cd <worktree> && pnpm --filter @roomboard/web exec vitest run src/ui/SettingsPanel.test.tsx src/ui/ProfileMenu.test.tsx 2>&1 | tail -15`
→ ≥ 10 tests, aucun `FAIL `, noms « échelon 4 : question si un onglet est modifié » et « badColors affichées » présents.

**Contraintes.**
- Toutes les commandes visent le worktree donné par l'orchestrateur : `cd <worktree> && …` ; avant toute commande
  cargo ou wasm : `export PATH=$HOME/.cargo/bin:$PATH`.
- Worktree neuf : `pnpm install --frozen-lockfile` à la racine ; si `apps/web/src/wasm/` manque (contrat, build web,
  essais), lancer une fois `PATH=$HOME/.cargo/bin:$PATH scripts/verifier.sh 2>&1 | tail -30` au premier plan.
- TDD : le test d'abord, montré rouge (sortie copiée dans le rapport), puis le code, puis vert.
- Aucun test désactivé (`.skip`, `.only`, `#[ignore]` neuf), aucun seuil baissé. Un test qui dépend d'un délai et
  échoue est rejoué une fois ; s'il échoue encore, c'est un échec.
- Commandes longues (verifier.sh, build, essais Playwright) au premier plan avec `timeout: 600000`, jamais en
  `run_in_background`. Sous-agents et relecteurs lancés au premier plan, `run_in_background: false` écrit explicitement.
- Builds Tauri : au plus 2 pour tout le lot sur la VM (le `cargo check` de T87 et le build release de T97), un seul à
  la fois, `CARGO_BUILD_JOBS=2`. Aucune autre tâche ne compile `apps/desktop/src-tauri`. Aucun build Android.
- `git add` fichier par fichier ; jamais `git add -A`, `git add .`, `git commit -a` ; jamais `--force` ; aucun tag,
  aucune release ; `.github/workflows/` non touché.
- Commit : auteur `jejeasterix <jejeasterix@users.noreply.github.com>` (déjà réglé), message en anglais, dernière ligne
  exactement `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (jamais « Sonnet »).
- SolidJS seulement dans `apps/web/src/ui/` (D21) ; `src/engine/` n'importe aucun framework ni `src/ui/`.
- Aucune ressource réseau à l'exécution (D27) : polices et icônes embarquées ; `scripts/controle-hors-ligne.mjs` reste
  vert. Ne jamais retirer `"plugins": { "fs": { "scopeDroppedPaths": false } }` de `tauri.conf.json`.
- Composants de barre : aucun appel à `localStorage` (passer par `ProfileStore`), aucun `switch` ni chaîne de `if` sur
  un identifiant d'outil ou d'action (tables), aucune dimension en pixels (jetons CSS `--rb-btn-s|m|l`), aucun état
  propre au document (tout vient du profil, des capacités et de l'état publié par le moteur), aucun glisser HTML5
  (`draggable`, `dragstart`) dans l'interface.
- Choix du lot 4 gardés (CL4-1 à CL4-15) : aperçus d'édition sur la scène Canvas 2D, `<textarea>` visible, validation
  différée pendant l'IME, retirer la page montrée montre la précédente.
- Réglages `engine/settings.ts` (É2 `prediction`, É3 `inkTrail`, É4 `webgl`, `palm`, `finger`) : défauts et
  adresse `?echelons=`, `?paume=`, `?doigt=` inchangés ; aucun ne se perd dans l'interface neuve.
- Le rapport de la tâche porte, pour chaque ligne `Réutilise :` de sa section, `Réutilisation : appelé <module>` ou
  `Réutilisation : écart — <pourquoi>`.
- Tests DOM et composants : première ligne `// @vitest-environment happy-dom` ; `apps/web/vite.config.ts` garde
  `test: { environment: "node" }` (écart T82 : vite-plugin-solid imposait jsdom), ne pas le changer.

**Interdits.** Ne pas toucher `engine/settings.ts` ni `app/barre.ts`. Aucun `localStorage`.

**Terminé quand** chaque réglage du lot 3b a son bouton, le cycle et le rechargement sont ceux de `settings.ts`, et le
menu change le profil.

**Étapes.**
1. Tests rouges : « un bouton par réglage, dans l'ordre de SETTING_KEYS, libellés de settingLabel » ; « doigt : le clic
   cycle et écrit le magasin, sans recharger » ; « échelon 4 : document propre → navigate(settingsSearch(…)) sans
   question » ; « échelon 4 : question si un onglet est modifié ; Non → aucune navigation ; Oui → navigation » ;
   « notes affichées dans #echelons-notes » ; « badColors affichées » ; « contexte perdu affiché » ; « repli affiché » ;
   ProfileMenu : « un élément par profil, l'actif coché » ; « choisir appelle choose(id) » ; « le profil actif change :
   la coche suit (signal) ».
2. Composants (reprendre les appels de `mountSettings`, `app/barre.ts:115-149`).
3. Vert. Commit : `feat(ui): settings panel, profile menu, WebGL2 diagnostics`.

<a id="tache-t93"></a>
### Tâche T93 — `BoardSession` : un moteur, un rendu, un document par onglet ; `dispose` libère le contexte WebGL2

> Scindée à la relecture du plan (2026-11-20) : la moitié « espace de travail » (onglets, contrôleur de fichiers par
> onglet, Ouvrir et dépôt = nouvel onglet, marquage `#stage`) est la tâche **T98**.

**Objectif.** CL5b-1 et CL5b-2 : le corps de `start()` de `main.ts` (l. 54-247) devient `createBoardSession`, une session
par onglet (sa scène, ses deux canvas, son moteur, son échantillonneur, sa zone de texte), montrée ou cachée par
`activate`/`deactivate`, libérée entièrement par `dispose` (contexte WebGL2 compris : 12 onglets ouverts puis fermés ne
doivent pas épuiser les 16 contextes de Chromium). La session expose aussi les dépendances du banc `?banc` et produit
`#stage[data-webgl-perdu]`.

**Fichiers.** `apps/web/src/app/board-session.ts` (neuf), `apps/web/src/app/board-session.test.ts` (neuf),
`apps/web/src/engine/render/select.ts`, `apps/web/src/engine/render/select.test.ts`.

**Interfaces.**
- Réutilise : `apps/web/src/main.ts:54-247` — déplacé dans `board-session.ts` (mêmes appels, même ordre :
  `chooseRenderer`, `createTextEditor`, `createEngine`, `createSampler`, `createRouter`, `createMiddlePan`,
  `attachInkTrail`, `withLinearPrediction`, `resolvePrediction`) ; `main.ts` lui-même est réduit par T95.
- Réutilise : `apps/web/src/app/barre.ts:180` — `stageTags(s)` importé depuis `./barre` (T95 déplace l'import vers
  `./stage-tags`).
- Réutilise : `apps/web/src/main.ts:222-240` — le contenu de l'objet passé à `createAppBench` (dépendances du banc,
  `apps/web/src/app/banc.ts:16-26`, `AppBenchDeps`) devient `bench()`.
- Réutilise : `apps/web/src/engine/render/fake-gl.ts:95` — `getExtension("WEBGL_lose_context")` journalise déjà
  `"loseContext"` dans `log` : aucun changement du faux.
- Consomme : T88 `watchDpr` ; T90 `Engine.onCamera`, `TextEditor.follow`, `TextEditor.element` ; T84
  `RendererChoice.diagnostics()`.
- Produit :
```ts
// engine/render/select.ts — ajout à RendererChoice (les trois branches de chooseRenderer)
export interface RendererChoice {
  // … champs existants (renderer, webgl, interaction, note) et diagnostics() de T84
  /** Libère la mémoire graphique : branche WebGL2 → `gl.getExtension("WEBGL_lose_context")?.loseContext()`
   *  (exception avalée, comme select.ts:45) ; Canvas 2D → rien. Idempotent. */
  release(): void;
}

// app/board-session.ts
export interface SessionShared {
  readonly container: HTMLElement;          // conteneur des scènes (case centrale de la grille, T95)
  readonly settings: SettingsStore;
  readonly parsed: ParsedSettings;
  readonly support: Support;                // engine/input/stats.ts:119, rendu par detectSupport()
  readonly measure: Measure;
  readonly coreVersion: string;             // core.version(), pour le banc
}
export interface BoardSession {
  readonly doc: CoreDocument;
  readonly engine: Engine;
  readonly stage: HTMLDivElement;
  readonly choice: RendererChoice;
  readonly sampler: Sampler;
  readonly samplerOptions: SamplerOptions;
  /** État de la traînée d'encre (`attachInkTrail`), lu par le banc (`options.inkTrail`). */
  readonly trail: { readonly status: string };
  effective(): EffectiveEchelons;
  /** Dépendances de `createAppBench` pour cette session (main.ts:222-240, à l'identique). */
  bench(): AppBenchDeps;
  /** Rend les ids #stage, #scene, #interaction, #texte-edition à cette session (CL5b-2), la montre, ajuste sa taille. */
  activate(): void;
  /** Cache, retire les quatre ids, relâche les touches tenues (engine.releaseKeys). */
  deactivate(): void;
  /** Observateurs arrêtés, moteur arrêté (engine.dispose), choice.release(), document libéré (doc.free),
   *  scène et zone de texte retirées du DOM. Idempotent. */
  dispose(): void;
}
export function createBoardSession(doc: CoreDocument, shared: SessionShared): Promise<BoardSession>;
```
- Attributs de `#stage` posés par la session (sur son `.rb-stage`, qui porte l'id quand elle est active) : ceux d'avant
  (`data-elements`, `data-version`, `data-page`, `data-selection`, `data-bounds`, `data-tool`, `data-echelons`), plus
  `data-tab` (id de l'onglet, posé par T98), `data-camera="<zoom>,<tx>,<ty>"` (zoom à 3 décimales, tx/ty au dixième, mis
  à jour par `onCamera`, lu par S5b, T96) et `data-webgl-perdu="1"` à l'événement `webglcontextlost` du canvas
  `choice.interaction` (seul producteur de cet attribut, inventaire de l'ancienne barre).

**Patron à ne pas reprendre.** (1) Ajouter au moteur un `setDocument(doc)` qui échange le document sous les outils, les
caméras et le cache du rendu (`apps/web/src/engine/engine.ts:115-200` les lie tous à `doc` à la création) : historiques
mêlés, caméras d'une page d'un autre document, cache d'ids périmé. Ici une session par onglet. (2) Les écouteurs
`keydown`/`keyup`/`blur` posés sur `window` par chaque session (`main.ts:169-175`) : ils sont posés **une fois** par
l'amorce (T95) et vont à la session active ; la session ne pose que ses écouteurs de scène (`wheel`, `mousedown`,
`ResizeObserver`). (3) Croire que `engine.dispose()` libère le rendu : `engine.ts:433` arrête seulement la boucle ;
`loseContext` n'est appelé aujourd'hui que sur l'échec de création (`select.ts:45`). Chemin de référence de la parité à
tenir : `apps/web/src/main.ts:54-247` (ordre de création des pièces ; CL4-2 : zone de texte hors de la scène, `mousedown`
empêché seulement pour l'outil Texte).

**Test et commande bornée.**
`cd <worktree> && pnpm --filter @roomboard/web exec vitest run src/app/board-session.test.ts src/engine/render/select.test.ts 2>&1 | tail -15`
→ ≥ 14 tests, aucun `FAIL `, noms « dispose : contexte WebGL2 perdu, scène retirée, document libéré » et « deux sessions :
un seul #stage, un seul #texte-edition » présents. Tests à garder verts : tous ceux de `select.test.ts` (dont ceux de
T84 sur `diagnostics()`), puis `pnpm --filter @roomboard/web test 2>&1 | tail -6` sans `FAIL `.

**Contraintes.**
- Toutes les commandes visent le worktree donné par l'orchestrateur : `cd <worktree> && …` ; avant toute commande
  cargo ou wasm : `export PATH=$HOME/.cargo/bin:$PATH`.
- Worktree neuf : `pnpm install --frozen-lockfile` à la racine ; si `apps/web/src/wasm/` manque (contrat, build web,
  essais), lancer une fois `PATH=$HOME/.cargo/bin:$PATH scripts/verifier.sh 2>&1 | tail -30` au premier plan.
- TDD : le test d'abord, montré rouge (sortie copiée dans le rapport), puis le code, puis vert.
- Aucun test désactivé (`.skip`, `.only`, `#[ignore]` neuf), aucun seuil baissé. Un test qui dépend d'un délai et
  échoue est rejoué une fois ; s'il échoue encore, c'est un échec.
- Commandes longues (verifier.sh, build, essais Playwright) au premier plan avec `timeout: 600000`, jamais en
  `run_in_background`. Sous-agents et relecteurs lancés au premier plan, `run_in_background: false` écrit explicitement.
- Builds Tauri : au plus 2 pour tout le lot sur la VM (le `cargo check` de T87 et le build release de T97), un seul à
  la fois, `CARGO_BUILD_JOBS=2`. Aucune autre tâche ne compile `apps/desktop/src-tauri`. Aucun build Android.
- `git add` fichier par fichier ; jamais `git add -A`, `git add .`, `git commit -a` ; jamais `--force` ; aucun tag,
  aucune release ; `.github/workflows/` non touché.
- Commit : auteur `jejeasterix <jejeasterix@users.noreply.github.com>` (déjà réglé), message en anglais, dernière ligne
  exactement `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (jamais « Sonnet »).
- SolidJS seulement dans `apps/web/src/ui/` (D21) ; `src/engine/` n'importe aucun framework ni `src/ui/`.
- Aucune ressource réseau à l'exécution (D27) : polices et icônes embarquées ; `scripts/controle-hors-ligne.mjs` reste
  vert. Ne jamais retirer `"plugins": { "fs": { "scopeDroppedPaths": false } }` de `tauri.conf.json`.
- Composants de barre : aucun appel à `localStorage` (passer par `ProfileStore`), aucun `switch` ni chaîne de `if` sur
  un identifiant d'outil ou d'action (tables), aucune dimension en pixels (jetons CSS `--rb-btn-s|m|l`), aucun état
  propre au document (tout vient du profil, des capacités et de l'état publié par le moteur), aucun glisser HTML5
  (`draggable`, `dragstart`) dans l'interface.
- Choix du lot 4 gardés (CL4-1 à CL4-15) : aperçus d'édition sur la scène Canvas 2D, `<textarea>` visible, validation
  différée pendant l'IME, retirer la page montrée montre la précédente.
- Réglages `engine/settings.ts` (É2 `prediction`, É3 `inkTrail`, É4 `webgl`, `palm`, `finger`) : défauts et
  adresse `?echelons=`, `?paume=`, `?doigt=` inchangés ; aucun ne se perd dans l'interface neuve.
- Le rapport de la tâche porte, pour chaque ligne `Réutilise :` de sa section, `Réutilisation : appelé <module>` ou
  `Réutilisation : écart — <pourquoi>`.
- Tests DOM et composants : première ligne `// @vitest-environment happy-dom` ; `apps/web/vite.config.ts` garde
  `test: { environment: "node" }` (écart T82 : vite-plugin-solid imposait jsdom), ne pas le changer.
- Le rendu Canvas 2D retient la hauteur CSS au `resize` (écart T84, page infinie) : le `ResizeObserver` de la session
  passe la taille CSS de sa case (`clientWidth`, `clientHeight`), jamais celle de la fenêtre.

**Interdits.** Aucun `setDocument` dans le moteur. Ne pas toucher `main.ts`, `index.html`, `src/ui/` (T95), ni
`engine.ts` (T90, fait). Aucun écouteur sur `window` dans la session. Ne pas réécrire `fake-gl.ts`.

**Terminé quand** deux sessions coexistent dans un même conteneur avec un seul jeu d'ids, `dispose` perd le contexte
WebGL2 et vide le DOM, `bench()` rend les mêmes dépendances que `main.ts:222-240`, et les tests ci-dessous passent.

**Étapes.**
1. Test rouge, `select.test.ts` (aides existantes du fichier : `FakeCanvas` l. 14, `ctx2d()`, `SRC` l. 27, `FakeGL`) :
```ts
it("release : branche WebGL2 → loseContext ; deux appels → un seul", () => {
  const gl = new FakeGL();
  const scene = new FakeCanvas({ "2d": ctx2d() });
  const live = new FakeCanvas({ "2d": ctx2d(), webgl2: gl });
  const choice = chooseRenderer(el(scene), el(live), SRC, true);
  expect(choice.webgl).toBe(true);
  choice.release();
  choice.release();
  expect(gl.log.filter((l) => l === "loseContext")).toHaveLength(1);
});
it("release : WebGL2 non demandé → rien, aucune exception", () => {
  const choice = chooseRenderer(el(new FakeCanvas({ "2d": ctx2d() })), el(new FakeCanvas({ "2d": ctx2d() })), SRC, false);
  expect(() => choice.release()).not.toThrow();
});
it("release : extension absente → aucune exception", () => {
  const gl = new FakeGL();
  gl.loseContextAvailable = false;
  const choice = chooseRenderer(el(new FakeCanvas({ "2d": ctx2d() })), el(new FakeCanvas({ "2d": ctx2d(), webgl2: gl })), SRC, true);
  expect(() => choice.release()).not.toThrow();
});
```
   (Reprendre la construction exacte des tests existants l. 33-60 si `el`/`ctx2d` y portent un autre nom ; ne changer
   aucun test existant.)
2. Code, `select.ts` : dans la branche WebGL2, `let released = false; release() { if (released) return; released = true;
   try { gl.getExtension("WEBGL_lose_context")?.loseContext(); } catch { /* extension refusée */ } }` ; dans les deux
   branches Canvas 2D, `release() {}`. Vert.
3. Tests rouges, `board-session.test.ts` (`// @vitest-environment happy-dom`, faux contexte 2D, faux cœur
   `fake-core.ts`, `settings` et `parsed` par défaut, WebGL2 coupé sauf le test qui le force avec `FakeGL`) :
```ts
it("activate pose les ids #stage/#scene/#interaction/#texte-edition ; deactivate les retire et cache la scène", async () => {
  const s = await createBoardSession(fakeCore.blank(), shared);
  s.activate();
  expect(document.getElementById("stage")).toBe(s.stage);
  expect(document.getElementById("scene")?.parentElement).toBe(s.stage);
  expect(document.getElementById("texte-edition")).not.toBeNull();
  s.deactivate();
  for (const id of ["stage", "scene", "interaction", "texte-edition"]) expect(document.getElementById(id), id).toBeNull();
  expect(s.stage.hidden).toBe(true);
});
it("deux sessions : un seul #stage, un seul #texte-edition", async () => {
  const a = await createBoardSession(fakeCore.blank(), shared);
  const b = await createBoardSession(fakeCore.blank(), shared);
  a.activate();
  b.deactivate();
  expect(document.querySelectorAll("#stage")).toHaveLength(1);
  expect(document.querySelectorAll("#texte-edition")).toHaveLength(1);
  a.deactivate();
  b.activate();
  expect(document.getElementById("stage")).toBe(b.stage);
  expect(document.querySelectorAll("#texte-edition")).toHaveLength(1);
});
it("dispose : contexte WebGL2 perdu, scène retirée, document libéré", async () => {
  const gl = new FakeGL();
  // happy-dom ne fournit pas de contexte : le test le pose (2D factice, WebGL2 = FakeGL) et le rend en fin de test.
  const restore = stubGetContext({ "2d": () => fake2d(), webgl2: () => gl });
  const doc = fakeCore.blank();
  const free = vi.spyOn(doc, "free");
  const s = await createBoardSession(doc, { ...shared, settings: webglOn });   // É4 actif
  s.dispose();
  expect(gl.log).toContain("loseContext");
  expect(shared.container.contains(s.stage)).toBe(false);
  expect(free).toHaveBeenCalledTimes(1);
  expect(() => s.dispose()).not.toThrow();            // idempotent : free toujours appelé une fois
  expect(free).toHaveBeenCalledTimes(1);
  restore();
});
```
   (`stubGetContext` : aide locale du fichier de test, `vi.spyOn(HTMLCanvasElement.prototype, "getContext")` qui rend
   le contexte du genre demandé ; aucun champ de test dans `SessionShared`.)
   Puis : « la zone de texte suit la caméra (onCamera → follow) » ; « attributs data-* de #stage publiés comme avant
   (elements, version, page, selection, bounds, tool, echelons) » ; « data-camera suit le zoom (zoomAt ×2 → zoom
   doublé à 3 décimales) » ; « webglcontextlost sur choice.interaction → data-webgl-perdu="1" » ; « bench() :
   options.inkTrail suit trail.status, echelons = echelonsTag(effective()), coreVersion = shared.coreVersion » ;
   « mousedown empêché seulement pour l'outil Texte (CL4-2) » ; « aucun écouteur posé sur window » (espion
   `vi.spyOn(window, "addEventListener")` : aucun appel pour `keydown`, `keyup`, `blur`).
4. Code, `board-session.ts` : déplacer `main.ts:54-247` ; chaque session crée `<div class="rb-stage" data-tab>` avec ses
   deux `<canvas>` dans `shared.container`, sa zone de texte dans `shared.container` (hors de la scène, CL4-2), retire
   aussitôt l'id `texte-edition` posé par `createTextEditor` (`editor.element.removeAttribute("id")`) tant qu'elle n'est
   pas active ; `watchDpr` (T88), `ResizeObserver` sur sa scène, `engine.onCamera((c) => { editor.follow(c);
   stage.dataset["camera"] = … })`, publication `#stage[data-*]` via `stageTags`, `wheel` et `mousedown` sur sa scène ;
   `activate` pose `stage.id = "stage"`, `scene.id`, `choice.interaction.id`, `editor.element.id = TEXT_EDITOR_ID`,
   `hidden = false`, puis ajuste la taille ; `deactivate` fait l'inverse et `engine.releaseKeys()` ; `dispose` dans
   l'ordre : observateurs, `engine.dispose()`, `choice.release()`, `doc.free()`, retrait du DOM.
5. Vert, puis la suite web. Commit : `feat(app): board session per tab, releases its WebGL2 context on dispose`.

<a id="tache-t98"></a>
### Tâche T98 — Espace de travail : onglets, contrôleur de fichiers par onglet, Ouvrir et dépôt = nouvel onglet, marquage `#stage`

**Objectif.** D27 amendée et Q1 : la fenêtre tient plusieurs onglets ; chaque onglet a sa `BoardSession` (T93) et son
contrôleur de fichiers ; Ouvrir, Nouveau, le dépôt et le fichier du lancement ouvrent un onglet (CL5b-3) ; une seule
garde de fermeture (CL5b-6) ; Cmd+Q macOS branché ; `kind` d'onglet prévu (CL5b-20) ; le marquage
`#stage[data-fichiers|data-modifie|data-fichier|data-fichier-erreur]`, posé aujourd'hui une fois par
`prepareFiles().mount` (`apps/web/src/platform/mount.ts:96-110`), est tenu **par onglet**. Écarts de la vague 1 :
faux `FileHost` de `controller.test.ts` sans `onDrop` (T86) ; écoute de `roomboard://dropped` avant `launch_files` et
chemins `\\?\C:\…` (T87).

**Fichiers.** `apps/web/src/app/tabs.ts` (neuf), `apps/web/src/app/tabs.test.ts` (neuf),
`apps/web/src/app/workspace.ts` (neuf), `apps/web/src/app/workspace.test.ts` (neuf),
`apps/web/src/platform/controller.ts`, `apps/web/src/platform/controller.test.ts`, `apps/web/src/platform/mount.ts`,
`apps/web/src/platform/mount.test.ts`, `apps/web/src/platform/host-tauri.ts`, `apps/web/src/platform/host-tauri.test.ts`.

**Interfaces.**
- Réutilise : `apps/web/src/platform/controller.ts:77` — `createFileController` étendu (deps changées ci-dessous),
  `fileCommandOf`, `titleOf`, `DISCARD_MESSAGE`, `messageOf` appelés tels quels.
- Réutilise : `apps/web/src/platform/mount.ts:38` — `startDocument(core, pending)` (premier onglet) ; `hostFor` devient
  exporté `prepareHost(w)`.
- Réutilise : `apps/web/src/platform/mount.ts:96-110` — la fonction `mark` (`data-fichiers`, `data-modifie`,
  `data-fichier`) et la pose de `data-fichier-erreur` déplacées dans `workspace.ts`, appliquées au `stage` de chaque
  onglet.
- Réutilise : `apps/web/src/platform/host-tauri.ts:36` — `baseName(path)` (sépare sur `\` et `/` : `\\?\C:\Cours\a.roomboard`
  → `a.roomboard`).
- Consomme : T93 `BoardSession`, `createBoardSession` (via `makeSession`) ; T86 `createImporter`, `DroppedFile`,
  `FileHost.onDrop`, `launchFiles`, `onQuitRequested`, `quitApp`, `TauriIpc`.
- Produit :
```ts
// tabs.ts — pur, générique
export type TabKind = "board" | "annotation";
export const ANNOTATION_NOT_YET = "onglet d'annotation : prévu, livré par C11a";
export const MAX_TABS = 12;
export const TOO_MANY_TABS = "12 onglets au plus ; fermez-en un";
export interface TabEntry<S> { readonly id: string; readonly kind: TabKind; readonly session: S }
export interface Tabs<S> {
  list(): readonly TabEntry<S>[];
  active(): TabEntry<S> | null;
  /** Lève ANNOTATION_NOT_YET pour "annotation", et TOO_MANY_TABS au-delà de MAX_TABS. */
  add(kind: TabKind, session: S, activate?: boolean): TabEntry<S>;
  activate(id: string): boolean;
  /** Retire ; si c'était l'actif, active le précédent (le suivant s'il était premier). Rend l'onglet retiré. */
  remove(id: string): TabEntry<S> | null;
  onChange(cb: () => void): () => void;
}
export function createTabs<S>(newId: () => string): Tabs<S>;

// host-tauri.ts — ajout (l'écoute de la coque est asynchrone : `ipc.listen` rend une promesse)
export interface TauriFileHost extends FileHost {
  /** Se résout quand l'écoute de DROPPED_EVENT posée par le dernier `onDrop` est en place (immédiat si ipc null). */
  dropListening(): Promise<void>;
}
export function createTauriHost(dialog: TauriDialog, fs: TauriFs, ipc?: TauriIpc | null, dpr?: () => number): TauriFileHost;

// mount.ts
export interface PreparedHost {
  readonly kind: HostKind;
  readonly host: FileHost;
  readonly shell: ShellPort;
  /** Hôte Tauri : `dropListening()` ; hôtes web : `Promise.resolve()`. */
  dropReady(): Promise<void>;
}
export function prepareHost(w: Window): Promise<PreparedHost>;

// workspace.ts
export interface TabSession {
  readonly board: BoardSession;
  readonly files: FileController;
}
export interface WorkspaceDeps {
  readonly core: CoreFactory;
  readonly host: FileHost;
  readonly kind: HostKind;                   // pour data-fichiers
  readonly shell: ShellPort;
  readonly first: StartedDocument;
  makeSession(doc: CoreDocument): Promise<BoardSession>;
  /** Attendue après `host.onDrop` et avant `launch` (écart T87). */
  dropReady(): Promise<void>;
  /** Fichiers du lancement (Tauri : `() => launchFiles(ipc)`) ; absent hors coque. */
  launch?(): Promise<readonly DroppedFile[]>;
  readonly now: () => string;
  readonly newId: () => string;
}
export interface Workspace {
  readonly tabs: Tabs<TabSession>;
  active(): TabSession;
  openDocument(file: { readonly name: string; readonly bytes: Uint8Array; readonly target: SaveTarget | null }): Promise<boolean>;
  newBlank(): Promise<void>;
  /** Question si l'onglet est modifié ; dernier onglet : un vierge d'abord (CL5b-5). */
  close(id: string): Promise<boolean>;
  importFiles(files: readonly DroppedFile[], at?: Point | null): Promise<ImportReport>;
  anyDirty(): boolean;
  /** Raccourcis de fichier vers l'onglet actif ; vrai si pris. */
  key(e: FileKey): boolean;
  /** Cmd+Q (macOS) : question si un onglet est modifié, puis `quit`. */
  quitRequested(quit: () => Promise<void>): Promise<void>;
  dispose(): void;
}
/** Ordre fixe : premier onglet, `host.onDrop`, `await dropReady()`, puis `launch()` → importFiles. */
export function createWorkspace(deps: WorkspaceDeps): Promise<Workspace>;
```
- `FileControllerDeps` change (contrôleur par onglet) : retirer `core`, `pending`, `reload` ; ajouter
  `openInTab(file: OpenedFile): Promise<boolean>` et `newTab(): Promise<void>`. `open()` = boîte, puis
  `openInTab(file)` **sans question** (le document courant reste dans son onglet) ; `newDocument()` = `newTab()` sans
  question. Le reste (enregistrer, modifié, titre, raccourcis, touche tenue, T79, T81) ne change pas.
- Marquage par onglet (`workspace.ts`) : à la création d'un onglet et à chaque `files.onChange`, sur `board.stage` :
  `data-fichiers = kind`, `data-modifie = "1" | "0"`, `data-fichier = files.name()`, `data-tab = id` ; une erreur
  d'ouverture du premier document (`first.error`) pose `data-fichier-erreur` sur le stage du premier onglet et
  `notify`. Comme l'id `stage` suit l'onglet actif (CL5b-2), `#stage[data-modifie]` est toujours celui de l'onglet montré.
- `prepareFiles(...).mount` n'a plus d'appelant : le retirer avec ses tests propres (les cas qu'ils couvrent sont
  repris par les tests de marquage de `workspace.test.ts`, listés à l'étape 2).

**Patron à ne pas reprendre.** (1) Une garde de fermeture par contrôleur (`controller.ts:180`, `d.shell.guardClose`) :
avec N onglets, N gardes et N questions. Ici le contrôleur reçoit un `ShellPort` d'onglet dont `guardClose` est inerte et
`setTitle` n'agit que pour l'onglet actif ; `createWorkspace` pose **une** garde, `() => anyDirty()`. (2) Le marquage
posé une fois sur `#stage` par `mount.ts:96-110` : avec des onglets, il resterait celui du premier document. (3)
`host.onDrop(...)` puis `launch()` sans attendre : `onDrop` rend la main avant que `ipc.listen` soit en place
(`host-tauri.ts`, `const sub = ipc.listen(...)`, promesse), un fichier ouvert par le Finder dans l'intervalle est émis
sans écouteur et se perd. Chemin de référence : `apps/web/src/platform/mount.ts:80-115` (montage actuel).

**Test et commande bornée.**
`cd <worktree> && pnpm --filter @roomboard/web exec vitest run src/app/tabs.test.ts src/app/workspace.test.ts src/platform/controller.test.ts src/platform/mount.test.ts src/platform/host-tauri.test.ts 2>&1 | tail -15`
→ ≥ 30 tests, aucun `FAIL `, noms « ouvrir : nouvel onglet, l'onglet d'origine intact », « fermeture gardée si un
onglet est modifié », « lancement : écoute du dépôt posée avant launch_files » et « marquage #stage par onglet »
présents. Puis `cd <worktree> && pnpm --filter @roomboard/web exec tsc --noEmit 2>&1 | tail -5` → aucune ligne
`error TS` (la TS2741 de `controller.test.ts:54` a disparu). Tests à garder verts : tous ceux de `controller.test.ts`
hors ceux qui décrivent le rechargement, qui sont **réécrits** (pas retirés) selon la table ci-dessous ; tous ceux de
`host-tauri.test.ts` (T86) ; `pnpm -r test` vert.

| test actuel (`controller.test.ts`) | devient |
|---|---|
| l. 160 aller-retour (attente, rechargement) | « aller-retour : enregistrer puis ouvrir donne à openInTab les mêmes octets » |
| l. 242 ouvrir modifié : question puis Non | « ouvrir un document modifié : aucune question, openInTab appelé, document courant modifié intact » |
| l. 251 fichier illisible | « openInTab qui rend false : rien d'autre, aucun message en double » |
| l. 275 fermeture levée pendant le rechargement | « garde de fermeture : jamais posée par le contrôleur d'onglet » (la garde passe au workspace) |
| l. 316, 377 nouveau (question, attente, rechargement) | « nouveau : newTab, sans question, document courant intact » |
| l. 341, 356 attente impossible | « openInTab qui lève : message « Ouverture impossible », la commande rend false » |
| l. 387 document ouvert depuis l'attente | gardé : nom et cible repris de `opened` |
| l. 428, 440 (T79) rechargement voulu | « confirm qui rejette pendant une commande : aucun rejet non géré » (sur Ctrl+N : sans confirm, devient sur Ouvrir + notify) |

**Contraintes.**
- Toutes les commandes visent le worktree donné par l'orchestrateur : `cd <worktree> && …` ; avant toute commande
  cargo ou wasm : `export PATH=$HOME/.cargo/bin:$PATH`.
- Worktree neuf : `pnpm install --frozen-lockfile` à la racine ; si `apps/web/src/wasm/` manque (contrat, build web,
  essais), lancer une fois `PATH=$HOME/.cargo/bin:$PATH scripts/verifier.sh 2>&1 | tail -30` au premier plan.
- TDD : le test d'abord, montré rouge (sortie copiée dans le rapport), puis le code, puis vert.
- Aucun test désactivé (`.skip`, `.only`, `#[ignore]` neuf), aucun seuil baissé. Un test qui dépend d'un délai et
  échoue est rejoué une fois ; s'il échoue encore, c'est un échec.
- Commandes longues (verifier.sh, build, essais Playwright) au premier plan avec `timeout: 600000`, jamais en
  `run_in_background`. Sous-agents et relecteurs lancés au premier plan, `run_in_background: false` écrit explicitement.
- Builds Tauri : au plus 2 pour tout le lot sur la VM (le `cargo check` de T87 et le build release de T97), un seul à
  la fois, `CARGO_BUILD_JOBS=2`. Aucune autre tâche ne compile `apps/desktop/src-tauri`. Aucun build Android.
- `git add` fichier par fichier ; jamais `git add -A`, `git add .`, `git commit -a` ; jamais `--force` ; aucun tag,
  aucune release ; `.github/workflows/` non touché.
- Commit : auteur `jejeasterix <jejeasterix@users.noreply.github.com>` (déjà réglé), message en anglais, dernière ligne
  exactement `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (jamais « Sonnet »).
- SolidJS seulement dans `apps/web/src/ui/` (D21) ; `src/engine/` n'importe aucun framework ni `src/ui/`.
- Aucune ressource réseau à l'exécution (D27) : polices et icônes embarquées ; `scripts/controle-hors-ligne.mjs` reste
  vert. Ne jamais retirer `"plugins": { "fs": { "scopeDroppedPaths": false } }` de `tauri.conf.json`.
- Composants de barre : aucun appel à `localStorage` (passer par `ProfileStore`), aucun `switch` ni chaîne de `if` sur
  un identifiant d'outil ou d'action (tables), aucune dimension en pixels (jetons CSS `--rb-btn-s|m|l`), aucun état
  propre au document (tout vient du profil, des capacités et de l'état publié par le moteur), aucun glisser HTML5
  (`draggable`, `dragstart`) dans l'interface.
- Choix du lot 4 gardés (CL4-1 à CL4-15) : aperçus d'édition sur la scène Canvas 2D, `<textarea>` visible, validation
  différée pendant l'IME, retirer la page montrée montre la précédente.
- Réglages `engine/settings.ts` (É2 `prediction`, É3 `inkTrail`, É4 `webgl`, `palm`, `finger`) : défauts et
  adresse `?echelons=`, `?paume=`, `?doigt=` inchangés ; aucun ne se perd dans l'interface neuve.
- Le rapport de la tâche porte, pour chaque ligne `Réutilise :` de sa section, `Réutilisation : appelé <module>` ou
  `Réutilisation : écart — <pourquoi>`.
- Tests DOM et composants : première ligne `// @vitest-environment happy-dom` ; `apps/web/vite.config.ts` garde
  `test: { environment: "node" }` (écart T82 : vite-plugin-solid imposait jsdom), ne pas le changer.

**Interdits.** Aucune écriture neuve dans l'attente IndexedDB. Ne pas toucher `main.ts`, `index.html`, `src/ui/` (T95),
ni `board-session.ts` (T93). Aucun rechargement de page pour Ouvrir ou Nouveau. Aucun chemin complet affiché (onglet,
titre, message) : nom de base seulement.

**Terminé quand** deux onglets ont des historiques indépendants, Ouvrir et dépôt ajoutent un onglet sans toucher l'actif,
la fenêtre n'a qu'une garde, le marquage `#stage` suit l'onglet montré, l'écoute du dépôt précède `launch_files`,
`tsc --noEmit` est propre, et les tests ci-dessous passent.

**Étapes.**
1. Écart T86 d'abord : dans `controller.test.ts`, le faux `FileHost` (l. 54) gagne `onDrop: () => () => undefined` ;
   `tsc --noEmit` rouge sur cette erreur avant, propre après (sortie copiée).
2. Tests rouges. `tabs.test.ts` : ajout et activation ; « retirer l'actif montre le précédent ; le premier : le
   suivant » ; « annotation : lève ANNOTATION_NOT_YET » ; « 13e onglet refusé : TOO_MANY_TABS » ; onChange appelé à
   chaque changement. `workspace.test.ts` (`// @vitest-environment happy-dom`, faux cœur `fake-core.ts`, fausse
   `makeSession` qui rend un objet `BoardSession` minimal : `stage` = `<div>`, `engine.state().version` suit le faux
   document, `activate`/`deactivate`/`dispose` espionnés) :
```ts
it("ouvrir : nouvel onglet, l'onglet d'origine intact", async () => {
  const ws = await setupWorkspace();                  // un onglet vierge
  const first = ws.active();
  drawOn(first);                                      // version + 1 : modifié
  const bytes = fakeCore.blank().save("2026-11-20T00:00:00Z", "0.1.0");
  expect(await ws.openDocument({ name: "Cours.roomboard", bytes, target: null })).toBe(true);
  expect(ws.tabs.list()).toHaveLength(2);
  expect(ws.active()).not.toBe(first);
  expect(first.files.isDirty()).toBe(true);          // rien d'abandonné, aucune question
  expect(shell.confirm).not.toHaveBeenCalled();
  expect(ws.active().files.name()).toBe("Cours.roomboard");
});
it("marquage #stage par onglet", async () => {
  const ws = await setupWorkspace({ kind: "repli" });
  const first = ws.active();
  drawOn(first);
  await ws.newBlank();
  const second = ws.active();
  expect(first.board.stage.dataset["modifie"]).toBe("1");
  expect(second.board.stage.dataset["modifie"]).toBe("0");
  expect(second.board.stage.dataset["fichiers"]).toBe("repli");
  expect(second.board.stage.dataset["fichier"]).toBe(second.files.name());
  expect(second.board.stage.dataset["tab"]).toBe(ws.tabs.active()!.id);
});
it("lancement : écoute du dépôt posée avant launch_files", async () => {
  const order: string[] = [];
  let listening!: () => void;
  const ws = await setupWorkspace({
    onDrop: () => { order.push("onDrop"); return () => undefined; },
    dropReady: () => new Promise<void>((r) => { listening = () => { order.push("listening"); r(); }; setTimeout(listening, 0); }),
    launch: async () => { order.push("launch"); return [roomboardFile("C:\\Cours\\a.roomboard")]; },
  });
  expect(order).toEqual(["onDrop", "listening", "launch"]);
  expect(ws.tabs.list()).toHaveLength(2);
});
it("chemin Windows \\\\?\\C:\\… : l'onglet et le titre portent le nom de base seulement", async () => {
  const ws = await setupWorkspace({ launch: async () => [roomboardFile("\\\\?\\C:\\Cours\\a.roomboard")] });
  expect(ws.active().files.name()).toBe("a.roomboard");
  expect(shell.setTitle).toHaveBeenLastCalledWith(expect.not.stringContaining("C:"));
});
it("erreur du premier document : data-fichier-erreur sur le premier onglet et message", async () => { /* first.error */ });
it("fichier illisible : message, aucun onglet ajouté", async () => { /* bytes = [1,2,3] → false, notify « Ouverture impossible (x.roomboard) : … », 1 onglet */ });
it("dépôt d'un .png : message, document intact, aucun onglet", async () => { /* importFiles([png]) → refused, version inchangée, 1 onglet */ });
it("historiques indépendants : Ctrl+Z dans l'onglet 2 ne touche pas l'onglet 1", async () => { /* … */ });
it("fermeture gardée si un onglet est modifié", async () => {
  const ws = await setupWorkspace();
  expect(guard()).toBe(false);                        // la seule garde posée sur le shell réel
  await ws.newBlank();
  drawOn(ws.active());
  expect(guard()).toBe(true);
  expect(shell.guardClose).toHaveBeenCalledTimes(1);
});
it("fermer un onglet modifié : question ; Non → gardé ; Oui → retiré, précédent montré", async () => { /* … */ });
it("fermer le dernier onglet : un vierge le remplace (CL5b-5)", async () => { /* 1 onglet, close → 1 onglet, autre id */ });
it("activer un onglet : deactivate de l'ancien puis activate du nouveau", async () => { /* ordre des espions */ });
it("titre de la fenêtre : celui de l'onglet actif seulement", async () => { /* setTitle du shell réel */ });
it("Cmd+Q : document propre → quit ; modifié → question, Non → rien", async () => { /* quitRequested */ });
it("raccourcis : Ctrl+S va au contrôleur de l'onglet actif", async () => { /* key({ key: 's', ctrlKey: true }) */ });
it("dispose : sessions libérées (board.dispose), garde retirée, onDrop désabonné", async () => { /* … */ });
```
   `host-tauri.test.ts` : « dropListening se résout après ipc.listen » (faux `ipc.listen` qui rend une promesse
   résolue à la main : `dropListening()` encore en attente avant, résolue après) ; « ipc null : dropListening résolu ».
   `mount.test.ts` : `prepareHost(w)` rend `{ kind, host, shell, dropReady }`, passe `w.document` comme cible de dépôt
   aux hôtes web, `dropReady()` résolu pour les hôtes web.
3. `controller.ts` : nouvelles deps, `open`/`newDocument` comme ci-dessus ; réécrire les tests de la table.
4. `tabs.ts` ; `host-tauri.ts` : `createTauriHost` garde la dernière promesse `sub` d'`onDrop` et
   `dropListening = () => (sub ?? Promise.resolve()).then(() => undefined)`.
5. `workspace.ts` : un contrôleur par onglet (`openInTab: (f) => ws.openDocument(f)`, `newTab: () => ws.newBlank()`,
   `shell` d'onglet), marquage par onglet, `createImporter({ openDocument, notify: shell.notify })`,
   `host.onDrop((files, at) => void importFiles(files, at))`, `await deps.dropReady()`, puis `deps.launch?.()` →
   `importFiles(files, null)` ; garde unique ; `openDocument` = `core.load(bytes)` (erreur → `notify("Ouverture
   impossible (<nom>) : <message>")`, false) puis `makeSession` puis `tabs.add("board", …)` (TOO_MANY_TABS → `notify`,
   session libérée, false).
6. `mount.ts` : exporter `prepareHost(w)` (ex-`hostFor` + choix du genre + `dropReady`) ; `startDocument` gardé pour le
   premier onglet ; retirer `prepareFiles().mount` (marquage et raccourcis passent au workspace et à l'amorce T95).
7. Vert, `tsc --noEmit` propre, `pnpm -r test`. Commit : `feat(app): workspace with tabs and one file controller per tab`.

<a id="tache-t94"></a>
### Tâche T94 — Barre d'outils SolidJS en profils : `ToolbarHost`, état des éléments par table, dock, taille

**Objectif.** Usage § 8 points 2-4, 6, 8, 9, 13, 17 ; U12, U15. La barre se dessine depuis le profil actif et les
capacités ; elle ne parle au reste que par `ToolbarHost` ; l'état des boutons (pressé, désactivé, libellé) vient d'une
table, jamais d'un `switch` ; le `dock` donne la mise en page (CL5b-10) ; la taille vient d'un jeton CSS.

**Fichiers.** `apps/web/src/ui/Toolbar.tsx` (neuf), `Toolbar.test.tsx` (neuf), `apps/web/src/ui/item-state.ts` (neuf),
`item-state.test.ts` (neuf), `apps/web/src/ui/layout.ts` (neuf), `layout.test.ts` (neuf), `apps/web/src/ui/rb.css` (neuf),
`apps/web/src/app/toolbar-host.ts` (neuf), `toolbar-host.test.ts` (neuf).

**Interfaces.**
- Consomme (T83) : `Toolbar`, `ToolItem`, `ButtonSize`, `Dock`, `StartMode`, `TOOL_TABLE`, `ACTION_TABLE`,
  `visibleItems`, `Profile`, `RuntimeCapabilities` ; (T89) `ActiveProfile` ; (T86) `DroppedFile`, `Point`.
- Produit :
```ts
// app/toolbar-host.ts — U15, implémentation locale par appels directs
export interface ToolbarHost {
  setTool(tool: string, preset?: string): void;
  runAction(id: string): void;
  dropFiles(files: readonly DroppedFile[], at?: Point | null): void;
  setMode(mode: StartMode): void;
}
export interface HostTargets {
  engine(): Pick<Engine, "setTool" | "setEraserMode" | "state" | "undo" | "redo" | "addPage" | "removePage" | "nextPage" | "prevPage" | "fitPage" | "setPenStyle">;
  runFile(cmd: FileCommand): void;
  importFiles(files: readonly DroppedFile[], at?: Point | null): void;
  toggle(panel: "settings" | "profiles"): void;
}
export const ACTIONS: Readonly<Record<string, (t: HostTargets) => void>>;
export function createLocalToolbarHost(t: HostTargets, profile: () => Profile): ToolbarHost;
// ui/item-state.ts — pur
export interface ToolbarView {
  readonly tool: string;               // EngineState.tool
  readonly eraserMode: "partial" | "object";
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly pageIndex: number;
  readonly pageCount: number;
}
export interface ItemState { readonly pressed: boolean | null; readonly disabled: boolean; readonly label: string }
export const ACTION_STATE: Readonly<Record<string, (v: ToolbarView) => Partial<ItemState>>>;
export function itemState(item: ToolItem, v: ToolbarView): ItemState;
// ui/layout.ts — pur
export interface GridLayout { readonly areas: string; readonly columns: string; readonly rows: string }
/** Grille CSS : onglets en haut, barres top/bottom en lignes, left/right en colonnes, scène au centre ; floating hors grille. */
export function layoutFor(bars: readonly { readonly id: string; readonly dock: Dock }[]): GridLayout;
// ui/Toolbar.tsx
export interface ToolbarProps {
  readonly bar: Toolbar;
  readonly caps: Accessor<RuntimeCapabilities>;
  readonly view: Accessor<ToolbarView>;
  readonly size: Accessor<ButtonSize>;
  readonly host: ToolbarHost;
}
export function Toolbar(props: ToolbarProps): JSX.Element;
```
- Table `ACTIONS` (une ligne par action de `ACTION_TABLE`) : `undo`, `redo`, `page-*`, `fit-page` → méthode du moteur ;
  `eraser-mode` → bascule `partial`/`object` ; `file-new|open|save|save-as` → `runFile("new"|"open"|"save"|"saveAs")` ;
  `settings`, `profiles` → `toggle`. `ACTION_STATE` : `eraser-mode` → `{ pressed: mode objet, label: "Gomme :
  partielle|objet" }` ; `undo`/`redo` → désactivés sans étape ; `page-prev`, `page-next`, `page-remove` comme l'ancienne
  barre (`app/barre.ts:166-176`). Élément `tool` : `pressed = view.tool === TOOL_TABLE[tool].choice`.
- DOM : `<div class="rb-bar" data-toolbar={bar.id} data-role={bar.role} data-dock={bar.dock} data-size={size()}
  role="toolbar" aria-label={bar.id}>` ; `button[data-item=<id>]` (`type="button"`, `aria-pressed` si `pressed !==
  null`, `disabled`, texte = libellé de l'état) ; séparateur `<span class="rb-sep" role="separator">` ; `dropzone` :
  `<div class="rb-drop" data-item>` qui reçoit un dépôt HTML5 (`listenWebDrop` de T86) → `host.dropFiles`.
- `rb.css` : jetons `--rb-btn-s: 36px; --rb-btn-m: 44px; --rb-btn-l: 64px` sur `:root`,
  `.rb-bar[data-size="m"] { --rb-btn: var(--rb-btn-m) }` (idem s, l), `.rb-bar button { min-width: var(--rb-btn);
  min-height: var(--rb-btn) }`, `data-dock` top/bottom → `flex-direction: row; flex-wrap: wrap` (la barre `outils`
  du profil `defaut` a 19 boutons : à 1280 px elle passe sur deux lignes au lieu de déborder), left/right →
  `flex-direction: column; flex-wrap: wrap` ; styles des boutons pressés repris de `index.html` (`#1e3a8a`) ; aucune
  dimension dans les `.tsx`. Les règles de la scène (`.rb-stage`) ne sont pas ici : T95 les ajoute à ce fichier.

**Test et commande bornée.**
`cd <worktree> && pnpm --filter @roomboard/web exec vitest run src/ui/Toolbar.test.tsx src/ui/item-state.test.ts src/ui/layout.test.ts src/app/toolbar-host.test.ts 2>&1 | tail -15`
→ ≥ 20 tests, aucun `FAIL `, noms « outil inconnu : bouton absent » et « aucun switch sur l'identifiant » présents.

**Contraintes.**
- Toutes les commandes visent le worktree donné par l'orchestrateur : `cd <worktree> && …` ; avant toute commande
  cargo ou wasm : `export PATH=$HOME/.cargo/bin:$PATH`.
- Worktree neuf : `pnpm install --frozen-lockfile` à la racine ; si `apps/web/src/wasm/` manque (contrat, build web,
  essais), lancer une fois `PATH=$HOME/.cargo/bin:$PATH scripts/verifier.sh 2>&1 | tail -30` au premier plan.
- TDD : le test d'abord, montré rouge (sortie copiée dans le rapport), puis le code, puis vert.
- Aucun test désactivé (`.skip`, `.only`, `#[ignore]` neuf), aucun seuil baissé. Un test qui dépend d'un délai et
  échoue est rejoué une fois ; s'il échoue encore, c'est un échec.
- Commandes longues (verifier.sh, build, essais Playwright) au premier plan avec `timeout: 600000`, jamais en
  `run_in_background`. Sous-agents et relecteurs lancés au premier plan, `run_in_background: false` écrit explicitement.
- Builds Tauri : au plus 2 pour tout le lot sur la VM (le `cargo check` de T87 et le build release de T97), un seul à
  la fois, `CARGO_BUILD_JOBS=2`. Aucune autre tâche ne compile `apps/desktop/src-tauri`. Aucun build Android.
- `git add` fichier par fichier ; jamais `git add -A`, `git add .`, `git commit -a` ; jamais `--force` ; aucun tag,
  aucune release ; `.github/workflows/` non touché.
- Commit : auteur `jejeasterix <jejeasterix@users.noreply.github.com>` (déjà réglé), message en anglais, dernière ligne
  exactement `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (jamais « Sonnet »).
- SolidJS seulement dans `apps/web/src/ui/` (D21) ; `src/engine/` n'importe aucun framework ni `src/ui/`.
- Aucune ressource réseau à l'exécution (D27) : polices et icônes embarquées ; `scripts/controle-hors-ligne.mjs` reste
  vert. Ne jamais retirer `"plugins": { "fs": { "scopeDroppedPaths": false } }` de `tauri.conf.json`.
- Composants de barre : aucun appel à `localStorage` (passer par `ProfileStore`), aucun `switch` ni chaîne de `if` sur
  un identifiant d'outil ou d'action (tables), aucune dimension en pixels (jetons CSS `--rb-btn-s|m|l`), aucun état
  propre au document (tout vient du profil, des capacités et de l'état publié par le moteur), aucun glisser HTML5
  (`draggable`, `dragstart`) dans l'interface.
- Choix du lot 4 gardés (CL4-1 à CL4-15) : aperçus d'édition sur la scène Canvas 2D, `<textarea>` visible, validation
  différée pendant l'IME, retirer la page montrée montre la précédente.
- Réglages `engine/settings.ts` (É2 `prediction`, É3 `inkTrail`, É4 `webgl`, `palm`, `finger`) : défauts et
  adresse `?echelons=`, `?paume=`, `?doigt=` inchangés ; aucun ne se perd dans l'interface neuve.
- Le rapport de la tâche porte, pour chaque ligne `Réutilise :` de sa section, `Réutilisation : appelé <module>` ou
  `Réutilisation : écart — <pourquoi>`.
- Tests DOM et composants : première ligne `// @vitest-environment happy-dom` ; `apps/web/vite.config.ts` garde
  `test: { environment: "node" }` (écart T82 : vite-plugin-solid imposait jsdom), ne pas le changer.

**Interdits.** Aucun `switch`, aucune chaîne `if (id === …)` sur un identifiant d'outil ou d'action dans `src/ui/` et
`toolbar-host.ts` (tables seulement). Aucun `draggable`, `dragstart`. Aucune dimension en `px` dans les `.tsx`.

**Terminé quand** la barre `outils` du profil `defaut` se rend avec tous ses boutons, réagit à l'état publié, et le profil
`simple` donne une barre à gauche en grands boutons, et le contrôle de source couvre `src/ui/` et `app/toolbar-host.ts`
(le test est rouge si l'on ajoute un `switch (` dans `toolbar-host.ts` : à vérifier une fois, puis retirer).

**Étapes.**
1. Tests rouges, `item-state.test.ts` : un test par ligne d'`ACTION_STATE` et un pour les outils (pressé selon
   `view.tool`, `hand` compris). `layout.test.ts` :
```ts
import { describe, expect, it } from "vitest";
import { layoutFor } from "./layout";

describe("layoutFor (CL5b-10)", () => {
  it("defaut : onglets, barre en haut, scène, pages en bas", () => {
    expect(layoutFor([{ id: "outils", dock: "top" }, { id: "pages", dock: "bottom" }])).toEqual({
      areas: '"tabs" "outils" "stage" "pages"',
      columns: "minmax(0, 1fr)",
      rows: "auto auto minmax(0, 1fr) auto",
    });
  });
  it("simple : barre à gauche, pages en bas", () => {
    expect(layoutFor([{ id: "outils", dock: "left" }, { id: "pages", dock: "bottom" }])).toEqual({
      areas: '"tabs tabs" "outils stage" "pages pages"',
      columns: "auto minmax(0, 1fr)",
      rows: "auto minmax(0, 1fr) auto",
    });
  });
  it("floating : hors grille", () => {
    expect(layoutFor([{ id: "f", dock: "floating" }]).areas).toBe('"tabs" "stage"');
  });
});
```
   `Toolbar.test.tsx` (`happy-dom`) : « defaut : un bouton par élément visible, dans l'ordre » ; « outil inconnu : bouton
   absent » ; « requires dropPaths sans capacité : absent ; capacité ajoutée (signal) : présent » ; « clic sur Stylo →
   host.setTool("pen") » ; « clic sur Annuler → host.runAction("undo") » ; « l'état publié change : aria-pressed suit,
   sans recréer les boutons » (même nœud DOM avant et après) ; « data-size suit le jeton » ; « séparateur rendu
   role=separator » ; et le contrôle de source :
```ts
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
it("aucun switch sur l'identifiant, aucun px, aucun localStorage, aucun glisser HTML5 dans src/ui", () => {
  const dir = join(__dirname);
  const files = readdirSync(dir).filter((n) => /\.tsx?$/.test(n) && !/\.test\./.test(n)).map((n) => join(dir, n));
  files.push(join(dir, "..", "app", "toolbar-host.ts"));       // l'hôte de la barre obéit aux mêmes règles
  for (const path of files) {
    const f = path.split(/[\\/]/).pop()!;
    const src = readFileSync(path, "utf8");
    expect(src, f).not.toMatch(/switch\s*\(/);
    expect(src, f).not.toMatch(/localStorage/);
    expect(src, f).not.toMatch(/draggable|dragstart/);
    if (f.endsWith(".tsx")) expect(src, f).not.toMatch(/\d+px/);
  }
});
```
   `toolbar-host.test.ts` : « setTool("rect") → engine.setTool("rect") » ; « setTool("laser") inconnu → rien » ;
   « setTool("pen", "rouge") → setPenStyle({ color: "#dc2626", width: 4 }) puis setTool("pen") » ; « chaque action
   d'ACTION_TABLE a son entrée dans ACTIONS » ; « file-save → runFile("save") » ; « setMode("desktop-annotation") → rien
   au lot 5b (avertissement) » ; « dropFiles → importFiles ».
2. Code : `item-state.ts`, `layout.ts`, `toolbar-host.ts`, `Toolbar.tsx` (`For` sur `visibleItems(bar, caps())` dans un
   `createMemo`), `rb.css`.
3. Vert. Commit : `feat(ui): profile-driven toolbar with ToolbarHost and dock layout`.

<a id="tache-t95"></a>
### Tâche T95 — Application SolidJS assemblée : `App.tsx`, `main.ts` réduit, `index.html`, barre DOM retirée, la barre ne recouvre rien

**Objectif.** Remplacer la barre DOM (`app/barre.ts` : `#barre`, `#reglages`, `#edition`) par l'interface SolidJS :
onglets, barres du profil actif placées selon leur `dock`, scène dans la case centrale (la barre ne recouvre rien),
barre des pages, panneau des réglages, menu des profils, ligne d'état. Rien de l'inventaire ne se perd.

**Fichiers.** `apps/web/src/ui/App.tsx` (neuf), `App.test.tsx` (neuf), `apps/web/src/main.ts`, `apps/web/index.html`,
`apps/web/src/app/barre.ts` (retiré), `app/barre.test.ts` (retiré), `apps/web/src/app/stage-tags.ts` (neuf),
`stage-tags.test.ts` (neuf), `apps/web/src/toolbar.ts`, `toolbar.test.ts`, l'import de `stageTags` dans
`apps/web/src/app/board-session.ts` (une ligne), `apps/web/src/ui/PagesBar.tsx` (table d'état), `apps/web/src/ui/rb.css`
(règles de la scène et de la grille, ajoutées à celles de T94).

**Interfaces.**
- Consomme : tout ce que produisent T89-T94 (`createActiveProfile`, `createProfileStore`, `browserKeyValue`,
  `runtimeCapabilities`, `detectPlatform`, `PagesBar`, `TabsBar`, `SettingsPanel`, `ProfileMenu`, `Toolbar`,
  `layoutFor`, `createLocalToolbarHost`) ; T93 `createBoardSession`, `BoardSession.bench()` ; T98 `createWorkspace`,
  `prepareHost` (`PreparedHost.dropReady`), `startDocument`.
- Réutilise : `apps/web/src/app/barre.ts:180-196` — `stageTags` déplacé tel quel dans `stage-tags.ts` avec ses tests ;
  `pagesLabel` est celui de `ui/PagesBar.tsx` (T91), ses anciens tests vont dans `stage-tags.test.ts` en l'important de
  là ; les tests de `barModel`, `editionModel`, `settingsModel`, `mountBar`,
  `mountEdition`, `mountSettings` sont remplacés par ceux de T91, T92, T94 et par le test d'inventaire ci-dessous.
- Produit :
```tsx
export interface AppProps {
  readonly workspace: Workspace;
  readonly active: ActiveProfile;
  readonly store: ProfileStore;
  readonly settings: SettingsStore;
  readonly notes: readonly string[];
  readonly shell: ShellPort;
  navigate(search: string): void;
}
export function App(props: AppProps): JSX.Element;
```
- `index.html` : `<body><div id="app"></div><script type="module" src="/src/main.ts"></script></body>`, styles réduits
  à `html, body { margin: 0; height: 100%; overflow: hidden; font: 15px system-ui, sans-serif }` ; le reste dans
  `ui/rb.css`. `#app` est une grille (`display: grid; height: 100vh`) dont `grid-template-*` viennent de `layoutFor`.
  Scène : `<main class="rb-stages">` = `container` des sessions. Les règles de la scène d'`index.html:9-10` ne se
  perdent pas (sans elles, le navigateur fait défiler ou sélectionne au lieu de tracer au doigt et au stylet) ; ajoutées
  à `ui/rb.css` :
```css
.rb-stages { grid-area: stage; position: relative; overflow: hidden; }
.rb-stage { position: absolute; inset: 0; touch-action: none; user-select: none; -webkit-user-select: none; }
.rb-stage canvas { position: absolute; inset: 0; width: 100%; height: 100%; touch-action: none; pointer-events: none; }
.rb-stage[hidden] { display: none; }
```
- `main.ts` (amorce seule) : `init()` Wasm, `createWasmCore`, `parseSettings`, `createSettingsStore`, `prepareHost`,
  `startDocument`, `createProfileStore(browserKeyValue(window), BUILTIN_PROFILES)`, `runtimeCapabilities(wasm.capabilities(
  detectPlatform(...)), env)`, `createWorkspace`, écouteurs `keydown`/`keyup`/`blur` **une fois** vers
  `workspace.active().board.engine` puis `workspace.key`, Tauri : `createWorkspace({ …, dropReady: prepared.dropReady,
  launch: ipc ? () => launchFiles(ipc) : undefined })` (l'ordre écoute puis `launch_files` est tenu et testé par T98 ;
  ne pas appeler `launchFiles` ailleurs), `onQuitRequested(ipc, …)` → `workspace.quitRequested(() => quitApp(ipc))` ;
  `render(() => <App …/>, document.getElementById("app"))` (fichier renommé `main.tsx` si le JSX y est nécessaire :
  alors `index.html` pointe `main.tsx`) ; `?banc` : `mountBenchPanel(createAppBench(workspace.active().board.bench()))`
  (dépendances exposées par T93, `banc.ts:16-26`) ; `#stage[data-ready="1"]` posé à la fin. Échec du démarrage
  (`main.ts:251-256`) : `App` n'est peut-être pas montée, donc `#etat` peut manquer ; le `catch` garde
  `document.body.dataset["erreur"]` et écrit « RoomBoard n'a pas pu démarrer : … » dans `#etat`, qu'il crée
  (`<p id="etat" role="status">` ajouté à `body`) s'il est absent.

**Patron à ne pas reprendre.** Garder la position absolue des barres (`index.html:12-21`, `top: 8px/60px/104px`) : elle
recouvrait le haut de la scène (constat de la coque au lot 4, « la 3e ligne de barre recouvre le haut du canvas »). Ici
la grille réserve la place de chaque barre ; la scène est mesurée dans sa case (`ResizeObserver` des sessions).

**Test et commande bornée.**
`cd <worktree> && pnpm --filter @roomboard/web exec vitest run src/ui/App.test.tsx src/app/stage-tags.test.ts 2>&1 | tail -15`
→ ≥ 8 tests, aucun `FAIL `, nom « inventaire : chaque bouton de l'ancienne barre a son élément » présent. Puis la suite
complète, au premier plan, `timeout: 600000` : `cd <worktree> && PATH=$HOME/.cargo/bin:$PATH scripts/verifier.sh 2>&1 | tail -30`
→ `verifier.sh : OK` (fmt, clippy, cargo test dont `roomboard-shell`, contrat Wasm, `pnpm -r test`, build web,
hors ligne, prototype). Puis `grep -rn "app/barre" apps/web/src` → rien.

**Contraintes.**
- Toutes les commandes visent le worktree donné par l'orchestrateur : `cd <worktree> && …` ; avant toute commande
  cargo ou wasm : `export PATH=$HOME/.cargo/bin:$PATH`.
- Worktree neuf : `pnpm install --frozen-lockfile` à la racine ; si `apps/web/src/wasm/` manque (contrat, build web,
  essais), lancer une fois `PATH=$HOME/.cargo/bin:$PATH scripts/verifier.sh 2>&1 | tail -30` au premier plan.
- TDD : le test d'abord, montré rouge (sortie copiée dans le rapport), puis le code, puis vert.
- Aucun test désactivé (`.skip`, `.only`, `#[ignore]` neuf), aucun seuil baissé. Un test qui dépend d'un délai et
  échoue est rejoué une fois ; s'il échoue encore, c'est un échec.
- Commandes longues (verifier.sh, build, essais Playwright) au premier plan avec `timeout: 600000`, jamais en
  `run_in_background`. Sous-agents et relecteurs lancés au premier plan, `run_in_background: false` écrit explicitement.
- Builds Tauri : au plus 2 pour tout le lot sur la VM (le `cargo check` de T87 et le build release de T97), un seul à
  la fois, `CARGO_BUILD_JOBS=2`. Aucune autre tâche ne compile `apps/desktop/src-tauri`. Aucun build Android.
- `git add` fichier par fichier ; jamais `git add -A`, `git add .`, `git commit -a` ; jamais `--force` ; aucun tag,
  aucune release ; `.github/workflows/` non touché.
- Commit : auteur `jejeasterix <jejeasterix@users.noreply.github.com>` (déjà réglé), message en anglais, dernière ligne
  exactement `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (jamais « Sonnet »).
- SolidJS seulement dans `apps/web/src/ui/` (D21) ; `src/engine/` n'importe aucun framework ni `src/ui/`.
- Aucune ressource réseau à l'exécution (D27) : polices et icônes embarquées ; `scripts/controle-hors-ligne.mjs` reste
  vert. Ne jamais retirer `"plugins": { "fs": { "scopeDroppedPaths": false } }` de `tauri.conf.json`.
- Composants de barre : aucun appel à `localStorage` (passer par `ProfileStore`), aucun `switch` ni chaîne de `if` sur
  un identifiant d'outil ou d'action (tables), aucune dimension en pixels (jetons CSS `--rb-btn-s|m|l`), aucun état
  propre au document (tout vient du profil, des capacités et de l'état publié par le moteur), aucun glisser HTML5
  (`draggable`, `dragstart`) dans l'interface.
- Choix du lot 4 gardés (CL4-1 à CL4-15) : aperçus d'édition sur la scène Canvas 2D, `<textarea>` visible, validation
  différée pendant l'IME, retirer la page montrée montre la précédente.
- Réglages `engine/settings.ts` (É2 `prediction`, É3 `inkTrail`, É4 `webgl`, `palm`, `finger`) : défauts et
  adresse `?echelons=`, `?paume=`, `?doigt=` inchangés ; aucun ne se perd dans l'interface neuve.
- Le rapport de la tâche porte, pour chaque ligne `Réutilise :` de sa section, `Réutilisation : appelé <module>` ou
  `Réutilisation : écart — <pourquoi>`.
- Tests DOM et composants : première ligne `// @vitest-environment happy-dom` ; `apps/web/vite.config.ts` garde
  `test: { environment: "node" }` (écart T82 : vite-plugin-solid imposait jsdom), ne pas le changer.

**Interdits.** Aucune barre en `position: absolute` par-dessus la scène (sauf `dock: "floating"`). Ne pas changer les
scripts d'essai (T96). Ne pas retirer de réglage ni de bouton de l'inventaire.

**Terminé quand** `verifier.sh` est vert, l'application démarre (essai rapide : `pnpm --filter @roomboard/web build`
puis `node scripts/essais/s2-navigateur.mjs` peut échouer sur ses sélecteurs — T96 — mais la page doit poser
`#stage[data-ready="1"]` : le vérifier par `node -e` Playwright ou par T96), et l'inventaire est complet.

**Étapes.**
1. Tests rouges, `App.test.tsx` (`happy-dom`, workspace et moteur factices exposant `state()`/`onState`) :
```tsx
it("inventaire : chaque bouton de l'ancienne barre a son élément", () => {
  const { container } = renderApp();                  // profil defaut
  for (const id of ["pen", "eraser", "hand", "eraser-mode", "undo", "redo", "select", "rect", "ellipse", "line", "arrow", "text",
    "page-prev", "page-next", "page-add", "page-remove", "file-new", "file-open", "file-save", "file-save-as", "fit-page", "settings", "profiles"]) {
    expect(container.querySelector(`button[data-item="${id}"]`), id).not.toBeNull();
  }
  expect(container.querySelector("#pages")?.textContent).toBe("1 / 1");
  expect(container.querySelector("#etat")?.getAttribute("role")).toBe("status");
  fireEvent.click(container.querySelector('button[data-item="settings"]')!);
  for (const k of ["finger", "palm", "prediction", "inkTrail", "webgl"]) {
    expect(container.querySelector(`button[data-reglage="${k}"]`), k).not.toBeNull();
  }
});
it("changer de profil : barre à gauche, grands boutons, sans formes", () => { /* menu profils → simple : data-dock=left, data-size=l, pas de rect, grille columns "auto minmax(0, 1fr)" */ });
it("la scène est dans sa case : aucune barre en position absolue", () => { /* getComputedStyle des .rb-bar ≠ absolute ; grid-area stage */ });
it("styles de la scène repris d'index.html (touch-action, user-select, canvas inertes)", () => {
  const css = readFileSync(join(__dirname, "rb.css"), "utf8").replace(/\s+/g, " ");
  expect(css).toMatch(/\.rb-stage \{[^}]*touch-action: none;[^}]*user-select: none;/);
  expect(css).toMatch(/\.rb-stage canvas \{[^}]*position: absolute;[^}]*inset: 0;[^}]*pointer-events: none;/);
});
it("onglets : la barre des onglets suit le workspace (ajout, actif, modifié)", () => { /* … */ });
it("l'erreur du moteur s'affiche dans #etat", () => { /* state.error */ });
it("Ouvrir dans la barre → contrôleur de l'onglet actif", () => { /* clic file-open → files.run("open") */ });
```
   `stage-tags.test.ts` : tests de `stageTags` et `pagesLabel` repris de `barre.test.ts`.
2. `stage-tags.ts` (déplacement), import changé dans `board-session.ts` ; `PagesBar.tsx` : `PAGE_STATE` remplacé par
   `itemState` (T94), ses tests inchangés ; puis retirer `app/barre.ts` et
   `app/barre.test.ts` (`git rm` fichier par fichier) ; retirer `ToolDef`, `toolbar` et `validateToolbar` de
   `toolbar.ts` et leurs tests (`parseProfile` porte les deux contrôles, testés par T83).
3. `App.tsx`, `index.html`, `main.ts` (ci-dessus).
4. Vert, puis `verifier.sh`. Commit : `feat(web): SolidJS app shell replaces the DOM toolbar`.

<a id="tache-t96"></a>
### Tâche T96 — Playwright `--e2e` : S2-S4 et lot 5b par l'interface SolidJS, captures, `verifier.sh --e2e`

**Objectif.** Plan maître, ligne lot 5 : `verifier.sh --e2e` joue Playwright Chromium (VM, headless) : S2 (tracer,
gommer, annuler), S3/S4 (sélection, formes, texte, pages, zoom), fichiers (lot 5a, Ouvrir = nouvel onglet), et un
scénario neuf du lot 5b : changer de profil de barre, onglets, page infinie, dépôt `.roomboard` → nouvel onglet, dépôt
d'un autre fichier → message, **la barre ne recouvre pas la scène** (rectangles comparés). Captures dans `docs/essais/`.
`verifier.sh` sans `--e2e` ne lance aucun navigateur.

**Fichiers.** `scripts/verifier.sh`, `scripts/essais/commun.mjs`, `scripts/essais/s2-navigateur.mjs`,
`scripts/essais/s34-navigateur.mjs`, `scripts/essais/fichiers-navigateur.mjs`, `scripts/essais/s5b-navigateur.mjs` (neuf),
`scripts/tests/verifier-e2e.test.sh` (neuf), captures `docs/essais/s2-lot5b.png`, `docs/essais/s34-lot5b-{selection,forme-texte,pages}.png`,
`docs/essais/s5b-{defaut,simple,onglets,page-infinie}.png` (neufs).

**Interfaces.**
- Réutilise : `scripts/essais/commun.mjs` (T85) — `loadPlaywright`, `serve`, `inkIn`, `frames`, `Echec`.
- Produit (dans `commun.mjs`) :
```js
/** Fenêtre de tous les essais du lot 5b : la scène doit garder au moins 640 px de haut sous les barres. */
export const VIEWPORT = { width: 1280, height: 900 };
/** Bouton d'un élément de barre (CL5b-11). */
export const item = (id) => `button[data-item="${id}"]`;
/** Rectangle de #stage (px de page) ; Echec si absent ou plus bas que `minHeight`. */
export async function stageBox(page, minHeight = 640) {
  const b = await page.locator("#stage").boundingBox();
  if (!b) throw new Echec("#stage absent");
  if (b.height < minHeight) throw new Echec(`scène trop basse : ${b.height} px < ${minHeight} (barres sur plusieurs lignes ?)`);
  return b;
}
/** Point de page d'un point de scène : les gestes des scénarios sont écrits en px de la scène (origine = coin de #stage). */
export const onStage = (box, x, y) => [box.x + x, box.y + y];
/** Chaque élément `selector` (ex. `button[data-item]`) hors du rectangle de #stage ; rend la liste des fautifs. */
export async function overlapping(page, selector, stageSelector = "#stage") {
  const stage = await page.locator(stageSelector).boundingBox();
  if (!stage) throw new Echec(`rectangle absent : ${stageSelector}`);
  const bad = [];
  for (const el of await page.locator(selector).all()) {
    const a = await el.boundingBox();
    if (!a) continue;                                     // élément caché : ne recouvre rien
    const apart = a.x + a.width <= stage.x + 0.5 || stage.x + stage.width <= a.x + 0.5 || a.y + a.height <= stage.y + 0.5 || stage.y + stage.height <= a.y + 0.5;
    if (!apart) bad.push((await el.getAttribute("data-item")) ?? selector);
  }
  return bad;
}
/** Rectangles de la barre et de la scène ; vrai s'ils ne se chevauchent pas. */
export async function noOverlap(page, barSelector, stageSelector = "#stage") {
  const [a, b] = await Promise.all([page.locator(barSelector).boundingBox(), page.locator(stageSelector).boundingBox()]);
  if (!a || !b) throw new Echec(`rectangle absent : ${!a ? barSelector : stageSelector}`);
  const apart = a.x + a.width <= b.x + 0.5 || b.x + b.width <= a.x + 0.5 || a.y + a.height <= b.y + 0.5 || b.y + b.height <= a.y + 0.5;
  return { apart, bar: a, stage: b };
}
/** Dépôt simulé (DataTransfer construit dans la page) sur un sélecteur. */
export async function dropFile(page, selector, name, bytes, type = "") {
  await page.evaluate(({ selector, name, bytes, type }) => {
    const dt = new DataTransfer();
    dt.items.add(new File([new Uint8Array(bytes)], name, { type }));
    const target = document.querySelector(selector);
    const r = target.getBoundingClientRect();
    for (const t of ["dragover", "drop"]) {
      target.dispatchEvent(new DragEvent(t, { bubbles: true, cancelable: true, dataTransfer: dt, clientX: r.x + 50, clientY: r.y + 50 }));
    }
  }, { selector, name, bytes: Array.from(bytes), type });
}
```
- `verifier.sh` : `E2E=0 ; for a in "$@"; do case "$a" in --e2e) E2E=1 ;; *) echo "verifier.sh : option inconnue $a" >&2; exit 2 ;; esac; done`
  en tête ; avant `echo "verifier.sh : OK"` :
```bash
if [ "$E2E" = 1 ]; then
  node scripts/essais/s2-navigateur.mjs
  node scripts/essais/s2-navigateur.mjs --lot3b
  node scripts/essais/s34-navigateur.mjs
  node scripts/essais/fichiers-navigateur.mjs
  node scripts/essais/s5b-navigateur.mjs
  echo "verifier.sh : e2e OK"
fi
```
  (code de sortie 2 « outil absent » d'un script = échec de `--e2e` : `set -e` le propage.) `--e2e` ne passe **aucune**
  option de capture : un `verifier.sh --e2e` ne réécrit jamais une capture commitée. Les captures du lot se font à
  l'étape 4, par des appels explicites.

**Scénario `s5b-navigateur.mjs`** (chaque ligne = un `check(cond, "ok — …")`, motif `S5b : OK` à la fin, sortie 1
au premier échec, `--captures` pour les PNG) :
1. Page prête (`#stage[data-ready="1"]`), fenêtre `VIEWPORT`, profil `defaut` : `[data-toolbar="outils"][data-dock="top"]`,
   `[data-toolbar="pages"][data-dock="bottom"]` ; `noOverlap` barre `outils` / `#stage` et barre `pages` / `#stage`
   → `apart` ; `overlapping(page, "button[data-item]")` → `[]` (chaque bouton, la barre de 19 boutons passant sur
   deux lignes) ; `#stage` commence sous la barre (`stage.y >= bar.y + bar.height - 0.5`) ; `stageBox(page)` ≥ 640 px ;
   styles de la scène (`index.html:9-10`, repris par T95) : `getComputedStyle(#stage).touchAction === "none"`,
   `userSelect === "none"`, et pour `#scene` et `#interaction` `position === "absolute"`, `pointerEvents === "none"`.
   Capture `s5b-defaut.png`.
2. Profil : clic `item("profiles")` puis `[data-profile="simple"]` → `[data-toolbar="outils"][data-dock="left"]`,
   `data-size="l"`, `item("rect")` absent, `noOverlap` → `apart`, `stage.x >= bar.x + bar.width - 0.5` ; recharger la
   page : `simple` toujours actif (`ProfileStore`). Capture `s5b-simple.png`. Revenir à `defaut`.
3. Tracer un trait (`#stage[data-elements="1"]`), Ctrl+N → 2 `[data-tab]`, le nouvel onglet actif,
   `#stage[data-elements="0"]` ; Ctrl+Z dans l'onglet 2 : rien ; activer l'onglet 1 : `data-elements="1"`, Ctrl+Z →
   `0` (historiques séparés). Capture `s5b-onglets.png`.
4. Page infinie : `item("fit-page")`, molette vers le bas de 3 000 px (`page.mouse.wheel(0, 3000)`), tracer au milieu de
   la scène → `data-elements` + 1, et l'empreinte des pixels du fond sous le trait est blanche (`#ffffff`, lue par
   `page.evaluate` sur `#scene`), pas le gris du pourtour. Capture `s5b-page-infinie.png`.
5. Dépôt : enregistrer d'abord un document (repli forcé `?fichiers=repli`, téléchargement intercepté comme dans
   `fichiers-navigateur.mjs`), puis `dropFile(page, "#stage", "Cours.roomboard", octets)` → 1 onglet de plus, titre
   « Cours.roomboard », l'onglet d'origine garde ses éléments ; `dropFile(…, "photo.png", [137, 80, 78, 71])` → nombre
   d'onglets inchangé, `#stage[data-version]` inchangé, message « format pris en charge dans une prochaine version »
   (boîte `alert` du repli interceptée par `page.on("dialog")`).
6. Fermer l'onglet modifié : question (`dialog` « modifications non enregistrées ») → `dismiss` : gardé ; `accept` :
   retiré, l'onglet précédent montré.
7. S3, enregistrer puis rouvrir trois pages (renvoyé au lot 5 par `s34-navigateur.mjs`, `NON_COUVERT[0]`) : onglet
   vierge (Ctrl+N), un trait sur la page 1, `item("page-add")` puis un rectangle (`item("rect")`) sur la page 2,
   `item("page-add")` puis un texte « trois » (`item("text")`, saisie, clic ailleurs) sur la page 3 ; Ctrl+S (repli,
   téléchargement intercepté) ; Ctrl+O avec ce fichier → un onglet de plus, `#pages` = « 1 / 3 »,
   `#stage[data-elements="1"]` sur chaque page parcourue par `item("page-next")` (`data-page` « 1/3 », « 2/3 », « 3/3 »),
   et l'encre de chaque élément à ses coordonnées (`inkIn` sur la boîte du geste).
8. S4, zoom 200 % par Ctrl+molette puis trait aux coordonnées monde (`NON_COUVERT[1]`) : `item("fit-page")`, lire
   `#stage[data-camera]` (T93) ; Ctrl tenu, `page.mouse.wheel(0, -100)` au centre de la scène jusqu'à zoom ≥ 2 (40
   crans au plus, sinon Echec « zoom 200 % jamais atteint ») ; check `zoom >= 2` ; tracer un trait horizontal de
   (sx0, sy) à (sx1, sy) en px de scène ; outil Sélection, clic sur le trait → `#stage[data-bounds]` ; check que
   `x0 ≈ (sx0 - tx) / zoom`, `x1 ≈ (sx1 - tx) / zoom`, `(y0 + y1) / 2 ≈ (sy - ty) / zoom` à 6 unités monde près (demi
   épaisseur comprise).
9. S4, profil à trois outils (`NON_COUVERT[2]`) : profil `simple` → parmi `pen, eraser, hand, select, rect, ellipse,
   line, arrow, text`, exactement trois `[data-toolbar="outils"] button[data-item]` présents (`pen`, `eraser`, `hand`) ;
   revenir à `defaut` : les neuf présents. `s34-navigateur.mjs` retire ces trois lignes de `NON_COUVERT` et y écrit
   « joué par s5b-navigateur.mjs (lot 5b) » à la place (la liste garde les autres).

**Mises à jour des scripts existants** (CL5b-11 ; aucun `check` retiré ni affaibli) :
- **Les trois scripts** : fenêtre `VIEWPORT` (1280 × 900 au lieu de 1280 × 720 : `s2-navigateur.mjs` `newPage`,
  `s34-navigateur.mjs:362`, `fichiers-navigateur.mjs:87`) ; **chaque geste** (`page.mouse.move/down/click`, `drag`) passe
  par `onStage(await stageBox(page), x, y)` : les coordonnées écrites dans les scénarios restent celles d'aujourd'hui,
  en px de la scène (elle commençait en (0, 0)), et `inkIn` reste en coordonnées du canvas, sans décalage. Sans cela,
  la gomme de S2 (`s2-navigateur.mjs:96-111`, `MID`/`REST`) et les boîtes `FIRST_BOX`/`SECOND_BOX` de
  `fichiers-navigateur.mjs:182-197` tombent à côté du trait, et les clics « ailleurs » à y = 600 de `s34-navigateur.mjs`
  (l. 158, 239) tombent hors de la scène.
- `s2-navigateur.mjs` l. 94-95, 141 : `#barre button[data-action="X"]` → `item("X")` ; S2 lot 3b : boutons
  `[data-reglage]` après clic `item("settings")`.
- `s34-navigateur.mjs` l. 41-43, 208, 327 : `#edition button[data-action]` et `#barre button[data-action]` →
  `item(...)` ; captures renommées `s34-lot5b-${name}.png` (l. 78 ; en-tête l. 8 mis à jour) : celles du lot 4 ne sont
  pas écrasées.
- `fichiers-navigateur.mjs` : Ouvrir ne recharge plus. Chaque `page.waitForEvent("load")` qui suit un Ctrl+O
  (l. 177-178, 201-202, 231-232) disparaît ; à la place, attendre un `[data-tab]` de plus et l'onglet ouvert actif, puis
  les mêmes contrôles (éléments, encre, empreinte, nom, non modifié). Le bloc « Ctrl+O sur un document modifié »
  (l. 227-238, motif `DISCARD`) est **réécrit nommément** selon Q1, sans retrait de contrôle :
  | contrôle actuel | devient |
  |---|---|
  | `Ctrl+O sur un document modifié : sélecteur ouvert, puis « <DISCARD> »` | `Ctrl+O sur un document modifié : sélecteur ouvert, aucune question` (aucun `dialog` `confirm` dans les 2 s) |
  | `réponse Oui : le fichier remplace le document modifié` | `le fichier s'ouvre dans un 2e onglet : 1 élément, non modifié` (`[data-tab]` × 2, `#stage[data-elements="1"][data-modifie="0"]`) |
  | (neuf, même bloc) | `l'onglet d'origine garde ses 2 éléments et data-modifie="1"` (clic sur le premier `[data-tab]`) |
  Le contrôle `fermeture d'un document modifié : le navigateur demande` (`beforeunload`) est gardé tel quel (la garde
  unique de T98 le tient).

**Test et commande bornée.** Rouge d'abord : `bash scripts/tests/verifier-e2e.test.sh` (neuf : `verifier.sh --inconnu`
→ code 2 ; `grep -q -- '--e2e' scripts/verifier.sh`) rouge ; puis, au premier plan, `timeout: 600000` :
`cd <worktree> && PATH=$HOME/.cargo/bin:$PATH scripts/verifier.sh --e2e > /tmp/e2e-5b.log 2>&1; echo "code $?"; grep -E "^(S2|S3/S4|Fichiers|S5b).*: OK|verifier.sh :|Echec" /tmp/e2e-5b.log; grep -c "ok —" /tmp/e2e-5b.log`
→ `code 0` ; lignes `S2 lot 3 : OK`, `S2 lot 3b : OK (4 passages)`, `S3/S4 lot 4 : OK`, `Fichiers lot 5a : OK (3
modes)`, `S5b : OK`, `verifier.sh : e2e OK`, `verifier.sh : OK` ; aucune ligne `Echec` ; le compte `ok —` ≥ 25 pour S5b
seul (le relever aussi par `node scripts/essais/s5b-navigateur.mjs 2>&1 | grep -c "ok —"` → ≥ 25). Puis
`cd <worktree> && PATH=$HOME/.cargo/bin:$PATH scripts/verifier.sh > /tmp/v-5b.log 2>&1; echo "code $?"; tail -1 /tmp/v-5b.log; grep -c "ok —" /tmp/v-5b.log`
→ `code 0`, `verifier.sh : OK`, compte = 0 (aucun navigateur lancé). Captures listées par
`ls -la docs/essais/s5b-*.png docs/essais/s2-lot5b.png docs/essais/s34-lot5b-*.png` ; `git status --short docs/essais/`
ne montre aucune capture d'un lot précédent modifiée.

**Preuve visuelle.** Lectures d'abord (une valeur lue prouve plus qu'une image) : `#stage[data-tool="pen"]`,
`#stage[data-page="1/1"]`, `[data-toolbar="outils"][data-dock="top"]`, `noOverlap(...).apart === true`,
`overlapping(...)` vide, `touchAction` = `none`, `#stage[data-camera]` après le zoom imprimés par le script ; puis décrire chaque capture dans le rapport (barre en haut, scène dessous, pages en bas ; profil simple à
gauche ; deux onglets ; trait loin sous 1080 sur fond blanc).

**Contraintes.**
- Toutes les commandes visent le worktree donné par l'orchestrateur : `cd <worktree> && …` ; avant toute commande
  cargo ou wasm : `export PATH=$HOME/.cargo/bin:$PATH`.
- Worktree neuf : `pnpm install --frozen-lockfile` à la racine ; si `apps/web/src/wasm/` manque (contrat, build web,
  essais), lancer une fois `PATH=$HOME/.cargo/bin:$PATH scripts/verifier.sh 2>&1 | tail -30` au premier plan.
- TDD : le test d'abord, montré rouge (sortie copiée dans le rapport), puis le code, puis vert.
- Aucun test désactivé (`.skip`, `.only`, `#[ignore]` neuf), aucun seuil baissé. Un test qui dépend d'un délai et
  échoue est rejoué une fois ; s'il échoue encore, c'est un échec.
- Commandes longues (verifier.sh, build, essais Playwright) au premier plan avec `timeout: 600000`, jamais en
  `run_in_background`. Sous-agents et relecteurs lancés au premier plan, `run_in_background: false` écrit explicitement.
- Builds Tauri : au plus 2 pour tout le lot sur la VM (le `cargo check` de T87 et le build release de T97), un seul à
  la fois, `CARGO_BUILD_JOBS=2`. Aucune autre tâche ne compile `apps/desktop/src-tauri`. Aucun build Android.
- `git add` fichier par fichier ; jamais `git add -A`, `git add .`, `git commit -a` ; jamais `--force` ; aucun tag,
  aucune release ; `.github/workflows/` non touché.
- Commit : auteur `jejeasterix <jejeasterix@users.noreply.github.com>` (déjà réglé), message en anglais, dernière ligne
  exactement `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (jamais « Sonnet »).
- SolidJS seulement dans `apps/web/src/ui/` (D21) ; `src/engine/` n'importe aucun framework ni `src/ui/`.
- Aucune ressource réseau à l'exécution (D27) : polices et icônes embarquées ; `scripts/controle-hors-ligne.mjs` reste
  vert. Ne jamais retirer `"plugins": { "fs": { "scopeDroppedPaths": false } }` de `tauri.conf.json`.
- Composants de barre : aucun appel à `localStorage` (passer par `ProfileStore`), aucun `switch` ni chaîne de `if` sur
  un identifiant d'outil ou d'action (tables), aucune dimension en pixels (jetons CSS `--rb-btn-s|m|l`), aucun état
  propre au document (tout vient du profil, des capacités et de l'état publié par le moteur), aucun glisser HTML5
  (`draggable`, `dragstart`) dans l'interface.
- Choix du lot 4 gardés (CL4-1 à CL4-15) : aperçus d'édition sur la scène Canvas 2D, `<textarea>` visible, validation
  différée pendant l'IME, retirer la page montrée montre la précédente.
- Réglages `engine/settings.ts` (É2 `prediction`, É3 `inkTrail`, É4 `webgl`, `palm`, `finger`) : défauts et
  adresse `?echelons=`, `?paume=`, `?doigt=` inchangés ; aucun ne se perd dans l'interface neuve.
- Le rapport de la tâche porte, pour chaque ligne `Réutilise :` de sa section, `Réutilisation : appelé <module>` ou
  `Réutilisation : écart — <pourquoi>`.
- Tests DOM et composants : première ligne `// @vitest-environment happy-dom` ; `apps/web/vite.config.ts` garde
  `test: { environment: "node" }` (écart T82 : vite-plugin-solid imposait jsdom), ne pas le changer.

**Interdits.** Aucun `check` retiré ou rendu plus lâche ; aucun délai augmenté sans le dire. Pas de WebKit (H2-10, hors
chaîne). Les captures du lot 4 et 5a ne sont pas écrasées (noms neufs).

**Terminé quand** `verifier.sh --e2e` est vert avec les cinq motifs, `verifier.sh` seul ne lance pas de navigateur, et
les captures sont commitées.

**Étapes.**
1. `verifier-e2e.test.sh` rouge ; analyse des arguments dans `verifier.sh` ; vert.
2. `commun.mjs` : `item`, `noOverlap`, `dropFile`.
3. `s5b-navigateur.mjs` (structure de `s34-navigateur.mjs` : `main`, `scenario`, `check`), puis les trois scripts
   existants ; les jouer un par un (`node scripts/essais/<script> 2>&1 | tail -5`).
4. `verifier.sh --e2e` complet (commande de preuve). Puis les captures, par appels explicites :
   `node scripts/essais/s2-navigateur.mjs --capture docs/essais/s2-lot5b.png`,
   `node scripts/essais/s34-navigateur.mjs --captures`, `node scripts/essais/s5b-navigateur.mjs --captures`.
   Commit (captures ajoutées une par une) : `test(e2e): Playwright trials through the SolidJS interface, verifier --e2e`.

<a id="tache-t97"></a>
### Tâche T97 — Orchestrateur : build Tauri Linux, essai de la coque sous Broadway, capture

**Objectif.** S5, partie Linux : la coque du lot 5b se construit et montre l'interface SolidJS ; trace, onglet, barre qui
ne recouvre pas la scène. Tâche de l'orchestrateur (pas de sous-agent), comme T41, T59, T78.

**Fichiers.** `docs/essais/coque-linux-lot5b.png` (neuf) ; `docs/sessions/socle-etat.md` (orchestrateur seul).

**Interfaces.** Consomme le build web de T95-T96 et la coque de T87 ; rien de produit en code.

**Test et commande bornée.** Second et dernier build Tauri du lot, au premier plan, `timeout: 600000` (relancer en
`run_in_background` avec surveillance si plus de 10 min, comme au lot 3b) :
`cd <worktree> && PATH=$HOME/.cargo/bin:$PATH scripts/verifier.sh 2>&1 | tail -3 && CARGO_BUILD_JOBS=2 /usr/bin/time -v pnpm --filter @roomboard/desktop tauri build 2>&1 | grep -E "Finished|\.deb|Maximum resident|error" | tail -6`
→ `Finished`, chemin du `.deb`, pic de mémoire. Essai sous Broadway (shim DPI 96 hors dépôt, procédure du lot 4) :
(a) la barre SolidJS en haut, la scène dessous, pages en bas ; (b) tracer : trait visible ; (c) Ctrl+N : second onglet ;
(d) fermer par ✕ avec un onglet modifié : la question ; (e) profil « Simple » : barre à gauche. Capture
`docs/essais/coque-linux-lot5b.png` décrite dans l'état. Non jouable sous Broadway, renvoyé aux fiches : dépôt réel
depuis un gestionnaire de fichiers (HU2-13), association `.roomboard`, Cmd+Q (macOS).

**Contraintes.**
- Toutes les commandes visent le worktree donné par l'orchestrateur : `cd <worktree> && …` ; avant toute commande
  cargo ou wasm : `export PATH=$HOME/.cargo/bin:$PATH`.
- Worktree neuf : `pnpm install --frozen-lockfile` à la racine ; si `apps/web/src/wasm/` manque (contrat, build web,
  essais), lancer une fois `PATH=$HOME/.cargo/bin:$PATH scripts/verifier.sh 2>&1 | tail -30` au premier plan.
- TDD : le test d'abord, montré rouge (sortie copiée dans le rapport), puis le code, puis vert.
- Aucun test désactivé (`.skip`, `.only`, `#[ignore]` neuf), aucun seuil baissé. Un test qui dépend d'un délai et
  échoue est rejoué une fois ; s'il échoue encore, c'est un échec.
- Commandes longues (verifier.sh, build, essais Playwright) au premier plan avec `timeout: 600000`, jamais en
  `run_in_background`. Sous-agents et relecteurs lancés au premier plan, `run_in_background: false` écrit explicitement.
- Builds Tauri : au plus 2 pour tout le lot sur la VM (le `cargo check` de T87 et le build release de T97), un seul à
  la fois, `CARGO_BUILD_JOBS=2`. Aucune autre tâche ne compile `apps/desktop/src-tauri`. Aucun build Android.
- `git add` fichier par fichier ; jamais `git add -A`, `git add .`, `git commit -a` ; jamais `--force` ; aucun tag,
  aucune release ; `.github/workflows/` non touché.
- Commit : auteur `jejeasterix <jejeasterix@users.noreply.github.com>` (déjà réglé), message en anglais, dernière ligne
  exactement `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (jamais « Sonnet »).
- SolidJS seulement dans `apps/web/src/ui/` (D21) ; `src/engine/` n'importe aucun framework ni `src/ui/`.
- Aucune ressource réseau à l'exécution (D27) : polices et icônes embarquées ; `scripts/controle-hors-ligne.mjs` reste
  vert. Ne jamais retirer `"plugins": { "fs": { "scopeDroppedPaths": false } }` de `tauri.conf.json`.
- Composants de barre : aucun appel à `localStorage` (passer par `ProfileStore`), aucun `switch` ni chaîne de `if` sur
  un identifiant d'outil ou d'action (tables), aucune dimension en pixels (jetons CSS `--rb-btn-s|m|l`), aucun état
  propre au document (tout vient du profil, des capacités et de l'état publié par le moteur), aucun glisser HTML5
  (`draggable`, `dragstart`) dans l'interface.
- Choix du lot 4 gardés (CL4-1 à CL4-15) : aperçus d'édition sur la scène Canvas 2D, `<textarea>` visible, validation
  différée pendant l'IME, retirer la page montrée montre la précédente.
- Réglages `engine/settings.ts` (É2 `prediction`, É3 `inkTrail`, É4 `webgl`, `palm`, `finger`) : défauts et
  adresse `?echelons=`, `?paume=`, `?doigt=` inchangés ; aucun ne se perd dans l'interface neuve.
- Le rapport de la tâche porte, pour chaque ligne `Réutilise :` de sa section, `Réutilisation : appelé <module>` ou
  `Réutilisation : écart — <pourquoi>`.
- Tests DOM et composants : première ligne `// @vitest-environment happy-dom` ; `apps/web/vite.config.ts` garde
  `test: { environment: "node" }` (écart T82 : vite-plugin-solid imposait jsdom), ne pas le changer.

**Interdits.** Un seul build Tauri à la fois ; pas de troisième build dans le lot (si le second échoue, consigner et
demander, ne pas relancer en boucle). Ne jamais tuer `broadwayd` : fermer la fenêtre par son ✕.

**Terminé quand** le `.deb` est produit, les gestes (a)-(e) sont faits, la capture est commitée et décrite.

**Étapes.**
1. `verifier.sh` vert sur la tête de la branche.
2. Build (commande ci-dessus), noter durée et pic.
3. Broadway, gestes (a)-(e), capture.
4. Commit de la capture : `docs(trials): Linux shell trial for lot 5b`.
