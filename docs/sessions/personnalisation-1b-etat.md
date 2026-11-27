# État — personnalisation-1b

Statut : clos
Gabarit : chantier
Objectif : Une fenêtre « Fonds » ouverte depuis la barre principale applique à la page un fond choisi dans un pack livré ou dans « Mes fonds », avec une recherche locale en français.
Avancement : 14/14 tâches terminées
Étage : 4 — depuis 2026-11-27 11:50 (fusionné dans main)
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/personnalisation-1b   Branche : feat/personnalisation-1b   Base : origin/main @ 45484db
Branche principale locale au lancement : 45484db
Cadrage : docs/plans/personnalisation-1b-cadrage.md   Plan(s) : docs/plans/personnalisation-1b-PLAN.md
Brief : ~/.cache/tmp/og5-brief/demande.md (hors dépôt)

## Vérification finale
`verifier.sh --e2e` sur 0d04ab1 (origin/main 5d3fd92, 1a, intégré) : `verifier.sh : e2e OK`, `verifier.sh : OK` · web 3894 · CLI 280 · cargo 1433 · Wasm 1 410 638 / 2 794 527 o
`verifier.sh --e2e` sur adfcd1f : `verifier.sh : e2e OK`, `verifier.sh : OK` · web 3750 · CLI 276 · cargo 1375 · Wasm 1 386 456 / 2 794 527 o · aléas VM rejoués : design L2, C8, C10b (filechooser)

## Référence
Complète (`verifier.sh --e2e` sur 45484db) : OK · cargo 1356 (tous `test result`) · web 3628 (178 fichiers) · CLI 263 · e2e 1204 lignes « ok — » · Wasm avant : principal 1 375 581 o, formats 2 794 511 o (brief)

## Compteurs
contre-relecture cadrage 1/2 (aucun bloquant) · relecture plan 1/3 (aucun bloquant) · correctifs de fin 2/2 (tour 1 : 1 bloquant, 2 importants → T13, T14 ; tour 2 : aucun bloquant, S4 et notices corrigés) · vagues sans progrès 0/2 · correctifs de fin 0/2

## Tâches
Table complète : `docs/plans/personnalisation-1b-PLAN.md` (en tête). Vagues : 1 = T1-T6 · 2 = T7-T9 · 3 = T10-T11 · 4 = T12.
| id | dépend | worktree | état | essais | dernier commit vert | preuve rejouée |
|----|--------|----------|------|--------|---------------------|----------------|
| T1 | — | …--T1 | terminée | 2/3 (limite de tours) | ea9c7a2 | core 8 `apply_background_`, wasm 1, contrat 404 ; Wasm 1 386 467 o |
| T2 | — | …--T2 | terminée | 1/3 | b27f45d | catalog 8 |
| T3 | — | …--T3 | terminée | 1/3 | 7b75ebc | search 15 |
| T4 | — | …--T4 | terminée | 2/3 (limite de tours) | 634c207 | sources 7, 48 photos CC0 (mention Co-Authored corrigée) |
| T5 | — | …--T5 | terminée | 1/3 | 372fc2b | 93 web + capabilities_grant_library_folder_only |
| T6 | — | …--T6 | terminée | 1/3 | b833f0b | 85 ; inventaires d'icônes réécrits (écart déclaré) |
| T7 | T2,T4 | — | terminée | 2/3 (limite de tours) | a84027a | pack 8 + sources 7 ; 43 photos, 12 999 388 o |
| T8 | T1,T2,T5 | — | terminée | 1/3 | 8c92090 | 77 |
| T9 | T2,T3,T5,T6 | — | terminée | 1/3 | 429608b | 21 |
| T10 | T5,T6,T8,T9 | — | terminée | 1/3 | 26ab559 | 295 (+ correctif `draggable` de T9) |
| T11 | T1,T2,T3,T7,T8 | — | terminée | 2/3 (limite de tours) | 4fbf1a1 | 21 ; suite CLI 276 |
| T12 | tout | …--T12 | terminée | 1/3 | 75758dd | fonds-navigateur 41 « ok — », `personnalisation 1b : OK` |

| T13 | relecture | …--T13 | terminée | 1/3 | bfe32c8 | 355 ; suite web 3738 |
| T14 | relecture | …--T14 | terminée | 1/3 | 5c6ec18 | core backdrop 18, contrat 408 |

## Terminé quand
toutes les tâches terminées · double relecture sans bloquant · `verifier.sh --e2e` OK · scénarios réussis · captures 2x · PR fusionnée par `git merge --no-ff` et poussée sans `--force`

