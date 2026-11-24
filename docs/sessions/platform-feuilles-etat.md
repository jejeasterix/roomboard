# État — platform-feuilles

Statut : en cours
Gabarit : courte (provisoire)
Objectif : Les cycles d'import de `apps/web/src/platform/` sont cassés par de petits modules feuilles, sans changer ce que voient la page, la coque et la CLI.
Avancement : 6/6 tâches terminées
Étage : 4 — depuis 2026-11-24 16:40
Lot : —
Tâche : —
Questions à Jérôme : —
Worktree : /home/adminjd/projets/roomboard-wt/platform-feuilles   Branche : refactor/platform-feuilles   Base : origin/main @ 34d4d61
Branche principale locale au lancement : 34d4d61
Cadrage : docs/plans/platform-feuilles-cadrage.md   Plan(s) : docs/plans/platform-feuilles-PLAN.md

## Référence
Complète (origin/main @ 34d4d61, `scripts/verifier.sh --e2e`) : OK au 2e passage — web 3202, CLI 263, e2e OK. 1er passage : `office-node.test.ts` D79 rouge sous charge (dossier mkdtemp pas encore retiré), vert rejoué seul (17/17) puis dans la suite.
Wasm : principal 1 374 215 o (plafond 1 572 864) · formats 2 794 511 o (plafond 3 145 728).

## Compteurs
contre-relecture cadrage 1/2 (aucun bloquant ; 1 important corrigé : feuille de messages dans platform/) · relecture plan 1/3 (aucun bloquant ; tail -25, GC11/GC12 transmis aux tâches) · double relecture 1 tour (0 bloquant, 2 minor + 2 simplification appliqués en T6) · vagues sans progrès 0/2 · correctifs de fin 0/2

## Tâches
| id | dépend | worktree | état | essais | dernier commit vert | preuve rejouée |
|----|--------|----------|------|--------|---------------------|----------------|
| T1 editable.ts | — | --T1 (retiré) | terminée | 1/3 | 664e1de | web 10 fichiers 122 tests (avec T2, T4) · tsc 0 |
| T2 messages.ts | — | --T2 (retiré) | terminée | 1/3 | 139bc62 | idem |
| T4 board-list / olf-read | — | --T4 (retiré) | terminée | 1/3 | 61b29d8 | idem |
| T3 import-handler / officeErrorCode | T2 | --T3 (retiré) | terminée | 1/3 | dee74b3 | web 8 fichiers 199 · CLI 4 fichiers 50 · tsc web/cli 0 |
| T5 garde + preuves | T1–T4 | chantier | terminée | 1/3 | 2087aa7 | garde 6/6 tête, 2 failed/4 passed sur base (rejouée) |
| T6 simplification du lot | T1–T5 | chantier | terminée | 1/1 | 6257303 | diff des tests : seuls les 5 tests neufs · web 3233 |

## Terminé quand
toutes les tâches terminées · cycles de `platform/` fermés et gardés par un test · double relecture sans bloquant · `scripts/verifier.sh --e2e` OK · tailles Wasm sous leurs plafonds, inchangés · PR fusionnée par `git merge --no-ff` et poussée sans `--force`

## Contexte de la demande
OF13, candidat 3 du bilan d'Outillage sur `352cbda`. Délégation de Jérôme : « Non effectivement tu leurs confie et il juges ce qui doit être fait ou pas. » Ouvrier CLI de la VM : aucune question ne parvient à Jérôme, choix tranchés seul et consignés.

## Cadrage
5 constats visés : l.20 clipboard↔paste, l.29 office-import↔import, l.34 zip-worker→app, l.47 session.ts officeErrorCode (mention OF13, pas un cycle), l.49 messages d'ouverture (feuille `platform/messages.ts`).
Scénarios : S1 garde rouge sur base / verte sur tête · S2 CLI base = tête · S3 tests page/coque verts, seuls 4 chemins d'import changent · S4 build web, Worker ZIP sans DOM, tailles Wasm inchangées · S5 verifier --e2e OK et 5 constats fermés.

## Hypothèses à revoir
H1 (niveau 1) : bilan d'Outillage introuvable sur la VM ; le choix des 5 constats est celui du cadreur. H2–H7 : niveau 2, voir cadrage.

## Rapport
- Scénarios : S1 garde rouge sur base (`2 failed | 4 passed`, 3 imports platform→app + 3 cycles), verte sur tête (6/6) — réussi · S2 `cli-comparer.mjs` base 34d4d61 / tête 6257303 : `COMPARAISON : OK` ; `state` réel d'un `.iwb` et d'un `.olf` fabriqués (fabriques du dépôt) : code 0 ; collage d'image couvert par `paste.test.ts` — réussi · S3 4 lignes d'import changées dans 3 tests existants, aucun test retiré — réussi · S4 chunk zip-worker 28 441 → 28 219 o, 0 `document.`/`window.` ; Wasm 1 374 215 o et 2 794 511 o inchangés — réussi · S5 `verifier.sh --e2e` OK sur 6257303 ; 5 constats fermés (`fermés : 1` ×5) — réussi.
- Tests : web 3202 → 3233 · CLI 263 → 263 · Rust inchangé.
- Constats fermés : platform `clipboard.ts:7`, `office-import.ts:40`, `zip-worker.ts:25` ; cli `session.ts:186` (pas un cycle, entré par sa mention OF13 ; codes 3 et 1 et messages identiques ; règles restantes voulues, D56 et D59 de cli-lot4 ; le code d'échec est lu par `officeErrorCode`, partagé) ; app `open-export.ts:33`. Aucun constat nouveau.
- `constats.cjs compter` : aProposer crates/roomboard-core 5, apps/web/src/app 8, apps/web/src/platform 5 (aucun cycle), crates/roomboard-formats 4 → proposition d'audit, pas de lancement.
- Release : non due (aucune release, aucun tag).

## Hors périmètre
- `zip-worker.ts:28` importe encore `sniffImage` d'`image-import` (chunk sans DOM par tree-shaking seul ; contrôlé par S4).
- `controller.ts:159`, `workspace.ts:787` : messages sans nom de fichier, autre format.
- Cycles hors platform à la tête : `engine/page ↔ engine/camera`, `app/board-files ↔ app/board-io`, `app/workspace ↔ app/fragments`.

## Portes
ouvertes : — · passées : —

## Pièges trouvés
- Prémisses démenties : 3 imports platform→app (zip-read.ts:9 en plus) ; 3e cycle de type seul board-reader↔zip-read ; office-import↔import fait partie d'un bloc de 6 (dont model3d-handlers).
- Chantiers en cours sur les mêmes fichiers : aucun.
- `office-node.test.ts` (D79) instable sous charge de la VM.
- Sous happy-dom, `new URL("./x.ts", import.meta.url)` n'a pas le schéma `file:` : lire un source par `join(__dirname, …)`.

## Notes du coffre à poser
3 notes (journal, décision NNNN, segment de fiche) : texte complet dans la description de la PR.
