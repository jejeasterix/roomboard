# Restes d'OG23 (OG34) : panneau de retouche d'image, sections Média et Objet 3D

Voie courte, sans fonction neuve. Source : bloc « Reste » de la PR 73 (OG23). Le détourage par modèle d'IA n'est pas dans
ce lot (question posée à Jérôme).

## Demande

1. Le panneau de retouche d'image (C5) garde des boutons gris natifs. Il passe au design des îlots : jetons `--rf-*`,
   icônes Lucide, curseurs et cibles de l'accordéon du panneau d'options d'OG23. Mêmes fonctions : rogner, retourner,
   tourner, luminosité, contraste, couleur transparente (pipette, départ, tolérance, plume).
2. Les commandes du média (C14) et de l'objet 3D (C15) vivaient dans des barres flottantes, hors de l'accordéon. Elles
   deviennent les sections « Média » et « Objet 3D » du panneau d'options.

## Choix tranchés seul (aucune question n'a pu parvenir à Jérôme)

- **Barres flottantes retirées.** Les commandes du média et de l'objet 3D passent dans leur section, sans doublon sur la
  scène. Raison : une seule place par réglage, comme l'image depuis OG23. Conséquence : panneau d'options replié, ces
  commandes sont cachées, comme toutes les autres sections.
- **Sections ouvertes par défaut**, en tête du panneau (avant Disposition), pour un média ou un objet 3D seul.
  Raison : même règle que la section Image ; sinon un média sélectionné ne montre que des en-têtes repliés.
- **Panneau de retouche non replié en accordéon.** Trois groupes à titre fixe (Géométrie, Réglages, Couleur
  transparente), séparés d'un filet gris 300, et un pied d'actions. Raison : peu de commandes, toutes utiles ensemble.
  Le panneau garde sa place à droite de la scène et sa largeur fixe de 320 px (netteté, § 10).
- **Liste « Départ » gardée en liste native, restylée.** Raison : les essais de C5 la pilotent par `selectOption`, et
  ses trois libellés sont longs pour des segments dans 296 px.
- **« Valider » en action principale violette** (et « Valider le rognage » en mode rognage) ; « Annuler les réglages » et
  « Rétablir l'original » en boutons larges discrets. Fermer passe en icône ✕ dans l'en-tête.
- **Raccourcis neufs, actifs quand le focus est dans le panneau ou la section** (une lettre seule, hors liste et zone de
  saisie, arrêtée là pour ne pas changer d'outil) :
  - retouche d'image : I arme ou désarme la pipette ; Ctrl+Entrée valide (le rognage en mode rognage) ; Échap reste
    celui du moteur (annule le rognage, désarme la pipette) ;
  - média : K lecture ou pause, D début ici, F fin ici, G tout garder, B boucle ; flèches sur la position (curseur natif) ;
  - objet 3D : T tourner, V vue initiale ; grisés comme leurs boutons.
- **Icônes** : douze tracés Lucide lus au commit `7981a0798a` (`play`, `pause`, `repeat`, `volume-2`,
  `arrow-right-to-line`, `arrow-left-to-line`, `move-horizontal`, `rotate-3d`, `scan`, `sun`, `contrast`,
  `rotate-ccw`) ; aucune icône dessinée.
- **Position du média** : piste de 4 px, partie gardée par le rognage en violet clair, pastille blanche cerclée de violet.
  Raison : le rognage reste visible sur la piste, comme dans la barre de C14.
- **Volume** : la valeur en % est montrée pendant le glisser ; l'écriture reste au relâché (M23).

## Hors champ, constaté

- Au doigt, un tap sur un objet placé sous l'emplacement du panneau d'options peut toucher le panneau qui apparaît
  sous le doigt (clic fantôme sur « Effacer le fond »). Comportement d'avant ce lot (OG23), non corrigé ici ; l'essai
  pose ses objets à droite du panneau.

## Preuve attendue

`scripts/essais/restes-og23-navigateur.mjs` (au doigt puis au clavier ; cibles de 44 px ; une icône par bouton ;
netteté du § 10), joué par `verifier.sh --e2e`. Captures 2x : `docs/design/captures/restes-og23/{avant,apres}-{image,media,3d}.png`.
