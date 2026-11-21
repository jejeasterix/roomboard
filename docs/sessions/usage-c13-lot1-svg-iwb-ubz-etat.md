# État — usage-c13-lot1-svg-iwb-ubz

Statut : clos — PR #30 fusionnée par fusion locale (main e8e112b)
Gabarit : chantier (12 tâches, confirmé au plan)
Objectif : Un `.iwb` (IWB/CFF, en ZIP ou en SVG brut) et un `.ubz` (OpenBoard) déposés ou ouverts deviennent des pages RoomBoard avec la liste d'avertissements de ce qui n'est pas lu (niveau A), par un lecteur SVG commun aux formats de tableaux, et « Enregistrer une copie au format » exporte en `.iwb` et en `.ubz` (niveau E).
Avancement : 15/15 tâches terminées
Étage : 4 — clos le 2026-11-21 16:40
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/usage-c13-lot1-svg-iwb-ubz   Branche : feat/usage-c13-lot1-svg-iwb-ubz   Base : origin/main @ afc2d8b
Branche principale locale au lancement : afc2d8b
Cadrage : docs/plans/usage-c13-lot1-svg-iwb-ubz-cadrage.md   Plan(s) : docs/plans/usage-c13-lot1-svg-iwb-ubz-PLAN.md
Mode : autonome, ouvrier CLI sur la VM (OE24), aucune question à Jérôme pendant le tour (« Continue d'avancer autant que possible suivant notre objectif établi. Nous ferons les tests plus tard sur la version à laquelle tu seras parvenu », 2026-11-19). Arrêt ferme : 2026-11-21 17:49 (pousser avant 17:39). Ouvrier voisin : OE23 sur fix/restes-od94-porte-s6 (zone.rs, fill, c8-pot-zones-navigateur.mjs, data-zone-*, docs/audits/) : ne pas toucher.

## Référence
Avant (origin/main @ afc2d8b, référence finale de C4 sur 6975138) : verifier.sh --e2e OK · web 2608 tests · module Wasm principal 1 368 840 o (plafond 1 572 864) · module formats 3 100 845 o (plafond 3 145 728, marge 44 883 o) · scène 706 px, 662 Pot, 658 Tableau ou Texte. Suite complète de référence rejouée au lancement (afc2d8b, /tmp/c13-ref.out) : « verifier.sh : e2e OK », « verifier.sh : OK », code 0 ; web 2608 tests ; module Wasm 1 368 840 o ; module formats 3 100 845 o ; scène 706 px, Pot 662 px.

## Compteurs
contre-relecture cadrage 1/2 (aucun bloquant ; 4 importants, 11 mineurs intégrés : 7aca94b) · relecture plan 1/3 (lancée en même temps que la vague 1, faute de temps : le plan a pris 57 min ; constats transmis aux tâches T6 à T12) · vagues sans progrès 0/2 · double relecture fin de lot tour 1/2 (qualité Rust : 0 blocker, 4 major ; qualité TS : 0 blocker, 1 major, 4 simplifications ; conformité : 0 blocker, 1 major (= Rust 1), 7 minor ; carnets ~/projets/roomboard-wt/c13-carnet-*.md) → T13, T14 ; tour 2/2 (0 blocker, 1 major barre des pages, 6 minor) → T15

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
| T11 fidélité exemples | T1, T7 | terminée | 1/3 | 1056de1 | docs/essais/c13-fidelite-iwb.md, 55 lignes ; 7-11 Maths 3 = 3 pages |
| T12 câblage, essai, capture | T3–T10 | terminée | 1/3 | 80a13ed | verifier.sh --e2e code 0 sur 1814b8b (« C13 tableaux : OK ») ; board_roundtrip 3 |
| T13 correctifs Rust de fin de lot (4 major qualité + major conformité 1, D14, mineurs) | T1–T10 | terminée | 1/3 | d8bcd65 | formats + wasm 87+19+4+13 ok ; formats 3 024 385 o |
| T14 correctifs TS de fin de lot (major budget d'objets, 4 simplifications, mineurs, conformité 2 3 5) | T1–T10 | terminée | 1/3 | 2763d39 | vitest 2685, tsc 0 |
| T15 correctifs du tour 2 (barre des pages, profondeur 256 côté page, frame_height fini, fond de groupe, tailles, essai) | T12–T14 | terminée | 1/3 | 8209f57 | verifier.sh --e2e code 0 sur d213cdc ; liste des pages 276 px ; formats 3 024 532 o |

## Fidélité sur les exemples (hors dépôt)
Tableau complet : `docs/essais/c13-fidelite-iwb.md` (55 fichiers, fichier / forme / pages / objets lus / avertissements). Synthèse : 54 lus, 1 refusé (`rectangle2.iwb`, XML mal formé, attendu) ; 222 pages, 905 objets, 99 avertissements. Leçons : 14-16 Biology 4 p. 20 obj. 6 av. · 7-11 Maths 3 3 p. 46 obj. 2 av. · 7-11 geography 8 p. 78 obj. 19 av. · History 11-14 7 p. 55 obj. 21 av. · Or Gates 11 p. 48 obj. 17 av. L'inventaire comptait une page de trop par leçon (vérifié sur Or Gates : 11 `<svg:page`). Aucun `.ubz` réel (dossier vide).

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
- Fusion d'`origin/main` (PR #29, C16 Office) dans la branche (7e8e124, pas de rebase : branche déjà poussée) : 8 fichiers en conflit, les deux côtés gardés ; `stemOf` de C16 → `stem` de C13 ; vitest 2736, tsc 0.
- HU1-4 (vitesse du réglage z) : tenue sur `.xlsx` (0,6 %), non probante sur le PDF (dispersion 36 %) ; `z` gardé (sans lui, formats 3 222 523 o, au-dessus du plafond).
- Libellés visibles des copies raccourcis en « Copie .iwb… » / « Copie .ubz… » (libellé D17 complet en `title` et `aria-label`) : la barre des pages garde une rangée et une liste de pages de 276 px.
- Attribution : 9 commits de sous-agents portaient `Claude Sonnet 5.5` ; réécrits en local avant toute poussée (T11, T12, T14), sans `--force`.

## Rapport
- Conditions de merge : double relecture faite (2 tours, aucun bloquant ouvert ; le major du tour 2 corrigé par T15) · aucune tâche bloquée · suite complète sans baisse (2738 tests ≥ 2608, scène égale à la référence) · aucun test retiré ni sauté (un test d'import.test.ts réécrit par la consigne : `.iwb` reconnu par extension) · scénarios S1–S5 joués et réussis · CLI non touchée · point de retour : origin/main bea54d7 · aucune CI sur le dépôt.
- Suite complète finale (tête 5848edb = chantier + T15 + origin/main bea54d7, `verifier.sh --e2e`, ~/projets/roomboard-wt/c13-verifier-final.out) : « C16 Office : OK », « C13 tableaux : OK », « verifier.sh : e2e OK », « verifier.sh : OK », code 0 ; web 2738 tests (2608 avant C13, 2685 avec C13 seul) ; module Wasm principal 1 374 141 o (C16 ; 1 371 293 o sans), module formats 3 024 532 o (3 100 845 o avant) ; scène 706 px, 662 Pot, 658 Tableau ou Texte (égal à la référence), 706 px dans l'essai C13 après import, liste des pages 276 px.
- Scénarios (essai `scripts/essais/c13-tableaux-navigateur.mjs` dans `verifier.sh --e2e`) : S1 `.iwb` ZIP, 8 objets, avis « page 1 : 1 vidéo non lue », groupe déplacé d'un bloc, texte éditable ; S2 `.iwb` SVG brut de 3 pages, 2 objets par page ; S3 `.ubz` 4 objets, fond noir, avis « règle non lue », un trait ajouté ; S4 copies `.iwb` et `.ubz` rouvertes (8 objets, groupe tenu, réécriture identique), `.roomboard` rouvert (8 objets), `socle-v1.roomboard` d'avant C13 ouvert, scène ≥ 640 ; S5 script, entité externe et DOCTYPE dits, jamais exécutés (`window.__pwned` absent), zéro requête hors 127.0.0.1 ; `../`, chemins absolus et bornes U26 par tests unitaires (zip-worker, workspace, board::read).
- Capture : `docs/essais/c13-iwb-lecon.png`, leçon `.iwb` fabriquée de 3 pages (« Magic Square », carré 3 × 3), 1280 × 900, barre des pages sur une rangée.
- Hypothèses à revoir, niveau 1 : HU1-1 (`.ubz` sans fichier réel : format d'après le code d'OpenBoard ; niveau R reporté), HU1-2 (licence 1EdTech : phrase « scientific, experimental, and scholarly » non tranchée ; avis dans THIRD_PARTY_NOTICES.md), HU1-3 (polygone rempli → trait fermé), HU1-4 (vitesse z : tenue sur .xlsx, non probante sur PDF), HU1-5 (vidéo, son, Flash des .iwb non importés), HU1-6 (deux actions ; libellés visibles raccourcis). Niveau 2 : HU2-1 à HU2-7 (cadrage).
- Décisions d'architecture (prises par l'agent) : DA1 lecteur dans `formats` sous `opt-level = "z"`, DA2 flux plat dans les deux sens, ZIP en TypeScript (écart à U23).
- Tâches bloquées : aucune. Simplifications appliquées dans T13, T14, T15 ; non appliquées : unifier Look/is_bold/font_px (read.rs, qt_html.rs), curseur commun board.rs/pdf.rs, safeZipPath partagé.
- Constats d'architecture écrits : 3 (apps/web/src/platform 1, crates/roomboard-formats 2). Zones à 3 constats ouverts ou plus : crates/roomboard-core (5), apps/web/src/app (4), apps/web/src/platform (7) → audit d'architecture **proposé**, pas lancé.
- Hors périmètre, restes : lots 2 (`.notebook`, `.olf`) et 3 (`.flipchart`) de C13 ; niveau R du `.ubz` ; essai d'une copie dans OpenBoard et dans un lecteur IWB réels ; vidéo et son des `.iwb` vers C14.
- Release : non due (aucune release ni tag).

## Notes du coffre à poser

### 1. `00_Journal/2026-11-21-roomboard-usage-c13-lot1-tableaux-clos.md`

```markdown
---
id: 2026-11-21-roomboard-usage-c13-lot1-tableaux-clos
type: journal
summary: "RoomBoard usage C13 lot 1 clos : lecteur SVG commun dans le module formats (quick-xml), import .iwb (ZIP ou SVG brut) et .ubz en nouvel onglet avec avis des objets non lus, « Enregistrer une copie au format .iwb / .ubz », réglage opt-level z sur les crates propres à formats ; 54 des 55 exemples .iwb lus ; PR #30."
created: 2026-11-21
project: "[[roomboard]]"
tags: [projet/roomboard, chaine/nouvelle-feature]
evidence: "docs/sessions/usage-c13-lot1-svg-iwb-ubz-etat.md ; docs/essais/c13-fidelite-iwb.md (dépôt jejeasterix/roomboard)"
---

# RoomBoard — usage C13 lot 1 (SVG commun, .iwb, .ubz), clos (OE24)

- Livré : `roomboard_formats::board` (lecteur SVG commun `read_svg`, HTML de Qt d'OpenBoard, écrivain `.iwb` et `.ubz`), liaison Wasm et Worker jetable, mode `board` du Worker ZIP (fflate), `board-io.ts` (flux plat ↔ commandes du cœur), `openBoard` et `exportBoard` ; deux actions de barre « Enregistrer une copie au format .iwb… » et « … .ubz… ».
- Niveaux : `.iwb` A + E, `.ubz` A + E ; R du `.ubz` reporté (aucun `.ubz` réel disponible).
- Sécurité : DOCTYPE et entités jamais résolus, script jamais exécuté, chemins ZIP `..` et absolus refusés, bornes U26 (500 pages avec avis, 100 000 objets par fichier comptés en feuilles), images distantes jamais chargées (zéro requête hors origine dans l'essai).
- Fidélité sur les exemples hors dépôt : 54 fichiers `.iwb` lus sur 55 (222 pages, 905 objets, 99 avertissements) ; `rectangle2.iwb` refusé (XML mal formé, attendu). L'inventaire comptait une page de trop par leçon.
- Tailles (`main` après fusion) : module principal 1 374 141 o (plafond 1 572 864), module formats 3 024 532 o (plafond 3 145 728) ; formats était à 3 100 845 o avant C13.
- Reste : lots 2 (`.notebook`, `.olf`) et 3 (`.flipchart`) de C13 ; niveau R du `.ubz` ; essai d'une copie dans OpenBoard réel.
- Décision : [[NNNN-roomboard-c13-lecteur-svg-formats-opt-level-z]] ; piège : [[cargo-target-dir-partage-entre-worktrees]].
```

### 2. `02_Decisions/NNNN-roomboard-c13-lecteur-svg-formats-opt-level-z.md`

```markdown
---
id: NNNN-roomboard-c13-lecteur-svg-formats-opt-level-z
type: decision
summary: "RoomBoard C13 : le lecteur SVG commun des tableaux blancs vit dans le module Wasm formats (quick-xml déjà au lock), qui ne tient sous son plafond que grâce à opt-level = \"z\" sur ses 22 crates tierces propres ; le module principal est inchangé à l'octet ; le ZIP reste lu et écrit par le Worker TypeScript (fflate), écart assumé à U23 ; prise par l'agent."
created: 2026-11-21
status: actif
project: "[[roomboard]]"
tags: [projet/roomboard, decision/architecture]
evidence: "docs/plans/usage-c13-lot1-svg-iwb-ubz-cadrage.md (DA1, DA2, D2, D3) ; docs/essais/taille-wasm.md (section C13) ; docs/essais/c13-fidelite-iwb.md (vitesse)"
---

# RoomBoard — lecteur SVG de C13 dans formats, sous opt-level z (prise par l'agent)

- Mesuré sur une copie d'afc2d8b : lecteur dans formats sans réglage = 3 156 635 o (au-dessus de 3 145 728) ; lecteur dans le module principal = 1 552 220 o (marge 20 644 o, sous les 100 Ko exigés : rejeté) ; réglage seul = 2 903 814 o.
- Choix : `[profile.release.package.<crate>] opt-level = "z"` sur les 22 crates tierces que seul formats utilise (`krilla`, `calamine`, `quick-xml`…) ; un profil par paquet ne touche pas le module principal, compilé par un `cargo build -p` séparé.
- Coût : lecture `.xlsx` 30 000 × 10 sans écart mesurable (0,6 %) ; export PDF de 500 pages non probant (dispersion 36 %). Seuil accepté : 15 % (HU1-4), à remesurer dans la coque.
- Écarté : lecteur en TypeScript (contraire à U23/U36, et le lot 3 `.flipchart` aura besoin de Rust) ; troisième module Wasm (aucun plafond écrit).
- Marge restante de formats : 121 196 o, gardée pour les lots 2 et 3.
```

### 3. `04_Pieges/cargo-target-dir-partage-entre-worktrees.md`

```markdown
---
id: cargo-target-dir-partage-entre-worktrees
type: piege
summary: "Un CARGO_TARGET_DIR partagé entre plusieurs worktrees du même dépôt fait servir à l'un les binaires de test et les .wasm de l'autre (mêmes noms de paquets, empreintes indépendantes du chemin) : 0 test exécuté, symboles absents, échecs d'un autre worktree ; et /tmp de la VM est un tmpfs en RAM sous quota (« Disk quota exceeded »)."
created: 2026-11-21
project: "[[roomboard]]"
tags: [projet/roomboard, piege/cargo, outillage/worktree]
evidence: "docs/sessions/usage-c13-lot1-svg-iwb-ubz-etat.md, section « Pièges trouvés » (dépôt jejeasterix/roomboard) : T6 0 symbole mesuré, T9 0 test exécuté, T8 18 échecs venus de read.rs de T7, puis echo: write error: Disk quota exceeded sur /tmp (tmpfs 16 Go)"
---

# Piège — CARGO_TARGET_DIR partagé entre worktrees

- Symptôme : dans un worktree, `cargo test` passe 0 test, ou échoue sur des tests qu'il n'a pas ; un `.wasm` mesuré n'a pas les symboles ajoutés.
- Cause : les worktrees d'un même dépôt ont les mêmes noms de paquets ; dans une cible commune, leurs artefacts s'écrasent et cargo sert celui du dernier build.
- Correctif : une cible par worktree (`target/` par défaut). Jamais dans `/tmp` sur la VM : c'est un tmpfs de 16 Go en RAM, sous quota utilisateur, plein après quatre cibles.
```

### 4. Fiche `01_Projets/roomboard.md`, ligne 21

Ajouter à la fin de la ligne « Vague 2 en cours : … » :

` ; C13 lot 1 formats de tableaux blancs (lecteur SVG commun, import .iwb et .ubz avec avis, copies .iwb et .ubz ; module formats sous opt-level z) clos (PR #30, fusion locale de la PR #30 dans `main`) — voir [[2026-11-21-roomboard-usage-c13-lot1-tableaux-clos]] et [[NNNN-roomboard-c13-lecteur-svg-formats-opt-level-z]]`
