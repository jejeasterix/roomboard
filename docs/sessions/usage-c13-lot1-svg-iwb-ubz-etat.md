# État — usage-c13-lot1-svg-iwb-ubz

Statut : en cours
Gabarit : chantier (12 tâches, confirmé au plan)
Objectif : Un `.iwb` (IWB/CFF, en ZIP ou en SVG brut) et un `.ubz` (OpenBoard) déposés ou ouverts deviennent des pages RoomBoard avec la liste d'avertissements de ce qui n'est pas lu (niveau A), par un lecteur SVG commun aux formats de tableaux, et « Enregistrer une copie au format » exporte en `.iwb` et en `.ubz` (niveau E).
Avancement : 10/14 tâches terminées
Étage : 3 — depuis 2026-11-21 15:18
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz   Branche : feat/usage-c13-lot1-svg-iwb-ubz   Base : origin/main @ afc2d8b
Branche principale locale au lancement : afc2d8b
Cadrage : docs/plans/usage-c13-lot1-svg-iwb-ubz-cadrage.md   Plan(s) : docs/plans/usage-c13-lot1-svg-iwb-ubz-PLAN.md
Mode : autonome, ouvrier CLI sur la VM (OE24), aucune question à Jérôme pendant le tour (« Continue d'avancer autant que possible suivant notre objectif établi. Nous ferons les tests plus tard sur la version à laquelle tu seras parvenu », 2026-11-19). Arrêt ferme : 2026-11-21 17:49 (pousser avant 17:39). Ouvrier voisin : OE23 sur fix/restes-od94-porte-s6 (zone.rs, fill, c8-pot-zones-navigateur.mjs, data-zone-*, docs/audits/) : ne pas toucher.

## Référence
Avant (origin/main @ afc2d8b, référence finale de C4 sur 6975138) : verifier.sh --e2e OK · web 2608 tests · module Wasm principal 1 368 840 o (plafond 1 572 864) · module formats 3 100 845 o (plafond 3 145 728, marge 44 883 o) · scène 706 px, 662 Pot, 658 Tableau ou Texte. Suite complète de référence rejouée au lancement (afc2d8b, /tmp/c13-ref.out) : « verifier.sh : e2e OK », « verifier.sh : OK », code 0 ; web 2608 tests ; module Wasm 1 368 840 o ; module formats 3 100 845 o ; scène 706 px, Pot 662 px.

## Compteurs
contre-relecture cadrage 1/2 (aucun bloquant ; 4 importants, 11 mineurs intégrés : 7aca94b) · relecture plan 1/3 (lancée en même temps que la vague 1, faute de temps : le plan a pris 57 min ; constats transmis aux tâches T6 à T12) · vagues sans progrès 0/2 · double relecture fin de lot tour 1/2 (qualité Rust : 0 blocker, 4 major ; qualité TS : 0 blocker, 1 major, 4 simplifications ; conformité : 0 blocker, 1 major (= Rust 1), 7 minor ; carnets ~/projets/roomboard-wt/c13-carnet-*.md) → T13, T14

## Tâches
Cadrage : 25 décisions (D1–D24, D8b), 13 hypothèses dont 6 de niveau 1, DA1 (lecteur dans `formats` + `opt-level = "z"` sur ses 22 crates tierces ; mesuré : formats 2 969 841 o avec lecteur et écrivain, principal inchangé ; lecteur dans le principal rejeté, marge 20 644 o < 100 Ko), DA2 (flux plat). Scénarios : S1 iwb ZIP + avertissements · S2 iwb SVG brut + leçon réelle (mesure à part) · S3 ubz déposé puis édité · S4 copies iwb/ubz, aller-retour, .roomboard, scène ≥ 640 · S5 fichiers hostiles. 20 lignes « Modules à réutiliser », 24 `Réutilise :` au plan.
Vagues : V1 = T1, T2, T3, T4, T5 · V2 = T6, T7, T8, T9 (après T1, T2), T10 (après T4, T5) · V3 = T11 (après T7), T12 (après T3–T10). Worktrees : ~/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz--T<n>.
| id | dépend | état | essais | commit vert | preuve rejouée |
|----|--------|------|--------|-------------|----------------|
| T1 opt-level z, tailles | — | terminée | 1/3 | 1d95e13 | roomboard-formats 38+19+4 ok ; formats 3 100 845 → 2 903 814 o, principal 1 371 293 o (= main après PR #28) |
| T2 contrat BoardList | — | terminée | 1/3 | 04d9611 | board:: 7 ok (W1 aller-retour, garde du flux plat) |
| T3 Worker ZIP mode board | — | terminée | 1/3 | 78f68b4 | zip-worker + zip-read 21 tests |
| T4 détection, types, barre | — | terminée | 1/3 | 3d661c2 | -t C13 18 tests ; profile-edit.test.ts mis à jour (8 actions) |
| T5 board-io | — | terminée | 1/3 | ea2aae2 | board-io 13 tests |
| T6 liaison Wasm, Worker | T1, T2 | terminée | 1/3 | fe59b7a | roomboard-formats-wasm 13 ok (3 board_*) ; board-reader 6 tests |
| T7 lecteur SVG | T1, T2 | terminée | 1/3 | 6348c51 | board::read 18 ok (doctype_and_external_entity_are_never_resolved) ; formats + wasm ensemble 78+19+4+13 ok après fusion |
| T8 HTML Qt | T1, T2 | terminée | 1/3 | f3a88f8 | board::qt_html 6 ok |
| T9 écrivain iwb/ubz | T1, T2 | terminée | 1/3 | 94bd4fc | board::write 9 ok (bornes MAX_PAGES/MAX_OBJECTS ajoutées) |
| T10 openBoard, exportBoard | T4, T5 | terminée | 1/3 | 57d5024 | -t C13 17 tests (borne 100 000 objets par fichier) ; suite web 2671 rapportée |
| T11 fidélité exemples | T1, T7 | en cours | 1/3 | | |
| T12 câblage, essai, capture | T3–T10 | en cours | 1/3 | | |
| T13 correctifs Rust de fin de lot (4 major qualité + major conformité 1, D14, mineurs) | T1–T10 | en cours | 1/3 | | |
| T14 correctifs TS de fin de lot (major budget d'objets, 4 simplifications, mineurs, conformité 2 3 5) | T1–T10 | en cours | 1/3 | | |

## Fidélité sur les exemples (hors dépôt)
(à venir)

## Terminé quand
toutes les tâches terminées (aucune bloquée) · double relecture sans bloquant · `scripts/verifier.sh --e2e` OK sans régression · geste Playwright C13 du brief réussi (iwb ZIP, iwb SVG brut, ubz, édition, copies .iwb et .ubz rouvertes, .roomboard rouvert) · tests de sécurité (script SVG, entité externe, chemin ZIP `../`, bornes U26) · capture d'une leçon `.iwb` importée dans `docs/essais/` · tailles des deux modules Wasm sous plafond, notées avant et après · scène ≥ 640 px · PR mergée par fusion locale `--no-ff` et `git push` sans force

## Pièges trouvés
- `CARGO_TARGET_DIR` partagé entre worktrees du même dépôt : cargo y sert le binaire de test d'un autre worktree (T6 : 0 symbole mesuré, T9 : 0 test exécuté, T8 : 18 échecs de read.rs venus de T7). Corrigé à 15:33 : une cible par tâche, preuves rejouées.
- Liaisons Wasm copiées d'un worktree d'avant PR #28 : `element_ids_of_kind` absent, 7 tests et `tsc` rouges hors périmètre ; à reconstruire dans chaque worktree.
- Prémisses démenties (cadrage) : aucune action « Enregistrer une copie au format » n'existait ; `~/telechargements-roomboard/ubz/` est vide ; `7-11 Maths 3.iwb` a 3 pages, pas 4.

## Choix tranchés en cours d'exécution
- S5 contre D9 (constat de conformité 6) : un objet d'épaisseur 0 est lu en épaisseur 1 à la couleur du remplissage (D9, appliquée), pas sauté. S5 se lit ainsi ; l'essai ne le demande pas.
- Borne de 100 000 objets : comptée en feuilles des deux côtés (Rust et page), groupes exclus.
- Relecture du plan lancée en même temps que la vague 1 (le plan a pris 57 min) ; ses 4 constats sont allés dans les prompts de T6, T10, T11.
