# État — usage-c11a-annotation

Statut : clos
Gabarit : chantier
Objectif : En coque (Windows, macOS, Linux X11), Jérôme annote par-dessus son bureau vivant dans une fenêtre transparente, avec la barre d'outils seule cliquable, une bascule dessin / souris, un démarrage direct en annotation et une zone de dépôt qui insère des pages.
Avancement : 15/15 tâches terminées
Étage : 4 — clos le 2026-11-23 09:05 (PR #37 fusionnée, `main` 12805eb)
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/usage-c11a-annotation   Branche : feat/usage-c11a-annotation   Base : origin/main @ 6c97661
Branche principale locale au lancement : 6c97661
Cadrage : docs/plans/usage-c11a-annotation-cadrage.md   Plan(s) : docs/plans/usage-c11a-annotation-PLAN.md

## Mandat
Jérôme, 2026-11-23 vers 07:00 : « Go c11 ». Mandat du 2026-11-19 : « Continue d'avancer autant que possible suivant notre objectif établi. Nous ferons les tests plus tard sur la version à laquelle tu seras parvenu ». Ouvrier CLI : aucune question ne parvient, choix tranchés seuls et écrits. Arrêt ferme : 2026-11-23 11:34 (pousser et mettre l'état à jour à 11:24).

## Référence
Tailles avant : module principal 1 374 398 o (plafond 1 572 864) · formats 2 794 511 o (plafond 3 145 728)
Complète (origin/main @ 6c97661, verifier.sh --e2e) : vert, sauf C8 pot zones (data-zone-ms inchangé) au premier passage ; rejoué seul : OK (délai sous charge). C4 et C13 rejoués : OK. Tailles mesurées : 1 374 398 o et 2 794 511 o.

## Compteurs
contre-relecture cadrage 1/2 · relecture plan 1/3 · vagues sans progrès 0/2 · correctifs de fin 2/2

## Tâches
Table : `docs/plans/usage-c11a-annotation-PLAN.md` lignes 5-16. Vagues : 1 = T1, T2, T3 · 2 = T4…T8 · 3 = T9, T10.
| id | état | essais | commit | preuve rejouée |
|----|------|--------|--------|----------------|
| T1 | terminée | 1/3 | e116c38 | cargo test annotation : 13 passed, `relance_memes_arguments_et_gdk_x11` |
| T2 | terminée | 1/3 | ea4050a | Vitest 5 fichiers 128 passed, tsc 0 ; `toolbar-host.test.ts` rouge attendu, corrigé par T8 |
| T3 | terminée | 1/3 | e04e49c | Vitest platform+tabs 675 passed ; test `ANNOTATION_NOT_YET` réécrit (prévu au cadrage) |
| T4 | terminée | 1/3 | 45e3a74 | Vitest 2 fichiers 26 passed |
| T5 | terminée | 1/3 | f86e690 | Vitest 8 passed ; `cargo check` src-tauri Finished ; coque-csp OK |
| T6 | terminée | 1/3 | d4096c5 | Vitest 3 fichiers 117 passed ; course de `poll` corrigée (génération) |
| T7 | terminée | 1/3 | 491144b | workspace.test.ts 144 passed |
| T8 | terminée | 1/3 | 5fef5ac | toolbar-host + ui 290 passed ; 2 tests de l'attente C11a remplacés (prévu) |
| T9 | terminée | 1/3 | 482338c | essai C11a : 31 `ok —`, scène 706 px, `S3 : avis « ajouté à la page 1 »` ; c1, c10a, c4, c15 OK |
| T10 | terminée | 1/3 | 2c4795c | workspace.test.ts 151 passed (rejoué), vrai cœur Wasm pour S4 et GC6, mutations rouges vues |
| T11 | terminée | 1/3 | 9b42957 | correctif : relance XWayland hors de `main.rs` (`coque_c16` vert) |
| T12 | terminée | 1/3 | e6e1f77 | correctifs page et app (gomme transparente, arrêt du sondage, file de commandes, générations, Échap, sorties, catch) ; 2985 tests |
| T13 | terminée | 1/3 | 8e624a4 | correctifs natif (`current_binary`, maximisée, ordre position/taille, `core:event:default`, test de relance) ; cargo check + clippy 0 |
| T14 | terminée | 1/3 | 9e1eb33 | correctifs interface (`requires` au catalogue, `aria-pressed`, `remoteView`, essai) ; C11a OK 706 px |
| T15 | terminée | 1/1 | fb34e11 | simplification du lot (messageOf, descriptions) ; diff des tests vide ; 2987 tests |
Intégration après vague 2 : Vitest web 146 fichiers / 2958 tests verts, tsc 0.

