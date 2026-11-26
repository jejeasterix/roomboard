# Restes du design (lots L3 et L2) — état (OF83)

Branche `fix/restes-design`, depuis `origin/main` d97bd81. Début 2026-11-26 08:21, arrêt ferme 10:51.

| # | Reste | Gravité | État |
|---|---|---|---|
| 1 | Focus sur body après « Revenir à l'origine » (ProfileEditor) | majeur | corrigé : le focus passe sur « Enregistrer » |
| 2 | Poignée de tri recouverte de 4 px par l'icône de ligne (rb.css) | mineur | corrigé : icône de ligne `pointer-events: none` ; 43 px utiles avant, 48 après (mesure au navigateur, S2 de design-l3) |
| 3 | pointer-gesture.test.ts : defaultPrevented non vérifié après abandon | mineur | corrigé : le test vérifie `defaultPrevented` ; rouge prouvé par mutation (écouteur d'Échap non retiré) ; fuite d'écouteurs entre tests trouvée et fermée |
| 4 | Page à 16 px du haut, sous les îlots (fitPage) | moyen | corrigé : haut de page à y 148 (avant 16), à l'ouverture et après « Ajuster la page », à 1280 × 900 et 1920 × 1080 ; capture `docs/essais/design-l2-restes-tableau.png` |
| 5 | Ctrl+O juste après Ctrl+S sous charge | faible | constat : cause non trouvée après recherche bornée (détail ci-dessous), aucun délai relevé |

## Choix tranchés seul
- Reste 1 : cible du focus = « Enregistrer » (voisin dans le pied, toujours visible, actif quand le profil a un nom).

- Reste 2 : marge −16 px gardée (espacement de la maquette 03 intact) ; l'icône de ligne, décorative, devient transparente au pointeur. La mesure a montré 43 px, pas 44 : le tracé SVG déborde d'1 px, ce qu'un simple décalage de marge ne règle pas.

- Reste 3 : le code était juste, seul le test changeait ; le rouge se prouve par mutation du code (retrait de `removeEventListener("keydown")`), restaurée ensuite. Le premier essai du test durci a montré une fuite : les gestes laissés ouverts par les tests précédents gardaient leur écouteur d'Échap ; `afterEach` les abandonne via l'espion existant.

- Reste 4 : le moteur reçoit `fitTop()` (sinon 16 px, comme avant), la session le calcule depuis les `.rb-island` du haut (`topBelowIslands`). Sous chaque îlot du haut, une rangée contextuelle de même hauteur est réservée (8 + 56 px), présente ou non : la première version mesurait la vraie rangée, et le cadrage changeait avec l'outil actif (S5b rouge, page 3 du texte). Valeur : 72 + 8 + 56 + 12 = 148 (maquette ≈ 152). Largeur de page (95 % de la vue, maquette ≈ 73 %) gardée : hors du reste.


## Constat du reste 5 (Ctrl+O juste après Ctrl+S, C3)
Aucun journal de l'échec d'origine (étape exacte inconnue). Essais faits :
- Course sur `busy` (`platform/controller.ts`) : réfutée à la lecture. En repli, `host.save` encode, puis `download()` clique le lien de façon synchrone ; `busy` est libéré par des microtâches de la même tâche. L'événement `download` de Playwright arrive après. L'hôte d'onglet (`workspace.ts`, `tabHost`) n'ajoute aucune attente.
- Annulation du sélecteur de repli par le retour du focus (`choose()`, `FOCUS_CANCEL_MS`) : réfutée en headless. Sonde : 0 événement `focus` ou `pointerdown` entre Ctrl+O et `setFiles`, et un `setFiles` retardé de 1,5 s passe.
- Charge : 16 essais C3 en parallèle (4 × 2 tours, puis 8) : 16 OK. CPU bridé par `Emulation.setCPUThrottlingRate` à 6x et 20x : OK.
Hypothèse restante, non prouvée : l'échec venait d'une étape suivante. Après la réouverture, l'essai clique en (170, 160) après une seule attente d'images (`fr()`), sans attendre que le nouvel onglet soit prêt ; sous forte charge, le clic peut précéder le premier rendu. À confirmer par un journal si l'échec revient.

## Prochaine tâche
verifier.sh --e2e, puis PR.
