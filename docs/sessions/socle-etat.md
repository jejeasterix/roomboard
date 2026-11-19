# État — socle

Statut : en cours — lot 4 (OD17 : décision de Jérôme, 2026-11-19, « oui fait le avancé en autonomie même si je n'ai pas fais les tests » ; l'essai ENI du 2026-11-21 devient une vérification)
Gabarit : lots
Objectif : RoomBoard a un socle 0.1 (pages, tracé avec pression, gomme, sélection, formes, texte, annuler, zoom, format natif) bâti sur un cœur Rust/Wasm, une interface TypeScript et une coque Tauri 2.
Avancement : 4/6 lots clos — clos : 1, 2, 3, 3b · à faire : 4, 5
Étage : 3 — depuis 2026-11-19 22:10
Lot : 4 « Outils d'édition » — 22/22 tâches terminées (T45-T66) — depuis 2026-11-19 22:10
Avancement lot 5a (OD19) : clos — 12/12 tâches (T70-T81) ; prochaine tâche : plan du lot 5b après la fusion du lot 4
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/socle   Branche : feat/socle-lot4   Base : origin/main @ 5341564 (dépôt public jejeasterix/roomboard ; roomboard-prive hors chantier)
Branche principale locale au lancement : 5341564 (lot 4)
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

