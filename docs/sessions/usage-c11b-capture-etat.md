# État — usage-c11b-capture

Statut : en cours
Gabarit : chantier
Objectif : En coque, Jérôme fige son bureau en fond d'annotation et envoie capture et encre au tableau comme une nouvelle page après la page montrée, avec un fond blanc et un avis quand la capture est impossible.
Avancement : 16/16 tâches terminées
Étage : 4 — depuis 2026-11-23 12:05
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
contre-relecture cadrage 0/2 (sautée, choix tranché : le temps borné à 4 h 30 ; la relecture du plan vérifie aussi les décisions du cadrage) · relecture plan 1/3 (aucun bloquant) · vagues sans progrès 0/2 · correctifs de fin 2/2 (T13+T14, puis T16) · simplification 1 (T15)

## Tâches
Table : `docs/plans/usage-c11b-capture-PLAN.md` en tête. Vagues : 1 = T1, T2, T4, T6, T11 · 2 = T3, T5, T7, T8, T9 · 3 = T10.
Correctifs de la relecture du plan, passés dans les briefs : T3 (cacher `main` d'abord ou remontrer `annotate` sur erreur) ; T7 (`send` s'arrête si la collecte échoue, avec test) ; écart déclaré : `setAnnotationBackdrop(image, page?)`.
| id | état | essais | commit | preuve rejouée |
|----|------|--------|--------|----------------|
| T2 | terminée | 1/3 | fa5026c | `capture` : 17 passed, 1 ignored, `fichier_accorde_lisible_puis_retire` ok ; xcap sous cfg(windows, macos) ; licences OK (rapport) |
| T6 | terminée | 1/3 | 5718208 | `desktop-page.test.ts` 11 passed avec ROOMBOARD_WASM_REQUIRED=1 ; tsc 0 |
| T11 | terminée | 1/3 | 759f034 | 33 cases ; renvoi c11a = 1 |
| T1 | terminée | 1/3 | fdd7fd6 | `annotation` : 22 passed, `placement_reprend_pick_screen_physical_et_split` ok |
| T4 | terminée | 1/3 | eba4a06 | Vitest 3 fichiers 31 passed ; tsc 0 |
| T3 | terminée | 1/3 | 2746188 | `coque_c11b` 5 passed (`capture_hides_then_shows…` ok), `coque_c16` 6 passed ; clippy src-tauri -D warnings `Finished` |
| T5 | terminée | 1/3 | face1ef | `annotation-page.test.ts` 20 passed, nom « opaque : session opaque… » présent ; tsc 0 |
| T7 | terminée | 1/3 | 6a6120e | 89 passed (2 fichiers), noms « capture avant la collecte », « double clic », « collecte sans réponse » présents ; tsc 0 ; revue immédiate : 2 importants, 3 mineurs → T12 |
| T8 | terminée | 1/3 | 30b8901 | `workspace.test.ts` 168 passed, ROOMBOARD_WASM_REQUIRED=1, « compatibilité : socle-v1.roomboard » présent ; `skipIf(real === null)` = patron du dépôt, forcé par la variable |
| T9 | terminée | 1/3 | 9568638 | 5 fichiers 167 passed, « C11b : figer et envoyer » ×3 ; tsc 0 |
| T10 | terminée | 1/3 | 059da0b | essai C11b : code 0, 54 `ok —`, scène 706 px (S1), 658 px (S2), Ctrl+Z retire la page, rouvert : trait et fond sur la page 2 |
| T12 | terminée | 1/3 | 1fb100b | correctifs de revue 1, 2, 3, 5 ; `annotation.test.ts` 46 passed ; tsc 0 ; constat 4 consigné |
| T13 | terminée | 1/3 | ff5c179 | correctifs web du tour 1 (page 0 du fond, setTool après load, avis de fond refusé, warn, App.test, mesures de scène) ; 4 fichiers 286 passed ; essai C11b 57 `ok —` |
| T14 | terminée | 1/3 | 931d2c9 | correctifs Rust du tour 1 (réessai AlreadyExists, sonde macOS avant masquage, `screens_of`/`center_of`, test hide/show strict) ; shell 52/22/19/7/6 passed ; clippy src-tauri `Finished` |
| T15 | terminée | 1/3 | ad26abc | simplification : `IDENTITY_MATRIX` de `core/shapes`, `Placement::default()` ; diff de tests vide |
| T16 | terminée | 1/3 | 9a6b51e | correctifs du tour 2 (réglages d'outil rejoués après `load`, fond refusé retiré, recapture, 100 essais) ; `annotation.test.ts` 58 passed ; `capture` 19 passed |

## Terminé quand
toutes les tâches terminées (aucune bloquée) · double relecture sans bloquant · `scripts/verifier.sh --e2e` OK · scénarios réussis · tailles Wasm sous plafond, inchangés · scène ≥ 640 px mesurée · PR mergée par `git merge --no-ff` + `git push` sans force

## Rapport
- Double relecture : tour 1 (conformité, qualité Rust, qualité web) : 0 bloquant, 3 major, minors ; tour 2 : 11/12 fermés, 1 major nouveau (réglages d'outil après « Figer ») corrigé par T16. Aucun bloquant ouvert.
- `verifier.sh --e2e` : OK sur 7d96eed (verifier-1) et sur f6ecc56 (verifier-2) ; final sur eeeba45 (verifier-3) : `verifier.sh : e2e OK`, `verifier.sh : OK`, code 0 ; module Wasm 1 374 398 o, formats 2 794 511 o ; C11b : OK, scène 706 px.
- Scénarios : S1 à S3 joués par l'essai Playwright (faux hôte) : réussis ; S4 tests automatiques : réussis ; S5 : fiche `docs/essais/c11b-coque.md` (33 cases) pour les séances de Jérôme.
- Simplification appliquée : T15. Constat d'architecture écrit : 1 (`crates/roomboard-shell`, duplication `is_capture_id`). Zones à 3 constats ouverts ou plus (proposition d'audit, jamais lancé) : crates/roomboard-core 5, apps/web/src/app 7, apps/web/src 3, apps/web/src/platform 8, crates/roomboard-formats 4.
- Release : non due (aucune release sans go ; aucun tag).
- Porte de fin : aucune question posée (ordre OE78 : aucune question ne parvient à Jérôme pendant le tour) ; hypothèses listées pour sa relecture.

## Hypothèses à revoir
Niveau 1 (visibles des utilisateurs) : HC11b-1 (trois boutons de barre au lieu d'une proposition au retour), HC11b-2 (« Envoyer » quitte l'annotation), HC11b-3 (l'onglet d'annotation garde son encre après l'envoi), HC11b-4 (« Annotation au démarrage » : envoi dans un nouvel onglet), HC11b-5 (fond figé gardé, réentrée figée), HC11b-6 (repli figé seulement sans compositeur X11), HC11b-7 (macOS : la première capture déclenche l'invite et rend `denied`), HC11b-17 (libellés des avis). Le reste (HC11b-8 à 16) : voir le cadrage, § 4.
HC11b-1 (niveau 1, relevée par la relecture du plan) : les trois issues de Q2 deviennent trois boutons de la barre pendant l'annotation, et non une proposition au retour. À faire valider par Jérôme en tête du rapport.

## Hors périmètre
- Revue T7/T8, constat 4 (mineur, non vérifié) : en vivant sans capture, `sendCapture` recopie le fond de la page de la vue ; atteignable seulement si `annotate` montre une page à fond alors que l'entrée était vivante. Correction : passer « figé » à l'espace de travail (contrat `SendRequest`).
- T12 : quand `replaceAnnotation` rend `false`, le contrôleur ne dit aucun avis lui-même.
- T12 : la réentrée figée (P17) lit la page montrée dans la fenêtre principale, pas forcément celle d'`annotate`.
- `crates/roomboard-shell/tests/coque_c11b.rs` non formaté (T3) : corrigé par 730225f.

## Portes
ouvertes : — · passées : —

## Cadrage
36 décisions (P1-P36), 17 hypothèses dont 8 de niveau 1, 4 décisions d'architecture, 25 modules à réutiliser ou étendre (2 nouveaux : `app/desktop-page.ts`, `roomboard_shell::capture`). Scénarios : S1 envoi bureau vivant · S2 capture refusée / Wayland · S3 bureau figé · S4 tests automatiques · S5 essais réels en coque (fiche `docs/essais/c11b-coque.md`).
Capture : `xcap` 0.9.10 (Apache-2.0) sous Windows et macOS seulement ; Linux X11 par `x11-dl` (MIT) + `png` (MIT OU Apache-2.0) ; macOS : `objc2-core-graphics` pour l'autorisation.

## Pièges trouvés
- `main` locale a bougé pendant le chantier : a4accb3 → 4d11442 (autre session) ; intégrer `origin/main` avant la fusion.
- Prémisse démentie : `xcap` sous Linux exige PipeWire (`libspa-sys`, non optionnel) ; essai `cargo check` sur la VM.
- Prémisse démentie : l'encre n'a pas besoin d'un fichier temporaire ; le document d'annotation revient déjà à la fenêtre principale (0272) ; le fragment se fait par `extract` dans la page, seule la capture passe par un fichier accordé.
- Prémisse démentie : sans autorisation macOS, `xcap` rend le fond d'écran seul, sans erreur.
- Prémisse démentie : `fit: "contain"` (U6) : le cœur n'accepte que `"width"` à l'écriture.
- Chantiers sur les mêmes fichiers : aucun (`essai-3d-instantane` ne modifie rien).
