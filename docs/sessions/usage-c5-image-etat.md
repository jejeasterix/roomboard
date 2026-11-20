# État — usage-c5-image

Statut : en cours
Gabarit : chantier
Objectif : On rogne une image, on la retourne, on la tourne par quarts de tour, on règle luminosité et contraste, et on rend transparente une couleur (pipette, tolérance, contigu ou global, plume, aperçu), sans perdre l'original, avec les calculs de pixels dans un Worker.
Avancement : 21/21 tâches terminées
Étage : 4 — depuis 2026-11-20 19:45
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/usage-c5-image   Branche : feat/usage-c5-image   Base : origin/main @ 0dd7f1a, puis origin/main @ 9549785 (C12) fusionné en e6ffd35
Branche principale locale au lancement : 0dd7f1a (avancée à 9549785 par OD85, C12 fusionné : attendu)
Cadrage : docs/plans/usage-c5-image-cadrage.md   Plan(s) : docs/plans/usage-c5-image-PLAN.md
Lancement : 2026-11-20 17:16 · arrêt ferme 21:16 (bilan à 21:06)

## Référence
Complète (origin/main @ 0dd7f1a) : `verifier.sh --e2e` OK (e2e OK), 17:28. Wasm principal 1 080 736 o · formats 859 580 o

## Compteurs
contre-relecture cadrage 1/2 · relecture plan 1/3 (aucun bloquant ; corrections T7 parité flipX, T12 asWorkerLike + timeout 5000, T16/T17 preuve par tee + grep) · vagues sans progrès 0/2 · correctifs de fin 2/2

## Tâches
Plan docs/plans/usage-c5-image-PLAN.md (17 tâches ; sections T11–T17 en écriture pendant la vague 1, choix tranché pour tenir l'arrêt ferme).
Vagues : V1 = T1, T5, T6, T8, T15 · V2 = T2, T9 · V3 = T3, T10 · V4 = T4 · V5 = T7 · V6 = T11 · V7 = T12, T13 · V8 = T14 · V9 = T16 · V10 = T17.
| id | état | essais | commit vert | preuve rejouée |
|---|---|---|---|---|
| T1 | terminée | 1/3 | 6bd9dca | compat_c5 1 ok (rejoué après fusion C12) |
| T5 | terminée | 1/3 | 003504e (fusion 74faaf8, conflit C12 résolu) | pixels 11 ok, wasm image_ 2 ok ; formats 859 580 → 866 775 o |
| T6 | terminée | 1/3 | 11b7b8f | image-params 16 ok |
| T8 | terminée | 1/3 | ab33a86 (fusion 9e2956b, conflit C12 résolu) | platform 324 ok |
| T2 | terminée | 1/3 | 9c70dac | core 350+ ok, compat_c5 2 ok |
| T9 | terminée | 1/3 | dde7f51 | render 196 ok |
| T10 | terminée | 1/3 | 278e04f | engine 675 ok |
| T15 | terminée | 1/3 | 9dc97f7 | node --check 3, empreintes identiques |
| T3 | terminée | 1/3 | f6da14a | core 0 FAILED, image:: 14 ok |
| T4 | terminée | 1/3 | 162c207 | wasm 48 ok ; module principal 1 080 736 → 1 098 034 o |
| T7 | terminée | 1/3 | e2ae635 | core 429 ok (vrai module), tsc 0 erreur ; contrat C5 15 tests |
| T11 | terminée | 1/3 | 0af685f | engine 692 ok |
| T12 | terminée | 1/3 | c41af82 | app 294 ok |
| T13 | terminée | 1/3 | 03ef298 | ui 206 ok |
| T14 | terminée | 1/3 | 0531257 | ui 186 ok |
| T16 | terminée | 1/3 | c13400d | verifier.sh --e2e OK, rejoué sur 21030f1 (C5 image : OK, scène 706 px) |
| T18 correctifs de relecture | terminée | 1/3 | e68a879 | verifier.sh --e2e OK sur 798da2e |
| T19 simplification du lot (ex-T17) | terminée | 1/1 | bf2cc05 | web 1908 = avant, diff des tests vide |
| T20 contrôle des licences voit src-tauri | terminée | 1/3 | 98cd96d | controle-licences OK (11 cas) ; main 9549785 échouait aussi |
| T21 correctifs du tour 2 | terminée | 1/3 | 43165e6 | verifier.sh --e2e OK sur f806814 ; revue immédiate : aucun major |

## Terminé quand
toutes les tâches terminées · double relecture sans bloquant · `scripts/verifier.sh --e2e` OK · capture image rognée au fond transparent dans docs/essais/ · scène ≥ 640 px mesurée par un test · module Wasm principal ≤ 1 572 864 octets · PR fusionnée par fusion locale --no-ff et push sans --force

## Rapides sur la tête 4a1bfc6
cargo --workspace : 546 passés, 0 FAILED · `ROOMBOARD_WASM_REQUIRED=1 pnpm -r test` (wasm reconstruits) : 108 fichiers, 2062 passés. Double relecture (qualité A, qualité B, conformité) lancée sur 9549785..4a1bfc6, carnets /tmp/c5ref/relecture-usage-c5-image-3.8-*.md.

## Double relecture (tour 1, 9549785..4a1bfc6)
Aucun blocker. Majeurs : M1 aperçu périmé après écriture hors séance (qualité B + conformité) ; M2 Entrée pendant le rognage ignore la cible ; M3 export PDF vectoriel (C12) d'une image rognée faux (drawImage à 9 arguments non géré par RecordingContext2D, endroit absent de la carte d'impact). Mineurs : pixel-runner exceptions, contraste f64 inexact, hasPixels, Valider pendant calcul, aperçu gardé après fermeture, data-pixels I33, espace+glisser pendant le rognage, pointerId du geste. Simplifications : PixelParams = Pick<ImageParams>, échelle écran dupliquée, boucle des poignées [anti-refactorisation : duplication], sizeOf, nom `edit`, editAction calculé deux fois.