## Décisions de l'orchestrateur
- T7 : photos trop lourdes à 2560×1440 → repli 1920×1080 (q82→q40), plafond 400 Ko et compte 40-50 inchangés
- T10 : `draggable={false}` de T9 retiré (test existant « aucun glisser HTML5 dans src/ui »), CSS `pointer-events:none; -webkit-user-drag:none` sur la vignette

## Hypothèses à revoir (ajouts de l'exécution)
- H1-10 photos en repli 1920 × 1080 (10 sur 43) ; H1-11 raccourci absent de l'infobulle (Toolbar.tsx, chantier 1a)

## Hors périmètre
- mode de page, barre latérale, barre des pages (OG4, personnalisation-1a)

## Portes
ouvertes : — · passées : —

## Pièges trouvés
- T7 : `crop` ffmpeg sur yuv420p donne une hauteur 0 → `format=rgb24,crop=W:1:0:H-1,scale=1:1:flags=area` (relecture du plan)
- `icons.test.ts` réécrit (inventaires 61→64, 37→38) : écart déclaré à la carte d'impact
- chantier voisin : personnalisation-1a (OG4) dans ~/projets/roomboard-wt/personnalisation-1a
## Notes du coffre à poser

### 1. `00_Journal/2026-11-27-roomboard-personnalisation-1b-clos.md`

```markdown
---
id: 2026-11-27-roomboard-personnalisation-1b-clos
type: journal
summary: "RoomBoard personnalisation 1b close (OG5, PR #62) : bouton « Fonds » et fenêtre (5 sections, recherche française tolérante aux fautes, hors ligne), pack livré de 161 fonds (118 dessinés + 43 photos CC0, 13 Mo), « Mes fonds » (image déposée, cette page, cette grille), commande ApplyBackground (une étape d'annulation), CLI backgrounds."
created: 2026-11-27
project: "[[roomboard]]"
tags: [projet/roomboard, journal, personnalisation]
evidence: "PR jejeasterix/roomboard#62 ; docs/plans/personnalisation-1b-cadrage.md ; docs/sessions/personnalisation-1b-etat.md"
---

# RoomBoard — personnalisation 1b close (2026-11-27)

- Demande de Jérôme, 2026-11-27 : « Comme my viewboard ajoute un bouton affichant une modal avec un ensemble consequent de background possible […] prevoit une section "Mes background" […] avec une barre de recherche inetligente. »
- Livré :
  - bouton « Fonds » (icône Lucide `wallpaper`) dans la barre `outils` des profils fournis, Ctrl+Maj+F ;
  - fenêtre modale : Mes fonds, Couleurs, Lignes et grilles, Modèles de cours, Images ; recherche maison (synonymes, pluriels, fautes), aucune dépendance ;
  - pack livré : 118 fonds dessinés (couleurs, dégradés SVG, grilles du cœur, 12 modèles de cours SVG) + 43 photos CC0 en WebP (33 en 2560 × 1440, 10 en 1920 × 1080), miniatures ≤ 25 Ko, 12 999 388 o ; licences lues photo par photo (`apps/web/backgrounds/SOURCES.json`, `THIRD_PARTY_NOTICES.md`) ;
  - « Mes fonds » : troisième racine de la bibliothèque de l'appareil (IndexedDB ou `Documents/RoomBoard/Fonds`), jamais dans le document ;
  - commande du cœur `ApplyBackground` : couleur, grille et image en une transaction, une étape d'annulation pour toutes les pages ; une page PDF garde sa page ;
  - CLI : `roomboard backgrounds [--search] [--section]`, opération `{"op":"background", …}`.
- Tailles Wasm : principal 1 375 581 → 1 386 456 o ; formats 2 794 511 → 2 794 527 o (plafonds inchangés).
- Reste : raccourci absent de l'infobulle du bouton (`Toolbar.tsx`, chantier voisin 1a) ; rail sans section active pendant une recherche ; même icône pour deux sections.
```

### 2. `02_Decisions/NNNN-roomboard-fond-de-page-applybackground.md`

