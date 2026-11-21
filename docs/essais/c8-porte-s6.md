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

## T4 : sans gain retenu

Lancé par l'orchestrateur après 5 passages à 2cad5b5 (médiane 27 ms ; un clic à 51 ms sous 8 boucles de calcul à côté).
Cible : le premier clic à froid. Code de `zone.rs` à la fin de T4 identique à 2cad5b5 (essai retiré par 151b031) ; module
`roomboard_wasm_bg.wasm` inchangé, 1370577 octets ; aucun passage de l'essai (rien n'a changé depuis le passage d'après T3).

### Où va le premier clic (sonde temporaire, vrai module, Node 22, V8)

Sonde vitest non committée : fixture S6 de `buildS6`, `zoneCells(p, 2)` d'abord (comme `zone-marks` avant le clic dans la
session), puis clics `Fill` zone en (100, 100) annulés un à un, `memory.buffer.byteLength` avant et après chaque clic ; options
V8 posées par `v8.setFlagsFromString` avant `initSync`. Un processus par ligne. Clics « mur » : en (−592, −600), sur un trait
court, la commande s'arrête à `OnWall` juste après la rastérisation.

| réglage V8 | init du module | clics sur un mur | clics complets (mémoire) |
|---|---|---|---|
| défaut | 8.2 ms | sans | 39.8 (3.06 → 6.94 Mio), 22.7 (→ 10.81 Mio), 20.4, 19.6, 19.4, 19.2 |
| `--no-wasm-lazy-compilation` (tout Liftoff au chargement) | 33.2 ms | sans | 30.8 (3.06 → 6.94 Mio), 22.0 (→ 10.81 Mio), 20.6, 19.6 |
| `--no-liftoff --no-wasm-lazy-compilation` (tout TurboFan au chargement) | 483.9 ms | sans | 21.0 (3.06 → 6.94 Mio), 18.5 (→ 10.81 Mio), 17.7, 17.8, 17.7, 18.4 |
| défaut | 7.3 ms | 12.1 (3.06 → 6.94 Mio), 6.3, 5.8, 5.7 | 31.4, 21.2 (→ 10.81 Mio), 19.6, 19.0 |
| `--no-wasm-lazy-compilation` | 33.8 ms | 10.4 (3.06 → 6.94 Mio), 6.5, 5.9, 5.8 | 25.2, 21.8 (→ 10.81 Mio), 19.9, 19.1 |
| `--no-liftoff --no-wasm-lazy-compilation` | 470.1 ms | 7.6 (3.06 → 6.94 Mio), 4.4, 4.2, 4.1 | 17.1, 17.9 (→ 10.81 Mio), 17.0, 17.0 |

Charge : 9.70 7.98 4.73 avant les trois premières lignes, 8.75 7.83 4.72 après ; 3.57 6.47 4.47 avant les trois dernières,
4.06 6.49 4.50 après. `--liftoff --no-wasm-tier-up` donne les mêmes chiffres que le défaut (réglage sans effet visible ici).

Lecture (premier clic 39.8 ms contre ~19.5 ms ensuite, soit ~20 ms de plus) :