## Tâches (lot 3b)
Plan : docs/plans/socle-lot3b-PLAN.md (T30-T41, vagues : 1 = T30, T33, T34, T37 · 2 = T31, T32, T35, T36 · 3 = T38, T39 · 4 = T40 · 5 = T41 orchestrateur). Relecture du plan 1/1 : aucun bloquant ; 1 majeur (banc sans état des échelons → T40) et 2 mineurs (T41 contraintes, T36 mutation jouée) corrigés par le planificateur.
Référence lot 3b (37b5af3, 19:20) : verifier.sh rc=0 en 1 min 23, pic 0,59 Go — Rust 117+3+3+14 (1 ignoré), web 194 tests.
Réglages : É2 `prediction` auto|on|off défaut auto (S1, OC56 : prédits natifs, p95 17,4 / 17,1 ms) · É3 `inkTrail` on|off défaut off (OC56 : 0 % d'images > 25 ms sans elle) · É4 `webgl` on|off défaut off, repli Canvas 2D (S1, OC56, OC66) · paume `palm` strict|lenient défaut strict (écart T1) · doigt `finger` pan|draw défaut pan (D18).

T30 réglages (settings 14) · T31 É2 prédiction (predict 12) · T32 É3 traînée (ink-trail 8) · T33 É4 WebGL2 + repli (30 ; concepteur-critique, mutation éventail sans stencil rouge) · T34 paume + bouton du milieu (36) · T35 outil main + espace (router 20) · T36 images bornées + banc (14, mutation slice(0,n) rouge) · T37 mesure contour (rejouée : 10 000 points, push p95 0,021 ms ≤ 4 ms) · T38 moteur : caméra par page, espace (34) · T39 script S2 --lot3b + fiche · T40 amorce, barre à deux lignes, banc qui dit ses échelons (17 ; S2 lot 3b 4 passages) · T41 coque Linux (orchestrateur) · T42/T43 correctifs de fin de lot (2 majeurs : fiche « paume souple », traînée qui redevinait le routeur → `router.roleOf`) · T44 second tour (5 mineurs). Toutes : 1 essai, preuves rejouées par l'orchestrateur.
Fin de lot : relectures conformité + qualité (rendu ; entrées) sans bloquant, 2 tours de correctifs, 18 + 5 constats fermés.
Preuve du lot 3b (orchestrateur, tête bc4111e) : verifier.sh rc=0 — Rust 117+3+3+14 (2 ignorés : mesures), web 23 fichiers / 319 tests ; S2 lot 3 16 `ok`, `S2 lot 3 : OK` ; S2 lot 3b `OK (4 passages)` (réglages effectifs 2:off,3:off,4:off · 2:on · 3:on · 4:on ; WebGL2 par SwiftShader, repli prouvé par Vitest seulement) ; captures docs/essais/s2-lot3b-{defaut,2,3,4}.png.
Coque Linux : build release complet 19 min 25 (CARGO_BUILD_JOBS=2, pic 1,32 Go RSS, .deb 3,2 Mo) ; reconstruction avec le web final 58 s (pic 0,79 Go) ; sous Broadway (shim DPI 96, hors dépôt) la coque trace, gomme, annule ; barre à deux lignes visible ; capture docs/essais/coque-linux-lot3b.png.

## Tâches (lot 4)
Plan : docs/plans/socle-lot4-PLAN.md (T45-T59 ; vagues : 1 = T45-T48 · 2 = T49-T53 · 3 = T54-T57 · 4 = T58, T59). Premier planificateur mort à mi-écriture (processus arrêté vers 22:00) : sections T56-T59 écrites par un second (2cab00e). Relecture du plan 1/3, menée en parallèle de la vague 1 (temps compté) : aucun bloquant ; 1 majeur (T51 : Maj tenue avant une poignée → corrigé dans le prompt de T51, test ajouté) ; mineurs : ellipse prise sur toute sa boîte (fermé par T60), `commun.mjs` recopie S2 (constat, lot 5), comptes de T45.
Référence lot 4 (5341564, 22:05) : verifier.sh rc=0 en 1 min 46, pic 0,59 Go — web 24 fichiers / 319 tests.
T45 cœur Transform/AddShape (44ba12a) · T46 contrat TS, fausse liaison, calque (4c5470f ; concepteur-critique, mutation « translation seule » rouge) · T47 pages (7034866) · T48 mise en lignes, poignées (1a3f7ab) · T49 SetText Y.Text, S3/S4 cœur (6bd9659 ; concepteur-critique) · T50 rendu formes/texte/calque (89b8d22) · T51 sélection (aab3b96) · T52 formes (44d901f) · T53 texte + IME (da7be85 ; concepteur-critique, mutation `composing` rouge) · T54 liaison Wasm (e0a1424 ; concepteur-critique, contrat 48) · T55 moteur branché (c96a162) · T56 zone de saisie (134d69a) · T57 script S3/S4 (c82b40a) · T58 barre `#edition`, S3/S4 vert (9229524) · T59 fiche ENI (468d8d4). Toutes : 1 essai, preuves rejouées par l'orchestrateur sur la tête de chaque vague.
Fin de lot, tour 1 (4 relecteurs : conformité ; qualité cœur ; qualité contrat/outils ; qualité moteur/app) : aucun bloquant, 5 majeurs (script S3/S4 affaibli par T58 ; prise par l'intérieur abandonnée ; texte remis en lignes à chaque image ; poignées sur petite sélection ; tolérance de collision monde/local) → T60 (géométrie, parité, flèche, ellipse, matrices composées), T61 (cache des lignes, poignées, texte inchangé, emoji, zoom 2), T62 (mousedown seulement pour l'outil Texte : Entrée redéclenchait « Ajouter une page » ; script S3/S4 remis au niveau du plan, 60 `ok`), T63 (gomme et hitTestPath en unités monde ; banc 1 000 traits 12,8-17,7 ms contre 10,4-19,2 avant).
Tour 2 (conformité ; qualité) : constats du tour 1 fermés sauf 2 majeurs (poignées : axes inversés et coins sur petit cadre ; texte relu sans changement invisible faute d'image redemandée) → T64 (hitHandle partagé, `requestFrame`, script 68 `ok`, texte « Bonjour »), T65 (déterminant NaN refusé, gomme partielle anisotrope testée, alias arrowHead retiré). T66 simplification (fd71d8e ; tests inchangés). Deux tours de correctifs : borne atteinte.
## Tâches (lot 5a)
Plan : docs/plans/socle-lot5a-PLAN.md (T70-T78, vagues : 1 = T70, T71 · 2 = T72-T76 · 3 = T77 · fin = T78 orchestrateur ; T79-T81 correctifs de fin de lot). Lot 5 découpé en 5a (fichiers et coque) et 5b (SolidJS, barre en profils, barre des pages, Playwright `--e2e`, association `.roomboard`, Cmd+Q macOS) dans socle-PLAN.md. Mené par OD19 sur `feat/socle-lot5a`, en parallèle du lot 4 (OD17) ; aucun fichier sous `engine/` ni `ui/`.
Référence (5341564, 21:15) : verifier.sh rc=0 en 5 min 18 — Rust 117+3+3+14 (2 ignorés), web 24 fichiers / 319 tests.
Relecture du plan 1/3 : aucun bloquant ; 3 majeurs (touche tenue, gestes de la coque après réouverture, `.roomboard` et Cmd+Q sans lot) et 5 mineurs corrigés par le planificateur.
T70 contrat `FileHost` et choix de l'hôte (files 5) · T71 coque : plugins dialog/fs, permissions minimales, CSP `'wasm-unsafe-eval'`, `beforeBuildCommand`, contrôle hors ligne, fiches Windows et macOS (6 cas, clippy coque sans avertissement 3 min 34) · T72 hôte FSA (8) · T73 repli et coquille web (10) · T74 hôte et coquille Tauri (11) · T75 fichier en attente IndexedDB (8) · T76 contrôleur (concepteur-critique ; 16 puis 22 après revue immédiate : touche tenue prise sans relancer, mutations rouges) · T77 branchement `main.ts` (+5 −1) et essai Chromium (mount 5) · T78 coque Linux (orchestrateur) · T79 correctifs web (verrou du repli, garde de fermeture, rejets, IndexedDB ; +15 tests) · T80 contrôle CSP strict, essai avec CSP de la coque et empreinte des pixels, fiches (14 cas) · T81 second tour (repli `confirm` si la boîte Tauri échoue ; +5 tests). Toutes : 1 essai, preuves rejouées par l'orchestrateur.
Choix tranchés (plan, « Choix tranchés ») : Ouvrir recharge la page (fichier en attente dans IndexedDB ; le moteur n'a pas d'API pour changer de document) · « modifié » = `version` du document lue avant l'écriture · réglage `?fichiers=auto|fsa|repli` · `beforeBuildCommand` construit le web, pas le Wasm (`verifier.sh` d'abord) · CSP avec `dangerousDisableAssetCspModification` (style en ligne d'index.html) · versions Tauri figées 2.12.5 / dialog 2.8.4 / fs 2.7.1 · `additionalBrowserArgs` WebView2 en attente de la mesure du PC · repli : annulation 1 s après retour du focus sans `change`.
Fin de lot : double relecture (conformité ; qualité web ; qualité coque et scripts) sans bloquant, 3 majeurs + 15 mineurs fermés par T79/T80 ; tour 2 sans majeur, 3 mineurs + 1 simplification fermés par T81. Consigné : carte d'impact du cadrage non complétée des fichiers neufs de `platform/` (le plan les porte) ; `serve`/`loadPlaywright` recopiés de s2-navigateur.mjs (mise en commun au 5b).
Preuve du lot 5a : voir « Scénarios et captures (lot 5a) ».

## Scénarios et captures (lot 5a)
Essai fichiers au navigateur (VM, Chromium headless, `scripts/essais/fichiers-navigateur.mjs`, CSP de la coque en en-tête) : `Fichiers lot 5a : OK (3 modes)` (détection, fsa, repli) — tracer, Ctrl+S, recharger (page vide), ouvrir : même empreinte des pixels d'encre, nom repris, aucune requête hors de 127.0.0.1 ; captures docs/essais/fichiers-lot5a-{repli,fsa}.png. S2 lot 3 OK ; S2 lot 3b OK (4 passages).
Coque Linux (VM) : build release à froid 20 min 24 (CARGO_BUILD_JOBS=2, pic 1,44 Go RSS, .deb 3,51 Mio) ; reconstruction avec le web corrigé 2 min (pic 1,47 Go). Sous Broadway (shim DPI 96, hors dépôt) les 9 gestes de T78 réussissent : boîte GTK d'enregistrement, ZIP écrit, Ctrl+S sans boîte (date changée), ✕ → question, « No » garde la fenêtre, Ctrl+O → question puis rechargement avec les traits enregistrés, Ctrl+S sans boîte sur le chemin restauré, la question revient, document propre → fermeture sans question ; capture docs/essais/coque-linux-lot5a.png (question de fermeture sur la fenêtre). Non vérifié : un clic juste avant Ctrl+S a laissé le titre « modifié » au premier Ctrl+S (comportement prudent attendu si le trait est arrivé après la lecture de la version).
Fiches à jouer : docs/essais/coque-windows.md (file du PC), docs/essais/coque-macos.md (Jérôme).

## Scénarios et captures
S2 lot 3 (VM, 22:31, Chromium headless) — réussi : 3 traits souris, gomme en travers du 2e (4 traits), Ctrl+Z (3), Ctrl+Y (4), Ctrl+Maj+Z, boutons ; capture docs/essais/s2-lot3-vm.png (page blanche, 3 traits, le 2e coupé au milieu, barre avec Gomme pressée).
S5 partie Linux (VM, 22:42-22:55) — coque release construite (10 min 17, pic 1,29 Go RSS, .deb 3,2 Mo) ; sous Broadway la page sortait hors champ (`gdk_screen_get_resolution` = −1 → devicePixelRatio négatif, artefact du backend virtuel) ; avec un DPI de 96 forcé hors dépôt (shim LD_PRELOAD), la coque trace et Ctrl+Z annule ; capture docs/essais/coque-linux-lot3.png. Non essayé sur un vrai X11/Wayland. La coque embarque le `apps/web/dist` présent au build (pas de `beforeBuildCommand`) : construire le web d'abord.
S1 (VM, partie automatique) — réussi 11:20 : Chromium headless, trait souris, 42 points, retard p95 17,4 ms, 0 erreur · capture docs/essais/proto-stylet-essai-vm.png. Partie ENI : avec Jérôme cet après-midi (docs/essais/eni-stylet.md).

## Décisions prises en cours de chantier
- Licence : PolyForm Shield 1.0.0, pas GPLv3 (H0 close). Décision de Jérôme, 2026-11-16 : « Je décide donc de rester sur l'option 2. » Cadrage D40.

## Écarts acceptés
- T1 : quand le stylet se pose, tout geste `touch` actif est annulé (`cancelTouches`), lecture stricte de D18 ; le plan laissait tracer une paume posée avant le stylet.

## Hypothèses à revoir
HL4-1 : la `<textarea>` coupe ses lignes à quelques pixels près de `layoutText` (même police, même largeur).
HL4-3 : IME jouée seulement dans Chromium headless par CDP `Input.imeSetComposition` ; ni IME réelle Windows/macOS/Android, ni fenêtre de candidats, ni WebKit.
HL4-2 caduque (T60 : tolérance en unités monde des deux côtés) ; HL4-4 fermée (T60 : ellipse en polygone de 64 sommets, pointe de flèche dans le polygone).
Voir le cadrage § 4 (dont H1-9 : pas de CI tant qu'aucun runner n'est enregistré pour ce dépôt).
H2-13b Profil release `opt-level="s"` + `lto` exigé par le plan : grossit le .wasm de 22 808 octets (+1,7 %) ; à retirer ou essayer `"z"`.

## Portes
ouvertes : — · passées : —

## Reprise (prochaine tâche)
0. **Prochaine tâche du plan : écrire le plan du lot 4** (`docs/plans/socle-lot4-PLAN.md`, planificateur) depuis la ligne 4 de `socle-PLAN.md` (sélection, déplacer, redimensionner, formes, texte IME, pages) et le cadrage ; y reprendre HL3b-7 (retirer la page affichée, caméra par page).
1. Essai ENI du samedi 2026-11-21 (vérification, plus un préalable) : `docs/essais/eni-stylet.md`, § « Lot 3b : comparer les réglages » ; selon le verdict, changer un défaut dans `apps/web/src/engine/settings.ts` (un seul endroit) et revoir H2-12.
2. Essais de plateforme non bloquants : Windows (Edge, WebView2) par la file du PC, confiés par le pilote ; macOS (Safari, Chrome) ; Android en attente de KVM. Rien de mesuré sous WebKit ni au vrai stylet.
3. Runner self-hosted `[self-hosted, linux, vm]` à enregistrer avant toute CI.

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
mineur · lot 4 · apps/web/src/core/fake-core.ts · `strokeHalfWidth` prend la plus petite valeur singulière : sous une échelle anisotrope, la fausse liaison diffère du cœur (contour exact) pour bounds, hitTestPath, gomme d'objet ; le contrat ne couvre que les similitudes.
mineur · lot 4 · crates/roomboard-core/src/query.rs · `hit_test` recopie chaque contour en monde à chaque appel (allocation par élément, même en identité) alors que `path_hits_stroke` a une voie directe pour les similitudes : deux stratégies ; non mesuré.
mineur · lot 4 · apps/web/src/engine/text-layout.ts · coupe par point de code : drapeaux, séquences ZWJ et teintes encore coupés (`Intl.Segmenter` au lot 5).
mineur · lot 4 · Suppr puis Ctrl+Z : la sélection n'est pas rendue (comportement du moteur, à trancher au lot 5).
mineur · lot 4 · `set_text_inner` (wasm) garde `#[allow(clippy::too_many_arguments)]` (10 arguments sinon).
anti-refactorisation · duplication · apps/web/src/app/barre.ts · `mountEdition` reprend la boucle de `mountBar` (non net : barre remplacée au lot 5).
anti-refactorisation · duplication · scripts/essais/commun.mjs · reprend `loadPlaywright`, `serve`, `ink` de `s2-navigateur.mjs` sans migrer S2 → lot 5.
mineur · banc · apps/web/src/app/banc.ts:99 · le panneau ne résume que les 600 dernières images sans le dire (l'export JSON garde tout) ; `banc.test.ts` ne distingue pas `slice(-n)` de `slice(0, n)` → à reprendre au lot 3b.
anti-refactorisation · duplication · apps/web/src/app/banc.ts, apps/web/src/main.ts · `fmt`, export JSON et suivi du devicePixelRatio recopiés de `proto/stylet.ts` (non exportés : pas nette) → les sortir dans un petit module au lot 5.
performance · moteur · apps/web/src/engine/engine.ts · `frameDurations()` copie toute la liste, jamais vidée (banc borné à 600 images par T28 ; plafond à poser dans le moteur).
robustesse · cœur/query · `hit_test_path` ne vérifie pas que le chemin est fini (point infini → `sample_path` sans fin, déduit du code, non exécuté).
performance · cœur/query · crates/roomboard-core/src/query.rs · `hit_test_path` recalcule le contour freedraw de chaque trait : 194 ms (release) pour 1 000 traits touchés, au-delà d'une image ; D38 l'appelle à chaque image pour la gomme d'objet → cache des contours dans le cœur à prévoir au lot 3.

mineur · lot 3b T37 · seule la poussée native du contour est mesurée ; la copie Wasm → page ne l'est pas (HL3b-9), à voir au banc samedi.
anti-refactorisation · duplication · apps/web/src/engine/render/ink-trail.ts · types `InkLike`/`InkPresenterLike` recopiés de `proto/stylet.ts` (non net) → lot 5, avec le module commun du banc.

mineur · lot 3b · `badColors` et `lost` (WebGL2) ne sont lus par aucune barre : à afficher au lot 5.
mineur · lot 3b · perte et restauration du contexte WebGL2 testées sur faux contexte seulement.

## Pièges trouvés
- 2026-11-19 22:20 : un worktree `roomboard-wt/socle-lot5a` (branche `feat/socle-lot5a` @ 5341564) existe, créé hors de cette session : ne pas y toucher ; attention au rebase si un lot 5a est fusionné avant le lot 4.
- Orchestrateur en `claude -p` : un sous-agent qui lance sa suite en `run_in_background` et finit son tour n'est jamais réveillé (T30, T37 du lot 3b) : exiger le premier plan avec `timeout: 600000`.
- GTK Broadway : `gdk_screen_get_resolution()` rend −1, WebKitGTK en tire un devicePixelRatio négatif (page hors champ) ; `broadwayd` plante si on tue un client : fermer la fenêtre par son ✕.
- Le garde-arrêt refuse `kill` sur un processus lancé détaché (`&` dans un sous-shell) : lancer en `run_in_background`.
- Sous-agents Sonnet : ils écrivent `Co-Authored-By: Claude Sonnet 5.5` malgré la consigne ; messages corrigés par rebase local avant fusion.
- Outils absents au lancement : wasm-pack, wasm-bindgen-cli, tauri-cli. Installés : wasm-bindgen-cli 0.2.130 (cargo install), @tauri-apps/cli (pnpm).
- pnpm 12 exige `allowBuilds: { esbuild: true }` dans pnpm-workspace.yaml.
- Le crate Tauri ne compile pas tant que `apps/web/dist` n'existe pas (generate_context!).
- yrs 0.28 : pas de `with_scope_and_options`, pas d'`Array::move_to` ; UndoManager sans horloge par défaut sous Wasm.
- Aucun runner self-hosted enregistré pour roomboard (relecture 10:43).