```markdown
---
id: NNNN-roomboard-fond-de-page-applybackground
type: decision
status: actif
summary: "RoomBoard : un fond de page est l'aspect complet de la page (couleur, grille, image) posé par une seule commande du cœur ApplyBackground, une transaction et une étape d'annulation même pour toutes les pages ; une page PDF garde sa page et ne reçoit que couleur et grille. Prise par l'agent."
created: 2026-11-27
project: "[[roomboard]]"
tags: [projet/roomboard, decision, coeur]
evidence: "PR jejeasterix/roomboard#62 ; docs/plans/personnalisation-1b-cadrage.md (Q1, Q2, Q35) ; crates/roomboard-core/src/page_look.rs"
---

# Fond de page : une commande ApplyBackground

- **Décision (prise par l'agent)** : appliquer un fond remplace la couleur de page, la grille (U31) et l'image (`backdrop`, U6) d'un coup, par `ApplyBackground { pages, color, backdrop, grid }`.
- **Raison** : l'historique ne fusionne jamais deux transactions (`history.rs`) ; trois commandes par page donneraient 3 × N étapes d'annulation.
- **Règle** : une page à fond `pdf-page` garde son fond et ne reçoit que la couleur et la grille (avis à l'utilisateur).
- **Repli** : revenir aux commandes `SetBackdrop` et `SetGrid` si une page doit garder une part de son aspect.
```

### 3. `02_Decisions/NNNN-roomboard-pack-de-fonds-cc0.md`

```markdown
---
id: NNNN-roomboard-pack-de-fonds-cc0
type: decision
status: actif
summary: "RoomBoard : pack de fonds livré en fichiers statiques hors Wasm (apps/web/public/backgrounds, WebP ≤ 400 Ko, repli 1920 × 1080), photos CC0 seulement avec licence lue page par page, fonds dessinés procéduraux (grille du cœur ou SVG), aucun nom de source dans l'interface. Prise par l'agent sur la recommandation suivie par Jérôme."
created: 2026-11-27
project: "[[roomboard]]"
tags: [projet/roomboard, decision, licence]
evidence: "PR jejeasterix/roomboard#62 ; docs/plans/personnalisation-1b-cadrage.md (Q9-Q14, Q33, Q34) ; apps/web/backgrounds/SOURCES.json"
---

# Pack de fonds : CC0, hors Wasm, sans trace de source

- **Cadre (Jérôme, 2026-11-27)** : « Je suis ta recommandation. Je ne veux pas que l'interface trahisse la presence d'un service extérieur » ; pack ≤ 30 Mo, WebP avec miniatures, recherche hors ligne.
- **Forme (prise par l'agent)** : photos et miniatures dans `apps/web/public/backgrounds/` (copiées dans `dist`, servies sous la CSP de la coque), catalogue TypeScript chargé à la demande ; fonds dessinés sans fichier image (grille vectorielle du cœur, SVG calés au pixel).
- **Licences** : CC0 lue sur la page de chaque image (Poly Haven, Wikimedia Commons) ; Unsplash, Pixabay, Pexels exclus ; provenances seulement dans `SOURCES.json` et `THIRD_PARTY_NOTICES.md`.
- **Poids** : 400 Ko par photo au plus ; une photo trop chargée passe en 1920 × 1080 plutôt que d'être écartée.
- **Producteur** : `scripts/fonds/produire-photos.mjs`, joué à la main ; la source limite le débit (429), compter une heure.
```

### 4. `02_Decisions/NNNN-roomboard-page-devenue-fond-et-infini.md`

```markdown
---
id: NNNN-roomboard-page-devenue-fond-et-infini
type: decision
status: actif
summary: "RoomBoard : « faire de cette page un fond » fige le cadre de la page (1920 × 1080) en PNG à l'échelle 2 ; une grille devient un fond vectoriel ; en mode Infini, l'image d'un fond reste fixe à l'origine de la page, sans répétition. Prise par l'agent."
created: 2026-11-27
project: "[[roomboard]]"
tags: [projet/roomboard, decision, personnalisation]
evidence: "PR jejeasterix/roomboard#62 ; docs/plans/personnalisation-1b-cadrage.md (Q20, Q21, Q30)"
---

# Page devenue fond, fond en mode Infini

- **Page → fond (prise par l'agent)** : image PNG 3840 × 2160 du cadre de la page. Raison : un fond reste une image simple, rendue à l'identique partout ; ce qui dépasse le cadre est perdu, un avis le dit.
- **Grille → fond** : la grille du brouillon et la couleur, sans image (vectorielle, nette à tout zoom).
- **Mode Infini (OG4)** : l'image reste ancrée à l'origine, à la largeur de la page, sans répétition (règle du cœur `element.rs`) ; la couleur et la grille couvrent tout le plan.
- **Repli** : un fond répété si les essais en classe le demandent.
```

### 5. Segment à ajouter à la ligne 21 de `01_Projets/roomboard.md`

```markdown
 ; personnalisation 1b (fonds de page : fenêtre « Fonds », pack de 161 fonds dont 43 photos CC0, Mes fonds, ApplyBackground, CLI backgrounds) close (PR #62) — voir [[2026-11-27-roomboard-personnalisation-1b-clos]]
```