| part du surcoût du premier clic | ms | d'où |
|---|---|---|
| croissance de la mémoire (premiers 3.9 Mio) | ~3.5 | clic mur 7.6 contre 4.1, tout compilé d'avance |
| compilation paresseuse des fonctions du clic | ~9 | 39.8 → 30.8 avec tout compilé en Liftoff au chargement |
| code de base Liftoff (pas de remplacement en cours d'appel) | ~8 | 30.8 − 19.5 − 3.5 ; disparaît tout compilé en TurboFan (21.0) |

Par phase : rastérisation +6.4 ms à froid (12.1 contre 5.7, dont ~3.5 de mémoire) ; phases suivantes (diffusion, piles,
`i_overlay`, écriture) +12 ms à froid (31.4 contre 19.4, sans croissance de la mémoire). Le cadrage (Q8) attribuait le premier
clic à la croissance de la mémoire du module : c'en est la plus petite part. À mémoire égale (même croissance de 3.9 Mio),
le premier clic passe de 39.8 à 21.0 ms par le seul palier de compilation.

Second clic : seconde croissance (6.94 → 10.81 Mio, ~1 à 2 ms : 22.7 contre ~20). Elle n'apparaît qu'une fois un `fill` écrit
(les clics sur un mur restent à 6.94 Mio) : une allocation qui survit à l'écriture du `fill` et à son annulation occupe la place
libérée par le masque. Elle vient de l'écriture dans le document, hors de `zone.rs` ; consignée, non traitée.

### Témoin natif release

| moment | charge | médiane (3 valeurs) | lecture des murs | contours f64 | rastérisation et dilatation | diffusion | piles | murs à soustraire | i_overlay | choix | écriture |
|---|---|---|---|---|---|---|---|---|---|---|---|
| T4 avant (2cad5b5) | 9.46 7.73 4.53 puis 6.44 7.37 4.65 | 13.9 ms (12.4, 13.9, 17.1) | 0.49 | 0.12 | 4.24 | 1.29 | 0.83 | 0.06 | 6.58 | 0.01 | 0.28 |
| T4 sonde « masque » | 1.40 4.62 4.06 puis 1.78 4.14 3.93 | 13.9 ms (12.5, 13.9, 16.8) | 0.52 | 0.12 | 0.31 (masque) + 3.97 | 1.23 | 0.83 | 0.06 | 6.55 | 0.01 | 0.27 |
| T4 essai (marquage fusionné, retiré) | 1.19 2.80 3.43 puis 1.93 2.69 3.35 | 14.7 ms (13.3, 14.7, 19.0) | 0.48 | 0.13 | 4.98 | 1.28 | 0.85 | 0.08 | 6.61 | 0.01 | 0.27 |

Sonde « masque » : repère temporaire après `Mask::new`, retiré. L'allocation et la remise à zéro des 4 Mio pèsent 0.31 ms ; le
marquage des murs, 3.97 ms. Essai de gain (65a5fdb, retiré par 151b031) : `mark_edge` écrivait chaque ligne dilatée une fois
(réunion des suites des lignes r − 1, r, r + 1) au lieu de trois lignes par ligne de l'arête ; masque identique (oracles verts),
mais rastérisation plus lente (4.98 ms) : les écritures de ligne ne sont pas le coût dominant, la fusion coûte plus.

### Banc (vrai module, inchangé)

| moment | charge | (a) apply, médiane (ordre) | (b) engine.run, médiane | (c) fenêtre, médiane | (c) hors fenêtre, médiane | zoneCells | elementIds | boucle element(id) | boucle fillRings(id) (parcours) | vue ≈ |
|---|---|---|---|---|---|---|---|---|---|---|
| T4 (2cad5b5, sans gain) | 1.52 2.50 3.26 puis 1.56 2.49 3.26 | 22.6 ms (42.6, 22.6, 21.0) | 20.9 ms | 20.8 ms | 2.7 ms | 1.4 ms | 0.3 ms | 20.2 ms | 16.9 ms | 3.3 ms |

Détail : (b) ordre 23.5, 20.0, 20.9 ; (c) fenêtre ordre 20.6, 20.8, 21.0, hors fenêtre ordre 6.4, 2.7, 2.7. Les 3 tests `S2 :`
verts, `Tests  5 passed (5)`. Ligne `S6 empreinte :` comparée à l'octet à celle d'afc2d8b (§ Empreinte) : identique
(196 octets).

### Pourquoi aucun gain

- Les ~17 ms de compilation (paresseuse puis Liftoff) ne se retirent qu'en compilant d'avance ou en faisant tourner le code
  avant le clic : préchauffage ou appel à blanc, exclus (Q2, Q9). Les moyens permis (moins de mémoire, moins d'allocations,
  phase moins chère) ne les réduisent qu'en proportion du travail retiré.
- Les ~3.5 ms de mémoire sont le prix d'un masque `u8` unique de 4044121 cellules (Q8, Q20) dans un module qui n'a que
  3.06 Mio avant le clic : ses pages doivent être ajoutées et touchées ; un masque plus petit (bits, cellule doublée) est exclu.
- La seule phase de notre code assez lourde pour peser (marquage, 3.97 ms natif) a été essayée sans gain ; la plus lourde,
  `i_overlay` (6.6 ms natif), est une crate dont l'entrée doit rester identique pour garder l'empreinte (H3).

S1 n'est pas retenue par un gain T4 : l'état S1 reste celui des passages d'après T3 (médiane 27 ms, un clic à 51 ms sous charge
de 6 à 8). Suite possible, hors T4 : la seconde croissance de la mémoire (écriture du `fill`, ~1 à 2 ms au second clic).
