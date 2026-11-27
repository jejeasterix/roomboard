# État — personnalisation-1a

Statut : clos — fusion locale dans main
Gabarit : chantier (provisoire)
Objectif : Jérôme choisit pour chaque page un mode Page (cadre 16:9 comme PowerPoint) ou Infini, gère ses pages et les calques des objets dans une barre latérale repliable, et navigue de page en page depuis la barre d'outils principale.
Avancement : 22/22 tâches terminées
Étage : 4 — depuis 2026-11-27 12:42
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/personnalisation-1a   Branche : feat/personnalisation-1a   Base : origin/main @ 45484db
Branche principale locale au lancement : 45484db
Cadrage : docs/plans/personnalisation-1a-cadrage.md   Plan(s) : docs/plans/personnalisation-1a-PLAN.md
Mode : ouvrier CLI, cadrage autonome (aucune question ne parvient à Jérôme pendant le tour, brief OG4).
Arrêt ferme : 2026-11-27 14:33 (lancement 08:03 + 6 h 30) ; poussée de sauvegarde à 14:23.

## Référence
Rapide : —  (couverte par la complète)
Complète (origin/main @ 45484db, `scripts/verifier.sh --e2e`) : OK · cargo 1356 tests (« test result », core compté deux fois) · cli 263 · web 3628 · e2e 1204 lignes « ok — » · Wasm principal 1 375 581 o · formats 2 794 511 o
Tailles Wasm à 45484db (brief) : principal 1 375 581 o (plafond 1 572 864) · formats 2 794 511 o (plafond 3 145 728)

