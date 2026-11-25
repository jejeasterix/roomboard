# État — design-l3

Statut : en cours
Gabarit : chantier (9 tâches + 2 correctifs de fin)
Objectif : Faire de l'éditeur de profils de RoomBoard un panneau latéral de 600 px à droite, sans voile, aux jetons et icônes du lot L1, pour régler la barre en la voyant changer en direct.
Avancement : 11/11 tâches terminées
Étage : 4 — depuis 2026-11-25 17:54
Lot : —
Tâche : —
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/design-l3   Branche : feat/design-l3   Base : origin/main @ dbb2473
Branche principale locale au lancement : dbb2473
Cadrage : docs/plans/design-l3-cadrage.md   Plan(s) : docs/plans/design-l3-PLAN.md
Relectures : pc

## Référence
Complète (origin/main @ dbb2473, verifier.sh --e2e) : OK — cargo 1356 (8 ignorés) · web 3370 · cli 263 · e2e OK (C1, C11a, C11b, design L1, design L4)
Wasm avant : principal 1 375 581 o (plafond 1 572 864) · formats 2 794 511 o (plafond 3 145 728)

## Compteurs
contre-relecture cadrage 1/2 · relecture plan 1/3 · vagues sans progrès 0/2 · correctifs de fin 2/2

## Tâches
| id | dépend | fichiers (abrégés) | worktree | état | essais | commit vert | preuve rejouée |
|----|--------|--------------------|----------|------|--------|-------------|----------------|
| T1 | — | profile-edit, profile-actions | isolé | terminée | 1/3 | 0bda901 | vague 1 : 9 fichiers 175 tests, tsc 0 |
| T2 | — | icons, notice Lucide | isolé | terminée | 1/3 | 65b5fba | idem ; controle-icones 9 cas OK |
| T3 | — | pointer-gesture, sort-drag, resource-drag | isolé | terminée | 1/3 | e45f875 | idem ; revue immédiate 0 bloquant, 4 mineurs (corrigés en T10) |
| T4 | — | RadioChoices | isolé | terminée | 1/3 | 3ff9a75 | idem |
| T5 | T1-T4 | ProfileEditor, App, rb.css, PointerSwitch | isolé | terminée | 1/3 (limite de tours, travail commité) | cf8e604 | 5 fichiers 188 tests, tsc 0 ; 12 tests réécrits selon L3-26 |
| T6 | T5 | App, ProfileMenu, rb.css | isolé | terminée | 1/3 | 757b3f8 | suite web 3462, tsc 0 |
| T7 | T6 | essai C1, fiches coque | isolé | terminée | 1/3 | a8b3517 | C1 : OK (rejeu) |
| T8 | T6 | essai design-l3, verifier.sh | isolé | terminée | 1/3 | 3d35fe4 | design L3 : OK (rejeu) |
| T9 | T7,T8 | captures, comparaison | partagé | terminée | 1/3 | 7adc527 | verifier.sh --e2e OK sur 4c9ba3b |
| T10 | T8 | correctif 1 + simplification (leaveDraft, COMMAND_ICONS) | isolé | terminée | 1/3 | 3fa9f6f | suite web 3477, design L3 et C1 OK |
| T11 | T10 | correctif 2 du rendu (impeccable) | isolé | terminée | 1/3 | cfaf2be | verifier.sh --e2e OK sur 8113f4c |

## Rapport
- verifier.sh --e2e sur 8113f4c : OK (journal ~/.cache/tmp/of61-ref/verifier-8113f4c.log) — cargo 1356 (8 ignorés, 0 échec) · web 3477 (réf. 3370) · cli 263 (réf. 263) · tous les essais OK dont C1, C11a, C11b, design L1, L3, L4.
- Wasm après : principal 1 375 581 o · formats 2 794 511 o (inchangés).
- Netteté § 10 : 105 icônes calées ; Rectangle et dock-top (choisie, non choisie) 0 pixel intermédiaire ; 0 frange sur 7 éléments ; contre-épreuve 4 pixels intermédiaires.
- Scénarios S1 à S6 réussis (essai design-l3-navigateur.mjs). Captures : docs/essais/design-l3-*.png ; écarts : docs/essais/design-l3-comparaison.md (27 lignes).
- Relectures : contre-relecture du cadrage (5 majeurs corrigés), relecture du plan (0 bloquant), double relecture du lot (conformité, qualité A, qualité B : 0 bloquant), jugement du rendu (impeccable-finish-reviewer : 5 corrections faites, police hors lot), relecture des correctifs (11/12 fermés).
- Constats d'architecture : toolbar-profiles.ts:112 fermé ; 1 ajouté (apps/web/src/ui, rb.css littéraux 600/44/48). Zones à 3 constats ou plus (proposition d'audit, pas de lancement) : apps/web/src/app (8), crates/roomboard-core (5), apps/web/src/platform (5), crates/roomboard-formats (4).
- Release due : non. CLI non touchée.

