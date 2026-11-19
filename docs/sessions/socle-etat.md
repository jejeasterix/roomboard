# État — socle

Statut : en cours — lot 3b (OD4 : décision de Jérôme, 2026-11-19, « oui fait le avancé en autonomie même si je n'ai pas fais les tests » ; l'essai ENI du 2026-11-21 devient une vérification)
Gabarit : lots
Objectif : RoomBoard a un socle 0.1 (pages, tracé avec pression, gomme, sélection, formes, texte, annuler, zoom, format natif) bâti sur un cœur Rust/Wasm, une interface TypeScript et une coque Tauri 2.
Avancement : 3/6 lots clos — clos : 1, 2, 3 · en cours : 3b · à faire : 4, 5
Étage : 3 — depuis 2026-11-19 18:45
Lot : 3b « Fin du moteur » — plan à écrire — depuis 2026-11-19 18:45
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/socle   Branche : feat/socle-lot3b   Base : origin/main @ 37b5af3 (dépôt public jejeasterix/roomboard ; roomboard-prive hors chantier)
Branche principale locale au lancement : 37b5af3 (lot 3b)
Cadrage : docs/plans/socle-cadrage.md   Plan(s) : docs/plans/socle-PLAN.md (maître), docs/plans/socle-lot1-PLAN.md (lot 1), docs/plans/socle-lot2-PLAN.md (lot 2, T7-T16), docs/plans/socle-lot3-PLAN.md (lot 3, T17-T26, 4 vagues : T17+T18+T26 ; T19+T20+T23 ; T21+T22+T25 ; T24)

## Référence
Squelette T0 mergé (b3f7489) : `scripts/verifier.sh` rc=0 — Rust 6 tests (core 4, wasm 2), Vitest 2, build web OK, rejoué par l'orchestrateur.
Build Tauri .deb (T0) : 3 min 54, pic 1,35 Go.

Référence lot 3 (c2d7d0d, 22:00) : verifier.sh rc=0 en 1 min 15 — Rust 106+3+3+14 (1 ignoré), web 8 fichiers / 112 tests.

