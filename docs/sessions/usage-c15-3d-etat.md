# État — usage-c15-3d

Statut : clos
Étage : 4 — clos le 2026-11-21 07:00
Gabarit : chantier (provisoire, ≈ 10 tâches)
Objectif : Un fichier glTF / GLB, OBJ + MTL, STL ou PLY déposé devient un élément `model3d` sur la page montrée : tourné à l'orbite quand il est sélectionné, instantané image sinon ; le modèle et ses fichiers liés sont inclus dans le `.roomboard`.
Avancement : 14/14 tâches terminées
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/usage-c15-3d   Branche : feat/usage-c15-3d   Base : origin/main @ 458a90d
Branche principale locale au lancement : 458a90d
Cadrage : docs/plans/usage-c15-3d-cadrage.md   Plan(s) : docs/plans/usage-c15-3d-PLAN.md
Mode : autonome (ouvrier CLI OD90, aucune question à Jérôme : choix tranchés seuls et écrits)

## Référence
Complète (origin/main @ 458a90d, verifier.sh --e2e) : OK · module principal 1 119 330 o · formats 3 099 350 o · scène 706 px

## Compteurs
double relecture 2 relecteurs (conformité, qualité) : 1 bloquant (bombe ZIP), 4 majeurs → T12, T13 ; tour 2 : 0 bloquant, 0 majeur, 3 mineurs (1 corrigé par T14) · contre-relecture cadrage 0/2 (fondue) · relecture plan 1/3 (0 bloquant, 7 majeurs, 1 mineur ; corrections portées par T7 et T10) · vagues sans progrès 0/2

## Tâches
Table complète : docs/plans/usage-c15-3d-PLAN.md (128455f, 11 tâches, 33 lignes Réutilise ; V1 T1-T6, V2 T7-T10, V3 T11).
| id | état | essais | commit vert | preuve rejouée |
|---|---|---|---|---|
| T1 dépendances | terminée | 1/3 | 86bae2c | hors-ligne 26 cas, coque-csp OK, licences OK |
| T2 cœur | terminée | 1/3 | bf1bec2 | cargo 0 FAILED, wasm 1 140 037 o, web 2 276/2 276 avec le vrai module, tsc 0 |
| T3 détection | terminée | 1/3 | 145cffc | dans web 2 260/2 260 |
| T4 pré-passe | terminée | 1/3 | 7a81a78 | dans web 2 260/2 260 |
| T5 orbite | terminée | 1/3 | 2ca58fd | dans web 2 260/2 260 |
| T6 barre | terminée | 1/3 | 93d00aa | dans web 2 260/2 260 |
| fusion V1 (sans T2) | — | — | 4c146fa | web 117 fichiers 2 260/2 260, tsc 0 |
| T7 rendu three | terminée | 1/3 | 767b03e | dans web 2 317/2 317 |
| T8 gestionnaires, ZIP | terminée | 1/3 | 56aed1b | dans web 2 317/2 317 |
| T9 canvas2d | terminée | 1/3 | bba7cce | dans web 2 317/2 317 |
| T10 séances, session | terminée | 1/3 (limite de tours, reprise) | d2851f7 | web 121 fichiers 2 340/2 340, tsc 0 |
| T11 amorce, essai e2e | terminée | 1/3 | 0acdead | C15 3D : OK ; scène 706 px ; capture |
| vérification 1 | — | — | 642c7b3 | verifier.sh --e2e OK, principal 1 140 037 o, formats 3 099 350 o |
| T12 correctifs moteur/session | terminée | 1/3 (limite de tours, reprise) | 9b2852b | src/engine+ui+session 1 019/1 019, essai C15 OK (clic à côté, === 7) |
| T13 correctifs import/ZIP | terminée | 1/3 (limite de tours, reprise) | cc05182 | src/platform 450/450, cargo model3d 4/4, clippy et fmt propres |
| vérification 2 | — | — | 6a28952 | verifier.sh --e2e OK |
| T14 contexte rétabli (tour 2) | terminée | 1/3 | 1c2f033 | 717/717, tsc 0 |
| vérification 3 | — | — | cf142aa | verifier.sh --e2e OK |
| fusion origin/main (C6b) | terminée | — | c48cd15 | cargo 590/0, web 2 425/2 425 (Wasm requis), tsc 0 ; `zipEntries` en double dans commun.mjs dédoublonné |
| vérification 4 (après C6b) | — | — | c48cd15 | verifier.sh --e2e OK (C6b et C15 3D : OK), principal 1 145 044 o, formats 3 100 344 o (C6b ; C15 : 0 o), scène 706 px |

