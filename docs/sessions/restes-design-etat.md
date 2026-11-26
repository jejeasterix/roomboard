# Restes du design (lots L3 et L2) — état (OF83)

Branche `fix/restes-design`, depuis `origin/main` d97bd81. Début 2026-11-26 08:21, arrêt ferme 10:51.

| # | Reste | Gravité | État |
|---|---|---|---|
| 1 | Focus sur body après « Revenir à l'origine » (ProfileEditor) | majeur | corrigé : le focus passe sur « Enregistrer » |
| 2 | Poignée de tri recouverte de 4 px par l'icône de ligne (rb.css) | mineur | corrigé : icône de ligne `pointer-events: none` ; 43 px utiles avant, 48 après (mesure au navigateur, S2 de design-l3) |
| 3 | pointer-gesture.test.ts : defaultPrevented non vérifié après abandon | mineur | à faire |
| 4 | Page à 16 px du haut, sous les îlots (fitPage) | moyen | à faire |
| 5 | Ctrl+O juste après Ctrl+S sous charge | faible | à faire |

## Choix tranchés seul
- Reste 1 : cible du focus = « Enregistrer » (voisin dans le pied, toujours visible, actif quand le profil a un nom).

- Reste 2 : marge −16 px gardée (espacement de la maquette 03 intact) ; l'icône de ligne, décorative, devient transparente au pointeur. La mesure a montré 43 px, pas 44 : le tracé SVG déborde d'1 px, ce qu'un simple décalage de marge ne règle pas.

## Prochaine tâche
Reste 3.