## Rapport
- Scénarios : S1, S2 joués par l'essai navigateur (C5 image : OK, scène 706 px panneau ouvert) ; S3 tests Rust de pixels.rs ; S4 compat_c5 (fixture d'avant C5) et contrat C5 enregistrer/rouvrir ; S5 tests du lanceur et du cache (résultat périmé, module absent).
- Hypothèses : 17 dont 6 de niveau 1 (cadrage § hypothèses), toutes « à revoir » par Jérôme ; la plus visible : contigu depuis les bords (un fond enfermé reste opaque, passer en global).
- Décisions d'architecture (prises par l'agent) : géométrie d'affichage dans la page (image-params.ts) ; pixels dans le module formats ; lanceur de pixels à Worker vivant ; séance de retouche du moteur (image-edit.ts).
- Hors périmètre : rotation libre, pot et gomme sur image (C6b). `sourceAsset` non préparé (C6b le posera).
- Simplification appliquée (T19) : 4 constats ; 1 consigné sans objet (sizeOf).
- Constats d'architecture : 1 ajouté (crates/roomboard-core, ImageView recopie ImageParams). Zone crates/roomboard-core à 3 constats ouverts : audit de cette zone proposé, pas lancé.
- Release : non due (aucune release ni tag demandés).
- Hors chantier corrigé pour tenir verifier.sh : contrôle des licences (src-tauri devenu lisible hors ligne, main échouait aussi).

## Double relecture (tour 2, 21030f1..798da2e)
M1, M2, M3 et m1–m3 fermés. Nouveau major (régression de m4) : image validée pendant le calcul de l'aperçu, puis curseur touché : l'élément reste dessiné brut sans limite (reproduit par le relecteur). Minors : bitmap d'aperçu remplacé non fermé ; history() jette le brouillon même sans changement ; m4 et m5 partiels. → T21.

## Suite complète finale
f806814 : `verifier.sh --e2e` OK (C2, C12, C6a, C5 OK ; vitest 2079 passés ; licences OK ; principal 1 098 034 o, formats 3 099 350 o ; scène 706 px panneau ouvert).

