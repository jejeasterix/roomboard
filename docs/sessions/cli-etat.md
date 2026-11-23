# État — cli

Statut : en cours
Gabarit : courte (lot 1 du cadrage : 4 tâches ; lots 2 à 4 écrits dans le cadrage § lots)
Objectif : RoomBoard a une CLI qui permet à un agent de piloter et de prouver chaque fonction du produit sans interface graphique.
Avancement : 7/7 tâches terminées (lot 1 du cadrage)
Étage : 4 — depuis 2026-11-24 00:05
Lot : —
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/cli   Branche : feat/cli   Base : origin/main @ becdda6
Branche principale locale au lancement : becdda6
Cadrage : docs/plans/cli-cadrage.md   Plan(s) : docs/plans/cli-PLAN.md

## Référence
Rapide : —
Complète (origin/main @ becdda6, `verifier.sh --e2e`) : tout vert sauf l'essai C8 pot zones (« data-zone-ms inchangé ») à la première passe ; rejoué une fois seul : OK, ainsi que C4, C13, C11a, C11b → C8 est instable sur délai, pas une régression. Web 3081 tests verts.

## Tailles Wasm avant
module principal 1 374 398 o (plafond 1 572 864) · module formats 2 794 511 o (plafond 3 145 728) — confirmés par la référence (dist de origin/main)

## Compteurs
contre-relecture cadrage 1/2 · relecture plan 1/3 (aucun bloquant) · vagues sans progrès 0/2 · correctifs de fin 2/2

## Tâches
Toutes en `partagé` (worktree du chantier, séquentielles) au lieu d'`isolé` : le Wasm y est déjà construit, gain de temps.
| id | dépend | état | essais | dernier commit vert | preuve rejouée |
|----|--------|------|--------|---------------------|----------------|
| T1 | — | terminée | 1/3 | 62b141c | cli 17 tests, `version` schema roomboard-cli/1 |
| T2 | T1 | terminée | 1/3 | fe1d0b8 | cli 43 tests (S1, S2) ; essai binaire new/run undo redo AddPage/state |
| T3 | T2 | terminée | 1/3 | c1a461a | cli 55 tests (S3, S4) ; import xlsx, export .rbitem, .pdf code 3 |
| T4 | T3 | terminée | 1/3 | a4faf60 | `verifier.sh --e2e` CODE=0 sur a4faf60 : CLI : OK, web 3083, Wasm 1374398 / 2794511 |
| T5 | T4 | terminée | 1/3 | 3ad4ed6 | cli 79 tests ; `--help` 0, `new` existant 1, `head -c` sans pile |
| T6 | T5 | terminée | 1/3 | 3213358 | essai 26 `ok —` ; `verifier.sh --e2e` CODE=0 sur 3213358 |
| T7 | T6 | terminée | 1/3 | f0bb761 (fusion de feat/cli--T7, worktree retiré) | cli 84 tests ; `version >/dev/full` code 1 ; essai CLI : OK |
T5 (concepteur-critique) : majeurs qualité (EPIPE, cible de --save, `new` qui écrase, test « non écrit » non discriminant) + mineurs code + simplifications. T6 (implementeur-tdd) : essai S5 renforcé, garde awk, profil § CLI, cadrage DA2.

## Décisions de l'orchestrateur
- Relecture du plan, mineur 1 : `formats` expose un lot par sens (`.rbitem` : écriture lot 1, lecture par `state` lot 1, insertion lot 2).
- Mineur 4 : `target/cli-tests/` nettoyé après les tests.
- Mineur 3 (signatures) : `stateOf(doc, file, opts)`, `loadCore` asynchrone, `Session` large — actés pour le lot 2.
- H9 : « réimporter » au lot 1 = relire le `.rbitem` exporté et rouvrir le `.roomboard` enregistré ; insertion d'un `.rbitem` dans un autre tableau au lot 2.

## Terminé quand
toutes les tâches terminées · `verifier.sh --e2e` OK avec l'essai CLI · tailles Wasm inchangées sous les plafonds · § 7 du profil rempli · PR mergée par fusion locale `--no-ff`