Relecture du plan tour 1 (sans bloquant) : corrections portées dans les prompts des tâches (pas de nouvelle passe du planificateur, pour le temps) — T4/T7 littéraux `DroppedFile` complets (`head`, `blob`) ; T6 `poll` annulé après l'`await` + test ; T10 vrai cœur ou écart déclaré + mutation ; T6 symptôme de la gomme sur fond transparent dans la fiche C11a-2 (T5) ; écart `collect/leave/place` déclaré au rapport.
Vague 2 à 5 tâches en parallèle (choix : le jeton borne les suites à 3).

## Terminé quand
toutes les tâches terminées · double relecture sans bloquant · `scripts/verifier.sh --e2e` OK · tailles Wasm sous plafond, inchangés · scène ≥ 640 px mesurée · PR mergée par fusion locale `--no-ff` puis push sans force

## Cadrage
Corrigé après contre-relecture tour 1 (1 bloquant : charge JSON de `emitTo` → base64 ; 7 à corriger ; coupes : pas de machine Rust, sondage du curseur depuis la page). Hypothèses HC11-1…7 (niveau 1). Scénarios : S1 web sans annotation · S2 faux hôte, bascule, aller-retour `.roomboard` · S3 dépôt sur la zone · S4 cargo test + Vitest · S5 en coque (essais de Jérôme).

## Pièges trouvés
- Prémisse démentie : U22 (menu « Insérer ses pages / Ouvrir », on reste en annotation) est amendé par Q2 de Jérôme (2026-11-20) : le dépôt sur la barre quitte l'annotation, un document s'ouvre en nouvel onglet (Q1).
- Charge d'un événement Tauri = JSON : un `Uint8Array` y devient un objet ; le document voyage en base64.
- Chantiers en cours sur les mêmes fichiers : aucun.

## Rapport
Suite complète sur 187857f : `verifier.sh --e2e` code=0 (Vitest 147 fichiers / 2987 tests ; cargo ; essai « C11a annotation : OK ») ; `cargo check` et `cargo clippy -D warnings` de src-tauri : 0. Tailles : 1 374 398 o et 2 794 511 o (inchangées). Scène : 706 px.
Double relecture : tour 1 (4 relecteurs : conformité + qualité natif / app / interface) 0 bloquant, 7 majeurs → T12-T14 ; tour 2 : les 18 constats corrigés, 4 mineurs + 1 simplification → T15 et constats.
Scénarios : S1 (web : entrée absente, startMode sans boîte, scène ≥ 640) réussi · S2 (faux hôte : entrer, bascule dans les deux sens, sortir, onglet, trait gardé) réussi · S3 (dépôt sur la zone : sortie, image sur la page, avis « ajouté à la page 1 », `.roomboard` en nouvel onglet) réussi · S4 (cargo test 17 tests annotation, Vitest vrai cœur : tracer, sortir, enregistrer, rouvrir) réussi · S5 (essais en coque) : à jouer par Jérôme, fiche `docs/essais/c11a-coque.md`.
Hypothèses niveau 1 : HC11-1 retour sans question, onglet gardé · HC11-2 bande de barre non annotable · HC11-3 sortie forcée après 5 s sans l'encre de la séance · HC11-4 en annotation, seule la première barre `tools` · HC11-5 zone « Déposer ici » seulement en annotation · HC11-6 Échap quitte · HC11-7 mode souris par sondage, limite au toucher.
Constats d'architecture : 6 ajoutés à `docs/architecture-constats.md` (apps/web/src 2, apps/web/src/app 2, apps/web/src/platform 1, apps/desktop/src-tauri 1). Zones à 3 constats ouverts ou plus : apps/web/src/app, apps/web/src/platform, crates/roomboard-core, crates/roomboard-formats → audit d'architecture proposé (non lancé).
Release : non due (aucune demandée ; aucun tag).

## Choix tranchés seul
- Q2 de Jérôme (2026-11-20) remplace U22 : le dépôt sur la barre quitte l'annotation, sans menu.
- Aller-retour `.roomboard` en base64 entre fenêtres (le document appartient à la principale).
- Mode souris par sondage depuis la page à 30 ms (pas de fil Rust).
- Gomme partielle sans aperçu en mode transparent (écart à HC11-15).
- Vague 2 à 5 tâches en parallèle ; relecture du plan menée en même temps que la vague 1.

## Hors périmètre
- C11b (bureau figé, capture, « Envoyer au tableau »)
- Onglet d'annotation avec médias liés : liens perdus au retour (`replaceAnnotation` relit sans `docPath`, T12 point 9).
- Essais réels en coque (Windows, macOS, X11, stylet, mesure DAU8) : séances de Jérôme

## Portes
ouvertes : — · passées : —

