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

## Témoin natif release (`s6_worst_case_timing_witness`, clic médian)

| moment | charge | médiane (3 valeurs) | lecture des murs | contours f64 | rastérisation et dilatation | diffusion | piles | murs à soustraire | i_overlay | choix | écriture |
|---|---|---|---|---|---|---|---|---|---|---|---|
| avant | 1.94 1.30 1.75 puis 2.29 1.63 1.83 | 14.0 ms (12.5, 14.0, 16.9) | 0.50 | 0.12 | 4.24 | 1.36 | 0.85 | 0.07 | 6.56 | 0.01 | 0.27 |

## Banc du vrai module (vitest, Node 22, V8)

| moment | charge | (a) apply, médiane (ordre) | (b) engine.run, médiane | (c) fenêtre, médiane | (c) hors fenêtre, médiane | zoneCells | elementIds | boucle element(id) | boucle fillRings(id) (parcours) | vue ≈ |
|---|---|---|---|---|---|---|---|---|---|---|
| avant | 1.68 1.24 1.73 puis 1.94 1.30 1.75 | 23.1 ms (44.3, 23.1, 19.9) | 39.7 ms | 37.0 ms | 18.9 ms | 1.5 ms | 0.3 ms | 17.2 ms | 15.2 ms | 2.0 ms |

Détail : (b) ordre 48.7, 39.7, 39.2 ; (c) fenêtre ordre 58.3, 36.8, 37.0, hors fenêtre ordre 2.5, 18.9, 19.6.

## Empreinte du fill S6 (afc2d8b, avant tout gain)

Ligne du banc, recopiée telle quelle :

    S6 empreinte : anneaux=301 longueur=10217 sha256=b2f8da761b79e5113c5d20826428444331608c834622a853784ace43ed8ac073 boîte=-700.9893798828125,-700.9893798828125,1293.0106201171875,1293.0106201171875

## Où vont les ms (avant)

| part | ms | source |
|---|---|---|
| calcul de zone (`fill_zone`, clic médian) | 23.1 | banc (a) |
| état du moteur dans la fenêtre (`tableCounts`, O(N²)) | 16.6 | banc (b) − (a) |
| hors fenêtre (cellules, recompte des `fill`) | 18.9 | banc (c) |
| premier clic à froid | 44.3 | banc (a), ordre |

H7 : parcours domine (fillRings(id) 15.2 ms ≥ la moitié de element(id) 17.2 ms ; la vue pèse environ 2.0 ms), valeurs ci-dessus.