## Rapport
- Scénarios : S1 (créer, dessiner, annuler, enregistrer, relire), S2 (pages, onglets), S3 (png + xlsx ; pdf code 3), S4 (`.rbitem` relu), S5 (essai `verifier.sh`, 26 contrôles) : réussis (tests Vitest au vrai Wasm + `cli-essai.mjs`).
- Double relecture : tour 1, 5 majeurs (EPIPE, cible de `--save`, `new` qui écrase, test « non écrit » faible, S5 affaibli) corrigés en T5/T6 ; tour 2, 2 majeurs (`--save` après `save` renommé, `lineWriter` qui avalait toute erreur) corrigés en T7. Aucun bloquant ouvert. Simplifications du tour 1 et du tour 2 appliquées dans T5 et T7.
- Hypothèses niveau 1 : H1 mesure de texte approchée ; H2 JPEG sans EXIF ; H3 codes de sortie 0/1/2/3 (contrat). Niveau 2 : H4 à H10 (cadrage § 4) ; H9 « réimporter » = relire le `.rbitem` (insertion au lot 2).
- Décisions d'architecture : DA1 à DA6 (cadrage § 5).
- Constats d'architecture : 1 ajouté (`apps/cli`, export `.rbitem` qui recoupe `encodeSelection`, fermé au lot 2) ; C11a de `annotate-start.ts` fermé par D11. Zones à 3 constats ou plus (proposition d'audit, jamais lancé) : `crates/roomboard-core` 5, `apps/web/src/app` 7, `apps/web/src/platform` 8, `crates/roomboard-formats` 4.
- Release : non due (aucune release ni tag demandés).
- Lots suivants (exacts au cadrage § 7) : lot 2 insertion `.rbitem`, `.iwb .ubz .notebook .olf .flipchart .rbpack`, `convert` ; lot 3 PDF lire et écrire ; lot 4 Office, médias, 3D, autres images.
- Prochaine tâche exacte (chantier suivant `cli-lot2`) : DA5 — rendre `createFragmentOps<T>`/`FragmentOps<T>` génériques avec `view(tab: T): FragmentTab` (`apps/web/src/app/fragments.ts:26-56`), adaptateur dans `workspace.ts:348`, puis `encodeIds`.

## Hors périmètre
- `roomboard-prive`

## Portes
ouvertes : — · passées : —

## Notes du coffre à poser

### Note 1
Chemin : `00_Journal/2026-11-24-roomboard-cli-clos.md`

```markdown
---
id: 2026-11-24-roomboard-cli-clos
type: journal
summary: "RoomBoard CLI lot 1 clos (OF1) : CLI Node `apps/cli` (`node apps/cli/dist/roomboard.mjs`) qui charge les deux modules Wasm tels quels et importe les modules TS de la page ; 8 commandes + aide, session JSONL avec annuler/rétablir, état JSON roomboard-cli/1, .roomboard, .xlsx, PNG, JPEG, export .rbitem ; essai dans verifier.sh ; lots 2 à 4 écrits ; PR #NN."
created: 2026-11-24
project: "[[roomboard]]"
tags: [projet/roomboard, chaine/nouvelle-feature, cli]
evidence: "docs/sessions/cli-etat.md ; docs/plans/cli-cadrage.md ; docs/plans/cli-PLAN.md ; scripts/essais/cli-essai.mjs (dépôt jejeasterix/roomboard)"
---

# RoomBoard — CLI, lot 1, clos (OF1)

- Demande de Jérôme (2026-11-23) : « ajoute la construction de la cli complète » ; but précisé par Outillage : un agent pilote et prouve chaque fonction de RoomBoard sans interface graphique.
- Livré : paquet `@roomboard/cli` (`apps/cli`), build `tsc --noEmit && vite build --ssr` en un fichier `dist/roomboard.mjs` ; commandes `version`, `formats`, `new [--replace]`, `state`, `run`, `apply`, `import`, `export`, `help` ; session JSONL (`run --ops <fichier|->`) avec `undo`, `redo`, onglets `t1`…, références `$n`, `$page:i`, `$tab:i`, `$$` ; état `roomboard-cli/1` (vues du cœur sans transformation) ; erreurs JSON sur stderr, codes 0 succès, 1 refus, 2 usage, 3 format d'un lot suivant.
- Formats du lot 1 : `.roomboard` (lire, écrire), `.rbitem` (écrire, relire par `state`), `.xlsx`/`.xlsm` (lire), PNG et JPEG (lire). Les autres sortent en code 3 avec leur lot (table `FORMAT_LOTS`, testée contre `IMPORT_EXTENSIONS` et `OFFICE_EXTENSIONS`).
- Aucune logique recopiée : import par `createImporter` et une cible sans écran, conteneur par `createContainerIO`, onglets par `createTabs` ; `measureOrFallback` extrait dans `text-layout.ts` (ferme le constat C11a de `annotate-start.ts`).
- Preuve : `verifier.sh --e2e` OK, essai `cli-essai.mjs` (26 contrôles : session texte, trait, forme, deux pages, annuler, rétablir, import png et xlsx, état de fin de session égal au fichier rouvert ids compris, export et relecture `.rbitem`, codes 1, 2, 3) ; 84 tests Vitest de la CLI au vrai Wasm, 3083 tests web.
- Tailles inchangées : module principal 1 374 398 o, formats 2 794 511 o.
- Lots restants (cadrage § 7) : lot 2 insertion `.rbitem`, tableaux blancs `.iwb .ubz .notebook .olf .flipchart`, `.rbpack`, `convert` ; lot 3 PDF lire et écrire ; lot 4 Office, médias, 3D, autres images.
- Hypothèses de niveau 1 : mesure de texte approchée (hauteur des lignes d'un tableau importé), JPEG sans orientation EXIF, contrat des codes de sortie.
- Décision : [[NNNN-roomboard-cli-node-modules-wasm-et-web]].
```

