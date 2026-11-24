# État — cli-lot4

Statut : clos
Gabarit : chantier
Objectif : La CLI de RoomBoard importe enfin les fichiers Office, les vidéos et sons, les modèles 3D et les autres images (GIF, WebP, BMP, ICO, SVG, AVIF, HEIC), et plus aucun format du cadrage ne répond « lot pas encore livré ».
Avancement : 12/12 tâches terminées
Étage : 4 — depuis 2026-11-24 06:50
Lot : —
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/cli-lot4   Branche : feat/cli-lot4   Base : origin/main @ 352cbda
Branche principale locale au lancement : 352cbda
Cadrage : docs/plans/cli-lot4-cadrage.md   Plan(s) : docs/plans/cli-lot4-PLAN.md
Mode : ouvrier CLI OF9, autonome (brief : « Aucune question ne parvient à Jérôme pendant ton tour : tranche seul et écris tes choix. »)
Arrêt ferme : 2026-11-24 09:09 (lancement ~04:39 + 4 h 30) ; poussée de sauvegarde à 08:59

## Référence
Rapide : cli 185 tests · web 3150 tests (référence complète)
Complète (origin/main, `scripts/verifier.sh --e2e`) : 1er passage rouge sur 7 délais de la CLI (VM chargée), rejeu vert : `verifier.sh : e2e OK`, `verifier.sh : OK`
Tailles Wasm avant : principal 1 374 215 o (plafond 1 572 864) · formats 2 794 511 o (plafond 3 145 728) — confirmé par la référence

## Compteurs
contre-relecture cadrage 1/2 · relecture plan 1/3 · vagues sans progrès 0/2 · correctifs de fin 2/2

## Tâches
| id | dépend | état | essais | dernier commit vert | preuve rejouée |
|----|--------|------|--------|---------------------|----------------|
| T1 binaire roomboard-office | — | terminée | 1/3 | 61e8740 | office_bin 6 tests ok |
| T2 tailles d'images | — | terminée | 1/3 | 610b50b | image-size + image-import 47 tests |
| T3 en-têtes médias | — | terminée | 1/3 | 2fcc151 | media-header + media-import 29 tests |
| T4 CLI 3D | — | terminée | 1/3 | 8e3da70 | model3d-node, quiet, bin, pdf-node 34 tests (4 D76) |
| T5 CLI médias et images | T2, T3 | terminée | 2/3 (essai 1 mort avec le tour) | a0a0b4f | media-node 9 tests, media-header + image-size 32 tests |
| T6 CLI Office | T1 | terminée | 1/3 | d101b02 | 5 fichiers 71 tests, D79 réel vert |
| T7 branchement, FORMAT_LOTS | T4, T5, T6 | terminée | 1/3 | cff963f | suite CLI 29 fichiers, 248 tests |
| T8 essai, profil | T7 | terminée | 1/3 | 7bd7f1b | cli-essai 122 contrôles, CLI : OK |
| T9 correctifs relecture : Office | T8 | terminée | 1/3 | 6afe504 | suite CLI 252, office_bin 7 |
| T10 correctifs relecture : lecteurs, formats | T8 | terminée | 1/3 | 135b210 | web 3188, lecteurs 80 |
| T11 correctifs relecture : essai, 3D | T8 | terminée | 1/3 | 64a1efd | cli-essai OK, 3D 21 |
| T12 correctifs tour 2 | T9–T11 | terminée | 1/3 | 42e2c04 | CLI 255, image-size 17, office_bin 7 |

## Terminé quand
toutes les tâches terminées (aucune bloquée) · double relecture sans bloquant · `scripts/verifier.sh --e2e` OK · aucun format du cadrage en code 3 « lot pas encore livré » (un format laissé de côté porte sa raison) · tailles Wasm inchangées sous plafond · PR fusionnée par fusion locale `--no-ff` et poussée

