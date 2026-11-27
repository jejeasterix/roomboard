# Restes des chapitres 1a et 1b de la personnalisation (OG19)

Voie courte : trois défauts connus, sans fonction neuve. Aucune question n'a pu parvenir à Jérôme pendant le tour ; chaque
choix est tranché ici avec sa raison.

## 1. Barre d'outils à 1280 px (H0 de 1a, règle L2-30)

Constat mesuré (Chromium, profil « Par défaut », taille M) : l'îlot d'outils fait **1006 px** depuis l'ajout de « Fonds »
(941 px en 1a). À 1280 px, la place centrée symétrique vaut 816 px et la place entre les groupes de coins (menu + onglets
à 144 px, panneaux) 916 px : l'îlot descendait à y = 80.

Décisions :

- **D1 — La règle L2-30 gagne une étape.** Un îlot centré trop large pour la place symétrique reste sur sa rangée s'il tient
  entre les groupes de coins, centré dans cette place (`laneOf`, `island-place.ts`). Raison : le décalage du centre (50 px
  à 1280) se voit moins qu'un îlot sous la rangée du haut, qui recouvre la scène.
- **D2 — Compaction mesurée, seulement quand elle sert.** L'îlot mobile centré mesure deux largeurs (naturelle, compacte) ;
  il se compacte (`data-compact`) seulement si la naturelle ne tient pas sur la rangée et que la compacte y tient
  (`compactOf`). Compact : boutons à icône et « Replier » 4 px plus étroits (48 → 44, jamais sous 44), hauteur gardée,
  écarts de 2 px, séparateurs à 2 px de marge. Mesuré : 1006 → **884 px** à 1280. À 1920, rien ne change (1006 px) ; à
  1024, l'îlot descend comme avant, à sa taille naturelle. Raison : cibles tactiles de 44 px gardées, icônes de 24 au
  pixel entier (marges de 10), aucune fonction cachée.
- **D3 — Pas de bouton « plus » à la Excalidraw.** Il cacherait à 1280 des outils que les essais existants et les
  enseignants touchent directement (Tableau, Pot, Fonds, navigation) ; la compaction suffit à 1280 × 800.
- **D4 — Îlot déplacé, glissé, ou poussé par le panneau des profils : jamais compacté.** La position choisie par
  l'utilisateur garde la taille du profil.

Conséquences : à 1280, l'îlot des onglets prend sa largeur minimale (144 px, H8), le titre s'abrège ; un `#etat` non vide
élargit le groupe de gauche et peut renvoyer l'îlot dans la voie suivante (règle d'avant). Au glisser, l'îlot reprend sa
largeur naturelle.

## 2. Raccourci dans l'infobulle (H1-11 de 1b)

- **D5 — La table unique `ui/shortcuts.ts` est lue par l'id de l'action du bouton.** Ajouts : `backgrounds` Ctrl+Maj+F,
  `page-prev` Pg préc, `page-next` Pg suiv, `page-number` Ctrl+Maj+P (il ouvre la barre latérale, onglet Pages). Chaque
  ligne a son reconnaisseur vérifié (`shortcuts.test.ts`). `undo` et `redo`, déjà dans la table, s'affichent aussi.
  `page-add` (Ctrl+M, Ctrl aussi sous macOS) n'est pas ajouté : `shortcutText` convertit Ctrl en ⌘.
- **D6 — Le raccourci est un `data-keys` de la bulle, montré par `::after`.** Le texte de la bulle reste le libellé : les
  essais qui lisent l'infobulle restent inchangés. Teinte : blanc mêlé de navy (`color-mix`), sur le segment fond → encre,
  donc 0 frange (§ 10). Le bouton porte `aria-keyshortcuts` (Control ou Meta, Shift, PageUp…).
- **D7 — Noms des touches de page : « Pg préc » et « Pg suiv »**, ceux des claviers AZERTY.

## 3. Fenêtre Fonds

- **D8 — « Modèles de cours » prend Lucide `layout-template`** (même commit Lucide que le lot 1b, rectangles en coordonnées
  entières) ; « Lignes et grilles » garde `grid`, comme le panneau Grille. `table` reste l'icône de l'outil Tableau.
- **D9 — Pendant une recherche, aucune section n'est surlignée** (`RadioChoices` reçoit `null`, le premier bouton reste
  tabulable) ; le titre « Résultats » dit où l'on est. Champ vidé : la section revient.

## Raccourcis clavier

Aucun geste neuf. Les raccourcis existants s'affichent désormais dans l'infobulle : Ctrl+Maj+F (Fonds), Pg préc, Pg suiv,
Ctrl+Maj+P (numéro de page), Ctrl+Z, Ctrl+Y (historique).