## Restes (borne de 2 correctifs atteinte)
- majeur : après « Revenir à l'origine » sur un profil fourni sans copie, brouillon modifié, le bouton se désactive avec le focus : le focus tombe sur body (ProfileEditor.tsx:416-420, :623).
- mineur : l'icône de ligne recouvre les 4 derniers px de la poignée (rb.css:281, margin-inline-end -16px) : cible réelle 44 px au lieu de 48.
- mineur : pointer-gesture.test.ts:177-193 ne vérifie pas defaultPrevented après abandon.
- à revoir : police Inter non embarquée (Q6) ; segments fractionnaires à 5 barres ; libellé variable + aria-pressed de l'œil (L3-11).

## Terminé quand
toutes les tâches terminées · double relecture sans bloquant · verifier.sh --e2e OK · S1 de l'usage joué au navigateur (barre à droite, grands boutons) · tri au pointeur testé · recadrages 100 % comparés à la maquette 03, écarts justifiés · contrôle de netteté § 10 · format .rbprofile inchangé · PR fusionnée par merge local --no-ff

## Cadrage
32 décisions (L3-1 à L3-32), 3 décisions d'architecture, 24 hypothèses dont 9 de niveau 1, 20 lignes « Modules à réutiliser » (neufs : sort-drag.ts, RadioChoices.tsx, pointer-gesture.ts extrait de resource-drag.ts).
Scénarios : S1 usage S1 (barre à droite, grands boutons, en direct) · S2 tri souris, doigt, clavier · S3 aperçu abandonné et confirmation · S4 barre d'annotation, Dessin / Souris, catalogue selon annotationBarOf · S5 netteté § 10 et maquette 03 · S6 petit écran et barre flottante.

## Pièges trouvés
- Prémisse démentie : l'éditeur n'a pas de data-item ; ses data-edit* changent de forme (ProfileEditor.test.tsx, App.test.tsx, profile-edit.test.ts, c1-profils-navigateur.mjs), rougeurs attendues listées en L3-26.
- Aperçu en direct (D-DS10) contredit C1 P20 : App.test.tsx:727-738 et c1-profils-navigateur.mjs:140-143 changent sur le fond, voulu.
- Chantiers en cours sur les mêmes fichiers : aucun.

## Hors périmètre
- L2 îlots flottants, L5 icône de l'app.

## Portes
ouvertes : — · passées : —

## Notes du coffre à poser

### 1. Journal

Chemin : `00_Journal/2026-11-25-roomboard-design-l3-clos.md`

```markdown
---
id: 2026-11-25-roomboard-design-l3-clos
type: journal
summary: "RoomBoard design L3 clos (OF61, PR #56) : l'éditeur de profils devient un panneau latéral de 600 px à droite, sans voile, avec aperçu en direct de la barre ; deux cartes de démarrage, cinq vignettes d'emplacement, taille S/M/L segmentée, liste d'outils triable au pointeur avec œil, Importer / Exporter à côté du profil ; netteté § 10 tenue (0 pixel intermédiaire, 0 frange)."
created: 2026-11-25
project: "[[roomboard]]"
tags: [projet/roomboard, journal, design]
evidence: "PR jejeasterix/roomboard#56 ; docs/plans/design-l3-cadrage.md ; docs/sessions/design-l3-etat.md ; docs/essais/design-l3-comparaison.md"
---

# RoomBoard — design L3 clos (2026-11-25)

- Lot L3 du cadrage design (§ 9 ; D-DS10, avec D-DS1, D-DS3, D-DS8), sur les jetons et icônes de L1 et la commande segmentée de L4 ([[2026-11-24-roomboard-design-l4-clos]]).
- Livré : panneau `.rb-sheet` dans la case de la scène ; aperçu en direct (`shown` dans `App`, rien n'est écrit avant Enregistrer) ; confirmation d'abandon d'un brouillon modifié ; tri au pointeur `ui/sort-drag.ts` sur le squelette `ui/pointer-gesture.ts` extrait de `resource-drag.ts` ; choix exclusifs `ui/RadioChoices.tsx` ; catalogue « Ajouter » selon `annotationBarOf` ; dix icônes Lucide. Format `.rbprofile` inchangé.
- Décisions : [[NNNN-roomboard-editeur-profils-apercu-direct]], [[NNNN-roomboard-tri-au-pointeur-squelette-commun]].
- Preuve : `verifier.sh --e2e` OK ; essai `design-l3-navigateur.mjs` (S1 de l'usage, tri souris, doigt, clavier) ; 27 écarts à la maquette 03 justifiés ; Wasm inchangés (1 375 581 o, 2 794 511 o) ; web 3370 → 3477 tests.
- Reste : focus perdu après « Revenir à l'origine » sur un profil fourni sans copie ; cible de poignée réelle 44 px ; police Inter non embarquée (Q6) ; gestes C1-1 et C1-7 à rejouer en coque.
```

