# OG20 · Gomme partielle : trou visible sur un trait épais et appuyé — cadrage

Voie courte : un défaut connu du cœur, relevé à la relecture d'OF45 (PR 53, § « Hors correctif, constaté »). Aucune
fonction neuve, aucun geste neuf, aucune interface neuve.

## Défaut

La gomme partielle (`ink/erase.rs`) coupait la ligne médiane à `rayon de la gomme + largeur / 2`. Le contour de
freedraw a pour rayon `largeur × (0,25 + 0,5 × pression)` (`get_stroke_radius`, `THINNING` 0,5). Chaque morceau garde
une calotte de ce rayon au point coupé. Le trou visible valait donc `2 × rayon + largeur × (0,5 − pression)` :

- pression 1 : `2 × rayon − 0,5 × largeur`, nul dès que la largeur vaut 4 fois le rayon de la gomme ;
- pression 0,2 : `2 × rayon + 0,3 × largeur`, plus grand que la gomme ;
- pression 0,5 (souris, doigt : `NON_PEN_PRESSURE`) : exactement la gomme.

## Choix tranchés seul (aucune question ne parvient à Jérôme pendant ce tour)

1. **La coupe prend le rayon réel du contour en chaque point, pression comprise.** `outline_radius(width, pressure)`
   (`ink/outline.rs`) appelle `freedraw::get_stroke_radius` avec nos réglages : une seule formule, celle du rendu.
   Raison : la cause est l'écart entre deux formules ; la supprimer vaut mieux qu'un facteur ajouté à la gomme.
2. **Le trou visible vaut le diamètre de la gomme à toute pression**, y compris pour un trait fin ou peu appuyé, où il
   était plus grand. Raison : la demande dit « aucun trou plus grand que la gomme » ; à pression 0,5 (souris, doigt)
   rien ne change.
3. **Pas de densification inchangé** (`(rayon + largeur / 2) / 2`). Raison : les morceaux écrits gardent les mêmes
   points qu'avant ; ce pas reste sous la plus petite portée (`rayon + largeur / 4`, pression 0).
4. **Pression invalide (négative, NaN) lue 0,5, rayon d'au moins 0,01**, comme freedraw. Raison : sans cela, un trait
   venu d'un pair ou d'un import à pression négative n'était plus coupé (relecture adverse).
5. **Le repli `dot()` (trait d'un seul point, disque de rayon `largeur / 2`) n'est pas touché.** Raison : il change le
   rendu, hors du sujet ; un trait d'un point est gommé en entier ou pas du tout.
6. **Le faux cœur web (`fake-core.ts`, `strokeTouches`) garde `largeur / 2`.** Raison : il ne découpe pas, il ne fait que
   la collision ; le contrat ne joue que la pression 0,5. Écart latent, noté.
7. **Essai navigateur ajouté à `verifier.sh --e2e`** (`scripts/essais/gomme-trait-epais-navigateur.mjs`) : épaisseur 60
   par l'éditeur de profil (chemin de l'utilisateur), quatre traits (doigt, souris, stylet 0,2, stylet 1), un passage
   de gomme. Le doigt trace en premier : une fois le stylet vu, le doigt déplace la vue (rejet de la paume).

## Hors du sujet

Aucun geste, raccourci, icône ni écran neuf : la gomme garde son bouton, son raccourci et son appui long. Aucune
commande ni champ de la CLI ne change. Aucune empreinte S6 ne bouge (la gomme n'y joue pas).