### Note 2
Chemin : `02_Decisions/NNNN-roomboard-cli-node-modules-wasm-et-web.md`

```markdown
---
id: NNNN-roomboard-cli-node-modules-wasm-et-web
type: decision
summary: "RoomBoard : la CLI est un paquet Node `apps/cli` qui charge les deux modules Wasm tels quels et importe les modules TypeScript de la page, sans crate Rust neuve ; annuler/rétablir vivent dans une session JSONL, jamais dans le fichier ; état JSON roomboard-cli/1 ; codes 0/1/2/3 ; chaque chantier tient la CLI à jour ; prise par l'agent."
created: 2026-11-24
status: actif
project: "[[roomboard]]"
tags: [projet/roomboard, decision/architecture, cli]
evidence: "docs/plans/cli-cadrage.md (D1, D5, D9, D15, DA1 à DA6) ; apps/cli/src ; .claude/chantier.md § CLI (dépôt jejeasterix/roomboard)"
---

# RoomBoard — CLI Node sur les modules Wasm et le code de la page (prise par l'agent)

- Node plutôt que Rust : ZIP, `.olf`, conteneur `.flipchart`, passage des tableaux blancs vers le document, magasin d'images et assemblage PDF vivent en TypeScript ([[0266-roomboard-c13-lecteur-svg-formats-opt-level-z]], [[0268-roomboard-c13-notebook-formats-olf-typescript]], [[0269-roomboard-c13-flipchart-conteneur-ts-objets-rust]]) ; une crate Rust devrait les recopier. La CLI charge les `.wasm` par `initSync` (import dynamique de la colle) : aucun octet ajouté aux modules.
- Annuler et rétablir : l'historique Yrs reste en mémoire ; `run` tient une session JSONL (fichier ou stdin) ; rien n'est ajouté au format `.roomboard`.
- Sortie : JSON sur stdout, état `roomboard-cli/1` (enveloppe fixe, vues du cœur sans transformation ; un champ renommé passe à `/2`) ; erreurs JSON sur stderr ; codes 0 succès, 1 refus, 2 usage, 3 format d'un lot suivant.
- Office passera par un binaire de `roomboard-shell` appelé par la CLI (lot 4).
- Règle des chantiers suivants (profil, § CLI) : toute commande, opération, format ou champ d'état ajouté ou changé met à jour la CLI, `FORMAT_LOTS`, ses tests et `scripts/essais/cli-essai.mjs`.
```

### Note 3
Chemin : `01_Projets/roomboard.md`, ligne 21 (segment à ajouter à la fin de la ligne d'avancement)

```markdown
 ; CLI lot 1 (OF1 : paquet Node `apps/cli` sur les deux modules Wasm et le code de la page ; new, state, run avec annuler/rétablir, apply, import .roomboard .xlsx PNG JPEG, export .rbitem, état JSON roomboard-cli/1 ; essai dans verifier.sh ; lots 2 à 4 au cadrage) clos (PR #NN, `main` SHA) — voir [[2026-11-24-roomboard-cli-clos]] et [[NNNN-roomboard-cli-node-modules-wasm-et-web]]
```