## Constats non corrigés (reste)
- minor : `lastFailed` de image-cache.ts reste global (data-pixels `echec` sur une page dont l'image visible est saine) ; existait avant T21.
- simplification : constante `PREVIEW` ajoutée mais `#apercu` encore écrit en dur 4 fois dans image-cache.ts.
- minor : espace + glisser pendant le rognage ne déplace plus la vue ; pointerId ignoré par le geste de rognage (non vérifié).

## Choix tranchés seul (orchestrateur)
- Vague 1 lancée pendant que le planificateur finissait T11–T17 ; relecture du plan en parallèle (tenir l'arrêt ferme).
- Revue immédiate des tâches `concepteur-critique` (3.5.5) remplacée par la double relecture de fin, pour le temps.
- T20 ajoutée : le contrôle des licences échouait aussi sur main (environnement) ; exception target-lexicon (Apache-2.0 WITH LLVM-exception, permissive) et exclusion des membres du workspace dans le relevé src-tauri.
- Contraste en entier exact (T18 m2) : change d'une unité ~4 % des valeurs par rapport au f64 ; aucun fichier n'avait encore de réglage figé.
- Double relecture lancée sur T1–T15 pendant que T16 (essai navigateur) tourne.
- origin/main (C12) fusionné tôt dans la branche (e6ffd35) ; conflits container.ts et formats lib.rs résolus en gardant les deux.

## Scénarios et captures
S1, S2 joués par `scripts/essais/c5-image-navigateur.mjs` dans `verifier.sh --e2e` : « C5 image : OK ». Scène 706 px, panneau image ouvert.
Capture docs/essais/c5-image-rognee-transparente.png : fond de page bleu, image rognée 160×120 retournée, coin blanc rendu transparent (bleu visible), intérieur blanc du cercle gardé (contigu), panneau calé à droite.
Tailles : principal 1 080 736 → 1 098 034 o (≤ 1 572 864) ; formats après C12 3 092 294 → 3 099 365 o (+7 071 o pour C5 ; ≤ 3 145 728, marge 46 363 o) ; principal après C12 1 084 202 → 1 098 034 o (+13 832 o).

## Hypothèses à revoir
Cadrage 8319538 : 17 hypothèses dont 6 de niveau 1, 4 décisions d'architecture, 30 lignes « Modules à réutiliser ». Scénarios : S1 essai Playwright complet · S2 quart de tour + luminosité · S3 global/contigu/plume (Rust) · S4 fichier d'avant C5 · S5 résultat périmé jeté, module absent

## Hors périmètre
- rotation libre, pot sur image, gomme sur image (C6b)

## Portes
ouvertes : — · passées : —

## Pièges trouvés
- Prémisses démenties : contigu = diffusion depuis les bords (pas de graine) ; cache bitmap par asset → par élément ; rogner/tourner déplace la boîte ; pas d'encodage PNG en C5 ; Worker vivant (pas jetable comme C10b) ; une rangée de 8 boutons casse 640 px → un bouton « Image » + panneau.
- Chantier en cours sur les mêmes fichiers : OD85 C12 PDF (`feat/usage-c12-pdf`) : element.rs, api.ts, wasm-core.ts, fake-core.ts, renderer.ts, canvas2d.ts, board-session.ts, stage-tags.ts, toolbar-host.ts, App.tsx, main.ts, verifier.sh, verifier-e2e.test.sh.

## Notes du coffre à poser

4 notes, plus une ligne de la fiche projet.

### 1. `00_Journal/2026-11-20-roomboard-usage-c5-image-clos.md`

```markdown
---
id: 2026-11-20-roomboard-usage-c5-image-clos
type: journal
summary: "RoomBoard usage C5 édition d'image clos : rogner, retourner, quarts de tour, luminosité/contraste, couleur transparente (pipette, tolérance, plume, contigu depuis les bords ou global) non destructifs, pixels en Rust dans le module formats appelés par un Worker ; PR #22."
created: 2026-11-20
project: "[[roomboard]]"
tags: [projet/roomboard, chaine/nouvelle-feature]
evidence: "docs/sessions/usage-c5-image-etat.md (dépôt jejeasterix/roomboard)"
---

# RoomBoard — usage C5 édition d'image, clos (OD86)

- Livré : réglages non destructifs de l'élément image (`crop`, `flipX`, `flipY`, `quarterTurns`, `brightness`, `contrast`, `transparent{color, tolerance, soft, contiguous}`), commande `SetImageParams` (une étape par validation, seuls les champs changés réécrits), « Rétablir l'original » (`{}`), bouton « Image » de la rangée Sélection et panneau calé à droite, pipette, aperçu avant « Valider ».
- Pixels : `transparent_color`, `adjust`, `flood_fill` (prêt pour C6b) en Rust pur dans `roomboard-formats`, sans crate d'image ; Worker unique gardé vivant 10 s, file avec remplacement, résultat périmé jeté ; cache des bitmaps par élément.
- Tailles : module principal 1 084 202 → 1 098 034 o (plafond 1 572 864) ; module formats 3 092 294 → 3 099 350 o (plafond 3 145 728, marge ~46 Ko : le prochain ajout au module formats doit la surveiller).
- Relecture : 3 majors corrigés (aperçu périmé après une écriture hors séance, Entrée pendant le rognage, export PDF vectoriel de C12 d'une image rognée) ; simplification du lot appliquée.
- C12 fusionné pendant le chantier : fusion de origin/main, conflits d'ajouts gardés des deux côtés.
- Décisions : [[NNNN-roomboard-c5-contigu-depuis-les-bords]], [[NNNN-roomboard-c5-worker-pixels-vivant]]. Piège : [[yrs-any-map-octets-instables-au-rechargement]].
```

### 2. `02_Decisions/NNNN-roomboard-c5-contigu-depuis-les-bords.md`

```markdown
---
id: NNNN-roomboard-c5-contigu-depuis-les-bords
type: decision
summary: "RoomBoard C5 : la couleur transparente en mode contigu diffuse depuis tous les pixels du bord de l'image source, sans graine ; le format garde transparent{color, tolerance, soft, contiguous} de U29 ; prise par l'agent."
created: 2026-11-20
status: actif
project: "[[roomboard]]"
tags: [projet/roomboard, decision/architecture]
evidence: "docs/plans/usage-c5-image-cadrage.md I3, I14 ; docs/etudes/usage-edition-image.md:60 ; crates/roomboard-formats/src/pixels.rs"
---

# RoomBoard — couleur transparente contiguë : diffusion depuis les bords (prise par l'agent)

- Le mode contigu part de tous les pixels du bord dont l'écart à `color` est ≤ `tolerance + soft`, diffusion 4-connexe, calcul avant rognage.
- La pipette ne donne que la couleur : pas de `x`, `y` dans le format (U29 tel quel).
- Conséquence : un fond enfermé par le dessin reste opaque ; il faut passer en mode global.
- `flood_fill` garde une graine explicite, pour le pot sur image de C6b.
- À revoir par Jérôme : décision prise par l'agent en mode autonome (OD86).
```

### 3. `02_Decisions/NNNN-roomboard-c5-worker-pixels-vivant.md`

```markdown
---
id: NNNN-roomboard-c5-worker-pixels-vivant
type: decision
summary: "RoomBoard C5 : les calculs de pixels passent par un Worker unique gardé vivant (pas le Worker jetable de C10b), file avec remplacement par emplacement, résultat périmé jeté ; aucun encodage PNG en C5, les retouches sont recalculées à l'ouverture ; prise par l'agent."
created: 2026-11-20
status: actif
project: "[[roomboard]]"
tags: [projet/roomboard, decision/architecture]
evidence: "docs/plans/usage-c5-image-cadrage.md (DAI3, I18, I19) ; apps/web/src/platform/pixel-runner.ts"
---

# RoomBoard — Worker de pixels vivant, sans encodage PNG (prise par l'agent)

- Recréer un Worker à chaque calcul rechargerait le module formats (~3 Mo depuis C12) à chaque pas de curseur : un seul Worker par onglet, arrêté après 10 s d'inactivité ou sur erreur.
- Un seul travail en attente par emplacement (élément ou aperçu) ; le travail remplacé se résout à `null` sans être lancé ; le résultat arrivé pour une clé périmée est fermé.
- Pas de `convertToBlob` en C5 : l'asset d'origine n'est jamais réécrit, l'image retouchée est recalculée à l'ouverture. L'encodage PNG viendra avec C6b (destructif, `sourceAsset`) et l'export.
- À revoir par Jérôme : décision prise par l'agent en mode autonome (OD86).
```

### 4. `04_Pieges/yrs-any-map-octets-instables-au-rechargement.md`

```markdown
---
id: yrs-any-map-octets-instables-au-rechargement
type: piege
summary: "yrs : une valeur Any::Map est encodée dans l'ordre d'un HashMap à graine aléatoire, donc les octets du document changent à chaque rechargement ; ranger les objets en Y.Map (MapPrelim) ou en Any::Array positionnel."
created: 2026-11-20
project: "[[roomboard]]"
status: actif
tags: [tech/rust, tech/yrs, tech/crdt]
evidence: "crates/roomboard-core/src/element.rs (lecture des réglages d'image, commentaire Any::Map) ; test any_map_params_read_as_absent et image_params_reload_keep_bytes (crates/roomboard-core/src/image.rs), tâche T2 du chantier usage-c5-image"
---

# yrs : Any::Map donne des octets instables

**Symptôme** : un document enregistré, rouvert puis réenregistré n'a pas les mêmes octets (le test « rechargement à l'identique » échoue au hasard).

**Cause** : yrs encode `Any::Map` dans l'ordre d'itération d'un `HashMap` dont la graine est aléatoire par processus.

**Solution** : un objet de réglages va en `Y.Map` (`MapPrelim`), une liste fixe en `Any::Array` positionnel (comme `crop` et la matrice). Le lecteur ne prend que `Out::YMap` et lit tout autre forme comme absente.
```

### Fiche `01_Projets/roomboard.md`, ligne 21

Remplacer `C5 édition d'image en cours.` par :
`C5 édition d'image non destructive (rogner, retourner, quarts de tour, luminosité/contraste, couleur transparente, pixels en Worker) clos (PR #22) — voir [[2026-11-20-roomboard-usage-c5-image-clos]] et [[NNNN-roomboard-c5-contigu-depuis-les-bords]].`