## Notes du coffre à poser

### Note 1 — journal du chantier clos

Chemin : `00_Journal/2026-11-23-roomboard-usage-c11a-annotation-clos.md`

```markdown
---
id: 2026-11-23-roomboard-usage-c11a-annotation-clos
type: journal
summary: "RoomBoard usage C11a clos : annotation de bureau en coque (fenêtre annotate transparente au premier plan sur l'écran choisi, fenêtre principale réduite à sa barre, bascule dessin / souris par clic à travers, démarrage en annotation, zone de dépôt qui quitte l'annotation) ; document en aller-retour .roomboard base64 entre fenêtres ; Wayland natif refusé avec relance XWayland ; masqué sur web, iPad, Android ; PR #37."
created: 2026-11-23
project: "[[roomboard]]"
tags: [projet/roomboard, chaine/nouvelle-feature]
evidence: "docs/sessions/usage-c11a-annotation-etat.md ; docs/plans/usage-c11a-annotation-cadrage.md ; docs/essais/c11a-coque.md (dépôt jejeasterix/roomboard)"
---

# RoomBoard — usage C11a (annotation de bureau), clos (OE76)

- Livré : `roomboard_shell::annotation` (session Wayland/X11, découpe de l'écran barre / zone d'annotation, choix de l'écran, curseur dans la fenêtre, restauration de la fenêtre principale, relance XWayland) ; commandes Tauri minces `annotation_*` et capacité `annotate.json` (`core:event:default` seul) ; contrôleur `app/annotation.ts`, page `annotate` (rendu transparent, sondage du curseur à 30 ms pour le mode souris), onglet `kind: "annotation"`, barre distante, zone de dépôt, `startMode` « Annotation au démarrage ».
- Choix : la décision Q2 de Jérôme (2026-11-20) remplace U22 : un dépôt sur la barre quitte l'annotation ; image → page + avis « ajouté à la page N » ; document → nouvel onglet.
- Document : il appartient à la fenêtre principale ; il part en `.roomboard` base64 vers `annotate` et revient à la sortie (5 s au plus) ; jamais un trait point par point.
- Preuves sans coque : `verifier.sh --e2e` OK ; essai Playwright C11a (31 contrôles, scène 706 px) ; Vitest avec le vrai cœur Wasm pour l'aller-retour ; `cargo check` et `clippy -D warnings` de `src-tauri`.
- Tailles inchangées : module principal 1 374 398 o, formats 2 794 511 o.
- Reste aux essais en coque (`docs/essais/c11a-coque.md`) : Windows 10/11, macOS 14, X11, Wayland, stylet dans la fenêtre transparente (DAU8), deux écrans d'échelles différentes, fenêtre maximisée, AppImage, gomme partielle sur fond transparent.
- Limites connues : un onglet d'annotation avec médias liés perd ses liens au retour ; un toucher sur un objet en mode souris passe au bureau (HC11-7) ; les commandes de l'app ne sont pas filtrées par capacité (pas de manifeste dans `build.rs`).
- Décisions : [[NNNN-roomboard-c11a-document-aller-retour-roomboard]], [[NNNN-roomboard-c11a-fenetres-coque-decoupe-ecran]], [[NNNN-roomboard-c11a-mode-souris-sondage-page]].
```

### Note 2 — décision

Chemin : `02_Decisions/NNNN-roomboard-c11a-document-aller-retour-roomboard.md`

```markdown
---
id: NNNN-roomboard-c11a-document-aller-retour-roomboard
type: decision
summary: "RoomBoard C11a : le document de l'onglet d'annotation appartient à la fenêtre principale ; il part en .roomboard base64 en un message vers la fenêtre annotate et revient de même à la sortie ; entre les pages ne passent que des commandes de barre et une vue de barre ; prise par l'agent."
created: 2026-11-23
status: actif
project: "[[roomboard]]"
tags: [projet/roomboard, decision/architecture]
evidence: "docs/plans/usage-c11a-annotation-cadrage.md (P4, DA1, DA2) ; apps/web/src/app/annotation.ts ; apps/web/src/platform/annotation-fake.ts (dépôt jejeasterix/roomboard)"
---

# RoomBoard — document d'annotation en aller-retour .roomboard (prise par l'agent)

- Pourquoi : la demande exige que l'encre de l'annotation aille dans le document principal, et la règle d'architecture interdit que l'encre traverse la frontière page ↔ Rust.
- Entrée : `ContainerIO.encode` → base64 → `emitTo("annotate", …)` ; sortie : `{ base64, changed }` ; si `changed`, `replaceAnnotation` remplace la session (même place, même cible d'enregistrement, marquée modifiée).
- Piège évité : la charge d'un événement Tauri est du JSON ; un `Uint8Array` y devient `{"0": …}`. Le faux hôte fait `JSON.parse(JSON.stringify(m))` pour échouer comme la coque.
- Sans réponse sous 5 s : sortie quand même, onglet inchangé, avis.
- Écarté : un document vivant dans `annotate` seule (encre perdue à la fermeture), des traits envoyés un par un.
```