## Compteurs
contre-relecture cadrage 1/2 (second tour sauté : arrêt ferme 13:15) · relecture plan lot 1 : 1/3 faite (1 bloquant fiche ENI corrigé par l'orchestrateur ; essais Windows/macOS ajoutés à la fiche ; 2 mineurs de mesure → T6b)

## Cadrage
docs/plans/socle-cadrage.md — 39 décisions, 5 lots, scénarios S1 (ENI) à S5 (Tauri, plateformes), D37-D39 ajoutées après relecture.

## Tâches (lot 1)
| id | dépend | fichiers touchés | worktree | état | essais | dernier commit vert | preuve rejouée |
|----|--------|------------------|----------|------|--------|---------------------|----------------|
| T1 | — | engine/input/sampler(.test).ts | (mergé) | terminée | 1/3 | 2a60338 | vitest sampler 19/19 |
| T2 | — | engine/input/stats(.test).ts | (mergé) | terminée | 1/3 | 187a5cd | vitest stats 10/10 |
| T3 | — | proto/polyline, proto/frame-loop | (mergé) | terminée | 1/3 | 0eee224 | vitest proto 12/12 |
| T4 | — | scripts/controle-wasm-bindgen.sh, tests, verifier.sh | (mergé) | terminée | 1/3 | 5e2a965 | test shell 4 cas OK |
| T5 | — | docs/essais/eni-stylet.md | (mergé) | terminée | 1/3 | b8b9021 | grep 5 titres |
| T6 | T1-T4 | proto/recorder, proto/stylet.ts, proto-stylet.html, vite.proto.config.ts, package.json, verifier.sh | (mergé) | terminée | 1/3 | 3c0f1b0 | vitest recorder 9/9 ; dist-proto 1 fichier ; lot 1 verifier.sh OK (Rust 6, web 52) |
| T6b | T6 | sampler.ts (+test), proto/stylet.ts, recorder, frame-loop | (mergé) | terminée | 1/3 | 231f11e | vitest web 54/54 |
| T6c | T6b | stylet.ts, sampler.ts, stats.ts, recorder, frame-loop, fiche, docs/essais/proto-stylet.html | (mergé) | terminée | 1/3 | 75061e8 | vitest web 69/69 ; Playwright écart souris/encre ≤ 0,22 px |

## Tâches (lot 2)
T7 terminée (d1de245 ; deps_smoke 3/3, zip en wasm32 OK) · T8 terminée (74308f8 ; fake-core 9/9 ; écart : distToSegment dans la fausse gomme) · T9 terminée (81b84d8 ; core --lib 23/23, noms vus ; 3 mutations rouges) · T10 terminée (d491a22 ; ink:: 22/22, noms vus ; 2 tests ajoutés qui rougissent sous le patron interdit) · T11 terminée (b53b708 ; hit+erase 15/15, noms vus ; mutations raisonnées, non jouées) · T13 terminée (e638b95 ; format:: 16/16, mutation de date rouge ; contrôle de schéma inatteignable en v1, noté) · T12 terminée (20b94a8 ; commands+query 27 verts, 1 ignoré ; 3 tests ajoutés qui rougissent sous mutation) · cœur fusionné : 103 tests · T14 terminée (8665454 ; scenarios 3/3 ; mutation « page après History » rouge) · T15 terminée (98d4f06 ; roomboard-wasm 14/14 ; 4 tests ajoutés sous mutation ; .wasm servi ~1,30 Mo) · T16 terminée (cb6c266 ; contrat 17/17 sur le vrai .wasm, aucun sauté ; module Wasm 1 327 518 octets ; fake-core aligné sur les messages du cœur).
Preuve du lot 2 (orchestrateur, 12:05, feat/socle) : verifier.sh rc=0 — Rust 103+3+3+14 = 123 tests (1 ignoré : mesure), web 8 fichiers / 96 tests. Relecture du plan lot 2 : tour 1/3 faite, aucun bloquant. Reprises : preuves T9/T10/T12 rejouées par grep des noms `^test … ok$` (orchestrateur) ; T13 `save_is_deterministic` doit vérifier la date 1980-01-01 des entrées ; T14 mutation temporaire pour prouver le rouge ; D37 « dernière page » → `Err(LastPage)` levée côté JS (écart à déclarer, lot 3 l'attrape) ; T12 contours recalculés à chaque `hit_test_path` (à mesurer au lot 3) ; T15 télécharge serde-wasm-bindgen (réseau).

## Tâches (lot 3)
Décision de Jérôme, 2026-11-17, à « Veux-tu que la VM code le tracé (début du lot 3) avant jeudi, pour que les deux applis servent aussi à l'essai ? » : « Oui, avant jeudi ». Échelon 1 de DA9 ; barre minimale DOM dans main.ts (remplacée au lot 5).
Relecture du plan : 1/3, aucun bloquant ; 2 importants (coque Tauri non prouvée → essai fait par l'orchestrateur ; lot 3b sans ligne au plan maître → ajoutée) ; mineurs repris dans les prompts (T19 aperçu élargi, T24 `#etat` en dur) et T27 ajoutée (bouton du milieu).
T17 terminée (essai 2/3 ; cache des contours dans le cœur + préfiltre par boîte dans `ink/hit.rs` ; mesure release 1 000 traits touchés : 14,3 ms puis 10,1 ms, rejouée 22:58) · T18 terminée (camera 7, keys 9) · T26 terminée (banc 3) · T25 terminée (script S2, rouge attendu avant T24) · T19 terminée (canvas2d 11) · T20 terminée (router 14) · T23 terminée (engine 13, `Err(LastPage)` attrapé) · T21 terminée (pen 10) · T22 terminée (eraser 7) · T24 terminée (barre 3, S2 16 ok) · T27 terminée (souris : bouton gauche seul, sampler 26) · T28 terminée (correctifs de fin de lot : fiche ENI doigt avant stylet, `#etat` après les boutons, banc borné, cache retenu après annuler/rétablir, test du cache wasm renforcé) · T29 terminée (diagnostic coque : artefact Broadway, capture).
Preuve du lot 3 (orchestrateur, tête 28d8303 + capture) : verifier.sh rc=0 — Rust 117+3+3+14 (1 ignoré : mesure), web 194 tests ; S2 Chromium 16 `ok —`, `S2 lot 3 : OK`, code 0.
Fin de lot : double relecture (conformité ; qualité web ; qualité cœur) sans bloquant ; 1 majeur (fiche ENI) et mineurs corrigés par T28 ; duplication avec le prototype (`fmt`, export JSON, suivi du DPR) consignée, non nette.

## Scénarios et captures
S2 lot 3 (VM, 22:31, Chromium headless) — réussi : 3 traits souris, gomme en travers du 2e (4 traits), Ctrl+Z (3), Ctrl+Y (4), Ctrl+Maj+Z, boutons ; capture docs/essais/s2-lot3-vm.png (page blanche, 3 traits, le 2e coupé au milieu, barre avec Gomme pressée).
S5 partie Linux (VM, 22:42-22:55) — coque release construite (10 min 17, pic 1,29 Go RSS, .deb 3,2 Mo) ; sous Broadway la page sortait hors champ (`gdk_screen_get_resolution` = −1 → devicePixelRatio négatif, artefact du backend virtuel) ; avec un DPI de 96 forcé hors dépôt (shim LD_PRELOAD), la coque trace et Ctrl+Z annule ; capture docs/essais/coque-linux-lot3.png. Non essayé sur un vrai X11/Wayland. La coque embarque le `apps/web/dist` présent au build (pas de `beforeBuildCommand`) : construire le web d'abord.
S1 (VM, partie automatique) — réussi 11:20 : Chromium headless, trait souris, 42 points, retard p95 17,4 ms, 0 erreur · capture docs/essais/proto-stylet-essai-vm.png. Partie ENI : avec Jérôme cet après-midi (docs/essais/eni-stylet.md).

## Décisions prises en cours de chantier
- Licence : PolyForm Shield 1.0.0, pas GPLv3 (H0 close). Décision de Jérôme, 2026-11-16 : « Je décide donc de rester sur l'option 2. » Cadrage D40.

## Écarts acceptés
- T1 : quand le stylet se pose, tout geste `touch` actif est annulé (`cancelTouches`), lecture stricte de D18 ; le plan laissait tracer une paume posée avant le stylet.

## Hypothèses à revoir
Voir le cadrage § 4 (dont H1-9 : pas de CI tant qu'aucun runner n'est enregistré pour ce dépôt).
H2-13b Profil release `opt-level="s"` + `lto` exigé par le plan : grossit le .wasm de 22 808 octets (+1,7 %) ; à retirer ou essayer `"z"`.

## Portes
ouvertes : — · passées : —

## Reprise (prochaine tâche)
0. **Essai de jeudi 2026-11-19** : appli web (`apps/web/dist` servi en http ; le Wasm ne se charge pas en `file://`) et coque Tauri ; fiche docs/essais/eni-stylet.md, section du 19 (le doigt trace tant qu'aucun stylet n'a touché l'écran ; recharger avant l'étape doigt). Selon le verdict : échelons 2 à 4 de DA9 au lot 3b.
1. Essai ENI avec Jérôme (S1, `docs/essais/eni-stylet.md`, fichier `docs/essais/proto-stylet.html`) ; selon le verdict, revoir H2-12 (STREAMLINE 0,3), DA9 et le plan maître (`socle-PLAN.md`, § Risque n° 1).
2. **Prochaine tâche du plan** : après le verdict ENI, écrire le plan du lot 3b (`docs/plans/socle-lot3b-PLAN.md`, planificateur), depuis `socle-lot3-PLAN.md` § « Ce qui part en lot 3b » : reste de D17 (espace + glisser, bouton du milieu qui déplace la vue, outil main, caméra par page), gomme d'objet et réglage « doigt déplace la vue » dans la barre, échelons DA9 selon le verdict, mesure de la copie du contour au-delà de 2 000 points ; puis le lot 4.
3. Essais de plateforme non bloquants : Windows (Edge, puis WebView2) par la file du PC, à confier par le pilote (aucun ordre au PC depuis ce chantier) ; macOS (Safari, Chrome) sur le Mac ; Android en attente de KVM.
4. Runner self-hosted `[self-hosted, linux, vm]` à enregistrer pour ce dépôt (Outillage) avant toute CI.

## Fin de lot 2
Relecture 12:12 : aucun bloquant. Importants → T16b : (1) style en HashMap std ⇒ octets différents après save/load (14/20) ; (2) contrat ne joue pas S2/S3 sur fake-core, 3 écarts prouvés (Delete inconnu, AddPage after inconnue, points NaN). Mineurs : insert_page_at panique hors bornes ; copie du trait entier à chaque image (à mesurer lot 3) ; gomme garde des points densifiés ; radius/width non validés.

T16b mergée 12:21 (77f29b4) : style en champs du Y.Map (octets stables après rechargement, `reload_with_strokes_keeps_bytes`), contrat `describe.each` fake/vrai cœur, `BadRadius`/`BadWidth`, `insert_page_at` borné. Lot 2 clos.
Preuve finale (orchestrateur, 12:21, feat/socle) : verifier.sh rc=0 — Rust 106+3+3+14 = 126 tests (1 ignoré), web 112 tests, module Wasm 1 327 888 octets, prototype livré identique au build.
À trancher (cadrage, D25) : un document en cours d'édition garde dans son fichier l'encre effacée (pour rétablir) ; le premier enregistrement diffère de celui fait après rechargement (1 628 → 1 167 octets).

## S5 (partie VM)
Paquet Linux Tauri construit à 12:08 : `RoomBoard_0.1.0_amd64.deb`, 3,07 Mo, 2 min 03, pic 1,36 Go (mesure /usr/bin/time). Lancement de l'application non essayé.

## Fin de lot 1
Relecture 11:25 : 1 bloquant (canvas déformé quand le panneau grandit : encre 26 px au-dessus de la pointe à 1200×800), 4 importants, mineurs → T6c. T6c mergée : le fichier docs/essais/proto-stylet.html est corrigé et sert à l'essai ENI. Lot 1 clos (fin de lot faite, sans simplification séparée : T6c a fait emitClose/pressureOf).

## Constats d'architecture
mineur · banc · apps/web/src/app/banc.ts:99 · le panneau ne résume que les 600 dernières images sans le dire (l'export JSON garde tout) ; `banc.test.ts` ne distingue pas `slice(-n)` de `slice(0, n)` → à reprendre au lot 3b.
anti-refactorisation · duplication · apps/web/src/app/banc.ts, apps/web/src/main.ts · `fmt`, export JSON et suivi du devicePixelRatio recopiés de `proto/stylet.ts` (non exportés : pas nette) → les sortir dans un petit module au lot 5.
performance · moteur · apps/web/src/engine/engine.ts · `frameDurations()` copie toute la liste, jamais vidée (banc borné à 600 images par T28 ; plafond à poser dans le moteur).
robustesse · cœur/query · `hit_test_path` ne vérifie pas que le chemin est fini (point infini → `sample_path` sans fin, déduit du code, non exécuté).
performance · cœur/query · crates/roomboard-core/src/query.rs · `hit_test_path` recalcule le contour freedraw de chaque trait : 194 ms (release) pour 1 000 traits touchés, au-delà d'une image ; D38 l'appelle à chaque image pour la gomme d'objet → cache des contours dans le cœur à prévoir au lot 3.

## Pièges trouvés
- GTK Broadway : `gdk_screen_get_resolution()` rend −1, WebKitGTK en tire un devicePixelRatio négatif (page hors champ) ; `broadwayd` plante si on tue un client : fermer la fenêtre par son ✕.
- Le garde-arrêt refuse `kill` sur un processus lancé détaché (`&` dans un sous-shell) : lancer en `run_in_background`.
- Sous-agents Sonnet : ils écrivent `Co-Authored-By: Claude Sonnet 5.5` malgré la consigne ; messages corrigés par rebase local avant fusion.
- Outils absents au lancement : wasm-pack, wasm-bindgen-cli, tauri-cli. Installés : wasm-bindgen-cli 0.2.130 (cargo install), @tauri-apps/cli (pnpm).
- pnpm 12 exige `allowBuilds: { esbuild: true }` dans pnpm-workspace.yaml.
- Le crate Tauri ne compile pas tant que `apps/web/dist` n'existe pas (generate_context!).
- yrs 0.28 : pas de `with_scope_and_options`, pas d'`Array::move_to` ; UndoManager sans horloge par défaut sous Wasm.
- Aucun runner self-hosted enregistré pour roomboard (relecture 10:43).