### 2. Décision

Chemin : `02_Decisions/NNNN-roomboard-editeur-profils-apercu-direct.md` (le canal pose `NNNN`)

```markdown
---
id: NNNN-roomboard-editeur-profils-apercu-direct
type: decision
summary: "RoomBoard : l'éditeur de profils montre le brouillon en direct sur la barre réelle (signal previewProfile de App, shown = aperçu sinon profil enregistré) mais n'écrit rien avant Enregistrer ; un brouillon qui diffère de l'enregistré demande confirmation avant Fermer, changer de profil, importer ou ouvrir un autre panneau ; l'entrée en annotation abandonne sans question ; pas d'enregistrement automatique ; prise par l'agent (OF61)."
created: 2026-11-25
status: actif
project: "[[roomboard]]"
tags: [projet/roomboard, decision/design, profils]
evidence: "docs/plans/design-l3-cadrage.md (L3-3, L3-32, DA-L3-3, H1, H2) ; apps/web/src/ui/App.tsx ; apps/web/src/profile-edit.ts (leaveDraft, sameProfile) (dépôt jejeasterix/roomboard)"
---

# RoomBoard — aperçu en direct de l'éditeur de profils (prise par l'agent)

- Contexte : D-DS10 (go de Jérôme du 2026-11-24 sur les maquettes : « la barre change derrière lui, en direct ») contre C1 P20 (« rien ne bouge avant Enregistrer », décision d'orchestrateur).
- Choix : D-DS10 l'emporte ; le brouillon reste un brouillon ; `main.ts`, le magasin et l'annotation lisent toujours le profil enregistré.
- Garde : `leaveDraft` (une seule règle pour `App` et l'éditeur) pose `shell.confirm` seulement si `sameProfile` est faux.
- Écart à la maquette : bouton « Enregistrer » gardé, « Enregistré sur cet appareil » seulement sans changement.
- Repli : ne plus appeler `preview` rend le comportement C1.
```

### 3. Décision

Chemin : `02_Decisions/NNNN-roomboard-tri-au-pointeur-squelette-commun.md` (le canal pose `NNNN`)

```markdown
---
id: NNNN-roomboard-tri-au-pointeur-squelette-commun
type: decision
summary: "RoomBoard : tout glisser au pointeur part du squelette ui/pointer-gesture.ts (capture, seuil 4 px, Échap, pointercancel, capture perdue, fonction d'abandon) ; le tri d'une liste (ui/sort-drag.ts) et le glisser de carte (resource-drag.ts) le rappellent sans copie ; un toucher sans glisser dévoile Monter / Descendre (WCAG 2.2 § 2.5.7) ; jamais le glisser HTML5 (U12) ; prise par l'agent (OF61)."
created: 2026-11-25
status: actif
project: "[[roomboard]]"
tags: [projet/roomboard, decision/architecture, pointeur]
evidence: "docs/plans/design-l3-cadrage.md (DA-L3-1, L3-13 à L3-15) ; apps/web/src/ui/pointer-gesture.ts ; apps/web/src/ui/sort-drag.ts (dépôt jejeasterix/roomboard)"
---

# RoomBoard — tri au pointeur sur un squelette commun (prise par l'agent)

- Contexte : U12 interdit le glisser HTML5 (coupé sous Windows en coque, U24) ; `resource-drag.ts` visait la scène et portait seul le squelette du geste.
- Choix : squelette extrait dans `startPointerGesture` (rend une fonction d'abandon, appelée au démontage) ; `startSortDrag` calcule le rang (`slotOf`), décale les lignes, défile le corps à 48 px des bords (pas de 12 px au plus), applique un seul `moveItemTo` au lâcher.
- Accessibilité : flèches au clavier sur la poignée, rang annoncé en `aria-live`, Monter / Descendre au toucher de la poignée.
- Preuve : les 9 tests de `resource-drag` inchangés et verts ; tri à la souris, au doigt (CDP) et au clavier dans l'essai `design-l3`.
- Repli : retirer la poignée au pointeur laisse le clic et le clavier.
```

### 4. Fiche projet

Segment à ajouter à la ligne 21 de `01_Projets/roomboard.md` :

` ; design L3 clos (OF61, PR 56) : éditeur de profils en panneau latéral de 600 px, aperçu en direct, tri au pointeur, Importer / Exporter à côté du profil — voir [[2026-11-25-roomboard-design-l3-clos]]`
