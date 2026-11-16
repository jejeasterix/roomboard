# Essai ENI — stylet (S1, lot 1 du socle)

Fichier à ouvrir : `docs/essais/proto-stylet.html` (copie construite le 2026-11-16, téléchargeable depuis GitHub), ou `proto-stylet.html` (produit par `pnpm --filter @roomboard/web build:proto`, dossier
`apps/web/dist-proto/`). Fichier unique, sans réseau : copier sur une clé ou le bureau de l'ENI et l'ouvrir par
double-clic dans Edge ou Chrome.

Ce qui est mesuré : l'entrée (Pointer Events) et l'affichage dans un navigateur. Pas le lissage du produit (le
prototype dessine une polyligne dont l'épaisseur suit la pression), pas la WebView2 de la future application (mesure
par la file du PC plus tard). Le retard mesuré est interne (horodatage de l'événement → image dessinée) : ni le
numériseur ni l'écran ne sont comptés.

**Limite de la mesure de retard.** Le retard est pris au début de l'image (`requestAnimationFrame`) : il ne voit ni
l'effet de la prédiction (la queue prédite est dessinée après), ni celui de `desynchronized` (gain entre le dessin et
l'écran), ni celui de `navigator.ink` (traînée dessinée par le système). Ces trois séries (2, 3 sans prédits, 4) et
la bascule `desynchronized` se jugent **à l'œil** : « le trait suit-il la pointe ? ». Leurs chiffres de retard restent
utiles pour les fréquences et les images longues, pas pour départager.

## Avant l'essai

1. Noter le modèle de l'ENI, le stylet, le navigateur et sa version.
2. Ouvrir le fichier ; la première ligne du panneau dit ce que le navigateur prend en charge (fusionnés, prédits,
   `desynchronized`, `navigator.ink`, `pointerrawupdate`, contexte sûr, `dpr`). Une bascule non prise en charge est
   grisée.
3. Bascules par défaut : fusionnés, prédits, `desynchronized` actifs ; `pointerrawupdate` et traînée déléguée coupés.

## Protocole

**À la fin de chaque série : cliquer « Télécharger le JSON », puis « Remettre les mesures à zéro ».** La remise à zéro
efface les traits et les durées d'image mesurés : sans export avant, la série est perdue. Les noms de fichiers sont
horodatés ; noter le numéro de la série à côté de chaque fichier.

1. **Stylet, réglage par défaut** : écrire « Bonjour la classe » en écriture normale, la paume posée sur l'écran.
2. **Stylet, prédiction coupée** : décocher « prédits », réécrire la même phrase. Recocher.
3. **Stylet, `pointerrawupdate`** (si non grisé) : cocher, réécrire, décocher. Sous `pointerrawupdate`, Chromium ne
   donne aucun point prédit : le panneau (« Réglages effectifs ») et `strokes[].options.predicted` disent `false`,
   même case « prédits » cochée.
4. **Stylet, traînée déléguée** (si non grisée) : cocher « traînée déléguée (navigator.ink) », réécrire, décocher.
5. **Pression** : tracer trois traits, léger, moyen, appuyé.
6. **Appui long** : tenir le stylet appuyé 2 s sans bouger. Attendu : aucun menu.
7. **Bouton gomme** (si le stylet en a un) : tracer en le tenant. Attendu : trait gris, « gomme oui ». Un trait au
   bouton gomme interrompu par le système ne laisse pas d'encre (D39).
8. **Doigt** : écrire « Bonjour » au doigt.
9. **Paume** : poser la paume avant le stylet, puis écrire. Noter si la paume laisse une marque (règle du lot 3).
10. Rapporter les 9 fichiers JSON (à défaut : « Copier le JSON », ou le texte de la zone en bas à droite, série par
    série).

Verdict, en une phrase de Jérôme : **le trait suit-il la pointe ?** Noter aussi : pression ressentie, coupures, traits
parasites de la paume.

## Autres plateformes (hors ENI, sans bloquer le plan)

- **Windows (PC)** : même fiche dans Edge, puis plus tard dans la WebView2 de l'application. Passe par la file
  d'attente du PC ; l'essai attend que le PC soit branché.
- **macOS (Mac)** : même fiche dans Safari et Chrome. Différences attendues : pas de `pointerrawupdate` ni de
  `navigator.ink` dans Safari ; trackpad et souris seulement, sans pression, sauf tablette graphique.
- **Android** : en attente de KVM sur la VM.

## Lire le panneau et le JSON

| dans le JSON (`roomboard-stylet/1`) | sens |
|---|---|
| `environment.userAgent`, `environment.devicePixelRatio` | navigateur et densité de l'écran |
| `environment.support.coalesced` / `predicted` / `desynchronized` / `inkPresenter` / `pointerRawUpdate` / `secureContext` | prise en charge détectée |
| `counters.pointerCancels` | traits coupés par le système (paume, geste) |
| `counters.lostCaptures` | capture du pointeur perdue pendant un trait |
| `counters.touchIgnored` | contacts tactiles ignorés pendant que le stylet touchait (paume) |
| `counters.moveEvents`, `counters.samples`, `counters.rawUpdateUsed` | messages de mouvement reçus, échantillons reçus (fusionnés compris), `pointerrawupdate` réellement écouté depuis la remise à zéro |
| `frames.p50`, `frames.p95`, `frames.overBudgetShare` | durée des images pendant le tracé (ms) ; part des images > 25 ms |
| `totals.penPressure.min` / `max` / `stdDev` | pression du stylet sur tous ses traits |
| `totals.penConstantPressure` | `true` = pression figée (0 / 0,5) ; `false` aussi sans aucun trait au stylet (le panneau dit alors « aucun trait au stylet ») |
| `totals.penStrokes` = 0 | le stylet est vu comme un doigt (ENI infrarouge) : `pointerType` vaut `touch`, pas de pression ni de bouton gomme |
| `totals.penEventsHzP50`, `totals.penSamplesHzP50` | fréquence des événements et des échantillons fusionnés (Hz) : 1000 / médiane des intervalles, qu'une pause du stylet ne fausse pas |
| `totals.latencyP50`, `totals.latencyP95` | retard interne (ms), tous pointeurs |
| `totals.penLatencyP50` / `P95`, `totals.otherLatencyP50` / `P95` | le même retard, stylet seul / souris et doigt |
| `totals.cancelledStrokes`, `totals.palmStrokes` | traits interrompus (système, capture perdue, bascule) ; contacts de paume annulés quand le stylet touche (D18), comptés à part |
| `strokes[].options` | réglages effectifs pour ce trait (comparer prédiction coupée / active) ; `predicted` = `false` sous `pointerrawupdate` |
| `strokes[].pointerType`, `points`, `maxTiltX`, `maxTiltY`, `eraserSeen`, `cancelled`, `palm` | type de pointeur, points, inclinaison, bouton gomme, trait interrompu, paume annulée (D18) |
| `strokes[].eventsHz`, `samplesHz`, `latencyP50`, `latencyP95` | les mêmes mesures, trait par trait |

## Repères

Repères, pas une porte : le ressenti de Jérôme décide (cadrage D31).

- pression qui varie au stylet (`totals.penConstantPressure` = `false`) ;
- fréquence ≥ 100 Hz au stylet avec fusionnés (`totals.penSamplesHzP50`) ;
- retard interne p95 ≤ 17 ms au stylet (`totals.penLatencyP95`), sans départager prédiction, `desynchronized` ni traînée
  déléguée (voir « Limite de la mesure de retard ») ;
- moins de 2 % d'images > 25 ms (`frames.overBudgetShare` < 0,02).

## Si l'essai échoue

Échelle du cadrage (DA9), du moins coûteux au plus coûteux ; chaque échelon se mesure avec ce même fichier avant de
passer au suivant.

| constat | essai à faire tout de suite | suite dans le chantier |
|---|---|---|
| retard ou saccades | vérifier fusionnés + prédits + `desynchronized` actifs, essayer `pointerrawupdate` | rien si ça suffit (échelon 1) |
| prédits grisés (WebKit) et retard visible | — | prédiction linéaire en TS au lot 3 (échelon 2) |
| retard visible sous Chromium Windows malgré l'échelon 1 | cocher la traînée déléguée | traînée déléguée dans le moteur au lot 3 (échelon 3) |
| images > 25 ms fréquentes | noter `frames.p95` | canvas d'interaction en WebGL2 au lot 3 (échelon 4) |
| bon dans Edge, mauvais dans l'application plus tard | — | réglages WebView2 par la coque au lot 5 (échelon 5) |
| rien ne suffit | — | **décision de Jérôme** : encre vive native dans la coque (échelon 6), contraire à la règle « le chemin de l'encre ne traverse jamais la frontière page ↔ Rust natif » |
| pression figée (`penConstantPressure` = `true`) | essayer un autre navigateur, noter le pilote du stylet | rien ne casse : trait à largeur constante (D8) |
| appui long qui ouvre un menu, paume qui coupe le trait | noter le cas | réglages de D39 / D18 au lot 3 |
