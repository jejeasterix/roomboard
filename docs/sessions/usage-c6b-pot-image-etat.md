# État — usage-c6b-pot-image

Statut : en cours
Gabarit : chantier (9 tâches estimées ; cadrage fait au budget « courte », jugé suffisant : 26 décisions)
Objectif : Le pot de peinture remplit ou efface une zone d'une image par diffusion 4-connexe avec une tolérance réglable, chaque clic est annulable, et « Rétablir l'original » rend l'image d'avant tout remplissage.
Avancement : 11/11 tâches terminées
Étage : 4 — depuis 2026-11-21 06:45
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/usage-c6b-pot-image   Branche : feat/usage-c6b-pot-image   Base : origin/main @ 458a90d
Branche principale locale au lancement : 458a90d
Cadrage : docs/plans/usage-c6b-pot-image-cadrage.md   Plan(s) : docs/plans/usage-c6b-pot-image-PLAN.md
Mode : autonome, ouvrier CLI sur la VM (OD91), aucune question à Jérôme pendant le tour.

## Référence
Finale (tête 1362592, verifier.sh --e2e) : OK · web 114 fichiers, 2283 tests · module Wasm 1 124 352 o · module formats 3 100 344 o · scène 662 px Pot actif · C6b pot sur image : OK
Complète (origin/main @ 458a90d, verifier.sh --e2e) : OK · web 112 fichiers, 2213 tests · module Wasm 1 119 330 o · module formats 3 099 350 o

## Compteurs
contre-relecture cadrage 1/2 · relecture plan 1/3 (T1–T7 tiennent ; T8–T10 non couverts, limite de tours) · vagues sans progrès 0/2 · correctifs de fin 1/2

## Tâches
Vagues : V1 = T1–T5 · V2 = T6, T7, T8 · V3 = T9 · V4 = T10. Worktrees : ~/projets/roomboard-wt/usage-c6b-pot-image--T<n>.
| id | dépend | état | essais | commit vert | preuve rejouée |
|----|--------|------|--------|-------------|----------------|
| T1 cœur Rust | — | terminée | 1/3 | 671c79b | pot_image 8, compat_c6b 2, compat_c5 2, pot 12, wasm fill_image 1 ; Wasm 1 124 352 o |
| T2 pixels | — | terminée | 1/3 | 5b80b8c | formats pixels 16, formats-wasm 1 ; formats 3 100 344 o (+994) |
| T3 moteur | — | terminée | 1/3 | 369939d | vitest 4 fichiers, 154 tests, tsc 0 |
| T4 Worker | — | terminée | 1/3 | b7e4c34 | vitest 3 fichiers, 54 tests, tsc 0 |
| T5 cache | — | terminée | 1/3 | 85caa28 | image-cache 35 tests, tsc 0 |
| T6 parité cœur TS | T1, T3 | terminée | 1/3 | 5622cbf | contrat 341 tests (WASM_REQUIRED), tsc 0 |
| T7 file du pot | T3, T4, T5 | terminée | 1/3 | 5065ca8 | image-fill 14 tests, tsc 0 |
| T8 tolérance | T3 | terminée | 1/3 | f240b3a | Toolbar + toolbar-host 66 tests, tsc 0 |
| T9 câblage | T6, T7 | terminée | 1/3 | b5886f2 | session, stage-tags, engine 151 tests ; suite web 2279 |
| T10 essais | toutes | terminée | 1/3 | f5a8d95 | verifier.sh --e2e OK (T10) ; scène 662 px ; capture docs/essais/c6b-pot-image.png |
| T11 correctifs de relecture | T1–T9 | terminée | 1/3 | 63b38c8 | session, cache, file 97 tests ; suite web 2283 |

## Terminé quand
toutes les tâches terminées (aucune bloquée) · double relecture sans bloquant · `scripts/verifier.sh --e2e` OK sans régression · scénarios réussis · capture dans `docs/essais/` · PR mergée par fusion locale `--no-ff` et `git push` sans force

