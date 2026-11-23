# État — usage-c11b-capture

Statut : en cours
Gabarit : chantier
Objectif : En coque, Jérôme fige son bureau en fond d'annotation et envoie capture et encre au tableau comme une nouvelle page après la page montrée, avec un fond blanc et un avis quand la capture est impossible.
Avancement : 0/11 tâches terminées
Étage : 3 (vague 1) — depuis 2026-11-23 10:55
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/usage-c11b-capture   Branche : feat/usage-c11b-capture   Base : origin/main @ a4accb3
Branche principale locale au lancement : a4accb3
Cadrage : docs/plans/usage-c11b-capture-cadrage.md   Plan(s) : docs/plans/usage-c11b-capture-PLAN.md

## Mandat
Ordre OE78. Jérôme, 2026-11-23 vers 07:00 : « Go c11 ». Mandat du 2026-11-19 : « Continue d'avancer autant que possible suivant notre objectif établi. Nous ferons les tests plus tard sur la version à laquelle tu seras parvenu ». Ouvrier CLI : aucune question ne parvient, choix tranchés seuls et écrits. Lancement 09:34 ; arrêt ferme 14:04 (pousser et mettre l'état à jour à 13:54).

## Référence
Tailles avant : module principal 1 374 398 o (plafond 1 572 864) · formats 2 794 511 o (plafond 3 145 728) (chiffres de l'ordre, remesurés par la référence complète)
Complète (origin/main @ a4accb3, verifier.sh --e2e) : OK du premier coup (« verifier.sh : e2e OK », « verifier.sh : OK »). Tailles mesurées : 1 374 398 o et 2 794 511 o.

## Compteurs
contre-relecture cadrage 0/2 (sautée, choix tranché : le temps borné à 4 h 30 ; la relecture du plan vérifie aussi les décisions du cadrage) · relecture plan 1/3 (aucun bloquant) · vagues sans progrès 0/2 · correctifs de fin 0/2

## Tâches
Table : `docs/plans/usage-c11b-capture-PLAN.md` en tête. Vagues : 1 = T1, T2, T4, T6, T11 · 2 = T3, T5, T7, T8, T9 · 3 = T10.
Correctifs de la relecture du plan, passés dans les briefs : T3 (cacher `main` d'abord ou remontrer `annotate` sur erreur) ; T7 (`send` s'arrête si la collecte échoue, avec test) ; écart déclaré : `setAnnotationBackdrop(image, page?)`.
| id | état | essais | commit | preuve rejouée |
|----|------|--------|--------|----------------|

## Terminé quand
toutes les tâches terminées (aucune bloquée) · double relecture sans bloquant · `scripts/verifier.sh --e2e` OK · scénarios réussis · tailles Wasm sous plafond, inchangés · scène ≥ 640 px mesurée · PR mergée par `git merge --no-ff` + `git push` sans force

## Hypothèses à revoir
HC11b-1 (niveau 1, relevée par la relecture du plan) : les trois issues de Q2 deviennent trois boutons de la barre pendant l'annotation, et non une proposition au retour. À faire valider par Jérôme en tête du rapport.

## Hors périmètre
—

## Portes
ouvertes : — · passées : —

## Cadrage
36 décisions (P1-P36), 17 hypothèses dont 8 de niveau 1, 4 décisions d'architecture, 25 modules à réutiliser ou étendre (2 nouveaux : `app/desktop-page.ts`, `roomboard_shell::capture`). Scénarios : S1 envoi bureau vivant · S2 capture refusée / Wayland · S3 bureau figé · S4 tests automatiques · S5 essais réels en coque (fiche `docs/essais/c11b-coque.md`).
Capture : `xcap` 0.9.10 (Apache-2.0) sous Windows et macOS seulement ; Linux X11 par `x11-dl` (MIT) + `png` (MIT OU Apache-2.0) ; macOS : `objc2-core-graphics` pour l'autorisation.

## Pièges trouvés
- Prémisse démentie : `xcap` sous Linux exige PipeWire (`libspa-sys`, non optionnel) ; essai `cargo check` sur la VM.
- Prémisse démentie : l'encre n'a pas besoin d'un fichier temporaire ; le document d'annotation revient déjà à la fenêtre principale (0272) ; le fragment se fait par `extract` dans la page, seule la capture passe par un fichier accordé.
- Prémisse démentie : sans autorisation macOS, `xcap` rend le fond d'écran seul, sans erreur.
- Prémisse démentie : `fit: "contain"` (U6) : le cœur n'accepte que `"width"` à l'écriture.
- Chantiers sur les mêmes fichiers : aucun (`essai-3d-instantane` ne modifie rien).
