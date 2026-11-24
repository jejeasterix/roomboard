# État — cli-lot3

Statut : en cours (étage 4)
Gabarit : chantier (7 tâches, confirmé à l'étage 2)
Objectif : La CLI de RoomBoard lit un PDF en onglet avec ses pages en fond, écrit un PDF annoté depuis un `.roomboard`, et convertit vers et depuis le PDF.
Avancement : 8/8 tâches terminées
Étage : 4 — depuis 2026-11-24 04:35
Lot : —
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/cli-lot3   Branche : feat/cli-lot3   Base : origin/main @ 48118ae
Branche principale locale au lancement : 48118ae
Cadrage : docs/plans/cli-lot3-cadrage.md   Plan(s) : docs/plans/cli-lot3-PLAN.md
Mode : autonome (ouvrier CLI OF8, aucune question à Jérôme : choix tranchés seul et consignés)
Arrêt ferme : 2026-11-24 07:05 (lancement 02:35 + 4 h 30) ; point d'arrêt à 06:55

## Référence
Rapide : —
Complète (worktree neuf @ 48118ae, `verifier.sh --e2e`, 682 s) : CODE=0, `verifier.sh : e2e OK`

## Tailles Wasm avant
principal 1 374 215 o (plafond 1 572 864) · formats 2 794 511 o (plafond 3 145 728), mesurés sur la référence

## Compteurs
contre-relecture cadrage 1/2 (1 bloquant, 3 majeurs, 7 mineurs, corrigés) · relecture plan 1/3 (0 bloquant, 1 majeur, 3 mineurs) · vagues sans progrès 0/2 · correctifs de fin 1/2

## Tâches
Vagues : 1 = T1 ∥ T2 ∥ T3 ; 2 = T4 (après T2, T3) ; 3 = T5 ; 4 = T6 ; 5 = T7. Toutes `isolé` (`~/projets/roomboard-wt/cli-lot3--T<n>`, branche `feat/cli-lot3--T<n>`).
| id | dépend | subagent | état | essais | dernier commit vert | preuve rejouée |
|----|--------|----------|------|--------|---------------------|----------------|
| T1 | — | concepteur-critique | terminée | 1/3 | 4b7e331 (fusion f78ae90) | web 8 fichiers 237 tests (avec T2, T3), tsc 0 |
| T2 | — | concepteur-critique | terminée | 1/3 | 8a0b815 (fusion 8fd67d4) | idem ; `pdfJobReply` 4, `pdfjsBinding` 2, `vectorPainter` 2 |
| T3 | — | implementeur-tdd | terminée | 1/3 | 64d62f3 (fusion aa9e12d) | `fabrique-pdf` 2 ; « Open Font License » 0 |
| T4 | T2, T3 | concepteur-critique | terminée | 1/3 | fc4744a | cli 163 tests, tsc 0 ; `controle-licences : OK` (rapport) |
| T5 | T1, T3, T4 | implementeur-tdd | terminée | 1/3 | 079392b | cli 171 tests, `-t S1` 8, tsc 0 |
| T6 | T5 | concepteur-critique | terminée | 1/3 (arrêtée à 40 tours, travail commité, rapport demandé) | 0d8eee2 | cli 182 tests, `-t "S2 à S4"` 11, tsc 0 |
| T7 | T6 | concepteur-critique | terminée | 1/3 | 6e4f5d1 (fusion d46a9a8) | `cli-essai.mjs` 89 contrôles `CLI : OK` |
| T8 | T7 | concepteur-critique | terminée | 1/3 | 30f06f3 (fusion b0ef245) | correctifs de la double relecture : cli 185 tests, tsc 0, essai 92 contrôles `CLI : OK` ; S1 4166 ms → 154 ms (beforeAll, aucun délai relevé) |

## Terminé quand
toutes les tâches terminées · PDF « couvert » dans `FORMAT_LOTS` avec ses tests et des contrôles dans `scripts/essais/cli-essai.mjs` (page comptée, texte retrouvé, fond présent) · `verifier.sh --e2e` OK · tailles Wasm sous les plafonds, plafonds inchangés · double relecture sans bloquant · PR mergée par fusion locale `--no-ff`, poussée sans `--force`

## Décisions de l'orchestrateur
- Mode autonome : aucune question à Jérôme (brief OF8).
- Contre-relecture du cadrage : un seul tour (bloquant levé par une décision de l'agent, D48), faute de temps.
- B1 licence : les polices Liberation de `pdfjs-dist` sont sous GPL v2 avec exception de police (vérifié dans `LICENSE_LIBERATION`), pas OFL comme le disait `THIRD_PARTY_NOTICES.md`. Choix : la CLI les lit à l'exécution dans `pdfjs-dist` installé, sans copie ; la notice est corrigée ; le passage à une police OFL reste à Jérôme.
- Relecture du plan : correctifs passés dans les briefs des tâches au lieu d'un 2e tour du planificateur (gain de temps) : T5 construit la CLI et prouve pdf.js dans le fichier et stderr vide ; T6 filtre `-t "S2 à S4"` ≥ 11 ; G6 (aucune dépendance ajoutée) rappelée à T5 et T6 ; numéros de ligne de `formats.ts` : `.pdf` l. 54, `LOT_LIVRE` l. 11, `exportBlocked` l. 101-104.
- T7 confiée à `concepteur-critique` (au lieu d'`implementeur-tdd`) avec la cause racine trouvée par T5 et T6 : l'`await` de premier niveau de `bin.ts` plaçait les `import()` inlinés de pdf.js et pdf-lib après lui dans le fichier construit. Corrigé dans `bin.ts` ; les imports d'effet de bord de `session.ts` (dont `../../web/node_modules/pdf-lib`) retirés.
- Essai T7 : une seule annotation `SetText` « Note CLI » (le plan prévoyait aussi un `AddShape`) : la superposition `/Form` en page 2 est contrôlée.
- Reste d'OF5 fait à l'étage 0 : `__PR__` → `45`, `__MAIN__` → `48118ae` dans `docs/sessions/cli-lot2-etat.md`.

## Hors périmètre
- Lot 4 (Office, médias, 3D, autres images).

## Portes
ouvertes : — · passées : —

## Double relecture (3.8, tête 4a33075)
Conformité : 0 bloquant, 0 majeur, 3 mineurs (essai sans `convert … .pdf` sur le fichier construit ; test D41 manquant pour `exportPdfFile` ; carte d'impact incomplète : `pdf-overlay-vector.test.ts` marqué « non touché » mais touché, `pdf-node.test.ts`, `fabrique-pdf.test.ts`, `pdfjs-worker.d.ts` absents — tests et types, sans effet de bord), 1 simplification (`hexOf`). Qualité : 0 bloquant, 0 majeur, 3 mineurs (filet de `bin.ts`, `readLibs` dupliqué, `memoryIO` positionnel), 3 simplifications (`openReadTab`, `exportWhole`, `hexOf`). Tout corrigé en T8 (un tour), sauf la carte d'impact (consignée ici).

## Suite complète
- `verifier.sh --e2e` sur 4a33075 : CODE=1, délai de 5 s du 1er test S1 de `pdf.test.ts` sous charge (relecteurs en parallèle) → cause traitée en T8 (chargement partagé en `beforeAll`, aucun délai relevé).
- Sur b0ef245 : CODE=1, vraie régression : garde textuel « mineur C14 » de `canvas2d.test.ts` (ne lisait que `main.ts`, le peintre PDF est passé dans `vectorPainter`). Corrigé par l'orchestrateur (db7f933) : le garde lit `main.ts` et `pdf-overlay-vector.ts`, exige `painter: vectorPainter(doc)`, échoue sur une mutation (vérifié).
- Sur db7f933 : CODE=0, `verifier.sh : e2e OK`, 411 s ; CLI 144 → 185 tests, web 3129 → 3150, `CLI : OK` (92 contrôles).

## Tailles Wasm après
module principal 1 374 215 o (plafond 1 572 864, inchangé) · module formats 2 794 511 o (plafond 3 145 728, inchangé) — identiques à avant.

## Rapport
- Scénarios : S1 lire un PDF, S2 annoter puis exporter, S3 aller-retour et sortie = source, S4 refus sans écriture, S5 `cli-essai.mjs` (page comptée, texte retrouvé, fond présent, stderr vide) : réussis (Vitest au vrai Wasm, essai sur le fichier construit, sorties réelles dans la PR).
- Conditions du merge : double relecture faite, aucun bloquant ouvert · aucune tâche bloquée · suite complète sans régression · aucun test retiré hors cadrage (`exportBlocked` et son test retirés par D42/mineur 7 ; contrôles « code 3 » du PDF passés à `.docx`) · scénarios réussis · CLI vérifiée · point de retour `origin/main` 48118ae · CI : aucune (pas de CI GitHub, brief).
- Hypothèses niveau 1 (cadrage § 4) : H23 à H27, H36 (police OFL à la place de Liberation, à décider par Jérôme).
- Décisions d'architecture : DA11 à DA15 (pdf.js en processus par `globalThis.pdfjsWorker`, `pdfjsBinding`, `pdfJobReply`, `app/pdf-convert.ts`, polices lues dans `pdfjs-dist`).
- Constats d'architecture : aucun ajouté ni fermé ; zones à 3 constats ou plus (proposition d'audit, jamais lancé) : `apps/web/src/platform` 8, `apps/web/src/app` 7, `crates/roomboard-core` 5, `crates/roomboard-formats` 4.
- Graphe : pas de `graphify-out/` dans le dépôt ; `~/.cache/graphes/` non écrit (brief).
- Documentation utilisateur : aucune dans le dépôt. Release : non (brief).
- Lot suivant : lot 4 Office, médias, 3D, autres images (GIF, WebP, BMP, SVG, aussi dans un tableau blanc).

## Notes du coffre à poser

Coffre de la VM en lecture seule (OD81) : quatre écritures à faire depuis le Mac. `NNNN` est à numéroter par le canal.

### 1. Journal — `00_Journal/2026-11-24-roomboard-cli-lot3-clos.md`

```markdown
---
id: 2026-11-24-roomboard-cli-lot3-clos
type: journal
summary: "RoomBoard CLI lot 3 clos (OF8) : lecture d'un PDF en onglet avec fonds pdf-page, écriture d'un PDF annoté (pdf-lib + krilla) depuis un .roomboard, convert vers et depuis le PDF ; pdf.js joué en processus par globalThis.pdfjsWorker, sans canvas ; polices Liberation lues dans pdfjs-dist ; PR #__PR__."
created: 2026-11-24
project: "[[roomboard]]"
tags: [projet/roomboard, chaine/nouvelle-feature, cli, pdf]
evidence: "docs/sessions/cli-lot3-etat.md ; docs/plans/cli-lot3-cadrage.md ; docs/plans/cli-lot3-PLAN.md ; scripts/essais/cli-essai.mjs (dépôt jejeasterix/roomboard)"
---

# RoomBoard — CLI, lot 3 (PDF), clos (OF8)

- Demande de Jérôme (2026-11-23) : « ajoute la construction de la cli complète » ; lot 3 du cadrage de la CLI (§ 7), mené seul par l'ouvrier OF8.
- Livré : `state`, `run`, `import`, `convert` lisent un `.pdf` (un onglet, une page par page du PDF, fond `pdf-page` qui cite le PDF d'origine gardé en asset) ; `export` et `convert` écrivent un `.pdf` annoté (pages d'origine recopiées par pdf-lib, annotation superposée en vectoriel par krilla) ; `FORMAT_LOTS` : `.pdf` couvert dans les deux sens, `LOT_LIVRE = 3`, le code 3 ne sort plus que d'`import` d'un format du lot 4.
- Aucune logique recopiée : `readPdfFile` et `writePdfFile` extraits de `workspace.ts` dans `app/pdf-convert.ts` ; `pdfjsBinding` extrait de `loadPdfjs` ; corps du Worker krilla en `pdfJobReply` ; `vectorPainter` extrait de `main.ts` ; la CLI les appelle tous.
- Licence : les polices Liberation de `pdfjs-dist` sont sous GPL v2 avec exception de police (Red Hat), pas OFL : `THIRD_PARTY_NOTICES.md` corrigé ; la CLI les lit à l'exécution, sans copie. Passage à une police OFL laissé à Jérôme (la page l'utilise aussi).
- Piège : [[NNNN-piege-vite-await-premier-niveau-import-inline]].
- Preuve : `verifier.sh --e2e` OK ; essai `cli-essai.mjs` à 92 contrôles (page comptée, texte retrouvé, fond présent, stderr vide) ; 185 tests Vitest de la CLI au vrai Wasm.
- Tailles inchangées : module principal 1 374 215 o, formats 2 794 511 o.
- Lot restant : lot 4 Office, médias, 3D, autres images (GIF, WebP, BMP, SVG, aussi dans un tableau blanc).
- Décision : [[NNNN-roomboard-cli-lot3-pdfjs-en-processus]].
```

### 2. Décision — `02_Decisions/NNNN-roomboard-cli-lot3-pdfjs-en-processus.md`

```markdown
---
id: NNNN-roomboard-cli-lot3-pdfjs-en-processus
type: decision
summary: "RoomBoard CLI lot 3 : pdf.js tourne dans le processus Node par globalThis.pdfjsWorker (même module de worker que la page, pdfjsBinding partagé), sans canvas ni rendu raster ; fond pdf-page = PDF d'origine + indice de page ; export par writePdfFile + pdfJobReply joué par inlineWorker ; polices Liberation lues dans pdfjs-dist installé, jamais copiées ; prise par l'agent."
created: 2026-11-24
status: actif
project: "[[roomboard]]"
tags: [projet/roomboard, decision/architecture, cli, pdf]
evidence: "docs/plans/cli-lot3-cadrage.md (D32 à D48, DA11 à DA15) ; apps/cli/src/pdf-node.ts ; apps/web/src/app/pdf-convert.ts ; apps/web/src/platform/pdf-load.ts (dépôt jejeasterix/roomboard)"
---

# RoomBoard — CLI lot 3 : pdf.js en processus, sans canvas (prise par l'agent)

- Prolonge [[0281-roomboard-cli-node-modules-wasm-et-web]] et la décision des Workers joués en processus (lot 2) : pdf.js n'a pas de corps de Worker à extraire ; la CLI pose le module `pdfjs-dist/legacy/build/pdf.worker.mjs` sur `globalThis.pdfjsWorker` (voie prévue par pdf.js) et ouvre le document par `pdfjsBinding`, extrait de `loadPdfjs` et appelé aussi par la page.
- Aucun canvas : le fond `pdf-page` garde le PDF d'origine et l'indice de page ; l'import ne lit que les tailles ; l'export recopie les pages par pdf-lib et superpose l'annotation en vectoriel krilla (`pdfJobReply` joué par `inlineWorker`). Une page dont le repli en image serait nécessaire refuse en code 1 (« repli en image indisponible dans la CLI »), sans rien écrire.
- Polices : les quatre `LiberationSans-*.ttf` sont lues à l'exécution dans le `pdfjs-dist` installé (GPL v2 avec exception de police : lues comme données, l'exception couvre les PDF produits), jamais copiées dans `dist/` ni dans le dépôt.
- Contrat : un `.pdf` est une source (onglet sans fichier) et une sortie d'`export`/`convert`, jamais une cible de document (code 2, D23) ; pdf-lib qui refuse ou panique krilla : code 1, aucun fichier ; les trois avertissements de pdf.js au chargement sont filtrés (`quiet.ts`), tout autre passe.
- À revoir : remplacer Liberation par une police OFL (page et CLI) si Jérôme veut écarter toute GPL.
```

### 3. Piège — `04_Pieges/NNNN-piege-vite-await-premier-niveau-import-inline.md`

```markdown
---
id: NNNN-piege-vite-await-premier-niveau-import-inline
type: piege
summary: "Vite/Rollup avec inlineDynamicImports : un await de premier niveau dans le point d'entrée (process.exitCode = await main()) suspend l'évaluation avant les modules des import() inlinés, placés après lui ; au premier import() : « Cannot access 'X' before initialization ». Vitest ne le voit pas. Remède : main().then(...) sans await de premier niveau."
created: 2026-11-24
project: "[[roomboard]]"
tags: [projet/roomboard, piege, vite, node, cli]
evidence: "apps/cli/src/bin.ts (commits 98e3026 et c72947a) ; échecs « Cannot access 'pdf_worker' before initialization » et « Cannot access 'index' before initialization » du fichier construit, rapports T5, T6, T7 de docs/sessions/cli-lot3-etat.md (dépôt jejeasterix/roomboard)"
---

# Vite : await de premier niveau + import() inlinés = TDZ au premier chargement

- Symptôme : le fichier construit de la CLI (`inlineDynamicImports`) plante au premier `.pdf` : `Cannot access 'pdf_worker' before initialization`, puis `'index'` pour pdf-lib. Les tests Vitest (modules non groupés) restent verts.
- Cause : `bin.ts` faisait `process.exitCode = await main(…)`. Rollup place les modules atteints par `import()` après le code d'entrée dans le même fichier ; l'`await` de premier niveau suspend l'évaluation avant eux, et `main` les appelle pendant cette suspension.
- Remède : `void main(…).then((code) => { process.exitCode = code; })`, plus un filet dans l'écouteur `exit` (promesse jamais réglée : message et code 13). Les imports statiques à effet de bord posés en contournement sont retirés.
- Contrôle : un essai sur le fichier construit (`scripts/essais/cli-essai.mjs`), jamais Vitest seul.
```

### 4. Fiche projet — `01_Projets/roomboard.md`, ligne 21, segment à ajouter à la fin

```
 ; CLI lot 3 (OF8 : lecture d'un PDF en onglet avec fonds pdf-page, écriture d'un PDF annoté pdf-lib + krilla, convert vers et depuis le PDF ; pdf.js en processus sans canvas ; polices Liberation GPL v2 avec exception, lues dans pdfjs-dist ; lot 4 Office, médias, 3D, autres images restant) clos (PR #__PR__, `main` __MAIN__) — voir [[2026-11-24-roomboard-cli-lot3-clos]] et [[NNNN-roomboard-cli-lot3-pdfjs-en-processus]]
```