## Scénarios et captures
Capture `docs/essais/c6b-pot-image.png` : page bleue ; l'image rognée n'est plus qu'un anneau rouge rempli de jaune au pot ; son fond blanc et sa bande grise sont effacés (alpha 0), le bleu passe à travers ; rangée « Tolérance » à 10.
S1 essai Playwright complet · S2 cœur (champs, sourceAsset, restauration, métadonnées) · S3 pixels.rs · S4 fichier d'avant C6b · S5 file, péremption, erreurs, budget (a–h)
Cadrage : 26 décisions, 18 hypothèses (8 de niveau 1), 24 lignes de modules à réutiliser.

## Hypothèses à revoir
—

## Hors périmètre
- P2 (mot par mot), P3 (zone fermée par plusieurs objets, `kind: "fill"`, C8), rotation libre.

## Portes
ouvertes : — · passées : —

## Pièges trouvés
- Revue immédiate des tâches `concepteur-critique` (T1, T5, T6, T7) reportée à la double relecture de fin, faute de temps (borne 4 h).
- T7 : le code du plan bloquait la file quand le lanceur rend `null` (dispose) ; corrigé et testé.
- T6 hors périmètre : `sourceAsset` illisible dans un fichier chargé — Rust `restore` le retire (une étape), le faux cœur l'oublie à la lecture.
- Prémisses démenties : `flood_fill` ne compare que le RVB et n'efface pas (à étendre) ; essai C6a `c6a-pot-navigateur.mjs:284-303` repose sur « clic image → fond » (à réécrire) ; aucune fixture C5.
- Chantier parallèle OD90 (C15 3D) : conflits probables `element.rs`, `commands.rs`, `roomboard-wasm/src/lib.rs`, `api.ts`, `wasm-core.ts`, `fake-core.ts`, `image-cache.ts`, `board-session.ts`, `fill-target.ts`, `verifier.sh`, `commun.mjs`.

## Notes du coffre à poser

### 1. `02_Decisions/NNNN-roomboard-c6b-pot-image-destructif.md`

```markdown
---
id: NNNN-roomboard-c6b-pot-image-destructif
type: decision
summary: "RoomBoard C6b : le pot sur une image remplit l'original à pleine résolution depuis le pixel source sous le clic (à travers rognage, retournements, quarts de tour), cuit luminosité, contraste et couleur transparente dans le nouveau PNG puis les retire, garde la géométrie ; sourceAsset posé au premier remplissage, « Rétablir l'original » le rend en une étape ; file du pot gardée par doc.version() ; prise par l'agent."
created: 2026-11-21
status: actif
project: "[[roomboard]]"
tags: [projet/roomboard, decision/architecture]
evidence: "docs/plans/usage-c6b-pot-image-cadrage.md (DAB1, DAB2, B4, B5, B7, B11, B13, HB2, HB3) ; apps/web/src/app/image-fill.ts ; crates/roomboard-core/src/image.rs"
---

# RoomBoard — pot sur image : destructif, sur l'original, une étape par clic (prise par l'agent)

- Point du clic : point du monde ramené dans la boîte affichée (bande de 6 px comprise), puis `displayToSource` ; pixel entier borné à l'image (`sourcePixelAt`, `core/image-params.ts`, partagé avec la pipette de C5). Calculé au clic, pas au lancement.
- Diffusion 4-connexe sur l'original à pleine résolution, décodé dans le Worker depuis le magasin d'assets (borne U26, 100 Mpx) ; aucun plafond propre au pot. Comparaison sur les quatre canaux RVBA, pixel peint opaque ; « effacer » (couleur « Aucune ») met alpha 0. Écart assumé à C5 I16 (« alpha gardé ») : sans l'alpha, un fond transparent déborderait dans le noir voisin.
- Après un remplissage : luminosité, contraste et couleur transparente sont cuits dans le PNG (encodé par `OffscreenCanvas.convertToBlob`) puis retirés de l'élément ; rognage, retournements, quarts de tour et matrice gardés. `sourceAsset` posé au premier remplissage seulement.
- « Rétablir l'original » (bouton de C5) : rend `sourceAsset` et retire tous les champs, en une transaction.
- File du pot dans la couche application (`createFillQueue`) : clics écrits dans l'ordre, un calcul à la fois ; `doc.version()` vérifié avant le calcul, à l'arrivée et avant l'écriture : toute écriture étrangère (Ctrl+Z, trait) abandonne la file. Ordre : PNG au magasin, `Fill`, adoption du bitmap.
- Cache des bitmaps : budget de 48 Mpx décodés hors scène ; emplacement retouché gardé pour annuler sans clignotement.
- À revoir : limite de surface de canvas sur iPad non mesurée (HB2) ; pic mémoire estimé > 2 Go à 100 Mpx.
- Lien : [[0256-roomboard-c5-contigu-depuis-les-bords]], [[0257-roomboard-c5-worker-pixels-vivant]], [[0254-roomboard-pot-commande-fill]].
```