## Compteurs
contre-relecture cadrage 1/2 (2 bloquants corrigés) · relecture plan 1/3 (1 bloquant T2 traité : rouges attendus jusqu'à T6/T8) · vagues sans progrès 0/2 · correctifs de fin 0/2

## Tâches
Plan : docs/plans/personnalisation-1a-PLAN.md (table en tête, 14 tâches, 6 vagues).
| id | état | dernier commit vert | preuve rejouée |
|----|------|---------------------|----------------|
| T1 | terminée | 87bb6e9 | core 410 lib ; page_mode/move_page/duplicate_page verts |
| T2 | terminée | e719eb8 | vitest 139 (4 fichiers) |
| T3 | terminée | 1e0382e | vitest 117 (4 fichiers) |
| T4 | terminée | 335af16 | wasm 56 ; fake-core+contrat 467/469 (2 C9 → T7) ; Wasm 1 390 008 o |
| T5 | terminée | 332dcad | vitest 112 |
| T6 | terminée | f0a7ba6 | vitest 130 ; controle-icones OK |
| T8 | terminée | 4676c28 | vitest 430 ; tsc 0 |
| T7 | terminée | 42231b7 | core 415 ; grid_clip 5 ; contrat 393 (vrai module) ; CLI 265 ; CLI : OK ; Wasm 1 391 619 o |
| T9 | terminée | b4da390 | vitest 346 |
| T10 | terminée | ced2d9c | vitest 434 ; tsc 0 |
| T13 | terminée | fbe8b13 | restack 6 ; wasm 57 ; CLI : OK ; Wasm 1 403 655 o |
| T15 (correctif) | terminée | 200a0ab | web complet 3714/3714 ; fmt et clippy propres |
| T14 | terminée | b537512 | vitest 383/385 (2 Toolbar.test → T16) |
| T11 | fusionnée (aides d'essais) | d3fe937 | essais rouges : défaut de placement de l'app → T16 |
| T16 (correctif) | terminée | 0bfae96 | web 3741 ; 13/15 essais |
| T12 | terminée | 29468b0 | essai personnalisation-1a OK (88 contrôles) ; captures |
| T17 | terminée | b7e85cb | web 3746 ; c3, s5b, design-l1/l2, 1a OK |
| T18 (relecture A) | terminée | 5d2ed2e | contrat T18 405 (vrai module) ; engine 133 |
| T19 (relecture B) | terminée | 758ee1e | web 3767 ; essais 1a, l2, c13, s5b, l1 OK |
| T20 (miniature portrait) | terminée | 07cd079 | vitest 208 |
| T21 (essais restants) | terminée | 1e4fce9 | 22/23 essais (c13 → T22) |
| T22 (liste des pages, rangée contextuelle) | terminée | 9d4e179 | web 3772 ; c13, 1a, l2, l1, c10a, s5b OK |

## Terminé quand
toutes les tâches terminées · double relecture sans bloquant · `scripts/verifier.sh --e2e` OK · scénarios réussis · captures 2x avant/après · PR fusionnée par `git merge --no-ff` et poussée

## Cadrage
23 hypothèses (10 de niveau 1) · 25 lignes « Modules à réutiliser ou à étendre » · deux lots : lot 1 (mode, barre latérale Pages, navigation, profils) ~11 tâches ; lot 2 (Restack, onglet Calques) ~2 tâches.
S1 Mode de page au doigt · S2 Barre latérale Pages au doigt · S3 Navigation dans la barre principale · S4 Calques au doigt (lot 2) · S5 Au clavier

## Pièges trouvés
- Prémisse démentie : seule la barre d'outils se déplace et se replie ; aucune position par défaut dans le profil.
- Prémisse démentie : la page actuelle est à hauteur libre (modèle ActivInspire), pas un cadre 16:9.
- Chantier voisin `personnalisation-1b` (OG5) sur toolbar-profiles.ts, actions, icons.ts, App.tsx, rb.css, commands.rs, api.ts, fake-core.ts, ops.ts, cli-essai.mjs, THIRD_PARTY_NOTICES.md : relire avant le rebase.

## Rapport
`scripts/verifier.sh --e2e` sur 417bc58 : code 0 (`verifier.sh : e2e OK`, `verifier.sh : OK`). cargo 1414 · web 3772 · CLI 267 · e2e 1309 lignes `ok —`. Wasm principal 1 403 655 o · formats 2 794 527 o. Scénarios S1 à S5 réussis (essai personnalisation-1a-navigateur.mjs). Captures : docs/design/captures/personnalisation-1a/.
Reste faible : tampon des miniatures dimensionné sur le mode de la page montrée (documents à modes mêlés) ; rangée contextuelle Tableau déborde à droite à 1280 px (déjà avant le chantier).

## Relectures
Double relecture (A cœur/moteur, B interface/essais) : aucun bloquant ; importants corrigés par T18 et T19.
Critique impeccable (dégradée, un seul contexte, lanceur sans droit d'exécution) : miniature portrait → T20.

## Hypothèses à revoir (niveau 1)
- À 1280 px de large, l'îlot d'outils (941 px avec Précédente / numéro / Suivante) passe sous la rangée du haut (règle L2-30) ; essais c3, c10a, c10b, c7b, c6a cliquent désormais sous les îlots.
- Barre latérale repliée au départ (bande verticale à gauche) dans les trois profils fournis.
- Portrait 1920 × 3413 (précédent PF4), pas 1080 × 1920.

## Hors périmètre
- fonds de page et bibliothèque (OG5) · outil frame (plus tard)

## Notes du coffre à poser

Le canal pose les numéros `NNNN`. Dans les notes, `[[NNNN-...]]` renvoie aux notes ci-dessous.

### Chemin : 00_Journal/2026-11-27-roomboard-personnalisation-1a-clos.md

```markdown
---
id: 2026-11-27-roomboard-personnalisation-1a-clos
type: journal
summary: "RoomBoard personnalisation 1a clos (OG4) : mode de page Page ou Infini par page, barre latérale Pages et Calques à la place de la barre du bas, navigation dans la barre d'outils, ancre et repli par défaut dans le profil ; SetPageMode, MovePage, DuplicatePage, AddPage{mode}, Restack en une étape et par la CLI."
created: 2026-11-27
project: "[[roomboard]]"
tags: [projet/roomboard, journal, personnalisation]
evidence: "docs/plans/personnalisation-1a-cadrage.md ; docs/sessions/personnalisation-1a-etat.md ; branche feat/personnalisation-1a"
---

# RoomBoard — personnalisation 1a close (2026-11-27)

- Chantier OG4, cadrage autonome (aucune question n'a pu parvenir à Jérôme), base `main` 45484db.
- Livré : mode de page par page (Page 16:9 paysage ou portrait 1920 × 3413,33, Infini) ; barre latérale flottante Pages et Calques à l'ancre `side-start`, repliée par défaut ; Précédente, numéro et Suivante dans la barre d'outils ; `PagesBar` retirée ; `anchor` et `behavior.pageMode` dans le profil et l'éditeur ; raccourcis de page et d'ordre.
- Commandes du cœur et de la CLI : `SetPageMode`, `MovePage`, `DuplicatePage`, `AddPage{mode}`, `Restack`, une étape chacune.
- Décisions : [[NNNN-roomboard-mode-de-page-par-page]], [[NNNN-roomboard-barre-laterale-pages-calques]], [[NNNN-roomboard-ordre-des-objets-calques-sans-couches]] et [[NNNN-roomboard-ancre-et-repli-par-defaut-dans-le-profil]].
- Preuve : voir le corps de la PR (vérificateur complet, tailles Wasm, netteté § 10, captures 2x dans `docs/design/captures/personnalisation-1a/`).
- Piège évité : le haut de la page ajustée ne compte pas les îlots latéraux, sinon la page descend de 152 à 370 px à 1280 × 900.
- Reste : hypothèses de niveau 1 H1 à H10 à relire avec Jérôme ; masquer et verrouiller ; fonds de page (personnalisation-1b).
```

### Chemin : 02_Decisions/NNNN-roomboard-mode-de-page-par-page.md

```markdown
---
id: NNNN-roomboard-mode-de-page-par-page
type: decision
summary: "RoomBoard : chaque page a un mode facultatif `mode` (absent ou page = cadre 16:9, infinite = plan sans bord) ; portrait = 1920 × 3413,33 ; le mode d'une page neuve vient du profil."
created: 2026-11-27
status: actif
project: "[[roomboard]]"
tags: [projet/roomboard, decision, format]
evidence: "docs/plans/personnalisation-1a-cadrage.md (décisions 3 à 7, H2, H3)"
---

# Mode de page par page

Prise par l'agent (OG4, chantier personnalisation-1a), le cadrage en preuve. Jérôme a demandé « par page », deux modes, le mode d'une page neuve venant du profil.

- Champ facultatif `mode` de la page : absent ou `"page"` = Page, `"infinite"` = Infini, valeur inconnue lue comme Page et gardée. `schema` 1 et `formatVersion` 1 inchangés ; un fichier ancien s'ouvre en Page.
- Orientation portée par `height` : paysage 1080, portrait 3413,33 ; la largeur reste 1920, invariant du cœur (précédent PF4 : page PDF portrait 1920 × 2715).
- Commande `SetPageMode` : une étape, même valeur sans étape ; `AddPage` gagne `mode` ; défaut du profil : `behavior.pageMode`, `landscape`.
- Contenu qui dépasse le cadre en mode Page : reste visible et modifiable sur le pourtour (H2).
- Pourquoi : suit la demande de Jérôme et garde le format lisible par les versions précédentes.
- Repli : revenir au mode unique en ignorant `mode` à la lecture ; aucun fichier n'est réécrit tant que l'utilisateur n'enregistre pas.
```

### Chemin : 02_Decisions/NNNN-roomboard-barre-laterale-pages-calques.md

```markdown
---
id: NNNN-roomboard-barre-laterale-pages-calques
type: decision
summary: "RoomBoard : la barre latérale Pages et Calques (barre de rôle `pages`, ancre side-start, repliée par défaut) remplace la barre des pages du bas ; Précédente, numéro et Suivante passent dans la barre d'outils."
created: 2026-11-27
status: actif
project: "[[roomboard]]"
tags: [projet/roomboard, decision, design]
evidence: "docs/plans/personnalisation-1a-cadrage.md (décisions 19, 22 à 26, H1, H6, H7, H10)"
---

# Barre latérale Pages et Calques

Prise par l'agent (OG4), le cadrage en preuve. Jérôme a écrit ne pas être sûr qu'une barre de gestion des pages soit nécessaire, et a demandé la navigation dans la barre principale.

- La barre de rôle `pages` du profil devient la barre latérale : même `data-toolbar="pages"`, ancre `side-start`, `collapsed: true` dans les trois profils fournis ; repliée, c'est une bande verticale (poignée, onglets, Déplier).
- `PagesBar.tsx` est retirée. Groupe `pages` dans la barre `tools` : `page-prev`, `page-number` (ouvre la barre latérale), `page-next` ; Suivante sur la dernière page ajoute une page (mode du profil).
- Un profil enregistré avant ce lot est repris en mémoire à la lecture, sans écriture.
- Pourquoi : la scène reste entière en classe ; aucune structure neuve dans le profil.
- Repli : `collapsed: false` dans le profil ou l'éditeur ; remettre une barre de rôle `pages` en bande basse (rendue flottante, H10).
```

### Chemin : 02_Decisions/NNNN-roomboard-ordre-des-objets-calques-sans-couches.md

```markdown
---
id: NNNN-roomboard-ordre-des-objets-calques-sans-couches
type: decision
summary: "RoomBoard : l'ordre des objets est l'ordre du tableau des éléments, affiché en calques façon Photoshop sans couches ; Restack le modifie en une étape ; masquer et verrouiller reportés."
created: 2026-11-27
status: actif
project: "[[roomboard]]"
tags: [projet/roomboard, decision, moteur]
evidence: "docs/plans/personnalisation-1a-cadrage.md (décisions 16 à 18, H8, H9, H14)"
---

# Ordre des objets : calques sans couches

Prise par l'agent (OG4), le cadrage en preuve. Jérôme : « Si tu as déjà mis en place le système de couche, conserve-le et affiche-le ici ».

- L'ordre de `elements` est déjà l'empilement (`document.rs`) ; aucun système de couches n'existe, aucun n'est ajouté.
- Onglet Calques : une ligne par objet ou par groupe extérieur, premier plan en haut ; lignes fixes « Grille » et « Fond de la page ».
- `Restack { ids, to }` : bloc d'une même page, ordre relatif gardé, ids gardés, une étape ; Premier plan et Arrière-plan dans la rangée Sélection ; Ctrl+Maj+haut et bas, Ctrl+haut et bas.
- Masquer et verrouiller reportés : chacun touche au moins six chemins (rendus, collision, exports, pot, gomme, sélection).
- Repli : un champ de couche facultatif pourra s'ajouter plus tard sans changer l'ordre des éléments.
```

### Chemin : 02_Decisions/NNNN-roomboard-ancre-et-repli-par-defaut-dans-le-profil.md

```markdown
---
id: NNNN-roomboard-ancre-et-repli-par-defaut-dans-le-profil
type: decision
summary: "RoomBoard : une barre flottante porte dans le profil une ancre facultative `anchor` et un repli de départ ; le geste de déplacement reste un réglage de l'appareil ; amende 0301 sans la renverser."
created: 2026-11-27
status: actif
project: "[[roomboard]]"
tags: [projet/roomboard, decision, design]
evidence: "docs/plans/personnalisation-1a-cadrage.md (décisions 20, 21, 34, H5, H12)"
---

# Position et repli par défaut des barres dans le profil

Prise par l'agent (OG4), le cadrage en preuve. Jérôme : la position par défaut doit se régler dans la configuration et s'enregistrer dans le profil. Amende [[0301-roomboard-position-ilot-sur-appareil]] (hypothèse H5 de niveau 1, à revoir).

- Champ facultatif `anchor` (`top-start`, `top-center`, `top-end`, `bottom-start`, `bottom-center`, `side-start`, `side-end`) ; absent : ancre du rôle. `collapsed` existant = repli de départ. Les deux se règlent dans l'éditeur de profils.
- Glisser ou replier à la main reste un réglage de l'appareil (0301) ; « Début » ou double appui sur la poignée revient à l'ancre du profil.
- `PROFILE_MINOR` inchangé : champs facultatifs, clés inconnues gardées.
- Repli : si Jérôme veut que le geste écrive le profil, écrire `anchor` au lâcher dans une copie du profil.
```

### Segment à ajouter à la ligne 21 de 01_Projets/roomboard.md

À ajouter à la fin de la ligne 21, après le segment du design L5 (`... — voir [[2026-11-26-roomboard-design-l5-clos]] et [[0303-icone-roomboard-tableau-plein]]`) :

```markdown
 ; personnalisation 1a (mode de page Page ou Infini par page, barre latérale Pages et Calques à la place de la barre du bas, navigation dans la barre d'outils, ancre et repli par défaut dans le profil, SetPageMode MovePage DuplicatePage AddPage{mode} Restack en une étape et par la CLI) clos (PR #NN, `main` XXXXXXX) — voir [[2026-11-27-roomboard-personnalisation-1a-clos]], [[NNNN-roomboard-mode-de-page-par-page]], [[NNNN-roomboard-barre-laterale-pages-calques]], [[NNNN-roomboard-ordre-des-objets-calques-sans-couches]] et [[NNNN-roomboard-ancre-et-repli-par-defaut-dans-le-profil]]
```