## Hypothèses à revoir
Niveau 1 : H37 (.xlsx/.xlsm en tableau, .xls/.ods en pages) · H38 (code 3 = variante non lue, plus « lot non livré ») · H39 (SVG sans dimensions 300 × 150) · H40 (vidéo sans poster, 3D sans instantané : cadre gris dans l'app) · H41 (binaire dans target/ ou ROOMBOARD_OFFICE).
Niveau 2 : H42 à H51 (cadrage § 4).

## Hors périmètre
- Remplacement des polices Liberation (attend Jérôme).

## Portes
ouvertes : — · passées : aucune porte (merge sans go ; aucune release due : la CLI n'entre pas dans l'app distribuée)

PR : #47 fusionnée par fusion locale `--no-ff`, `main` f9b57b6. verifier.sh --e2e OK sur 0a72fb2.

## Pièges trouvés
- Prémisse démentie : le binaire Office existait en exemple (`convertir_office.rs`), promu ; `c16-office-navigateur.mjs:97` l'appelait.
- three.js dans Node nu : il manque `self`, `ProgressEvent`, `document` (D76, globaux posés pendant `view.load()`).
- Sous-agents Sonnet : ligne `Co-Authored-By` réécrite en « Opus 5.5 » (brief) par `rebase --exec` local avant chaque fusion.
- `grep -c roomboard-cli-t-` se compte lui-même : motif `roomboard-cli-t[-]`.
- Délais de la CLI sous charge (load ~14) : rejeu vert ; premier test 3D (chargement de three à froid) déplacé en `beforeAll` (T12), aucun délai relevé.
- `relaunch_runs_program_with_args_and_env` (coque, non touché par le lot) : `Text file busy` (ETXTBSY) une fois sous charge ; rejoué.
- Un tour d'orchestrateur fini pendant une tâche tue la tâche de fond : sous-agents au premier plan, jamais de fin de tour pendant un calcul.

## Relectures
- Fin de lot (4 relecteurs : conformité ; qualité A Office, B lecteurs, C 3D et essai) : 0 bloquant ; 4 major (latin1 de /proc, regex SVG quadratiques, rotation vidéo, kill(0) de l'essai) + course du Ctrl-C de groupe → T9, T10, T11.
- Tour 2 (correctifs) : majors corrigés ; 1 major (délai du premier test 3D) + 2 minor (test SVG sous ROOT_MAX, import Windows) → T12.

## Notes du coffre à poser

### 1. `00_Journal/2026-11-24-roomboard-cli-lot4-clos.md`

```markdown
---
id: 2026-11-24-roomboard-cli-lot4-clos
type: journal
summary: "RoomBoard CLI lot 4 clos (OF9) : Office par le binaire roomboard-office de roomboard-shell puis chemin PDF du lot 3, médias à durée lue dans l'en-tête, 3D validée par three sans WebGL, autres images (GIF, WebP, BMP, ICO, SVG, AVIF, HEIC) à taille lue dans l'en-tête ; plus aucun format en « lot pas encore livré » ; PR #47."
created: 2026-11-24
project: "[[roomboard]]"
tags: [projet/roomboard, chaine/nouvelle-feature, cli, office, media, 3d]
evidence: "docs/sessions/cli-lot4-etat.md ; docs/plans/cli-lot4-cadrage.md ; docs/plans/cli-lot4-PLAN.md ; scripts/essais/cli-essai.mjs (dépôt jejeasterix/roomboard)"
---

# RoomBoard — CLI, lot 4 (Office, médias, 3D, autres images), clos (OF9)

- Demande de Jérôme (2026-11-23) : « ajoute la construction de la cli complète » ; dernier lot du cadrage de la CLI (§ 7), mené seul par l'ouvrier OF9.
- Livré : `import`, `state`, `convert` lisent l'Office (Word, Excel, PowerPoint, OpenDocument) par `roomboard-office` (exemple `convertir_office` promu dans `crates/roomboard-shell`, `find_converter`, `convert_granted`) puis le chemin PDF du lot 3, original gardé ; les médias (MP4, MOV, M4A, WebM, WAV, Ogg, MP3) avec durée et taille lues dans l'en-tête (`media-header.ts`) ; la 3D (GLB, glTF, OBJ+MTL, STL, PLY, ZIP) validée par three sans WebGL ; GIF, WebP, BMP, ICO, SVG, AVIF, HEIC à taille lue dans l'en-tête (`image-size.ts`, aussi utilisé par `probeSize` de la page), aussi dans un tableau blanc.
- `FORMAT_LOTS` : `LOT_LIVRE = 4`, 48 formats tous lus ; le code 3 devient « variante non lue par la CLI » (en-tête illisible, convertisseur absent).
- Ctrl-C pendant une conversion : SIGINT relayé, restes de LibreOffice tués par `/proc` sous Linux, code 130 ; aucun `soffice` laissé.
- Relecture de fin de lot : regex SVG quadratiques, `/proc` lu en latin1 (chemin accentué), rotation `tkhd` des vidéos portrait, `kill(0)` possible dans l'essai : corrigés.
- Preuve : `verifier.sh --e2e` OK ; essai `cli-essai.mjs` à 122 contrôles ; 255 tests Vitest de la CLI, 3188 de la page.
- Tailles inchangées : module principal 1 374 215 o, formats 2 794 511 o.
- Lots restants : aucun.
- Décision : [[NNNN-roomboard-cli-lot4-office-binaire-et-en-tetes]] ; amende [[0281-roomboard-cli-node-modules-wasm-et-web]].
```

### 2. `02_Decisions/NNNN-roomboard-cli-lot4-office-binaire-et-en-tetes.md` (le canal pose le numéro)

```markdown
---
id: NNNN-roomboard-cli-lot4-office-binaire-et-en-tetes
type: decision
summary: "RoomBoard : la CLI convertit l'Office par le binaire roomboard-office de roomboard-shell (exemple promu, --check, purge, code 3 sans convertisseur) puis le chemin PDF du lot 3 ; médias et images autres que PNG/JPEG lus par leur seul en-tête dans deux modules purs de la page ; 3D validée par three avec des globaux posés le temps d'un load ; le code 3 devient « variante non lue » ; prise par l'agent."
created: 2026-11-24
status: actif
project: "[[roomboard]]"
tags: [projet/roomboard, decision/architecture, cli]
evidence: "docs/plans/cli-lot4-cadrage.md (DA16 à DA20, D51, D56, D63 à D69, D73, D76 à D80) ; crates/roomboard-shell/src/bin/roomboard-office.rs ; apps/web/src/platform/media-header.ts ; apps/web/src/platform/image-size.ts ; apps/cli/src/office-node.ts, media-node.ts, model3d-node.ts (dépôt jejeasterix/roomboard)"
---

# RoomBoard — CLI lot 4 : Office par un binaire de la coque, en-têtes lus sans décodeur (prise par l'agent)

- Office : binaire `roomboard-office` (`crates/roomboard-shell/src/bin`), qui appelle `find_converter` et `convert_granted` de `office.rs` ([[0265-roomboard-c16-office-conversion-native-original-garde]]). `--check` rend le convertisseur et la racine ; codes 0 succès, 1 échec, 2 usage, 3 aucun convertisseur. La CLI le trouve dans `target/debug/` ou par `ROOMBOARD_OFFICE`, sinon code 3 ; le PDF produit suit le chemin du lot 3 ([[0284-roomboard-cli-lot3-pdfjs-en-processus]]), original gardé. Ctrl-C : signal relayé, restes de LibreOffice tués par `/proc` (Linux) ; ailleurs, limite écrite (H50).
- Médias et images : la CLI ne décode rien ; durée et taille viennent de l'en-tête, par deux modules purs de la page (`media-header.ts`, `image-size.ts`) ; `probeSize` de la page les appelle aussi. Illisible : code 3.
- 3D : three valide le modèle sans WebGL ; `self`, `ProgressEvent` et `document.createElementNS` ne sont posés que pendant `view.load()`, pour ne pas tromper pdf.js.
- Code 3 : « variante non lue par la CLI » (en-tête illisible, convertisseur absent), jamais plus « lot non livré ».
- `.xlsx`/`.xlsm` restent un tableau en valeurs (contrat du lot 1) ; `.xls`/`.ods` passent en pages comme dans la coque.
```

### 3. Amendement de `02_Decisions/0281-roomboard-cli-node-modules-wasm-et-web.md`

Dans la puce « Sortie », remplacer « 3 format d'un lot suivant » par « 3 variante non lue par la CLI (en-tête illisible, convertisseur Office absent ; depuis le lot 4, [[NNNN-roomboard-cli-lot4-office-binaire-et-en-tetes]]) ». Dans la puce « Office passera par un binaire de `roomboard-shell` appelé par la CLI (lot 4). », remplacer par « Office passe par le binaire `roomboard-office` de `roomboard-shell`, appelé par la CLI (lot 4, [[NNNN-roomboard-cli-lot4-office-binaire-et-en-tetes]]). »

### 4. Fiche `01_Projets/roomboard.md`, segment à ajouter à la fin de la ligne 21

```
 ; CLI lot 4 (OF9 : Office par le binaire roomboard-office de roomboard-shell puis chemin PDF du lot 3, médias à durée lue dans l'en-tête, 3D validée par three sans WebGL, GIF WebP BMP ICO SVG AVIF HEIC à taille lue dans l'en-tête, aussi dans un tableau blanc ; code 3 = variante non lue ; plus aucun lot restant) clos (PR #47, `main` f9b57b6) — voir [[2026-11-24-roomboard-cli-lot4-clos]] et [[NNNN-roomboard-cli-lot4-office-binaire-et-en-tetes]]
```