### 2. `00_Journal/2026-11-21-roomboard-usage-c6b-pot-image-clos.md`

```markdown
---
id: 2026-11-21-roomboard-usage-c6b-pot-image-clos
type: journal
summary: "RoomBoard usage C6b pot de peinture sur image clos : remplir ou effacer une zone d'une image par diffusion 4-connexe RVBA avec tolérance réglable (défaut 5), une étape par clic, nouvel asset PNG, sourceAsset et « Rétablir l'original » ; PR #PR."
created: 2026-11-21
project: "[[roomboard]]"
tags: [projet/roomboard, chaine/nouvelle-feature]
evidence: "docs/sessions/usage-c6b-pot-image-etat.md (dépôt jejeasterix/roomboard)"
---

# RoomBoard — usage C6b pot sur image, clos (OD91)

- Livré : cible image du pot (`hit_test` puis pixel source à travers les champs de C5), `Fill` image dans le cœur Rust (une transaction, `sourceAsset`), `SetImageParams.restore`, `flood_fill` RVBA avec effacement dans `roomboard-formats` (+994 o), Worker de C5 étendu (décodage pleine résolution, encodage PNG), file du pot `app/image-fill.ts`, budget du cache, curseur « Tolérance » dans la rangée du pot.
- Tailles : module Wasm 1 124 352 o (1 119 330 avant), module formats 3 100 344 o (3 099 350 avant). Scène 662 px.
- Preuve : `scripts/verifier.sh --e2e` OK, essai `c6b-pot-image-navigateur.mjs`, capture `docs/essais/c6b-pot-image.png`.
- Décision : [[NNNN-roomboard-c6b-pot-image-destructif]].
- Restes consignés : parité faux cœur (`geometryOf` contre `BAKED`), pic mémoire à 100 Mpx à mesurer sur iPad, lecture RVBA dupliquée dans `pixel-worker.ts`.
```

### 3. Fiche `01_Projets/roomboard.md`, ligne « Vague 2 en cours » : ajouter à la fin

`; C6b pot de peinture sur image (remplir, effacer, tolérance, sourceAsset, Rétablir l'original) clos (PR #PR, `main` <sha>) — voir [[2026-11-21-roomboard-usage-c6b-pot-image-clos]] et [[NNNN-roomboard-c6b-pot-image-destructif]]`

Et dans « Journal » : `- [[2026-11-21-roomboard-usage-c6b-pot-image-clos]]`


## Double relecture (fin)
Conformité : aucun blocker ni major ; 2 minor (B22 libellé caché par largeur et non par hauteur ; deux lignes du Worker non exécutées par les tests) et 2 simplifications (corrigées en T11).
Qualité : 2 major corrigés en T11 (dispose de la session sans `fillQueue.dispose()` ; budget du cache qui fermait un bitmap attendu par un calcul C5) ; minor 5 (copie SVG non fermée) corrigé ; restent consignés : parité faux cœur `geometryOf` contre `BAKED` Rust, pic mémoire estimé > 2 Go à 100 Mpx (à mesurer sur iPad), lecture des pixels dupliquée dans `pixel-worker.ts`.

## Constats d'architecture
simplification · pixel-worker · apps/web/src/platform/pixel-worker.ts · lecture RVBA (OffscreenCanvas, drawImage, getImageData) écrite deux fois, extraire `readRgba`.
