# Porte S6 du pot sur zones fermées : mesures (OE23)

Chantier `restes-od94-porte-s6`, cadrage `docs/plans/restes-od94-porte-s6-cadrage.md` (Q2 à Q6, Q10). Seuil 50 ms, fixture
et essai C8 inchangés (Q1). Témoins, pas portes : aucune de ces durées n'est assertée par un test.

Commandes : banc `ROOMBOARD_WASM_REQUIRED=1 nice -n 10 pnpm --filter @roomboard/web exec vitest run src/engine/zone-s6-banc.test.ts --reporter=verbose` ;
témoin natif `nice -n 10 cargo test -p roomboard-core --features zone --release --lib s6_ -- --ignored --nocapture` ;
essai `node scripts/essais/c8-pot-zones-navigateur.mjs`, `cat /proc/loadavg` avant et après. VM de 8 cœurs, état réel (Q4).
Module Wasm : `roomboard_wasm_bg.wasm` de 1368840 octets (identique à la référence), code d'afc2d8b (aucune différence sous `crates`, `apps`, `scripts`).

## Passages de l'essai C8

| moment | tête | passage | charge 1/5/15 min | S6 trois clics triés | médiane | fond |
|---|---|---|---|---|---|---|
| avant | afc2d8b | 1 | 3.90 4.42 3.73 | 38, 40, 50 | 40 | 22 |
| avant | afc2d8b | 2 | 3.67 4.36 3.71 | 38, 40, 51 | 40 | 23 |
| avant | afc2d8b | 3 | 3.45 4.31 3.70 | 38, 40, 50 | 40 | 22 |
| avant | afc2d8b | 4 | 3.26 4.25 3.68 | 37, 39, 50 | 39 | 22 |
| avant | afc2d8b | 5 | 3.16 4.21 3.68 | 37, 40, 50 | 40 | 21 |
| après T3 | 32bac50 | 1 | 2.38 1.86 1.70 (après : 2.27 1.84 1.69) | 24, 27, 37 | 27 | 10 |

## Témoin natif release (`s6_worst_case_timing_witness`, clic médian)

| moment | charge | médiane (3 valeurs) | lecture des murs | contours f64 | rastérisation et dilatation | diffusion | piles | murs à soustraire | i_overlay | choix | écriture |
|---|---|---|---|---|---|---|---|---|---|---|---|
| avant | 1.94 1.30 1.75 puis 2.29 1.63 1.83 | 14.0 ms (12.5, 14.0, 16.9) | 0.50 | 0.12 | 4.24 | 1.36 | 0.85 | 0.07 | 6.56 | 0.01 | 0.27 |

## Banc du vrai module (vitest, Node 22, V8)

| moment | charge | (a) apply, médiane (ordre) | (b) engine.run, médiane | (c) fenêtre, médiane | (c) hors fenêtre, médiane | zoneCells | elementIds | boucle element(id) | boucle fillRings(id) (parcours) | vue ≈ |
|---|---|---|---|---|---|---|---|---|---|---|
| avant | 1.68 1.24 1.73 puis 1.94 1.30 1.75 | 23.1 ms (44.3, 23.1, 19.9) | 39.7 ms | 37.0 ms | 18.9 ms | 1.5 ms | 0.3 ms | 17.2 ms | 15.2 ms | 2.0 ms |
| après T3 | 2.00 1.72 1.64 puis 2.32 1.79 1.67 | 22.0 ms (41.8, 22.0, 19.9) | 19.8 ms | 19.8 ms | 2.6 ms | 1.5 ms | 0.3 ms | 18.8 ms | 15.6 ms | 3.1 ms |

Détail après T3 : (b) ordre 22.0, 19.8, 19.7 ; (c) fenêtre ordre 19.8, 20.1, 19.1, hors fenêtre ordre 5.0, 2.6, 2.5. Empreinte
identique à celle d'afc2d8b (même ligne `S6 empreinte :`). Les boucles `element(id)` et `fillRings(id)` mesurent le coût
d'une lecture de tous les éléments : elles ne sont plus appelées par le moteur, elles restent le témoin de ce qui a été évité.

Précision du banc (c) à partir de T3 : le banc appelle `marks.tags(p, d.version())` avant les 3 clics, comme
`mark(engine.state())` de la session (`board-session.ts:658`), pour que le premier recompte des `fill` ne tombe pas dans la
fenêtre du banc. Ce n'est pas un changement de l'essai (fenêtre `zone-marks.ts` et script C8 inchangés) ; la ligne « avant »
a été relevée sans cet appel.

Détail avant : (b) ordre 48.7, 39.7, 39.2 ; (c) fenêtre ordre 58.3, 36.8, 37.0, hors fenêtre ordre 2.5, 18.9, 19.6.

## Empreinte du fill S6 (afc2d8b, avant tout gain)

Ligne du banc, recopiée telle quelle :

    S6 empreinte : anneaux=301 longueur=10217 sha256=b2f8da761b79e5113c5d20826428444331608c834622a853784ace43ed8ac073 boîte=-700.9893798828125,-700.9893798828125,1293.0106201171875,1293.0106201171875

Non-régression : `zone-s6-banc.test.ts`, `describe` « non-régression C8 sur S6 » (S2), compare cette empreinte sur la tête a28989e : égale.

## Où vont les ms (avant)

| part | ms | source |
|---|---|---|
| calcul de zone (`fill_zone`, clic médian) | 23.1 | banc (a) |
| état du moteur dans la fenêtre (`tableCounts`, O(N²)) | 16.6 | banc (b) − (a) |
| hors fenêtre (cellules, recompte des `fill`) | 18.9 | banc (c) |
| premier clic à froid | 44.3 | banc (a), ordre |

H7 : parcours domine (fillRings(id) 15.2 ms ≥ la moitié de element(id) 17.2 ms ; la vue pèse environ 2.0 ms), valeurs ci-dessus.

## Où vont les ms (après T3)

| part | avant (ms) | après T3 (ms) | source |
|---|---|---|---|
| calcul de zone (`fill_zone`, clic médian) | 23.1 | 22.0 | banc (a) |
| état du moteur dans la fenêtre (`tableCounts`) | 16.6 | 0.0 (b 19.8 − a 22.0, dans le bruit) | banc (b) − (a) |
| hors fenêtre (cellules, recompte des `fill`) | 18.9 | 2.6 | banc (c) |
| premier clic à froid | 44.3 | 41.8 | banc (a), ordre |

Aucun travail n'a quitté la fenêtre `timed` : `tableCounts` et le recompte des `fill` lisent seulement les candidats du kind
brut (`elementIdsOfKind`), confirmés par `element(id)`.

## Gain T3 : `tableCounts` et recompte des `fill` par `elementIdsOfKind`

| mesure | avant | après T3 | écart |
|---|---|---|---|
| banc (b) engine.run, médiane | 39.7 ms | 19.8 ms | -19.9 ms |
| banc (c) fenêtre, médiane | 37.0 ms | 19.8 ms | -17.2 ms |
| banc (c) hors fenêtre, médiane | 18.9 ms | 2.6 ms | -16.3 ms |
| essai, médiane S6 (un passage) | 40 (médiane des 5 avant) | 27 | -13 |
| essai, clic le plus lent | 51 (maximum des 5 avant) | 37 | -14 |
| témoin natif | sans objet (cœur non touché) | | |

S1 après T3 (lecture de ce seul passage) : médiane 27 <= 35 et aucun clic > 50 (24, 27, 37) : tenue.