## Choix tranchés seul
- Cadrage : 39 décisions, 13 hypothèses (7 niveau 1), 5 décisions d'architecture, scénarios S1-S5, 16 modules à réutiliser (6 nouveaux) ; commit 05e075f.
- Relecture du plan : PNG 1×1 pour une texture absente (T7) ; Draco seulement « utilisé » retiré d'`extensionsUsed` avant parse (T7) ; T7 attend T2 ; orbite fermée quand la séance 3D est perdue, second glissé gardé, un seul aspect rendu vivant/instantané (T10).
- S5 contre DAX3 : PC4 gardé (« Tourner » actif jusqu'au premier clic, qui révèle l'absence de WebGL) : aucun contexte WebGL créé à l'ouverture (iPad).
- Chemin absolu d'une texture : résolu par son nom de base parmi les fichiers déposés (plus tolérant que X27), sinon absent.
- Texture absente : pas de PNG 1×1 (T7 a montré que GLTFLoader rattrape l'erreur et rend une texture nulle ; un PNG transparent noircirait le modèle) ; la couleur de base reste.
- Double relecture à 2 relecteurs (conformité, qualité) au lieu de 4 (borne de 4 h).
- Contre-relecture du cadrage fondue dans la relecture du plan + cadrage (borne de 4 h, comme C14).
- `main` a reçu C6b (PR 24) pendant le chantier : `origin/main` fusionné dans la branche (pas de rebase, pour éviter un push forcé), conflits résolus en gardant les deux.
- Lancement en ouvrier CLI : pas de question du lancement (mode autonome imposé par le brief OD90).

## Terminé quand
Élément `model3d` du cœur (asset principal et liés, caméra d'orbite, `transform`, une étape d'annulation par orbite validée), géométrie de collision, importeur navigateur (octets magiques puis extension, regroupement des fichiers d'un même dépôt ou d'un ZIP), `three` chargé à la demande, un seul `WebGLRenderer` partagé, instantané image hors sélection, avertissement `.obj` seul et modèle compressé non décodable, contrôle hors ligne vert, aller-retour `.roomboard`, compatibilité avant C15 · double relecture sans bloquant · `scripts/verifier.sh --e2e` OK avec un geste 3D (GLB généré, orbite, instantané, OBJ + MTL, `.obj` seul, enregistrer, rouvrir, assets dans le fichier) · capture d'un objet 3D tourné dans docs/essais/ · scène ≥ 640 px mesurée · plafond Wasm inchangé, `formats` non grossi · PR fusionnée par fusion locale --no-ff et push sans --force — fait : PR 25, main da346d7 ; verifier.sh --e2e OK sur c48cd15

## Captures
`docs/essais/c15-3d-orbite.png` : cube GLB généré (faces bleue et violette) tourné à l'orbite (yaw 30 → 87) sur la page, barre 3D ouverte ; scène 706 px ; rendu réel par SwiftShader.

## Hors périmètre / restes
- Édition du maillage, 3MF, FBX (hors périmètre C15).
- Essai réel en coque (Tauri non construit) : CSP `connect-src blob:` prouvée par lecture et `coque-csp.test.sh` seulement.
- Mineurs non corrigés : pincement à deux doigts dont le premier tombe à côté de l'objet ferme l'orbite (C1) ; une écriture d'orbite est abandonnée si un autre élément change pendant l'encodage de l'instantané (C2, fenêtre de 100 ms) ; un fichier lié écarté car trop gros est aussi dit « absent » (deux messages) ; la pré-passe garde en mémoire tous les modèles d'un dépôt multiple (coque : 20 × 100 Mo possibles) ; `sourceAsset` de C6b absent des relevés d'assets cités (vu par la fusion, hors C15).
- Mineurs, suite (OF4, 2026-11-23, branche `fix/mineurs-c7b-c13-c14-c15`) : quatre corrigés, un fermé sans correctif.
  1. Corrigé (C1) : un appui à côté de l'objet ne décide rien sous `ORBIT_MISS_SLOP_PX` (8 px) ; au relâché ou au-delà du seuil, l'orbite se ferme ; l'outil reçoit le premier point à `begin`, les suivants à `extend` (relecture : un rectangle de sélection d'un seul pas n'est pas perdu) ; un abandon (pincement) garde l'orbite (`engine.test.ts`, trois tests).
  2. Corrigé (C2) : l'écriture d'orbite compare l'état de l'objet, plus la version du document ; un autre élément changé pendant l'instantané ne l'abandonne plus (`board-session.test.ts`). Elle reste abandonnée si elle viderait un rétablissement apparu depuis le relâché (Ctrl+Z, même d'un autre élément ; relecture). L'objet doit être dans l'état de son relâché, ou dans celui de sa dernière écriture faite depuis (contre-relecture : un état intermédiaire remis par Ctrl+Z ne suffit plus).
  3. Corrigé : un fichier lié écarté car trop gros (dépôt ou ZIP) n'est plus dit « absent » ni « sans son .mtl » (`ImportContext.tooBig`, résolu par `gatherFiles` pour les seuls fichiers que le modèle cite : un autre modèle du même ZIP garde ses avis) ; tests `model3d-handlers.test.ts`.
  4. Corrigé : la pré-passe garde au plus `PREPASS_KEEP_BYTES` (128 Mio) de contenus ; au-delà, la boucle relit le modèle (`import.test.ts`).
  5. Fermé sans correctif : déjà couvert. `citedAssets` balaie toute chaîne conforme à toute profondeur (K4) ; le test de contrat « enregistré puis relu : sourceAsset gardé ; cités : original et version courante » (`wasm-core.contract.test.ts`) le prouve sur les deux liaisons.
- `eslint` du dépôt ne tourne pas (configuration à l'ancien format), constat de T13.

## Pièges trouvés
- Prémisses démenties (cadreur) : `formats` n'a pas de lecteur ZIP générique (fflate en JS, Worker jetable) ; les chargeurs three font `fetch(blob:)` → `blob:` dans `connect-src` de la coque ; faux hôte `i.test` de three pour le contrôle hors ligne ; `importFiles` traite chaque fichier seul (pré-passe de regroupement) ; Draco/KTX2 demandent des Workers `blob:` → refusés avec message.
- Fichiers communs probables avec C14 : element.rs, document.rs, query.rs, commands.rs, lib.rs, roomboard-wasm/src/lib.rs, api.ts, wasm-core.ts, fake-core.ts, test de contrat, canvas2d.ts, board-session.ts, App.tsx, verifier.sh, commun.mjs.

- Constat fermé (OE80, 2026-11-23) : « S2 : instantané coloré (229,231,235) », vu une fois par OE77 (PR 38) sur VM chargée. Cause, dans l'essai : (229,231,235) est la carte « Objet 3D » (#e5e7eb), dessinée tant que le PNG de l'instantané n'est pas décodé (`image-cache.ts`, `bitmap` : décodage asynchrone lancé au premier dessin). `data-model3d` passe à « instantane » avant ce décodage, et l'essai lisait le pixel juste après. Reproduit à l'identique en retardant `createImageBitmap` de 800 ms dans la page. Une autre cause donnerait le même pixel : un instantané nul à l'import (`model3d-handlers.ts`, vue indisponible) ; le correctif ne la masque pas (la carte reste, l'attente échoue et le message donne la couleur du pixel). Correctif : `drawnPixel` attend l'état observable « image dessinée » (pixel central hors carte et hors fond, borne de 20 s de `until`) avant les contrôles de S2, S3 et S5 ; la boucle `waitForTimeout(100)` × 40 de la vue tournée disparaît (environ 4 s d'attente, puis contrôle de distance qui passait même sur la carte ; maintenant 20 s, la borne commune de l'essai, et la carte échoue). Produit inchangé : la carte pendant le décodage est voulue (X25). 20 passages sans échec, dont 10 sous charge (8 fils en nice 10, charge 15 à 23).

## Portes
ouvertes : — · passées : —
## Notes du coffre à poser

### 1. `00_Journal/2026-11-21-roomboard-usage-c15-3d-clos.md`

```markdown
---
id: 2026-11-21-roomboard-usage-c15-3d-clos
type: journal
summary: "RoomBoard usage C15 3D clos : élément model3d (glTF/GLB, OBJ + MTL, STL, PLY), orbite par « Tourner », une étape d'annulation par orbite, instantané PNG hors sélection, un seul WebGLRenderer dans un morceau three chargé à la demande, ZIP lus par fflate en Worker ; PR 25 fusionnée."
created: 2026-11-21
project: "[[roomboard]]"
tags: [projet/roomboard, chaine/nouvelle-feature]
evidence: "docs/sessions/usage-c15-3d-etat.md (dépôt jejeasterix/roomboard)"
---

# RoomBoard — usage C15 3D, clos (OD90)

- 14 tâches (11 du plan, 3 de correctifs), 3 vagues ; double relecture : 1 bloquant (bombe ZIP par taille déclarée d'une entrée stockée) et 4 majeurs corrigés.
- Élément `model3d` du cœur (U38) : asset principal, fichiers liés, `yaw`/`pitch`, instantané ; `SetModel3dView` = une étape d'annulation ; un `model3d` mal formé reste un cadre inconnu conservé.
- Import : octets magiques puis extension ; fichiers liés regroupés dans `importFiles` (pré-passe `companions`) ; ZIP par fflate (MIT) en Worker jetable ; `.obj` seul averti ; Draco/meshopt/KTX2 exigés refusés avec message ; 100 Mo par fichier, coque et ZIP compris.
- Rendu : un seul `WebGLRenderer`, morceau `three` de 650 675 o chargé au premier « Tourner » ; garde d'URL (aucune requête réseau) ; CSP de la coque `connect-src blob:` (non construite : essai réel en coque à faire).
- Essai e2e : GLB, OBJ + MTL, glTF + .bin + PNG en ZIP générés dans la page ; orbite rendue par SwiftShader ; passage sans WebGL prouvé ; scène 706 px.
- Tailles : module principal 1 140 037 o (plafond 1 572 864), formats 3 099 350 o (inchangé).
- Décision : [[NNNN-roomboard-model3d-rendu-unique-a-la-demande]].
```

### 2. `02_Decisions/NNNN-roomboard-model3d-rendu-unique-a-la-demande.md`

```markdown
---
id: NNNN-roomboard-model3d-rendu-unique-a-la-demande
type: decision
summary: "RoomBoard : un objet 3D est un élément model3d du cœur (vue et instantané écrits ensemble, une étape par orbite), regroupé avec ses fichiers liés dans importFiles, rendu par un seul WebGLRenderer three chargé à la demande, sans aucune URL sortant de la page ; ZIP lus en JS (fflate), module formats intact ; prise par l'agent."
created: 2026-11-21
status: actif
project: "[[roomboard]]"
tags: [projet/roomboard, decision/architecture]
evidence: "docs/plans/usage-c15-3d-cadrage.md § DAX1 à DAX5, dépôt jejeasterix/roomboard"
---

# RoomBoard — objets 3D : rendu unique à la demande (prise par l'agent)

- DAX1 : `kind: "model3d"` dans le cœur ; `SetModel3dView{yaw, pitch, snapshot}`, une étape d'annulation par orbite validée ; l'ouverture d'un document n'a pas besoin de three.
- DAX2 : les fichiers liés sont regroupés dans `importFiles` (hook `companions`), pas avant : dépôt, « Importer », collage et coque groupent de la même façon.
- DAX3 : un seul `WebGLRenderer` pour l'application, dans un morceau `three` importé au premier besoin ; le moteur ne voit que le port `ModelFrames` ; aucun contexte WebGL avant le premier « Tourner » (iPad).
- DAX4 : `setURLModifier` ne laisse passer que les `blob:` des assets du dépôt ; une texture distante devient un fichier lié absent ; la coque admet `blob:` en `connect-src`.
- DAX5 : ZIP lus par `fflate.unzipSync` dans un Worker jetable, bornes 1 000 entrées et 256 Mio comptés sur `max(taille compressée, taille déclarée)` ; 0 octet dans `formats`.
```

### 3. Fiche `01_Projets/roomboard.md`, ligne « Vague 2 en cours »

Ajouter à la fin de la ligne (après la dernière entrée, C14 ou C6b) : « ; C15 3D (élément model3d, orbite, instantané, three à la demande, ZIP) clos (PR 25, `main` da346d7) — voir [[2026-11-21-roomboard-usage-c15-3d-clos]] et [[NNNN-roomboard-model3d-rendu-unique-a-la-demande]]. »
