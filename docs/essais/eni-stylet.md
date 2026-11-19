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

## Essai du 19 novembre — application (lot 3)

Ce qui change depuis le banc du 16 : l'encre est celle du produit (contour `freedraw` calculé par le cœur Wasm,
`StrokeBuilder`), dessinée par le moteur sur ses deux canvas. À ouvrir : l'application web construite
(`apps/web/dist`, servie en http : le Wasm ne se charge pas en `file://`) ou la coque Tauri. La barre (Stylo, Gomme,
Annuler, Rétablir) est provisoire : l'interface complète arrive au lot 5.

0. Doigt d'abord, page rechargée (ou coque relancée) et sans aucun stylet posé : le doigt trace, et deux doigts posés
   ensemble (moins de 150 ms) ne tracent pas, la vue se pince. Dès que le stylet a touché l'écran une première fois, le
   doigt ne trace plus : il déplace la vue, et deux doigts la pincent (D18). Pour revoir le doigt qui trace, recharger la page.
1. Stylet : écrire « Bonjour la classe » en appuyant plus ou moins fort : l'épaisseur suit la pression.
2. Gomme (bouton « Gomme », ou bouton gomme du stylet) : passer en travers d'un mot ; au relâché, l'encre touchée
   disparaît, le reste des traits demeure.
3. Ctrl+Z, puis Ctrl+Y (ou Ctrl+Maj+Z), puis les boutons « Annuler » et « Rétablir ».
4. Après le stylet (étape 1 faite, page non rechargée) : un doigt déplace la vue, deux doigts pincent ; le doigt ne
   trace plus (D18). Le doigt qui trace se vérifie à l'étape 0, avant tout stylet.
5. Paume posée en écrivant au stylet : aucun trait de paume.
6. Molette : la vue défile ; Ctrl+molette : zoom autour du pointeur.
7. Banc : ouvrir la même adresse suivie de `?banc`, écrire comme le 16, « Télécharger le JSON »
   (`roomboard-stylet/1`, champs `geometry: "freedraw"` et `coreVersion` en plus), le comparer au JSON de
   `proto-stylet.html` pris le même jour (retard p95, part des images > 25 ms).

Verdict : le ressenti de Jérôme (« le trait suit la pointe »), comme le 16 (D31). Si le trait ne suit pas : tableau
« Si l'essai échoue » ci-dessus (échelons 2 à 4 de DA9, lot 3b).

## Lot 3b : comparer les réglages

Le lot 3b a été livré sans attendre l'essai (décision de Jérôme, 2026-11-19 : « oui fait le avancé en autonomie même
si je n'ai pas fais les tests ») : chaque échelon de DA9 est un réglage, éteint par défaut tant que rien de mesuré ne
le demande (S1, OC56, OC66), sauf l'échelon 2 (`auto` : allumé sous WebKit, où le navigateur ne donne aucun point prédit). L'essai ENI du samedi 21 novembre vérifie ces défauts. Ouvrir la même adresse que
l'application, suivie du réglage ; la seconde ligne de la barre montre l'état effectif et bascule chaque réglage (les
échelons 3 et 4 rechargent la page : le dessin en cours est perdu).

| réglage | adresse | quoi regarder |
|---|---|---|
| défauts | (rien) | Le trait suit-il la pointe ? C'est la référence des lignes suivantes. |
| É2 prédiction TS | `?echelons=2` | La queue devant la pointe colle-t-elle mieux, ou dépasse-t-elle dans les virages ? |
| É3 traînée `navigator.ink` | `?echelons=3` | Sous Edge Windows, la pointe dessinée par le système rattrape-t-elle le stylet ? « sans effet » dans la barre : l'API manque. |
| É4 WebGL2 | `?echelons=4` | Traits longs et rapides : moins de saccades ? « repli Canvas 2D » dans la barre : WebGL2 manque. |
| paume souple | `?paume=souple&doigt=trace` | Paume posée avant le stylet : son trait continue-t-il (attendu : oui en souple, non par défaut) ? Sans `doigt=trace`, une fois le stylet vu la paume déplace la vue (réglage par défaut : le doigt déplace la vue), donc aucun trait de paume à voir. |
| doigt qui trace | `?doigt=trace` | Après le stylet, le doigt trace au lieu de déplacer la vue ; le bouton « Doigt » de la barre bascule à chaud. |

Combiner : `?echelons=2,4`. Tout éteindre : `?echelons=aucun`. Avec le banc : `?banc&echelons=4`. Le panneau du banc
résume les 600 dernières images ; l'export JSON garde les 3 600 dernières que le moteur retient.
Nouveautés à essayer en passant : outil « Main », barre d'espace + glisser (l'espace est pris même quand un bouton de la barre a le focus : il n'active donc plus les boutons, choix voulu pour que « espace + glisser » marche après un clic dans la barre), bouton du milieu de la souris (la vue suit,
rien ne trace) ; bouton « Gomme : partielle / objet » (en gomme d'objet, un passage retire le trait entier).

## Lot 4 : à essayer

Troisième ligne de la barre (`#edition`, sous les réglages). Chaque geste fait une seule étape : Ctrl+Z le défait,
Ctrl+Y le refait. Joué au navigateur headless sur la VM (`scripts/essais/s34-navigateur.mjs`) ; à revoir ici au stylet.

| outil | geste | quoi regarder |
|---|---|---|
| Sélection | Toucher un élément ; tracer un rectangle dans le vide ; Maj + toucher ajoute ; glisser déplace ; tirer une des 8 poignées (Maj : proportions) ; Suppr retire ; Échap vide. | Les poignées se prennent-elles au stylet du premier coup ? Un simple toucher n'écrit rien (Annuler reste gris). |
| Rectangle | Glisser d'un coin à l'autre (Maj : carré). | Aperçu sous la pointe pendant le geste, forme écrite au relâché seulement. |
| Ellipse | Glisser (Maj : cercle). | Se sélectionne-t-elle en touchant son intérieur ? |
| Ligne | Glisser (Maj : pas de 15°). | Facile à reprendre avec l'outil Sélection, sans viser le trait au pixel ? |
| Flèche | Glisser de la queue vers la pointe. | La pointe est-elle du bon côté et lisible au zoom de travail ? |
| Texte | Toucher une place vide : une zone pointillée s'ouvre ; écrire ; Échap ou toucher ailleurs valide. Toucher un texte le rouvre. | Clavier de l'ENI et IME réelle (accents, saisie japonaise si possible) : rien n'est écrit pendant la composition ; la fenêtre de candidats s'ouvre près du curseur. Texte vidé puis validé : il disparaît. |

Pages : « Ajouter une page » insère après la page montrée et la montre ; « Retirer la page » montre la précédente,
Ctrl+Z la rend avec son contenu ; la dernière page ne se retire pas (bouton grisé) ; le compteur dit « 2 / 3 ».
Non prouvé sur la VM (HL4-3) : IME réelle de Windows ou de macOS, fenêtre de candidats, stylet et doigt sur les
poignées, WebKit. La zone de texte ne suit pas un zoom fait pendant l'édition : valider puis rouvrir (CL4-15).
