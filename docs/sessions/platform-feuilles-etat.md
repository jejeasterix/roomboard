# État — platform-feuilles

Statut : en cours
Gabarit : courte (provisoire)
Objectif : Les cycles d'import de `apps/web/src/platform/` sont cassés par de petits modules feuilles, sans changer ce que voient la page, la coque et la CLI.
Avancement : —
Étage : 2 — depuis 2026-11-24 15:35
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
contre-relecture cadrage 1/2 (aucun bloquant ; 1 important corrigé : feuille de messages dans platform/) · relecture plan 0/3 · vagues sans progrès 0/2 · correctifs de fin 0/2

## Tâches
—

## Terminé quand
toutes les tâches terminées · cycles de `platform/` fermés et gardés par un test · double relecture sans bloquant · `scripts/verifier.sh --e2e` OK · tailles Wasm sous leurs plafonds, inchangés · PR fusionnée par `git merge --no-ff` et poussée sans `--force`

## Contexte de la demande
OF13, candidat 3 du bilan d'Outillage sur `352cbda`. Délégation de Jérôme : « Non effectivement tu leurs confie et il juges ce qui doit être fait ou pas. » Ouvrier CLI de la VM : aucune question ne parvient à Jérôme, choix tranchés seul et consignés.

## Cadrage
5 constats visés : l.20 clipboard↔paste, l.29 office-import↔import, l.34 zip-worker→app, l.47 session.ts officeErrorCode (mention OF13, pas un cycle), l.49 messages d'ouverture (feuille `platform/messages.ts`).
Scénarios : S1 garde rouge sur base / verte sur tête · S2 CLI base = tête · S3 tests page/coque verts, seuls 4 chemins d'import changent · S4 build web, Worker ZIP sans DOM, tailles Wasm inchangées · S5 verifier --e2e OK et 5 constats fermés.

## Hypothèses à revoir
H1 (niveau 1) : bilan d'Outillage introuvable sur la VM ; le choix des 5 constats est celui du cadreur. H2–H7 : niveau 2, voir cadrage.

## Hors périmètre
—

## Portes
ouvertes : — · passées : —

## Pièges trouvés
- Prémisses démenties : 3 imports platform→app (zip-read.ts:9 en plus) ; 3e cycle de type seul board-reader↔zip-read ; office-import↔import fait partie d'un bloc de 6 (dont model3d-handlers).
- Chantiers en cours sur les mêmes fichiers : aucun.
- `office-node.test.ts` (D79) instable sous charge de la VM.

## Notes du coffre à poser
(à la clôture)