### Note 3 — décision

Chemin : `02_Decisions/NNNN-roomboard-c11a-fenetres-coque-decoupe-ecran.md`

```markdown
---
id: NNNN-roomboard-c11a-fenetres-coque-decoupe-ecran
type: decision
summary: "RoomBoard C11a : deux fenêtres qui ne se chevauchent pas (bande de barre et zone d'annotation découpées dans l'écran choisi), réglées par des commandes Rust minces ; logique pure dans roomboard_shell::annotation ; capacité annotate.json réduite à core:event:default ; Wayland natif non pris en charge, relance XWayland proposée ; prise par l'agent."
created: 2026-11-23
status: actif
project: "[[roomboard]]"
tags: [projet/roomboard, decision/architecture]
evidence: "docs/plans/usage-c11a-annotation-cadrage.md (P10, P12, P16, DA3, DA4) ; crates/roomboard-shell/src/annotation.rs ; apps/desktop/src-tauri/src/main.rs (dépôt jejeasterix/roomboard)"
---

# RoomBoard — fenêtres d'annotation réglées par la coque (prise par l'agent)

- Le clic à travers est tout ou rien par fenêtre : la barre et la zone d'annotation sont deux fenêtres côte à côte, sans ordre d'empilement à tenir.
- La page n'a aucune permission de fenêtre : `annotation_enter` (async, à cause de Windows), `annotation_ignore`, `annotation_cursor`, restauration de la fenêtre principale (position, puis taille, puis maximisation si elle l'était).
- `main.rs` reste mince (test `coque_c16` : aucun `Command::new`) : la relance XWayland passe par `roomboard_shell::annotation::relaunch` et `tauri::process::current_binary` (chemin `$APPIMAGE`).
- Wayland natif : capacité fausse, l'application le dit et propose la relance en `GDK_BACKEND=x11`.
- Durcissement connu : sans manifeste de commandes dans `build.rs`, les commandes de l'app ne sont pas filtrées par capacité.
```

### Note 4 — décision

Chemin : `02_Decisions/NNNN-roomboard-c11a-mode-souris-sondage-page.md`

```markdown
---
id: NNNN-roomboard-c11a-mode-souris-sondage-page
type: decision
summary: "RoomBoard C11a : en mode souris, la page annotate sonde le curseur toutes les 30 ms (commande annotation_cursor) et coupe le clic à travers seulement sur un objet (hitTest du cœur) ; pas de fil Rust ; limite au toucher acceptée (HC11-7) ; prise par l'agent."
created: 2026-11-23
status: actif
project: "[[roomboard]]"
tags: [projet/roomboard, decision/architecture]
evidence: "docs/plans/usage-c11a-annotation-cadrage.md (P9, DA5, HC11-7) ; apps/web/src/app/annotation-page.ts (dépôt jejeasterix/roomboard)"
---

# RoomBoard — mode souris par sondage depuis la page (prise par l'agent)

- Q2 de Jérôme : l'outil Sélection devient le curseur du système, mais les objets restent sélectionnables.
- La page sonde, teste l'objet par `doc.hitTest`, et règle `annotation_ignore` ; un compteur de génération arrête un sondage périmé (sortie, retour au stylo).
- Écarté : un fil Rust qui compare le curseur à des rectangles envoyés par la page (plus lourd, double la logique).
- Limite : le toucher et le stylet sans survol ne déplacent pas le curseur avant le contact ; un toucher sur un objet en mode souris passe au bureau. Repli : mode dessin. À revoir aux essais.
```

### Note 5 — fiche projet

Chemin : `01_Projets/roomboard.md`, ligne 21 : ajouter à la fin de la ligne, après « — voir [[0271-roomboard-wasm-opt-module-formats]] » :

```markdown
 ; C11a annotation de bureau (fenêtre annotate transparente au premier plan, barre seule cliquable, bascule dessin / souris, démarrage en annotation, zone de dépôt ; document en aller-retour .roomboard base64 ; Wayland natif refusé avec relance XWayland) clos (PR #37, `main` 12805eb) — voir [[2026-11-23-roomboard-usage-c11a-annotation-clos]], [[NNNN-roomboard-c11a-document-aller-retour-roomboard]], [[NNNN-roomboard-c11a-fenetres-coque-decoupe-ecran]] et [[NNNN-roomboard-c11a-mode-souris-sondage-page]]
```
